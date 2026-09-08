"use client";

/**
 * Skeleton loaders matching the Cortex dark theme.
 */

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 6,
  style,
}: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background:
          "linear-gradient(90deg, #1c1f2e 25%, #262a3d 50%, #1c1f2e 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite ease-in-out",
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      style={{
        padding: 18,
        background: "#161921",
        border: "1px solid #1e2130",
        borderRadius: 8,
      }}
    >
      <Skeleton width="60%" height={14} style={{ marginBottom: 12 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? "40%" : "100%"}
          height={12}
          style={{ marginBottom: 8 }}
        />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 5, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}
