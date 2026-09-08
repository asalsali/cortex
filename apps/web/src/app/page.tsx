"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { search as apiSearch } from "@/lib/api";
import {
  searchResults as mockResults,
  formatDate,
  getSourceIcon,
  getSourceLabel,
} from "@/data/mock";
import type { SourceType, SearchResult } from "@/data/mock";
import { SkeletonList } from "@/components/Skeleton";
import styles from "./page.module.css";

function getSourceClass(sourceType: SourceType): string {
  switch (sourceType) {
    case "slack": return styles.sourceSlack;
    case "notion": return styles.sourceNotion;
    case "git": return styles.sourceGit;
    case "manual": return styles.sourceManual;
    case "meeting": return styles.sourceMeeting;
    default: return styles.sourceManual;
  }
}

function getConfidenceClass(confidence: number): string {
  if (confidence >= 0.9) return styles.confidenceHigh;
  if (confidence >= 0.8) return styles.confidenceMed;
  return styles.confidenceLow;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsDemo(false);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const data = await apiSearch(q);
      setResults(data);
      setIsDemo(false);
    } catch (err) {
      // Check if it's a network error (API unreachable) vs API error
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error &&
          err.message.includes("fetch") &&
          !err.message.includes("API error"));

      if (isNetworkError) {
        // Fallback: filter mock results client-side
        const lower = q.toLowerCase();
        const filtered = mockResults.filter(
          (r) =>
            r.title.toLowerCase().includes(lower) ||
            r.snippet.toLowerCase().includes(lower),
        );
        setResults(filtered.length > 0 ? filtered : mockResults);
        setIsDemo(true);
      } else {
        // API returned an error -- show empty results
        setResults([]);
        setIsDemo(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search (300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Search</h1>
        <p className={styles.subtitle}>
          Query your company knowledge base across all sources
        </p>
      </div>

      <div className={styles.searchContainer}>
        <span className={styles.searchIcon}>/</span>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="What database does the user service use?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className={styles.searchMeta}>
        <span className={styles.resultCount}>
          {loading ? "Searching..." : `${results.length} results`}
        </span>
        <span className={styles.searchMode}>mode: standard</span>
      </div>

      {loading ? (
        <SkeletonList count={4} lines={2} />
      ) : results.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>
            {hasSearched ? "No results found" : "Start searching"}
          </div>
          <p className={styles.emptyText}>
            {hasSearched
              ? "Try a different query or connect more sources to expand your knowledge base."
              : "Type a question above to search across all your company knowledge."}
          </p>
        </div>
      ) : (
        <div className={styles.results}>
          {results.map((result) => (
            <Link
              key={result.id}
              href={`/entities/${result.entitySlug}`}
              className={styles.resultCard}
            >
              <div className={styles.resultHeader}>
                <span className={styles.resultTitle}>{result.title}</span>
                <span
                  className={
                    result.isCurrent
                      ? styles.badgeCurrent
                      : styles.badgeSuperseded
                  }
                >
                  {result.isCurrent ? "Current" : "Superseded"}
                </span>
              </div>
              <p className={styles.resultSnippet}>{result.snippet}</p>
              <div className={styles.resultMeta}>
                <span className={styles.sourceTag}>
                  <span
                    className={`${styles.sourceIcon} ${getSourceClass(result.sourceType)}`}
                  >
                    {getSourceIcon(result.sourceType)}
                  </span>
                  {getSourceLabel(result.sourceType)}
                </span>
                <span
                  className={`${styles.confidence} ${getConfidenceClass(result.confidence)}`}
                >
                  {Math.round(result.confidence * 100)}%
                </span>
                <span>{formatDate(result.date)}</span>
                <span className={styles.kindTag}>{result.kind}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
