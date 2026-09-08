"use client";

import { useDemoMode } from "@/lib/use-api";

export default function DemoBanner() {
  const isDemo = useDemoMode();
  if (!isDemo) return null;

  return (
    <div
      style={{
        padding: "6px 0",
        marginBottom: 24,
        fontSize: 12,
        color: "#6e6e76",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-mono)",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "#e5a94e",
          flexShrink: 0,
        }}
      />
      <span>Demo mode -- connect to API for live data</span>
    </div>
  );
}
