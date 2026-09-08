"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: ToastItem["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export const useToast = () => useContext(ToastContext);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback(
    (message: string, type: ToastItem["type"] = "success") => {
      const id = ++nextId;
      setItems((prev) => [...prev, { id, message, type }]);
    },
    [],
  );

  // Auto-dismiss after 3s
  useEffect(() => {
    if (items.length === 0) return;
    const timer = setTimeout(() => {
      setItems((prev) => prev.slice(1));
    }, 3000);
    return () => clearTimeout(timer);
  }, [items]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={containerStyle}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              ...toastStyle,
              borderLeftColor:
                item.type === "success"
                  ? "#34d399"
                  : item.type === "error"
                    ? "#ef4444"
                    : "#60a5fa",
            }}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Styles (inline to avoid extra CSS modules)
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 24,
  right: 24,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  zIndex: 9999,
  pointerEvents: "none",
};

const toastStyle: React.CSSProperties = {
  padding: "12px 20px",
  background: "#222539",
  border: "1px solid #2a2d3e",
  borderLeft: "3px solid #34d399",
  borderRadius: 8,
  color: "#e8eaed",
  fontSize: 13,
  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  pointerEvents: "auto",
  animation: "slideIn 0.2s ease-out",
};
