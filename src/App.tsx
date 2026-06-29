import React, { useState, FormEvent } from "react";
import { 
  OUTCOMES, 
  ENGAGEMENTS, 
  CASE_STUDIES, 
  TESTIMONIALS 
} from "./data";
import DiagnosticWizard from "./components/DiagnosticWizard";
import AIStrategistChat from "./components/AIStrategistChat";
import CaseStudyDetail from "./components/CaseStudyDetail";
import SuccessConfetti from "./components/SuccessConfetti";
import ParallaxTiltCard from "./components/ParallaxTiltCard";
import GoogleCalendarSchedulerModal from "./components/GoogleCalendarSchedulerModal";
import { motion, AnimatePresence } from "motion/react";
import { 
  Check, 
  ArrowUpRight, 
  MessageSquare, 
  ShieldAlert, 
  DollarSign, 
  Briefcase, 
  ChevronLeft,
  ChevronRight, 
  Building2, 
  ArrowRight,
  Info,
  Calendar,
  Layers,
  FileSpreadsheet,
  Workflow,
  Menu,
  X,
  Mail,
  Linkedin,
  Loader2,
  Compass,
  Users,
  Search,
  Wrench,
  Activity,
  SearchCheck,
  Network,
  DraftingCompass,
  Zap
} from "lucide-react";

export default function App() {
  // Mobile navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // Active outcome path selection state
  const [selectedOutcomePathway, setSelectedOutcomePathway] = useState<"revenue" | "product">("revenue");

  // Hero section animation states
  const [isCondensed, setIsCondensed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);

    const timer = setTimeout(() => {
      setIsCondensed(true);
    }, 2500); // collapse after 2.5 seconds for snappier load
    
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  // SPA router state for active case studies
  const [selectedCaseStudyId, setSelectedCaseStudyId] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState(() => typeof window !== "undefined" ? window.location.pathname : "/");

  // Path parsing on load & back/forward history handling
  React.useEffect(() => {
    const handleUrlRouting = () => {
      const path = window.location.pathname;
      setCurrentRoute(path);
      const caseStudyMatch = path.match(/^\/case-study\/([^/]+)/);
      if (caseStudyMatch) {
        setSelectedCaseStudyId(caseStudyMatch[1]);
      } else if (path === "/northbound") {
        setSelectedCaseStudyId(null);
        setTimeout(() => {
          const el = document.getElementById("diagnostic");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 300);
      } else if (path === "/outcomes") {
        setSelectedCaseStudyId(null);
        setTimeout(() => {
          const el = document.getElementById("services");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 300);
      } else if (path === "/about") {
        setSelectedCaseStudyId(null);
        setTimeout(() => {
          const el = document.getElementById("about");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 300);
      } else if (path === "/caselibrary") {
        setSelectedCaseStudyId(null);
        setTimeout(() => {
          const el = document.getElementById("case-studies");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 300);
      } else {
        setSelectedCaseStudyId(null);
      }
    };

    handleUrlRouting();
    window.addEventListener("popstate", handleUrlRouting);
    return () => window.removeEventListener("popstate", handleUrlRouting);
  }, []);

  // Update history state when selectedCaseStudyId changes
  React.useEffect(() => {
    const currentPath = window.location.pathname;
    if (selectedCaseStudyId) {
      const targetPath = `/case-study/${selectedCaseStudyId}`;
      if (currentPath !== targetPath) {
        window.history.pushState({ caseStudyId: selectedCaseStudyId }, "", targetPath);
        setCurrentRoute(targetPath);
      }
    } else {
      const validPaths = ["/northbound", "/outcomes", "/about", "/caselibrary"];
      if (!validPaths.includes(currentPath) && currentPath !== "/") {
        if (currentPath.startsWith("/case-study/")) {
          window.history.pushState(null, "", "/");
          setCurrentRoute("/");
        }
      }
    }
  }, [selectedCaseStudyId]);

  // Dynamic SEO meta tags and title updater
  React.useEffect(() => {
    let title = "Evangeline Joseph | Systems & Business Strategist";
    let desc = "Audit operational bottlenecks, design scalable API architectures, and unlock predictable business growth with an enterprise-grade Systems Strategy Suite.";
    let type = "website";
    const url = typeof window !== "undefined" ? window.location.href : "";

    if (selectedCaseStudyId) {
      const study = CASE_STUDIES.find(cs => cs.id === selectedCaseStudyId);
      if (study) {
        title = `${study.title} | Strategic Systems Case Study`;
        desc = `${study.description} [${study.metricLabel}: ${study.value}]`;
        type = "article";
      }
    } else if (currentRoute === "/northbound") {
      title = "Northbound | Evangeline Joseph";
      desc = "Identify operational friction, tool integration issues, and pipeline latency. Generate a customized systems growth blueprint.";
    } else if (currentRoute === "/outcomes") {
      title = "Outcomes | Evangeline Joseph";
      desc = "Unlock predictable SaaS growth paths, design CRM and webhook synchronization, and eliminate systems friction.";
    } else if (currentRoute === "/about") {
      title = "About Evangeline Joseph | Technical Product Operations Strategist";
      desc = "Senior strategic product operations director partner. Former MSME architect and Accenture consultant.";
    } else if (currentRoute === "/caselibrary") {
      title = "Case Library | Evangeline Joseph";
      desc = "Examine strategic systems engineering interventions and business growth outcomes.";
    }

    // Update document title
    document.title = title;

    // Helper to update or create meta tags
    const updateMetaTag = (selector: string, attribute: string, value: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        const match = selector.match(/\[([^=]+)=["']?([^"']+)["']?\]/);
        if (match) {
          el.setAttribute(match[1], match[2]);
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attribute, value);
    };

    updateMetaTag('meta[name="description"]', 'content', desc);
    updateMetaTag('meta[property="og:title"]', 'content', title);
    updateMetaTag('meta[property="og:description"]', 'content', desc);
    updateMetaTag('meta[property="og:url"]', 'content', url);
    updateMetaTag('meta[property="og:type"]', 'content', type);
    updateMetaTag('meta[name="twitter:title"]', 'content', title);
    updateMetaTag('meta[name="twitter:description"]', 'content', desc);
    updateMetaTag('meta[name="twitter:card"]', 'content', 'summary_large_image');
  }, [selectedCaseStudyId, currentRoute]);

  const handleNavClick = (sectionId: string) => {
    setSelectedCaseStudyId(null);
    setIsMobileMenuOpen(false);
    let targetPath = "/";
    if (sectionId === "diagnostic") {
      targetPath = "/northbound";
    } else if (sectionId === "services") {
      targetPath = "/outcomes";
    } else if (sectionId === "about") {
      targetPath = "/about";
    } else if (sectionId === "case-studies") {
      targetPath = "/caselibrary";
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
      setCurrentRoute(targetPath);
    }
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 50);
  };

  const handleHomeClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setSelectedCaseStudyId(null);
    setIsMobileMenuOpen(false);
    if (window.location.pathname !== "/") {
      window.history.pushState(null, "", "/");
      setCurrentRoute("/");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Scroll spying to update URL when user scrolls through sections
  React.useEffect(() => {
    if (selectedCaseStudyId) return;

    const sections = [
      { id: "diagnostic", path: "/northbound" },
      { id: "services", path: "/outcomes" },
      { id: "about", path: "/about" },
      { id: "case-studies", path: "/caselibrary" }
    ];

    const observerOptions = {
      root: null,
      rootMargin: "-30% 0px -40% 0px", // Trigger when the section occupies a good chunk of viewport
      threshold: 0.1
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const section = sections.find(s => s.id === entry.target.id);
          if (section) {
            const currentPath = window.location.pathname;
            if (currentPath !== section.path) {
              window.history.replaceState(null, "", section.path);
              setCurrentRoute(section.path);
            }
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    const handleScroll = () => {
      if (window.scrollY < 200) {
        const currentPath = window.location.pathname;
        if (currentPath !== "/") {
          window.history.replaceState(null, "", "/");
          setCurrentRoute("/");
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [selectedCaseStudyId]);

  // Custom interactive Pricing / Sprints Planner State
  const [selectedSprint, setSelectedSprint] = useState("architecture");
  const [estimateComplexity, setEstimateComplexity] = useState(3); // 1-5
  const [systemsMaturity, setSystemsMaturity] = useState(2); // 1-5
  const [includeIntegrations, setIncludeIntegrations] = useState(true);
  const [includeTimelineMapping, setIncludeTimelineMapping] = useState(false);

  // Dynamic cost calculator
  const calculateCost = () => {
    let base = 0;
    if (selectedSprint === "discovery") base = 900;
    else if (selectedSprint === "architecture") base = 5500;
    else if (selectedSprint === "advisory") base = 1800;

    // Complexity overhead
    const complexityAdd = (estimateComplexity - 3) * 450;
    // Maturity discount (mature systems require less custom audit, higher maturity = negative offset)
    const maturityDiscount = (systemsMaturity - 3) * -150;

    const integrationAdd = includeIntegrations ? 800 : 0;
    const timelineAdd = includeTimelineMapping ? 500 : 0;

    return Math.max(500, base + complexityAdd + maturityDiscount + integrationAdd + timelineAdd);
  };

  // Static contact submission tracker
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactContext, setContactContext] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);

  const handleContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitStatus("submitting");
    setSubmissionError(null);
    setSubmitSuccessMessage(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          context: contactContext,
        }),
      });

      if (!response.ok) {
        throw new Error("Strategic pipeline rejected the briefing submission.");
      }

      const data = await response.json();
      setSubmitSuccessMessage(data.message || "I will process your system metrics against current pipeline capacities and send structured suggestions in 24 hours.");
      setSubmitStatus("success");
      setContactName("");
      setContactEmail("");
      setContactContext("");
    } catch (err: any) {
      console.error(err);
      setSubmissionError(err.message || "Failed to submit. Please try again.");
      setSubmitStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-surface-bg text-on-surface font-sans selection:bg-secondary selection:text-white overflow-x-hidden">
      
      {/* 1. ARCHITECTURAL HEADER */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-6 md:px-16 py-5 flex justify-between items-center w-full">
          <div 
            onClick={handleHomeClick}
            id="author-signature" 
            className="font-sans font-extrabold text-lg tracking-tighter text-primary cursor-pointer select-none"
          >
            EVANGELINE JOSEPH
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a 
              className={`font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer ${currentRoute === "/northbound" ? "text-secondary font-bold" : "text-on-surface-variant hover:text-secondary"}`} 
              onClick={(e) => { e.preventDefault(); handleNavClick("diagnostic"); }}
            >
              Northbound
            </a>
            <a 
              className={`font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer ${currentRoute === "/outcomes" ? "text-secondary font-bold" : "text-on-surface-variant hover:text-secondary"}`} 
              onClick={(e) => { e.preventDefault(); handleNavClick("services"); }}
            >
              Outcomes
            </a>
            <a 
              className={`font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer ${currentRoute === "/about" ? "text-secondary font-bold" : "text-on-surface-variant hover:text-secondary"}`} 
              onClick={(e) => { e.preventDefault(); handleNavClick("about"); }}
            >
              About
            </a>
            <a 
              className={`font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer ${currentRoute === "/caselibrary" ? "text-secondary font-bold" : "text-on-surface-variant hover:text-secondary"}`} 
              onClick={(e) => { e.preventDefault(); handleNavClick("case-studies"); }}
            >
              Case Library
            </a>
            <a 
              onClick={(e) => { e.preventDefault(); setIsSchedulerOpen(true); }}
              className="bg-primary text-white px-6 py-2.5 font-mono text-xs uppercase tracking-wider hover:bg-secondary hover:shadow-[0_0_15px_rgba(154,123,79,0.3)] hover:border-transparent transition-all rounded-xl cursor-pointer"
            >
              Discover
            </a>
          </nav>

          {/* Mobile menu trigger */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-primary hover:text-secondary transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[65px] bg-white z-40 flex flex-col p-8 border-t border-outline-variant/30 justify-between overflow-y-auto">
          <div className="flex flex-col space-y-6">
            <a 
              onClick={() => handleNavClick("diagnostic")}
              className={`font-mono text-sm tracking-widest uppercase border-b pb-2 cursor-pointer transition-colors ${currentRoute === "/northbound" ? "text-secondary border-secondary font-bold" : "text-primary border-outline-variant hover:text-secondary"}`} 
            >
              Northbound
            </a>
            <a 
              onClick={() => handleNavClick("services")}
              className={`font-mono text-sm tracking-widest uppercase border-b pb-2 cursor-pointer transition-colors ${currentRoute === "/outcomes" ? "text-secondary border-secondary font-bold" : "text-primary border-outline-variant hover:text-secondary"}`} 
            >
              Outcomes
            </a>
            <a 
              onClick={() => handleNavClick("about")}
              className={`font-mono text-sm tracking-widest uppercase border-b pb-2 cursor-pointer transition-colors ${currentRoute === "/about" ? "text-secondary border-secondary font-bold" : "text-primary border-outline-variant hover:text-secondary"}`} 
            >
              About
            </a>
            <a 
              onClick={() => handleNavClick("case-studies")}
              className={`font-mono text-sm tracking-widest uppercase border-b pb-2 cursor-pointer transition-colors ${currentRoute === "/caselibrary" ? "text-secondary border-secondary font-bold" : "text-primary border-outline-variant hover:text-secondary"}`} 
            >
              Case Library
            </a>
          </div>

          {/* Quick Actions Component */}
          <div className="mt-8 pt-6 border-t border-outline-variant/60 space-y-4">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-on-surface-variant uppercase block">
              Quick Actions
            </span>
            <div className="grid grid-cols-2 gap-3 pb-8">
              <button
                onClick={() => handleNavClick("diagnostic")}
                className="bg-primary text-white text-center py-4 font-mono text-xs uppercase font-bold tracking-wider rounded-xl cursor-pointer hover:bg-secondary active:scale-95 transition-all duration-200 shadow-sm"
                type="button"
              >
                Audit Now
              </button>
              <button
                onClick={() => {
                  setIsBriefingModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="bg-white border border-outline-variant hover:border-secondary text-primary hover:text-secondary text-center py-4 font-mono text-xs uppercase font-bold tracking-wider rounded-xl cursor-pointer active:scale-95 transition-all duration-200 shadow-sm"
                type="button"
              >
                Book Consultation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="pt-20">
        {selectedCaseStudyId !== null ? (
          <CaseStudyDetail 
            caseId={selectedCaseStudyId}
            onBack={() => setSelectedCaseStudyId(null)}
            onNavigate={(id) => setSelectedCaseStudyId(id)}
            onDiscuss={() => setIsBriefingModalOpen(true)}
          />
        ) : (
          <>
            {/* 2. DRAFTING HERO CANVAS */}
            <section className="relative min-h-[calc(100vh-5rem)] py-16 md:py-24 flex flex-col justify-center px-6 md:px-16 overflow-hidden bg-surface-container-high border-b border-outline-variant">
              <div className="max-w-5xl relative z-10 w-full mx-auto">
                <div className="relative min-h-[420px] md:min-h-[460px] flex flex-col justify-center items-center text-center">
                  
                  {/* Scattered Chaos Cloud (Active, drifting, collapses inward dynamically) */}
                  <div className="absolute inset-0 flex items-center justify-center overflow-visible pointer-events-none select-none">
                    <div className="relative w-full h-full max-w-4xl mx-auto flex items-center justify-center">
                      {[
                        { text: "Build an AI feature?", x: -260, y: -120 },
                        { text: "Redesign the entire UX?", x: 250, y: -110 },
                        { text: "Ship the next backlog sprint?", x: -280, y: -40 },
                        { text: "Add one more integration?", x: 260, y: 50 },
                        { text: "Change the pricing model?", x: -160, y: 120 },
                        { text: "Restructure the org chart?", x: 180, y: -160 },
                        { text: "Track five more KPIs?", x: -70, y: -170 },
                        { text: "Write a new 5-year deck?", x: 200, y: 130 },
                        { text: "Is it a product-market fit problem?", x: -250, y: 40 },
                        { text: "Is it a lead generation problem?", x: 100, y: 90 }
                      ].map((item, idx) => {
                        const scaleFactor = windowWidth < 768 ? 0.42 : 1.0;
                        const floatClass = `animate-float-${idx % 3}`;
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.5, x: item.x * scaleFactor, y: item.y * scaleFactor, filter: "blur(4px)" }}
                            animate={isCondensed ? {
                              x: 0,
                              y: 0,
                              scale: 0.1,
                              opacity: 0,
                              filter: "blur(16px)"
                            } : {
                              x: item.x * scaleFactor,
                              y: item.y * scaleFactor,
                              scale: 1,
                              opacity: 0.85,
                              filter: "blur(0px)"
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 90,
                              damping: 20,
                              mass: 0.7,
                              delay: isCondensed ? idx * 0.02 : idx * 0.05
                            }}
                            className="absolute font-sans text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase select-none text-[#151912]/80 whitespace-nowrap"
                          >
                            <div className={isCondensed ? "" : floatClass}>
                              {item.text}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resolution Element: Resolves into bold beautiful title */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 24, filter: "blur(12px)" }}
                    animate={isCondensed ? { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, scale: 0.94, y: 24, filter: "blur(12px)" }}
                    transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center text-center w-full"
                  >
                    <motion.span 
                      initial={{ opacity: 0, y: 15 }}
                      animate={isCondensed ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="font-mono text-xs text-secondary tracking-[0.25em] uppercase mb-4 block font-bold"
                    >
                      GROWTH • EXECUTION • PRODUCT STRATEGY
                    </motion.span>
                    
                    <motion.h1 
                      initial={{ opacity: 0, y: 25 }}
                      animate={isCondensed ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 1.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="font-serif font-medium text-5xl md:text-7xl text-primary mb-6 tracking-tight leading-[1.1] text-balance max-w-4xl"
                    >
                      Know Where to Focus Next
                    </motion.h1>

                    <motion.div
                      initial={{ opacity: 0, y: 25 }}
                      animate={isCondensed ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: 0.55, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col items-center text-center w-full"
                    >
                      <p 
                        className="font-sans text-base md:text-lg text-on-surface-variant max-w-2xl mb-8 leading-relaxed"
                      >
                        Every next move starts with why – <strong className="font-bold italic text-primary">Find yours in 15 minutes</strong>
                      </p>

                      <div className="flex flex-wrap gap-4 justify-center items-center">
                        <a 
                          href="#diagnostic" 
                          onClick={(e) => {
                            e.preventDefault();
                            handleNavClick("diagnostic");
                          }}
                          className="bg-primary text-white px-8 py-3.5 font-mono text-xs uppercase tracking-widest hover:bg-secondary hover:shadow-[0_0_15px_rgba(154,123,79,0.3)] focus:bg-secondary transition-all flex items-center gap-3 cursor-pointer rounded-xl"
                        >
                          Start Northbound
                          <ArrowRight size={14} className="text-secondary" />
                        </a>

                        <button
                          onClick={() => {
                            setIsCondensed(false);
                            setTimeout(() => {
                              setIsCondensed(true);
                            }, 2500); // exactly 2.5 seconds
                          }}
                          className="border border-outline-variant/60 hover:border-secondary text-on-surface-variant hover:text-secondary px-5 py-3.5 font-mono text-xs uppercase tracking-widest bg-white rounded-xl transition-all cursor-pointer flex items-center gap-2"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6.3l-2.4 2.4" />
                          </svg>
                          Replay Concept
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                  
                </div>
              </div>

              {/* Coordinate Watermark Accent */}
              <div className="absolute bottom-6 right-6 font-mono text-[10px] text-outline/65 hidden md:block">
                LAT: 40.7128° N // LON: 74.0060° W — BROOKLYN WORKSPACE
              </div>
            </section>

        {/* 5. REAL-TIME INTERACTIVE DIAGNOSTIC INTEGRATOR (WIDGET DOCK) */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="py-28 px-6 md:px-16 bg-surface-container-low border-b border-outline-variant scroll-mt-20" 
          id="diagnostic"
        >
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-12">
              <span className="font-mono text-xs text-secondary tracking-widest uppercase block mb-3 font-bold">
                01 // Automated Strategy Checkpoint
              </span>
              <h2 className="font-serif font-medium text-3xl md:text-5xl text-primary tracking-tight mb-4">
                Northbound
              </h2>
              <p className="text-on-surface-variant text-base leading-relaxed">
                Not every business challenge needs an immediate solution. Sometimes it needs a better question. Northbound helps you find it.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-primary/70 uppercase tracking-wider">
                <span className="font-bold text-primary/90">Built using:</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-secondary font-bold">•</span> Public company signals
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-secondary font-bold">•</span> Industry benchmarking
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-secondary font-bold">•</span> Strategy frameworks
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-secondary font-bold">•</span> AI reasoning
                </span>
              </div>
            </div>

            {/* Imported Live Diagnostic Wizard Component */}
            <DiagnosticWizard />
          </div>
        </motion.section>

        {/* 4. ENGINEERED OUTCOMES */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="py-28 px-6 md:px-16 bg-surface-dim border-b border-outline-variant/40 scroll-mt-20" 
          id="services"
        >
          <div className="max-w-7xl mx-auto">
            
            {/* Header block with outcome narrative */}
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="font-mono text-xs text-secondary tracking-[0.25em] uppercase block mb-3 font-bold">
                02 // OUTCOME-DRIVEN PARTNERSHIPS
              </span>
              <h2 className="font-serif font-medium text-3xl md:text-5xl text-primary tracking-tight mb-6">
                Engineered Outcomes
              </h2>
              <div className="h-0.5 w-16 bg-secondary mx-auto mb-6" />
              <p className="text-on-surface-variant text-base md:text-lg leading-relaxed font-sans max-w-3xl mx-auto">
                Focused on two critical business priorities:
                <span className="block font-semibold text-primary mt-1 md:whitespace-nowrap">
                  Accelerating growth and Building products
                </span>
              </p>
            </div>

            {/* Premium Dual-Pathway Selector Grid with sideways collapse effect */}
            <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-stretch mt-12 mb-12 w-full transition-all duration-500">
              
              {/* PATHWAY A: REVENUE OPTIMIZATION ENGINE */}
              <ParallaxTiltCard 
                onClick={() => setSelectedOutcomePathway("revenue")}
                wrapperClassName={`transition-all duration-500 relative flex flex-col justify-between select-none ${
                  selectedOutcomePathway === "revenue" 
                    ? "md:flex-[3.5] flex-1 max-w-full" 
                    : "md:flex-[1.5] flex-1 max-w-full md:max-w-[30%]"
                }`}
                className={`text-left bg-white p-6 md:p-10 rounded-lg transition-all duration-500 relative overflow-hidden flex flex-col justify-between cursor-pointer border h-full ${
                  selectedOutcomePathway === "revenue" 
                    ? "border-secondary ring-4 ring-secondary/5 shadow-xs opacity-100" 
                    : "border-outline opacity-60 hover:opacity-100"
                }`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full bg-secondary/5 pointer-events-none" />
                
                <div className="relative z-10 w-full flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] tracking-widest text-secondary font-extrabold uppercase">
                          PATHWAY A // REVENUE RECOVERY
                        </span>
                        {selectedOutcomePathway === "revenue" && (
                          <span className="bg-secondary/15 text-secondary font-mono text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-widest leading-none">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all shrink-0 ${
                        selectedOutcomePathway === "revenue" ? "bg-secondary text-white" : "bg-surface-dim border border-outline text-secondary"
                      }`}>
                        <Zap size={16} />
                      </span>
                    </div>

                    <h3 className="font-sans font-extrabold text-xl md:text-2xl lg:text-3xl text-primary mb-3 tracking-tight leading-tight">
                      Revenue Growth Modeling
                    </h3>

                    <div className="transition-all duration-500">
                      {selectedOutcomePathway === "revenue" ? (
                        <p className="text-on-surface-variant text-sm leading-relaxed font-sans">
                          We find out exactly where your product is leaking money or slowing down, and we fix it. Ideal for scaling startups struggling with conversion leaks or high workflow overhead.
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 leading-relaxed font-sans">
                          Click to expand Pathway A and view revenue optimization streams.
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {selectedOutcomePathway !== "revenue" && (
                    <div className="mt-6 pt-4 border-t border-outline flex items-center gap-1.5 text-secondary font-mono text-[10px] font-bold uppercase tracking-wider">
                      <span>Activate Pathway A</span>
                      <ArrowRight size={12} className="animate-pulse" />
                    </div>
                  )}
                </div>
              </ParallaxTiltCard>

              {/* PATHWAY B: PRODUCT STRATEGY ARCHITECTURE */}
              <ParallaxTiltCard 
                onClick={() => setSelectedOutcomePathway("product")}
                wrapperClassName={`transition-all duration-500 relative flex flex-col justify-between select-none ${
                  selectedOutcomePathway === "product" 
                    ? "md:flex-[3.5] flex-1 max-w-full" 
                    : "md:flex-[1.5] flex-1 max-w-full md:max-w-[30%]"
                }`}
                className={`text-left bg-primary text-white p-6 md:p-10 rounded-lg transition-all duration-500 relative overflow-hidden flex flex-col justify-between cursor-pointer border h-full ${
                  selectedOutcomePathway === "product" 
                    ? "border-secondary ring-4 ring-secondary/15 shadow-xs opacity-100" 
                    : "border-primary-container opacity-50 hover:opacity-85"
                }`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full bg-white/5 pointer-events-none" />
                
                <div className="relative z-10 w-full flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] tracking-widest text-slate-300 font-bold uppercase">
                          PATHWAY B // PRODUCT STRATEGY
                        </span>
                        {selectedOutcomePathway === "product" && (
                          <span className="bg-white/15 text-white font-mono text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-widest leading-none">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all shrink-0 ${
                        selectedOutcomePathway === "product" ? "bg-white text-black" : "bg-primary-container border border-white/10 text-slate-300"
                      }`}>
                        <Compass size={16} />
                      </span>
                    </div>

                    <h3 className="font-sans font-extrabold text-xl md:text-2xl lg:text-3xl text-white mb-3 tracking-tight leading-tight">
                      Product Strategy & Market Readiness
                    </h3>

                    <div className="transition-all duration-500">
                      {selectedOutcomePathway === "product" ? (
                        <p className="text-slate-300 text-sm leading-relaxed font-sans">
                          We define the exact structural blueprint required to launch a successful product or enter a new market. Ideal for launching MVPs or pivoting existing service models.
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 leading-relaxed font-sans">
                          Click to expand Pathway B and view product strategy channels.
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedOutcomePathway !== "product" && (
                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-1.5 text-slate-300 font-mono text-[10px] font-bold uppercase tracking-wider">
                      <span>Activate Pathway B</span>
                      <ArrowRight size={12} className="animate-pulse" />
                    </div>
                  )}
                </div>
              </ParallaxTiltCard>
            </div>

            {/* UNIFIED INTERACTIVE ENGINE WORKSPACE
               Aggregates Operating Channels, Ideal Alignment, and Investment structure 
               into a singular, highly cohesive and architectural layout block. */}
            <div className="mt-8 transition-all duration-500 ease-in-out">
              <div className={`p-6 md:p-10 rounded-lg border transition-all duration-500 relative overflow-hidden ${
                selectedOutcomePathway === "revenue"
                  ? "bg-white border-outline shadow-[0_4px_24px_rgba(28,34,22,0.03)] text-primary"
                  : "bg-primary border-primary-container shadow-xs text-white"
              }`}>
                {/* Architectural background subtle glow patterns */}
                <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] pointer-events-none opacity-30 transition-all duration-500 ${
                  selectedOutcomePathway === "revenue" ? "bg-slate-200/40" : "bg-white/5"
                }`} />

                {/* Workspace Header Panel */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-8 border-b border-outline-variant/20 relative z-10">
                  <div>
                    <h4 className="font-sans font-black text-xl md:text-2xl tracking-tight">
                      {selectedOutcomePathway === "revenue" ? "Revenue Growth Model" : "Product Strategy & Market Readiness"}
                    </h4>
                  </div>
                </div>

                {/* Dynamic Content Grid */}
                <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-stretch relative z-10">
                  {/* LEFT COLUMN: Streams & target profile (cols: 8) */}
                  <div className="lg:col-span-8 flex flex-col justify-between gap-5">
                    
                    {/* Operational Channels */}
                    <div className="space-y-3">
                      
                      <div className="grid sm:grid-cols-3 gap-4 md:gap-5">
                        {selectedOutcomePathway === "revenue" ? (
                          <>
                            <div className="space-y-4 bg-white p-5 md:p-6 rounded-lg border-2 border-secondary/35 transition-all hover:border-secondary/60 hover:shadow-2xs flex flex-col justify-between">
                              <div className="space-y-2">
                                <span className="font-mono text-[10px] md:text-xs font-black text-secondary block tracking-wider uppercase">UNDERSTAND THE WHY</span>
                                <p className="text-xs md:text-sm text-slate-700/90 leading-relaxed font-sans font-normal">
                                  Identify the underlying factors limiting growth, efficiency, and business performance.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-2">
                                {["Conversion", "Operations", "Revenue"].map((tag) => (
                                  <span key={tag} className="font-mono text-[9px] md:text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-sm font-semibold uppercase tracking-wider">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-4 bg-white p-5 md:p-6 rounded-lg border-2 border-secondary/35 transition-all hover:border-secondary/60 hover:shadow-2xs flex flex-col justify-between">
                              <div className="space-y-2">
                                <span className="font-mono text-[10px] md:text-xs font-black text-secondary block tracking-wider uppercase">FOCUS ON WHAT MATTERS</span>
                                <p className="text-xs md:text-sm text-slate-700/90 leading-relaxed font-sans font-normal">
                                  Prioritize the opportunities that will create the greatest business impact.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-2">
                                {["Prioritization", "Opportunities", "Efficiency"].map((tag) => (
                                  <span key={tag} className="font-mono text-[9px] md:text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-sm font-semibold uppercase tracking-wider">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-4 bg-white p-5 md:p-6 rounded-lg border-2 border-secondary/35 transition-all hover:border-secondary/60 hover:shadow-2xs flex flex-col justify-between">
                              <div className="space-y-2">
                                <span className="font-mono text-[10px] md:text-xs font-black text-secondary block tracking-wider uppercase">BUILD A CLEAR PATH</span>
                                <p className="text-xs md:text-sm text-slate-700/90 leading-relaxed font-sans font-normal">
                                  Translate insights into practical recommendations and execution plans.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-2">
                                {["Optimization", "Automation", "Execution"].map((tag) => (
                                  <span key={tag} className="font-mono text-[9px] md:text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-sm font-semibold uppercase tracking-wider">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-4 bg-white/5 p-5 md:p-6 rounded-lg border-2 border-white/25 transition-all hover:border-white/45 flex flex-col justify-between">
                              <div className="space-y-2">
                                <span className="font-mono text-[10px] md:text-xs font-black text-white block tracking-wider uppercase">UNDERSTAND THE MARKET</span>
                                <p className="text-xs md:text-sm text-slate-200/90 leading-relaxed font-sans font-normal">
                                  Evaluate customer needs, market opportunities, and business objectives.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-2">
                                {["Customers", "Problems", "Competition"].map((tag) => (
                                  <span key={tag} className="font-mono text-[9px] md:text-xs px-2.5 py-1 bg-white/10 text-white rounded-sm font-semibold uppercase tracking-wider">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-4 bg-white/5 p-5 md:p-6 rounded-lg border-2 border-white/25 transition-all hover:border-white/45 flex flex-col justify-between">
                              <div className="space-y-2">
                                <span className="font-mono text-[10px] md:text-xs font-black text-white block tracking-wider uppercase">DEFINE THE DIRECTION</span>
                                <p className="text-xs md:text-sm text-slate-200/90 leading-relaxed font-sans font-normal">
                                  Create clarity around what should be built and why.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-2">
                                {["Positioning", "Prioritization", "MVP"].map((tag) => (
                                  <span key={tag} className="font-mono text-[9px] md:text-xs px-2.5 py-1 bg-white/10 text-white rounded-sm font-semibold uppercase tracking-wider">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-4 bg-white/5 p-5 md:p-6 rounded-lg border-2 border-white/25 transition-all hover:border-white/45 flex flex-col justify-between">
                              <div className="space-y-2">
                                <span className="font-mono text-[10px] md:text-xs font-black text-white block tracking-wider uppercase">PREPARE FOR SUCCESS</span>
                                <p className="text-xs md:text-sm text-slate-200/90 leading-relaxed font-sans font-normal">
                                  Develop a practical strategy for launch and adoption.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-2">
                                {["Roadmap", "Pricing", "Go-to-Market"].map((tag) => (
                                  <span key={tag} className="font-mono text-[9px] md:text-xs px-2.5 py-1 bg-white/10 text-white rounded-sm font-semibold uppercase tracking-wider">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Focus Profile & Objectives */}
                    <div className="pt-4 border-t border-outline-variant/20">
                      <span className={`font-mono text-[10px] tracking-widest font-black uppercase block mb-2 ${
                        selectedOutcomePathway === "revenue" ? "text-secondary" : "text-slate-400"
                      }`}>
                        IDEAL ENGAGEMENT PROFILE & ALIGNMENT
                      </span>

                      <div className="max-w-2xl">
                        <div>
                          <p className={`text-xs leading-relaxed font-normal ${
                            selectedOutcomePathway === "revenue" ? "text-slate-700" : "text-slate-200"
                          }`}>
                            {selectedOutcomePathway === "revenue"
                              ? "Post-revenue B2B SaaS or digital platforms (Seed to Series A) who already have active metrics, transaction traffic, and customers on the system."
                              : "Early-stage creators, technical owners, or SME business owners preparing to launch a new software product, coordinate API pipelines, or launch feature ecosystems."
                          }
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT COLUMN: Dedicated Investment Card (cols: 4) */}
                  <div id="pricing" className="scroll-mt-24 lg:col-span-4 flex">
                    <div className={`w-full flex flex-col justify-between p-5 rounded-lg border transition-all group ${
                      selectedOutcomePathway === "revenue"
                        ? "bg-white border-slate-200 shadow-xs"
                        : "bg-white/5 border-white/15 shadow-xs text-white hover:border-white/25"
                    }`}>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className={`font-mono text-[9px] tracking-wider uppercase font-extrabold ${
                            selectedOutcomePathway === "revenue" ? "text-slate-600" : "text-slate-300"
                          }`}>
                            INVESTMENT STRUCTURE
                          </span>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            selectedOutcomePathway === "revenue" ? "bg-slate-600" : "bg-white"
                          }`} />
                        </div>

                        <div>
                          <span className={`font-mono text-[8px] tracking-wide uppercase block opacity-60 ${
                            selectedOutcomePathway === "revenue" ? "text-slate-500" : "text-slate-400"
                          }`}>Suggested pricing</span>
                          <div className="mt-1 flex items-baseline gap-1 flex-wrap">
                            <span className="text-2xl md:text-3xl font-black tracking-tight font-sans">
                              Starts from $1,600
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className={`font-mono text-[8px] tracking-wide uppercase block opacity-60 ${
                            selectedOutcomePathway === "revenue" ? "text-slate-500" : "text-slate-400"
                          }`}>Expected engagement Timeline</span>
                          <span className="text-xs md:text-sm font-extrabold block mt-0.5">
                            4-8 weeks
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-outline-variant/20 flex flex-col gap-3">
                        <div className="flex items-center">
                          <p className={`text-xs leading-relaxed font-sans ${
                            selectedOutcomePathway === "revenue" ? "text-on-surface-variant font-medium" : "text-slate-200"
                          }`}>
                            Have a product idea, challenge, or opportunity? Let's identify what matters
                          </p>
                        </div>
                        
                        <button 
                          onClick={() => setIsBriefingModalOpen(true)}
                          className={`w-full py-2 px-3 font-mono text-[10px] uppercase font-bold tracking-widest rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-sm group-hover:shadow-[0_0_12px_rgba(154,123,79,0.25)] ${
                            selectedOutcomePathway === "revenue"
                              ? "bg-primary text-white hover:bg-secondary"
                              : "bg-white text-primary hover:bg-slate-100"
                          }`}
                        >
                          <span>Initiate discussion</span>
                          <ArrowRight size={11} className="transition-transform duration-300 group-hover:translate-x-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>



        {/* 6. ABOUT THE STRATEGIST SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="py-28 px-6 md:px-16 bg-surface-container-low border-b border-outline-variant/40 scroll-mt-20" 
          id="about"
        >
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-12 gap-12 items-start">
              {/* Photo columns with Sage Border block */}
              <div className="lg:col-span-5 relative">
                <div className="border border-outline-variant bg-white p-2 rounded-lg">
                  <div className="aspect-[4/5] overflow-hidden grayscale hover:grayscale-0 transition-all duration-700 relative bg-slate-150 rounded-lg">
                    <img 
                      alt="Evangeline Joseph - Product operations director" 
                      className="w-full h-full object-cover rounded-lg" 
                      referrerPolicy="no-referrer"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNsDfKxIFF-XnfQlEO8EeQ1x-42pJ_pDsyYb2IbdiBWK3MWFYv_p-5fVgxh23EgNJWZEYfTkwpL-N-LIkLK8BQYpUIPhNnXA2fHm23ie5xnxP3w4V_QHjCosf4wqHvwDxZB1huOu82J2rC6Izs1RIEeVNLGa61CeasC358GHuB1yfUaekXMWRth1EOl69T2uNZFwDlkq4r-Fh9Ip_5z4Ts6v3HtIP6pvYBvBvXewtAsGYBSKmDjNf9BR0LIheDQ5xVmix1w-fZP9IrPA"
                    />
                    <div className="absolute inset-0 bg-secondary/5 mix-blend-multiply rounded-lg" />
                  </div>
                </div>
                {/* Structural line callout */}
                <div className="absolute -bottom-4 -left-4 w-12 h-12 border-l-2 border-b-2 border-secondary select-none pointer-events-none" />
                <div className="absolute -top-4 -right-4 w-12 h-12 border-r-2 border-t-2 border-secondary select-none pointer-events-none" />
              </div>

              {/* Pitch layout */}
              <div className="lg:col-span-7">
                <span className="font-mono text-xs text-secondary tracking-[0.2em] uppercase mb-4 block font-bold">
                  03 // ABOUT THE STRATEGIST
                </span>
                <h2 className="font-serif font-medium text-3xl md:text-4xl text-primary tracking-tight mb-6">
                  Your Partner in Scaling with Clarity and Confidence
                </h2>
                <div className="space-y-6 text-on-surface-variant text-base md:text-lg leading-relaxed mb-10">
                  <p>
                    Scaling a startup isn't just about hiring more people—it's about ensuring your systems don't break under the weight of your success. With over 8 years of experience across high-growth SaaS and enterprise ecosystems, I help founders bridge the gap between visionary ideas and operational excellence.
                  </p>
                  <p>
                    I specialize in identifying the hidden 'structural friction'—the misaligned workflows and assumptions—that prevents predictable scale. By streamlining your CRM, API strategy, and automation systems, I create the clarity you need to make faster decisions and the infrastructure your team needs to execute with confidence.
                  </p>
                </div>

                {/* Grid stats */}
                <div className="bg-white border border-outline/80 p-8 md:p-12 rounded-lg shadow-[0_4px_24px_rgba(28,34,22,0.03)]">
                  <h4 className="font-sans text-xs md:text-sm text-[#2D3622] tracking-[0.16em] uppercase mb-10 font-bold">
                    HOW I CREATE VALUE
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-10 items-start">
                    {/* Item 1 */}
                    <div className="flex flex-col items-center text-center group">
                      <div className="text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Workflow size={28} strokeWidth={1.8} />
                      </div>
                      <span className="font-sans font-bold text-xs md:text-[13px] text-primary leading-snug tracking-tight max-w-[130px] mx-auto">
                        Audit for<br />Friction
                      </span>
                    </div>

                    {/* Item 2 */}
                    <div className="flex flex-col items-center text-center group">
                      <div className="text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                        <SearchCheck size={28} strokeWidth={1.8} />
                      </div>
                      <span className="font-sans font-bold text-xs md:text-[13px] text-primary leading-snug tracking-tight max-w-[130px] mx-auto">
                        Uncover<br />Execution Risks
                      </span>
                    </div>

                    {/* Item 3 */}
                    <div className="flex flex-col items-center text-center group">
                      <div className="text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Network size={28} strokeWidth={1.8} />
                      </div>
                      <span className="font-sans font-bold text-xs md:text-[13px] text-primary leading-snug tracking-tight max-w-[130px] mx-auto">
                        Align Tech with<br />Strategy
                      </span>
                    </div>

                    {/* Item 4 */}
                    <div className="flex flex-col items-center text-center group">
                      <div className="text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                        <DraftingCompass size={28} strokeWidth={1.8} />
                      </div>
                      <span className="font-sans font-bold text-xs md:text-[13px] text-primary leading-snug tracking-tight max-w-[130px] mx-auto">
                        Architect for<br />Scale
                      </span>
                    </div>

                    {/* Item 5 */}
                    <div className="flex flex-col items-center text-center group">
                      <div className="text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Zap size={28} strokeWidth={1.8} />
                      </div>
                      <span className="font-sans font-bold text-xs md:text-[13px] text-primary leading-snug tracking-tight max-w-[130px] mx-auto">
                        Unlock<br />Predictable Growth
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </motion.section>



        {/* 8. CASE STUDIES SYSTEMIC SHIFTS (CASE LIBRARY) */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="py-28 px-6 md:px-16 bg-primary text-white scroll-mt-20" 
          id="case-studies"
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
              <div>
                <span className="font-mono text-xs text-secondary tracking-widest uppercase block mb-3 font-bold">
                  04 // METRICS & EVIDENCE
                </span>
                <h2 className="font-serif font-medium text-3xl md:text-4xl text-slate-100 tracking-tight leading-none">
                  Tangible outcomes from systemic shifts.
                </h2>
              </div>
            </div>

            {/* Grid display case studies */}
            <div className="grid md:grid-cols-3 gap-8">
              {CASE_STUDIES.map((c) => (
                <ParallaxTiltCard 
                  key={c.id} 
                  onClick={() => setSelectedCaseStudyId(c.id)}
                  className="bg-white/5 border border-white/10 p-8 flex flex-col justify-between group hover:border-secondary hover:bg-white/10 transition-all rounded-lg cursor-pointer"
                >
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="font-mono text-xs text-secondary uppercase tracking-widest font-bold">
                          {c.tag}
                        </span>
                        <ArrowUpRight className="text-slate-550 group-hover:text-secondary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" size={20} />
                      </div>
                      <div className="text-4xl md:text-5xl font-mono font-bold tracking-tight mb-2 text-white">
                        {c.value}
                      </div>
                      <div className="font-mono text-[10px] uppercase text-slate-400 mb-6 font-semibold tracking-widest">
                        {c.metricLabel}
                      </div>
                      <h4 className="font-sans font-bold text-lg text-slate-200 mb-3">{c.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">{c.description}</p>
                    </div>

                    <div className="border-t border-slate-800 mt-6 pt-4 flex justify-end items-center text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      <span className="text-secondary/80 group-hover:text-secondary transition-colors font-bold">VIEW CASE STUDY →</span>
                    </div>
                  </div>
                </ParallaxTiltCard>
              ))}
            </div>
          </div>
        </motion.section>

        {/* 10. FINAL ACTIONS MODULE (CTA) */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="py-32 px-6 md:px-16 bg-white overflow-hidden text-center border-t border-outline-variant/30 scroll-mt-20" 
          id="Services-Registry"
        >
          <div className="max-w-4xl mx-auto relative z-10 space-y-8">
            <h2 className="font-serif font-medium text-3xl md:text-5xl text-primary tracking-tight leading-tight">
              Ready to Explore What's Holding Growth Back?
            </h2>
            <div className="space-y-4">
              <p className="text-on-surface-variant text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                Whether you're navigating growth challenges, product decisions, or operational complexity, the first step is understanding where the real opportunities and constraints exist.
              </p>
              <p className="text-on-surface-variant text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-semibold">
                Let's start with a conversation.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <a 
                href="#schedule"
                onClick={(e) => {
                  e.preventDefault();
                  setIsSchedulerOpen(true);
                }}
                className="bg-primary text-white px-10 py-5 font-mono text-xs uppercase tracking-wider hover:bg-secondary hover:shadow-[0_0_15px_rgba(154,123,79,0.3)] focus:bg-secondary transition-all font-bold rounded-xl cursor-pointer inline-flex items-center justify-center"
              >
                Schedule a Discovery Call &rarr;
              </a>
            </div>
          </div>
        </motion.section>
          </>
        )}
      </main>

      {/* 11. ARCHITECTURAL FOOTER */}
      <footer className="bg-primary text-white py-20 px-6 md:px-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          
          <div className="max-w-sm space-y-4">
            <div className="font-sans font-black text-2xl tracking-tighter">EVANGELINE JOSEPH</div>
            <div className="flex gap-4">
              <a href="https://www.linkedin.com/in/evangeline-joseph/-" target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center border border-slate-800 hover:border-secondary hover:text-secondary text-slate-450 transition-colors rounded-full" title="LinkedIn Profile">
                <Linkedin size={14} />
              </a>
              <a href="mailto:evangelinejoseph.m@gmail.com" className="w-8 h-8 flex items-center justify-center border border-slate-800 hover:border-secondary hover:text-secondary text-slate-450 transition-colors rounded-full" title="Email Evangeline Joseph">
                <Mail size={14} />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
            <div>
              <h5 className="font-mono text-xs font-bold text-secondary tracking-wider uppercase mb-4">SITEMAP</h5>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a onClick={(e) => { e.preventDefault(); handleNavClick("diagnostic"); }} className="hover:text-secondary transition-colors cursor-pointer block">Northbound</a></li>
                <li><a onClick={(e) => { e.preventDefault(); handleNavClick("services"); }} className="hover:text-secondary transition-colors cursor-pointer block">Outcomes</a></li>
                <li><a onClick={(e) => { e.preventDefault(); handleNavClick("about"); }} className="hover:text-secondary transition-colors cursor-pointer block">About</a></li>
                <li><a onClick={(e) => { e.preventDefault(); handleNavClick("case-studies"); }} className="hover:text-secondary transition-colors cursor-pointer block">Case Library</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-mono text-xs font-bold text-secondary tracking-wider uppercase mb-4">INTERACTIVES</h5>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a onClick={(e) => { e.preventDefault(); setIsSchedulerOpen(true); }} className="hover:text-secondary transition-colors cursor-pointer block">Discovery Scheduler</a></li>
                <li><a onClick={(e) => { e.preventDefault(); handleNavClick("diagnostic"); }} className="hover:text-secondary transition-colors cursor-pointer block">Northbound</a></li>
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h5 className="font-mono text-xs font-bold text-secondary tracking-wider uppercase mb-4">CONTACT</h5>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <Mail size={12} className="text-secondary shrink-0" />
                  <a href="mailto:evangelinejoseph.m@gmail.com" className="hover:text-secondary transition-colors">evangelinejoseph.m@gmail.com</a>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Bottom credits */}
        <div className="max-w-7xl mx-auto pt-16 mt-16 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          <div>© 2026 EVANGELINE JOSEPH — BUSINESS STRATEGIST</div>
          <div className="flex gap-6">
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* Dynamic Context Briefing Modal */}
      <AnimatePresence>
        {isBriefingModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with click to close */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setIsBriefingModalOpen(false)}
            />
            
            {/* Modal Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-white border border-outline-variant rounded-lg w-full max-w-lg p-8 md:p-10 shadow-[0_10px_50px_rgba(28,34,22,0.08)] overflow-y-auto max-h-[90vh] text-primary z-10 select-none"
            >
              
              {/* Close button in top-right */}
              <button 
                onClick={() => setIsBriefingModalOpen(false)}
                className="absolute top-6 right-6 text-on-surface-variant hover:text-primary transition-colors cursor-pointer p-1 rounded-lg hover:bg-surface-dim"
                aria-label="Close modal"
              >
                <span className="sr-only">Close Modal</span>
                <X size={20} />
              </button>

              <h3 className="font-sans font-bold text-2xl mb-4 text-center text-primary">Contact & Briefing Registry</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-6 text-center max-w-sm mx-auto">
                Ready to connect? Submit your briefing below to get in touch.
              </p>

              {submitStatus === "success" ? (
                <div className="bg-surface-dim border border-secondary p-6 rounded-lg text-center space-y-4">
                  <Check className="text-secondary mx-auto animate-bounce" size={32} />
                  <h4 className="font-sans font-extrabold uppercase tracking-wide text-sm text-primary">Briefing Received</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-sans">
                    {submitSuccessMessage || "Thank you! Your briefing has been successfully received."}
                  </p>
                  <button 
                    onClick={() => {
                      setSubmitStatus("idle");
                      setIsBriefingModalOpen(false);
                    }}
                    className="w-full mt-4 py-3 bg-primary text-white font-mono text-xs uppercase tracking-widest font-bold hover:bg-secondary hover:shadow-[0_0_15px_rgba(154,123,79,0.3)] transition-all rounded-xl cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4 text-left">
                  {submissionError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-mono">
                      ⚠️ {submissionError}
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-mono text-secondary uppercase tracking-widest mb-1 font-bold">Company Contact</label>
                    <input 
                      type="text" 
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your Name (Acme Exec)" 
                      className="w-full px-4 py-3 bg-white border border-outline-variant text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary font-sans text-primary rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-secondary uppercase tracking-widest mb-1 font-bold">Direct Email</label>
                    <input 
                      type="email" 
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="you@company.com" 
                      className="w-full px-4 py-3 bg-white border border-outline-variant text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary font-sans text-primary rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-mono text-secondary uppercase tracking-widest font-bold">Context</label>
                      <span className="text-[10px] font-mono text-on-surface-variant/70">{contactContext.length}/200</span>
                    </div>
                    <textarea 
                      rows={4}
                      maxLength={200}
                      value={contactContext}
                      onChange={(e) => setContactContext(e.target.value)}
                      placeholder="Describe your context, situation, goals, or requirements..." 
                      className="w-full px-4 py-3 bg-white border border-outline-variant text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary font-sans text-primary resize-none rounded-lg"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={submitStatus === "submitting"}
                    className="w-full py-4 bg-primary text-white font-mono text-xs uppercase tracking-widest hover:bg-secondary hover:shadow-[0_0_15px_rgba(154,123,79,0.3)] transition-all font-bold flex items-center justify-center gap-2 cursor-pointer rounded-xl mt-6"
                  >
                    {submitStatus === "submitting" ? (
                      <Loader2 size={12} className="animate-spin text-white" />
                    ) : (
                      "Submit"
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <GoogleCalendarSchedulerModal 
        isOpen={isSchedulerOpen} 
        onClose={() => setIsSchedulerOpen(false)} 
      />

    </div>
  );
}
