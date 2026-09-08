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
                  ? "var(--status-current, #3fcf6b)"
                  : item.type === "error"
                    ? "var(--status-error, #e5564e)"
                    : "var(--status-active, #5b9cf5)",
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
// Styles
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 20,
  right: 20,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  zIndex: 9999,
  pointerEvents: "none",
};

const toastStyle: React.CSSProperties = {
  padding: "10px 16px",
  background: "#111113",
  border: "1px solid rgba(255,255,255,0.06)",
  borderLeft: "2px solid #3fcf6b",
  borderRadius: 6,
  color: "#ededef",
  fontSize: 13,
  boxShadow: "0 4px 20px rgba(0,0,0,0.55)",
  pointerEvents: "auto",
  animation: "slideIn 0.15s ease-out",
};
