"use client";

import { useCallback } from "react";
import { getDreamRuns } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/data/mock";
import { SkeletonList } from "@/components/Skeleton";
import styles from "./page.module.css";

function parseDuration(dur: string): number {
  const match = dur.match(/(\d+)m\s*(\d+)s/);
  if (!match) return 0;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

export default function DreamPage() {
  const { data: dreamRuns, loading } = useApi(
    useCallback(() => getDreamRuns(), []),
    [],
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Dream Cycle</h1>
          <p className={styles.subtitle}>
            Overnight consolidation that keeps your knowledge base coherent
          </p>
        </div>
        <SkeletonList count={3} />
      </div>
    );
  }

  if (!dreamRuns || dreamRuns.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Dream Cycle</h1>
          <p className={styles.subtitle}>
            Overnight consolidation that keeps your knowledge base coherent
          </p>
        </div>
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            No dream cycles yet. Connect sources and the first cycle will run automatically.
          </p>
        </div>
      </div>
    );
  }

  const latest = dreamRuns[0];
  const history = dreamRuns.slice(1);

  const maxPhaseDuration = Math.max(
    ...latest.phases.map((p) => parseDuration(p.duration)),
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dream Cycle</h1>
        <p className={styles.subtitle}>
          Overnight consolidation that keeps your knowledge base coherent
        </p>
      </div>

      {/* Latest Run */}
      <div className={styles.latestRun}>
        <div className={styles.latestLabel}>Latest Run</div>
        <div className={styles.latestStats}>
          <div className={styles.stat}>
            <div className={styles.statValue}>{latest.factsCreated}</div>
            <div className={styles.statLabel}>created</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{latest.factsSuperseded}</div>
            <div className={styles.statLabel}>superseded</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{latest.edgesCreated}</div>
            <div className={styles.statLabel}>edges</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{latest.entitiesUpdated}</div>
            <div className={styles.statLabel}>entities</div>
          </div>
        </div>
        <div className={styles.latestMeta}>
          <span>{formatDate(latest.startedAt)}</span>
          <span className={styles.metaSep} />
          <span>{latest.duration}</span>
        </div>
      </div>

      {/* Phase Breakdown */}
      <div className={styles.sectionTitle}>Phases</div>
      <div className={styles.phases}>
        {latest.phases.map((phase) => {
          const secs = parseDuration(phase.duration);
          const pct =
            maxPhaseDuration > 0 ? (secs / maxPhaseDuration) * 100 : 0;
          return (
            <div key={phase.name} className={styles.phaseRow}>
              <span className={styles.phaseName}>{phase.name}</span>
              <div className={styles.phaseBar}>
                <div
                  className={styles.phaseBarFill}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={styles.phaseDuration}>{phase.duration}</span>
              <span className={styles.phaseItems}>{phase.items}</span>
            </div>
          );
        })}
      </div>

      {/* History */}
      {history.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Previous Runs</div>
          <div className={styles.history}>
            {history.map((run) => (
              <div key={run.id} className={styles.historyRow}>
                <span className={styles.historyDate}>
                  {formatDate(run.startedAt)}
                </span>
                <div className={styles.historyStats}>
                  <span>
                    <span className={styles.historyStatGreen}>
                      +{run.factsCreated}
                    </span>{" "}
                    facts
                  </span>
                  {run.factsSuperseded > 0 && (
                    <span>
                      <span className={styles.historyStatAmber}>
                        -{run.factsSuperseded}
                      </span>{" "}
                      superseded
                    </span>
                  )}
                  <span>{run.edgesCreated} edges</span>
                </div>
                <span className={styles.historyDuration}>{run.duration}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
