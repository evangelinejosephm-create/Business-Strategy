import { useState, FormEvent, useRef, useEffect } from "react";
import { STAGE_OPTIONS } from "../data";
import { DiagnosticResult } from "../types";
import { Loader2, ArrowUpRight, AlertCircle, Info, FileText, ChevronDown, Copy, Check, FileDown, Clock, ThumbsUp, ThumbsDown, MessageSquare, Mail, LogOut, TrendingUp, Target, ShieldAlert, ListChecks, Zap, BarChart2, Calendar, Award, Activity, Sparkles, TrendingDown } from "lucide-react";
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

    // SECTION 1: EXECUTIVE SUMMARY
    const summaryText = getSectionText("EXECUTIVE SUMMARY") || getSectionText("EXECUTIVE DIAGNOSIS") || rawParts[1] || "";
    const executiveSummary = summaryText.trim();

    // SECTION 2: KEY SYSTEMIC GAPS
    const bottlenecksText = getSectionText("KEY SYSTEMIC GAPS") || getSectionText("SYSTEMIC GAPS") || getSectionText("KEY BOTTLENECKS") || getSectionText("BOTTLENECKS") || rawParts[2] || "";
    const bottlenecksRaw = bottlenecksText.split(/(?=^\d+\.\s+)/m).map(b => b.trim()).filter(b => b.length > 0);
    const bottlenecks = bottlenecksRaw.slice(0, 5).map((block, idx) => {
      const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      let title = lines[0] || `Gap ${idx + 1}`;
      title = title.replace(/^(\d+[\s.-]*|gap\s*\d+[\s.-]*|bottleneck\s*\d+[\s.-]*)/i, "").trim();

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

      const description = rawTextLines.join(" ").trim();

      return {
        title,
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
      title = title.replace(/^(\d+[\s.-]*|opportunity\s*\d+[\s.-]*)/i, "").trim();

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
        title,
        what: what.trim() || "Identified growth driver.",
        why: why.trim() || "Tapping on this opportunity accelerates performance metrics."
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
    const questions = questionsText.trim();

    // SECTION 5: WHERE TO FOCUS NEXT
    const focusText = getSectionText("WHERE TO FOCUS NEXT") || getSectionText("WHERE TO FOCUS") || getSectionText("THINGS I WOULD FOCUS ON") || getSectionText("THINGS I WOULD FOCUS ONE") || getSectionText("FOCUS POINT") || getSectionText("CONSULTANT POINT OF VIEW") || rawParts[5] || "";
    const focusPoint = focusText.trim();

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
      
      {/* SECTION 1: EXECUTIVE SUMMARY */}
      <div className="bg-slate-900 border-l-4 border-amber-500 rounded-xl p-6 border border-slate-800 shadow-md">
        <div className="flex items-center gap-2 mb-3.5">
          <Sparkles size={18} className="text-amber-400" />
          <h4 className="font-mono font-bold text-xs tracking-wider uppercase text-slate-300">
            01 // EXECUTIVE SUMMARY
          </h4>
          <span className="ml-auto bg-slate-850 border border-slate-750 text-slate-400 font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-md">
            2 min read
          </span>
        </div>
        <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-line font-medium">
          {parsed.executiveSummary || "No executive summary compiled."}
        </p>
      </div>

      {/* SECTION 2: KEY SYSTEMIC GAPS */}
      {parsed.bottlenecks && parsed.bottlenecks.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 border-b border-outline-variant/50 pb-3">
            <ShieldAlert size={18} className="text-secondary" />
            <h4 className="font-mono font-bold text-xs tracking-wider uppercase text-primary">
              02 // KEY SYSTEMIC GAPS
            </h4>
            <span className="ml-auto text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
              3 min read
            </span>
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
                    <span className="text-[10px] font-mono text-rose-700 uppercase tracking-widest block font-bold">Gap Description / Problem Tree</span>
                    <p className="text-slate-800 leading-relaxed font-sans text-sm whitespace-pre-wrap">{bottleneck.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: OPPORTUNITIES */}
      {parsed.opportunities && parsed.opportunities.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 border-b border-outline-variant/50 pb-3">
            <Zap size={18} className="text-secondary" />
            <h4 className="font-mono font-bold text-xs tracking-wider uppercase text-primary">
              03 // STRATEGIC GROWTH OPPORTUNITIES
            </h4>
            <span className="ml-auto text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
              3 min read
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {parsed.opportunities.map((opp, idx) => (
              <div
                key={idx}
                className="bg-white border border-outline-variant/60 rounded-xl p-5 shadow-sm hover:border-secondary/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2.5">
                    <span className="bg-secondary/10 text-secondary font-mono text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Opportunity 0{idx + 1}
                    </span>
                  </div>
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

      {/* SECTION 4: QUESTIONS WORTH INVESTIGATING */}
      {parsed.questions && (
        <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-md space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Award size={18} className="text-amber-400" />
            <h4 className="font-mono font-bold text-xs tracking-wider uppercase text-slate-300">
              04 // QUESTIONS WORTH INVESTIGATING
            </h4>
            <span className="ml-auto text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              1 min read
            </span>
          </div>

          <div className="text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-wrap font-medium">
            {parsed.questions}
          </div>
        </div>
      )}

      {/* SECTION 5: WHERE TO FOCUS NEXT */}
      {parsed.focusPoint && (
        <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-amber-500/10 pb-3">
            <Target size={18} className="text-amber-600" />
            <h4 className="font-mono font-bold text-xs tracking-wider uppercase text-amber-900 font-bold">
              05 // WHERE TO FOCUS NEXT - CONSULTANT VIEW
            </h4>
            <span className="ml-auto text-[10px] font-mono text-amber-700 uppercase tracking-wider font-bold">
              Consultant POV
            </span>
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
  "B2B SaaS",
  "E-commerce",
  "Professional Services",
  "Healthcare",
  "Education",
  "Manufacturing",
  "Logistics",
  "Finance",
  "Real Estate",
  "Media & Marketing"
];

const PROGRESS_STEPS = [
  "Analyzing company website...",
  "Understanding business model...",
  "Benchmarking industry...",
  "Building issue tree...",
  "Prioritizing bottlenecks...",
  "Preparing executive summary..."
];

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
        doc.text(`STRICTION CONSOLE // EXECUTIVE BLUEPRINT FOR ${companyName.toUpperCase()}`, margin, 12);
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
      doc.text("STRICTION ADVISORY STRATEGY SUITE // V2.0", margin + 8, y + 10);

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

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to finalize system diagnostic.");
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
          <form onSubmit={runDiagnostic} className="space-y-5">
            <div>
              <label className="block text-xs font-mono font-medium text-primary uppercase tracking-widest mb-2">
                1. Company Website
              </label>
              <input
                type="text"
                required
                placeholder="e.g. www.company.com"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant bg-surface-bright text-sm text-primary focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary font-sans rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-primary uppercase tracking-widest mb-2">
                2. Email Address
              </label>
              <input
                type="email"
                required
                placeholder="e.g. contact@company.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant bg-surface-bright text-sm text-primary focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary font-sans rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-primary uppercase tracking-widest mb-2">
                3. Industry
              </label>
              {isOtherIndustry ? (
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="type your industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-3 border border-outline-variant bg-surface-bright text-sm text-primary focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary font-sans rounded-lg pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtherIndustry(false);
                      setIndustry(INDUSTRY_OPTIONS[0]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-secondary hover:text-primary transition-colors uppercase tracking-widest font-bold cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              ) : (
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
                  className="w-full px-4 py-3 border border-outline-variant bg-surface-bright text-sm text-primary focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary font-sans rounded-lg"
                >
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-primary uppercase tracking-widest mb-2">
                4. Primary Business Goal
              </label>
              <select
                value={bottleneck}
                onChange={(e) => handleOutcomeChange(e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant bg-surface-bright text-sm text-primary focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary font-sans rounded-lg"
              >
                {OUTCOME_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-mono font-medium text-primary uppercase tracking-widest">
                  5. What's slowing your business?
                </label>
                <span className="text-[10px] font-mono text-primary/40">
                  {problemText.length}/200
                </span>
              </div>
              <textarea
                value={problemText}
                onChange={(e) => setProblemText(e.target.value.slice(0, 200))}
                maxLength={200}
                placeholder="Describe your current process, friction points, or specific challenges..."
                rows={4}
                className="w-full px-4 py-3 border border-outline-variant bg-surface-bright text-sm text-primary focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary font-sans rounded-lg resize-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-mono font-medium text-primary uppercase tracking-widest">
                  6. What does success look like?
                </label>
                <span className="text-[10px] font-mono text-primary/40">
                  {expectedResult.length}/200
                </span>
              </div>
              <textarea
                required
                placeholder="What is your desired outcome or standard of excellence?"
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={3}
                className="w-full px-4 py-3 border border-outline-variant bg-surface-bright text-sm text-primary focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary font-sans rounded-lg"
              />
            </div>

            {error && (
              <div className="bg-error-container/40 border border-error text-error text-xs p-3 flex gap-2 rounded-lg">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-primary text-white font-mono hover:bg-secondary focus:bg-secondary transition-all flex items-center justify-center gap-2 cursor-pointer font-bold tracking-wider rounded-lg"
            >
              {isLoading ? (
                <span className="flex items-center gap-1">
                  Analyzing<span className="animate-pulse">.</span><span className="animate-pulse [animation-delay:0.2s]">.</span><span className="animate-pulse [animation-delay:0.4s]">.</span>
                </span>
              ) : (
                <>
                  Go Northbound
                  <ArrowUpRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Output Strategic Blueprint Panel */}
        <div className="lg:col-span-7 bg-white border border-outline p-6 flex flex-col relative lg:h-[760px] min-h-[480px] overflow-hidden rounded-lg shadow-[0_4px_24px_rgba(21,25,18,0.02)]">
          {isLoading && (
            <div className="absolute inset-0 bg-white flex flex-col justify-center p-8 md:p-12 z-10">
              <div className="max-w-md w-full mx-auto space-y-8">
                {/* Visual Header */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-secondary uppercase block">
                    Advisory Console // Systems Audit
                  </span>
                  <h3 className="font-sans font-extrabold text-xl text-primary tracking-tight">
                    Running Strategic Diagnostics...
                  </h3>
                </div>

                {/* Horizontal Progress Bar */}
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
              <h4 className="font-sans font-semibold text-lg text-primary mb-2">AI-Generated Strategic Assessment</h4>
              <p className="text-sm text-on-surface-variant max-w-md">
                Complete the assessment to generate a customized overview of potential opportunities, constraints, and strategic focus areas relevant to your business.
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
