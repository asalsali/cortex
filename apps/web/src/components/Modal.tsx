"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      style={overlayStyle}
    >
      <div style={dialogStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>{title}</h2>
          <button onClick={onClose} style={closeStyle}>
            &times;
          </button>
        </div>
        <div style={bodyStyle}>{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  background: "#161921",
  border: "1px solid #2a2d3e",
  borderRadius: 12,
  width: "100%",
  maxWidth: 520,
  maxHeight: "80vh",
  overflow: "auto",
  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderBottom: "1px solid #2a2d3e",
};

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: "#e8eaed",
  margin: 0,
};

const closeStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#6b7280",
  fontSize: 22,
  cursor: "pointer",
  lineHeight: 1,
  padding: "0 4px",
};

const bodyStyle: React.CSSProperties = {
  padding: 20,
};
