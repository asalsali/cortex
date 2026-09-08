"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { search as apiSearch } from "@/lib/api";
import {
  searchResults as mockResults,
  formatDate,
  getSourceLabel,
} from "@/data/mock";
import type { SourceType, SearchResult } from "@/data/mock";
import { SkeletonList } from "@/components/Skeleton";
import styles from "./page.module.css";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error &&
          err.message.includes("fetch") &&
          !err.message.includes("API error"));

      if (isNetworkError) {
        const lower = q.toLowerCase();
        const filtered = mockResults.filter(
          (r) =>
            r.title.toLowerCase().includes(lower) ||
            r.snippet.toLowerCase().includes(lower),
        );
        setResults(filtered.length > 0 ? filtered : mockResults);
        setIsDemo(true);
      } else {
        setResults([]);
        setIsDemo(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // Focus search on / key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.searchContainer}>
        <input
          ref={inputRef}
          type="text"
          className={styles.searchInput}
          placeholder="Search your knowledge base..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <kbd className={styles.searchKbd}>/</kbd>
      </div>

      {(hasSearched || loading) && (
        <div className={styles.searchMeta}>
          <span className={styles.resultCount}>
            {loading ? "..." : `${results.length} results`}
          </span>
        </div>
      )}

      {loading ? (
        <SkeletonList count={4} lines={2} />
      ) : results.length === 0 && !hasSearched ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            Type to search across all company knowledge.
          </p>
        </div>
      ) : results.length === 0 && hasSearched ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            No results found.
          </p>
        </div>
      ) : (
        <div className={styles.results}>
          {results.map((result) => (
            <Link
              key={result.id}
              href={`/entities/${result.entitySlug}`}
              className={styles.resultRow}
            >
              <div className={styles.resultMain}>
                <span className={styles.resultTitle}>{result.title}</span>
                {result.isCurrent ? (
                  <span className={styles.dotCurrent} />
                ) : (
                  <span className={styles.dotSuperseded} />
                )}
              </div>
              <p className={styles.resultSnippet}>{result.snippet}</p>
              <div className={styles.resultMeta}>
                <span>{getSourceLabel(result.sourceType)}</span>
                <span className={styles.metaSep} />
                <span>{formatDate(result.date)}</span>
                <span className={styles.metaSep} />
                <span>{result.kind}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
