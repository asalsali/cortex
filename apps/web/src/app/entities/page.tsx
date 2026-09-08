"use client";

import Link from "next/link";
import { useState } from "react";
import { getEntities } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  formatDate,
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
  const { data: entities, loading } = useApi(getEntities, []);
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
          {filtered ? filtered.length : ""}
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
        <SkeletonList count={6} lines={1} />
      ) : !filtered || filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            No entities found. Connect a source to create entities.
          </p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Type</th>
              <th className={styles.thRight}>Facts</th>
              <th className={styles.thRight}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entity) => (
              <tr key={entity.slug} className={styles.tr}>
                <td className={styles.td}>
                  <Link href={`/entities/${entity.slug}`} className={styles.entityLink}>
                    {entity.name}
                  </Link>
                </td>
                <td className={styles.td}>
                  <span className={styles.typeLabel}>{entity.type}</span>
                </td>
                <td className={styles.tdRight}>
                  <span className={styles.factCount}>{entity.currentFactCount}</span>
                </td>
                <td className={styles.tdRight}>
                  <span className={styles.date}>{formatDate(entity.lastUpdated)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
