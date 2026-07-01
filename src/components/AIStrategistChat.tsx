import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { Send, Terminal, Loader2, Sparkles, User, X } from "lucide-react";

function getChatFallbackResponse(userMessage: string): string {
  const lowerMsg = userMessage.toLowerCase();
  
  if (lowerMsg.includes("pricing") || lowerMsg.includes("invest") || lowerMsg.includes("cost") || lowerMsg.includes("fee") || lowerMsg.includes("much")) {
    return `### 01 - ENGAGEMENT MODEL INVESTMENTS

* **Discover Clarity Sprint**: Starts at $900 for diagnostics, trigger auditing, and pinpointing operational drag.

* **Design Architecture Sprint**: Starts at $5,500 for custom database schemas, API pathways, and end-to-end technical blueprints.

* **Sustain Strategic Advisory**: Starts at $1,800/month for fractional CTO checkpoints, engineering reviews, and scalability roadmaps.

### 02 - ENGAGEMENT ALIGNMENT

* **Direct Value**: Zero bloated agency overhead. Projects are scoped directly to your database and workflow requirements.`;
  } else if (lowerMsg.includes("timeline") || lowerMsg.includes("duration") || lowerMsg.includes("how long") || lowerMsg.includes("milestone")) {
    return `### 01 - TIME-SENSITIVE ENGAGEMENT CYCLES

* **Discover Clarity Sprint (2 Weeks)**: Week 1 focuses on intake auditing and data constraints. Week 2 delivers the friction map and diagnostic blueprint.

* **Design Architecture Sprint (6-8 Weeks)**: Weeks 1-2 deconstruct workflows. Weeks 3-5 design webhook triggers and schemas. Weeks 6-8 deliver custom concept-to-product blueprints.

* **Sustain Strategic Advisory (3+ Months)**: Structured in rolling monthly checkpoints aligned directly with your development backlog.

### 02 - VELOCITY PRIORITIES

* **Strict Schedules**: Fixed delivery milestones with 0% UAT runtime overhead.`;
  } else if (lowerMsg.includes("service") || lowerMsg.includes("offer") || lowerMsg.includes("package")) {
    return `### 01 - EXTRACTED SERVICE CAPABILITIES

* **Systems Auditing**: Mapping active schema issues, bottlenecks, and communication latency across CRM platforms.

* **Webhook & API Integration**: Clean deconstruction of outdated API integrations and cluttered webhook loops into modern gateways.

* **Database & CRM Synchronization**: Engineering robust, continuous automated data flows between HubSpot/Salesforce and production databases.

* **Concept-to-Product Blueprints**: Drafting completely scalable cloud architecture blueprints and schemas before any code is written.

### 02 - MEASURED OUTCOMES

* **Eliminated Drag**: Replaces manually maintained databases with reliable, automated synchronization layers.`;
  } else if (lowerMsg.includes("why hire") || lowerMsg.includes("why should i hire") || lowerMsg.includes("hire you") || lowerMsg.includes("expertise")) {
    return `### 01 - STRATEGIC VALUE & EXPERTISE WINNERS

* **Government of India (MSME)**: Product & Strategy Advisor mentoring founders on scalable growth blueprints and compliance.

* **Accenture**: Modernized complex enterprise platform migrations, legacy-to-OData API pathways, and data routing pipelines.

* **Birlasoft**: Delivered 45% efficiency gains and secured 100% stable database releases with 0% UAT failures.

* **Agile CRM**: Directed 8 SaaS micro-products, boosting development velocity by 30% and satisfaction by 40%.

### 02 - DECISIONS BAKED BY DATA

* **Data-Driven Roadmap**: Leveraged adoption signals and metrics to improve decision-making accuracy by 50%.

* **Absolute Clarity**: Replacing ambiguity in product roadmaps with highly detailed architectural diagrams and backlogs.`;
  } else if (lowerMsg.includes("contact") || lowerMsg.includes("reach out") || lowerMsg.includes("get in touch") || lowerMsg.includes("email")) {
    return `### 01 - DIRECT CHANNELS FOR SECURING ENGAGEMENT

* **Strategic Briefing Form**: Complete and submit the custom contact form at the bottom of the page.

* **Direct Correspondence Mail**: Reach out via evangelinejoseph63.ej@gmail.com.

* **Rapid SLA Turnaround**: Expect comprehensive, personalized responses within 24 business hours.

### 02 - AUDITING INTAKE REQUIREMENTS

* **Explicit Pain Points**: Share active system issues such as webhook lag or synchronization errors for faster custom analysis.`;
  } else if (lowerMsg.includes("availab") || lowerMsg.includes("slots")) {
    return `### 01 - CURRENT INTAKE & SCHEDULING STATUS

* **Monthly Cohort Slots**: Strictly limited to 2 new founders per month to guarantee high-attention engineering audits.

* **Discover Sprints**: Custom slots open starting next Monday.

* **Architecture Sprints**: Requires booking 2–3 weeks in advance.

### 02 - RESERVATION REQUIREMENTS

* **Briefing Submission**: Submit your primary bottleneck via the contact form to lock in calendar priorities.`;
  } else if (lowerMsg.includes("categorize") || lowerMsg.includes("fall") || lowerMsg.includes("which one") || lowerMsg.includes("problem")) {
    return `### 01 - LOGICAL SERVICES MAPPING

* **Discover Sprints ($900)**: Best for product backlog prioritization, roadmap alignment, or unblocking team bottleneck velocity.

* **Design Architecture ($5,500+)**: Best for deep tool integration, API redesigns, webhook untangling, and CRM data sync.

* **Sustain Retainers ($1,800/mo)**: Best for rolling fractional director advisories, weekly checks, and scaling audits.

### 02 - IDENTIFYING YOUR PATHWAY

* **Active Bottleneck Check**: Describe your system's current error states, and I will instantly align it to a dedicated model.`;
  } else if (lowerMsg.includes("bottleneck") || lowerMsg.includes("unbottle") || lowerMsg.includes("friction") || lowerMsg.includes("slow")) {
    return `### 01 - SYSTEM DIAGNOSTIC BRIEFING REQUIREMENTS

* **Core Technology Stack**: Identify tools/platforms active in the loop (e.g., CRM or PostgreSQL database).

* **Friction Description**: Specify where communication fails (e.g., duplicated webhooks, missing records, manual steps).

* **Impact Metrics**: Quantify consequences (e.g., client drops, delays, lost developer velocity).

### 02 - NEXT STEPS

* **Clear Action Plan**: State these 3 factors, and I will write a step-by-step unbottling roadmap instantly.`;
  } else {
    return `### 01 - CHOOSE A STRATEGIC CORE TOPIC

* **Pricing & Milestones**: "What is your pricing and engagement structure?"

* **Service Breakdown**: "What services do you offer to SaaS companies?"

* **Why Hire Evangeline**: "How does your Accenture and MSME background add value?"

### 02 - INITIATE SYSTEM UNBOTTLING

* **Submit Your Friction**: State your exact webhook or CRM bottleneck to receive an immediate mapped diagnostic pathway.`;
  }
}

interface AIStrategistChatProps {
  onClose?: () => void;
}

export default function AIStrategistChat({ onClose }: AIStrategistChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Ask your question about systems strategy, advisory services, or operations metrics.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scrolling on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error("Chat sequence rejected.");
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Non-JSON response received from /api/chat");
        throw new Error("The strategic server was restarting or unresponsive. Please wait 5 seconds and try again.");
      }

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: data.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.warn("API Chat call failed, utilizing client-side strategy chat fallback:", err);
      const fallbackContent = getChatFallbackResponse(textToSend);
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: fallbackContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white text-primary border border-outline p-6 shadow-[0_4px_24px_rgba(21,25,18,0.02)] flex flex-col h-[560px] relative architect-grid justify-between rounded-lg">
      {/* Terminal Title Header */}
      <div className="border-b border-outline pb-4 mb-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-secondary" />
          <span className="font-mono text-[10px] text-primary tracking-widest font-bold uppercase">
            Ask AI
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-secondary animate-pulse" />
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-on-surface-variant hover:text-primary transition-colors p-1 hover:bg-surface-dim rounded-lg cursor-pointer"
              aria-label="Close assistant"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-sm select-text scrollbar">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse text-right" : "mr-auto text-left"}`}
            >
              <div className={`w-8 h-8 flex items-center justify-center shrink-0 border rounded-lg ${
                isUser ? "bg-surface-dim border-outline text-on-surface-variant" : "bg-secondary-container border-secondary/35 text-secondary"
              }`}>
                {isUser ? <User size={14} /> : <Sparkles size={14} />}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1 justify-start">
                  <span className="font-mono text-[10px] uppercase text-on-surface-variant/80 tracking-wider font-bold">
                    {isUser ? "PROSPECT_FOUNDER" : "AI"}
                  </span>
                  <span className="text-[9px] font-mono text-on-surface-variant/50">{msg.timestamp}</span>
                </div>
                <div className={`p-4 font-sans text-xs leading-relaxed border select-text rounded-lg ${
                  isUser 
                    ? "bg-surface-dim border-outline text-primary rounded-tr-none whitespace-pre-line font-light" 
                    : "bg-white border-outline text-on-surface-variant rounded-tl-none space-y-3 font-light"
                }`}>
                  {isUser ? (
                    msg.content
                  ) : (
                    msg.content.split("\n").map((line, lIdx) => {
                      if (line.trim().startsWith("###")) {
                        return (
                          <div key={lIdx} className="text-secondary font-bold text-xs pt-2 pb-1 mb-1 font-sans">
                            {line}
                          </div>
                        );
                      }
                      return (
                        <div key={lIdx} className={line.trim() === "" ? "h-3" : "leading-relaxed pl-1 mb-2 block font-sans"}>
                          {line}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto text-left">
            <div className="w-8 h-8 flex items-center justify-center bg-secondary-container border border-secondary/30 text-secondary shrink-0 rounded-lg">
              <Loader2 size={14} className="animate-spin text-secondary" />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-on-surface-variant/80 tracking-widest mb-1 font-bold">
                AI
              </div>
              <div className="p-3 bg-white border border-outline font-sans text-xs text-on-surface-variant/75 italic rounded-lg rounded-tl-none">
                Deconstructing bottleneck schema, mapping API sequence metrics...
              </div>
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Interactive Input Form */}
      <div className="mt-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText);
          }}
          className="flex border border-outline focus-within:border-secondary transition-all rounded-lg overflow-hidden"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder="Type custom strategic architectural question..."
            className="flex-1 bg-white text-primary px-4 py-3 border-0 text-xs font-sans focus:ring-0 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="px-5 bg-surface-dim text-on-surface-variant hover:text-white hover:bg-secondary border-l border-outline hover:border-secondary transition-all cursor-pointer flex items-center justify-center"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
