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
    diagnosis?: string;
    whereToInvestigate?: string;
    whyThisMatters?: string;
    businessImpact?: string;
    rootCauses?: string;
    beneathSurface?: string;
    potentialWays?: string;
  }[];
  opportunities: {
    title: string;
    recommendation?: string;
    expectedImpact?: string;
    whyPrioritize?: string;
    whyExists?: string;
    howAchieved?: string;
    whereLook?: string;
    howValidate?: string;
  }[];
  questions: string;
  focusPoint: string;
  focusSteps?: string[];
  alternativeInterpretation?: string;
}

function parseStrategicReport(text: string): ParsedStrategicReport | null {
  if (!text.includes("SECTION 1") && !text.includes("SECTION 2") && !text.includes("KEY GAPS") && !text.includes("GAPS")) {
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
        .replace(/^[#:\s•-]+|[:\s•-]+$/g, "")
        .trim();
    };

    // SECTION 1: EXECUTIVE SUMMARY (May be empty/absent in 4-section format)
    const summaryText = getSectionText("EXECUTIVE SUMMARY") || getSectionText("EXECUTIVE DIAGNOSIS") || "";
    const executiveSummary = cleanMd(summaryText);

    // SECTION 2: KEY SYSTEMIC GAPS
    const bottlenecksText = getSectionText("KEY GAPS") || getSectionText("KEY SYSTEMIC GAPS") || getSectionText("SYSTEMIC GAPS") || getSectionText("KEY BOTTLENECKS") || getSectionText("BOTTLENECKS") || rawParts[1] || "";
    let bottlenecksRaw = bottlenecksText.split(/(?=^\d+[\s.-]+)/m).map(b => b.trim()).filter(b => b.length > 0);
    if (bottlenecksRaw.length <= 1) {
      bottlenecksRaw = bottlenecksText.split(/(?=^\*\*\w[^*]+\*\*)/m).map(b => b.trim()).filter(b => b.length > 0);
    }
    const bottlenecks = bottlenecksRaw.slice(0, 3).map((block, idx) => {
      const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      let title = lines[0] || `Gap ${idx + 1}`;
      title = cleanMd(title.replace(/^(\d+[\s.-]*|gap\s*\d+[\s.-]*|bottleneck\s*\d+[\s.-]*)/i, ""));

      let whyThisMatters = "";
      let beneathSurface = "";
      let potentialWays = "";
      let businessImpact = "";
      let rootCauses = "";
      let diagnosis = "";
      let whereToInvestigate = "";

      let currentField = "";
      lines.slice(1).forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes("why this matters:")) {
          whyThisMatters = line.substring(line.toLowerCase().indexOf("why this matters:") + "why this matters:".length).trim();
          currentField = "whyThisMatters";
        } else if (lower.includes("beneath the surface:") || lower.includes("beneath surface:") || lower.includes("what may be happening beneath the surface:")) {
          let label = "beneath the surface:";
          if (lower.includes("what may be happening beneath the surface:")) label = "what may be happening beneath the surface:";
          else if (lower.includes("beneath surface:")) label = "beneath surface:";
          beneathSurface = line.substring(line.toLowerCase().indexOf(label) + label.length).trim();
          currentField = "beneathSurface";
        } else if (lower.includes("potential ways to address") || lower.includes("ways to address") || lower.includes("potential ways:")) {
          let label = "potential ways to address it:";
          if (lower.includes("potential ways to address this:")) label = "potential ways to address this:";
          else if (lower.includes("potential ways to address:")) label = "potential ways to address:";
          else if (lower.includes("ways to address:")) label = "ways to address:";
          else if (lower.includes("potential ways:")) label = "potential ways:";
          potentialWays = line.substring(line.toLowerCase().indexOf(label) + label.length).trim();
          currentField = "potentialWays";
        } else if (lower.includes("business impact:")) {
          businessImpact = line.substring(line.toLowerCase().indexOf("business impact:") + "business impact:".length).trim();
          currentField = "businessImpact";
        } else if (lower.includes("root causes:")) {
          rootCauses = line.substring(line.toLowerCase().indexOf("root causes:") + "root causes:".length).trim();
          currentField = "rootCauses";
        } else if (lower.includes("diagnosis:")) {
          diagnosis = line.substring(line.toLowerCase().indexOf("diagnosis:") + "diagnosis:".length).trim();
          currentField = "diagnosis";
        } else if (lower.includes("where to investigate:") || lower.includes("where leadership should investigate:")) {
          let label = "where to investigate:";
          if (lower.includes("where leadership should investigate:")) label = "where leadership should investigate:";
          whereToInvestigate = line.substring(line.toLowerCase().indexOf(label) + label.length).trim();
          currentField = "whereToInvestigate";
        } else {
          const cleanedLine = line.replace(/^[*•-\s\d.]+\s*/, "").trim();
          if (currentField === "whyThisMatters") {
            whyThisMatters += " " + cleanedLine;
          } else if (currentField === "beneathSurface") {
            beneathSurface += " " + cleanedLine;
          } else if (currentField === "potentialWays") {
            potentialWays += " " + cleanedLine;
          } else if (currentField === "businessImpact") {
            businessImpact += " " + cleanedLine;
          } else if (currentField === "rootCauses") {
            rootCauses += " " + cleanedLine;
          } else if (currentField === "diagnosis") {
            diagnosis += "\n" + line;
          } else if (currentField === "whereToInvestigate") {
            whereToInvestigate += "\n" + line;
          } else {
            diagnosis = diagnosis ? diagnosis + "\n" + line : line;
            currentField = "diagnosis";
          }
        }
      });

      const finalDiagnosis = cleanMd(diagnosis);
      const finalWhere = cleanMd(whereToInvestigate);
      const finalBeneath = cleanMd(beneathSurface) || finalDiagnosis;
      const finalPotential = cleanMd(potentialWays) || finalWhere;

      return {
        title: title || `Gap ${idx + 1}`,
        diagnosis: finalDiagnosis,
        whereToInvestigate: finalWhere,
        whyThisMatters: cleanMd(whyThisMatters),
        businessImpact: cleanMd(businessImpact),
        rootCauses: cleanMd(rootCauses),
        beneathSurface: finalBeneath,
        potentialWays: finalPotential
      };
    });

    while (bottlenecks.length < 3) {
      bottlenecks.push({
        title: "Growth Pipeline Leaks",
        diagnosis: "Conversion points fail to transition user interest to paid adoption, directly delaying revenue goals.",
        whereToInvestigate: "Friction-heavy onboarding states and unoptimized checkout sequences.",
        whyThisMatters: "",
        businessImpact: "",
        rootCauses: "",
        beneathSurface: "Conversion points fail to transition user interest to paid adoption, directly delaying revenue goals.",
        potentialWays: "Streamline onboarding states and unoptimized checkout sequences."
      });
    }

    // SECTION 2: OPPORTUNITIES
    const oppText = getSectionText("OPPORTUNITIES") || getSectionText("STRATEGIC OPPORTUNITIES") || rawParts[2] || "";
    let oppRaw = oppText.split(/(?=^\d+[\s.-]+)/m).map(o => o.trim()).filter(o => o.length > 0);
    if (oppRaw.length <= 1) {
      oppRaw = oppText.split(/(?=^\*\*\w[^*]+\*\*)/m).map(o => o.trim()).filter(o => o.length > 0);
    }
    const opportunities = oppRaw.slice(0, 3).map((block, idx) => {
      const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      let title = lines[0] || `Opportunity ${idx + 1}`;
      title = cleanMd(title.replace(/^(\d+[\s.-]*|opportunity\s*\d+[\s.-]*)/i, ""));

      let whyExists = "";
      let howAchieved = "";
      let whereLook = "";
      let howValidate = "";
      let recommendation = "";
      let expectedImpact = "";
      let whyPrioritize = "";

      let currentField = "";
      lines.slice(1).forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes("why this opportunity exists:")) {
          whyExists = line.substring(line.toLowerCase().indexOf("why this opportunity exists:") + "why this opportunity exists:".length).trim();
          currentField = "whyExists";
        } else if (lower.includes("how this could be achieved:") || lower.includes("how this can be achieved:") || lower.includes("how this could be achieved")) {
          let label = "how this could be achieved:";
          if (lower.includes("how this can be achieved:")) label = "how this can be achieved:";
          howAchieved = line.substring(line.toLowerCase().indexOf(label) + label.length).trim();
          currentField = "howAchieved";
        } else if (lower.includes("where to look first:")) {
          whereLook = line.substring(line.toLowerCase().indexOf("where to look first:") + "where to look first:".length).trim();
          currentField = "whereLook";
        } else if (lower.includes("how to validate:")) {
          howValidate = line.substring(line.toLowerCase().indexOf("how to validate:") + "how to validate:".length).trim();
          currentField = "howValidate";
        } else if (lower.includes("recommendation:")) {
          recommendation = line.substring(line.toLowerCase().indexOf("recommendation:") + "recommendation:".length).trim();
          currentField = "recommendation";
        } else if (lower.includes("expected impact:") || lower.includes("expected business impact:") || lower.includes("expected business impact & growth:")) {
          let label = "expected impact:";
          if (lower.includes("expected business impact & growth:")) label = "expected business impact & growth:";
          else if (lower.includes("expected business impact:")) label = "expected business impact:";
          expectedImpact = line.substring(line.toLowerCase().indexOf(label) + label.length).trim();
          currentField = "expectedImpact";
        } else if (lower.includes("why prioritize:")) {
          whyPrioritize = line.substring(line.toLowerCase().indexOf("why prioritize:") + "why prioritize:".length).trim();
          currentField = "whyPrioritize";
        } else {
          const cleanedLine = line.replace(/^[*•-\s\d.]+\s*/, "").trim();
          if (currentField === "whyExists") {
            whyExists += " " + cleanedLine;
          } else if (currentField === "howAchieved") {
            howAchieved += " " + cleanedLine;
          } else if (currentField === "whereLook") {
            whereLook += " " + cleanedLine;
          } else if (currentField === "howValidate") {
            howValidate += " " + cleanedLine;
          } else if (currentField === "recommendation") {
            recommendation += " " + cleanedLine;
          } else if (currentField === "expectedImpact") {
            expectedImpact += " " + cleanedLine;
          } else if (currentField === "whyPrioritize") {
            whyPrioritize += " " + cleanedLine;
          } else {
            recommendation = recommendation ? recommendation + "\n" + line : line;
            currentField = "recommendation";
          }
        }
      });

      return {
        title: title || `Opportunity ${idx + 1}`,
        recommendation: cleanMd(recommendation) || "High-value strategic initiative.",
        expectedImpact: cleanMd(expectedImpact) || "Accelerates market adoption and scale.",
        whyPrioritize: cleanMd(whyPrioritize) || "Critical path to immediate value creation.",
        whyExists: cleanMd(whyExists),
        howAchieved: cleanMd(howAchieved),
        whereLook: cleanMd(whereLook),
        howValidate: cleanMd(howValidate)
      };
    });

    while (opportunities.length < 3) {
      opportunities.push({
        title: "Strategic Growth Initiative",
        recommendation: "Tap into secondary channels to bolster active customer acquisition.",
        expectedImpact: "Expands the active customer base and strengthens revenue retention.",
        whyPrioritize: "Fastest way to lock down immediate retention improvements.",
        whyExists: "",
        howAchieved: "",
        whereLook: "",
        howValidate: ""
      });
    }

    // SECTION 3: QUESTIONS WORTH EXPLORING
    const questionsText = getSectionText("QUESTIONS WORTH EXPLORING") || getSectionText("QUESTIONS WORTH INVESTIGATING") || getSectionText("QUESTIONS") || rawParts[3] || "";
    const questions = cleanMd(questionsText);

    // SECTION 4: WHERE TO FOCUS NEXT
    const focusText = getSectionText("WHERE TO FOCUS NEXT") || getSectionText("WHERE TO FOCUS") || getSectionText("THINGS I WOULD FOCUS ON") || getSectionText("THINGS I WOULD FOCUS ONE") || getSectionText("FOCUS POINT") || getSectionText("CONSULTANT POINT OF VIEW") || rawParts[4] || "";
    let focusPoint = cleanMd(focusText);
    let focusSteps: string[] = [];
    if (focusPoint.includes("Suggested next steps:")) {
      const parts = focusPoint.split(/Suggested next steps:\s*/i);
      focusPoint = cleanMd(parts[0]);
      if (parts[1]) {
        focusSteps = parts[1]
          .split("\n")
          .map(l => l.replace(/^[*•••-\s✓]+/, "").trim())
          .filter(l => l.length > 0);
      }
    } else if (focusPoint.includes("* Suggested next steps:")) {
      const parts = focusPoint.split(/\*\s*Suggested next steps:\s*/i);
      focusPoint = cleanMd(parts[0]);
      if (parts[1]) {
        focusSteps = parts[1]
          .split("\n")
          .map(l => l.replace(/^[*•••-\s✓]+/, "").trim())
          .filter(l => l.length > 0);
      }
    }

    // SECTION 5: ALTERNATIVE INTERPRETATION
    const altText = getSectionText("ALTERNATIVE INTERPRETATION") || rawParts[5] || "";
    const alternativeInterpretation = cleanMd(altText);

    return {
      executiveSummary,
      bottlenecks,
      opportunities,
      questions,
      focusPoint,
      focusSteps,
      alternativeInterpretation
    };
  } catch (err) {
    console.error("Failed parsing structured strategic blueprint:", err);
    return null;
  }
}

function StructuredBlueprintView({ parsed }: { parsed: ParsedStrategicReport }) {
  const [activeTab, setActiveTab] = useState<"gaps" | "opportunities" | "investigate" | "focus">("gaps");

  const hasGaps = parsed.bottlenecks && parsed.bottlenecks.length > 0;
  const hasOpportunities = parsed.opportunities && parsed.opportunities.length > 0;
  const hasInvestigate = !!parsed.questions;
  const hasFocus = !!parsed.focusPoint;

  return (
    <div className="space-y-6 select-text text-primary font-sans">
      {/* Executive Summary Section (matching PDF layout) */}
      {parsed.executiveSummary && (
        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 hover:border-slate-300 transition-all shadow-xs space-y-2">
          <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2">
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              Executive Diagnosis & Summary
            </span>
          </div>
          <p className="text-slate-700 text-[13px] leading-relaxed font-sans font-medium">
            {parsed.executiveSummary}
          </p>
        </div>
      )}

      {/* Clickable tabs at the top of the response console */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("gaps")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-mono uppercase tracking-wider font-bold transition-all duration-150 cursor-pointer ${
            activeTab === "gaps"
              ? "border-secondary bg-secondary/10 text-primary shadow-xs ring-1 ring-secondary/25"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-800"
          } ${!hasGaps ? "opacity-40 pointer-events-none" : ""}`}
        >
          <ShieldAlert size={14} className={activeTab === "gaps" ? "text-secondary animate-pulse" : ""} />
          <span>Gaps</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("opportunities")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-mono uppercase tracking-wider font-bold transition-all duration-150 cursor-pointer ${
            activeTab === "opportunities"
              ? "border-secondary bg-secondary/10 text-primary shadow-xs ring-1 ring-secondary/25"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-800"
          } ${!hasOpportunities ? "opacity-40 pointer-events-none" : ""}`}
        >
          <Zap size={14} className={activeTab === "opportunities" ? "text-secondary animate-pulse" : ""} />
          <span>Opportunities</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("investigate")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-mono uppercase tracking-wider font-bold transition-all duration-150 cursor-pointer ${
            activeTab === "investigate"
              ? "border-secondary bg-secondary/10 text-primary shadow-xs ring-1 ring-secondary/25"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-800"
          } ${!hasInvestigate ? "opacity-40 pointer-events-none" : ""}`}
        >
          <Award size={14} className={activeTab === "investigate" ? "text-secondary animate-pulse" : ""} />
          <span>Investigate</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("focus")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-mono uppercase tracking-wider font-bold transition-all duration-150 cursor-pointer ${
            activeTab === "focus"
              ? "border-secondary bg-secondary/10 text-primary shadow-xs ring-1 ring-secondary/25"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-800"
          } ${!hasFocus ? "opacity-40 pointer-events-none" : ""}`}
        >
          <Target size={14} className={activeTab === "focus" ? "text-secondary animate-pulse" : ""} />
          <span>Focus</span>
        </button>
      </div>

      {/* Selected Tab Content View */}
      <div className="min-h-0">
        {activeTab === "gaps" && hasGaps && (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
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
                  className="bg-white border border-outline-variant/60 rounded-xl p-5 hover:border-secondary/30 transition-all shadow-sm space-y-4"
                >
                  <div className="flex items-center gap-2.5 border-b border-outline-variant/40 pb-3">
                    <span className="bg-slate-900 text-white font-mono text-[10px] font-bold h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h5 className="font-sans font-bold text-sm text-slate-900 tracking-tight">
                      {bottleneck.title}
                    </h5>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-sans text-slate-700">
                    <div className="bg-rose-50/40 p-4 rounded-lg border border-rose-100/60 space-y-1.5 flex flex-col">
                      <span className="text-[10px] font-mono text-rose-800 uppercase tracking-wider block font-bold">
                        Beneath the Surface (Systemic Cause)
                      </span>
                      <p className="leading-relaxed font-sans text-slate-800 text-[13px] flex-1">
                        {bottleneck.beneathSurface || "N/A"}
                      </p>
                    </div>
                    <div className="bg-emerald-50/40 p-4 rounded-lg border border-emerald-100/60 space-y-1.5 flex flex-col">
                      <span className="text-[10px] font-mono text-emerald-800 uppercase tracking-wider block font-bold">
                        Potential Interventions
                      </span>
                      <p className="leading-relaxed font-sans text-slate-800 text-[13px] flex-1">
                        {bottleneck.potentialWays || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "opportunities" && hasOpportunities && (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2 border-b border-outline-variant/50 pb-3">
              <Zap size={18} className="text-secondary" />
              <h4 className="font-mono font-bold text-xs tracking-wider uppercase text-primary">
                02 - STRATEGIC OPPORTUNITIES
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {parsed.opportunities.map((opp, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-outline-variant/60 rounded-xl p-5 shadow-sm hover:border-secondary/20 transition-all space-y-4"
                >
                  <div className="flex items-center gap-2.5 border-b border-outline-variant/40 pb-3">
                    <span className="bg-slate-900 text-white font-mono text-[10px] font-bold h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h5 className="font-sans font-bold text-sm text-slate-900 tracking-tight">
                      {opp.title}
                    </h5>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans text-slate-700">
                    {opp.whyExists || opp.howAchieved || opp.whereLook || opp.howValidate ? (
                      <>
                        <div className="bg-slate-50/60 p-4 rounded-lg border border-slate-100/80 space-y-1.5 flex flex-col">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">
                            Why This Opportunity Exists
                          </span>
                          <p className="leading-relaxed text-slate-800 text-[13px] flex-1">
                            {opp.whyExists}
                          </p>
                        </div>
                        <div className="bg-emerald-50/40 p-4 rounded-lg border border-emerald-100/60 space-y-1.5 flex flex-col">
                          <span className="text-[10px] font-mono text-emerald-800 uppercase tracking-wider block font-bold">
                            How This Could Be Achieved
                          </span>
                          <p className="leading-relaxed text-slate-800 text-[13px] flex-1">
                            {opp.howAchieved}
                          </p>
                        </div>
                        <div className="bg-amber-50/40 p-4 rounded-lg border border-amber-100/60 space-y-1.5 flex flex-col">
                          <span className="text-[10px] font-mono text-amber-800 uppercase tracking-wider block font-bold">
                            Where to Look First
                          </span>
                          <p className="leading-relaxed text-slate-800 text-[13px] flex-1">
                            {opp.whereLook}
                          </p>
                        </div>
                        <div className="bg-blue-50/40 p-4 rounded-lg border border-blue-100/60 space-y-1.5 flex flex-col">
                          <span className="text-[10px] font-mono text-blue-800 uppercase tracking-wider block font-bold">
                            How to Validate
                          </span>
                          <p className="leading-relaxed text-slate-800 text-[13px] flex-1">
                            {opp.howValidate}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="md:col-span-2 bg-slate-50/60 p-4 rounded-lg border border-slate-100/80 space-y-1.5">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">
                            Recommendation
                          </span>
                          <p className="leading-relaxed text-slate-800 text-[13px]">{opp.recommendation}</p>
                        </div>
                        <div className="bg-emerald-50/40 p-4 rounded-lg border border-emerald-100/60 space-y-1.5">
                          <span className="text-[10px] font-mono text-emerald-800 uppercase tracking-wider block font-bold">
                            Expected Business Impact & Growth
                          </span>
                          <p className="leading-relaxed text-slate-800 text-[13px]">{opp.expectedImpact}</p>
                        </div>
                        <div className="bg-amber-50/40 p-4 rounded-lg border border-amber-100/60 space-y-1.5">
                          <span className="text-[10px] font-mono text-amber-800 uppercase tracking-wider block font-bold">
                            Why Prioritize
                          </span>
                          <p className="leading-relaxed text-slate-700 font-medium text-[13px]">{opp.whyPrioritize}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "investigate" && hasInvestigate && (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-md space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Award size={18} className="text-amber-400" />
                <h4 className="font-mono font-bold text-xs tracking-wider uppercase text-slate-300">
                  03 - QUESTIONS WORTH EXPLORING
                </h4>
              </div>

              <div className="text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-wrap font-medium">
                {parsed.questions}
              </div>
            </div>
          </div>
        )}

        {activeTab === "focus" && hasFocus && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-amber-500/10 pb-3">
                <Target size={18} className="text-amber-600" />
                <h4 className="font-mono font-bold text-xs tracking-wider uppercase text-amber-900 font-bold">
                  04 - WHERE TO FOCUS NEXT
                </h4>
              </div>

              <p className="text-slate-800 font-serif italic text-base leading-relaxed whitespace-pre-wrap">
                "{parsed.focusPoint}"
              </p>

              {parsed.focusSteps && parsed.focusSteps.length > 0 && (
                <div className="pt-4 border-t border-amber-500/10 space-y-3">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">
                    Suggested Next Steps
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {parsed.focusSteps.map((step, sIdx) => (
                      <div key={sIdx} className="bg-white/80 p-4 rounded-lg border border-amber-200/50 flex items-start gap-3">
                        <span className="bg-amber-100 text-amber-900 font-mono text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          ✓
                        </span>
                        <p className="text-slate-800 text-xs leading-relaxed font-sans">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {parsed.alternativeInterpretation && (
              <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-md space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Info size={18} className="text-slate-300" />
                  <h4 className="font-mono font-bold text-xs tracking-wider uppercase text-slate-300">
                    05 - ALTERNATIVE INTERPRETATION
                  </h4>
                </div>
                <p className="text-slate-300 font-sans text-sm leading-relaxed whitespace-pre-wrap">
                  {parsed.alternativeInterpretation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
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

const BUSINESS_USECASE_EXAMPLES_MAP: Record<string, Record<string, string>> = {
  "ecommerce": {
    "Revenue Growth": "Traffic to our website is increasing, but too few visitors complete a purchase and order cancellations remain high. We'd like to improve conversion rates, reduce cancellations, and grow revenue.",
    "Product Strategy": "Customers struggle to discover the right products, and feature requests are coming from multiple directions, making roadmap decisions difficult. We'd like to build the right features and improve product adoption.",
    "Customer Retention": "Many first-time customers don't return despite regular promotions and email campaigns. We'd like to increase repeat purchases and customer lifetime value.",
    "Operational Efficiency": "Order processing and fulfillment require too much manual work, causing delays and increasing operational costs. We'd like to speed up operations while reducing effort."
  },
  "b2bsaasenterprise": {
    "Revenue Growth": "We generate qualified leads, but too few convert into paying customers because sales cycles are long and deals frequently stall. We'd like to improve conversion rates and shorten sales cycles.",
    "Product Strategy": "Customers request features from multiple directions, making it difficult to prioritize the roadmap. We'd like to focus on the highest-impact product investments.",
    "Customer Retention": "Customers adopt the product initially, but usage drops after onboarding and churn is increasing. We'd like to improve product engagement and retain more customers.",
    "Operational Efficiency": "Engineering teams spend too much time fixing issues and supporting customers instead of building new capabilities. We'd like to improve delivery speed and team productivity."
  },
  "education": {
    "Revenue Growth": "Learner enrollments are growing, but course completion and paid certification rates remain low. We'd like to improve learner completion and increase subscription revenue.",
    "Product Strategy": "Students struggle to discover the right learning paths, making adoption of new programs slower than expected. We'd like to improve product adoption and roadmap decisions.",
    "Customer Retention": "Learners stop engaging after the first few weeks, leading to lower subscription renewals. We'd like to increase learner engagement and retention.",
    "Operational Efficiency": "Creating, reviewing, and publishing new courses takes too long because much of the process is manual. We'd like to speed up content delivery and reduce operational effort."
  },
  "healthcare": {
    "Revenue Growth": "Patient demand is increasing, but appointment bookings and treatment conversions remain lower than expected. We'd like to convert more inquiries into patients.",
    "Product Strategy": "Patients struggle to navigate our digital healthcare services, making new offerings difficult to adopt. We'd like to improve the patient experience and increase adoption.",
    "Customer Retention": "Many patients don't return for follow-up appointments despite reminders and outreach. We'd like to improve continuity of care and patient retention.",
    "Operational Efficiency": "Administrative work and manual documentation reduce the time clinicians spend with patients. We'd like to automate workflows and improve operational efficiency."
  },
  "energy": {
    "Revenue Growth": "Commercial customers show strong interest in our renewable energy solutions, but too few convert into signed projects because sales cycles are long. We'd like to increase project conversions and grow revenue.",
    "Product Strategy": "Customers struggle to understand which energy solutions best fit their needs, making new offerings difficult to adopt. We'd like to prioritize the right product investments and improve adoption.",
    "Customer Retention": "Existing customers are slow to adopt additional energy services, and contract renewals are declining. We'd like to increase renewals and expand customer relationships.",
    "Operational Efficiency": "Project approvals involve multiple teams and manual processes, delaying execution and increasing operational costs. We'd like to improve execution speed and reduce bottlenecks."
  },
  "logistics": {
    "Revenue Growth": "Shipment demand is growing, but delivery delays and lost opportunities are limiting revenue. We'd like to improve delivery performance and convert more business.",
    "Product Strategy": "Customers find it difficult to use our shipment planning tools, resulting in low adoption of new services. We'd like to improve usability and product adoption.",
    "Customer Retention": "Customers are moving to competitors because delivery reliability is inconsistent. We'd like to improve service quality and retain more customers.",
    "Operational Efficiency": "Route planning, warehouse operations, and dispatch rely heavily on manual coordination, slowing execution. We'd like to automate operations and improve efficiency."
  },
  "other": {
    "Revenue Growth": "Customer interest is healthy, but revenue growth has slowed and we're unsure where opportunities are being lost. We'd like to identify the biggest growth barriers and improve conversions.",
    "Product Strategy": "We're receiving many ideas and requests, but it's difficult to decide what to prioritize next. We'd like to build a clearer product strategy and roadmap.",
    "Customer Retention": "Existing customers are becoming less engaged and more are leaving than we'd like. We'd like to improve customer retention and long-term loyalty.",
    "Operational Efficiency": "Internal processes require too much manual work, slowing execution across teams. We'd like to simplify operations and improve productivity."
  }
};

const getBusinessUsecasePlaceholder = (ind: string, outcome: string): string => {
  const normInd = (ind || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const indMap = BUSINESS_USECASE_EXAMPLES_MAP[normInd] || BUSINESS_USECASE_EXAMPLES_MAP["other"];
  return indMap[outcome] || BUSINESS_USECASE_EXAMPLES_MAP["other"]["Revenue Growth"];
};

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
* **What may be happening beneath the surface:** Development bandwidth is spread too thin across an extensive, unprioritized feature list. This diluted focus slows down delivery velocity, meaning core features fail to reach product-market maturity and user acquisition stalls.
* **Potential ways to address it:** Establish a strict customer validation framework and a lightweight prioritization gate for new features.

2. Unverified Feedback Loops
* **What may be happening beneath the surface:** Feature additions are typically fully designed and built prior to user demand validation. This creates a high risk of wasting expensive engineering cycles on capabilities that see minimal post-launch adoption.
* **Potential ways to address it:** Integrate rapid design-level prototyping and clickable wireframes with key users before coding.

3. Legacy Planning Rigidness
* **What may be happening beneath the surface:** Product alignment remains anchored to a static roadmap rather than adapting dynamically to user signals. This reduces competitive agility, leaving you vulnerable to nimbler competitors.
* **Potential ways to address it:** Transition to outcome-focused, theme-based roadmaps rather than date-driven feature lists.

---SECTION 3: OPPORTUNITIES---
1. Focus Core Capabilities
Recommendation: Analyze current user engagement telemetry to focus product development and support around the top three highest-adoption features, clearing out low-traction capabilities. This directly addresses the diluted feature prioritizations gap by concentrating the engineering team's bandwidth on validated customer demands.
Why it matters: This focused alignment significantly accelerates delivery velocity and speeds time-to-market. It reduces development overhead while maximizing product value, thereby improving trial-to-paid conversion and long-term customer retention.
Why now: This opportunity represents exceptional business value with medium-to-low execution complexity since it repurposes existing features. It offers high strategic leverage by stabilizing the core product before scaling marketing.

2. Clickable Prototyping
Recommendation: Establish a rapid prototyping workflow using lightweight clickable mockups to systematically test feature demand and validate interest prior to writing code. This initiative directly solves the unverified user feedback gap, ensuring developer cycles are never wasted.
Why it matters: This proactive process dramatically reduces engineering waste and avoids costly post-launch reworks. It ensures future product capital expenditure is directed exclusively towards highly coveted features, protecting margins.
Why now: This initiative delivers high business value with extremely low implementation effort. It enables agile, evidence-based roadmap planning with zero initial infrastructural changes required.

3. Goal-Oriented Welcomes
Recommendation: Restructure the initial sign-up and onboarding sequence to trigger a tailored first-user experience based on the primary job-to-be-done selected by the registrant. This directly addresses the broad and unprioritized feature plans gap by personalizing early user exposure.
Why it matters: Guiding users directly to their specific goal eliminates early choice fatigue and confusion. This drastically boosts first-week product adoption and customer lifetime value while establishing sticky retention habits.
Why now: This provides substantial strategic leverage by protecting user acquisition spend and converting casual sign-ups into highly engaged users at a moderate technical complexity.

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
I highly recommend pausing all side-projects and secondary features for a moment. Instead, point 100% of your team's bandwidth at tracking how people use your main product. Getting a crystal-clear picture of how users interact with your core value before writing any more code is the absolute fastest way to stabilize your product and unlock growth.`;
  } else if (normalizedModel === "Customer Retention") {
    text = `---SECTION 1: EXECUTIVE SUMMARY---
The website for ${companyName} showcases a really strong set of ${industry || "digital"} offerings. But to keep users paying month after month, you have to guide them to a 'win' early. Waiting for them to ask support for help is too slow—you need to proactively lead them to value on day one so they never think about canceling. This is a crucial step for protecting your recurring revenue.

---SECTION 2: KEY SYSTEMIC GAPS---
1. High-Friction Onboarding Forms
* **What may be happening beneath the surface:** Registration requirements are excessively heavy, requiring detailed user credentials before demonstrating value. This friction degrades sign-up-to-activation conversion rate and increases immediate abandonment.
* **Potential ways to address it:** Build progressive profile forms and defer administrative configurations to subsequent user sessions.

2. Self-Guided First Sessions
* **What may be happening beneath the surface:** Newly registered users are left to navigate the product with minimal structured guidance. This lack of active guidance prevents users from discovering core features during their high-intent initial session.
* **Potential ways to address it:** Deploy context-aware interactive walkthroughs and goal-oriented tooltips to guide users.

3. Reactive Churn Engagement
* **What may be happening beneath the surface:** Retention initiatives are reactive, launching only after a user initiates cancellation. Analytics show that accounts typically stop engaging weeks before canceling, which means missing early-warning signals that would allow proactive intervention.
* **Potential ways to address it:** Establish automated, real-time customer health monitoring triggers to identify declining active usage early.

---SECTION 3: OPPORTUNITIES---
1. Streamlined Signups
Recommendation: Re-engineer the user registration sequence to implement progressive profile building, capturing essential credentials first and deferring administrative profile fields to subsequent user sessions. This capability directly resolves the high-friction onboarding forms gap.
Why it matters: Reducing friction at the front gate significantly improves sign-up-to-activation conversion rates and minimizes day-one user abandonment. This secures more paying accounts from existing traffic, optimizing customer acquisition economics.
Why now: This delivers immediate business value with very low technical execution complexity since it focuses strictly on registration form restructuring, making it an ideal high-leverage starting point.

2. Contextual Guided Tours
Recommendation: Design and deploy a modern digital adoption capability featuring context-aware interactive walkthroughs and goal-oriented tooltips to guide users to their first successful action. This systematically addresses the self-guided first sessions gap.
Why it matters: Actively guiding newly registered users to core features during their high-intent initial session accelerates their "aha" moment. This reduces early user frustration and prevents trial-to-paid drop-offs.
Why now: This represents high business value with moderate complexity by utilizing existing visual assets, building a scalable self-serve enablement engine that supports rapid user growth.

3. Early-Warning Systems
Recommendation: Build a proactive customer health monitoring capability that tracks real-time user engagement telemetry and flags accounts that demonstrate zero activity for more than five consecutive days. This directly solves the reactive churn engagement gap.
Why it matters: Transitioning from reactive support to proactive intervention allows customer success teams to re-engage drifting accounts before they cancel. This protects recurring revenue streams and elevates lifetime value.
Why now: This opportunity offers high strategic leverage with moderate complexity by connecting basic product usage telemetry to automated internal slack or email alerts.

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
I recommend putting all your energy into redesigning your registration and first-minute setup. Keep it under 4-5 simple input fields and save the extra profile questions for later. Cleaning up this initial experience is the absolute fastest way to boost first-week retention and convert casual signups into daily active users.`;
  } else if (normalizedModel === "Operational Efficiency") {
    text = `---SECTION 1: EXECUTIVE SUMMARY---
The website for ${companyName} reveals a highly specialized way of delivering services in the ${industry || "business"} space. But to scale up without your overhead spiraling out of control, you need to centralize your operations and automate hand-offs between teams. Getting your experts out of manual coordination and spreadsheet-handling will instantly free up their time to focus on high-value client work.

---SECTION 2: KEY SYSTEMIC GAPS---
1. Disconnected Team Workflows
* **What may be happening beneath the surface:** Separate departments utilize isolated software tracking tools with zero integration. This fragmentation degrades cross-department visibility, meaning deadlines are breached due to poor coordination.
* **Potential ways to address it:** Implement a centralized collaborative workflow pipeline that integrates disconnected tracking software into a single master dashboard.

2. Manual Data Duplication
* **What may be happening beneath the surface:** Staff frequently spend valuable hours manually copying project details between tools. This repetitive manual input leads to administrative fatigue and a high rate of human entry errors.
* **Potential ways to address it:** Establish automated data synchronization pipelines using secure API webhooks to automate data transfer.

3. Informal Transition Guidelines
* **What may be happening beneath the surface:** Deliverable handoffs between development, sales, and operations lack standardized quality checklists. This causes frequent clarifying back-and-forth loops, unexpected rework, and unpredictable client delivery timelines.
* **Potential ways to address it:** Design structured hand-off checklists and enforce strict completion criteria at each team transition boundary.

---SECTION 3: OPPORTUNITIES---
1. Centralized Workflow View
Recommendation: Implement a centralized collaborative workflow capability that integrates disconnected tracking software into a single, automated master pipeline, providing full real-time visibility over client deliverables. This capability directly resolves the disconnected team workflows gap.
Why it matters: Eliminating departmental tracking silos prevents cost overruns, secures delivery timelines, and improves client retention. It enables leadership to allocate resource capacity dynamically based on active project demands.
Why now: This opportunity represents high business value with moderate execution complexity by optimizing existing tools, establishing a scalable foundation that supports increased volume without adding administrative headcount.

2. Automated Data Syncs
Recommendation: Establish a modern data-to-delivery automation capability that connects internal databases and third-party software using robust API webhooks to automate high-frequency data transfer. This directly addresses the manual data duplication gap.
Why it matters: Automating repetitive tasks reclaims valuable expert hours, allowing the team to focus on core client deliverables. It eliminates manual input fatigue and dramatically reduces transaction-level human entry errors.
Why now: This delivers high business value with low-to-moderate implementation effort using standard webhook connections, providing immediate strategic leverage by accelerating workflow velocity.

3. Standardized Handoff Checklists
Recommendation: Create a standardized quality handoff capability with mandatory entry and exit criteria for transition phases between sales, development, and operations. This quality-assurance framework directly addresses the informal transition guidelines gap.
Why it matters: Standardizing transitions ensures that incomplete client specifications never pass down the delivery pipeline, eliminating expensive project reworks and reducing friction between cross-functional teams.
Why now: This opportunity delivers high business value with extremely low implementation complexity since it relies on process documentation, instantly protecting service-level margins from day one.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
Your website shows you handle complex, high-value delivery work. But to streamline it, we need to know:
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
I recommend bringing all operational tracking into one shared master pipeline right away, and putting strict completion checklists at every team hand-off point. Streamlining how tasks move from team to team is the fastest way to eliminate rework, keep delivery timelines stable, and free up your senior staff to focus on growth.`;
  } else {
    // Default: "Revenue Growth"
    text = `---SECTION 1: EXECUTIVE SUMMARY---
The website for ${companyName} highlights a great solution in the ${industry || "technology"} space. But to convert that active visitor interest into paid accounts, you need to make upgrading effortless and prompt users when they are seeing your value. Streamlining this purchase path is the fastest way to capture unearned revenue and speed up your growth. This is a very common hurdle for growing SaaS companies.

---SECTION 2: KEY SYSTEMIC GAPS---
1. Friction-Heavy Checkout Paths
* **What may be happening beneath the surface:** Potential customers are forced to navigate multiple pages and form inputs to complete their purchase. This prolonged checkout sequence increases cart-abandonment rate among high-intent buyers, losing vital revenue.
* **Potential ways to address it:** Re-engineer the transactional path by consolidating checkout pages and redundant billing fields into a single, high-speed purchase gateway.

2. Pricing Dissonance
* **What may be happening beneath the surface:** Plan tiers and feature limits are poorly explained, leading to buyer hesitation. Choice-fatigue triggers cause visitors to leave without completing their transaction.
* **Potential ways to address it:** Restructure the pricing page to display clear, segment-aligned tier distinctions and a transparent plan comparison matrix.

3. Calendar-Based Trial Closes
* **What may be happening beneath the surface:** Upgrade prompts are sent strictly based on fixed trial durations rather than active product usage. This timing mismatch misses the user's peak purchasing intent.
* **Potential ways to address it:** Create a dynamic customer-expansion capability that triggers contextual plan upgrade prompts when a user hits a feature limit.

---SECTION 3: OPPORTUNITIES---
1. Unified Checkout Flow
Recommendation: Re-engineer the transactional path by consolidating checkout pages and redundant billing fields into a single, high-speed purchase gateway with express digital wallet options. This capability directly resolves the friction-heavy checkout paths gap.
Why it matters: Streamlining the checkout flow captures purchasing momentum when buyer intent is highest, drastically reducing transaction abandonment. This directly elevates conversion rates and drives immediate top-line revenue growth.
Why now: This represents exceptional business value with low technical implementation complexity. It offers massive strategic leverage by instantly converting existing user interest into cash flow.

2. Behavioral Upsell Triggers
Recommendation: Create a dynamic customer-expansion capability that triggers contextual plan upgrade prompts at the exact moment a user hits a basic feature limit or usage capacity ceiling. This directly addresses the calendar-based trial closes gap.
Why it matters: Engaging trial users when product utility and value are highly apparent yields significantly higher upgrade conversion rates. This drives organic expansion revenue and naturally increases customer lifetime value.
Why now: This opportunity delivers very high business value with moderate technical complexity as it links usage telemetry with in-app triggers, unlocking revenue from highly active customers.

3. Simplified Plan Comparisons
Recommendation: Restructure the digital pricing page to display clear, segment-aligned tier distinctions and a transparent plan comparison matrix mapping distinct plans directly to clear buyer personas. This addresses the pricing dissonance gap.
Why it matters: Replacing internal cost metrics with human-readable value comparisons eliminates choice fatigue and buyer confusion. It improves decision velocity and guides prospective customers to higher-margin packages.
Why now: This opportunity offers high business value with low implementation complexity because it is limited to visual content adjustments, maximizing self-serve conversion efficiency.

---SECTION 4: QUESTIONS WORTH INVESTIGATING---
Your website presents a strong set of product options. But to maximize your revenue, we need to answer:
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
  const [businessUsecase, setBusinessUsecase] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("diag_businessUsecase") || "";
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

  const [isDetectingIndustry, setIsDetectingIndustry] = useState(false);
  const [lastProcessedWebsite, setLastProcessedWebsite] = useState("");

  const detectIndustryFromWebsite = async (websiteUrl: string) => {
    if (!websiteUrl || websiteUrl.trim().length < 3) return;
    
    const clean = websiteUrl.trim().replace(/^(https?:\/\/)?(www\.)?/, "");
    const simpleRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,18}(\/.*)?$/;
    if (!simpleRegex.test(clean)) {
      setError("Please enter a valid company website (e.g. company.com)");
      setIndustry("");
      return;
    }

    setIsDetectingIndustry(true);
    setError(null);
    try {
      const response = await fetch("/api/detect-industry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: websiteUrl.trim() }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.industry) {
          if (data.industry === "INVALID_WEBSITE") {
            setError("Invalid company website. This domain could not be found or verified on the internet. Please enter a valid, active company website.");
            setIndustry("");
          } else {
            setIndustry(data.industry);
            setError(null);
          }
        } else {
          setError("Could not auto-detect industry for this website.");
          setIndustry("");
        }
      } else {
        setError("Could not verify company website. Please check your network or enter a valid website.");
        setIndustry("");
      }
    } catch (err) {
      console.error("Error auto-filling industry:", err);
      setError("Connection error verifying company website.");
      setIndustry("");
    } finally {
      setIsDetectingIndustry(false);
    }
  };

  // Automatically trigger industry detection once website looks valid
  useEffect(() => {
    const trimmed = companyName.trim();
    if (!trimmed) {
      setLastProcessedWebsite("");
      return;
    }

    const clean = trimmed.replace(/^(https?:\/\/)?(www\.)?/, "");
    // Check if the domain has at least a dot and a valid-looking TLD
    const simpleRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,18}(\/.*)?$/;
    if (!simpleRegex.test(clean)) {
      // Still typing, don't trigger yet, but don't clear industry yet unless it was already invalid
      return;
    }

    if (trimmed === lastProcessedWebsite) {
      return;
    }

    const timer = setTimeout(() => {
      setLastProcessedWebsite(trimmed);
      detectIndustryFromWebsite(trimmed);
    }, 700); // 700ms debounce

    return () => clearTimeout(timer);
  }, [companyName, lastProcessedWebsite]);

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
      localStorage.setItem("diag_businessUsecase", businessUsecase);
    }
  }, [businessUsecase]);

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
        doc.text(`NORTHBOUND CONSOLE - EXECUTIVE BLUEPRINT FOR ${companyName.toUpperCase()}`, margin, 12);
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
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255); // White text
      doc.text("NORTHBOUND STRATEGIC DIAGNOSIS", margin + 8, y + 13);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(203, 213, 225); // Light slate text
      doc.text("Executive Strategy Report", margin + 8, y + 21);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // Cool slate
      doc.text("CONFIDENTIAL STRATEGIC ADVISORY BLUEPRINT", margin + 8, y + 27);

      y += 42;

      // Metadata card with background
      const leftColX = margin + 6;
      const rightColX = margin + (contentWidth / 2) + 2;

      // Wrap values that can be long
      const wrappedUsecase = doc.splitTextToSize(businessUsecase || "N/A", contentWidth - 12);
      const wrappedBottleneck = doc.splitTextToSize(bottleneck, (contentWidth / 2) - 8);

      const row1Height = 12;
      const row2Height = 12;
      const row3ValHeight = Math.max(wrappedBottleneck.length * 4.2, 5);
      const row3Height = 6 + row3ValHeight + 2; // Label (6) + Value + Margin

      const row4ValHeight = Math.max(wrappedUsecase.length * 4.2, 5);
      const row4Height = 6 + row4ValHeight + 4; // Label (6) + Value + Padding

      const cardHeight = 6 + row1Height + row2Height + row3Height + row4Height;

      doc.setFillColor(251, 251, 250); // Warm light gray #FBFBFA
      doc.setDrawColor(226, 232, 240); 
      doc.setLineWidth(0.4);
      doc.rect(margin, y, contentWidth, cardHeight, "FD");

      // Draw texts
      let currentOffset = y + 6;

      // --- ROW 1 ---
      // Company Website (Left)
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 100);
      doc.text("COMPANY WEBSITE:", leftColX, currentOffset + 2);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(34, 46, 38);
      doc.text(companyName || "Unspecified", leftColX, currentOffset + 7);

      // Industry (Right)
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 100);
      doc.text("INDUSTRY:", rightColX, currentOffset + 2);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(industry, rightColX, currentOffset + 7);

      currentOffset += row1Height;

      // --- ROW 2 ---
      // Email Address (Left)
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 100);
      doc.text("EMAIL ADDRESS:", leftColX, currentOffset + 2);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(emailAddress || "Unspecified", leftColX, currentOffset + 7);

      // Date of Compile (Right)
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 100);
      doc.text("DATE OF COMPILE:", rightColX, currentOffset + 2);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }), rightColX, currentOffset + 7);

      currentOffset += row2Height;

      // --- ROW 3 ---
      // Primary Business Goal (Left)
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 100);
      doc.text("PRIMARY BUSINESS GOAL:", leftColX, currentOffset + 2);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(wrappedBottleneck, leftColX, currentOffset + 7);

      currentOffset += row3Height;

      // --- ROW 4 (Full Width) ---
      // Business Use Case
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 100);
      doc.text("BUSINESS USE CASE:", leftColX, currentOffset + 2);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(wrappedUsecase, leftColX, currentOffset + 7);

      y += cardHeight + 10;

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

      const checkPageBoundary = (neededHeight: number) => {
        if (y + neededHeight > 270) {
          doc.addPage();
          currentPage++;
          y = 25;
          addSubsequentHeader(currentPage);
          y += 5;
        }
      };

      const drawSectionTitle = (title: string) => {
        checkPageBoundary(15);
        doc.setFillColor(15, 23, 42); // Primary Slate-900
        doc.rect(margin, y - 4, contentWidth, 7, "F");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(255, 255, 255);
        doc.text(title.toUpperCase(), margin + 3, y + 1);
        y += 8.5;
      };

      const parsed = parseStrategicReport(result.blueprint);

      if (parsed) {
        // --- SECTION 1: EXECUTIVE SUMMARY ---
        if (parsed.executiveSummary) {
          drawSectionTitle("EXECUTIVE DIAGNOSIS & SUMMARY");
          
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85); // Slate-700
          
          const wrappedSummary = doc.splitTextToSize(parsed.executiveSummary, contentWidth);
          checkPageBoundary(wrappedSummary.length * 4.2 + 5);
          for (let j = 0; j < wrappedSummary.length; j++) {
            checkPageBoundary(4.5);
            doc.text(wrappedSummary[j], margin, y);
            y += 4.5;
          }
          y += 6; // spacing
        }

        // --- SECTION 2: KEY SYSTEMIC GAPS ---
        if (parsed.bottlenecks && parsed.bottlenecks.length > 0) {
          drawSectionTitle("01 - KEY SYSTEMIC GAPS");
          
          parsed.bottlenecks.forEach((bottleneck, idx) => {
            checkPageBoundary(12);
            // Draw Gap Title
            doc.setFillColor(15, 23, 42);
            doc.rect(margin, y - 3, 2, 4, "F");
            
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(9.5);
            doc.setTextColor(15, 23, 42);
            doc.text(`${idx + 1}. ${bottleneck.title}`, margin + 4, y);
            y += 7;

            // Now draw Beneath Surface and Potential Interventions side-by-side or Diagnosis and Where to Investigate
            const hasSideBySide = !!(bottleneck.beneathSurface || bottleneck.potentialWays);
            if (hasSideBySide) {
              const colWidth = (contentWidth - 6) / 2; // ~82mm
              const padding = 4;
              const textWidth = colWidth - (padding * 2); // ~74mm

              const wrappedBeneath = doc.splitTextToSize(bottleneck.beneathSurface || "N/A", textWidth);
              const wrappedPotential = doc.splitTextToSize(bottleneck.potentialWays || "N/A", textWidth);

              const beneathHeight = 6 + (wrappedBeneath.length * 4) + 4;
              const potentialHeight = 6 + (wrappedPotential.length * 4) + 4;
              const boxHeight = Math.max(beneathHeight, potentialHeight, 18);

              checkPageBoundary(boxHeight + 6);

              // Draw Beneath Surface Box (Left)
              doc.setFillColor(254, 242, 242); // Rose-50
              doc.setDrawColor(254, 226, 226); // Rose-100
              doc.setLineWidth(0.3);
              doc.rect(margin, y, colWidth, boxHeight, "FD");

              doc.setFont("Helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(153, 27, 27); // Rose-800
              doc.text("BENEATH THE SURFACE (SYSTEMIC CAUSE)", margin + padding, y + 5);

              doc.setFont("Helvetica", "normal");
              doc.setFontSize(8.5);
              doc.setTextColor(30, 41, 59); // Slate-800
              for (let j = 0; j < wrappedBeneath.length; j++) {
                doc.text(wrappedBeneath[j], margin + padding, y + 10 + (j * 4));
              }

              // Draw Potential Interventions Box (Right)
              doc.setFillColor(240, 253, 244); // Green-50
              doc.setDrawColor(209, 250, 229); // Green-100
              doc.rect(margin + colWidth + 6, y, colWidth, boxHeight, "FD");

              doc.setFont("Helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(6, 95, 70); // Green-800
              doc.text("POTENTIAL INTERVENTIONS", margin + colWidth + 6 + padding, y + 5);

              doc.setFont("Helvetica", "normal");
              doc.setFontSize(8.5);
              doc.setTextColor(30, 41, 59); // Slate-800
              for (let j = 0; j < wrappedPotential.length; j++) {
                doc.text(wrappedPotential[j], margin + colWidth + 6 + padding, y + 10 + (j * 4));
              }

              y += boxHeight + 6;
            } else {
              // Older format: Diagnosis and Where Leadership Should Investigate
              const colWidth = (contentWidth - 6) / 2;
              const padding = 4;
              const textWidth = colWidth - (padding * 2);

              const wrappedDiagnosis = doc.splitTextToSize(bottleneck.diagnosis || "N/A", textWidth);
              const wrappedInvestigate = doc.splitTextToSize(bottleneck.whereToInvestigate || "N/A", textWidth);

              const diagnosisHeight = 6 + (wrappedDiagnosis.length * 4) + 4;
              const investigateHeight = 6 + (wrappedInvestigate.length * 4) + 4;
              const boxHeight = Math.max(diagnosisHeight, investigateHeight, 18);

              checkPageBoundary(boxHeight + 6);

              // Left Box
              doc.setFillColor(248, 250, 252); // Slate-50
              doc.setDrawColor(226, 232, 240); // Slate-100
              doc.setLineWidth(0.3);
              doc.rect(margin, y, colWidth, boxHeight, "FD");

              doc.setFont("Helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(71, 85, 105); // Slate-600
              doc.text("DIAGNOSIS", margin + padding, y + 5);

              doc.setFont("Helvetica", "normal");
              doc.setFontSize(8.5);
              doc.setTextColor(30, 41, 59);
              for (let j = 0; j < wrappedDiagnosis.length; j++) {
                doc.text(wrappedDiagnosis[j], margin + padding, y + 10 + (j * 4));
              }

              // Right Box
              doc.setFillColor(254, 243, 199); // Amber-50
              doc.setDrawColor(253, 230, 138); // Amber-100
              doc.rect(margin + colWidth + 6, y, colWidth, boxHeight, "FD");

              doc.setFont("Helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(146, 64, 14); // Amber-800
              doc.text("WHERE LEADERSHIP SHOULD INVESTIGATE", margin + colWidth + 6 + padding, y + 5);

              doc.setFont("Helvetica", "normal");
              doc.setFontSize(8.5);
              doc.setTextColor(30, 41, 59);
              for (let j = 0; j < wrappedInvestigate.length; j++) {
                doc.text(wrappedInvestigate[j], margin + colWidth + 6 + padding, y + 10 + (j * 4));
              }

              y += boxHeight + 6;
            }
          });
          y += 3;
        }

        // --- SECTION 3: STRATEGIC OPPORTUNITIES ---
        if (parsed.opportunities && parsed.opportunities.length > 0) {
          drawSectionTitle("02 - STRATEGIC OPPORTUNITIES");

          parsed.opportunities.forEach((opp, idx) => {
            checkPageBoundary(12);
            doc.setFillColor(15, 23, 42);
            doc.rect(margin, y - 3, 2, 4, "F");

            doc.setFont("Helvetica", "bold");
            doc.setFontSize(9.5);
            doc.setTextColor(15, 23, 42);
            doc.text(`${idx + 1}. ${opp.title}`, margin + 4, y);
            y += 7;

            const hasGrid = !!(opp.whyExists || opp.howAchieved || opp.whereLook || opp.howValidate);
            if (hasGrid) {
              const colWidth = (contentWidth - 6) / 2; // ~82mm
              const padding = 4;
              const textWidth = colWidth - (padding * 2); // ~74mm

              const wrappedExists = doc.splitTextToSize(opp.whyExists || "N/A", textWidth);
              const wrappedAchieved = doc.splitTextToSize(opp.howAchieved || "N/A", textWidth);
              const wrappedLook = doc.splitTextToSize(opp.whereLook || "N/A", textWidth);
              const wrappedValidate = doc.splitTextToSize(opp.howValidate || "N/A", textWidth);

              // Row 1 box height
              const existsHeight = 6 + (wrappedExists.length * 4) + 4;
              const achievedHeight = 6 + (wrappedAchieved.length * 4) + 4;
              const row1Height = Math.max(existsHeight, achievedHeight, 18);

              // Row 2 box height
              const lookHeight = 6 + (wrappedLook.length * 4) + 4;
              const validateHeight = 6 + (wrappedValidate.length * 4) + 4;
              const row2Height = Math.max(lookHeight, validateHeight, 18);

              // Draw Row 1
              checkPageBoundary(row1Height + 4);

              // 1. Why Exists (Slate-50)
              doc.setFillColor(248, 250, 252);
              doc.setDrawColor(226, 232, 240);
              doc.setLineWidth(0.3);
              doc.rect(margin, y, colWidth, row1Height, "FD");

              doc.setFont("Helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(71, 85, 105);
              doc.text("WHY THIS OPPORTUNITY EXISTS", margin + padding, y + 5);

              doc.setFont("Helvetica", "normal");
              doc.setFontSize(8.5);
              doc.setTextColor(30, 41, 59);
              for (let j = 0; j < wrappedExists.length; j++) {
                doc.text(wrappedExists[j], margin + padding, y + 10 + (j * 4));
              }

              // 2. How Achieved (Green-50)
              doc.setFillColor(240, 253, 244);
              doc.setDrawColor(209, 250, 229);
              doc.rect(margin + colWidth + 6, y, colWidth, row1Height, "FD");

              doc.setFont("Helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(6, 95, 70);
              doc.text("HOW THIS COULD BE ACHIEVED", margin + colWidth + 6 + padding, y + 5);

              doc.setFont("Helvetica", "normal");
              doc.setFontSize(8.5);
              doc.setTextColor(30, 41, 59);
              for (let j = 0; j < wrappedAchieved.length; j++) {
                doc.text(wrappedAchieved[j], margin + colWidth + 6 + padding, y + 10 + (j * 4));
              }

              y += row1Height + 4;

              // Draw Row 2
              checkPageBoundary(row2Height + 6);

              // 3. Where Look (Amber-50)
              doc.setFillColor(254, 243, 199);
              doc.setDrawColor(253, 230, 138);
              doc.rect(margin, y, colWidth, row2Height, "FD");

              doc.setFont("Helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(146, 64, 14);
              doc.text("WHERE TO LOOK FIRST", margin + padding, y + 5);

              doc.setFont("Helvetica", "normal");
              doc.setFontSize(8.5);
              doc.setTextColor(30, 41, 59);
              for (let j = 0; j < wrappedLook.length; j++) {
                doc.text(wrappedLook[j], margin + padding, y + 10 + (j * 4));
              }

              // 4. How Validate (Blue-50)
              doc.setFillColor(239, 246, 255);
              doc.setDrawColor(191, 219, 254);
              doc.rect(margin + colWidth + 6, y, colWidth, row2Height, "FD");

              doc.setFont("Helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(29, 78, 216);
              doc.text("HOW TO VALIDATE", margin + colWidth + 6 + padding, y + 5);

              doc.setFont("Helvetica", "normal");
              doc.setFontSize(8.5);
              doc.setTextColor(30, 41, 59);
              for (let j = 0; j < wrappedValidate.length; j++) {
                doc.text(wrappedValidate[j], margin + colWidth + 6 + padding, y + 10 + (j * 4));
              }

              y += row2Height + 6;
            } else {
              // Older format: Recommendation, Expected Impact, Why Prioritize
              const colWidth = (contentWidth - 6) / 2;
              const padding = 4;
              const textWidth = colWidth - (padding * 2);

              const wrappedRec = doc.splitTextToSize(opp.recommendation || "N/A", textWidth);
              const wrappedImpact = doc.splitTextToSize(opp.expectedImpact || "N/A", textWidth);
              const wrappedPrioritize = doc.splitTextToSize(opp.whyPrioritize || "N/A", textWidth);

              const recHeight = 6 + (wrappedRec.length * 4) + 4;
              const impactHeight = 6 + (wrappedImpact.length * 4) + 4;
              const row1Height = Math.max(recHeight, impactHeight, 18);
              
              const row2Height = 6 + (wrappedPrioritize.length * 4) + 4;

              checkPageBoundary(row1Height + row2Height + 10);

              // 1. Recommendation (Slate-50)
              doc.setFillColor(248, 250, 252);
              doc.setDrawColor(226, 232, 240);
              doc.setLineWidth(0.3);
              doc.rect(margin, y, colWidth, row1Height, "FD");

              doc.setFont("Helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(71, 85, 105);
              doc.text("RECOMMENDATION", margin + padding, y + 5);

              doc.setFont("Helvetica", "normal");
              doc.setFontSize(8.5);
              doc.setTextColor(30, 41, 59);
              for (let j = 0; j < wrappedRec.length; j++) {
                doc.text(wrappedRec[j], margin + padding, y + 10 + (j * 4));
              }

              // 2. Expected Impact (Green-50)
              doc.setFillColor(240, 253, 244);
              doc.setDrawColor(209, 250, 229);
              doc.rect(margin + colWidth + 6, y, colWidth, row1Height, "FD");

              doc.setFont("Helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(6, 95, 70);
              doc.text("EXPECTED BUSINESS IMPACT & GROWTH", margin + colWidth + 6 + padding, y + 5);

              doc.setFont("Helvetica", "normal");
              doc.setFontSize(8.5);
              doc.setTextColor(30, 41, 59);
              for (let j = 0; j < wrappedImpact.length; j++) {
                doc.text(wrappedImpact[j], margin + colWidth + 6 + padding, y + 10 + (j * 4));
              }

              y += row1Height + 4;

              // 3. Why Prioritize (Amber-50, Full Width)
              doc.setFillColor(254, 243, 199);
              doc.setDrawColor(253, 230, 138);
              doc.rect(margin, y, contentWidth, row2Height, "FD");

              doc.setFont("Helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(146, 64, 14);
              doc.text("WHY PRIORITIZE", margin + padding, y + 5);

              doc.setFont("Helvetica", "normal");
              doc.setFontSize(8.5);
              doc.setTextColor(30, 41, 59);
              for (let j = 0; j < wrappedPrioritize.length; j++) {
                doc.text(wrappedPrioritize[j], margin + padding, y + 10 + (j * 4));
              }

              y += row2Height + 6;
            }
          });
          y += 3;
        }

        // --- SECTION 4: QUESTIONS WORTH EXPLORING ---
        if (parsed.questions) {
          drawSectionTitle("03 - QUESTIONS WORTH EXPLORING");

          const padding = 6;
          const textWidth = contentWidth - (padding * 2);
          const wrappedQuestions = doc.splitTextToSize(parsed.questions, textWidth);
          const boxHeight = (wrappedQuestions.length * 4.2) + (padding * 2);

          checkPageBoundary(boxHeight + 6);

          // Slate-900 background block
          doc.setFillColor(15, 23, 42); // slate-900
          doc.rect(margin, y, contentWidth, boxHeight, "F");

          doc.setFont("Helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(241, 245, 249); // light text
          for (let j = 0; j < wrappedQuestions.length; j++) {
            doc.text(wrappedQuestions[j], margin + padding, y + padding + 3 + (j * 4.2));
          }

          y += boxHeight + 6;
        }

        // --- SECTION 5: WHERE TO FOCUS NEXT ---
        if (parsed.focusPoint) {
          drawSectionTitle("04 - WHERE TO FOCUS NEXT");

          const padding = 6;
          const textWidth = contentWidth - (padding * 2);

          // 1. Draw Focus Point Description
          const wrappedFocus = doc.splitTextToSize(parsed.focusPoint, textWidth);
          const contentHeight = (wrappedFocus.length * 4.2) + 10;

          checkPageBoundary(contentHeight + 10);

          doc.setFillColor(254, 252, 232); // Amber-50 / Yellow-50
          doc.setDrawColor(253, 242, 196); // Yellow-100
          doc.setLineWidth(0.3);
          doc.rect(margin, y, contentWidth, contentHeight, "FD");

          doc.setFont("Helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59); // Slate-800
          for (let j = 0; j < wrappedFocus.length; j++) {
            doc.text(wrappedFocus[j], margin + padding, y + padding + 2 + (j * 4.2));
          }

          y += contentHeight + 6;

          // 2. Draw focus steps (if any)
          if (parsed.focusSteps && parsed.focusSteps.length > 0) {
            checkPageBoundary(15);
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(146, 64, 14); // Amber-800
            doc.text("SUGGESTED NEXT STEPS", margin, y);
            y += 5;

            parsed.focusSteps.forEach((step, idx) => {
              const wrappedStep = doc.splitTextToSize(step, contentWidth - 12);
              const stepHeight = (wrappedStep.length * 4) + 6;

              checkPageBoundary(stepHeight + 2);

              doc.setFillColor(255, 255, 255);
              doc.setDrawColor(253, 242, 196);
              doc.rect(margin, y, contentWidth, stepHeight, "FD");

              // Number circle/square
              doc.setFillColor(254, 243, 199);
              doc.rect(margin + 3, y + 2.5, 4, 4, "F");
              doc.setFont("Helvetica", "bold");
              doc.setFontSize(7);
              doc.setTextColor(146, 64, 14);
              doc.text(`${idx + 1}`, margin + 4.5, y + 5.5);

              // Step text
              doc.setFont("Helvetica", "normal");
              doc.setFontSize(8.5);
              doc.setTextColor(30, 41, 59);
              for (let j = 0; j < wrappedStep.length; j++) {
                doc.text(wrappedStep[j], margin + 9, y + 5.5 + (j * 4));
              }

              y += stepHeight + 2;
            });
            y += 4;
          }

          // 3. Alternative Interpretation (if any)
          if (parsed.alternativeInterpretation) {
            const wrappedAlt = doc.splitTextToSize(parsed.alternativeInterpretation, textWidth);
            const altHeight = (wrappedAlt.length * 4) + 10;

            checkPageBoundary(altHeight + 6);

            doc.setFillColor(254, 252, 232); // Amber-50
            doc.setDrawColor(253, 242, 196);
            doc.rect(margin, y, contentWidth, altHeight, "FD");

            doc.setFont("Helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(146, 64, 14);
            doc.text("ALTERNATIVE STRATEGIC VIEW", margin + padding, y + 5);

            doc.setFont("Helvetica", "italic");
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105); // Slate-600
            for (let j = 0; j < wrappedAlt.length; j++) {
              doc.text(wrappedAlt[j], margin + padding, y + 10 + (j * 4));
            }

            y += altHeight + 6;
          }
        }
      } else {
        // Fallback to original line-by-line parsing if parsed is null
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
      const fileName = `Northbound_Diagnostic_Report_${companyName.replace(/\s+/g, "_") || "Executive"}.pdf`;
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
    if (isDetectingIndustry) {
      setError("Please wait while we auto-detect the industry from your company website.");
      return;
    }
    if (!industry || industry.trim() === "" || industry === "INVALID_WEBSITE") {
      setError("Please enter a valid, active company website to auto-fill the industry before running diagnostic.");
      return;
    }
    if (!emailAddress.trim()) {
      setError("Email Address is required to finalize system diagnostic.");
      return;
    }
    if (!businessUsecase.trim()) {
      setError("Business Use Case is required to finalize system diagnostic.");
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
          summarizeProblem: businessUsecase,
          expectedResult: businessUsecase
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
          businessUsecase,
          businessUsecase
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
  };

  return (
    <div id="diagnostic-compiler" className="bg-white border border-outline-variant p-6 md:p-10 shadow-[0_4px_24px_rgba(28,34,22,0.03)] rounded-lg">
      <div className="grid lg:grid-cols-12 gap-10">
        {/* Left Interactive Input Form */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={runDiagnostic} className="space-y-6">
            {/* Company Website & Email Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            {/* Industry & Ecosystem Phase */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Industry */}
              <div className="group relative">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-950 uppercase tracking-widest">
                    <span>Industry</span>
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/60 text-[9px] font-sans font-medium text-slate-500 lowercase tracking-normal normal-case">
                      <Sparkles size={10} className="text-amber-500" />
                      auto-detected
                    </span>
                  </label>
                  {isDetectingIndustry && (
                    <span className="text-[10px] text-amber-600 font-mono animate-pulse">
                      Analyzing...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    placeholder="Auto-filled from website..."
                    value={industry}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 bg-slate-50/70 text-sm text-slate-700 font-sans font-medium rounded-lg focus:outline-none cursor-not-allowed transition-all duration-150 shadow-inner"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Sparkles size={14} className="text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Ecosystem Phase */}
              <div>
                <label className="block text-xs font-mono font-bold text-slate-950 uppercase tracking-widest mb-2.5">
                  Ecosystem Phase
                </label>
                <div className="relative">
                  <select
                    value={ecosystemPhase}
                    onChange={(e) => setEcosystemPhase(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/15 font-sans rounded-lg appearance-none transition-all cursor-pointer"
                  >
                    {STAGE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
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

            {/* Business Use Case */}
            <div id="business-usecase-field" className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-slate-950 uppercase tracking-widest">
                Business Use Case
              </label>
              <textarea
                id="business-usecase-textarea"
                required
                value={businessUsecase}
                onChange={(e) => setBusinessUsecase(e.target.value)}
                placeholder={getBusinessUsecasePlaceholder(industry, bottleneck)}
                rows={6}
                className="w-full px-4 py-3 border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/15 font-sans rounded-lg resize-y transition-all duration-150"
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
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">{industry}</p>
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
