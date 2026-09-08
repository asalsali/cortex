"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { getTimeline as apiGetTimeline } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  formatDate,
  getEntityTypeColor,
  getSourceIcon,
  getSourceLabel,
} from "@/data/mock";
import type { SourceType, FactKind, TimelineEvent } from "@/data/mock";
import { SkeletonList } from "@/components/Skeleton";
import styles from "./page.module.css";

function sourceIconStyle(sourceType: SourceType): React.CSSProperties {
  const colors: Record<string, string> = {
    slack: "rgba(224,30,90,0.15)",
    notion: "rgba(232,234,237,0.1)",
    git: "rgba(240,136,62,0.15)",
    manual: "rgba(124,92,252,0.15)",
    meeting: "rgba(52,211,153,0.15)",
  };
  const fg: Record<string, string> = {
    slack: "#e01e5a",
    notion: "#e8eaed",
    git: "#f0883e",
    manual: "#7c5cfc",
    meeting: "#34d399",
  };
  return {
    background: colors[sourceType] || colors.manual,
    color: fg[sourceType] || fg.manual,
  };
}

function groupByMonth(
  events: TimelineEvent[],
): { month: string; events: TimelineEvent[] }[] {
  const sorted = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const groups: Map<string, TimelineEvent[]> = new Map();
  for (const event of sorted) {
    const d = new Date(event.date);
    const label = d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(event);
  }

  return Array.from(groups.entries()).map(([month, events]) => ({
    month,
    events,
  }));
}

const KIND_FILTERS: { label: string; value: FactKind | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Architecture", value: "architecture" },
  { label: "Decisions", value: "decision" },
  { label: "Events", value: "event" },
  { label: "Process", value: "process" },
];

// Entity filters are computed dynamically from loaded data (see component body)

export default function TimelinePage() {
  const [kindFilter, setKindFilter] = useState<FactKind | "all">("all");
  const [entityFilter, setEntityFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: apiEvents, loading } = useApi(
    useCallback(
      () =>
        apiGetTimeline(
          entityFilter ?? undefined,
          {
            kind: kindFilter !== "all" ? kindFilter : undefined,
            from: dateFrom || undefined,
            to: dateTo || undefined,
          },
        ),
      [entityFilter, kindFilter, dateFrom, dateTo],
    ),
    [],
    [entityFilter, kindFilter, dateFrom, dateTo],
  );

  // Compute entity filters from loaded data
  const ENTITY_FILTERS = Array.from(
    new Set((apiEvents ?? []).map((e) => e.entitySlug)),
  )
    .slice(0, 5)
    .map((slug) => ({
      label: (apiEvents ?? []).find((e) => e.entitySlug === slug)?.entityName ?? slug,
      value: slug,
    }));

  // Apply client-side filters to the data (covers both mock and real data)
  const filtered = (apiEvents ?? []).filter((event) => {
    if (kindFilter !== "all" && event.kind !== kindFilter) return false;
    if (entityFilter && event.entitySlug !== entityFilter) return false;
    if (dateFrom && new Date(event.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(event.date) > new Date(dateTo)) return false;
    return true;
  });

  const grouped = groupByMonth(filtered);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Timeline</h1>
        <p className={styles.subtitle}>
          How your company&apos;s knowledge has evolved over time
        </p>
      </div>

      <div className={styles.filterBar}>
        {KIND_FILTERS.map((f) => (
          <button
            key={f.value}
            className={kindFilter === f.value ? styles.filterBtnActive : styles.filterBtn}
            onClick={() => setKindFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
        <div className={styles.filterSep} />
        {ENTITY_FILTERS.map((f) => (
          <button
            key={f.value}
            className={entityFilter === f.value ? styles.filterBtnActive : styles.filterBtn}
            onClick={() =>
              setEntityFilter(entityFilter === f.value ? null : f.value)
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Date range filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <label style={{ fontSize: 12, color: "#6b7280" }}>From:</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          style={dateInputStyle}
        />
        <label style={{ fontSize: 12, color: "#6b7280" }}>To:</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          style={dateInputStyle}
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            style={{
              padding: "4px 10px",
              background: "transparent",
              border: "1px solid #2a2d3e",
              borderRadius: 6,
              color: "#9ca3b4",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonList count={6} />
      ) : grouped.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#9ca3b4" }}>
            No timeline events found
          </div>
          <p>Adjust filters or connect more sources.</p>
        </div>
      ) : (
        <div className={styles.timeline}>
          {grouped.map((group) => (
            <div key={group.month} className={styles.monthGroup}>
              <div className={styles.monthLabel}>{group.month}</div>
              {group.events.map((event) => {
                const typeColor = getEntityTypeColor(event.entityType);
                return (
                  <Link
                    key={event.id}
                    href={`/entities/${event.entitySlug}`}
                    className={styles.event}
                  >
                    <div
                      className={styles.eventDot}
                      style={{ background: typeColor }}
                    />
                    <div className={styles.eventTop}>
                      <span className={styles.eventDate}>
                        {formatDate(event.date)}
                      </span>
                      <span className={styles.eventEntity}>
                        {event.entityName}
                      </span>
                      <span
                        className={styles.eventEntityType}
                        style={{
                          background: `${typeColor}18`,
                          color: typeColor,
                        }}
                      >
                        {event.entityType}
                      </span>
                    </div>
                    <div className={styles.eventContent}>
                      {event.content}
                      {event.supersedes && (
                        <span className={styles.supersedes}>
                          {" "}
                          &rarr; supersedes prior
                        </span>
                      )}
                    </div>
                    <div className={styles.eventMeta}>
                      <span
                        className={styles.sourceIcon}
                        style={sourceIconStyle(event.sourceType)}
                      >
                        {getSourceIcon(event.sourceType)}
                      </span>
                      <span>{getSourceLabel(event.sourceType)}</span>
                      <span>{event.sourceAuthor}</span>
                      <span className={styles.kindTag}>{event.kind}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const dateInputStyle: React.CSSProperties = {
  padding: "5px 10px",
  background: "#161921",
  border: "1px solid #2a2d3e",
  borderRadius: 6,
  color: "#e8eaed",
  fontSize: 12,
  fontFamily: "var(--font-mono)",
  outline: "none",
  colorScheme: "dark",
};
