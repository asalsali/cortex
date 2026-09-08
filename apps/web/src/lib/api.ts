// Cortex API Client
// Typed functions for every endpoint, with Clerk auth token injection

import type {
  Entity,
  Fact,
  SearchResult,
  TimelineEvent,
  Integration,
  DreamRun,
  SourceType,
  FactKind,
} from "@/data/mock";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ---------------------------------------------------------------------------
// Types specific to API responses
// ---------------------------------------------------------------------------

export interface DeltaResponse {
  factsCreated: Fact[];
  factsSuperseded: Fact[];
  entitiesUpdated: string[];
  pagesCreated: { id: string; slug: string; title: string }[];
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  type: string;
  compiledTruth?: string;
  rawContent?: string;
  sourceType?: string;
  sourceRef?: string;
  createdAt: string;
}

export interface EntityCard {
  slug: string;
  name: string;
  type: string;
  compiledTruth: string;
  currentFacts: Fact[];
  timeline: TimelineEvent[];
  relatedEntities: string[];
  gaps?: string[];
}

export interface TenantSettings {
  workspaceName: string;
  plan: string;
  dreamCycleSchedule: string;
  defaultSearchMode: string;
  timezone: string;
}

export interface CreateFactData {
  entitySlug: string;
  content: string;
  kind: FactKind;
  confidence?: number;
  sourceType?: SourceType;
  sourceRef?: string;
  validFrom?: string;
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Auth token helper
// ---------------------------------------------------------------------------

async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  // Dynamic import to avoid SSR issues when Clerk is not configured
  try {
    // Access the global Clerk object (injected by ClerkProvider)
    const win = window as unknown as Record<string, unknown>;
    const clerkInstance = win.Clerk as
      | { session?: { getToken: () => Promise<string | null> } }
      | undefined;

    if (clerkInstance?.session) {
      return await clerkInstance.session.getToken();
    }
  } catch {
    // Clerk not configured -- dev mode
  }

  return null;
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}/api/v1${path}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    throw new ApiError(
      res.status,
      `API error ${res.status}: ${res.statusText}`,
      body,
    );
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/** POST /api/v1/search */
export async function search(
  query: string,
  mode?: "quick" | "standard" | "deep",
): Promise<SearchResult[]> {
  const res = await apiFetch<{ results: SearchResult[] }>("/search", {
    method: "POST",
    body: JSON.stringify({ query, mode }),
  });
  return res.results;
}

/** GET /api/v1/entities */
export async function getEntities(): Promise<Entity[]> {
  return apiFetch<Entity[]>("/entities");
}

/** GET /api/v1/entities/:slug */
export async function getEntity(slug: string): Promise<EntityCard> {
  return apiFetch<EntityCard>(`/entities/${encodeURIComponent(slug)}`);
}

/** GET /api/v1/facts/:slug */
export async function getFacts(entitySlug: string): Promise<Fact[]> {
  return apiFetch<Fact[]>(`/facts/${encodeURIComponent(entitySlug)}`);
}

/** POST /api/v1/facts */
export async function createFact(data: CreateFactData): Promise<Fact> {
  return apiFetch<Fact>("/facts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** GET /api/v1/timeline with optional filters */
export async function getTimeline(
  entitySlug?: string,
  filters?: { kind?: string; from?: string; to?: string },
): Promise<TimelineEvent[]> {
  const params = new URLSearchParams();
  if (entitySlug) params.set("entity", entitySlug);
  if (filters?.kind) params.set("kind", filters.kind);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);

  const qs = params.toString();
  return apiFetch<TimelineEvent[]>(`/timeline${qs ? `?${qs}` : ""}`);
}

/** GET /api/v1/delta?since=... */
export async function getDelta(since: string): Promise<DeltaResponse> {
  return apiFetch<DeltaResponse>(
    `/delta?since=${encodeURIComponent(since)}`,
  );
}

/** GET /api/v1/dream-runs */
export async function getDreamRuns(): Promise<DreamRun[]> {
  return apiFetch<DreamRun[]>("/dream-runs");
}

/** GET /api/v1/integrations */
export async function getIntegrations(): Promise<Integration[]> {
  return apiFetch<Integration[]>("/integrations");
}

/** POST /api/v1/ingest */
export async function ingest(content: string, title?: string): Promise<Page> {
  return apiFetch<Page>("/ingest", {
    method: "POST",
    body: JSON.stringify({ content, title }),
  });
}

/** GET /api/v1/settings */
export async function getSettings(): Promise<TenantSettings> {
  return apiFetch<TenantSettings>("/settings");
}

/** PUT /api/v1/settings */
export async function updateSettings(
  settings: Partial<TenantSettings>,
): Promise<TenantSettings> {
  return apiFetch<TenantSettings>("/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
