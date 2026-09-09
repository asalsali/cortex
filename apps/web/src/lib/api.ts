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

const DEV_TENANT_ID =
  process.env.NEXT_PUBLIC_DEV_TENANT_ID ?? "d327d2e5-7db4-42df-b567-b5433370d0fa";

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

  // In dev mode (no Clerk token), send the dev tenant ID
  if (!token && DEV_TENANT_ID) {
    headers["X-Tenant-Id"] = DEV_TENANT_ID;
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
  const res = await apiFetch<{
    results: Array<{
      id: string;
      type: string;
      title: string;
      content: string;
      score: number;
      sourceType: SourceType | null;
      sourceRef: string | null;
      sourceAuthor: string | null;
      validFrom: string | null;
      entitySlug: string | null;
      chunkSource?: string;
    }>;
    total: number;
    modeUsed: string;
    tokenCount: number;
  }>("/search", {
    method: "POST",
    body: JSON.stringify({ query, mode }),
  });

  // Map API response to UI SearchResult shape
  return res.results.map((r) => ({
    id: r.id,
    title: r.title,
    snippet: r.content,
    entitySlug: r.entitySlug ?? "",
    sourceType: (r.sourceType ?? "manual") as SourceType,
    confidence: r.score,
    date: r.validFrom ?? new Date().toISOString(),
    isCurrent: true,
    kind: "architecture" as FactKind,
  }));
}

/** GET /api/v1/entities */
export async function getEntities(): Promise<Entity[]> {
  const res = await apiFetch<Array<{
    slug: string;
    title: string;
    type: string;
    compiledTruth: string | null;
    currentFactCount: number;
    totalFactCount: number;
    supersededCount: number;
    lastUpdated: string | null;
    neighborSlugs: string[];
  }>>("/entities");

  return res.map((e) => ({
    slug: e.slug,
    name: e.title,
    type: (e.type === "entity" ? "system" : e.type) as Entity["type"],
    compiledTruth: e.compiledTruth ?? "",
    factCount: e.totalFactCount,
    currentFactCount: e.currentFactCount,
    supersededCount: e.supersededCount,
    lastUpdated: e.lastUpdated ?? new Date().toISOString(),
    relatedEntities: e.neighborSlugs,
    velocity: "stable" as const,
  }));
}

/** GET /api/v1/entities/:slug */
export async function getEntity(slug: string): Promise<EntityCard> {
  const res = await apiFetch<{
    slug: string;
    title: string;
    compiledTruth: string | null;
    currentFacts: Array<Record<string, unknown>>;
    timeline: Array<Record<string, unknown>>;
    graph: { neighbors: Array<{ slug: string; title: string; edgeType: string; direction: string }> };
  }>(`/entities/${encodeURIComponent(slug)}`);

  return {
    slug: res.slug,
    name: res.title,
    type: "system",
    compiledTruth: res.compiledTruth ?? "",
    currentFacts: [],
    timeline: [],
    relatedEntities: res.graph.neighbors.map((n) => n.slug),
  };
}

/** GET /api/v1/facts/:slug */
export async function getFacts(entitySlug: string): Promise<Fact[]> {
  const res = await apiFetch<{
    facts: Array<{
      id: string;
      tenantId: string;
      entitySlug: string;
      content: string;
      kind: string;
      confidence: number;
      visibility: string;
      validFrom: string;
      validUntil: string | null;
      sourceType: string | null;
      sourceRef: string | null;
      sourceAuthorId: string | null;
      extractedBy: string;
      supersededBy: string | null;
      supersessionReason: string | null;
      consolidatedInto: string | null;
      consolidatedAt: string | null;
      createdAt: string;
    }>;
    total: number;
  }>(`/facts/${encodeURIComponent(entitySlug)}?include=all`);

  return res.facts.map((f) => ({
    id: f.id,
    entitySlug: f.entitySlug,
    content: f.content,
    kind: (f.kind ?? "context") as FactKind,
    confidence: f.confidence ?? 0.9,
    validFrom: f.validFrom,
    validUntil: f.validUntil,
    sourceType: (f.sourceType ?? "manual") as SourceType,
    sourceRef: f.sourceRef ?? "",
    sourceAuthor: f.sourceAuthorId ?? "Unknown",
    supersededBy: f.supersededBy,
    supersessionReason: f.supersessionReason,
    isCurrent: f.validUntil === null,
  }));
}

/** POST /api/v1/facts */
export async function createFact(data: CreateFactData): Promise<{ factId: string; superseded: string[] }> {
  return apiFetch<{ factId: string; superseded: string[] }>("/facts", {
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
  if (filters?.kind) params.set("kind", filters.kind);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);

  const qs = params.toString();

  // Use entity-specific endpoint if slug provided, otherwise global timeline
  const path = entitySlug
    ? `/timeline/${encodeURIComponent(entitySlug)}${qs ? `?${qs}` : ""}`
    : `/timeline${qs ? `?${qs}` : ""}`;

  const res = await apiFetch<{
    events: Array<{
      factId: string;
      content: string;
      kind: string;
      validFrom: string;
      validUntil: string | null;
      sourceType: string | null;
      sourceRef: string | null;
      sourceAuthor: string | null;
      supersededBy: string | null;
      supersessionReason: string | null;
      entitySlug?: string;
      entityTitle?: string;
      entityType?: string;
    }>;
    entitySlug?: string;
  }>(path);

  return res.events.map((e) => ({
    id: e.factId,
    date: e.validFrom,
    entitySlug: e.entitySlug ?? entitySlug ?? "",
    entityName: e.entityTitle ?? e.entitySlug ?? entitySlug ?? "",
    entityType: (e.entityType ?? "system") as TimelineEvent["entityType"],
    content: e.content,
    sourceType: (e.sourceType ?? "manual") as SourceType,
    sourceAuthor: e.sourceAuthor ?? "Unknown",
    kind: (e.kind ?? "context") as FactKind,
    supersedes: e.supersededBy,
  }));
}

/** GET /api/v1/delta?since=... */
export async function getDelta(since: string): Promise<DeltaResponse> {
  return apiFetch<DeltaResponse>(
    `/delta?since=${encodeURIComponent(since)}`,
  );
}

/** GET /api/v1/dream-runs */
export async function getDreamRuns(): Promise<DreamRun[]> {
  const res = await apiFetch<Array<{
    id: string;
    startedAt: string;
    completedAt: string | null;
    status: string;
    phases: Record<string, { startedAt: string; completedAt: string | null; itemsProcessed: number; errors: string[] }>;
    summary: string | null;
    factsCreated: number;
    factsSuperseded: number;
    edgesCreated: number;
    pagesUpdated: number;
    llmCostUsd: number;
  }>>("/dream-runs");

  return res.map((r) => {
    const start = new Date(r.startedAt);
    const end = r.completedAt ? new Date(r.completedAt) : start;
    const durationMs = end.getTime() - start.getTime();
    const mins = Math.floor(durationMs / 60000);
    const secs = Math.floor((durationMs % 60000) / 1000);

    const phaseNames = ["sync", "extract", "embed", "consolidate", "health"] as const;
    const phases = phaseNames
      .filter((name) => r.phases[name])
      .map((name) => {
        const p = r.phases[name];
        const pStart = new Date(p.startedAt);
        const pEnd = p.completedAt ? new Date(p.completedAt) : pStart;
        const pMs = pEnd.getTime() - pStart.getTime();
        const pM = Math.floor(pMs / 60000);
        const pS = Math.floor((pMs % 60000) / 1000);
        return {
          name,
          duration: `${pM}m ${String(pS).padStart(2, "0")}s`,
          items: p.itemsProcessed,
        };
      });

    return {
      id: r.id,
      startedAt: r.startedAt,
      completedAt: r.completedAt ?? r.startedAt,
      duration: `${mins}m ${String(secs).padStart(2, "0")}s`,
      factsCreated: r.factsCreated,
      factsSuperseded: r.factsSuperseded,
      edgesCreated: r.edgesCreated,
      entitiesUpdated: r.pagesUpdated,
      phases,
    };
  });
}

/** GET /api/v1/integrations */
export async function getIntegrations(): Promise<Integration[]> {
  const res = await apiFetch<Array<{
    id: string;
    tenantId: string;
    sourceType: string;
    config: Record<string, unknown>;
    status: string;
    lastSyncAt: string | null;
  }>>("/integrations");

  return res.map((i) => ({
    id: i.id,
    name: sourceTypeName(i.sourceType),
    sourceType: (i.sourceType ?? "manual") as SourceType,
    status: mapIntegrationStatus(i.status),
    lastSyncAt: i.lastSyncAt,
    factCount: 0,
    description: `Connected ${sourceTypeName(i.sourceType)} integration`,
  }));
}

function sourceTypeName(st: string): string {
  const names: Record<string, string> = {
    slack: "Slack", notion: "Notion", git: "GitHub",
    manual: "Manual Upload", meeting: "Meeting Notes",
    agent: "Agent", google_docs: "Google Docs",
  };
  return names[st] ?? st;
}

function mapIntegrationStatus(s: string): Integration["status"] {
  if (s === "active") return "connected";
  if (s === "paused" || s === "disconnected") return "available";
  if (s === "error") return "error";
  return "available";
}

/** POST /api/v1/ingest */
export async function ingest(content: string, title?: string): Promise<Page> {
  return apiFetch<Page>("/ingest", {
    method: "POST",
    body: JSON.stringify({ content, title }),
  });
}

// ---------------------------------------------------------------------------
// Office Hours
// ---------------------------------------------------------------------------

export interface OfficeHoursCitation {
  type: "fact" | "entity";
  id: string;
  label: string;
  content: string;
}

export interface OfficeHoursSuggestedPerson {
  slug: string;
  name: string;
  reason: string;
}

export interface OfficeHoursChatResponse {
  message: string;
  citations: OfficeHoursCitation[];
  suggestedPeople: OfficeHoursSuggestedPerson[];
  factsExtracted: number;
  intent: string;
  sessionId: string;
}

export interface OfficeHoursSessionSummary {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OfficeHoursSessionFull {
  id: string;
  tenantId: string;
  title: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

/** POST /api/v1/office-hours/chat */
export async function officeHoursChat(
  message: string,
  sessionId?: string,
): Promise<OfficeHoursChatResponse> {
  return apiFetch<OfficeHoursChatResponse>("/office-hours/chat", {
    method: "POST",
    body: JSON.stringify({ message, sessionId }),
  });
}

/** GET /api/v1/office-hours/sessions */
export async function getOfficeHoursSessions(): Promise<OfficeHoursSessionSummary[]> {
  return apiFetch<OfficeHoursSessionSummary[]>("/office-hours/sessions");
}

/** GET /api/v1/office-hours/sessions/:sessionId */
export async function getOfficeHoursSession(
  sessionId: string,
): Promise<OfficeHoursSessionFull> {
  return apiFetch<OfficeHoursSessionFull>(
    `/office-hours/sessions/${encodeURIComponent(sessionId)}`,
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

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
