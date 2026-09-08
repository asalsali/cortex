"use client";

import Link from "next/link";
import { useState } from "react";
import { getEntities } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  entities as mockEntities,
  formatDate,
  getEntityTypeColor,
  getVelocityColor,
} from "@/data/mock";
import type { EntityType } from "@/data/mock";
import { SkeletonList } from "@/components/Skeleton";
import styles from "./page.module.css";

const FILTERS: { label: string; value: EntityType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Systems", value: "system" },
  { label: "People", value: "person" },
  { label: "Projects", value: "project" },
  { label: "Decisions", value: "decision" },
];

export default function EntitiesPage() {
  const { data: entities, loading } = useApi(getEntities, mockEntities);
  const [filter, setFilter] = useState<EntityType | "all">("all");

  const filtered =
    entities && filter !== "all"
      ? entities.filter((e) => e.type === filter)
      : entities;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Entities</h1>
        <span className={styles.count}>
          {filtered ? `${filtered.length} entities` : "..."}
        </span>
      </div>

      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={filter === f.value ? styles.filterBtnActive : styles.filterBtn}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={6} lines={2} />
      ) : !filtered || filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#9ca3b4" }}>
            No entities found
          </div>
          <p>Connect a source or add knowledge to create entities.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((entity) => (
            <Link
              key={entity.slug}
              href={`/entities/${entity.slug}`}
              className={styles.card}
            >
              <div className={styles.cardHeader}>
                <span className={styles.cardName}>{entity.name}</span>
                <span
                  className={styles.typeBadge}
                  style={{
                    background: `${getEntityTypeColor(entity.type)}18`,
                    color: getEntityTypeColor(entity.type),
                    border: `1px solid ${getEntityTypeColor(entity.type)}30`,
                  }}
                >
                  {entity.type}
                </span>
              </div>
              <p className={styles.cardTruth}>{entity.compiledTruth}</p>
              <div className={styles.cardFooter}>
                <span>{entity.currentFactCount} facts</span>
                <span>{formatDate(entity.lastUpdated)}</span>
                <span>
                  <span
                    className={styles.velocityDot}
                    style={{ background: getVelocityColor(entity.velocity) }}
                  />
                  {entity.velocity}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
