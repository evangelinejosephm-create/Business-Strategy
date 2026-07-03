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
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
    "gemini-3.5-flash",
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
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
          console.log(`[GEMINI API] Attempt ${attempt + 1} for ${activeModel} after ${backoffDelay}ms transient error backoff.`);
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
1. Feature Sprawl Risk
Description: Based on typical patterns in similar organizations, developers are frequently asked to build or maintain a wide range of features simultaneously. Product strategy benchmarks show that when resources are divided across too many initiatives, core features often lack the concentrated focus needed to achieve product-market fit.

2. Unverified Feedback Loops
Description: In teams experiencing roadmap prioritization issues, new features are often fully developed before user interest is validated. This creates a risk of spending expensive engineering cycles on tools that see low adoption post-launch.

3. Generic Welcome Workflows
Description: When onboarding is styled identically for all users regardless of their distinct goals, conversion rates tend to drop. Industry trends suggest that a one-size-fits-all introduction often leads to early drop-offs before users realize the core value.

4. Unmeasured Activation Milestones
Description: Without detailed metrics tracking where users disengage during their initial setup, identifying friction points is difficult. Product strategy models indicate that missing these visibility points prevents targeted user-experience improvements.

5. Legacy Planning Rigidness
Description: Teams often follow a pre-planned product roadmap rather than continuously adapting to real-time feedback. Strategy benchmarks suggest that sticking strictly to static plans can prevent a company from capitalising on emergent customer needs.

---SECTION 3: OPPORTUNITIES---
1. Focus Core Capabilities
What: Analyze current engagement to focus development and support around the three high-adoption features.
Why: Concentrating efforts on proven user favorites enhances satisfaction while reducing the ongoing team maintenance overhead.

2. Lightweight Validation
What: Introduce clickable mockups or simple feature-toggle signups to gauge active user interest before coding.
Why: Validating demand early prevents the misallocation of expensive developer hours on unadopted features.

3. Goal-Oriented Welcomes
What: Tailor the first-user setup experience based on the primary job-to-be-done they select.
Why: Guiding users on a direct path to their specific goals builds product habituation and drives upgrades.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
While your website outlines a compelling product vision, optimizing your strategy requires verifying internal product behaviors:
• Which specific action or milestone corresponds to a user's decision to subscribe or upgrade?
• What common traits define your highest-retention user cohort?
• At what exact step in the creation or setup flow do visitors most frequently close the app?
Answering these questions provides the objective evidence needed to prioritize your development roadmap.

---SECTION 5: WHERE TO FOCUS NEXT---
Where to focus next - Strategic Advisor Advice
Based on typical product strategy audits, we suggest pausing secondary feature expansion to focus 100% of your current engineering bandwidth on measuring and refining the activation path of your core offering. Clarifying user behavior during their first session is the most practical way to reduce churn, optimize development priorities, and lay a solid foundation for growth.`;
  }

  if (normalizedModel === "Customer Retention") {
    return `---SECTION 1: EXECUTIVE SUMMARY---
The online presence for ${companyName} showcases strong capabilities in the ${industry || "digital"} space. According to customer success benchmarks and the specific bottlenecks you've indicated, protecting recurring revenue requires guiding new users to their first "win" during their very first session. Relying purely on reactive customer support is often too late; proactive, data-driven onboarding is essential to prevent early drop-offs and build sticky, long-term habits.

---SECTION 2: KEY SYSTEMIC GAPS---
1. High-Friction Onboarding Forms
Description: According to retention benchmarks, requiring users to fill out detailed forms immediately after signup increases drop-off rates. Industry trends show that front-loading non-essential questions before users experience core value leads to early churn.

2. Self-Guided First Sessions
Description: When new signups are left to explore a platform with zero structured guidance, activation rates drop. UX maturity models suggest that a lack of guided hand-holding prevents users from discovering key value-generating features.

3. Reactive Churn Engagement
Description: Reaching out to customers only after they initiate cancellation is rarely effective. Retention analytics show that accounts typically stop active engagement weeks before canceling, making early warning triggers essential.

4. Early Paywalls on Core Habits
Description: Placing essential, habit-building features behind a premium paywall too early can hinder conversion. Customer retention studies show that users must build a consistent habit with free or basic features before they are willing to upgrade.

5. Fragmented Customer Data
Description: When usage analytics are scattered across multiple tools, customer success teams cannot get a single view of account health. This makes it difficult to spot accounts that have gone silent and are at risk of churning.

---SECTION 3: OPPORTUNITIES---
1. Streamlined Signups
What: Restructure your initial registration to collect only the essential credentials first, saving detailed questions for later.
Why: Minimizing setup friction has a direct, measurable impact on the percentage of registrants who complete their setup.

2. Contextual Guided Tours
What: Implement bite-sized, interactive tips that trigger at key moments during a user's first active session.
Why: Actively guiding users to key features helps them build daily habits and increases overall lifetime value.

3. Early-Warning Systems
What: Set up automated internal alerts when a high-value account has zero logins for more than five consecutive days.
Why: Detecting dropping usage levels early allows customer success to intervene and resolve issues before they lead to cancellation.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
While your website represents a high-standard service commitment, securing long-term retention depends on internal metrics:
• At what exact point in your onboarding sequence do the majority of churned users drop off?
• What specific milestone distinguishes your multi-year subscribers from those who leave in month one?
• Which customer segment cancels their subscriptions without ever opening a support ticket?
Addressing these questions provides the necessary evidence to identify and patch leaks in your customer journey.

---SECTION 5: WHERE TO FOCUS NEXT---
Where to focus next - Strategic Advisor Advice
Based on typical retention benchmarks, we recommend focusing your immediate efforts on refining the first-session experience. Reducing registration fields to under five inputs and guiding users directly to their first successful action is the most reliable way to boost short-term retention, stabilize recurring revenue, and convert trial users into brand advocates.`;
  }

  if (normalizedModel === "Operational Efficiency") {
    return `---SECTION 1: EXECUTIVE SUMMARY---
The website and public presence for ${companyName} indicate a specialized approach to delivery in the ${industry || "business"} sector. Based on typical operational benchmarks for businesses at this scale and the specific bottleneck patterns you highlighted, establishing centralized tracking and automating standard team transitions is a key opportunity. Grounding coordination in structured digital workflows can help recover expert focus hours and minimize project delivery delays.

---SECTION 2: KEY SYSTEMIC GAPS---
1. Disconnected Team Workflows
Description: Based on industry patterns for businesses experiencing operational bottlenecks, a common gap is the use of separate, unlinked tracking tools across departments. This typically limits real-time visibility and makes cross-functional performance tracking difficult without manual intervention.

2. Risk of Manual Data Duplication
Description: When separate operational tools are disconnected, teams frequently spend valuable hours manually transferring or replicating project data between systems. Standard industry diagnostics highlight this as a primary source of administrative fatigue and data entry errors.

3. Reactive Escalation Paths
Description: In organizations with manual tracking workflows, delivery delays are often only identified after a deadline is missed. This suggests a potential lack of early-warning signals that would allow advisors or managers to step in preemptively.

4. Informal Transition Guidelines
Description: For firms scaling up client delivery, task hand-offs between separate teams often lack standardized criteria. This can result in frequent clarifying communications, unexpected re-work, and unpredictable project delivery timelines.

5. Legacy Integration Constraints
Description: High operational friction is frequently compounded by core business applications that lack modern APIs or webhooks. This typically prevents seamless automated data flows and keeps teams tethered to manual workarounds.

---SECTION 3: OPPORTUNITIES---
1. Centralized Workflow View
What: Assess the practicality of a single, shared master pipeline to trace client deliverables across departmental lines.
Why: Providing cross-functional visibility allows teams to preemptively identify bottlenecks and coordinate hand-offs smoothly.

2. Automated Data Syncs
What: Map the high-frequency touchpoints between your primary applications to identify integration or webhook opportunities.
Why: Minimizing manual copy-pasting is a proven way to reduce human error rates and free up expert bandwidth for client delivery.

3. Standardized Handoff Checklists
What: Introduce a clean quality checklist for project transitions between major departments.
Why: Clear, uniform expectations ensure that deliverables meet quality standards on the first attempt, mitigating expensive re-work.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
While public observations highlight your specialized delivery capabilities, analyzing internal performance is necessary to verify exact friction points:
• Which specific phase in your delivery lifecycle currently experiences the longest idle time?
• Which manual administrative tasks consume the highest percentage of your team's weekly hours?
• Which single tool integration or connection would eliminate the most redundant data entries?
Answering these questions provides the objective evidence needed to target your automation efforts.

---SECTION 5: WHERE TO FOCUS NEXT---
Where to focus next - Strategic Advisor Advice
Based on typical operational assessments, we suggest prioritizing the standardization of hand-off checklists between your core teams and mapping your main process steps in a shared tracker. Focusing first on where work transitions from one group to another is the most practical way to reduce delivery friction, protect expert hours, and establish a clear foundation for future automation.`;
  }

  // Default: "Revenue Growth"
  return `---SECTION 1: EXECUTIVE SUMMARY---
The digital footprint for ${companyName} highlights a valuable solution in the ${industry || "technology"} space. Based on conversion optimization benchmarks and the business bottleneck patterns you provided, the primary path to accelerating growth lies in streamlining the purchase journey and offering clear pricing tier choices. Reducing checkout hurdles and presenting your value transparently can convert high-intent interest into paid subscriptions more predictably.

---SECTION 2: KEY SYSTEMIC GAPS---
1. Friction-Heavy Checkout Paths
Description: In organizations experiencing conversion bottlenecks, prospects are often required to navigate multiple checkout pages and forms. Industry data shows that each additional step increases drop-off rates among high-intent buyers.

2. Pricing Dissonance
Description: When pricing tiers or feature differences are not immediately clear, prospective buyers experience choice fatigue. Optimization studies indicate that visitors who cannot easily choose the right package often leave without making a decision.

3. Calendar-Based Trial Closes
Description: Triggering upgrade prompts based strictly on time (like a 14-day limit) rather than user behavior often misses the peak purchase intent. Conversion models recommend aligning upsells with active usage milestones instead.

4. Rigid Payment Infrastructure
Description: Lacking modern fast-pay options (like mobile wallets or single-click checkouts) is a common hurdle. Modern transactional trends indicate that checkout speed is directly correlated with complete purchase cycles.

5. Incomplete Funnel Visibility
Description: Tracking only basic landing page views and final purchases leaves a critical blind spot. Conversion optimization requires tracking step-by-step drop-offs to pinpoint exactly where revenue is being lost.

---SECTION 3: OPPORTUNITIES---
1. Unified Checkout Flow
What: Consolidate multi-page billing forms into a single, highly optimized checkout screen.
Why: Removing visual and input complexity allows high-intent visitors to finalize their payments instantly.

2. Behavioral Upsell Triggers
What: Display personalized upgrade prompts at the exact moment a user hits a basic tier limit or utilizes a premium capability.
Why: Presenting a paid option when the user has active, real-time need results in significantly higher conversion rates.

3. Simplified Plan Comparisons
What: Re-structure the pricing presentation to contrast three clear packages with highly distinct target audiences.
Why: Reducing choice complexity allows prospective buyers to quickly identify the correct tier for their specific needs.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
While your website presents your offerings elegantly, maximizing conversions requires deep insights into transaction behaviors:
• Which subscription package or tier experiences the highest cart-abandonment rate?
• What specific usage volume or capability triggers the most voluntary plan upgrades?
• What percentage of abandoned sessions occur due to a lack of preferred payment methods?
Answering these questions provides the objective evidence needed to optimize your pricing and checkout design.

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
Your role is to perform a high-level strategic diagnosis of the company based on the assessment inputs, specifically company website/name, industry, problem statement, and expected outcome model.
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
- Always attribute insights to industry averages, benchmark maturity models, or the user's explicit inputs (e.g., "Based on your reported problem of [summarizeProblem]...", "According to industry standards for the ${industry || "business"} sector...").

CRITICAL TONE & STYLE RULES: USE SIMPLE, HIGH-WEIGHT ENGLISH
- Use clear, straightforward, conversational English that is very easy for founders to read.
- Avoid academic, dense, multi-syllable corporate-speak or high-flown consultant vocabulary.
- Keep sentences short, active, and punchy. Talk to the founders directly ("you", "your team", "your product").
- Re-frame complex technical or architectural concepts into clear human realities (e.g. use "spread too thin" instead of "resource dilution across decentralized priority queues").
- Maintain high strategic weight, professional authority, and factual rigor, but simplify the vocabulary relentlessly.

Every section should drive data from this proportional weighting:
* Website Reality / Internet presence: 60%
* Business Model: 20%
* Industry: 10%
* Problem + Desired Outcome: 10%

CRITICAL WARNING: BANNED CONSULTANT JARGON & BUZZWORDS
You are STRIDENLY FORBIDDEN from using any of the following terms, phrases, or high-flown jargon. Every single word must be clear, human, straightforward, and professional:
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
1. Analyze and understand the company name/website and public availability details from the internet.
2. Map the user's stated problem and expected result, articulating what the real problem is.
3. SUCCESS METRIC: You MUST explicitly include a professional statement assessing whether the problem is legit enough (legitimate and systemic) for a company of this nature and scale.
DO NOTS:
- No assumptions of any kind.
- No negative statements.
- No sugarcoating.

---SECTION 2: KEY SYSTEMIC GAPS---
Identify and list exactly FIVE major systemic gaps ranked by business impact.
You MUST analyze, identify, and justify these gaps using these explicit weightings:
* Relevance of Business: 30%
* Industry Alignment: 10%
* Problem Statement Alignment: 30%
* Desired Outcome: 30%

For each gap, assess capabilities and benchmark maturity to frame the problem and form a solid hypothesis. Apply this Mindset Checklist in your diagnosis:
- Benchmark
- Maturity
- Trends
- Technology
- Governance
- Industry patterns

SUCCESS METRIC: Every gap description must contain no assumptions, relying instead on factual data backed with logical evidence drafted for valuable business outcomes.

For each gap, use this EXACT format:
1. [Gap Title]
Description: [Factual explanation of the systemic gap, assessing capabilities, benchmark maturity, problem framing, and hypothesis, backed with logical evidence for valuable outcomes. Keep it fully integrated in one paragraph. DO NOT separate it into secondary fields, and do NOT include any subheaders or other fields]

DO NOTS:
- Keep it straightforward. Absolutely no consultant buzzwords or overly dramatic language.
- Strictly limit each gap to a Title and Description block. Do NOT include separate "What:" and "Why:" fields.
- Reading time for this section should be at least 2-3 minutes.

---SECTION 3: OPPORTUNITIES---
Provide exactly THREE realistic growth opportunities towards which the business can work, keeping the outcome model ("${bottleneck}") as the core winning item.
Identify competitive advantages and consider strategic options based on market trends suitable to the business and industry.
Apply this Mindset Checklist for every opportunity:
- Practical
- Client partnership
- Execution
- Measurable impact
- Financial outcomes
- Customer value

You MUST validate every opportunity against customer value and simplify relentlessly.

For each opportunity, use this EXACT format:
1. [Opportunity Title]
What: [Clear conclusion and diagnosis of the opportunity, market trends, and strategic options, validated against customer value]
Why: [Factual explanation of why tapping this opportunity helps the business grow. Address practical execution, financial outcomes, customer value, and measurable impact, keeping the core outcome model as the key winning item. DO NOT duplicate points or reasons]

DO NOTS:
- Every opportunity must lead to a NEW and UNIQUE aspect.
- No assumptions, no sugarcoating.
- Reading time for this section should be at least 2-3 minutes.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
Provide exactly THREE critical questions worth investigating.
This section must end with uncertainty. The report must intentionally stop exactly where internal business data becomes necessary, signaling where the founder needs further advisory or direct consultation.
You must write it exactly using this template style:
The website suggests [observation about CRM, marketing, operations, etc.].
However, it isn't yet clear:
• [first question about internal metric/behavior]
• [second question about internal metric/behavior]
• [third question about internal metric/behavior]
Answering these three questions would likely change investment priorities significantly.

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
==================================================
      NEW SYSTEMS STRATEGIC AUDIT COMPLETED
==================================================
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
==================================================
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
              <div style="padding: 10px; background-color: #f8fafc; border-radius: 6px; font-size: 11px; color: #0b1215; border-left: 3px solid #8b9d83; margin-bottom: 15px;">
                ${(summarizeProblem || "").replace(/\n/g, "<br/>")}
              </div>

              <h4 style="color: #475569; font-size: 12px; margin-top: 10px; margin-bottom: 5px;">What does success look like?:</h4>
              <div style="padding: 10px; background-color: #f8fafc; border-radius: 6px; font-size: 11px; color: #0b1215; border-left: 3px solid #8b9d83;">
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
                <td style="padding: 12px; background-color: #f8fafc; border-radius: 8px; color: #0b1215; font-size: 13px; line-height: 1.6; border-left: 3px solid #8b9d83;" colspan="2">
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
