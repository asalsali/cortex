"use client";

import { useDemoMode } from "@/lib/use-api";

export default function DemoBanner() {
  const isDemo = useDemoMode();
  if (!isDemo) return null;

  return (
    <div
      style={{
        background: "rgba(251,191,36,0.1)",
        border: "1px solid rgba(251,191,36,0.25)",
        borderRadius: 8,
        padding: "10px 16px",
        marginBottom: 20,
        fontSize: 13,
        color: "#fbbf24",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ fontWeight: 600 }}>Demo mode</span>
      <span style={{ color: "#9ca3b4" }}>
        Connect to API for live data. Showing sample data from Meridian.
      </span>
    </div>
  );
}
