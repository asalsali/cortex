"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getEntity as apiGetEntity, getFacts as apiGetFacts } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  getEntity as mockGetEntity,
  getEntityFacts as mockGetEntityFacts,
  entities as allEntities,
  timelineEvents as mockTimeline,
  formatDate,
  getEntityTypeColor,
  getSourceIcon,
  getSourceLabel,
  getVelocityColor,
} from "@/data/mock";
import type { SourceType, Fact } from "@/data/mock";
import { SkeletonList } from "@/components/Skeleton";
import AddFactModal from "@/components/AddFactModal";
import styles from "./page.module.css";

function sourceIconClass(sourceType: SourceType): React.CSSProperties {
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

export default function EntityPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [addFactOpen, setAddFactOpen] = useState(false);

  const mockEntity = mockGetEntity(slug);
  const mockFacts = mockGetEntityFacts(slug);

  const {
    data: entityCard,
    loading: entityLoading,
    refetch: refetchEntity,
  } = useApi(
    useCallback(() => apiGetEntity(slug), [slug]),
    mockEntity
      ? {
          slug: mockEntity.slug,
          name: mockEntity.name,
          type: mockEntity.type,
          compiledTruth: mockEntity.compiledTruth,
          currentFacts: [],
          timeline: [],
          relatedEntities: mockEntity.relatedEntities,
        }
      : null,
    [slug],
  );

  const {
    data: facts,
    loading: factsLoading,
    refetch: refetchFacts,
  } = useApi(
    useCallback(() => apiGetFacts(slug), [slug]),
    mockFacts,
    [slug],
  );

  const entity = mockEntity; // for fallback display data
  const loading = entityLoading && factsLoading;

  if (!entity && !entityCard) {
    return (
      <div className={styles.page}>
        <Link href="/entities" className={styles.backLink}>
          &larr; Back to Entities
        </Link>
        <div className={styles.notFound}>
          <div className={styles.notFoundTitle}>Entity not found</div>
          <p>No entity matches &quot;{slug}&quot;</p>
        </div>
      </div>
    );
  }

  const displayName = entityCard?.name ?? entity?.name ?? slug;
  const displayType = entityCard?.type ?? entity?.type ?? "system";
  const displayTruth = entityCard?.compiledTruth ?? entity?.compiledTruth ?? "";
  const displayRelated = entityCard?.relatedEntities ?? entity?.relatedEntities ?? [];

  const allFacts: Fact[] = facts ?? [];
  const currentFacts = allFacts.filter((f) => f.isCurrent);
  const supersededFacts = allFacts.filter((f) => !f.isCurrent);

  const entityTimeline = mockTimeline
    .filter((e) => e.entitySlug === slug)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const relatedEntities = displayRelated
    .map((s) => allEntities.find((e) => e.slug === s))
    .filter(Boolean);

  const typeColor = getEntityTypeColor(displayType as "system" | "person" | "project" | "decision" | "concept");

  return (
    <div className={styles.page}>
      <Link href="/entities" className={styles.backLink}>
        &larr; Back to Entities
      </Link>

      {loading ? (
        <SkeletonList count={3} />
      ) : (
        <>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerRow}>
              <h1 className={styles.name}>{displayName}</h1>
              <span
                className={styles.typeBadge}
                style={{
                  background: `${typeColor}18`,
                  color: typeColor,
                  border: `1px solid ${typeColor}30`,
                }}
              >
                {displayType}
              </span>
            </div>
            <div className={styles.headerMeta}>
              <span>
                {allFacts.length} facts ({currentFacts.length} current,{" "}
                {supersededFacts.length} superseded)
              </span>
              {entity && <span>Updated {formatDate(entity.lastUpdated)}</span>}
              {entity && (
                <span style={{ color: getVelocityColor(entity.velocity) }}>
                  {entity.velocity}
                </span>
              )}
            </div>
          </div>

          {/* Compiled Truth */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionTitleIcon}>*</span>
              Compiled Truth
            </h2>
            <div className={styles.truthCard}>{displayTruth}</div>
          </div>

          {/* Current Facts */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionTitleIcon}>+</span>
              Current Facts
              <button
                onClick={() => setAddFactOpen(true)}
                style={{
                  marginLeft: "auto",
                  padding: "4px 12px",
                  background: "rgba(124,92,252,0.15)",
                  border: "1px solid rgba(124,92,252,0.3)",
                  borderRadius: 16,
                  color: "#7c5cfc",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Add Fact
              </button>
            </h2>
            {currentFacts.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "#6b7280",
                  background: "#161921",
                  border: "1px solid #1e2130",
                  borderRadius: 8,
                }}
              >
                <p style={{ marginBottom: 8, color: "#9ca3b4" }}>
                  No facts yet for this entity.
                </p>
                <p>Connect a source or add knowledge manually.</p>
              </div>
            ) : (
              <div className={styles.factsList}>
                {currentFacts.map((fact) => (
                  <div key={fact.id} className={styles.factItem}>
                    <div className={styles.factDotCurrent} />
                    <div className={styles.factContent}>
                      <div className={styles.factText}>{fact.content}</div>
                      <div className={styles.factMeta}>
                        <span
                          className={styles.sourceIcon}
                          style={sourceIconClass(fact.sourceType)}
                        >
                          {getSourceIcon(fact.sourceType)}
                        </span>
                        <span>{getSourceLabel(fact.sourceType)}</span>
                        <span>{fact.sourceAuthor}</span>
                        <span>{formatDate(fact.validFrom)}</span>
                        <span>{Math.round(fact.confidence * 100)}%</span>
                        <span className={styles.factBadgeCurrent}>current</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Superseded Facts */}
          {supersededFacts.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionTitleIcon}>~</span>
                Superseded Facts
              </h2>
              <div className={styles.factsList}>
                {supersededFacts.map((fact) => (
                  <div key={fact.id} className={styles.factSuperseded}>
                    <div className={styles.factDotSuperseded} />
                    <div className={styles.factContent}>
                      <div className={styles.factText}>{fact.content}</div>
                      <div className={styles.factMeta}>
                        <span
                          className={styles.sourceIcon}
                          style={sourceIconClass(fact.sourceType)}
                        >
                          {getSourceIcon(fact.sourceType)}
                        </span>
                        <span>{getSourceLabel(fact.sourceType)}</span>
                        <span>{fact.sourceAuthor}</span>
                        <span>
                          {formatDate(fact.validFrom)} &ndash;{" "}
                          {fact.validUntil
                            ? formatDate(fact.validUntil)
                            : "now"}
                        </span>
                        <span className={styles.factBadgeSuperseded}>
                          superseded
                        </span>
                      </div>
                      {fact.supersessionReason && (
                        <div className={styles.supersessionNote}>
                          {fact.supersessionReason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Entities */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionTitleIcon}>-&gt;</span>
              Related Entities
            </h2>
            {relatedEntities.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>
                No related entities found.
              </p>
            ) : (
              <div className={styles.chips}>
                {relatedEntities.map((rel) =>
                  rel ? (
                    <Link
                      key={rel.slug}
                      href={`/entities/${rel.slug}`}
                      className={styles.chip}
                    >
                      <span
                        style={{
                          color: getEntityTypeColor(rel.type),
                          marginRight: 4,
                          fontSize: 10,
                        }}
                      >
                        {rel.type[0].toUpperCase()}
                      </span>
                      {rel.name}
                    </Link>
                  ) : null,
                )}
              </div>
            )}
          </div>

          {/* Timeline */}
          {entityTimeline.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionTitleIcon}>|</span>
                Timeline
              </h2>
              <div className={styles.timeline}>
                {entityTimeline.map((event) => (
                  <div key={event.id} className={styles.timelineItem}>
                    <div className={styles.timelineDot} />
                    <div className={styles.timelineDate}>
                      {formatDate(event.date)}
                    </div>
                    <div className={styles.timelineContent}>
                      {event.content}
                      {event.supersedes && (
                        <span className={styles.timelineArrow}>
                          {" "}
                          &rarr; supersedes
                        </span>
                      )}
                    </div>
                    <div className={styles.timelineSource}>
                      {getSourceLabel(event.sourceType)} &middot;{" "}
                      {event.sourceAuthor}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AddFactModal
        open={addFactOpen}
        onClose={() => setAddFactOpen(false)}
        entitySlug={slug}
        onFactCreated={() => {
          refetchFacts();
          refetchEntity();
        }}
      />
    </div>
  );
}
