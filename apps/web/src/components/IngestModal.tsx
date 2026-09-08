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
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
          <label style={labelStyle}>Content (Markdown)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste markdown, meeting notes, or any knowledge..."
            rows={10}
            style={{ ...inputStyle, resize: "vertical", minHeight: 160 }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={cancelBtnStyle}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            style={{
              ...submitBtnStyle,
              opacity: loading || !content.trim() ? 0.5 : 1,
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
  fontSize: 12,
  fontWeight: 550,
  color: "#9ca3b4",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#0f1117",
  border: "1px solid #2a2d3e",
  borderRadius: 8,
  color: "#e8eaed",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  background: "transparent",
  border: "1px solid #2a2d3e",
  borderRadius: 8,
  color: "#9ca3b4",
  fontSize: 13,
  cursor: "pointer",
};

const submitBtnStyle: React.CSSProperties = {
  padding: "8px 20px",
  background: "#7c5cfc",
  border: "none",
  borderRadius: 8,
  color: "white",
  fontSize: 13,
  fontWeight: 550,
  cursor: "pointer",
};
