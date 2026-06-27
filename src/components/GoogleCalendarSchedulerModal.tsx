import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, CalendarRange, ExternalLink, Settings, Check, HelpCircle, Loader2 } from "lucide-react";

interface GoogleCalendarSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GoogleCalendarSchedulerModal({ isOpen, onClose }: GoogleCalendarSchedulerModalProps) {
  // Default fallback link derived from user's email
  const DEFAULT_CALENDLY_URL = "https://calendly.com/evangelinejoseph-m/30min";
  
  const [calendlyUrl, setCalendlyUrl] = useState<string>(DEFAULT_CALENDLY_URL);
  const [inputUrl, setInputUrl] = useState<string>("");
  const [showConfig, setShowConfig] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  // Load persisted Calendly URL on mount and modal open
  useEffect(() => {
    const savedUrl = localStorage.getItem("custom_calendly_url");
    if (savedUrl) {
      setCalendlyUrl(savedUrl);
      setInputUrl(savedUrl);
    } else {
      setInputUrl(DEFAULT_CALENDLY_URL);
    }
  }, [isOpen]);

  // Handle URL change
  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    let formattedUrl = inputUrl.trim();
    
    // Simple normalization of Calendly URL
    if (formattedUrl && !formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = "https://" + formattedUrl;
    }

    if (formattedUrl) {
      localStorage.setItem("custom_calendly_url", formattedUrl);
      setCalendlyUrl(formattedUrl);
      setIsSaved(true);
      setIframeLoading(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  // Build the clean iframe URL with aesthetic query parameters
  const getEmbedUrl = () => {
    try {
      const urlObj = new URL(calendlyUrl);
      // Inject query options to keep the inline widget minimalist & beautiful
      urlObj.searchParams.set("hide_landing_page_details", "1");
      urlObj.searchParams.set("hide_gdpr_banner", "1");
      urlObj.searchParams.set("background_color", "fbfbf9");
      urlObj.searchParams.set("text_color", "0b1215");
      urlObj.searchParams.set("primary_color", "8b9d83");
      return urlObj.toString();
    } catch {
      return calendlyUrl;
    }
  };

  // Reset to default
  const handleResetToDefault = () => {
    setInputUrl(DEFAULT_CALENDLY_URL);
    setCalendlyUrl(DEFAULT_CALENDLY_URL);
    localStorage.removeItem("custom_calendly_url");
    setIframeLoading(true);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Ambient Backdrop Blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Core Responsive Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative bg-[#fbfbf9] border border-outline-variant rounded-2xl w-full max-w-4xl shadow-[0_20px_50px_rgba(21,25,18,0.15)] overflow-hidden text-primary z-10 flex flex-col max-h-[92vh]"
          >
            {/* Modal Header */}
            <div className="p-5 md:p-6 border-b border-outline-variant/40 bg-white/50 backdrop-blur-xs flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 text-secondary rounded-xl">
                  <CalendarRange size={20} />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-lg md:text-xl tracking-tight text-primary">Schedule Discovery Call</h3>
                  <p className="text-[10px] md:text-xs text-on-surface-variant font-medium">
                    Select a convenient session slot instantly using our integrated scheduler.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 md:gap-2">
                {/* Configuration Toggle */}
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${showConfig ? "bg-secondary/15 text-secondary" : "text-on-surface-variant hover:text-primary hover:bg-slate-100"}`}
                  title="Configure Calendly URL"
                >
                  <Settings size={18} />
                </button>

                {/* Direct Open in New Tab */}
                <a
                  href={calendlyUrl}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  rel="noopener noreferrer"
                  className="p-2 text-on-surface-variant hover:text-primary hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                  title="Open in new window"
                >
                  <ExternalLink size={18} />
                </a>

                {/* Close Button */}
                <button 
                  onClick={onClose}
                  className="p-2 text-on-surface-variant hover:text-primary hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                  aria-label="Close scheduling modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* CONFIGURATION EXPANDABLE SECTION */}
            <AnimatePresence>
              {showConfig && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-slate-50 border-b border-outline-variant/30 overflow-hidden shrink-0"
                >
                  <div className="p-5 max-w-2xl mx-auto space-y-3">
                    <div className="flex items-start gap-2">
                      <HelpCircle size={14} className="text-secondary shrink-0 mt-0.5" />
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        Want to route calls to your own active booking page? Paste any valid Calendly URL (e.g. <code>https://calendly.com/your-name</code> or specific event link) below. It will immediately synchronize for your visitors.
                      </p>
                    </div>

                    <form onSubmit={handleSaveUrl} className="flex gap-2">
                      <input
                        type="text"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="e.g. https://calendly.com/your-username"
                        className="flex-1 px-3.5 py-2 text-xs bg-white border border-outline-variant rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary outline-hidden font-mono"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary hover:bg-secondary text-white font-mono text-[10px] uppercase tracking-wider font-extrabold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        {isSaved ? <Check size={12} className="text-emerald-300" /> : null}
                        {isSaved ? "Saved" : "Save Link"}
                      </button>

                      {calendlyUrl !== DEFAULT_CALENDLY_URL && (
                        <button
                          type="button"
                          onClick={handleResetToDefault}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-mono text-[10px] uppercase tracking-wider font-extrabold rounded-xl transition-all cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* IFRAME EMBED AREA */}
            <div className="flex-1 bg-white relative min-h-[450px] md:min-h-[550px] overflow-hidden flex flex-col justify-stretch">
              {iframeLoading && (
                <div className="absolute inset-0 bg-[#fbfbf9]/60 flex flex-col items-center justify-center gap-3 z-20">
                  <Loader2 className="animate-spin text-secondary" size={28} />
                  <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold animate-pulse">
                    Synchronizing Calendly Slots...
                  </span>
                </div>
              )}
              
              <iframe
                src={getEmbedUrl()}
                width="100%"
                height="100%"
                frameBorder="0"
                className="w-full flex-1 min-h-[450px] md:min-h-[550px]"
                onLoad={() => setIframeLoading(false)}
                title="Calendly Scheduler"
                referrerPolicy="no-referrer"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            </div>

            {/* Footer with subtle badge */}
            <div className="p-3 bg-slate-50 border-t border-outline-variant/30 text-center text-[10px] text-on-surface-variant font-mono tracking-wider shrink-0 flex flex-col sm:flex-row items-center justify-between px-6 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Active Link: {calendlyUrl}</span>
              </div>
              <div className="text-[9px]">
                Not loading? <a href={calendlyUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-secondary">Open Directly</a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
