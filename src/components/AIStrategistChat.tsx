import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { Send, Terminal, Loader2, Sparkles, User, X } from "lucide-react";

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
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: "I apologize, but the core strategic sequence was interrupted. Please try again in a moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
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
