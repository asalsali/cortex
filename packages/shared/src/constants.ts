// ─── Search Constants ────────────────────────────────────────────

export const RRF_K = 60;
export const COMPILED_TRUTH_BOOST = 2.0;
export const COSINE_BLEND_RRF = 0.7;
export const COSINE_BLEND_SIM = 0.3;
export const FLOOR_RATIO = 0.3;
export const ADJACENCY_BOOST = 1.05;
export const CROSS_SOURCE_BOOST = 1.10;
export const TITLE_PHRASE_BOOST = 1.25;
export const HIGH_CONFIDENCE_BOOST = 1.1;
export const LOW_CONFIDENCE_PENALTY = 0.8;
export const AUTOCUT_DROP_THRESHOLD = 0.4;

export const SEARCH_MODE_CONFIG = {
  quick:    { vector: false, reranker: false, tokenBudget: 4_000 },
  standard: { vector: true,  reranker: false, tokenBudget: 12_000 },
  deep:     { vector: true,  reranker: true,  tokenBudget: 32_000 },
} as const;

export const RECENCY_HALF_LIFE: Record<string, number> = {
  temporal: 30,
  general:  180,
  entity:   365,
  concept:  365,
};

export const SEARCH_CANDIDATE_POOL = 50;
export const RERANKER_TOP_N = 30;

// ─── Writeback Gate Constants ────────────────────────────────────

export const ACK_PATTERNS = [
  /^(thanks?|thx|ty|ok|okay|k|sure|yep|yup|yeah|yes|no|nope|nah|lol|lmao|haha|heh|nice|cool|great|awesome|good|got it|roger|ack|np|will do|on it|sounds good|makes sense|agreed|\+1|:\+1:)$/i,
];

export const GREETING_PATTERNS = [
  /^(hi|hey|hello|morning|good morning|afternoon|evening|gm|sup|yo|howdy|what'?s up|whats up)[\s!.]*$/i,
];

export const SLASH_COMMAND_PATTERN = /^\//;
export const QUESTION_ONLY_PATTERN = /^\?+$/;
export const QUOTED_PATTERN = /^>/m;
export const MIN_CONTENT_LENGTH = 3;
export const BULK_PASTE_THRESHOLD = 2000;

// ─── Embedding Constants ─────────────────────────────────────────

export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_BATCH_SIZE = 100;

// ─── Dream Cycle Constants ───────────────────────────────────────

export const DREAM_PHASES = [
  "sync",
  "extract",
  "embed",
  "consolidate",
  "drift",
  "orphans",
  "health",
  "notify",
] as const;

export const CONSOLIDATION_CLUSTER_MIN = 3;
export const STALE_ENTITY_DAYS = 30;
export const ORPHAN_DAYS = 30;
export const DRIFT_COMPILED_TRUTH_AGE_DAYS = 7;

// ─── Job Queue Constants ─────────────────────────────────────────

export const JOB_QUEUES = {
  INGESTION: "ingestion",
  EMBED: "embed",
  EXTRACT: "extract",
  DREAM: "dream",
  NOTIFY: "notify",
} as const;

// ─── Graph Constants ─────────────────────────────────────────────

export const GRAPH_MAX_DEPTH = 3;
export const GRAPH_FRONTIER_CAP = 20;
