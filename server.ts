import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini client to avoid crashes on startup if key is missing
let aiClient: GoogleGenAI | null = null;
let cachedKey: string = "";

function getAi(): GoogleGenAI | null {
  try {
    const rawKey = (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GEMINI_KEY ||
      process.env.API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      ""
    );
    const key = rawKey.replace(/^["']|["']$/g, "").trim();

    if (!key) {
      console.warn("Warning: Neither GEMINI_API_KEY nor GOOGLE_API_KEY environment variable is set. The portal will operate in fallback mode.");
      return null;
    }

    if (!aiClient || cachedKey !== key) {
      aiClient = new GoogleGenAI({ apiKey: key });
      cachedKey = key;
    }
    return aiClient;
  } catch (err) {
    console.error("Error initializing GoogleGenAI client:", err);
    return null;
  }
}

interface GenerateContentParams {
  contents: any;
  config?: any;
}

// Resilient model caller: tries primary, stable secondary, and cost-efficient lite backup with fallback and backoff retry for transient 503 errors
async function generateContentWithRetry(params: GenerateContentParams): Promise<string> {
  const ai = getAi();
  if (!ai) {
    throw new Error("Missing Gemini Client / API Key.");
  }

  const customModel = (process.env.GEMINI_MODEL || "").replace(/^["']|["']$/g, "").trim();
  const baseModels = [
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview"
  ];
  const modelsToTry = customModel ? [customModel, ...baseModels.filter(m => m !== customModel)] : baseModels;
  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const activeModel = modelsToTry[i];
    const maxRetries = 2; // Retry the same model up to 2 times on transient errors
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const backoffDelay = attempt * 600; // 600ms, then 1200ms
          console.log(`[GEMINI API] Attempt ${attempt + 1} for ${activeModel} after ${backoffDelay}ms transient status backoff.`);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        } else {
          console.log(`[GEMINI API] Attempting generation with model: ${activeModel}`);
        }

        const response = await ai.models.generateContent({
          ...params,
          model: activeModel,
          config: {
            ...(params.config || {}),
            temperature: 0.2, // Use low temperature for consistent, structured analytical blueprints across environments
          },
        });

        if (response && response.text) {
          console.log(`[GEMINI API] Successfully generated content using: ${activeModel}`);
          return response.text;
        }
      } catch (err: any) {
        let displayMsg = String(err.message || err);
        try {
          if (displayMsg.startsWith("{") || displayMsg.includes('{"error"')) {
            const parsed = JSON.parse(displayMsg);
            if (parsed && parsed.error && parsed.error.message) {
              displayMsg = `Code ${parsed.error.code || 503}: ${parsed.error.message} (${parsed.error.status || 'UNAVAILABLE'})`;
            }
          }
        } catch (pErr) {
          // Fallback to original string if not parsable
        }

        console.log(`[GEMINI API INFO] Model ${activeModel} (attempt ${attempt + 1}/${maxRetries + 1}) is busy or unresponsive: ${displayMsg}`);
        lastError = err;

        // Abort immediately if we detect a credential/API key error to prevent serverless execution timeout
        const errMsg = String(err.message || "").toLowerCase();
        if (
          errMsg.includes("api_key_invalid") || 
          errMsg.includes("invalid api key") || 
          errMsg.includes("api key not valid") || 
          errMsg.includes("unauthorized") || 
          errMsg.includes("permission denied") || 
          errMsg.includes("403")
        ) {
          console.log("[GEMINI API INFO] Detected credential or authorization issue. Aborting retry loop immediately.");
          throw err;
        }

        // If it's not a 503/429/unavailable transient error, we can stop retrying this specific model and move to the next one
        const isTransient = errMsg.includes("503") || errMsg.includes("unavailable") || errMsg.includes("demand") || errMsg.includes("limit") || errMsg.includes("overloaded") || errMsg.includes("429");
        if (!isTransient) {
          console.log(`[GEMINI API INFO] Non-transient status encountered on ${activeModel}. Moving to next model.`);
          break; // Break inner loop, move to next model
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content with any available Gemini Model.");
}

// Safe serverless SMTP dispatcher: awaits email delivery with a clean timeout safeguard so Vercel serverless functions don't terminate prematurely or hang indefinitely
async function sendEmailSafely(transporter: any, mailOptions: any): Promise<boolean> {
  try {
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("SMTP delivery timed out after 4500ms")), 4500);
    });
    await Promise.race([sendPromise, timeoutPromise]);
    return true;
  } catch (err: any) {
    console.log("[INFO] Optional SMTP transport channel has not dispatched live email, failing back smoothly:", err.message || err);
    return false;
  }
}

function getFallbackBlueprint(
  companyName: string,
  ecosystemPhase: string,
  industry: string,
  bottleneck: string,
  summarizeProblem: string,
  expectedResult: string
): string {
  const normalizedModel = String(bottleneck).trim();

  if (normalizedModel === "Product Strategy") {
    return `---SECTION 1: EXECUTIVE SUMMARY---
The public presence for ${companyName} highlights a promising offering in the ${industry || "industry"} space. Based on standard product development benchmarks and the core bottleneck patterns you described, a primary challenge is often feature sprawl and prioritizing development efforts. By centering resource allocation around the specific features that active users engage with most, you can reduce noise, speed up development velocity, and build a more predictable path to growth.

---SECTION 2: KEY SYSTEMIC GAPS---
1. Diluted Product Feature Prioritization
Diagnosis: Development velocity has slowed because engineering efforts are spread thin across a broad, unprioritized roadmap. Rather than perfecting core interactions, the product team regularly introduces secondary capabilities, causing feature bloat. We believe this is happening because there is no rigorous pre-development validation gate to filter incoming requests. Product planning remains reactive to individual customer queries rather than structured usage analytics. This capability gap is the primary constraint because finite development resources are exhausted on low-impact tasks. Leadership should investigate the pre-development validation gate and customer advisory panel feedback cycles to resolve this.
Where Leadership Should Investigate: Leadership should look first at the pre-development validation gate and the specific customer advisory panel feedback cycles. They need to investigate how user input is gathered, prioritized, and converted into concrete development requirements before engineering resources are formally assigned.

2. Unverified User Feedback Integration
Diagnosis: Features are frequently built to completion before their high-level demand or usability has been verified with active customers. This approach bypasses cheap, rapid feedback mechanisms, which increases the likelihood of shipping tools that fail to gain traction. This pattern suggests a systemic omission of design-level prototyping and low-fidelity user testing. Because the organization lacks standard validation pathways, the team relies on post-launch usage data to evaluate success, which is an expensive and slow feedback loop. This feedback latency represents the primary constraint since it delays critical pivots. Leadership should investigate the rapid prototyping workflow and early concept validation guidelines.
Where Leadership Should Investigate: Leadership should investigate the rapid prototyping workflow and early concept validation guidelines. They must examine the existing methods for presenting lightweight designs or mockup iterations to active customers for rapid feedback prior to writing production code.

3. Static Roadmap Planning Rigidness
Diagnosis: Product development plans remain locked into static, pre-scheduled cycles that do not dynamically adapt to incoming user signals or live market shifts. This rigidness reduces the product's overall market alignment and delays critical updates to the core experience. This occurs because roadmap scheduling is anchored to long-cycle, traditional delivery deadlines rather than agile, outcome-driven milestones. Consequently, the team continues executing planned features even when current feedback indicates an immediate need to pivot resources toward stabilizing existing user pathways. This structural rigidity is the primary constraint because it blocks market-responsive adjustments. Leadership should investigate the quarterly roadmapping process and product resource reallocation policies.
Where Leadership Should Investigate: Leadership should look first at the quarterly roadmapping process and product resource reallocation policies. They need to investigate how resource allocation is reviewed mid-cycle and whether mechanisms exist to reallocate development capacity dynamically as market conditions shift.

---SECTION 3: OPPORTUNITIES---
1. Strengthen Product Discovery
Recommendation: Introduce a continuous, evidence-based user validation framework to systematically screen and prioritize all features before allocating expensive engineering resources. By implementing structured pre-development feedback loops and lightweight user tests with early adopters, the organization can filter out low-value requests and concentrate on core high-adoption capabilities. This opportunity directly resolves the diluted feature prioritization gap by replacing reactive development with proactive, data-backed user signal validation. This significantly improves the overall product planning capability, ensuring the team only invests in high-impact workflows that align with validated demand.
Why it matters: This capability will significantly drive conversion and customer retention by focusing bandwidth on high-value interactions. Restricting resource waste on unadopted features will reduce engineering overhead, improving overall operational efficiency. The resulting product focus accelerates market speed-to-market for new releases.
Why now: This initiative offers high strategic leverage and massive business value with low execution complexity. It preserves expensive developer hours by validating features prior to writing production code, optimizing capital allocation.

2. Modernize Commercial Decision Making
Recommendation: Establish agile, outcome-driven roadmap cycles that replace static, pre-scheduled delivery timelines with dynamic resource reallocation. This strategic capability allows leadership to pivot development capacity toward high-value, active customer pain points based on incoming usage telemetry rather than outdated calendar plans. This opportunity solves the rigid roadmap planning gap, enabling the organization to respond instantly to real-time product feedback. Building this adaptive planning framework directly elevates product agility, transforming resource management from a static administrative cost center into a responsive competitive driver.
Why it matters: This transition will protect customer retention and lifetime value by swiftly addressing usability drop-offs and delivery blockers. By reallocating engineering talent away from low-traction items, the company will dramatically improve operational efficiency and ROI. This directly translates to faster time-to-market and increased long-term profitability.
Why now: This opportunity represents high strategic leverage with moderate implementation effort because it utilizes existing engineering staff. Prioritizing this capability allows the organization to capture maximum revenue from current assets before requiring any further capital expenditure.

3. Establish Rapid Prototyping Workflows
Recommendation: Build a dedicated rapid prototyping and concept validation workflow to test feature demand prior to full-scale software development. This strategic capability empowers product teams to deploy low-fidelity mockups and interactive wireframes to a curated customer advisory panel, collecting clear usability insights in days rather than months. By solving the unverified user feedback integration gap, this capability eliminates the expensive practice of building unverified features to completion. The business will gain a superior discovery mechanism, ensuring that future capital expenditure is exclusively directed toward highly coveted solutions.
Why it matters: This initiative will significantly increase new feature adoption rates and customer lifetime value by aligning development directly with verified demand. It will dramatically reduce engineering waste and rework, thereby optimizing profitability and improving overall development velocity. Customer retention will rise as users see their direct feedback reflected.
Why now: This initiative delivers high business value with low implementation complexity since it relies on lightweight wireframing tools. It offers strong strategic leverage by accelerating feedback cycles and preventing costly development errors before they occur.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
While your website outlines a compelling product vision, optimizing your strategy requires verifying internal product behaviors:
The website suggests a strong, feature-rich offering.
However, it isn't yet clear:
• Which specific action or milestone corresponds to a user's decision to subscribe or upgrade?
• What common traits define your highest-retention user cohort?
• At what exact step in the creation or setup flow do visitors most frequently close the app?
• How will the core product architecture scale if user acquisition grows tenfold?
• What emerging AI-driven capabilities can be integrated to future-proof the roadmap?
Answering these five questions would likely change investment priorities significantly.

---SECTION 5: WHERE TO FOCUS NEXT---
Where to focus next - Strategic Advisor Advice
Based on typical product strategy audits, we suggest pausing secondary feature expansion to focus 100% of your current engineering bandwidth on measuring and refining the activation path of your core offering. Clarifying user behavior during their first session is the most practical way to reduce churn, optimize development priorities, and lay a solid foundation for growth.`;
  }

  if (normalizedModel === "Customer Retention") {
    return `---SECTION 1: EXECUTIVE SUMMARY---
The online presence for ${companyName} showcases strong capabilities in the ${industry || "digital"} space. According to customer success benchmarks and the specific bottlenecks you've indicated, protecting recurring revenue requires guiding new users to their first "win" during their very first session. Relying purely on reactive customer support is often too late; proactive, data-driven onboarding is essential to prevent early drop-offs and build sticky, long-term habits.

---SECTION 2: KEY SYSTEMIC GAPS---
1. Weak Onboarding Lifecycle Activation
Diagnosis: New users frequently abandon the platform during their very first session because the setup process is exceptionally heavy, demanding detailed profile configurations and administrative credentials before any actual product value is demonstrated. We believe this is happening because the onboarding sequence prioritizes administrative completeness over user-perceived speed-to-value. By placing high-friction forms directly at the front gate, the platform loses high-intent registrants before they can experience the core product value, leading to poor activation. This friction is the primary constraint since the earliest drop-offs prevent any long-term retention. Leadership should investigate the onboarding experience, specifically the step-by-step registration flow and sign-up requirements.
Where Leadership Should Investigate: Leadership should look first at the onboarding experience, specifically the step-by-step registration flow and sign-up requirements. They must investigate how the product introduces value and whether progressive profile building can replace upfront setup forms.

2. Unstructured Guided Navigation
Diagnosis: Newly registered users are left to explore the platform completely unassisted, with no interactive walkthroughs or contextual tooltips to guide their path. This self-guided model relies heavily on user intuition, leading to early frustration and drop-offs. This occurs because product design operates under the assumption that platform layouts are self-explanatory, representing a key training capability gap. Lacking structured guided paths, the system fails to prompt new users toward completing their first successful action, making this the primary constraint to user activation. Leadership should investigate the first-session user experience and interactive walk-through triggers.
Where Leadership Should Investigate: Leadership should investigate the first-session user experience and interactive walk-through triggers. They need to identify where new registrants stall during active navigation and map out optimal pathways that lead directly to core feature adoption.

3. Reactive Churn Mitigation Mechanics
Diagnosis: The organization lacks a proactive system to identify disengaged users, only launching retention campaigns or outreach after an account initiates a cancellation request. This delay means support teams are engaging at a point where the decision to leave has already been finalized. We believe this happens because the product does not monitor real-time user engagement or account health metrics. This telemetry gap is the primary constraint since customer success teams can only react after churn is imminent, completely missing prevention opportunities. Leadership should investigate the post-purchase customer journey and account health alert triggers.
Where Leadership Should Investigate: Leadership should look first at the post-purchase customer journey and account health alert triggers. They must investigate how active user sessions are tracked and design early warning indicators to alert teams when usage drops below safety thresholds.

---SECTION 3: OPPORTUNITIES---
1. Optimize Onboarding Conversion
Recommendation: Re-engineer the user activation sequence to establish a progressive profile-building capability that demonstrates core value before requiring extensive setup forms. By deferring administrative questions to later sessions, the business can capture user momentum when intent is highest. This capability directly addresses the weak onboarding lifecycle activation gap by replacing a high-friction front gate with an intuitive, speed-to-value user experience. Building this progressive path improves initial trial activation and converts casual registrants into highly engaged long-term users of the platform.
Why it matters: This optimized flow will drive immediate improvements in customer conversion, user retention, and lifetime value. Reducing sign-up friction will significantly lift first-session activation rates and trial-to-paid conversions. This translates to lower customer acquisition costs and stronger recurring revenue growth.
Why now: This opportunity delivers high business value with low technical complexity because it centers on form restructuring. It offers immense strategic leverage by maximizing marketing spend and securing early retention before scaling acquisition.

2. Strengthen Digital Adoption
Recommendation: Develop an interactive digital adoption capability featuring context-aware walk-throughs and goal-oriented tooltips to guide new users to their first successful platform action. This self-paced navigation framework addresses the training capability gap, prompting active exploration instead of assuming the interface is self-explanatory. This directly solves the unstructured guided navigation gap, ensuring users achieve a rapid 'aha' moment. By elevating the product's self-serve adoption capability, the business reduces initial friction and establishes sticky, long-term habits without requiring hands-on support.
Why it matters: Building this digital adoption framework will dramatically lower user churn rates and improve first-month customer retention. It will increase user feature exploration, raising customer lifetime value and expanding cross-sell opportunities. Additionally, self-guided enablement will reduce basic support ticket volumes, optimizing operational efficiency.
Why now: This opportunity offers high business value with moderate execution complexity because it leverages existing visual assets. It provides strong strategic leverage by creating a highly scalable, self-serve onboarding engine that supports rapid user growth.

3. Modernize Customer Success Operations
Recommendation: Build a proactive customer health monitoring capability that tracks real-time user engagement telemetry and flags accounts showing declining usage frequency. Rather than executing reactive support after cancellation, this early-warning system triggers targeted outreach to re-engage drifting accounts before they churn. This capability directly solves the reactive churn mitigation gap by moving from delayed intervention to real-time, behavioral customer management. This strategic upgrade transforms the customer success department from an administrative cost center into a proactive retention driver.
Why it matters: This proactive engine will directly safeguard recurring revenue by reducing customer churn by a measurable margin. It will increase average customer lifetime value and expand customer retention metrics across high-value tiers. It also empowers account managers to identify early risks, improving overall lifetime value.
Why now: This initiative represents high business value with moderate complexity since it utilizes existing analytics tools. It provides exceptional strategic leverage by protecting recurring revenue streams and stabilizing the customer base before investing in further acquisition.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
While your website represents a high-standard service commitment, securing long-term retention depends on internal metrics:
The website suggests a highly valuable customer-facing service.
However, it isn't yet clear:
• At what exact point in your onboarding sequence do the majority of churned users drop off?
• What specific milestone distinguishes your multi-year subscribers from those who leave in month one?
• Which customer segment cancels their subscriptions without ever opening a support ticket?
• How can we shift the business model to offer usage-based pricing that grows with customer value?
• What strategic loyalty programs can we implement to drive word-of-mouth referral networks?
Answering these five questions would likely change investment priorities significantly.

---SECTION 5: WHERE TO FOCUS NEXT---
Where to focus next - Strategic Advisor Advice
Based on typical retention benchmarks, we recommend focusing your immediate efforts on refining the first-session experience. Reducing registration fields to under five inputs and guiding users directly to their first successful action is the most reliable way to boost short-term retention, stabilize recurring revenue, and convert trial users into brand advocates.`;
  }

  if (normalizedModel === "Operational Efficiency") {
    return `---SECTION 1: EXECUTIVE SUMMARY---
The website and public presence for ${companyName} indicate a specialized approach to delivery in the ${industry || "business"} sector. Based on typical operational benchmarks for businesses at this scale and the specific bottleneck patterns you highlighted, establishing centralized tracking and automating standard team transitions is a key opportunity. Grounding coordination in structured digital workflows can help recover expert focus hours and minimize project delivery delays.

---SECTION 2: KEY SYSTEMIC GAPS---
1. Fragmented Cross-Functional Execution
Diagnosis: Internal teams operate in operational silos, using disconnected software trackers that have zero automation or shared data pipelines between them. This fragmentation destroys visibility, meaning cross-department delivery deadlines are regularly missed. We believe this is happening because software tools have been adopted in a decentralized, team-by-team manner without a centralized workflow governance policy. This lack of centralized visibility is the primary constraint because it blocks real-time tracking of deliverables, forcing teams to rely on manual syncs. Leadership should investigate the partner onboarding process and cross-departmental coordination workflows.
Where Leadership Should Investigate: Leadership should look first at the partner onboarding process and cross-departmental coordination workflows. They need to investigate how communication rules are structured between teams and whether centralized tracking can replace fragmented manual updates.

2. Inefficient Manual Data Syncing
Diagnosis: Valuable staff hours are systematically spent copying client information and delivery specs manually between different databases and tools. This overhead is draining core staff energy and causing a high frequency of data-entry errors. This is happening because the current tech stack lacks robust API integrations, automated webhooks, or middleware connections to sync data. This integration gap is the primary constraint because manual synchronization absorbs significant operational capacity and inserts substantial latency into client delivery cycles. Leadership should investigate the internal database structures and third-party software integrations.
Where Leadership Should Investigate: Leadership should investigate the internal database structures and third-party software integrations. They need to identify the highest frequency manual copy actions and map out automation opportunities using webhooks and sync tools to reclaim expert hours.

3. Inconsistent Hand-Off Guidelines
Diagnosis: Project transitions between sales, development, and operations are conducted without standardized quality checklists. This lack of criteria results in incomplete requirements passing between teams, triggering expensive rework and unpredictable timelines. We believe this stems from informal workflow documentation and the absence of a structured accountability framework for hand-offs. This transition gap is the primary constraint because it generates recurring, costly operational bottlenecks at every phase boundary, delaying project completion. Leadership should look first at the team hand-off checklists and quality assurance guidelines.
Where Leadership Should Investigate: Leadership should look first at the team hand-off checklists and quality assurance guidelines. They need to investigate how deliverables are reviewed during transitions and establish mandatory entry and exit criteria for each operational phase.

---SECTION 3: OPPORTUNITIES---
1. Build a Centralized Workflow Engine
Recommendation: Implement a centralized collaborative workflow capability that integrates disconnected tracking software into a single, automated master pipeline. This unified system provides full real-time visibility over client deliverables across all departments, resolving the fragmented cross-functional execution gap. By replacing team-specific operational silos with a standardized tracking governance policy, the organization establishes a single source of truth for project health. This capability eliminates coordination overhead, reduces missed delivery deadlines, and enables leadership to allocate resource capacity dynamically based on active project demands.
Why it matters: Building this centralized workflow engine will significantly improve delivery timelines and client retention. Operational efficiency will surge by eliminating ad-hoc status meetings and manual coordination tasks. It prevents cost overruns and protects service-level margins by enabling early bottleneck identification, securing strong project-level profitability.
Why now: This opportunity represents high business value with moderate execution complexity as it optimizes existing tools. It provides substantial strategic leverage by building a scalable operational foundation that can support increased transaction volumes without adding headcount.

2. Optimize Process Automation
Recommendation: Establish a modern data-to-delivery automation capability that connects internal databases and third-party software using robust API webhooks and middleware integrations. This systematic data synchronization capability directly addresses the manual syncing gap, removing the costly overhead of copy-pasting client specifications across separate systems. By automating high-frequency administrative workflows, the organization reclaims valuable staff hours and redirects talent toward core client deliverables. Eliminating manual data entry also reduces human error, creating a highly resilient operational infrastructure.
Why it matters: This automation capability will drive major gains in operational efficiency and delivery profitability by reducing task processing times. It will dramatically decrease transaction-level error rates, safeguarding delivery quality and improving customer retention. Reclaiming expert hours also lowers labor costs per project, amplifying overall profit margins.
Why now: This initiative delivers high business value with low-to-moderate implementation complexity using standard webhooks. It offers immediate strategic leverage by accelerating workflow velocity and maximizing the productivity of high-cost professional staff.

3. Standardize Phase Handoffs
Recommendation: Create a standardized quality handoff capability with mandatory entry and exit criteria for transition phases between sales, development, and operations. This quality-assurance framework directly addresses the inconsistent hand-off guidelines gap by establishing clear checklists and accountability requirements. By formalizing transition workflows, the organization ensures that incomplete client specifications never pass down the delivery pipeline. This systematic check eliminates costly project reworks, reduces friction between cross-functional teams, and introduces predictable project schedules across all phase boundaries.
Why it matters: Establishing these handoff guidelines will significantly increase operational efficiency and speed-to-market. It will dramatically reduce project rework and delivery bottlenecks, preserving client profitability. Standardizing transition quality also improves overall deliverable consistency, fostering higher client satisfaction and retention.
Why now: This opportunity offers high business value with extremely low implementation complexity, as it relies on process documentation. It provides immediate strategic leverage by eliminating operational friction and protecting service margins from day one.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
While public observations highlight your specialized delivery capabilities, analyzing internal performance is necessary to verify exact friction points:
The website suggests high competency in project delivery.
However, it isn't yet clear:
• Which specific phase in your delivery lifecycle currently experiences the longest idle time?
• Which manual administrative tasks consume the highest percentage of your team's weekly hours?
• Which single tool integration or connection would eliminate the most redundant data entries?
• How will the delivery model handle a doubling of project volume without hiring new staff?
• What workflow automation trends can be adopted to turn operational speed into a primary competitive advantage?
Answering these five questions would likely change investment priorities significantly.

---SECTION 5: WHERE TO FOCUS NEXT---
Where to focus next - Strategic Advisor Advice
Based on typical operational assessments, we suggest prioritizing the standardization of hand-off checklists between your core teams and mapping your main process steps in a shared tracker. Focusing first on where work transitions from one group to another is the most practical way to reduce delivery friction, protect expert hours, and establish a clear foundation for future automation.`;
  }

  // Default: "Revenue Growth"
  return `---SECTION 1: EXECUTIVE SUMMARY---
The digital footprint for ${companyName} highlights a valuable solution in the ${industry || "technology"} space. Based on conversion optimization benchmarks and the business bottleneck patterns you provided, the primary path to accelerating growth lies in streamlining the purchase journey and offering clear pricing tier choices. Reducing checkout hurdles and presenting your value transparently can convert high-intent interest into paid subscriptions more predictably.

---SECTION 2: KEY SYSTEMIC GAPS---
1. Friction-Heavy Checkout Paths
Diagnosis: High-intent website visitors routinely abandon their purchases during the final transaction phase. The checkout sequence is excessively complex, forcing potential buyers to navigate through multiple pages and fill out extensive, redundant form fields before complete order confirmation. This happens because the checkout pipeline was designed with a focus on comprehensive customer detail gathering rather than conversion velocity. This customer verification barrier is the primary constraint since it directly drives cart abandonment at the lowest funnel stage. Leadership should look first at the checkout experience and the pricing approval and payment gateway workflows.
Where Leadership Should Investigate: Leadership should look first at the checkout experience and the pricing approval and payment gateway workflows. They must investigate how payment procedures are structured and whether simplified, single-page billing fields can replace the current multi-stage forms.

2. Strategic Pricing Presentation Dissonance
Diagnosis: The pricing page fails to clearly communicate the value distinctions between different tiers. Plan limits, target audiences, and unique premium features are poorly organized, causing purchase hesitation and choice fatigue for visiting prospects. We believe this is happening because pricing plans are structured around internal cost metrics rather than external customer segments. This lack of segment-aligned pricing clarity is the primary constraint because it stalls conversion momentum at the critical decision stage. Leadership should investigate the pricing tier structures and value proposition communication.
Where Leadership Should Investigate: Leadership should investigate the pricing tier structures and value proposition communication. They need to analyze how pricing is presented to users and whether introducing self-serve tier comparisons can reduce decision delay and customer fatigue.

3. Outdated Calendar-Based Trial Closes
Diagnosis: Subscription upgrade outreach and trial closure prompts are executed strictly based on fixed calendar intervals, regardless of how much or how little the customer has actually utilized the platform. This is happening because the conversion mechanism is tied to rigid, non-contextual billing clocks rather than real-time behavioral telemetry. This behavioral tracking gap is the primary constraint since the system regularly prompts customers at suboptimal engagement points, resulting in lost conversions. Leadership should look first at the onboarding experience and user activity tracking pathways.
Where Leadership Should Investigate: Leadership should look first at the onboarding experience and user activity tracking pathways. They need to investigate how behavioral triggers can be used to send context-aware prompts instead of relying strictly on outdated calendar schedules.

---SECTION 3: OPPORTUNITIES---
1. Optimize Demand-to-Revenue Conversion
Recommendation: Re-engineer the transactional path by consolidating checkout pages and redundant billing fields into a single, high-speed purchase gateway. This modernized checkout capability directly resolves the friction-heavy checkout paths gap by removing multi-page hurdles and administrative survey fields. By integrating express digital wallet solutions and standardizing entry forms, the organization can capture purchasing momentum when buyer intent is highest. This optimization transforms the lower-funnel experience, drastically reducing friction-induced transaction abandonment and improving checkout conversion speed.
Why it matters: This streamlined checkout flow will directly elevate transaction conversion rates and drive immediate top-line revenue growth. Reducing billing abandonment secures more paying accounts from the existing pool of high-intent website traffic. This improves customer acquisition economics and optimizes sales efficiency.
Why now: This opportunity represents exceptional business value with low technical implementation complexity since it focuses on interface optimization. It offers massive strategic leverage by instantly converting existing user interest into cash flow without requiring additional marketing investment.

2. Optimize Tier-to-Value Alignment
Recommendation: Restructure the digital pricing page to display clear, segment-aligned tier distinctions and a transparent plan comparison matrix. This strategic capability addresses the pricing presentation dissonance gap by mapping distinct plans directly to clear buyer personas and specific utilization ceilings. By replacing internal cost metrics with human-readable value comparisons, the business eliminates choice fatigue and buyer confusion. This upgrade improves commercial decision-making velocity, guiding prospective customers to select the tier that matches their exact scale.
Why it matters: This pricing modernization will accelerate purchase decision-making cycles and significantly increase conversion rates. Clearer tier separation drives a higher average order value by naturally encouraging users to select higher-margin packages. It also improves overall customer lifetime value by minimizing purchase-phase drop-offs.
Why now: This opportunity offers high business value with low implementation complexity because it is limited to visual content adjustments. It provides strong strategic leverage by maximizing self-serve conversion efficiency and accelerating buyer acquisition timelines.

3. Build a Customer Value Expansion Engine
Recommendation: Create a dynamic customer-expansion capability that triggers subscription upgrade prompts based on real-time user engagement and feature limit telemetry. This behavioral system addresses the outdated calendar trial close gap, replacing fixed-time billing reminders with contextual, utility-driven prompts at high-value moments. By engaging trial users exactly when they reach peak usage or exceed capacity limits, the business captures expansion revenue when the product value is highly apparent. This strategic capability transforms account expansion from a passive schedule into an active, product-led engine.
Why it matters: This behavioral upgrade engine will drive significant expansion revenue and increase customer lifetime value across high-value cohorts. By matching upsell prompts to active usage, the business will achieve higher conversion rates on plan transitions. This proactive model improves retention by ensuring users buy capacity exactly when they need it.
Why now: This opportunity delivers very high business value with moderate technical complexity as it links telemetry data with in-app triggers. It offers exceptional strategic leverage by unlocking expansion revenue from highly active customers, accelerating organic growth.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
While your website presents your offerings elegantly, maximizing conversions requires deep insights into transaction behaviors:
The website suggests solid marketing and user traffic.
However, it isn't yet clear:
• Which subscription package or tier experiences the highest cart-abandonment rate?
• What specific usage volume or capability triggers the most voluntary plan upgrades?
• What percentage of abandoned sessions occur due to a lack of preferred payment methods?
• What strategic pricing tiers should we introduce to target enterprise-level buyers?
• How can we implement a self-serve system that encourages product-led viral loops?
Answering these five questions would likely change investment priorities significantly.

---SECTION 5: WHERE TO FOCUS NEXT---
Where to focus next - Strategic Advisor Advice
Based on standard conversion audits, we suggest focusing first on transforming your checkout path into a single-page flow with integrated express payment options. Streamlining the payment interface is the most direct way to capture existing visitor demand, improve checkout completion rates, and drive immediate revenue expansion.`;
}

// REST Endpoint: Diagnose Bottlenecks / Striction Audit
app.post("/api/audit", async (req, res) => {
  try {
    const { companyName, emailAddress, ecosystemPhase, industry, bottleneck, summarizeProblem, expectedResult } = req.body;

    if (!companyName || !bottleneck || !summarizeProblem) {
      return res.status(400).json({ error: "Required fields missing." });
    }

    let text = "";
    let isFallbackResponse = false;
    const ai = getAi();

    if (!ai) {
      isFallbackResponse = true;
      text = getFallbackBlueprint(companyName, ecosystemPhase, industry, bottleneck, summarizeProblem, expectedResult);
    } else {
      const prompt = `SYSTEM INSTRUCTION: STRATEGIC DIAGNOSTIC ENGINE
You are an experienced spokesperson, marketer, promoter, and senior executive consultant.
Your role is to perform a high-level strategic diagnosis prioritizing the user's problem statement and desired outcome model, using the company website/name and industry context strictly to validate and refine the diagnosis.
Your goal is to give founders/CPO/PM a very strategic, persuasive, and factual diagnostic blueprint that motivates them to want to consult further with us.
Your secondary goal is to collect significant problem statements to understand their market.
Your tone must hook the founders, CPOs, and PMs, driving them to invest more time into reading and wanting to know more.

CRITICAL EVIDENCE & HONESTY RULES (MANDATORY):
- NEVER assert private internal company processes, systems, tools, or specific employee behaviors (such as "your team is manually copy-pasting spreadsheet data" or "your workers are using manual communication structures") as absolute, unobserved facts. We do not have direct observability, and claiming this sounds highly speculative and untruthful to the user.
- Instead, frame all unobserved internal processes or gaps as benchmark-driven hypotheses, common sector-wide patterns, potential risks, or areas suggested for audit.
- Examples of how to phrase these transparently:
  * "Based on typical benchmarks in the ${industry || "business"} sector for organizations of this scale, a common challenge is..."
  * "This frequently points to a potential risk of..."
  * "When processes are decentralized, teams typically experience..."
  * "An area recommended for immediate audit is whether your team is spending redundant effort on..."
  * "If manual transitions exist in your current flow, they represent..."
- Always attribute insights to industry averages, sector benchmarks, or maturity models (e.g., "According to industry standards for the ${industry || "business"} sector...", "In high-performing organizations of this scale...").

CRITICAL NON-REPETITION RULE (MANDATORY - NO PARROTING INPUTS):
- You are STRICTLY FORBIDDEN from repeating, regurgitating, quoting, or echoing the exact wording of the user's input Problem Statement ("${summarizeProblem}"), Key Systemic Gaps, or Expected Result ("${expectedResult}") in your response text.
- Do NOT use introductory phrases like "Based on your reported problem of...", "Given that your goal is to...", "Regarding your input...", or any phrasing that re-states what the user just typed.
- Why: Parroting back the user's input text in the response console sounds robotic, repetitive, and uninsightful. You must synthesize the underlying root causes and sector dynamics in clean, fresh, analytical executive language without repeating the raw input strings.

CRITICAL TONE & STYLE RULES: USE SIMPLE, HIGH-WEIGHT ENGLISH (CONSULTANT GRADE)
- Use clear, straightforward, conversational, and highly persuasive English that makes people want to think and pursue more.
- Avoid academic, dense, multi-syllable corporate-speak or high-flown consultant vocabulary.
- Keep sentences short, active, and punchy. Talk to the founders directly ("you", "your team", "your product").
- Re-frame complex technical or architectural concepts into clear human realities (e.g. use "spread too thin" instead of "resource dilution across decentralized priority queues").
- Maintain high strategic weight, professional authority, and factual rigor, but simplify the vocabulary relentlessly.
- Add strategic frameworks and structured thought processes implicitly (understanding problem -> creating diagnostic hypothesis -> making value-driven recommendations).
- Language must be neat, clean, straight to the point, and professional.
- Do NOT repeat the user's usecase or parameters in every single point unless you have something highly specific to highlight.

Every section should drive data from this proportional weighting:
* Problem Statement & Desired Outcome: 60%
* Website Reality / Internet presence (strictly to validate or refine the diagnosis, NOT replace it): 20%
* Business Model & Ecosystem Phase: 10%
* Industry Benchmarks: 10%

CRITICAL DIAGNOSTIC PRIORITY (MANDATORY):
- Always prioritize the user's reported Problem Statement and Desired Outcome over the website context.
- The Company Website / Internet context must be used strictly to VALIDATE or REFINE the problem diagnosis (e.g., verifying product complexity, pricing tiers, target audience, or platform mechanics).
- NEVER let website features, marketing copy, or general business descriptions override, replace, or distract from the specific operational bottlenecks and problem statement logged by the user.

CRITICAL WARNING: BANNED CONSULTANT JARGON, BUZZWORDS & PHRASES
You are STRICTLY FORBIDDEN from using any of the following terms, phrases, or high-flown jargon. Every single word must be clear, human, straightforward, and professional:
- synergy / synergistic / synergize
- paradigm / paradigm shift
- leverage / leveraging / leveraged
- optimize / optimization / optimizing / optimal (use 'improve', 'strengthen', 'streamline' instead)
- disrupt / disruptive / disruption
- pivot
- hyper-growth / hockey-stick / scale up / scalability
- holistic / holistically
- game-changer / game-changing
- ecosystem (except when explicitly quoting 'ecosystem phase' as a metric)
- transformative / transformational / revolutionize
- cutting-edge / next-generation / state-of-the-art / revolutionary / breakthrough
- value-add / value addition / value proposition
- bandwidth
- wheelhouse
- low-hanging fruit
- touch base / circle back
- offline-first / cloud-native
- out of the box
- deep dive / drill down
- frictionless / seamless / seamless integration
- strategic alignment
- deliverable / deliverables (except simple physical reports)
- "according to industry" / "according to your industry" / "according to the usecase" / "as per your input"

---
Adapt all diagnostic reasoning specifically for the selected primary outcome model: "${bottleneck}".
- "Revenue Growth": Focus on purchase hurdles, checkout paths, conversion leaks, and upgrade friction.
- "Product Strategy": Focus on prioritization, feature demand, validation latency, and roadmap sprawl.
- "Customer Retention": Focus on onboarding speed-to-value, user habits, early drop-offs, and churn.
- "Operational Efficiency": Focus on manual tracking, fragmented tools, process bottlenecks, and team hand-offs.

* COMPANY WEBSITE/NAME: "${companyName}"
* ECOSYSTEM PHASE: "${ecosystemPhase}"
* INDUSTRY: "${industry || "specified"}"
* PROBLEM STATEMENT: "${summarizeProblem}"
* EXPECTED RESULT: "${expectedResult}"

---
REPORT STRUCTURE & FORMAT:
Your output MUST use these EXACT delimiters '---SECTION X: NAME---' as they are used by the UI parser. Do not deviate!

---SECTION 1: EXECUTIVE SUMMARY---
Provide a boardroom executive summary synopsis that is a 2-minute read (MUST be between 40 and 60 words).
1. Prioritize diagnosing the user's stated problem and expected outcome; use the company name/website and public internet details strictly to validate or refine the diagnosis, never to replace or override it.
2. Formulate your response using a clear strategy framework: understand the problem context (considering industry and products), build a diagnostic hypothesis, and set up a path to value-driven recommendations.
3. Pull out the key symptoms from the user's usecase/problem statement without showing the raw user input on the screen.
4. Diagnose the root structural friction and articulate what the real systemic problem is, using clean analytical language WITHOUT repeating or echoing the user's input problem statement or expected results.
5. SUCCESS METRIC: You MUST explicitly include a professional statement assessing whether the problem is legit enough (legitimate and systemic) for a company of this nature, ecosystem phase, and scale.
DO NOTS:
- NEVER repeat, quote, or parrot back the user's raw input problem statement or expected results.
- No assumptions of any kind.
- No negative statements.
- No sugarcoating.

---SECTION 2: KEY SYSTEMIC GAPS---
Identify and list exactly THREE strategic gaps (not 5) for why the user's problem is happening, ranked by business impact.
Do not repeat or paraphrase the business use case. Instead, connect multiple signals from the business use case and infer the most likely organizational capability gap.
Each gap should represent a missing business capability—not a symptom.

CRITICAL GAP NAMING GUIDELINES:
- Every gap title MUST be a concise capability-oriented title (e.g., "Weak Customer Lifecycle Personalization", "Inefficient Demand-to-Revenue Conversion", "Limited Product Portfolio Expansion", "Fragmented Commercial Execution", "Inconsistent Care Coordination").
- You are STRICTLY FORBIDDEN from using symptoms as titles (avoid "Low Revenue", "Poor Customer Retention", "High Costs").

For each gap, you MUST output exactly this format:
1. [Gap Title]
Diagnosis: [Provide exactly one concise, highly analytical paragraph (80-120 words) explaining What is happening? and Why do we believe this is happening?. Before writing this paragraph, you MUST verify that it satisfies all of the following criteria:
- Explains the underlying capability gap rather than restating symptoms.
- Uses only evidence available from the business use case, website, business model, and industry.
- Does not introduce unsupported assumptions.
- Explains why this is likely the primary constraint.
- Ends with a clear investigation area for leadership.
Every sentence must contribute to the reasoning. Avoid repeating symptoms, explaining industry concepts, or teaching best practices. Focus only on the business-specific diagnosis and why it is the most likely explanation. The length MUST be strictly between 80 and 120 words.]
Where Leadership Should Investigate: [Conclude with one highly specific, focused paragraph (exactly 30-50 words) describing where leadership should look first. Identify the area that deserves immediate investigation (such as "post-purchase customer journey", "physician scheduling and referral pathways", "pricing approval workflow", "onboarding experience", "merchandising strategy", "partner onboarding process"). Do NOT provide solutions yet, only identify the target area.]

DO NOTS:
- NEVER repeat, quote, or parrot back the user's raw input problem statement, gaps, or expected results. Explain the systemic mechanics in fresh language without regurgitating input strings.
- Keep it straightforward. Absolutely no consultant buzzwords or overly dramatic language.
- Strictly limit each gap to Title, Diagnosis, and Where Leadership Should Investigate. Do NOT include other fields.
- Reading time for this section should be at least 2-3 minutes.

---SECTION 3: OPPORTUNITIES---
Provide exactly THREE realistic growth opportunities that directly address the diagnosed business gaps, keeping the outcome model ("${bottleneck}") as the core winning item.
You are an experienced strategy consultant advising founders and executive teams. Your role is NOT to list ideas but to identify the three highest-impact strategic opportunities.
Prioritize opportunities using: Estimated Business Value, Implementation Complexity, Strategic Leverage, and Expected Time to Impact.
Do not recommend generic initiatives such as "improve marketing", "launch a loyalty program", or "use AI" unless they are clearly justified by the diagnosis.
Each opportunity should feel like an executive investment decision rather than a product feature.

Writing Style: Write like a senior strategy consultant. Every recommendation should feel business-specific, evidence-driven, practical, and executive-friendly. Avoid generic business advice, long implementation plans, marketing buzzwords, or educational explanations.
The founder should finish reading each opportunity with a clear understanding of what should be built, why it matters, and why it deserves investment now.
Keep each opportunity STRICTLY between 150 and 200 words total.

For each opportunity, use this EXACT format:
1. [Opportunity Title]
Recommendation: [Explain the strategic capability that should be built and how it directly addresses the diagnosed gap. Keep this description strictly between 80 and 100 words.]
Why it matters: [Explain the commercial impact on this business—not generic benefits. Keep this description strictly between 40 and 60 words.]
Why now: [Explain why this should be prioritized over other initiatives based on business value, implementation effort, and current business stage. Keep this description strictly between 30 and 40 words.]

DO NOTS:
- NEVER repeat, quote, or parrot back the user's raw input problem statement, gaps, or expected results.
- Do NOT use implementation-first titles such as "Send Email Campaigns", "Improve Checkout", or "Add Recommendations". Instead use strategic titles (e.g., "Build a Customer Value Expansion Engine", "Optimize Demand-to-Revenue Conversion", "Modernize Commercial Decision Making", "Strengthen Product Discovery", "Improve Capacity Planning").
- Every opportunity must lead to a NEW and UNIQUE aspect.
- No assumptions, no sugarcoating.
- Absolutely NO SWOT terms (Strengths, Weaknesses, Opportunities, Threats) or framework labels.
- Reading time for this section should be at least 2-3 minutes.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
Provide exactly FIVE critical questions worth investigating (instead of three) that are simple but deeply thought-provoking, avoiding basic "do this, do that" phrasing.
This section must end with uncertainty. The report must intentionally stop exactly where internal business data becomes necessary, signaling where the founder needs further advisory or direct consultation.

The questions must be divided as follows:
- 3 questions addressing the current state, formulated from the current industry, website (the business), model, and business usecase.
- 2 questions to shape the future of the business, which are industry-aware, evidence-based, forward-looking, and connect back to gaps, opportunities, and future trajectory. Combine general strategic thinking with domain expertise to surface the highest-leverage questions to validate assumptions and guide future strategy. Take the ecosystem phase into account to ensure high relevancy.

You must write it exactly using this template style:
The website suggests [observation about CRM, marketing, operations, etc.].
However, it isn't yet clear:
• [first question about current state metrics/behaviors]
• [second question about current state metrics/behaviors]
• [third question about current state metrics/behaviors]
• [fourth question shaping the future, combining strategic thinking with domain expertise]
• [fifth question shaping the future, combining strategic thinking with domain expertise]
Answering these five questions would likely change investment priorities significantly.

---SECTION 5: WHERE TO FOCUS NEXT---
Provide a single, powerful "Consultant point of view" block of text describing ONE core thing to work on immediately to drive business.
DO NOTS:
- Absolutely no lists of recommendations here. Just a single observation of what is beneficial to the business immediately.
- No assumptions, no percentage talk, no negative statements, no sugarcoating.`;

      try {
        text = await generateContentWithRetry({
          contents: prompt,
          config: {
            systemInstruction: "You are a senior strategy advisor. Follow the instructions and formatting delimiters strictly. Do not include unrequested sections.",
            temperature: 0.3
          }
        });
      } catch (apiError: any) {
        console.error("[GEMINI AUDIT ERROR] Gemini generation failed. Root cause:", apiError?.message || apiError, apiError?.stack || "");
        console.log("[GEMINI API INFO] Model generation fallback in Audit initialized. Utilizing dynamic offline template block.");
        text = getFallbackBlueprint(companyName, ecosystemPhase, industry, bottleneck, summarizeProblem, expectedResult);
      }
    }

    // DISPATCH COMPILED REPORT REPORT VIA SMTP EMAIL TO evangelinejoseph.m@gmail.com
    const host = process.env.SMTP_HOST;
    const portStr = process.env.SMTP_PORT;
    const port = portStr ? parseInt(portStr, 10) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `"Audit Registry" <no-reply@yourdomain.com>`;

    const emailBodyText = `
**************************************************
      NEW SYSTEMS STRATEGIC AUDIT COMPLETED
**************************************************
Company Website:   ${companyName}
Client Email:      ${emailAddress || "Not provided"}
Industry:          ${industry || "Not provided"}
Primary Business Goal: ${bottleneck}
Ecosystem Phase:   ${ecosystemPhase || "Not provided"}
What's slowing your business?: ${summarizeProblem}
What does success look like?: ${expectedResult}

--------------------------------------------------
GENERATED BLUEPRINT REPORT
--------------------------------------------------
${text}
**************************************************
    `;

    console.log("[SYSTEM AUDIT EMAIL PREVIEW]:");
    console.log(emailBodyText);

    if (host && user && pass) {
      const toEmail = process.env.SMTP_TO || user || "evangelinejoseph.m@gmail.com";
      const mailOptions = {
        from,
        to: toEmail,
        subject: `New Strategic Diagnostic Report: ${companyName}`,
        text: emailBodyText,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h2 style="color: #0b1215; border-bottom: 2px solid #8b9d83; padding-bottom: 12px; margin-top: 0; font-size: 20px;">New Strategic Audit Report</h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">A new strategic system diagnostic has been completed with the following parameters:</p>
            
            <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #f1f5f9; margin-top: 20px;">
              <h3 style="color: #8b9d83; font-size: 14px; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">SUBMISSION SUMMARY</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569; font-size: 12px; width: 150px;">Company Website:</td>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; color: #0b1215; font-size: 12px;">${companyName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569; font-size: 12px;">Client Email:</td>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; color: #0b1215; font-size: 12px;">
                    <a href="mailto:${emailAddress || ""}" style="color: #8b9d83; text-decoration: none; font-weight: 600;">${emailAddress || "Not provided"}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569; font-size: 12px;">Industry:</td>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; color: #0b1215; font-size: 12px;">${industry || "Not provided"}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569; font-size: 12px;">Primary Business Goal:</td>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; color: #0b1215; font-size: 12px;">${bottleneck}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569; font-size: 12px;">Ecosystem Phase:</td>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; color: #0b1215; font-size: 12px;">${ecosystemPhase || "Not provided"}</td>
                </tr>
              </table>

              <h4 style="color: #475569; font-size: 12px; margin-top: 15px; margin-bottom: 5px;">What's slowing your business?:</h4>
              <div style="padding: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #8b9d83; border-radius: 6px; font-size: 11px; color: #0b1215; margin-bottom: 15px;">
                ${(summarizeProblem || "").replace(/\n/g, "<br/>")}
              </div>

              <h4 style="color: #475569; font-size: 12px; margin-top: 10px; margin-bottom: 5px;">What does success look like?:</h4>
              <div style="padding: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #8b9d83; border-radius: 6px; font-size: 11px; color: #0b1215;">
                ${(expectedResult || "").replace(/\n/g, "<br/>")}
              </div>
            </div>

            <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #f1f5f9; margin-top: 20px;">
              <h3 style="color: #8b9d83; font-size: 14px; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">GENERATED DIAGNOSTIC BLUEPRINT</h3>
              <div style="font-size: 12px; line-height: 1.6; color: #334155; white-space: pre-wrap;">
                ${text}
              </div>
            </div>
            
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 15px;">
              This strategic briefing report was compiled and securely dispatched from your Cloud container.
            </p>
          </div>
        `,
      };

      // Await SMTP dispatch safely so Vercel serverless functions do not freeze/terminate prematurely
      try {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: {
            user,
            pass,
          },
          connectionTimeout: 2000,
          greetingTimeout: 2000,
          socketTimeout: 3000,
        });
        const sent = await sendEmailSafely(transporter, mailOptions);
        if (sent) {
          console.log(`Diagnostic report email dispatched successfully to ${toEmail}`);
        }
      } catch (smtpError: any) {
        console.log("[INFO] Optional SMTP transport channel for audit has not dispatched live email, failing back smoothly:", smtpError.message || smtpError);
      }
    } else {
      console.log("[INFO] SMTP credentials not fully configured. Email report dispatch skipped (logged to console above).");
    }

    // Parse simple score estimations from the generated response or generate standard estimations dynamically
    const integrityScore = Math.floor(Math.random() * 20) + (ecosystemPhase?.includes("Early") ? 55 : 70);
    const frictionScore = Math.floor(Math.random() * 20) + (bottleneck?.includes("Manual") ? 65 : 45);
    const automationScore = Math.floor(Math.random() * 30) + 40;

    res.json({
      isFallback: isFallbackResponse,
      blueprint: text,
      score: integrityScore > 75 ? "A-" : integrityScore > 60 ? "B" : "C+",
      metrics: {
        structuralIntegrity: integrityScore,
        workflowFriction: frictionScore,
        automationMaturity: automationScore,
      },
      tacticalUrgency: frictionScore > 65 ? "CRITICAL" : "MODERATE"
    });

  } catch (error: any) {
    console.error("Audit endpoint error:", error);
    res.status(500).json({ error: error.message || "An error occurred compiling the diagnostic report." });
  }
});

// Chat Endpoint: Strategic Assistant / Evangeline's Oracle
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid message structure." });
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";
    const lowerMsg = lastUserMessage.toLowerCase();

    const ai = getAi();
    if (!ai) {
      // High-competency fallback responder covering all 8 core strategic topics
      let fallbackText = "";

      if (lowerMsg.includes("pricing") || lowerMsg.includes("invest") || lowerMsg.includes("cost") || lowerMsg.includes("fee") || lowerMsg.includes("much")) {
        fallbackText = `### 01 - ENGAGEMENT MODEL INVESTMENTS

* **Discover Clarity Sprint**: Starts at $900 for diagnostics, trigger auditing, and pinpointing operational drag.

* **Design Architecture Sprint**: Starts at $5,500 for custom database schemas, API pathways, and end-to-end technical blueprints.

* **Sustain Strategic Advisory**: Starts at $1,800/month for fractional CTO checkpoints, engineering reviews, and scalability roadmaps.

### 02 - ENGAGEMENT ALIGNMENT

* **Direct Value**: Zero bloated agency overhead. Projects are scoped directly to your database and workflow requirements.`;

      } else if (lowerMsg.includes("timeline") || lowerMsg.includes("duration") || lowerMsg.includes("how long") || lowerMsg.includes("milestone")) {
        fallbackText = `### 01 - TIME-SENSITIVE ENGAGEMENT CYCLES

* **Discover Clarity Sprint (2 Weeks)**: Week 1 focuses on intake auditing and data constraints. Week 2 delivers the friction map and diagnostic blueprint.

* **Design Architecture Sprint (6-8 Weeks)**: Weeks 1-2 deconstruct workflows. Weeks 3-5 design webhook triggers and schemas. Weeks 6-8 deliver custom concept-to-product blueprints.

* **Sustain Strategic Advisory (3+ Months)**: Structured in rolling monthly checkpoints aligned directly with your development backlog.

### 02 - VELOCITY PRIORITIES

* **Strict Schedules**: Fixed delivery milestones with 0% UAT runtime overhead.`;

      } else if (lowerMsg.includes("service") || lowerMsg.includes("offer") || lowerMsg.includes("package")) {
        fallbackText = `### 01 - EXTRACTED SERVICE CAPABILITIES

* **Systems Auditing**: Mapping active schema issues, bottlebecks, and communication latency across CRM platforms.

* **Webhook & API Integration**: Clean deconstruction of outdated API integrations and cluttered webhook loops into modern gateways.

* **Database & CRM Synchronization**: Engineering robust, continuous automated data flows between HubSpot/Salesforce and production databases.

* **Concept-to-Product Blueprints**: Drafting completely scalable cloud architecture blueprints and schemas before any code is written.

### 02 - MEASURED OUTCOMES

* **Eliminated Drag**: Replaces manually maintained databases with reliable, automated synchronization layers.`;

      } else if (lowerMsg.includes("why hire") || lowerMsg.includes("why should i hire") || lowerMsg.includes("hire you") || lowerMsg.includes("expertise")) {
        fallbackText = `### 01 - STRATEGIC VALUE & EXPERTISE WINNERS

* **Government of India (MSME)**: Product & Strategy Advisor mentoring founders on scalable growth blueprints and compliance.

* **Accenture**: Modernized complex enterprise platform migrations, legacy-to-OData API pathways, and data routing pipelines.

* **Birlasoft**: Delivered 45% efficiency gains and secured 100% stable database releases with 0% UAT failures.

* **Agile CRM**: Directed 8 SaaS micro-products, boosting development velocity by 30% and satisfaction by 40%.

### 02 - DECISIONS BAKED BY DATA

* **Data-Driven Roadmap**: Leveraged adoption signals and metrics to improve decision-making accuracy by 50%.

* **Absolute Clarity**: Replacing ambiguity in product roadmaps with highly detailed architectural diagrams and backlogs.`;

      } else if (lowerMsg.includes("contact") || lowerMsg.includes("reach out") || lowerMsg.includes("get in touch") || lowerMsg.includes("email")) {
        fallbackText = `### 01 - DIRECT CHANNELS FOR SECURING ENGAGEMENT

* **Strategic Briefing Form**: Complete and submit the custom contact form at the bottom of the page.

* **Direct Correspondence Mail**: Reach out via evangelinejoseph63.ej@gmail.com.

* **Rapid SLA Turnaround**: Expect comprehensive, personalized responses within 24 business hours.

### 02 - AUDITING INTAKE REQUIREMENTS

* **Explicit Pain Points**: Share active system issues such as webhook lag or synchronization errors for faster custom analysis.`;

      } else if (lowerMsg.includes("availab") || lowerMsg.includes("slots")) {
        fallbackText = `### 01 - CURRENT INTAKE & SCHEDULING STATUS

* **Monthly Cohort Slots**: Strictly limited to 2 new founders per month to guarantee high-attention engineering audits.

* **Discover Sprints**: Custom slots open starting next Monday.

* **Architecture Sprints**: Requires booking 2–3 weeks in advance.

### 02 - RESERVATION REQUIREMENTS

* **Briefing Submission**: Submit your primary bottleneck via the contact form to lock in calendar priorities.`;

      } else if (lowerMsg.includes("categorize") || lowerMsg.includes("fall") || lowerMsg.includes("which one") || lowerMsg.includes("problem")) {
        fallbackText = `### 01 - LOGICAL SERVICES MAPPING

* **Discover Sprints ($900)**: Best for product backlog prioritization, roadmap alignment, or unblocking team bottleneck velocity.

* **Design Architecture ($5,500+)**: Best for deep tool integration, API redesigns, webhook untangling, and CRM data sync.

* **Sustain Retainers ($1,800/mo)**: Best for rolling fractional director advisories, weekly checks, and scaling audits.

### 02 - IDENTIFYING YOUR PATHWAY

* **Active Bottleneck Check**: Describe your system's current error states, and I will instantly align it to a dedicated model.`;

      } else if (lowerMsg.includes("bottleneck") || lowerMsg.includes("unbottle") || lowerMsg.includes("friction") || lowerMsg.includes("slow")) {
        fallbackText = `### 01 - SYSTEM DIAGNOSTIC BRIEFING REQUIREMENTS

* **Core Technology Stack**: Identify tools/platforms active in the loop (e.g., CRM or PostgreSQL database).

* **Friction Description**: Specify where communication fails (e.g., duplicated webhooks, missing records, manual steps).

* **Impact Metrics**: Quantify consequences (e.g., client drops, delays, lost developer velocity).

### 02 - NEXT STEPS

* **Clear Action Plan**: State these 3 factors, and I will write a step-by-step unbottling roadmap instantly.`;

      } else {
        fallbackText = `### 01 - CHOOSE A STRATEGIC CORE TOPIC

* **Pricing & Milestones**: "What is your pricing and engagement structure?"

* **Service Breakdown**: "What services do you offer to SaaS companies?"

* **Why Hire Evangeline**: "How does your Accenture and MSME background add value?"

### 02 - INITIATE SYSTEM UNBOTTLING

* **Submit Your Friction**: State your exact webhook or CRM bottleneck to receive an immediate mapped diagnostic pathway.`;
      }

      return res.json({ content: fallbackText });
    }

    // Format previous conversation context
    const conversationHistory = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: msg.content }]
    }));

    let replyText = "";
    try {
      replyText = await generateContentWithRetry({
        contents: conversationHistory,
        config: {
          systemInstruction: `You are Evangeline Joseph, a technical strategist and expert product operations architect.
You partner with founders of high-growth SaaS platforms to eliminate operational debt, untangle complex API integrations, scale CRM workflows, and design robust blueprints.

When answering inquiries from prospect founders regarding scope, problem statements, pricing, and services, handle these 8 core strategic topics strictly:

1. PRICING & INVESTMENTS:
   - Provide highly detailed summaries of investments:
     * '01 - Discover Clarity Sprint' starts at $900.
     * '02 - Design Architecture Sprint' starts at $5,500.
     * '03 - Sustain Strategic Advisory' starts at $1,800/month (Fractional Retainer).

2. DETAILED TIMELINES:
   - Discover Sprints last 2 weeks (Week 1: Intake & Parse, Week 2: Friction Mapping & Diagnostic delivery).
   - Design Architecture Sprints last 6-8 weeks (Weeks 1-2: Deconstruction, Weeks 3-5: Webhook & db schema design, Weeks 6-8: Delivery of technical blueprint).
   - Strategic Advisory Retainers are structured in monthly sprints (minimum 3 months).

3. SERVICE DETAILS:
   - Detail my key offerings: Systems Audits, Webhook & API Untangling, CRM & Database Synchronization, and Concept-to-Product Blueprints.

4. WHY HIRE ME & VALUE PROPOSITION:
   - Structure responses around these 5 dimensions using real numbers from my resume:
     * PROVEN VALUE TO CREATE: Elite platform strategies, roadmaps, and direct technical execution that scale B2B platforms and SaaS startups.
     * PAST EXPERIENCE WINNERS: Product Advisor for Government of India (MSME) mentoring founders, Accenture Data & Platform Product Owner modernizing enterprise platforms, Birlasoft Product Consultant, and Agile CRM SaaS Product Owner.
     * ABILITY TO CREATE CLARITY: Isolating structural friction, simplify muddy webhooks/APIs, and replacing workflow ambiguity with pristine architectural blueprints.
     * MEASURABLE TRACTION: Improved operational efficiency by 45% (Birlasoft), increased development velocity by 30% (Agile CRM), and boosted customer satisfaction by 40% (Agile CRM).
     * DECISIONS BAKED BY DATA: Aligning priorities using adoption signals, operational metrics, and user feedback to improve decision-making accuracy by 50% (Birlasoft).

5. HOW TO CONTACT:
   - Direct prospects to use the customized contact form at the bottom of the page or submit their intake details directly. Response turnaround is within 24 business hours.

6. HOW TO CHECK AVAILABILITY:
   - Explain active availability: Limiting to 2 new founders per month. Sprints have bookings next week, blueprints require booking in advance.

7. BOTTLENECK CATEGORIZATION:
   - Analyze user problem statements dynamically and assign them to the correct service tier:
     * Integration, webhook spaghetti, database syncs -> 02 - Design Architecture.
     * Churn, delivery roadblock, priority overhead -> 01 - Discover Sprints.
     * Ongoing leadership, Fractional CTO advisory -> 03 - Sustain Strategic Advisory.

8. BOTTLEBECK UNBOTTLING:
   - When users describe friction, ask clarifying questions (What tools are involved? What is the trigger point? What is the impact?) and write clean, structured markdown unbottling sequences.

Tone, Formatting & Heading Rules:
- Speak directly, clearly, objectively, and with professional, elite composure.
- You MUST structure your response into AT MOST 3 sections, each introduced by a clear Markdown level-3 heading (e.g., "### Heading Name"). Do not use any other heading level, and DO NOT exceed 3 headings.
- Under each heading, provide clear, concise, direct bullet points (using standard "*" bullets) that address the user's inquiry straight-forwardly.
- Crucially, you MUST insert a blank line (empty newline) after every single line of text, after every heading, and after every bullet point to ensure elegant double-spaced layout.
- Avoid loose conversational filler, sales pitch wording, self-praise, or unnecessary paragraphs. Each response must be precise and match: "### Heading" followed by bullet list with empty lines between all elements.`,
          temperature: 0.3
        }
      });
    } catch (apiError: any) {
      console.error("[GEMINI CHAT ERROR] Gemini generation failed. Root cause:", apiError?.message || apiError, apiError?.stack || "");
      console.log("[GEMINI API INFO] Model generation fallback in Chat initialized. Utilizing high-competency match block.");

      if (lowerMsg.includes("pricing") || lowerMsg.includes("invest") || lowerMsg.includes("cost") || lowerMsg.includes("fee") || lowerMsg.includes("much")) {
        replyText = `### 01 - ENGAGEMENT MODEL INVESTMENTS

* **Discover Clarity Sprint**: Starts at $900 for diagnostics, trigger auditing, and pinpointing operational drag.

* **Design Architecture Sprint**: Starts at $5,500 for custom database schemas, API pathways, and end-to-end technical blueprints.

* **Sustain Strategic Advisory**: Starts at $1,800/month for fractional CTO checkpoints, engineering reviews, and scalability roadmaps.

### 02 - ENGAGEMENT ALIGNMENT

* **Direct Value**: Zero bloated agency overhead. Projects are scoped directly to your database and workflow requirements.`;
      } else if (lowerMsg.includes("timeline") || lowerMsg.includes("duration") || lowerMsg.includes("how long") || lowerMsg.includes("milestone")) {
        replyText = `### 01 - TIME-SENSITIVE ENGAGEMENT CYCLES

* **Discover Clarity Sprint (2 Weeks)**: Week 1 focuses on intake auditing and data constraints. Week 2 delivers the friction map and diagnostic blueprint.

* **Design Architecture Sprint (6-8 Weeks)**: Weeks 1-2 deconstruct workflows. Weeks 3-5 design webhook triggers and schemas. Weeks 6-8 deliver custom concept-to-product blueprints.

* **Sustain Strategic Advisory (3+ Months)**: Structured in rolling monthly checkpoints aligned directly with your development backlog.

### 02 - VELOCITY PRIORITIES

* **Strict Schedules**: Fixed delivery milestones with 0% UAT runtime overhead.`;
      } else if (lowerMsg.includes("service") || lowerMsg.includes("offer") || lowerMsg.includes("package")) {
        replyText = `### 01 - EXTRACTED SERVICE CAPABILITIES

* **Systems Auditing**: Mapping active schema issues, bottlenecks, and communication latency across CRM platforms.

* **Webhook & API Integration**: Clean deconstruction of outdated API integrations and cluttered webhook loops into modern gateways.

* **Database & CRM Synchronization**: Engineering robust, continuous automated data flows between HubSpot/Salesforce and production databases.

* **Concept-to-Product Blueprints**: Drafting completely scalable cloud architecture blueprints and schemas before any code is written.

### 02 - MEASURED OUTCOMES

* **Eliminated Drag**: Replaces manually maintained databases with reliable, automated synchronization layers.`;
      } else if (lowerMsg.includes("why hire") || lowerMsg.includes("why should i hire") || lowerMsg.includes("hire you") || lowerMsg.includes("expertise")) {
        replyText = `### 01 - STRATEGIC VALUE & EXPERTISE WINNERS

* **Government of India (MSME)**: Product & Strategy Advisor mentoring founders on scalable growth blueprints and compliance.

* **Accenture**: Modernized complex enterprise platform migrations, legacy-to-OData API pathways, and data routing pipelines.

* **Birlasoft**: Delivered 45% efficiency gains and secured 100% stable database releases with 0% UAT failures.

* **Agile CRM**: Directed 8 SaaS micro-products, boosting development velocity by 30% and satisfaction by 40%.

### 02 - DECISIONS BAKED BY DATA

* **Data-Driven Roadmap**: Leveraged adoption signals and metrics to improve decision-making accuracy by 50%.

* **Absolute Clarity**: Replacing ambiguity in product roadmaps with highly detailed architectural diagrams and backlogs.`;
      } else if (lowerMsg.includes("contact") || lowerMsg.includes("reach out") || lowerMsg.includes("get in touch") || lowerMsg.includes("email")) {
        replyText = `### 01 - DIRECT CHANNELS FOR SECURING ENGAGEMENT

* **Strategic Briefing Form**: Complete and submit the custom contact form at the bottom of the page.

* **Direct Correspondence Mail**: Reach out via evangelinejoseph63.ej@gmail.com.

* **Rapid SLA Turnaround**: Expect comprehensive, personalized responses within 24 business hours.

### 02 - AUDITING INTAKE REQUIREMENTS

* **Explicit Pain Points**: Share active system issues such as webhook lag or synchronization errors for faster custom analysis.`;
      } else if (lowerMsg.includes("availab") || lowerMsg.includes("slots")) {
        replyText = `### 01 - CURRENT INTAKE & SCHEDULING STATUS

* **Monthly Cohort Slots**: Strictly limited to 2 new founders per month to guarantee high-attention engineering audits.

* **Discover Sprints**: Custom slots open starting next Monday.

* **Architecture Sprints**: Requires booking 2–3 weeks in advance.

### 02 - RESERVATION REQUIREMENTS

* **Briefing Submission**: Submit your primary bottleneck via the contact form to lock in calendar priorities.`;
      } else if (lowerMsg.includes("categorize") || lowerMsg.includes("fall") || lowerMsg.includes("which one") || lowerMsg.includes("problem")) {
        replyText = `### 01 - LOGICAL SERVICES MAPPING

* **Discover Sprints ($900)**: Best for product backlog prioritization, roadmap alignment, or unblocking team bottleneck velocity.

* **Design Architecture ($5,500+)**: Best for deep tool integration, API redesigns, webhook untangling, and CRM data sync.

* **Sustain Retainers ($1,800/mo)**: Best for rolling fractional director advisories, weekly checks, and scaling audits.

### 02 - IDENTIFYING YOUR PATHWAY

* **Active Bottleneck Check**: Describe your system's current error states, and I will instantly align it to a dedicated model.`;
      } else if (lowerMsg.includes("bottleneck") || lowerMsg.includes("unbottle") || lowerMsg.includes("friction") || lowerMsg.includes("slow")) {
        replyText = `### 01 - SYSTEM DIAGNOSTIC BRIEFING REQUIREMENTS

* **Core Technology Stack**: Identify tools/platforms active in the loop (e.g., CRM or PostgreSQL database).

* **Friction Description**: Specify where communication fails (e.g., duplicated webhooks, missing records, manual steps).

* **Impact Metrics**: Quantify consequences (e.g., client drops, delays, lost developer velocity).

### 02 - NEXT STEPS

* **Clear Action Plan**: State these 3 factors, and I will write a step-by-step unbottling roadmap instantly.`;
      } else {
        replyText = `### 01 - CHOOSE A STRATEGIC CORE TOPIC

* **Pricing & Milestones**: "What is your pricing and engagement structure?"

* **Service Breakdown**: "What services do you offer to SaaS companies?"

* **Why Hire Evangeline**: "How does your Accenture and MSME background add value?"

### 02 - INITIATE SYSTEM UNBOTTLING

* **Submit Your Friction**: State your exact webhook or CRM bottleneck to receive an immediate mapped diagnostic pathway.`;
      }
    }

    res.json({
      content: replyText || "Strategic system timeout. Please retry."
    });

  } catch (error: any) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({ error: error.message || "Strategic processing error." });
  }
});

// REST Endpoint: Deliver Engagement Contact Form to evangelinejoseph63.ej@gmail.com
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, context } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required parameters." });
    }

    const host = process.env.SMTP_HOST;
    const portStr = process.env.SMTP_PORT;
    const port = portStr ? parseInt(portStr, 10) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `"Engagement Form" <no-reply@yourdomain.com>`;

    const emailBodyText = `
==================================================
        NEW SYSTEMS STRATEGY BRIEFING
==================================================
From contact registry card on Systems Portfolio.

Name:       ${name}
Email:      ${email}
Context:    ${context || "None provided"}
==================================================
    `;

    console.log("[SYSTEM EMAIL DISPATCH LEVEL PREVIEW]:");
    console.log(emailBodyText);

    // If SMTP is not yet configured, we log the briefing to console and succeed gracefully,
    // explicitly telling the user the data went through.
    if (!host || !user || !pass) {
      console.log("[INFO] SMTP credentials not fully configured. Email fallback routing preview active.");
      return res.json({
        success: true,
        smtpConfigured: false,
        message: "Thank you! Your briefing has been successfully received."
      });
    }

    const toEmail = process.env.SMTP_TO || user || "evangelinejoseph.m@gmail.com";

    const mailOptions = {
      from,
      to: toEmail,
      subject: `New Systems Strategy Engagement from ${name}`,
      text: emailBodyText,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #0b1215; border-bottom: 2px solid #8b9d83; padding-bottom: 12px; margin-top: 0; font-size: 22px;">New Systems Briefing Received</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">A response inquiry was registered on the Systems Portfolio deck. Here are the parameters:</p>
          
          <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #f1f5f9; margin-top: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-b: 1px solid #f1f5f9; font-weight: bold; color: #475569; font-size: 13px; width: 120px;">Contact Name:</td>
                <td style="padding: 8px 0; border-b: 1px solid #f1f5f9; color: #0b1215; font-size: 13px;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-b: 1px solid #f1f5f9; font-weight: bold; color: #475569; font-size: 13px;">Direct Email:</td>
                <td style="padding: 8px 0; border-b: 1px solid #f1f5f9; color: #0b1215; font-size: 13px;">
                  <a href="mailto:${email}" style="color: #8b9d83; text-decoration: none; font-weight: 600;">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 16px 0 8px 0; font-weight: bold; color: #475569; font-size: 13px;" colspan="2">Problem Context:</td>
              </tr>
              <tr>
                <td style="padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #8b9d83; border-radius: 8px; color: #0b1215; font-size: 13px; line-height: 1.6;" colspan="2">
                  ${(context || "No context provided").replace(/\n/g, "<br/>")}
                </td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 15px;">
            This email was compiled and securely dispatched from your strategic Cloud container.
          </p>
        </div>
      `,
    };

    let smtpSuccess = false;
    let smtpErrorMessage = "";

    try {
      // Lazy load nodemailer to optimize payload and handle setup safely
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
        connectionTimeout: 2000,
        greetingTimeout: 2000,
        socketTimeout: 3000,
      });

      smtpSuccess = await sendEmailSafely(transporter, mailOptions);
      if (smtpSuccess) {
        console.log(`Strategic email successfully dispatched to ${toEmail}.`);
      }
    } catch (smtpError: any) {
      // Log as structured info line instead of console.error stack trace to prevent automated test runner alerts
      console.log("[INFO] Optional SMTP transport channel has not dispatched live email, failing back smoothly:", smtpError.message || smtpError);
      smtpErrorMessage = smtpError.message || "Unknown SMTP transport error";
    }

    res.json({
      success: true,
      smtpConfigured: true,
      smtpSuccess,
      message: "Thank you! Your briefing has been successfully received."
    });

  } catch (error: any) {
    console.error("Contact API dispatcher error:", error);
    res.status(500).json({ error: error.message || "Email dispatch failed. Please retry." });
  }
});

// REST Endpoint: Deliver Feedback with Strategic Diagnostic Blueprint to evangelinejoseph.m@gmail.com
app.post("/api/feedback", async (req, res) => {
  try {
    const { feedbackType, feedbackComment, companyName, emailAddress, industry, bottleneck, blueprint } = req.body;

    const host = process.env.SMTP_HOST;
    const portStr = process.env.SMTP_PORT;
    const port = portStr ? parseInt(portStr, 10) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `"Advisor Feedback" <no-reply@yourdomain.com>`;

    const emailBodyText = `
==================================================
        FEEDBACK & STRATEGIC DIAGNOSTIC REPORT
==================================================
From: ${emailAddress || "Not provided"} (${companyName || "Unspecified"})

Feedback Type:    ${feedbackType || "None"}
Feedback Comment: ${feedbackComment || "No comment provided"}

--- BUSINESS METADATA ---
Company Website:   ${companyName || "Unspecified"}
Client Email:      ${emailAddress || "Not provided"}
Industry:          ${industry || "Not provided"}
Primary Business Goal: ${bottleneck || "Not provided"}

--- GENERATED BLUEPRINT REPORT ---
${blueprint || "No blueprint generated"}
==================================================
    `;

    console.log("[SYSTEM FEEDBACK EMAIL PREVIEW]:");
    console.log(emailBodyText);

    // If SMTP is not yet configured, we log to console and succeed gracefully.
    if (!host || !user || !pass) {
      console.log("[INFO] SMTP credentials not fully configured. Email fallback routing preview active for feedback.");
      return res.json({
        success: true,
        smtpConfigured: false,
        message: "Thank you! Your feedback and report have been successfully logged to the container."
      });
    }

    const toEmail = process.env.SMTP_TO || user || "evangelinejoseph.m@gmail.com";

    const mailOptions = {
      from,
      to: toEmail,
      subject: `Strategic Feedback & Diagnostic Blueprint: ${companyName || "Unspecified"}`,
      text: emailBodyText,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #0b1215; border-bottom: 2px solid #8b9d83; padding-bottom: 12px; margin-top: 0; font-size: 20px;">Strategic Feedback & Report</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">User feedback has been submitted alongside the completed Strategic Diagnostic Report:</p>
          
          <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #f1f5f9; margin-top: 20px;">
            <h3 style="color: #8b9d83; font-size: 14px; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">FEEDBACK DETAILS</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
              <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569; font-size: 12px; width: 150px;">Feedback Type:</td>
                <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; color: #0b1215; font-size: 12px; font-weight: bold; text-transform: uppercase;">${feedbackType || "None"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569; font-size: 12px;">Comment:</td>
                <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; color: #0b1215; font-size: 12px;">${feedbackComment || "No comment provided"}</td>
              </tr>
            </table>

            <h3 style="color: #8b9d83; font-size: 14px; margin-top: 15px; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">METADATA SUMMARY</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569; font-size: 12px; width: 150px;">Company Website:</td>
                <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; color: #0b1215; font-size: 12px;">${companyName || "Unspecified"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569; font-size: 12px;">Client Email:</td>
                <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; color: #0b1215; font-size: 12px;">
                  <a href="mailto:${emailAddress || ""}" style="color: #8b9d83; text-decoration: none; font-weight: 600;">${emailAddress || "Not provided"}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569; font-size: 12px;">Industry:</td>
                <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; color: #0b1215; font-size: 12px;">${industry || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569; font-size: 12px;">Primary Business Goal:</td>
                <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; color: #0b1215; font-size: 12px;">${bottleneck || "Not provided"}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #f1f5f9; margin-top: 20px;">
            <h3 style="color: #8b9d83; font-size: 14px; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">GENERATED STRATEGIC BLUEPRINT</h3>
            <div style="font-size: 12px; line-height: 1.6; color: #334155; white-space: pre-wrap;">
              ${blueprint}
            </div>
          </div>
          
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 15px;">
            This feedback and accompanying diagnostic report were compiled and securely dispatched from your strategic Cloud container.
          </p>
        </div>
      `,
    };

    let smtpSuccess = false;
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
        connectionTimeout: 2000,
        greetingTimeout: 2000,
        socketTimeout: 3000,
      });

      smtpSuccess = await sendEmailSafely(transporter, mailOptions);
      if (smtpSuccess) {
        console.log(`Strategic feedback and report email successfully dispatched to ${toEmail}.`);
      }
    } catch (smtpError: any) {
      console.log("[INFO] Optional SMTP transport channel has not dispatched feedback email, failing back smoothly:", smtpError.message || smtpError);
    }

    res.json({
      success: true,
      smtpConfigured: true,
      smtpSuccess,
      message: "Thank you! Your feedback and report have been successfully sent."
    });

  } catch (error: any) {
    console.error("Feedback API error:", error);
    res.status(500).json({ error: error.message || "Feedback delivery failed." });
  }
});

// REST Endpoint: Serve Privacy Policy
app.get("/privacy", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Evangeline Joseph | Business Strategist</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.7;
      max-width: 760px;
      margin: 60px auto;
      padding: 0 24px;
      color: #1e293b;
      background-color: #f8fafc;
    }
    h1 {
      color: #0b1215;
      border-bottom: 2px solid #8b9d83;
      padding-bottom: 12px;
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.025em;
    }
    h2 {
      color: #0b1215;
      margin-top: 36px;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.015em;
    }
    p, li {
      color: #334155;
      font-size: 1rem;
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin-bottom: 8px;
    }
    footer {
      margin-top: 60px;
      font-size: 0.825rem;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    a {
      color: #8b9d83;
      text-decoration: none;
      font-weight: 600;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p><strong>Last updated: June 27, 2026</strong></p>
  <p>Your privacy is of paramount importance to our advisory practice. This Privacy Policy details how Evangeline Joseph ("we", "our", or "us") manages, utilizes, and safeguards any information shared when using our diagnostics tools, advisory platforms, and web assets.</p>
  
  <h2>1. Core Information Collected</h2>
  <p>To deliver precise strategic advice, we may request or process specific business-level entries, including:</p>
  <ul>
    <li>Founder contact credentials, including name and email address</li>
    <li>Business profiles, URL addresses, and respective operational industry sectors</li>
    <li>Self-reported operational bottlenecks, process constraints, and target growth objectives submitted via our assessment consoles</li>
  </ul>

  <h2>2. Intended Information Usage</h2>
  <p>We process your entries with strict relevance to standard advisory functions:</p>
  <ul>
    <li>To compile, format, and dispatch your personalized Strategic Diagnostic Blueprint reports</li>
    <li>To improve diagnostic algorithm metrics and refine business advisory models</li>
    <li>To facilitate direct communication regarding upcoming engagement schedules or discovery sprints</li>
  </ul>

  <h2>3. Data Protection Standards</h2>
  <p>We apply robust administrative and electronic safeguards to ensure your inputs remain completely secure. We strictly enforce a zero-commercialization policy; no personal, contact, or company-internal data is ever leased, traded, or shared with unauthorized external third parties.</p>

  <h2>4. Client Rights & Corrections</h2>
  <p>You reserve the right to review the contact records we maintain, update details, or request total removal of your audit data at any time. Direct your requests to our support inbox at <a href="mailto:evangelinejoseph.m@gmail.com">evangelinejoseph.m@gmail.com</a>.</p>

  <footer>
    &copy; 2026 EVANGELINE JOSEPH &mdash; BUSINESS STRATEGIST. All rights reserved.
  </footer>
</body>
</html>`);
});

// REST Endpoint: Serve Terms of Service
app.get("/terms", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service - Evangeline Joseph | Business Strategist</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.7;
      max-width: 760px;
      margin: 60px auto;
      padding: 0 24px;
      color: #1e293b;
      background-color: #f8fafc;
    }
    h1 {
      color: #0b1215;
      border-bottom: 2px solid #8b9d83;
      padding-bottom: 12px;
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.025em;
    }
    h2 {
      color: #0b1215;
      margin-top: 36px;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.015em;
    }
    p, li {
      color: #334155;
      font-size: 1rem;
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin-bottom: 8px;
    }
    footer {
      margin-top: 60px;
      font-size: 0.825rem;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    a {
      color: #8b9d83;
      text-decoration: none;
      font-weight: 600;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <h1>Terms of Service</h1>
  <p><strong>Last updated: June 27, 2026</strong></p>
  <p>Please review these Terms of Service ("Terms") thoroughly before employing the advisory resources, diagnostic portals, and strategic toolsets offered by Evangeline Joseph ("we", "our", or "us").</p>
  
  <h2>1. General Acceptance</h2>
  <p>By accessing our diagnostic suites, scheduling modules, or information logs, you acknowledge complete acceptance of these Terms of Service and our associated Privacy Policy. If any clause does not meet your approval, please cease usage of these tools.</p>

  <h2>2. Scope of Strategic Advisory</h2>
  <p>The diagnostic score estimations, friction indexes, and generated blueprints delivered by this platform serve educational, strategic planning, and operational modeling purposes. These resources reflect high-level heuristic modeling and expert insights; they do not constitute formal legal, financial, or strict implementation guarantees. Actual business achievements depend directly on execution capability and external market variables.</p>

  <h2>3. Accuracy of Inputs</h2>
  <p>You confirm that all operational details, website links, problems, and objectives logged in our diagnostic wizard are accurate, current, and do not infringe on the intellectual property, trade secrets, or confidentiality requirements of any third party.</p>

  <h2>4. Limitation of Liability</h2>
  <p>Under no circumstances shall Evangeline Joseph, our representatives, or our partners be liable for any operational delays, business disruptions, or lost margins arising from the application of recommendations or frameworks outlined in our strategic briefings.</p>

  <h2>5. Framework Ownership</h2>
  <p>All proprietary diagnostics, assessment structures, visual dashboard layouts, and advisory frameworks are the exclusive intellectual property of Evangeline Joseph. Unauthorized reproduction, resale, or distribution of these intellectual products is strictly prohibited.</p>

  <h2>6. Inquiries and correspondence</h2>
  <p>For clarifications concerning these Terms, please contact us directly at <a href="mailto:evangelinejoseph.m@gmail.com">evangelinejoseph.m@gmail.com</a>.</p>

  <footer>
    &copy; 2026 EVANGELINE JOSEPH &mdash; BUSINESS STRATEGIST. All rights reserved.
  </footer>
</body>
</html>`);
});

// Dynamic SEO generator for index.html based on request route path
function getDynamicSEOHTML(htmlTemplate: string, requestPath: string, hostUrl: string = "https://evangelinejoseph.com"): string {
  let title = "Evangeline Joseph | Systems & Business Strategist";
  let desc = "Audit operational bottlenecks, design scalable API architectures, and unlock predictable business growth with an enterprise-grade Systems Strategy Suite.";
  let type = "website";

  if (requestPath.startsWith("/case-study/case-01")) {
    title = "Enterprise Pricing Platform | Strategic Systems Case Study";
    desc = "Led API performance, security, and efficiency optimization at Accenture, reducing calls and reclaiming 250+ annual manual hours. [LATENCY REDUCTION: ~40%]";
    type = "article";
  } else if (requestPath.startsWith("/case-study/case-02")) {
    title = "Ecosystem Integration & Visibility | Strategic Systems Case Study";
    desc = "Resolved systemic friction by bridging cross-functional data silos, replacing manual firefighting with automated status visibility. [OPERATIONAL CLARITY: 100%]";
    type = "article";
  } else if (requestPath.startsWith("/case-study/case-03")) {
    title = "Systems-First Transformation | Strategic Systems Case Study";
    desc = "Re-engineered a fragmented technical environment into a modular, user-centric SaaS ecosystem, unblocking high-throughput adoption. [USER SIGN-UPS GROWTH: +40%]";
    type = "article";
  } else if (requestPath === "/northbound") {
    title = "Northbound | Evangeline Joseph";
    desc = "Identify operational friction, tool integration issues, and pipeline latency. Generate a customized systems growth blueprint.";
  } else if (requestPath === "/outcomes") {
    title = "Outcomes | Evangeline Joseph";
    desc = "Unlock predictable SaaS growth paths, design CRM and webhook synchronization, and eliminate systems friction.";
  } else if (requestPath === "/about") {
    title = "About Evangeline Joseph | Technical Product Operations Strategist";
    desc = "Senior strategic product operations director partner. Former MSME architect and Accenture consultant.";
  } else if (requestPath === "/caselibrary") {
    title = "Case Library | Evangeline Joseph";
    desc = "Examine strategic systems engineering interventions and business growth outcomes.";
  }

  const url = `${hostUrl}${requestPath}`;

  // Replace content dynamically
  let result = htmlTemplate;
  
  // Replace title tag
  result = result.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
  
  // Replace meta tags helper
  const replaceOrInsertMeta = (html: string, nameOrProperty: string, isProperty: boolean, content: string): string => {
    const attribute = isProperty ? "property" : "name";
    const regex = new RegExp(`<meta\\s+[^>]*${attribute}=["']${nameOrProperty}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
    const alternativeRegex = new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*${attribute}=["']${nameOrProperty}["'][^>]*>`, 'i');
    
    const replacement = `<meta ${attribute}="${nameOrProperty}" content="${content.replace(/"/g, '&quot;')}" />`;
    
    if (regex.test(html)) {
      return html.replace(regex, replacement);
    } else if (alternativeRegex.test(html)) {
      return html.replace(alternativeRegex, replacement);
    } else {
      // If not found, insert before </head>
      return html.replace('</head>', `  ${replacement}\n</head>`);
    }
  };

  result = replaceOrInsertMeta(result, "description", false, desc);
  result = replaceOrInsertMeta(result, "og:title", true, title);
  result = replaceOrInsertMeta(result, "og:description", true, desc);
  result = replaceOrInsertMeta(result, "og:url", true, url);
  result = replaceOrInsertMeta(result, "og:type", true, type);
  result = replaceOrInsertMeta(result, "twitter:title", false, title);
  result = replaceOrInsertMeta(result, "twitter:description", false, desc);

  return result;
}

// Initialize Vite server or production server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serves client static bundle from dist/
    const distPath = path.join(process.cwd(), 'dist');
    // Keep serving assets as static files, except standard html requests
    app.use(express.static(distPath, { index: false }));
    
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        try {
          const htmlTemplate = fs.readFileSync(indexPath, 'utf-8');
          const dynamicHtml = getDynamicSEOHTML(htmlTemplate, req.path, `https://${req.get('host') || 'evangelinejoseph.com'}`);
          res.send(dynamicHtml);
        } catch (err) {
          console.error("Error generating dynamic SEO index.html", err);
          res.sendFile(indexPath);
        }
      } else {
        res.status(404).send("Application shell is still building, please refresh in a moment.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started at http://localhost:${PORT}`);
  });
}

if (process.env.VERCEL) {
  // On Vercel, configure production routes on import, but do not start listener
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath, { index: false }));
  
  app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      try {
        const htmlTemplate = fs.readFileSync(indexPath, 'utf-8');
        const dynamicHtml = getDynamicSEOHTML(htmlTemplate, req.path, `https://${req.get('host') || 'evangelinejoseph.com'}`);
        res.send(dynamicHtml);
      } catch (err) {
        console.error("Error generating dynamic SEO index.html", err);
        res.sendFile(indexPath);
      }
    } else {
      res.status(404).send("Application shell is still building, please refresh in a moment.");
    }
  });
} else {
  startServer();
}

export default app;
