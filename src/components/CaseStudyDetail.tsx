import React, { useEffect } from "react";
import { motion } from "motion/react";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  X, 
  Layers, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  Database, 
  Cpu, 
  Users, 
  BarChart4, 
  Workflow
} from "lucide-react";

// Content catalog for calculating dynamic reading times
const CASE_STUD_CONTENT: Record<string, string> = {
  "case-01": `
    Enterprise Pricing Platform: API Performance, Security & Efficiency Optimization
    API Efficiency, Latency Reduction, Annual Manual Effort: 5-7 to 2-3 Calls, ~40%, 250+ Hours Saved.
    Endpoint batch optimization and payload deduplication. Reduced wait cycles during high-complexity pricing algorithms retrieval.
    Eliminated tedious spreadsheet file parsing and manual cross-checks.
    At Accenture, I led the optimization of an enterprise platform responsible for calculating resource pricing using complex cost factors. By auditing API architecture and strengthening security controls, we accelerated pricing workflows and eliminated hundreds of hours of manual data handling.
    The Challenge: High complexity and performance bottlenecks in the legacy API architecture created significant security risks and operational drag on pricing teams.
    My Role: Analyzed architecture, identified vulnerabilities, prioritized performance improvements, and managed the Agile lifecycle from development through UAT.
    API Architecture Audit: Conducted a detailed mapping of data flows and redundant calls that slowed down resource pricing calculations. Data Flow Mapping, Vulnerability Identification.
    API Aggregation & Security: Designed consolidated API endpoints to reduce the number of calls per request. This simplified workflows and minimized dependencies. Need-based Data Access, Endpoint Consolidation.
    Standardization & UAT: Unified API formats across teams and supported rigorous user acceptance testing to ensure cross-functional reliability. Format Harmonization, Agile Stakeholder Management.
    "APIs in enterprise environments are not just integration layers — they directly dictate business decision speed, data security, and operational efficiency."
  `,
  "case-02": `
    Ecosystem Integration: Resolving Systemic Friction for Shadowfax
    Executive Summary: Transformed a fragmented logistics operation into a unified, scalable ecosystem by bridging the gap between cross-functional teams and communication channels.
    "The intervention replaced manual 'firefighting' with automated visibility, ensuring operational continuity during rapid scaling."
    Operational Clarity, Workflow Efficiency, Scale Readiness: 100%, 35%, Up to 5x.
    Full visibility across logistics lifecycles. Reduction in manual tracking updates. WhatsApp paired with Core system. Prepared for high-volume delivery sprees.
    The Problem & Operational Disconnect. The challenge was not merely process delay; it was a fundamental lack of continuity. As Shadowfax scaled, information was trapped in silos across WhatsApp, Email, and fragmented tracking systems. Manual coordination was required to identify transit errors, creating severe backlog overheads.
    Strategic Approach to Diagnosis: Phase 1: Workflow Mapping. Conducted an end-to-end audit of existing logistics paths to identify where communication breaks occurred.
    Phase 2: Gap Identification. Pinpointed the exact nodes where manual intervention was required due to system silos.
    Phase 3: Automation Framework Design. Designed a logic-first framework to automate status updates and visibility triggers.
    Phase 4: Integration Strategy Execution. Architected a unified communication layer to sync Live Tracking data with team-facing dashboards.
    "Operational workflows cannot exist in isolation from communication structures. For a system to scale, the flow of information must be as robust as the movement of goods—otherwise, growth simply scales friction."
  `,
  "case-03": `
    Systems-First Transformation: Architecting 40% User Growth for BotPath
    Mission Summary: Re-engineering a fragmented technical environment into a modular, user-centric SaaS ecosystem through systematic workflow deconstruction. B2B SaaS / Automation.
    Outcome Metrics: +40% User Sign-ups, -60% Support Load, 3.5x Faster Deployment, 92% Satisfaction Score.
    The Challenge: Non-technical users faced steep learning curves and high friction due to complex API dependencies and a fragmented Chrome extension experience.
    Strategy & Approach: Technical Audit Phase 01. Conducted a deep forensic audit of existing API dependencies to identify structural friction points and high-latency nodes.
    Modular Architecture Phase 02. Developed a library of low-code components and reusable logic blocks to enable non-technical users to deploy complex automations.
    UI/UX Systems Logic Phase 03. Redesigned the Chrome extension and web interface as a unified technical system, ensuring seamless cross-platform performance.
    "In enterprise SaaS, the goal isn't just to add features—it's to architect out the complexity that prevents adoption. A clean technical foundation is the ultimate growth lever."
  `
};

function getWordCount(caseId: string): number {
  const text = CASE_STUD_CONTENT[caseId] || "";
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getReadingTime(caseId: string): number {
  const words = getWordCount(caseId);
  const wordsPerMinute = 200; // Average reading speed
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

interface CaseStudyDetailProps {
  caseId: string;
  onBack: () => void;
  onNavigate: (id: string) => void;
  onDiscuss: () => void;
}

export default function CaseStudyDetail({ caseId, onBack, onNavigate, onDiscuss }: CaseStudyDetailProps) {
  // Scroll to top on load or navigation transition
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [caseId]);

  // Case Study data matching user design specifications
  if (caseId === "case-01") {
    // Enterprise Pricing Platform Page Design (Image 1)
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-surface-bg text-primary pt-24 pb-20 px-6 md:px-16"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Breadcrumb / Top Header Indicator */}
          <div className="flex justify-between items-center border-b border-outline pb-6">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 font-mono text-xs text-on-surface-variant hover:text-secondary transition-colors cursor-pointer group font-semibold"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform text-secondary" />
              BACK TO PORTFOLIO
            </button>
            <span className="font-mono text-[10px] text-secondary tracking-widest uppercase font-bold">
              01 // ENTERPRISE PRICING PLATFORM API OPTIMIZATION
            </span>
          </div>

          {/* Main Display Header */}
          <div className="space-y-6 font-sans">
            <div className="flex items-center gap-2 font-mono text-[10px] bg-surface-dim border border-outline px-3 py-1.5 rounded-lg w-fit">
              <Clock size={12} className="text-secondary" />
              <span className="uppercase tracking-widest font-extrabold text-on-surface-variant">
                {getReadingTime("case-01")} MIN READ / {getWordCount("case-01")} WORDS
              </span>
            </div>
            <span className="font-mono text-xs text-secondary tracking-widest block uppercase font-extrabold">
              ENTERPRISE PRICING PLATFORM API OPTIMIZATION
            </span>
            <h1 className="font-sans font-extrabold text-3xl md:text-5xl lg:text-6xl text-primary tracking-tight leading-[1.1] max-w-5xl">
              Enterprise Pricing Platform: API Performance, Security & Efficiency Optimization
            </h1>
          </div>

          {/* KPI Metrics displays (3 column grid) */}
          <div className="grid md:grid-cols-3 gap-8 py-10 border-y border-outline">
            <div className="space-y-2 card-accent border-l border-outline pl-6">
              <span className="font-mono text-[10px] text-secondary uppercase tracking-wider block font-bold">API EFFICIENCY</span>
              <div className="text-3xl md:text-4xl font-mono font-bold text-primary">5-7 to 2-3 Calls</div>
              <p className="text-xs text-on-surface-variant font-sans leading-relaxed">Endpoint batch optimization and payload deduplication.</p>
            </div>
            <div className="space-y-2 card-accent border-l border-outline pl-6">
              <span className="font-mono text-[10px] text-secondary uppercase tracking-wider block font-bold">LATENCY REDUCTION</span>
              <div className="text-3xl md:text-4xl font-mono font-bold text-primary">~40%</div>
              <p className="text-xs text-on-surface-variant font-sans leading-relaxed">Reduced wait cycles during high-complexity pricing algorithms retrieval.</p>
            </div>
            <div className="space-y-2 card-accent border-l border-outline pl-6">
              <span className="font-mono text-[10px] text-secondary uppercase tracking-wider block font-bold">ANNUAL MANUAL EFFORT</span>
              <div className="text-3xl md:text-4xl font-mono font-bold text-primary">250+ Hours Saved</div>
              <p className="text-xs text-on-surface-variant font-sans leading-relaxed">Eliminated tedious spreadsheet file parsing and manual cross-checks.</p>
            </div>
          </div>

          {/* Challenge & Objective Blocks */}
          <div className="grid lg:grid-cols-12 gap-12 pt-6">
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-6 bg-secondary" />
                <span className="font-mono text-xs text-secondary tracking-widest uppercase font-extrabold">OBJECTIVE // 01 / CHALLENGES</span>
              </div>
              <p className="font-sans text-base md:text-lg text-on-surface-variant leading-relaxed">
                At Accenture, I led the optimization of an enterprise platform responsible for calculating resource pricing using complex cost factors. By auditing API architecture and strengthening security controls, we accelerated pricing workflows and eliminated hundreds of hours of manual data handling.
              </p>
            </div>

            <div className="lg:col-span-6 grid sm:grid-cols-2 gap-6">
              <div className="bg-white border border-outline-variant p-8 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.03)] space-y-3">
                <h4 className="font-mono text-xs text-secondary uppercase tracking-widest font-extrabold">THE CHALLENGE</h4>
                <p className="text-xs text-on-surface-variant font-sans leading-relaxed">
                  High complexity and performance bottlenecks in the legacy API architecture created significant security risks and operational drag on pricing teams.
                </p>
              </div>
              <div className="bg-white border border-outline-variant p-8 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.03)] space-y-3">
                <h4 className="font-mono text-xs text-secondary uppercase tracking-widest font-extrabold">MY ROLE</h4>
                <p className="text-xs text-on-surface-variant font-sans leading-relaxed">
                  Analyzed architecture, identified vulnerabilities, prioritized performance improvements, and managed the Agile lifecycle from development through UAT.
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-outline" />

          {/* Methodology / Architectural Strategy */}
          <div className="space-y-10 pt-6">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-6 bg-secondary" />
              <span className="font-mono text-xs text-secondary tracking-widest uppercase font-extrabold">METHODOLOGY // 02 / ARCHITECTURAL STRATEGY</span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white border border-outline-variant p-8 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.03)] space-y-4">
                <div className="text-2xl font-mono text-secondary font-extrabold">01</div>
                <h4 className="font-sans font-bold text-lg text-primary">API Architecture Audit</h4>
                <p className="text-xs text-on-surface-variant font-sans leading-relaxed">
                  Conducted a detailed mapping of data flows and redundant calls that slowed down resource pricing calculations.
                </p>
                <div className="space-y-2 border-t border-outline-variant pt-4 text-xs font-mono text-primary">
                  <div className="flex items-center gap-2 font-semibold"><Check size={12} className="text-secondary" /> Data Flow Mapping</div>
                  <div className="flex items-center gap-2 font-semibold"><Check size={12} className="text-secondary" /> Vulnerability Identification</div>
                </div>
              </div>

              <div className="bg-white border border-outline-variant p-8 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.03)] space-y-4">
                <div className="text-2xl font-mono text-secondary font-extrabold">02</div>
                <h4 className="font-sans font-bold text-lg text-primary">API Aggregation & Security</h4>
                <p className="text-xs text-on-surface-variant font-sans leading-relaxed">
                  Designed consolidated API endpoints to reduce the number of calls per request. This simplified workflows and minimized dependencies.
                </p>
                <div className="space-y-2 border-t border-outline-variant pt-4 text-xs font-mono text-primary">
                  <div className="flex items-center gap-2 font-semibold"><Check size={12} className="text-secondary" /> Need-based Access</div>
                  <div className="flex items-center gap-2 font-semibold"><Check size={12} className="text-secondary" /> Endpoint Consolidation</div>
                </div>
              </div>

              <div className="bg-white border border-outline-variant p-8 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.03)] space-y-4">
                <div className="text-2xl font-mono text-secondary font-extrabold">03</div>
                <h4 className="font-sans font-bold text-lg text-primary">Standardization & UAT</h4>
                <p className="text-xs text-on-surface-variant font-sans leading-relaxed">
                  Unified API formats across teams and supported rigorous user acceptance testing to ensure cross-functional reliability.
                </p>
                <div className="space-y-2 border-t border-outline-variant pt-4 text-xs font-mono text-primary">
                  <div className="flex items-center gap-2 font-semibold"><Check size={12} className="text-secondary" /> Format Harmonization</div>
                  <div className="flex items-center gap-2 font-semibold"><Check size={12} className="text-secondary" /> Agile Stakeholder Mgmt</div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-outline" />

          {/* Results: Quantifiable Impact */}
          <div className="space-y-8 pt-6">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-6 bg-secondary" />
              <span className="font-mono text-xs text-secondary tracking-widest uppercase font-extrabold">RESULTS // 03 / QUANTIFIABLE IMPACT</span>
            </div>

            <div className="grid lg:grid-cols-12 gap-12 items-center">
              {/* Left Side: Progress sliders */}
              <div className="lg:col-span-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="uppercase text-[#2c3127] tracking-wider font-bold">REDUCED LATENCY (PRICING WORKFLOWS)</span>
                    <span className="text-secondary font-bold">40%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-dim border border-outline-variant rounded-lg overflow-hidden">
                    <div className="h-full bg-secondary rounded-lg" style={{ width: "40%" }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="uppercase text-[#2c3127] tracking-wider font-bold">SECURITY & COMPLIANCE ADHERENCE</span>
                    <span className="text-secondary font-bold">100%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-dim border border-outline-variant rounded-lg overflow-hidden">
                    <div className="h-full bg-secondary rounded-lg" style={{ width: "100%" }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="uppercase text-[#2c3127] tracking-wider font-bold">MANUAL HOURS ELIMINATED SAVES</span>
                    <span className="text-secondary font-bold">250+ Hrs</span>
                  </div>
                  <div className="h-2 w-full bg-surface-dim border border-outline-variant rounded-lg overflow-hidden">
                    <div className="h-full bg-secondary rounded-lg" style={{ width: "85%" }} />
                  </div>
                </div>
              </div>

              {/* Right Side: Big Insight Quote */}
              <div className="lg:col-span-6 bg-white border border-outline p-8 md:p-12 rounded-lg relative shadow-[0_4px_24px_rgba(28,34,22,0.03)]">
                <span className="absolute top-6 right-8 text-6xl text-secondary/15 font-serif leading-none select-none">”</span>
                <p className="font-sans text-lg md:text-xl text-primary leading-relaxed italic mb-6">
                  "APIs in enterprise environments are not just integration layers — they directly dictate business decision speed, data security, and operational efficiency."
                </p>
                <div className="border-t border-outline-variant pt-4">
                  <span className="font-mono text-[9px] text-secondary tracking-widest block uppercase mb-1 font-bold">KEY STRATEGIC INSIGHT</span>
                  <span className="text-xs uppercase tracking-wide font-extrabold text-primary">CROSS-FUNCTIONAL API STRATEGY</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Navigation Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-outline rounded-lg p-3.5 mt-16 gap-4 shadow-sm">
            <button 
              onClick={() => onNavigate("case-03")}
              className="flex items-center gap-2 font-mono text-xs text-on-surface-variant hover:text-secondary px-6 py-3 cursor-pointer group font-semibold"
            >
              ← PREVIOUS CASE STUDY
            </button>
            <button 
              onClick={onDiscuss}
              className="bg-secondary text-white hover:bg-primary transition-all font-mono text-xs font-extrabold uppercase px-8 py-3.5 rounded-lg shadow-sm cursor-pointer"
            >
              DISCUSS YOUR API STRATEGY
            </button>
            <button 
              onClick={() => onNavigate("case-02")}
              className="flex items-center gap-2 font-mono text-xs text-on-surface-variant hover:text-secondary px-6 py-3 cursor-pointer group font-semibold"
            >
              NEXT CASE STUDY →
            </button>
          </div>

        </div>
      </motion.div>
    );
  }

  if (caseId === "case-02") {
    // Ecosystem Integration for Shadowfax (Image 2)
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-surface-bg text-primary pt-24 pb-20 px-6 md:px-16"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Breadcrumb / Top Header Indicator */}
          <div className="flex justify-between items-center border-b border-outline pb-6">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 font-mono text-xs text-on-surface-variant hover:text-secondary transition-colors cursor-pointer group font-semibold"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform text-secondary" />
              BACK TO PORTFOLIO
            </button>
            <span className="font-mono text-[10px] text-secondary tracking-widest uppercase font-bold">
              02 // CASE STUDY — LOGISTICS & INTEGRATION
            </span>
          </div>

          {/* Main Display Header */}
          <div className="space-y-6 font-sans">
            <div className="flex items-center gap-2 font-mono text-[10px] bg-surface-dim border border-outline px-3 py-1.5 rounded-lg w-fit">
              <Clock size={12} className="text-secondary" />
              <span className="uppercase tracking-widest font-extrabold text-on-surface-variant">
                {getReadingTime("case-02")} MIN READ / {getWordCount("case-02")} WORDS
              </span>
            </div>
            <span className="font-mono text-xs text-secondary tracking-widest block uppercase font-extrabold">
              CASE STUDY — LOGISTICS & INTEGRATION
            </span>
            <h1 className="font-sans font-extrabold text-3xl md:text-5xl lg:text-6xl text-primary tracking-tight leading-[1.1] max-w-5xl">
              Ecosystem Integration: Resolving Systemic Friction for Shadowfax
            </h1>
          </div>

          {/* Executive Summary Block */}
          <div className="bg-white border border-outline-variant p-8 md:p-12 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.03)] grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-4 space-y-2 border-r border-outline-variant pr-6">
              <span className="font-mono text-[10px] text-secondary tracking-widest uppercase block font-bold">EXECUTIVE SUMMARY</span>
              <p className="text-xs text-on-surface-variant font-sans leading-relaxed">
                Transformed a fragmented logistics operation into a unified, scalable ecosystem by bridging the gap between cross-functional teams and communication channels.
              </p>
            </div>
            <div className="md:col-span-8 pl-2">
              <h3 className="font-sans font-semibold text-lg md:text-xl text-primary italic leading-relaxed">
                "The intervention replaced manual 'firefighting' with automated visibility, ensuring operational continuity during rapid scaling."
              </h3>
            </div>
          </div>

          {/* KPI Metrics displays of Shadowfax integration (3 columns grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 border-y border-outline col-span-1 border-opacity-70">
            <div className="space-y-1">
              <span className="font-mono text-[9px] text-secondary tracking-widest block font-bold uppercase">OPERATIONAL CLARITY</span>
              <div className="text-2xl md:text-3xl font-mono font-bold text-primary">100%</div>
              <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed">Full visibility across logistics lifecycles.</p>
            </div>
            <div className="space-y-1 border-l border-outline-variant pl-4 md:pl-6">
              <span className="font-mono text-[9px] text-secondary tracking-widest block font-bold uppercase">WORKFLOW EFFICIENCY</span>
              <div className="text-2xl md:text-3xl font-mono font-bold text-primary">35%</div>
              <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed">Reduction in manual tracking updates.</p>
            </div>
            <div className="space-y-1 border-l border-outline-variant pl-4 md:pl-6">
              <span className="font-mono text-[9px] text-secondary tracking-widest block font-bold uppercase">SCALE READINESS</span>
              <div className="text-2xl md:text-3xl font-mono font-bold text-primary">Up to 5x</div>
              <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed">Prepared for high-volume delivery sprees.</p>
            </div>
          </div>

          {/* 01 / THE PROBLEM */}
          <div className="grid lg:grid-cols-12 gap-12 pt-6">
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-6 bg-secondary" />
                <span className="font-mono text-xs text-secondary tracking-widest uppercase font-extrabold">01 / THE PROBLEM</span>
              </div>
              <h3 className="font-sans font-bold text-2xl text-primary">The Operational Disconnect</h3>
            </div>
            <div className="lg:col-span-8">
              <p className="font-sans text-base md:text-lg text-on-surface-variant leading-relaxed">
                The challenge was not merely process delay; it was a fundamental lack of continuity. As Shadowfax scaled, information was trapped in silos across WhatsApp, Email, and fragmented tracking systems. Manual coordination was required to identify transit errors, creating severe backlog overheads.
              </p>
            </div>
          </div>

          <div className="h-px bg-outline" />

          {/* 02 / STRATEGIC DIAGNOSIS: Strategic Approach */}
          <div className="space-y-8 pt-6">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-6 bg-secondary" />
              <span className="font-mono text-xs text-secondary tracking-widest uppercase font-extrabold">02 / STRATEGIC DIAGNOSIS</span>
            </div>
            <h3 className="font-sans font-bold text-xl text-primary uppercase tracking-tight">Strategic Approach</h3>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-outline-variant p-6 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.02)] space-y-3_copy">
                <span className="font-mono text-[10px] text-secondary block font-bold">01. PHASE</span>
                <h4 className="font-sans font-bold text-base text-primary">WORKFLOW MAPPING</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed font-sans">
                  Conducted an end-to-end audit of existing logistics paths to identify where communication breaks occurred.
                </p>
              </div>

              <div className="bg-white border border-outline-variant p-6 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.02)] space-y-3_copy">
                <span className="font-mono text-[10px] text-secondary block font-bold">02. ANALYSIS</span>
                <h4 className="font-sans font-bold text-base text-primary">GAP IDENTIFICATION</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed font-sans">
                  Pinpointed the exact nodes where manual intervention was required due to system silos.
                </p>
              </div>

              <div className="bg-white border border-outline-variant p-6 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.02)] space-y-3_copy">
                <span className="font-mono text-[10px] text-secondary block font-bold">03. DESIGN</span>
                <h4 className="font-sans font-bold text-base text-primary">AUTOMATION FRAMEWORK</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed font-sans">
                  Designed a logic-first framework to automate status updates and visibility triggers.
                </p>
              </div>

              <div className="bg-white border border-outline-variant p-6 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.02)] space-y-3_copy">
                <span className="font-mono text-[10px] text-secondary block font-bold">04. EXECUTION</span>
                <h4 className="font-sans font-bold text-base text-primary">INTEGRATION STRATEGY</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed font-sans">
                  Architected a unified communication layer to sync Live Tracking data with team-facing dashboards.
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-outline" />

          {/* 03 / IMPACT & BLUEPRINT */}
          <div className="space-y-8 pt-6">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-6 bg-secondary" />
              <span className="font-mono text-xs text-secondary tracking-widest uppercase font-extrabold">03 / THE CONSULTANT'S BLUEPRINT</span>
            </div>

            <div className="bg-white border border-outline-variant p-8 md:p-12 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.03)] max-w-4xl mx-auto text-center space-y-6">
              <span className="text-5xl text-secondary/35 font-serif leading-none block">“</span>
              <h3 className="font-sans font-bold text-xl md:text-2xl text-primary leading-relaxed italic max-w-3xl mx-auto">
                "Operational workflows cannot exist in isolation from communication structures. For a system to scale, the flow of information must be as robust as the movement of goods—otherwise, growth simply scales friction."
              </h3>
              <div className="h-px w-20 bg-secondary mx-auto opacity-40 mt-4" />
              <span className="font-mono text-[9px] text-secondary tracking-widest block uppercase font-bold">SYSTEMS INTEGRATION FORMULA</span>
            </div>
          </div>

          {/* Footer Navigation Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-outline rounded-lg p-3.5 mt-16 gap-4 shadow-sm">
            <button 
              onClick={() => onNavigate("case-01")}
              className="flex items-center gap-2 font-mono text-xs text-on-surface-variant hover:text-secondary px-6 py-3 cursor-pointer group font-semibold"
            >
              ← PREVIOUS CASE STUDY
            </button>
            <button 
              onClick={onDiscuss}
              className="bg-secondary text-white hover:bg-primary transition-all font-mono text-xs font-extrabold uppercase px-8 py-3.5 rounded-lg shadow-sm cursor-pointer"
            >
              DISCUSS YOUR INTEGRATION STRATEGY
            </button>
            <button 
              onClick={() => onNavigate("case-03")}
              className="flex items-center gap-2 font-mono text-xs text-on-surface-variant hover:text-secondary px-6 py-3 cursor-pointer group font-semibold"
            >
              NEXT CASE STUDY →
            </button>
          </div>

        </div>
      </motion.div>
    );
  }

  if (caseId === "case-03") {
    // Systems-First Transformation for BotPath (Image 3)
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-surface-bg text-primary pt-24 pb-20 px-6 md:px-16"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Breadcrumb / Top Header Indicator */}
          <div className="flex justify-between items-center border-b border-outline pb-6">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 font-mono text-xs text-on-surface-variant hover:text-secondary transition-colors cursor-pointer group font-semibold"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform text-secondary" />
              BACK TO PORTFOLIO
            </button>
            <span className="font-mono text-[10px] text-secondary tracking-widest uppercase font-bold">
              03 // CASE STUDY: BOTPATH
            </span>
          </div>

          {/* Main Display Header */}
          <div className="space-y-6 font-sans">
            <div className="flex items-center gap-2 font-mono text-[10px] bg-surface-dim border border-outline px-3 py-1.5 rounded-lg w-fit">
              <Clock size={12} className="text-secondary" />
              <span className="uppercase tracking-widest font-extrabold text-on-surface-variant">
                {getReadingTime("case-03")} MIN READ / {getWordCount("case-03")} WORDS
              </span>
            </div>
            <span className="font-mono text-xs text-secondary tracking-widest block uppercase font-extrabold">
              CASE STUDY: BOTPATH
            </span>
            <h1 className="font-sans font-extrabold text-3xl md:text-5xl lg:text-6xl text-primary tracking-tight leading-[1.1] max-w-5xl">
              Systems-First Transformation: Architecting 40% User Growth for BotPath
            </h1>
          </div>

          {/* Quick specs section */}
          <div className="grid md:grid-cols-12 gap-6 items-center bg-white border border-outline-variant p-8 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.03)]">
            <div className="md:col-span-8">
              <span className="font-mono text-[9px] text-secondary tracking-widest uppercase block mb-2 font-bold">MISSION SUMMARY</span>
              <p className="text-sm md:text-base text-on-surface-variant leading-relaxed font-sans">
                Re-engineering a fragmented technical environment into a modular, user-centric SaaS ecosystem through systematic workflow deconstruction.
              </p>
            </div>
            <div className="md:col-span-4 border-l border-outline-variant pl-6 space-y-1 h-full flex flex-col justify-center">
              <span className="font-mono text-[9px] text-secondary block uppercase tracking-wider font-bold">INDUSTRY</span>
              <div className="text-sm font-mono font-bold text-primary tracking-wide">B2B SaaS / Automation</div>
            </div>
          </div>

          {/* 4 Outcome Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-8 border-y border-outline">
            <div className="text-center md:text-left space-y-1">
              <div className="text-3xl md:text-4xl font-mono font-bold text-primary">+40%</div>
              <span className="font-mono text-[9px] text-on-surface-variant block uppercase font-extrabold tracking-wide">USER SIGN-UPS</span>
            </div>
            <div className="text-center md:text-left space-y-1 border-l border-outline-variant pl-4 md:pl-6">
              <div className="text-3xl md:text-4xl font-mono font-bold text-primary">-60%</div>
              <span className="font-mono text-[9px] text-on-surface-variant block uppercase font-extrabold tracking-wide">SUPPORT LOAD</span>
            </div>
            <div className="text-center md:text-left space-y-1 border-l border-outline-variant pl-4 md:pl-6">
              <div className="text-3xl md:text-4xl font-mono font-bold text-primary">3.5x</div>
              <span className="font-mono text-[9px] text-on-surface-variant block uppercase font-extrabold tracking-wide">FASTER DEPLOYMENT</span>
            </div>
            <div className="text-center md:text-left space-y-1 border-l border-outline-variant pl-4 md:pl-6">
              <div className="text-3xl md:text-4xl font-mono font-bold text-primary">92%</div>
              <span className="font-mono text-[9px] text-on-surface-variant block uppercase font-extrabold tracking-wide">SATISFACTION SCORE</span>
            </div>
          </div>

          {/* THE CHALLENGE */}
          <div className="grid lg:grid-cols-12 gap-12 pt-6">
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-6 bg-secondary" />
                <span className="font-mono text-xs text-secondary tracking-widest uppercase font-extrabold">THE CHALLENGE</span>
              </div>
            </div>
            <div className="lg:col-span-8">
              <p className="font-sans text-lg md:text-xl text-primary leading-relaxed font-semibold">
                Non-technical users faced steep learning curves and high friction due to complex API dependencies and a fragmented Chrome extension experience.
              </p>
            </div>
          </div>

          <div className="h-px bg-outline" />

          {/* STRATEGY & APPROACH */}
          <div className="space-y-8 pt-6">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-6 bg-secondary" />
              <span className="font-mono text-xs text-secondary tracking-widest uppercase font-extrabold">STRATEGY & APPROACH</span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white border border-outline-variant p-8 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.03)] space-y-4">
                <div className="w-10 h-10 bg-secondary/15 flex items-center justify-center border border-secondary/25 rounded-lg">
                  <BarChart4 size={18} className="text-secondary" />
                </div>
                <h4 className="font-sans font-bold text-lg text-primary">Technical Audit</h4>
                <p className="text-xs text-on-surface-variant font-sans leading-relaxed">
                  Conducted a deep forensic audit of existing API dependencies to identify structural friction points and high-latency nodes.
                </p>
                <div className="font-mono text-[9px] text-secondary tracking-widest uppercase block pt-2 border-t border-outline-variant font-bold">
                  PHASE 01: AUDIT
                </div>
              </div>

              <div className="bg-white border border-outline-variant p-8 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.03)] space-y-4">
                <div className="w-10 h-10 bg-secondary/15 flex items-center justify-center border border-secondary/25 rounded-lg">
                  <Database size={18} className="text-secondary" />
                </div>
                <h4 className="font-sans font-bold text-lg text-primary">Modular Architecture</h4>
                <p className="text-xs text-on-surface-variant font-sans leading-relaxed">
                  Developed a library of low-code components and reusable logic blocks to enable non-technical users to deploy complex automations.
                </p>
                <div className="font-mono text-[9px] text-secondary tracking-widest uppercase block pt-2 border-t border-outline-variant font-bold">
                  PHASE 02: MODULARIZE
                </div>
              </div>

              <div className="bg-white border border-outline-variant p-8 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.03)] space-y-4">
                <div className="w-10 h-10 bg-secondary/15 flex items-center justify-center border border-secondary/25 rounded-lg">
                  <Workflow size={18} className="text-secondary" />
                </div>
                <h4 className="font-sans font-bold text-lg text-primary">UI/UX Systems Logic</h4>
                <p className="text-xs text-on-surface-variant font-sans leading-relaxed">
                  Redesigned the Chrome extension and web interface as a unified technical system, ensuring seamless cross-platform performance.
                </p>
                <div className="font-mono text-[9px] text-secondary tracking-widest uppercase block pt-2 border-t border-outline-variant font-bold">
                  PHASE 03: SCALE
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-outline" />

          {/* LARGE INSIGHT QUOTE */}
          <div className="space-y-8 pt-6">
            <div className="bg-white border border-outline-variant p-8 md:p-12 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.03)] max-w-4xl mx-auto text-center space-y-6">
              <span className="text-5xl text-secondary/35 font-serif leading-none block">“</span>
              <h3 className="font-sans font-bold text-xl md:text-2xl text-primary leading-relaxed italic max-w-3xl mx-auto">
                "In enterprise SaaS, the goal isn't just to add features—it's to architect out the complexity that prevents adoption. A clean technical foundation is the ultimate growth lever."
              </h3>
              <div className="h-px w-20 bg-secondary mx-auto opacity-40 mt-4" />
              <span className="font-mono text-[9px] text-secondary tracking-widest block uppercase font-bold">STRATEGIC INSIGHT</span>
            </div>
          </div>

          {/* Footer Navigation Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-outline rounded-lg p-3.5 mt-16 gap-4 shadow-sm">
            <button 
              onClick={() => onNavigate("case-02")}
              className="flex items-center gap-2 font-mono text-xs text-on-surface-variant hover:text-secondary px-6 py-3 cursor-pointer group font-semibold"
            >
              ← PREVIOUS CASE STUDY
            </button>
            <button 
              onClick={onDiscuss}
              className="bg-secondary text-white hover:bg-primary transition-all font-mono text-xs font-extrabold uppercase px-8 py-3.5 rounded-lg shadow-sm cursor-pointer"
            >
              DISCUSS YOUR PRODUCT STRATEGY
            </button>
            <button 
              onClick={() => onNavigate("case-01")}
              className="flex items-center gap-2 font-mono text-xs text-on-surface-variant hover:text-secondary px-6 py-3 cursor-pointer group font-semibold"
            >
              NEXT CASE STUDY →
            </button>
          </div>

        </div>
      </motion.div>
    );
  }

  return null;
}
