"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { getTimeline as apiGetTimeline } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  formatDate,
  getSourceLabel,
} from "@/data/mock";
import type { SourceType, FactKind, TimelineEvent } from "@/data/mock";
import { SkeletonList } from "@/components/Skeleton";
import styles from "./page.module.css";

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

  const ENTITY_FILTERS = Array.from(
    new Set((apiEvents ?? []).map((e) => e.entitySlug)),
  )
    .slice(0, 5)
    .map((slug) => ({
      label: (apiEvents ?? []).find((e) => e.entitySlug === slug)?.entityName ?? slug,
      value: slug,
    }));

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
          How your knowledge has evolved over time
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
        {ENTITY_FILTERS.length > 0 && (
          <>
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
          </>
        )}
      </div>

      {/* Date range */}
      <div className={styles.dateRange}>
        <label className={styles.dateLabel}>From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={styles.dateInput}
        />
        <label className={styles.dateLabel}>To</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={styles.dateInput}
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            className={styles.dateClear}
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonList count={6} />
      ) : grouped.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            No timeline events found. Adjust filters or connect more sources.
          </p>
        </div>
      ) : (
        <div className={styles.timeline}>
          {grouped.map((group) => (
            <div key={group.month} className={styles.monthGroup}>
              <div className={styles.monthLabel}>{group.month}</div>
              <div className={styles.monthEvents}>
                {group.events.map((event, i) => (
                  <div key={event.id} className={styles.event}>
                    <div className={styles.eventTrack}>
                      <div
                        className={styles.eventDot}
                        data-current={!event.supersedes ? "true" : "false"}
                      />
                      {i < group.events.length - 1 && (
                        <div className={styles.eventLine} />
                      )}
                    </div>
                    <div className={styles.eventBody}>
                      <div className={styles.eventDate}>
                        {formatDate(event.date)}
                      </div>
                      <Link
                        href={`/entities/${event.entitySlug}`}
                        className={styles.eventEntity}
                      >
                        {event.entityName}
                      </Link>
                      <div className={styles.eventContent}>
                        {event.content}
                        {event.supersedes && (
                          <span className={styles.supersedes}> (supersedes prior)</span>
                        )}
                      </div>
                      <div className={styles.eventMeta}>
                        <span>{getSourceLabel(event.sourceType)}</span>
                        <span className={styles.metaSep} />
                        <span>{event.sourceAuthor}</span>
                        <span className={styles.metaSep} />
                        <span>{event.kind}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
