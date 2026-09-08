// ─── Core Domain Types ───────────────────────────────────────────

export type FactKind = "decision" | "architecture" | "process" | "policy" | "context" | "event";
export type Visibility = "public" | "team" | "private";
export type SourceType = "slack" | "notion" | "git" | "manual" | "agent" | "meeting" | "google_docs";
export type ExtractedBy = "human" | "llm" | "connector" | "agent";
export type PageType = "entity" | "document" | "decision" | "transcript";
export type EdgeType = "owns" | "maintains" | "depends_on" | "supersedes" | "relates_to" | "authored";
export type EdgeSource = "extracted" | "manual" | "connector";
export type UserRole = "admin" | "member" | "viewer" | "agent";
export type PlanTier = "free" | "team" | "business";
export type SearchMode = "quick" | "standard" | "deep";
export type SearchIntent = "entity" | "temporal" | "concept" | "general";
export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type DreamPhase = "sync" | "extract" | "embed" | "consolidate" | "drift" | "orphans" | "health" | "notify";

// ─── Search Types ────────────────────────────────────────────────

export interface SearchResult {
  id: string;
  type: "page" | "fact" | "chunk";
  title: string;
  content: string;
  score: number;
  sourceType: SourceType | null;
  sourceRef: string | null;
  sourceAuthor: string | null;
  validFrom: Date | null;
  entitySlug: string | null;
  chunkSource?: string;
}

export interface SearchRequest {
  query: string;
  mode?: SearchMode;
  tokenBudget?: number;
  filters?: SearchFilters;
  tenantId: string;
}

export interface SearchFilters {
  kinds?: FactKind[];
  since?: string;
  entitySlug?: string;
  sourceTypes?: SourceType[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  modeUsed: SearchMode;
  tokenCount: number;
}

// ─── Fact Types ──────────────────────────────────────────────────

export interface Fact {
  id: string;
  tenantId: string;
  entitySlug: string;
  content: string;
  kind: FactKind;
  confidence: number;
  visibility: Visibility;
  validFrom: Date;
  validUntil: Date | null;
  sourceType: SourceType | null;
  sourceRef: string | null;
  sourceAuthorId: string | null;
  extractedBy: ExtractedBy;
  supersededBy: string | null;
  supersessionReason: string | null;
  consolidatedInto: string | null;
  consolidatedAt: Date | null;
  createdAt: Date;
}

export interface CreateFactInput {
  entitySlug: string;
  content: string;
  kind: FactKind;
  confidence?: number;
  visibility?: Visibility;
  validFrom?: string;
  sourceType?: SourceType;
  sourceRef?: string;
  extractedBy?: ExtractedBy;
}

// ─── Entity Types ────────────────────────────────────────────────

export interface EntityCard {
  slug: string;
  title: string;
  compiledTruth: string | null;
  currentFacts: Fact[];
  timeline: TimelineEntry[];
  graph: {
    neighbors: EntityNeighbor[];
  };
}

export interface EntityNeighbor {
  slug: string;
  title: string;
  edgeType: EdgeType;
  direction: "outgoing" | "incoming";
}

// ─── Timeline Types ──────────────────────────────────────────────

export interface TimelineEntry {
  factId: string;
  content: string;
  kind: FactKind;
  validFrom: Date;
  validUntil: Date | null;
  sourceType: SourceType | null;
  sourceRef: string | null;
  sourceAuthor: string | null;
  supersededBy: string | null;
  supersessionReason: string | null;
}

export interface TimelineResponse {
  entitySlug: string;
  events: TimelineEntry[];
  supersessionChains: SupersessionChain[];
}

export interface SupersessionChain {
  facts: Fact[];
}

// ─── Graph Types ─────────────────────────────────────────────────

export interface Edge {
  id: string;
  tenantId: string;
  fromPageId: string;
  toPageId: string;
  edgeType: EdgeType;
  edgeSource: EdgeSource;
  weight: number;
}

export interface CreateEdgeInput {
  fromPageId: string;
  toPageId: string;
  edgeType: EdgeType;
  edgeSource?: EdgeSource;
  weight?: number;
}

// ─── Dream Cycle Types ──────────────────────────────────────────

export interface DreamRun {
  id: string;
  tenantId: string;
  startedAt: Date;
  completedAt: Date | null;
  status: "running" | "completed" | "failed" | "cancelled";
  phases: Record<DreamPhase, PhaseResult>;
  summary: string | null;
  factsCreated: number;
  factsSuperseded: number;
  edgesCreated: number;
  pagesUpdated: number;
  llmCostUsd: number;
}

export interface PhaseResult {
  startedAt: string;
  completedAt: string | null;
  itemsProcessed: number;
  errors: string[];
}

// ─── Job Queue Types ─────────────────────────────────────────────

export interface Job {
  id: string;
  tenantId: string | null;
  queue: string;
  jobType: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  scheduledAt: Date;
}

// ─── Connector Types ─────────────────────────────────────────────

export interface ConnectorConfig {
  [key: string]: unknown;
}

export interface SyncResult {
  pagesCreated: number;
  pagesUpdated: number;
  factsExtracted: number;
  errors: string[];
}

export interface Integration {
  id: string;
  tenantId: string;
  sourceType: SourceType;
  config: ConnectorConfig;
  status: "active" | "paused" | "error" | "disconnected";
  lastSyncAt: Date | null;
}

// ─── Delta Types ─────────────────────────────────────────────────

export interface DeltaResponse {
  factsCreated: Fact[];
  factsSuperseded: Fact[];
  entitiesUpdated: string[];
  since: string;
}
