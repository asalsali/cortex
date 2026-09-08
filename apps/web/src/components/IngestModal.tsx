"use client";

import { useState } from "react";
import Modal from "./Modal";
import { ingest } from "@/lib/api";
import { useToast } from "./Toast";

interface IngestModalProps {
  open: boolean;
  onClose: () => void;
}

export default function IngestModal({ open, onClose }: IngestModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await ingest(content, title || undefined);
      toast("Knowledge ingested successfully");
      setTitle("");
      setContent("");
      onClose();
    } catch {
      toast("Failed to ingest knowledge", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Knowledge">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. API Gateway Architecture"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste markdown, meeting notes, or any knowledge..."
            rows={10}
            style={{ ...inputStyle, resize: "vertical", minHeight: 160, lineHeight: 1.55 }}
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
            {loading ? "Ingesting..." : "Add Knowledge"}
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#09090b",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 6,
  color: "#ededef",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
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
