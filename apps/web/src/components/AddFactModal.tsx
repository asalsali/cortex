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
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Entity</label>
          <div style={{ fontSize: 13, color: "#ededef", fontFamily: "var(--font-mono)" }}>
            {entitySlug}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Kind</label>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 4,
                  border: k === kind
                    ? "1px solid rgba(255,255,255,0.14)"
                    : "1px solid rgba(255,255,255,0.03)",
                  background: k === kind ? "rgba(255,255,255,0.05)" : "transparent",
                  color: k === kind ? "#ededef" : "#6e6e76",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  transition: "all 0.1s ease",
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
              background: "#09090b",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 6,
              color: "#ededef",
              fontSize: 14,
              outline: "none",
              fontFamily: "inherit",
              resize: "vertical",
              lineHeight: 1.55,
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={cancelBtnStyle}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            style={{
              ...submitBtnStyle,
              opacity: loading || !content.trim() ? 0.4 : 1,
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
  fontSize: 11,
  fontWeight: 400,
  color: "#6e6e76",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 6,
  color: "#6e6e76",
  fontSize: 13,
  cursor: "pointer",
  transition: "all 0.1s ease",
};

const submitBtnStyle: React.CSSProperties = {
  padding: "6px 16px",
  background: "#ededef",
  border: "none",
  borderRadius: 6,
  color: "#09090b",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  transition: "opacity 0.12s ease",
};
