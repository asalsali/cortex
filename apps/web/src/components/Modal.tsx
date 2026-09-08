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

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.75)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  animation: "fadeIn 0.12s ease-out",
};

const dialogStyle: React.CSSProperties = {
  background: "#0c0c0e",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 8,
  width: "100%",
  maxWidth: 460,
  maxHeight: "80vh",
  overflow: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 20px",
  borderBottom: "1px solid rgba(255,255,255,0.03)",
};

const titleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: "#ededef",
  margin: 0,
  letterSpacing: "-0.01em",
};

const closeStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#45454d",
  fontSize: 18,
  cursor: "pointer",
  lineHeight: 1,
  padding: "0 4px",
  transition: "color 0.1s ease",
};

const bodyStyle: React.CSSProperties = {
  padding: 20,
};
