"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  officeHoursChat,
  type OfficeHoursCitation,
  type OfficeHoursSuggestedPerson,
} from "@/lib/api";
import styles from "./page.module.css";

// ─── Types ──────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: OfficeHoursCitation[];
  suggestedPeople?: OfficeHoursSuggestedPerson[];
  factsExtracted?: number;
}

// ─── Component ──────────────────────────────────────────────────

export default function OfficeHoursPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, []);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await officeHoursChat(trimmed, sessionId);

      if (!sessionId) {
        setSessionId(response.sessionId);
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.message,
        timestamp: new Date().toISOString(),
        citations: response.citations,
        suggestedPeople: response.suggestedPeople,
        factsExtracted: response.factsExtracted,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to send message";
      setError(msg);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const citationHref = (citation: OfficeHoursCitation): string => {
    if (citation.type === "entity") {
      return `/entities/${encodeURIComponent(citation.id)}`;
    }
    return "#";
  };

  return (
    <div className={styles.page}>
      {messages.length === 0 && !loading ? (
        <>
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>
              Start an office hours session
            </div>
            <div className={styles.emptySubtitle}>
              Ask anything about the company. Cortex will search the knowledge
              base and respond with citations.
            </div>
          </div>

          <div className={styles.inputArea}>
            <div className={styles.inputWrapper}>
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                placeholder="Ask a question, describe a problem, propose an idea..."
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  resizeTextarea();
                }}
                onKeyDown={handleKeyDown}
                rows={1}
                autoFocus
              />
            </div>
            <div className={styles.inputHint}>
              Enter to send, Shift+Enter for newline
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={styles.messages}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.role === "user"
                    ? styles.messageRowUser
                    : styles.messageRowAssistant
                }
              >
                <div className={styles.messageLabel}>
                  {msg.role === "user" ? "You" : "Cortex"}
                </div>
                <div
                  className={
                    msg.role === "assistant"
                      ? styles.messageContentAssistant
                      : styles.messageContent
                  }
                >
                  {msg.content}
                </div>

                {msg.citations && msg.citations.length > 0 && (
                  <div className={styles.citations}>
                    {msg.citations.map((c, ci) => (
                      <Link
                        key={ci}
                        href={citationHref(c)}
                        className={styles.citationChip}
                        title={c.content}
                      >
                        {c.type === "entity" ? `entity:${c.label}` : `fact:${c.label}`}
                      </Link>
                    ))}
                  </div>
                )}

                {msg.suggestedPeople && msg.suggestedPeople.length > 0 && (
                  <div className={styles.suggestedPeople}>
                    {msg.suggestedPeople.map((p, pi) => (
                      <Link
                        key={pi}
                        href={`/entities/${encodeURIComponent(p.slug)}`}
                        className={styles.personChip}
                        title={p.reason}
                      >
                        {p.name}
                      </Link>
                    ))}
                  </div>
                )}

                {msg.factsExtracted != null && msg.factsExtracted > 0 && (
                  <div className={styles.factsExtracted}>
                    +{msg.factsExtracted} fact
                    {msg.factsExtracted !== 1 ? "s" : ""} extracted
                  </div>
                )}

                <div className={styles.messageTime}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            ))}

            {loading && (
              <div className={styles.thinking}>
                <div className={styles.thinkingLabel}>Cortex</div>
                <div className={styles.thinkingDots}>
                  Searching knowledge base...
                </div>
              </div>
            )}

            {error && <div className={styles.errorMessage}>{error}</div>}

            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputArea}>
            <div className={styles.inputWrapper}>
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                placeholder="Follow up..."
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  resizeTextarea();
                }}
                onKeyDown={handleKeyDown}
                rows={1}
              />
            </div>
            <div className={styles.inputHint}>
              Enter to send, Shift+Enter for newline
            </div>
          </div>
        </>
      )}
    </div>
  );
}
