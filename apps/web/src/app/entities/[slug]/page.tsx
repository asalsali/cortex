"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getEntity as apiGetEntity, getFacts as apiGetFacts } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  formatDate,
  getSourceLabel,
} from "@/data/mock";
import type { SourceType, Fact } from "@/data/mock";
import { SkeletonList } from "@/components/Skeleton";
import AddFactModal from "@/components/AddFactModal";
import styles from "./page.module.css";

export default function EntityPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [addFactOpen, setAddFactOpen] = useState(false);

  const {
    data: entityCard,
    loading: entityLoading,
    refetch: refetchEntity,
  } = useApi(
    useCallback(() => apiGetEntity(slug), [slug]),
    null,
    [slug],
  );

  const {
    data: facts,
    loading: factsLoading,
    refetch: refetchFacts,
  } = useApi(
    useCallback(() => apiGetFacts(slug), [slug]),
    [],
    [slug],
  );

  const loading = entityLoading && factsLoading;

  if (!loading && !entityCard) {
    return (
      <div className={styles.page}>
        <Link href="/entities" className={styles.backLink}>
          Back to Entities
        </Link>
        <div className={styles.notFound}>
          <p>Entity &quot;{slug}&quot; not found.</p>
        </div>
      </div>
    );
  }

  const displayName = entityCard?.name ?? slug;
  const displayType = entityCard?.type ?? "system";
  const displayTruth = entityCard?.compiledTruth ?? "";
  const displayRelated = entityCard?.relatedEntities ?? [];

  const allFacts: Fact[] = facts ?? [];
  const currentFacts = allFacts.filter((f) => f.isCurrent);
  const supersededFacts = allFacts.filter((f) => !f.isCurrent);

  const entityTimeline = allFacts
    .map((f) => ({
      id: f.id,
      date: f.validFrom,
      content: f.content,
      sourceType: f.sourceType,
      sourceAuthor: f.sourceAuthor,
      supersedes: f.supersededBy,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const relatedEntities = displayRelated.map((s) => ({
    slug: s,
    name: s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }));

  return (
    <div className={styles.page}>
      <Link href="/entities" className={styles.backLink}>
        Back to Entities
      </Link>

      {loading ? (
        <SkeletonList count={3} />
      ) : (
        <>
          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.name}>{displayName}</h1>
            <div className={styles.headerMeta}>
              <span className={styles.typeLabel}>{displayType}</span>
              <span className={styles.metaSep} />
              <span>
                {allFacts.length} facts ({currentFacts.length} current)
              </span>
            </div>
          </div>

          {/* Compiled Truth */}
          {displayTruth && (
            <div className={styles.section}>
              <div className={styles.truthBlock}>
                {displayTruth}
              </div>
            </div>
          )}

          {/* Current Facts */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Current Facts</h2>
              <button
                onClick={() => setAddFactOpen(true)}
                className={styles.addFactBtn}
              >
                Add Fact
              </button>
            </div>
            {currentFacts.length === 0 ? (
              <p className={styles.emptyText}>
                No facts yet. Connect a source or add knowledge manually.
              </p>
            ) : (
              <div className={styles.factsList}>
                {currentFacts.map((fact) => (
                  <div key={fact.id} className={styles.factItem}>
                    <span className={styles.factDotCurrent} />
                    <div className={styles.factContent}>
                      <div className={styles.factText}>{fact.content}</div>
                      <div className={styles.factMeta}>
                        <span>{getSourceLabel(fact.sourceType)}</span>
                        <span className={styles.metaSep} />
                        <span>{fact.sourceAuthor}</span>
                        <span className={styles.metaSep} />
                        <span>{formatDate(fact.validFrom)}</span>
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
              <h2 className={styles.sectionTitle}>Superseded</h2>
              <div className={styles.factsList}>
                {supersededFacts.map((fact) => (
                  <div key={fact.id} className={styles.factItemSuperseded}>
                    <span className={styles.factDotSuperseded} />
                    <div className={styles.factContent}>
                      <div className={styles.factText}>{fact.content}</div>
                      <div className={styles.factMeta}>
                        <span>{getSourceLabel(fact.sourceType)}</span>
                        <span className={styles.metaSep} />
                        <span>{fact.sourceAuthor}</span>
                        <span className={styles.metaSep} />
                        <span>
                          {formatDate(fact.validFrom)}
                          {fact.validUntil && ` \u2013 ${formatDate(fact.validUntil)}`}
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
          {relatedEntities.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Related</h2>
              <div className={styles.relatedList}>
                {relatedEntities.map((rel) => (
                  <Link
                    key={rel.slug}
                    href={`/entities/${rel.slug}`}
                    className={styles.relatedLink}
                  >
                    {rel.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {entityTimeline.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Timeline</h2>
              <div className={styles.timeline}>
                {entityTimeline.map((event, i) => (
                  <div key={event.id} className={styles.timelineItem}>
                    <div className={styles.timelineTrack}>
                      <div className={styles.timelineDot} />
                      {i < entityTimeline.length - 1 && (
                        <div className={styles.timelineLine} />
                      )}
                    </div>
                    <div className={styles.timelineBody}>
                      <div className={styles.timelineDate}>
                        {formatDate(event.date)}
                      </div>
                      <div className={styles.timelineContent}>
                        {event.content}
                      </div>
                      <div className={styles.timelineSource}>
                        {getSourceLabel(event.sourceType)} &middot;{" "}
                        {event.sourceAuthor}
                      </div>
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
