import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles, X, Send, BookOpen, ShieldCheck, CheckCircle2 } from "lucide-react";
import { api } from "../../api/client";
import { Badge } from "../ui/common";

interface SovereignAssistantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SovereignAssistantModal({ open, onOpenChange }: SovereignAssistantModalProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<
    Array<{
      question: string;
      answer: string;
      confidence?: string;
      citations?: Array<{ source: string; ref?: string; text?: string }>;
    }>
  >([
    {
      question: "What statutory compliance standards apply to Indian manufacturing facilities?",
      answer:
        "Industrial facilities in India face three primary regulatory vectors: 1) BEE PAT (Perform, Achieve and Trade) specific energy consumption targets for Designated Consumers, 2) SEBI BRSR Core value-chain ESG disclosure requirements for suppliers of top 1,000 listed entities, and 3) EU CBAM (Carbon Border Adjustment Mechanism) for direct and indirect embedded emissions on exported goods (Iron, Steel, Aluminium, Cement, Fertilizer, Hydrogen, Electricity).",
      confidence: "high",
      citations: [
        { source: "BEE Energy Conservation Act (PAT Scheme)", ref: "Statutory Rule 2012" },
        { source: "SEBI BRSR Core Framework", ref: "CIR/CFD/2023/122" },
        { source: "EU CBAM Regulation", ref: "Regulation (EU) 2023/956" },
      ],
    },
  ]);

  const handleSend = async (qText?: string) => {
    const q = (qText || question).trim();
    if (!q || loading) return;
    setLoading(true);
    if (!qText) setQuestion("");

    try {
      const res = (await api.askAssistant(q)) as {
        answer?: string;
        confidence?: string;
        citations?: any[];
      };
      setHistory((prev) => [
        ...prev,
        {
          question: q,
          answer: res.answer || "No response recorded.",
          confidence: res.confidence || "medium",
          citations: res.citations || [],
        },
      ]);
    } catch {
      setHistory((prev) => [
        ...prev,
        {
          question: q,
          answer: "Unable to query statutory knowledge base. Please check backend connection.",
          confidence: "low",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    "Is our plant subject to EU CBAM embedded emission charges?",
    "How does BRSR Core Scope 3 assurance affect MSME suppliers?",
    "What are the baseline carbon emission factors for Indian steam coal?",
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-backdrop" />
        <Dialog.Content className="dialog-content assistant-modal" aria-describedby="assistant-description">
          <div className="assistant-header">
            <div className="assistant-title-group">
              <span className="assistant-badge">
                <Sparkles size={16} />
              </span>
              <div>
                <Dialog.Title className="assistant-title">Sovereign RAG Assistant</Dialog.Title>
                <Dialog.Description id="assistant-description" className="assistant-subtitle">
                  Statutory reasoning with zero-hallucination citations (EU CBAM · India CCTS · SEBI BRSR · BEE PAT)
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close Assistant">
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="assistant-chat-container">
            {history.map((item, idx) => (
              <div key={idx} className="chat-thread">
                <div className="user-bubble">
                  <p>{item.question}</p>
                </div>
                <div className="assistant-bubble">
                  <div className="bubble-header">
                    <span className="source-tag">
                      <ShieldCheck size={14} /> Grounded Statutory Response
                    </span>
                    {item.confidence && (
                      <Badge tone={item.confidence === "high" ? "positive" : "moderate"}>
                        {item.confidence.toUpperCase()} CONFIDENCE
                      </Badge>
                    )}
                  </div>
                  <div className="bubble-content">
                    <p>{item.answer}</p>
                  </div>
                  {item.citations && item.citations.length > 0 && (
                    <div className="citations-tray">
                      <div className="citations-label">
                        <BookOpen size={12} /> Statutory Citations:
                      </div>
                      <div className="citations-list">
                        {item.citations.map((c, cIdx) => (
                          <span key={cIdx} className="citation-pill">
                            <CheckCircle2 size={11} />
                            <strong>{c.source}</strong> {c.ref && `(${c.ref})`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="assistant-bubble loading-bubble">
                <div className="loading-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <small>Retrieving verified statutory chunks & synthesizing response…</small>
              </div>
            )}
          </div>

          <div className="assistant-footer">
            <div className="prompt-suggestions">
              {sampleQuestions.map((sq, sIdx) => (
                <button key={sIdx} type="button" className="pill-btn" onClick={() => handleSend(sq)}>
                  {sq}
                </button>
              ))}
            </div>
            <form
              className="assistant-input-row"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <input
                type="text"
                placeholder="Ask about CBAM rules, emission factors, or compliance obligations…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                className="send-btn"
                disabled={!question.trim() || loading}
                aria-label="Send query"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
