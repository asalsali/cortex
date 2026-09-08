"use client";

import { useState } from "react";
import Modal from "./Modal";
import { createFact, type CreateFactData } from "@/lib/api";
import { useToast } from "./Toast";
import type { FactKind } from "@/data/mock";

interface AddFactModalProps {
  open: boolean;
  onClose: () => void;
  entitySlug: string;
  onFactCreated?: () => void;
}

const KINDS: FactKind[] = [
  "architecture",
  "decision",
  "process",
  "policy",
  "context",
  "event",
];

export default function AddFactModal({
  open,
  onClose,
  entitySlug,
  onFactCreated,
}: AddFactModalProps) {
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<FactKind>("context");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const data: CreateFactData = {
        entitySlug,
        content,
        kind,
        sourceType: "manual",
        confidence: 0.9,
      };
      await createFact(data);
      toast("Fact created successfully");
      setContent("");
      onClose();
      onFactCreated?.();
    } catch {
      toast("Failed to create fact", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Fact">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Entity</label>
          <div style={{ fontSize: 14, color: "#e8eaed", fontFamily: "var(--font-mono)" }}>
            {entitySlug}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Kind</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 16,
                  border:
                    k === kind
                      ? "1px solid rgba(124,92,252,0.3)"
                      : "1px solid #2a2d3e",
                  background:
                    k === kind ? "rgba(124,92,252,0.15)" : "transparent",
                  color: k === kind ? "#7c5cfc" : "#9ca3b4",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe the fact..."
            rows={4}
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "#0f1117",
              border: "1px solid #2a2d3e",
              borderRadius: 8,
              color: "#e8eaed",
              fontSize: 14,
              outline: "none",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid #2a2d3e",
              borderRadius: 8,
              color: "#9ca3b4",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            style={{
              padding: "8px 20px",
              background: "#7c5cfc",
              border: "none",
              borderRadius: 8,
              color: "white",
              fontSize: 13,
              fontWeight: 550,
              cursor: "pointer",
              opacity: loading || !content.trim() ? 0.5 : 1,
            }}
          >
            {loading ? "Creating..." : "Add Fact"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 550,
  color: "#9ca3b4",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
