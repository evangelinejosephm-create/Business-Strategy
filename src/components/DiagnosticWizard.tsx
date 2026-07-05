import { useState, FormEvent, useRef, useEffect } from "react";
import { STAGE_OPTIONS } from "../data";
import { DiagnosticResult } from "../types";
import { Loader2, ArrowUpRight, AlertCircle, Info, FileText, ChevronDown, Copy, Check, FileDown, Clock, ThumbsUp, ThumbsDown, MessageSquare, Mail, LogOut, TrendingUp, Target, ShieldAlert, ListChecks, Zap, BarChart2, Calendar, Award, Activity, Sparkles, TrendingDown, Briefcase, Building2, Globe } from "lucide-react";
import { jsPDF } from "jspdf";
import SuccessConfetti from "./SuccessConfetti";
import { googleSignIn, logout, initAuth } from "../lib/firebase";

interface ParsedStrategicReport {
  executiveSummary: string;
  bottlenecks: {
    title: string;
    description: string;
  }[];
  opportunities: {
    title: string;
    what: string;
    why: string;
  }[];
  questions: string;
  focusPoint: string;
}

function parseStrategicReport(text: string): ParsedStrategicReport | null {
  if (!text.includes("SECTION 1") && !text.includes("SECTION 2")) {
    return null;
  }

  try {
    const rawParts = text.split(/---SECTION \d+:\s*.+?---/i);
    const sectionsMap: Record<string, string> = {};
    const headers: string[] = [];
    let match;
    const headerRegex = /---SECTION \d+:\s*(.+?)---/gi;
    while ((match = headerRegex.exec(text)) !== null) {
      headers.push(match[1].trim().toUpperCase());
    }
    headers.forEach((header, idx) => {
      if (rawParts[idx + 1]) {
        sectionsMap[header] = rawParts[idx + 1].trim();
      }
    });

    const getSectionText = (keyword: string): string => {
      const foundKey = Object.keys(sectionsMap).find(k => k.includes(keyword.toUpperCase()));
      return foundKey ? sectionsMap[foundKey] : "";
    };

    const cleanMd = (str: string): string => {
      if (!str) return "";
      return str
        .replace(/\*\*/g, "")
        .replace(/^\*+|\*+$/g, "")
        .replace(/^[#:\s-]+|[:\s-]+$/g, "")
        .trim();
    };

    // SECTION 1: EXECUTIVE SUMMARY
    const summaryText = getSectionText("EXECUTIVE SUMMARY") || getSectionText("EXECUTIVE DIAGNOSIS") || rawParts[1] || "";
    const executiveSummary = cleanMd(summaryText);

    // SECTION 2: KEY SYSTEMIC GAPS
    const bottlenecksText = getSectionText("KEY SYSTEMIC GAPS") || getSectionText("SYSTEMIC GAPS") || getSectionText("KEY BOTTLENECKS") || getSectionText("BOTTLENECKS") || rawParts[2] || "";
    const bottlenecksRaw = bottlenecksText.split(/(?=^\d+\.\s+)/m).map(b => b.trim()).filter(b => b.length > 0);
    const bottlenecks = bottlenecksRaw.slice(0, 5).map((block, idx) => {
      const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      let title = lines[0] || `Gap ${idx + 1}`;
      title = cleanMd(title.replace(/^(\d+[\s.-]*|gap\s*\d+[\s.-]*|bottleneck\s*\d+[\s.-]*)/i, ""));

      const rawTextLines: string[] = [];
      lines.slice(1).forEach(line => {
        const lower = line.toLowerCase();
        if (lower.startsWith("description:") || lower.startsWith("gap:") || lower.startsWith("problem:")) {
          rawTextLines.push(line.replace(/^(description|gap|problem):\s*/i, "").trim());
        } else if (lower.startsWith("what:")) {
          rawTextLines.push(line.replace(/^what:\s*/i, "").trim());
        } else if (lower.startsWith("why:")) {
          rawTextLines.push(line.replace(/^why:\s*/i, "").trim());
        } else {
          rawTextLines.push(line);
        }
      });

      const description = cleanMd(rawTextLines.join(" "));

      return {
        title: title || `Gap ${idx + 1}`,
        description: description || "Unresolved strategic constraint slowing growth down."
      };
    });

    while (bottlenecks.length < 5) {
      bottlenecks.push({
        title: "Growth Pipeline Leaks",
        description: "Conversion points fail to transition user interest to paid adoption, directly delaying revenue goals."
      });
    }

    // SECTION 3: OPPORTUNITIES
    const oppText = getSectionText("OPPORTUNITIES") || rawParts[3] || "";
    const oppRaw = oppText.split(/(?=^\d+\.\s+)/m).map(o => o.trim()).filter(o => o.length > 0);
    const opportunities = oppRaw.slice(0, 3).map((block, idx) => {
      const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      let title = lines[0] || `Opportunity ${idx + 1}`;
      title = cleanMd(title.replace(/^(\d+[\s.-]*|opportunity\s*\d+[\s.-]*)/i, ""));

      let what = "";
      let why = "";

      let currentField = "";
      lines.slice(1).forEach(line => {
        const lower = line.toLowerCase();
        if (lower.startsWith("what:")) {
          what = line.replace(/^what:\s*/i, "").trim();
          currentField = "what";
        } else if (lower.startsWith("why:")) {
          why = line.replace(/^why:\s*/i, "").trim();
          currentField = "why";
        } else {
          if (currentField === "what") {
            what += "\n" + line;
          } else if (currentField === "why") {
            why += "\n" + line;
          } else {
            if (!what) {
              what = line;
              currentField = "what";
            } else {
              what += "\n" + line;
            }
          }
        }
      });

      return {
        title: title || `Opportunity ${idx + 1}`,
        what: cleanMd(what) || "Identified growth driver.",
        why: cleanMd(why) || "Tapping on this opportunity accelerates performance metrics."
      };
    });

    while (opportunities.length < 3) {
      opportunities.push({
        title: "Strategic Growth Initiative",
        what: "Tap into secondary channels to bolster active customer acquisition.",
        why: "Expands the active customer base and strengthens revenue retention."
      });
    }

    // SECTION 4: QUESTIONS WORTH INVESTIGATING
    const questionsText = getSectionText("QUESTIONS WORTH INVESTIGATING") || getSectionText("QUESTIONS") || rawParts[4] || "";
    const questions = cleanMd(questionsText);

    // SECTION 5: WHERE TO FOCUS NEXT
    const focusText = getSectionText("WHERE TO FOCUS NEXT") || getSectionText("WHERE TO FOCUS") || getSectionText("THINGS I WOULD FOCUS ON") || getSectionText("THINGS I WOULD FOCUS ONE") || getSectionText("FOCUS POINT") || getSectionText("CONSULTANT POINT OF VIEW") || rawParts[5] || "";
    const focusPoint = cleanMd(focusText);

    return {
      executiveSummary,
      bottlenecks,
      opportunities,
      questions,
      focusPoint
    };
  } catch (err) {
    console.error("Failed parsing structured strategic blueprint:", err);
    return null;
  }
}

function StructuredBlueprintView({ parsed }: { parsed: ParsedStrategicReport }) {
  return (
    <div className="space-y-10 select-text text-primary font-sans">
      {/* SECTION 1: KEY SYSTEMIC GAPS */}
      {parsed.bottlenecks && parsed.bottlenecks.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 border-b border-outline-variant/50 pb-3">
            <ShieldAlert size={18} className="text-secondary" />
            <h4 className="font-mono font-bold text-xs tracking-wider uppercase text-primary">
              01 - KEY SYSTEMIC GAPS
            </h4>
          </div>

          <div className="space-y-4">
            {parsed.bottlenecks.map((bottleneck, idx) => (
              <div
                key={idx}
                className="bg-white border border-outline-variant/60 rounded-xl p-5 hover:border-secondary/30 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2.5 border-b border-outline-variant/40 pb-3 mb-4">
                  <span className="bg-slate-900 text-white font-mono text-[10px] font-bold h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <h5 className="font-sans font-bold text-sm text-slate-900 tracking-tight">
                    {bottleneck.title}
                  </h5>
                </div>

                <div className="text-xs font-sans text-slate-700">
                  <div className="bg-slate-50/50 border border-slate-100/80 p-4 rounded-xl space-y-1">
                    <p className="text-slate-800 leading-relaxed font-sans text-sm whitespace-pre-wrap">{bottleneck.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: OPPORTUNITIES */}
      {parsed.opportunities && parsed.opportunities.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 border-b border-outline-variant/50 pb-3">
            <Zap size={18} className="text-secondary" />
            <h4 className="font-mono font-bold text-xs tracking-wider uppercase text-primary">
              02 - STRATEGIC GROWTH OPPORTUNITIES
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {parsed.opportunities.map((opp, idx) => (
              <div
                key={idx}
                className="bg-white border border-outline-variant/60 rounded-xl p-5 shadow-sm hover:border-secondary/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <h5 className="font-sans font-bold text-sm text-slate-900 mb-3 tracking-tight">
                    {opp.title}
                  </h5>
                  <div className="space-y-3 text-xs text-slate-600">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block font-bold">What is the Opportunity</span>
                      <p className="leading-relaxed font-sans whitespace-pre-wrap">{opp.what}</p>
                    </div>
                    <div className="space-y-1 pt-1.5 border-t border-slate-100">
                      <span className="text-[9px] font-mono text-emerald-700 uppercase tracking-widest block font-bold">Why Tapping This Helps Growth</span>
                      <p className="leading-relaxed font-sans text-slate-700 font-medium whitespace-pre-wrap">{opp.why}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: QUESTIONS WORTH INVESTIGATING */}
      {parsed.questions && (
        <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-md space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Award size={18} className="text-amber-400" />
            <h4 className="font-mono font-bold text-xs tracking-wider uppercase text-slate-300">
              03 - QUESTIONS WORTH INVESTIGATING
            </h4>
          </div>

          <div className="text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-wrap font-medium">
            {parsed.questions}
          </div>
        </div>
      )}

      {/* SECTION 4: WHERE TO FOCUS NEXT */}
      {parsed.focusPoint && (
        <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-amber-500/10 pb-3">
            <Target size={18} className="text-amber-600" />
            <h4 className="font-mono font-bold text-xs tracking-wider uppercase text-amber-900 font-bold">
              04 - WHERE TO FOCUS NEXT
            </h4>
          </div>

          <p className="text-slate-800 font-serif italic text-base leading-relaxed whitespace-pre-wrap">
            "{parsed.focusPoint}"
          </p>
        </div>
      )}
    </div>
  );
}

const OUTCOME_OPTIONS = [
  "Revenue Growth",
  "Product Strategy",
  "Customer Retention",
  "Operational Efficiency"
];

const PROBLEM_OPTIONS: Record<string, string[]> = {
  "Revenue Growth": [
    "Low Conversion",
    "Revenue Leakage",
    "Workflow Inefficiencies",
    "Scaling Bottlenecks",
    "Misaligned Priorities"
  ],
  "Product Strategy": [
    "Product-Market Fit",
    "Value Proposition",
    "Customer Insights",
    "Roadmap Clarity",
    "Go-to-Market Readiness"
  ],
  "Customer Retention": [
    "Customer Churn",
    "User Engagement",
    "Product Adoption",
    "Renewal Risk",
    "Customer Satisfaction"
  ],
  "Operational Efficiency": [
    "Process Bottlenecks",
    "Workflow Inefficiencies",
    "Resource Utilization",
    "Automation Opportunities",
    "Scalability Constraints"
  ]
};

const EXPECTED_RESULT_MAP: Record<string, string> = {
  "Low Conversion": "More customers taking action",
  "Revenue Leakage": "Captured growth opportunities",
  "Workflow Inefficiencies": "Faster, more efficient execution",
  "Scaling Bottlenecks": "Operations that support growth",
  "Misaligned Priorities": "Focus on what moves the business",
  "Product-Market Fit": "Products customers actively adopt",
  "Value Proposition": "Clearer differentiation and demand",
  "Customer Insights": "Better product decisions",
  "Roadmap Clarity": "Focused execution and investment",
  "Go-to-Market Readiness": "Faster path to market success",
  "Customer Churn": "Lower customer attrition and higher loyalty",
  "User Engagement": "Active and ongoing product usage",
  "Product Adoption": "Full utilization of key platform features",
  "Renewal Risk": "Predictable subscription renewals and expansions",
  "Customer Satisfaction": "High Net Promoter Score and stellar feedback",
  "Process Bottlenecks": "Eliminated delays in core operating workflows",
  "Resource Utilization": "Maximized productivity of key talent and resources",
  "Automation Opportunities": "Reduced overhead from repetitive manual entry",
  "Scalability Constraints": "Infrastructure and systems that scale seamlessly"
};

const INDUSTRY_OPTIONS = [
  "B2B SaaS/Enterprise",
  "E-commerce",
  "Education",
  "Energy",
  "Healthcare",
  "Logistics"
];

const PROGRESS_STEPS = [
  "Analyzing company website...",
  "Understanding business model...",
  "Benchmarking industry...",
  "Building issue tree...",
  "Prioritizing bottlenecks...",
  "Compiling strategic blueprint..."
];

const getWordCount = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
};

const limitToMaxWords = (text: string, maxWords: number) => {
  const parts = text.split(/(\s+)/);
  let count = 0;
  let result = [];
  for (const part of parts) {
    if (part.trim() !== "") {
      count++;
    }
    if (count > maxWords) {
      break;
    }
    result.push(part);
  }
  return result.join("");
};

function getClientFallbackBlueprint(
  companyName: string,
  ecosystemPhase: string,
  industry: string,
  bottleneck: string,
  summarizeProblem: string,
  expectedResult: string
) {
  const normalizedModel = String(bottleneck).trim();
  let text = "";

  if (normalizedModel === "Product Strategy") {
    text = `---SECTION 1: EXECUTIVE SUMMARY---
The website for ${companyName} shows real potential in the ${industry || "industry"} space. But here's the catch: when you try to build everything at once, you end up spreading your team too thin. By focusing on the exact features your users love most, you can clear out the noise, speed up your progress, and deliver consistent value that keeps people coming back.

---SECTION 2: KEY SYSTEMIC GAPS---
1. Broad Feature Plans
Description: Your developers are juggling too many feature requests at once. Because they are split in five different directions, big product updates take too long to ship, and your main features never get the focus they need to be truly great.

2. Unverified Feedback Windows
Description: You only find out if customers actually want a feature after you fully build and launch it. This means you risk spending weeks of coding time on tools that end up sitting untouched.

3. Uniform User Experience
Description: Every person signing up gets the exact same generic welcome, even if they have totally different goals. When onboarding is one-size-fits-all, people get confused and leave before they see your product's magic.

4. Unmeasured Setup Progression
Description: You don't have tracking to see where people drop off during setup. If you can't see the exact screen where users get stuck and exit, you can't fix the friction that's costing you customers.

5. Historical Product Paths
Description: Your team is sticking strictly to an old, pre-planned roadmap instead of reacting to what your users are telling you right now. This keeps you busy building yesterday's ideas instead of solving today's real needs.

---SECTION 3: OPPORTUNITIES---
1. Feature Consolidation
What: Declutter your interface and double down on the top three tools your active users can't live without.
Why: Focusing your energy on what already works boosts engagement and cuts your team's maintenance workload in half.

2. Clickable Prototyping
What: Put simple, clickable mockups in front of users to test demand before writing a single line of code.
Why: Getting real user reactions early stops you from wasting expensive developer hours on features nobody wants.

3. Context-Based Setup
What: Personalize the onboarding walkthrough based on who the user is and what they are trying to solve.
Why: When users get a tailored path to their first win, they stick around longer and upgrade much faster.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
Your website highlights some amazing features. But to unlock real growth, we need answers to three big questions:
• What is the exact feature that makes customers open their wallets and buy?
• Which specific type of user stays with you the longest?
• Where exactly do people lose interest and close the tab?
Knowing these answers lets you focus your team entirely on what brings in revenue.

---SECTION 5: WHERE TO FOCUS NEXT---
Where to focus next - Strategic Advisor Advice
I highly recommend pausing all side-projects and secondary features for a moment. Instead, point 100% of your team's bandwidth at tracking how people use your main product. Getting a crystal-clear picture of how users interact with your core value before writing any more code is the absolute fastest way to stabilize your product and unlock growth.`;
  } else if (normalizedModel === "Customer Retention") {
    text = `---SECTION 1: EXECUTIVE SUMMARY---
The website for ${companyName} showcases a really strong set of ${industry || "digital"} offerings. But to keep users paying month after month, you have to guide them to a 'win' early. Waiting for them to ask support for help is too slow—you need to proactively lead them to value on day one so they never think about canceling. This is a crucial step for protecting your recurring revenue.

---SECTION 2: KEY SYSTEMIC GAPS---
1. Extensive Registration Fields
Description: You are asking users for too much details and asking them to fill out long forms right after signing up. This high friction scares people away before they ever get to experience your actual product.

2. Self-Guided Feature Discovery
Description: New users are left to explore your app on their own with zero guidance. When people have to hunt around to find your best tools, they get confused, lose interest, and quietly leave.

3. Post-Cancellation Support
Description: You only reach out to customers after they click 'cancel'. By that point, they have already checked out mentally and stopped using your app weeks ago, making them nearly impossible to win back.

4. Restricted Basic Capabilities
Description: You put your most basic, habit-building tools behind a paywall too soon. If free-trial users can't experience the core daily value of your app, they won't build the habit needed to pay for a subscription.

5. Disconnected Usage Signals
Description: Your user data is scattered across different tracking tools. Because there is no single place to see who is active and who is quiet, you can't spot unhappy users in time to save them.

---SECTION 3: OPPORTUNITIES---
1. Simplified Entry Flow
What: Trim down your signup page to the absolute bare minimum, and ask extra profile questions only after they are set up.
Why: Making the signup effortless dramatically increases the number of accounts that actually finish onboarding.

2. Contextual Walkthroughs
What: Trigger helpful, bite-sized tooltips at the exact moment a user is about to try a key feature for the first time.
Why: Directing people to value right when their intent is highest builds strong daily usage habits.

3. Inactivity Alerts
What: Set up automatic alerts to tell your customer success team when a high-value user stops logging in for more than 5 days.
Why: Catching silent accounts early lets you reach out and solve their issues before they decide to cancel.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
Your website shows a strong commitment to supporting your users. But to keep them long-term, we need to know:
• Which specific setup screen makes the most users close the window?
• What exact action do your happiest, long-term renewing customers take in their first week?
• Which customer group cancels without ever opening a support ticket?
Answering these will show you exactly where to fix your leaky funnel.

---SECTION 5: WHERE TO FOCUS NEXT---
Where to focus next - Strategic Advisor Advice
I recommend putting all your energy into redesigning your registration and first-minute setup. Keep it under 4-5 simple input fields and save the extra profile questions for later. Cleaning up this initial experience is the absolute fastest way to boost first-week retention and convert casual signups into daily active users.`;
  } else if (normalizedModel === "Operational Efficiency") {
    text = `---SECTION 1: EXECUTIVE SUMMARY---
The website for ${companyName} reveals a highly specialized way of delivering services in the ${industry || "business"} space. But to scale up without your overhead spiraling out of control, you need to centralize your operations and automate hand-offs between teams. Getting your experts out of manual coordination and spreadsheet-handling will instantly free up their time to focus on high-value client work.

---SECTION 2: KEY SYSTEMIC GAPS---
1. Disconnected Task Trackers
Description: Different departments are using their own separate, unlinked tools to track projects. This creates informational walls and makes it impossible to get a single, real-time view of your operations.

2. Manual Information Duplication
Description: Your team is spending hours manually copying and pasting information between different systems. This burns high-value expert hours on repetitive admin tasks and leads to costly errors.

3. Late Delay Escalation
Description: Delays and roadblocks are only spotted after a project deadline has already been missed. Without an early-warning trigger, you can't step in to help before the client notices.

4. Undefined Transition Standards
Description: Tasks handed off between teams lack clean, standardized requirements. When half-finished work is passed over, it leads to endless back-and-forth communication, rework, and missed timelines.

5. Rigid Software Systems
Description: Your primary operating systems are built on older software that doesn't easily connect with modern platforms. This makes automating your everyday data flows incredibly difficult.

---SECTION 3: OPPORTUNITIES---
1. Centralized Pipeline
What: Set up a single, shared master pipeline to track all client deliverables from initiation to completion.
Why: Giving everyone full visibility lets your team spot and clear roadblocks before they delay client delivery.

2. Automated Webhooks
What: Build automatic webhook connections to pass data between your main software platforms instantly.
Why: Eliminating manual copying and pasting gives hours of focus time back to your team and stops administrative errors.

3. Standardized Checklists
What: Introduce a mandatory quality checklist at every major team-to-team hand-off point.
Why: Clear, agreed-upon standards mean work is done right the first time, keeping your project delivery predictable.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
Your website shows you handle complex, high-value delivery work. But to streamline it, we need to know:
• Which specific step in your process has the longest wait time?
• Which department is burning the most hours on manual data entry?
• Which single software connection will save your team the most hours?
Answering these will show you exactly where to automate first.

---SECTION 5: WHERE TO FOCUS NEXT---
Where to focus next - Strategic Advisor Advice
I recommend bringing all operational tracking into one shared master pipeline right away, and putting strict completion checklists at every team hand-off point. Streamlining how tasks move from team to team is the fastest way to eliminate rework, keep delivery timelines stable, and free up your senior staff to focus on growth.`;
  } else {
    // Default: "Revenue Growth"
    text = `---SECTION 1: EXECUTIVE SUMMARY---
The website for ${companyName} highlights a great solution in the ${industry || "technology"} space. But to convert that active visitor interest into paid accounts, you need to make upgrading effortless and prompt users when they are seeing your value. Streamlining this purchase path is the fastest way to capture unearned revenue and speed up your growth. This is a very common hurdle for growing SaaS companies.

---SECTION 2: KEY SYSTEMIC GAPS---
1. Multi-Step Purchase Paths
Description: Prospects have to click through multiple pages and fill out several forms just to purchase. This extra friction causes high drop-off rates right at the final checkout step.

2. Unclear Plan Differences
Description: Potential buyers can't easily see the difference between your pricing plans. When visitors face choice confusion, they suffer from decision fatigue and end up leaving without choosing.

3. Time-Based Upgrade Prompts
Description: Your upgrade prompts are triggered by calendar days (like a 14-day trial end) rather than active user behavior, missing the exact moment of peak need when they are most likely to buy.

4. Legacy Payment Portals
Description: Your checkout page is slow and lacks modern, fast checkout options like Google Pay or Apple Pay. This added friction stops high-intent buyers from completing their purchase quickly.

5. Restricted Funnel Analytics
Description: Your tracking only measures basic homepage visits and completed checkouts. Without step-by-step metrics in between, you can't see the exact checkout screen where you are losing revenue.

---SECTION 3: OPPORTUNITIES---
1. Single-Page Billing
What: Transition your multi-step checkout into a single-page checkout flow.
Why: Making the payment process as frictionless as possible turns existing customer interest into completed sales instantly.

2. Context-Based Prompts
What: Show helpful upgrade offers right when a user hits a usage limit or premium feature boundary.
Why: Prompting users to upgrade at their moment of peak need drastically increases your trial-to-paid conversion rate.

3. Differentiated Pricing Grid
What: Simplify your pricing page into three distinct, easily understood packages.
Why: Eliminating confusion helps your potential buyers choose the right plan and complete their purchase much faster.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
Your website presents a strong set of product options. But to maximize your revenue, we need to answer:
• Which subscription tier has the fastest purchase turnaround?
• Which specific usage limit or cap triggers the most upgrades?
• Which payment options are visitors looking for when they abandon the checkout?
Answering these will show you exactly how to structure your pricing for maximum lift.

---SECTION 5: WHERE TO FOCUS NEXT---
Where to focus next - Strategic Advisor Advice
I highly recommend focusing on replacing your multi-step checkout with a super-streamlined single-page billing portal that includes modern fast-pay options. Eliminating checkout complexity is the most direct path to recover lost sales, convert high-intent buyers, and immediately boost your revenue.`;
  }

  const integrityScore = Math.floor(Math.random() * 20) + (ecosystemPhase?.includes("Early") ? 55 : 70);
  const frictionScore = Math.floor(Math.random() * 20) + (bottleneck?.includes("Manual") ? 65 : 45);
  const automationScore = Math.floor(Math.random() * 30) + 40;

  return {
    isFallback: true,
    blueprint: text,
    score: integrityScore > 75 ? "A-" : integrityScore > 60 ? "B" : "C+",
    metrics: {
      structuralIntegrity: integrityScore,
      workflowFriction: frictionScore,
      automationMaturity: automationScore,
    },
    tacticalUrgency: frictionScore > 65 ? "CRITICAL" : "MODERATE"
  };
}

export default function DiagnosticWizard() {
  const [companyName, setCompanyName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("diag_companyName") || "";
    }
    return "";
  });
  const [emailAddress, setEmailAddress] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("diag_emailAddress") || "";
    }
    return "";
  });
  const [ecosystemPhase, setEcosystemPhase] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("diag_ecosystemPhase") || STAGE_OPTIONS[0];
    }
    return STAGE_OPTIONS[0];
  });
  const [industry, setIndustry] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("diag_industry") || INDUSTRY_OPTIONS[0];
    }
    return INDUSTRY_OPTIONS[0];
  });
  const [isOtherIndustry, setIsOtherIndustry] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("diag_industry");
      if (saved && !INDUSTRY_OPTIONS.includes(saved) && saved !== "Other") {
        return true;
      }
    }
    return false;
  });
  const [bottleneck, setBottleneck] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("diag_bottleneck") || OUTCOME_OPTIONS[0];
    }
    return OUTCOME_OPTIONS[0];
  });
  const [problemText, setProblemText] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("diag_problemText") || "";
    }
    return "";
  });
  const [expectedResult, setExpectedResult] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("diag_expectedResult") || "";
    }
    return "";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [result, setResult] = useState<DiagnosticResult | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("diag_result");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"like" | "dislike" | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);

  // Gmail integration states
  const [gmailToken, setGmailToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [showGmailPanel, setShowGmailPanel] = useState(false);
  const [gmailTo, setGmailTo] = useState("");
  const [gmailSubject, setGmailSubject] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">("idle");
  const [emailErrorMsg, setEmailErrorMsg] = useState("");

  // Google Calendar Integration States
  const [showCalendarPanel, setShowCalendarPanel] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingDuration, setMeetingDuration] = useState(60);
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  const fetchUpcomingEvents = async (token: string) => {
    setLoadingEvents(true);
    setCalendarError(null);
    try {
      const timeMin = new Date().toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&maxResults=5&singleEvents=true&orderBy=startTime`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!res.ok) {
        throw new Error("Failed to fetch calendar events");
      }
      const data = await res.json();
      setUpcomingEvents(data.items || []);
    } catch (err: any) {
      console.error("Error fetching calendar:", err);
      setCalendarError("Could not retrieve upcoming events. Check your permissions.");
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (gmailToken && showCalendarPanel) {
      fetchUpcomingEvents(gmailToken);
    }
  }, [gmailToken, showCalendarPanel]);

  useEffect(() => {
    if (result) {
      setMeetingTitle(`[Strategic Review] ${companyName || "Organization"} Blueprint Discussion`);
      
      // Default to tomorrow at 10:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setMeetingDate(`${yyyy}-${mm}-${dd}`);
      setMeetingTime("10:00");
    }
  }, [result, companyName]);

  const handleScheduleMeeting = async (e: FormEvent) => {
    e.preventDefault();
    if (!gmailToken) return;

    // MANDATORY confirmation dialog for mutated user-owned data
    const confirmMessage = `Schedule "${meetingTitle}" on your primary Google Calendar for ${meetingDate} at ${meetingTime}?`;
    const isConfirmed = window.confirm(confirmMessage);
    if (!isConfirmed) return;

    setSchedulingMeeting(true);
    setCalendarError(null);
    setScheduleSuccess(false);

    try {
      const startDateTimeStr = `${meetingDate}T${meetingTime}:00`;
      const startDate = new Date(startDateTimeStr);
      const endDate = new Date(startDate.getTime() + meetingDuration * 60 * 1000);

      const eventBody = {
        summary: meetingTitle,
        description: `Strategic Diagnostic Report briefing session for ${companyName || "your organization"}.\n\nPrimary Bottleneck: ${bottleneck}\nIndustry: ${industry}\n\nGenerated via Strategic Advisor Platform.`,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        },
        reminders: {
          useDefault: true
        }
      };

      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${gmailToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(eventBody)
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to schedule event: ${errorText}`);
      }

      setScheduleSuccess(true);
      await fetchUpcomingEvents(gmailToken);
    } catch (err: any) {
      console.error("Error scheduling event:", err);
      setCalendarError("Failed to schedule the briefing event. Please try again.");
    } finally {
      setSchedulingMeeting(false);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGmailToken(token);
        setUserEmail(user.email);
        setUserName(user.displayName);
      },
      () => {
        setGmailToken(null);
        setUserEmail(null);
        setUserName(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sequential progress updates effect while analyzing
  useEffect(() => {
    let interval: any = null;
    if (isLoading) {
      setCurrentStepIndex(0);
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < PROGRESS_STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1800); // Step updates every 1.8 seconds to feel organic
    } else {
      setCurrentStepIndex(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  // Persist diagnostic progress and answers to local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("diag_companyName", companyName);
    }
  }, [companyName]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("diag_emailAddress", emailAddress);
    }
  }, [emailAddress]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("diag_ecosystemPhase", ecosystemPhase);
    }
  }, [ecosystemPhase]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("diag_industry", industry);
    }
  }, [industry]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("diag_bottleneck", bottleneck);
    }
  }, [bottleneck]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("diag_problemText", problemText);
    }
  }, [problemText]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("diag_expectedResult", expectedResult);
    }
  }, [expectedResult]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (result) {
        localStorage.setItem("diag_result", JSON.stringify(result));
      } else {
        localStorage.removeItem("diag_result");
      }
    }
  }, [result]);

  // Update default To and Subject when result is compiled or user email changes
  useEffect(() => {
    if (result) {
      setGmailTo(userEmail || "");
      setGmailSubject(`[Executive Strategy Matrix] Bottleneck Audit for ${companyName || "Our Organization"}`);
    }
  }, [result, userEmail, companyName]);

  const handleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGmailToken(res.accessToken);
        setUserEmail(res.user.email);
        setUserName(res.user.displayName);
        setEmailStatus("idle");
      }
    } catch (e: any) {
      console.error("Sign in error:", e);
      setEmailStatus("error");
      setEmailErrorMsg("Failed to authenticate with Google. Please ensure popup windows are allowed.");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setGmailToken(null);
      setUserEmail(null);
      setUserName(null);
      setEmailStatus("idle");
    } catch (e: any) {
      console.error("Logout error:", e);
    }
  };

  const makeEmail = (to: string, from: string, subject: string, message: string) => {
    const str = [
      "Content-Type: text/html; charset=\"UTF-8\"\n",
      "MIME-Version: 1.0\n",
      "Content-Transfer-Encoding: 7bit\n",
      "to: ", to, "\n",
      "from: ", from, "\n",
      "subject: ", subject, "\n\n",
      message
    ].join("");

    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  const formatReportForGmail = (blueprint: string, meta: { companyName: string, bottleneck: string, emailAddress: string, industry: string }) => {
    const formattedBlueprint = blueprint
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .split("\n")
      .map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("1. Core Check") || trimmed.startsWith("1. ") || trimmed.startsWith("2. ") || trimmed.startsWith("3. ")) {
          return `<h4 style="color: #0f172a; margin-top: 20px; font-size: 15px; text-transform: uppercase;">${trimmed}</h4>`;
        } else if (trimmed.startsWith("- ")) {
          return `<li style="margin-bottom: 10px; color: #334155;">${trimmed.substring(2)}</li>`;
        } else if (trimmed === "") {
          return "<br/>";
        }
        return `<p style="color: #475569; margin: 4px 0;">${trimmed}</p>`;
      })
      .join("");

    return `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fbfbfa;">
        <div style="background-color: #0f172a; padding: 24px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 0.05em;">SYSTEMATIC BOTTLENECK AUDIT</h2>
          <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 11px;">CONFIDENTIAL STRATEGIC ADVISORY BLUEPRINT</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b; font-size: 11px; width: 150px;">WEBSITE:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px;">${meta.companyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b; font-size: 11px;">EMAIL:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px;">${meta.emailAddress}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b; font-size: 11px;">PRIMARY BOTTLENECK:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px;">${meta.bottleneck}</td>
          </tr>
        </table>

        <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #f1f5f9; font-size: 13px; line-height: 1.6; color: #334155;">
          ${formattedBlueprint}
        </div>
        
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Sent securely via Gmail Integration by <strong>Evangeline Joseph - Systems Strategy Suite</strong>.
        </p>
      </div>
    `;
  };

  const handleSendGmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!gmailToken || !result) return;
    setSendingEmail(true);
    setEmailStatus("idle");
    setEmailErrorMsg("");

    try {
      const emailBody = formatReportForGmail(result.blueprint, {
        companyName: companyName || "Unspecified",
        bottleneck,
        emailAddress: emailAddress || "Unspecified",
        industry
      });

      const rawEmail = makeEmail(gmailTo, "me", gmailSubject, emailBody);

      const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${gmailToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          raw: rawEmail
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to dispatch email via Gmail API");
      }

      setEmailStatus("success");
      setTimeout(() => {
        setShowGmailPanel(false);
        setEmailStatus("idle");
      }, 3500);
    } catch (err: any) {
      console.error("Gmail send error:", err);
      setEmailStatus("error");
      setEmailErrorMsg(err.message || "An error occurred while sending your email. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    setDownloadingPDF(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const margin = 20;
      const pageWidth = 210;
      const pageHeight = 297;
      const contentWidth = pageWidth - (margin * 2);
      let y = 20;

      // Helper for header on subsequent pages
      const addSubsequentHeader = (pageNum: number) => {
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(115, 125, 115);
        doc.text(`STRICTION CONSOLE - EXECUTIVE BLUEPRINT FOR ${companyName.toUpperCase()}`, margin, 12);
        doc.text(`PAGE ${pageNum}`, pageWidth - margin, 12, { align: "right" });
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, 14, pageWidth - margin, 14);
      };

      // --- PAGE 1 COVER / BANNER ---
      // Branded top header card
      doc.setFillColor(15, 23, 42); // Executive Slate-900 #0F172A
      doc.rect(margin, y, contentWidth, 32, "F");

      // Branded Accent line
      doc.setFillColor(71, 85, 105); // Slate-600 #475569
      doc.rect(margin, y + 32, contentWidth, 2, "F");

      // Text inside banner
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // Cool slate text
      doc.text("STRICTION ADVISORY STRATEGY SUITE - V2.0", margin + 8, y + 10);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255); // White text
      doc.text("SYSTEMATIC BOTTLENECK AUDIT", margin + 8, y + 19);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225); // Slate-300
      doc.text("CONFIDENTIAL STRATEGIC ADVISORY BLUEPRINT", margin + 8, y + 26);

      y += 42;

      // Metadata card with background
      doc.setFillColor(251, 251, 250); // Warm light gray #FBFBFA
      doc.setDrawColor(226, 232, 240); 
      doc.setLineWidth(0.4);
      doc.rect(margin, y, contentWidth, 48, "FD");

      // Metadata key/values
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 100);
      
      const leftColX = margin + 6;
      const rightColX = margin + (contentWidth / 2) + 2;

      // Left column
      doc.text("COMPANY WEBSITE:", leftColX, y + 8);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(34, 46, 38);
      doc.text(companyName || "Unspecified", leftColX, y + 13);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 100);
      doc.text("EMAIL ADDRESS:", leftColX, y + 23);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(emailAddress || "Unspecified", leftColX, y + 28);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 110);
      doc.text("PRIMARY BUSINESS GOAL:", leftColX, y + 38);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(bottleneck, leftColX, y + 43);

      // Right column
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 100);
      doc.text("INDUSTRY:", rightColX, y + 8);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(industry, rightColX, y + 13);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 100);
      doc.text("WHAT SUCCESS LOOKS LIKE:", rightColX, y + 23);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      // Let's wrap long expected result text
      const wrappedResult = doc.splitTextToSize(expectedResult || "N/A", (contentWidth / 2) - 8);
      doc.text(wrappedResult, rightColX, y + 28);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 100);
      doc.text("DATE OF COMPILE:", rightColX, y + 38);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }), rightColX, y + 43);

      y += 60;

      // Section Head
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(34, 46, 38);
      doc.text("COMPILED STRATEGY SCHEMATICS", margin, y);
      
      doc.setDrawColor(217, 167, 27); // Gold accent line
      doc.setLineWidth(0.6);
      doc.line(margin, y + 1.5, margin + 25, y + 1.5);
      
      y += 8;

      let currentPage = 1;

      // Split the blueprint into individual lines
      const lines = result.blueprint.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") {
          y += 3;
          continue;
        }

        // Check if page height boundary is exceeded
        if (y > 270) {
          doc.addPage();
          currentPage++;
          y = 25;
          addSubsequentHeader(currentPage);
          y += 5;
        }

        if (line.startsWith("---SECTION")) {
          // A Section Header delimiter
          const titleText = line.replace(/---SECTION \d+:\s*([^-]+)---/i, "$1").trim();
          
          if (y > 40) {
            y += 5;
          }

          if (y > 260) {
            doc.addPage();
            currentPage++;
            y = 25;
            addSubsequentHeader(currentPage);
            y += 5;
          }

          // Draw a solid rectangle banner in primary slate for SECTION headers
          doc.setFillColor(15, 23, 42);
          doc.rect(margin, y - 4, contentWidth, 6.5, "F");

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(255, 255, 255); // White text inside banner
          doc.text(titleText, margin + 3, y + 0.5);
          y += 8.5;
        } else if (line.startsWith("###") || line.startsWith("##") || line.match(/^\d+\./)) {
          // A Section Header
          const titleText = line.replace(/###|##/g, "").trim();
          
          // Let's add extra space before headers if not at the very top
          if (y > 40) {
            y += 4;
          }

          if (y > 265) {
            doc.addPage();
            currentPage++;
            y = 25;
            addSubsequentHeader(currentPage);
            y += 5;
          }

          // Draw small solid rectangle in primary slate for headings
          doc.setFillColor(15, 23, 42);
          doc.rect(margin, y - 3, 2, 4, "F");

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text(titleText, margin + 4, y);
          y += 6;

        } else if (line.startsWith("-") || line.startsWith("*")) {
          // A List Item
          const rawItem = line.substring(1).trim();
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);

          // Split the text to size so list item can wrap cleanly
          const wrappedItem = doc.splitTextToSize(rawItem, contentWidth - 8);
          
          // Draw small neat slate bullet
          doc.setFillColor(71, 85, 105);
          doc.circle(margin + 2, y - 1, 0.8, "F");

          // Render wrapped bullet item lines
          for (let j = 0; j < wrappedItem.length; j++) {
            if (y > 270) {
              doc.addPage();
              currentPage++;
              y = 25;
              addSubsequentHeader(currentPage);
              y += 5;
            }
            doc.text(wrappedItem[j], margin + 6, y);
            y += 4.5;
          }
        } else {
          // Generic paragraph text
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);

          const wrappedPara = doc.splitTextToSize(line, contentWidth);
          for (let j = 0; j < wrappedPara.length; j++) {
            if (y > 270) {
              doc.addPage();
              currentPage++;
              y = 25;
              addSubsequentHeader(currentPage);
              y += 5;
            }
            doc.text(wrappedPara[j], margin, y);
            y += 4.5;
          }
          y += 1.5;
        }
      }

      // Branded Advisory Footer on the final page
      if (y > 255) {
        doc.addPage();
        currentPage++;
        y = 25;
        addSubsequentHeader(currentPage);
        y += 5;
      }

      y += 10;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("EXECUTIVE ADVISORY STEERING BY EVANGELINE JOSEPH", margin, y);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("All strategic compiled criteria, structures, and checklists are issued under strict performance architecture protocols.", margin, y + 4);

      // Save document
      const fileName = `Striction_Diagnostic_Report_${companyName.replace(/\s+/g, "_") || "Executive"}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF download failed", err);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const textToCopy = `SYSTEM DIAGNOSTIC REPORT: ${companyName || "Unspecified"}
Email Address: ${emailAddress}
Industry: ${industry}
Strategy Matrix for: ${bottleneck}

---------------------------
${result.blueprint}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          fallbackCopyText(textToCopy);
        });
    } else {
      fallbackCopyText(textToCopy);
    }
  };

  const fallbackCopyText = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  const runDiagnostic = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Company Website is required to bind parameters.");
      return;
    }
    if (!emailAddress.trim()) {
      setError("Email Address is required to finalize system diagnostic.");
      return;
    }
    if (!problemText.trim()) {
      setError("Please enter or select at least one problem category.");
      return;
    }
    if (!expectedResult.trim()) {
      setError("Expected result is required.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setFeedbackType(null);
    setShowFeedbackForm(false);
    setFeedbackComment("");
    setFeedbackSuccess(false);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          emailAddress,
          ecosystemPhase,
          industry,
          bottleneck,
          summarizeProblem: problemText,
          expectedResult
        })
      });

      if (!response.ok) {
        throw new Error("Audit generation rejected by backend.");
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Non-JSON response received from /api/audit");
        throw new Error("The strategic server was restarting or unresponsive. Please wait 5 seconds and try again.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.warn("API Audit call failed, utilizing high-competency client-side strategy engine fallback:", err);
      try {
        const localData = getClientFallbackBlueprint(
          companyName,
          ecosystemPhase,
          industry,
          bottleneck,
          problemText,
          expectedResult
        );
        setResult(localData);
      } catch (localErr: any) {
        console.error("Local fallback failed:", localErr);
        setError(err.message || "Failed to finalize system diagnostic.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOutcomeChange = (newOutcome: string) => {
    setBottleneck(newOutcome);
    setProblemText("");
    setExpectedResult("");
  };

  return (
    <div id="diagnostic-compiler" className="bg-white border border-outline-variant p-6 md:p-10 shadow-[0_4px_24px_rgba(28,34,22,0.03)] rounded-lg">
      <div className="grid lg:grid-cols-12 gap-10">
        {/* Left Interactive Input Form */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={runDiagnostic} className="space-y-6">
            {/* Company Website */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-950 uppercase tracking-widest mb-2.5">
                Company Website
              </label>
              <input
                type="text"
                required
                placeholder="e.g. www.company.com"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/15 font-sans rounded-lg transition-all duration-150"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-950 uppercase tracking-widest mb-2.5">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="e.g. you@company.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/15 font-sans rounded-lg transition-all duration-150"
              />
            </div>

            {/* Market Vertical */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-950 uppercase tracking-widest mb-2.5">
                Market Vertical
              </label>
              {isOtherIndustry ? (
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Type your industry..."
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full pl-4 pr-16 py-3 border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/15 font-sans rounded-lg transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtherIndustry(false);
                      setIndustry(INDUSTRY_OPTIONS[0]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-amber-600 hover:text-slate-900 transition-colors uppercase tracking-widest font-bold cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={industry}
                    onChange={(e) => {
                      if (e.target.value === "Other") {
                        setIsOtherIndustry(true);
                        setIndustry("");
                      } else {
                        setIndustry(e.target.value);
                      }
                    }}
                    className="w-full pl-4 pr-10 py-3 border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/15 font-sans rounded-lg appearance-none transition-all cursor-pointer"
                  >
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>
              )}
            </div>

            {/* Business Goal */}
            <div className="space-y-2.5">
              <label className="block text-xs font-mono font-bold text-slate-950 uppercase tracking-widest">
                Business Goal
              </label>
              
              <div className="grid grid-cols-2 gap-2.5">
                {OUTCOME_OPTIONS.map((opt) => {
                  const isSelected = bottleneck === opt;
                  let icon = <TrendingUp size={13} className={isSelected ? "text-amber-600" : "text-slate-400"} />;
                  
                  if (opt === "Revenue Growth") {
                    icon = <TrendingUp size={13} className={isSelected ? "text-amber-600" : "text-slate-400"} />;
                  } else if (opt === "Product Strategy") {
                    icon = <Target size={13} className={isSelected ? "text-amber-600" : "text-slate-400"} />;
                  } else if (opt === "Customer Retention") {
                    icon = <Award size={13} className={isSelected ? "text-amber-600" : "text-slate-400"} />;
                  } else if (opt === "Operational Efficiency") {
                    icon = <Zap size={13} className={isSelected ? "text-amber-600" : "text-slate-400"} />;
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleOutcomeChange(opt)}
                      className={`flex items-center gap-2 p-3 border rounded-xl transition-all duration-200 cursor-pointer group hover:shadow-[0_2px_8px_rgba(0,0,0,0.02)] active:scale-95 ${
                        isSelected
                          ? "border-amber-500 bg-amber-50/45 shadow-xs ring-1 ring-amber-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      {icon}
                      <span className={`text-[11px] font-sans font-bold tracking-tight ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* What's slowing your business? */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-mono font-bold text-slate-950 uppercase tracking-widest">
                  What's slowing your business?
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  {getWordCount(problemText)}/500 words
                </span>
              </div>
              <textarea
                value={problemText}
                onChange={(e) => setProblemText(limitToMaxWords(e.target.value, 500))}
                placeholder="Describe current process bottlenecks or specific friction points..."
                rows={3}
                className="w-full px-4 py-3 border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/15 font-sans rounded-lg resize-none transition-all duration-150"
              />
            </div>

            {/* What does success look like? */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-mono font-bold text-slate-950 uppercase tracking-widest">
                  What does success look like?
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  {getWordCount(expectedResult)}/500 words
                </span>
              </div>
              <textarea
                required
                placeholder="What is your desired standard of excellence or key objective?"
                value={expectedResult}
                onChange={(e) => setExpectedResult(limitToMaxWords(e.target.value, 500))}
                rows={3}
                className="w-full px-4 py-3 border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/15 font-sans rounded-lg resize-none transition-all duration-150"
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 flex gap-2 rounded-xl">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative group overflow-hidden py-3.5 bg-slate-900 text-white font-mono hover:bg-secondary focus:bg-secondary transition-all flex items-center justify-center gap-2 cursor-pointer font-bold rounded-xl border border-slate-950 shadow-md active:scale-[0.98]"
            >
              {isLoading ? (
                <span className="flex items-center gap-1 font-mono font-bold tracking-widest uppercase text-xs">
                  Analyzing<span className="animate-pulse">.</span><span className="animate-pulse [animation-delay:0.2s]">.</span><span className="animate-pulse [animation-delay:0.4s]">.</span>
                </span>
              ) : (
                <div className="flex items-center gap-2 tracking-widest uppercase text-xs">
                  <span>Go Northbound</span>
                  <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Right Output Strategic Blueprint Panel */}
        <div className="lg:col-span-7 bg-white border border-outline p-6 flex flex-col relative lg:h-[760px] min-h-[480px] overflow-hidden rounded-lg shadow-[0_4px_24px_rgba(21,25,18,0.02)]">
          {isLoading && (
            <div className="absolute inset-0 bg-white flex flex-col justify-center p-8 md:p-12 z-10">
              <div className="max-w-md w-full mx-auto space-y-8">
                {/* Visual Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-secondary h-full transition-all duration-500 ease-out"
                      style={{ width: `${((currentStepIndex + 1) / PROGRESS_STEPS.length) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center font-mono text-[9px] text-primary/40 uppercase tracking-wider">
                    <span>Diagnostic Engine</span>
                    <span>{Math.round(((currentStepIndex + 1) / PROGRESS_STEPS.length) * 100)}% Complete</span>
                  </div>
                </div>

                {/* Sequential Steps List */}
                <div className="space-y-3.5 pt-2">
                  {PROGRESS_STEPS.map((step, idx) => {
                    const isCompleted = idx < currentStepIndex;
                    const isActive = idx === currentStepIndex;
                    
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-3.5 transition-all duration-300 ${
                          isActive ? "translate-x-1" : ""
                        }`}
                      >
                        {/* Status Indicator */}
                        {isCompleted ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                            <Check size={11} className="text-emerald-600 font-bold" />
                          </div>
                        ) : isActive ? (
                          <div className="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center shrink-0 border border-amber-300 relative">
                            <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                          </div>
                        )}

                        {/* Step Text */}
                        <span 
                          className={`text-xs font-mono tracking-wide ${
                            isCompleted ? "text-slate-400 font-medium" :
                            isActive ? "text-primary font-bold" :
                            "text-slate-300 font-normal"
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {!result && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <FileText size={48} className="text-secondary/40 mb-4" />
              <h4 className="font-sans font-semibold text-lg text-primary mb-2">Northbound</h4>
              <p className="text-sm text-on-surface-variant max-w-md">
                Reason through your next business decision
              </p>
            </div>
          )}

          {result && !isLoading && (
            <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-outline-variant/40 pb-4 shrink-0 mb-4">
                <div>
                  <p className="text-sm font-sans font-semibold text-slate-800">Strategy Matrix for {bottleneck}</p>
                  <h4 className="font-sans font-bold text-xl text-primary mt-1">{companyName || "Unspecified"}</h4>
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">{emailAddress} • {industry}</p>
                </div>
                
                <div className="flex justify-end items-center gap-2.5 self-start pt-1">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloadingPDF}
                    id="download-pdf-report"
                    className="flex items-center gap-2 px-3.5 py-1.5 border border-outline-variant hover:border-secondary bg-surface hover:bg-secondary-container/5 text-primary hover:text-secondary rounded-lg font-mono text-xs uppercase tracking-wide transition-all duration-200 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                    title="Download branded executive PDF blueprint"
                  >
                    {downloadingPDF ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-secondary" />
                        <span>Compiling PDF...</span>
                      </>
                    ) : (
                      <>
                        <FileDown size={13} className="text-secondary" />
                        <span>Download PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCopy}
                    id="copy-strategic-blueprint"
                    className="flex items-center gap-2 px-3.5 py-1.5 border border-outline-variant hover:border-secondary bg-surface hover:bg-secondary-container/5 text-primary hover:text-secondary rounded-lg font-mono text-xs uppercase tracking-wide transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
                    title="Copy response to clipboard"
                  >
                    {copied ? (
                      <>
                        <Check size={14} className="text-emerald-600 animate-pulse" />
                        <span className="text-[10px] font-semibold text-emerald-600 normal-case">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy Matrix</span>
                      </>
                    )}
                  </button>


                </div>
              </div>





              {/* Diagnostic result markdown output */}
              <div className="font-sans text-sm text-primary leading-relaxed select-text space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                {(() => {
                  const parsed = parseStrategicReport(result.blueprint);
                  if (parsed) {
                    return (
                      <div className="space-y-8">
                        <StructuredBlueprintView parsed={parsed} />
                        <div className="pt-6 border-t border-outline-variant/30 text-xs text-slate-500 italic font-normal">
                          Northbound offers perspective, not certainty. The best decisions still begin with you.
                        </div>
                      </div>
                    );
                  }

                  // Legacy / general markdown fallback
                  return (
                    <div className="space-y-8">
                      <div className="prose prose-slate max-w-none prose-sm">
                        {result.blueprint.split("\n").map((line, index) => {
                          const cleanLine = line.trim();
                          if (cleanLine.startsWith("###") || cleanLine.startsWith("##")) {
                            return (
                              <h5 key={index} className="font-bold text-primary mt-6 mb-3 border-b border-outline-variant/30 pb-1.5 uppercase tracking-tight font-sans text-sm">
                                {cleanLine.replace(/###|##/g, "").trim()}
                              </h5>
                            );
                          } else if (cleanLine.match(/^\d+\./)) {
                            return (
                              <h5 key={index} className="font-bold text-primary mt-6 mb-3 border-b border-outline-variant/30 pb-1.5 uppercase tracking-tight font-sans text-sm">
                                {cleanLine}
                              </h5>
                            );
                          } else if (cleanLine.startsWith("-") || cleanLine.startsWith("*")) {
                            return (
                              <li key={index} className="ml-4 list-disc text-xs text-on-surface-variant font-sans leading-relaxed mb-1">
                                {cleanLine.substring(1).trim()}
                              </li>
                            );
                          } else if (cleanLine === "") {
                            return <div key={index} className="h-4" />;
                          } else {
                            return <p key={index} className="text-xs text-on-surface-variant leading-relaxed font-sans">{cleanLine}</p>;
                          }
                        })}
                      </div>
                      <div className="pt-6 border-t border-outline-variant/30 text-xs text-slate-500 italic font-normal">
                        Northbound offers perspective, not certainty. The best decisions still begin with you.
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Feedback and Interactions Section */}
              <div className="border-t border-outline-variant/50 pt-4 mt-4 bg-surface-dim/40 -mx-6 -mb-6 px-6 py-4 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-on-surface-variant uppercase tracking-wider">
                      Was this helpful?
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setFeedbackType(feedbackType === "like" ? null : "like");
                          if (feedbackSuccess) setFeedbackSuccess(false);
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-150 cursor-pointer ${
                          feedbackType === "like"
                            ? "bg-emerald-50 border-emerald-500 text-emerald-600 shadow-xs animate-pulse"
                            : "bg-white border-outline-variant text-on-surface-variant hover:text-emerald-600 hover:border-emerald-300"
                        }`}
                        aria-label="Like response"
                        type="button"
                      >
                        <ThumbsUp size={14} className={feedbackType === "like" ? "scale-110" : ""} />
                      </button>
                      <button
                        onClick={() => {
                          setFeedbackType(feedbackType === "dislike" ? null : "dislike");
                          if (feedbackSuccess) setFeedbackSuccess(false);
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-150 cursor-pointer ${
                          feedbackType === "dislike"
                            ? "bg-rose-50 border-rose-500 text-rose-600 shadow-xs animate-pulse"
                            : "bg-white border-outline-variant text-on-surface-variant hover:text-rose-600 hover:border-rose-300"
                        }`}
                        aria-label="Dislike response"
                        type="button"
                      >
                        <ThumbsDown size={14} className={feedbackType === "dislike" ? "scale-110" : ""} />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowFeedbackForm(!showFeedbackForm);
                      if (feedbackSuccess) setFeedbackSuccess(false);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider border rounded-lg transition-all duration-150 cursor-pointer ${
                      showFeedbackForm
                        ? "bg-secondary text-white border-secondary shadow-sm"
                        : "bg-white border-outline-variant text-primary hover:text-secondary hover:border-secondary"
                    }`}
                    type="button"
                  >
                    <MessageSquare size={13} />
                    <span>Have feedback?</span>
                  </button>
                </div>

                {/* Interactive Feedback Form (Collapsible) */}
                {showFeedbackForm && (
                  <div className="mt-3 p-3 bg-white border border-outline-variant rounded-lg space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    {feedbackSuccess ? (
                      <div className="flex items-center gap-2 text-xs font-sans text-emerald-700 py-1 font-medium">
                        <Check size={14} className="text-emerald-600 shrink-0" />
                        <span>Thank you! Your feedback has been received.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          placeholder="What can be improved, or what was particularly valuable?"
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          rows={2}
                          className="w-full p-2.5 border border-outline-variant bg-surface-bright text-xs text-primary focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary font-sans rounded-md resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setShowFeedbackForm(false);
                              setFeedbackComment("");
                            }}
                            className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant hover:text-primary cursor-pointer"
                            type="button"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              if (feedbackComment.trim() || feedbackType) {
                                setSendingFeedback(true);
                                try {
                                  await fetch("/api/feedback", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                      feedbackType,
                                      feedbackComment,
                                      companyName: companyName || "Unspecified",
                                      emailAddress: emailAddress || "Not provided",
                                      industry,
                                      bottleneck,
                                      blueprint: result?.blueprint || ""
                                    })
                                  });
                                } catch (e) {
                                  console.error("Error submitting feedback:", e);
                                } finally {
                                  setSendingFeedback(false);
                                  setFeedbackSuccess(true);
                                  setFeedbackComment("");
                                }
                              }
                            }}
                            disabled={sendingFeedback}
                            className={`px-3.5 py-1 bg-primary text-white hover:bg-secondary transition-all font-mono text-[10px] uppercase tracking-wider rounded-md font-bold cursor-pointer flex items-center gap-1.5 ${sendingFeedback ? "opacity-60 cursor-wait" : ""}`}
                            type="button"
                          >
                            {sendingFeedback ? (
                              <>
                                <Loader2 size={12} className="animate-spin text-white" />
                                <span>Sending...</span>
                              </>
                            ) : (
                              <span>Submit</span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
