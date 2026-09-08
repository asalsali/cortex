// Mock data for Cortex demo — fictional company "Meridian" (60-person fintech startup)

export type EntityType = "person" | "system" | "project" | "decision" | "concept";
export type SourceType = "slack" | "notion" | "git" | "manual" | "meeting" | "agent";
export type FactKind = "architecture" | "decision" | "process" | "policy" | "context" | "event";
export type Velocity = "stable" | "active" | "volatile";

export interface Entity {
  slug: string;
  name: string;
  type: EntityType;
  compiledTruth: string;
  factCount: number;
  currentFactCount: number;
  supersededCount: number;
  lastUpdated: string;
  relatedEntities: string[];
  velocity: Velocity;
}

export interface Fact {
  id: string;
  entitySlug: string;
  content: string;
  kind: FactKind;
  confidence: number;
  validFrom: string;
  validUntil: string | null;
  sourceType: SourceType;
  sourceRef: string;
  sourceAuthor: string;
  supersededBy: string | null;
  supersessionReason: string | null;
  isCurrent: boolean;
}

export interface TimelineEvent {
  id: string;
  date: string;
  entitySlug: string;
  entityName: string;
  entityType: EntityType;
  content: string;
  sourceType: SourceType;
  sourceAuthor: string;
  kind: FactKind;
  supersedes: string | null;
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  entitySlug: string;
  sourceType: SourceType;
  confidence: number;
  date: string;
  isCurrent: boolean;
  kind: FactKind;
}

export interface Integration {
  id: string;
  name: string;
  sourceType: SourceType;
  status: "connected" | "pending" | "available" | "error";
  lastSyncAt: string | null;
  factCount: number;
  description: string;
}

export interface DreamRun {
  id: string;
  startedAt: string;
  completedAt: string;
  duration: string;
  factsCreated: number;
  factsSuperseded: number;
  edgesCreated: number;
  entitiesUpdated: number;
  phases: {
    name: string;
    duration: string;
    items: number;
  }[];
}

// ─── Entities ───────────────────────────────────────────

export const entities: Entity[] = [
  {
    slug: "user-service",
    name: "User Service",
    type: "system",
    compiledTruth:
      "Core authentication and user management microservice. Originally built on MongoDB (Jan 2024), migrated to Postgres in March 2025 as part of the unified data layer initiative. Currently runs Postgres 16 with pgvector for user profile similarity search. Redis caching layer added June 2024 for session management. Handles ~12K RPM at peak. Owned by the Platform team.",
    factCount: 8,
    currentFactCount: 5,
    supersededCount: 3,
    lastUpdated: "2026-06-01",
    relatedEntities: ["api-gateway", "auth-service", "frontend-app", "sarah-chen", "postgres-migration"],
    velocity: "active",
  },
  {
    slug: "sarah-chen",
    name: "Sarah Chen",
    type: "person",
    compiledTruth:
      "VP of Engineering. Joined Meridian as the 8th employee in 2023. Leads the Platform and Infrastructure teams (14 engineers). Key decision-maker on the MongoDB to Postgres migration and the adoption of event-driven architecture. Previously at Stripe (Staff Engineer, Payments Core). Reports to CTO Marcus Webb.",
    factCount: 6,
    currentFactCount: 5,
    supersededCount: 1,
    lastUpdated: "2026-07-15",
    relatedEntities: ["user-service", "postgres-migration", "event-bus", "marcus-webb", "platform-team"],
    velocity: "stable",
  },
  {
    slug: "api-gateway",
    name: "API Gateway",
    type: "system",
    compiledTruth:
      "Kong-based API gateway handling all external traffic. Rate limiting, auth token validation, and request routing. Processes ~45K RPM. Deployed on Kubernetes via Helm charts. Recently added gRPC support for internal service communication (Q2 2026).",
    factCount: 5,
    currentFactCount: 4,
    supersededCount: 1,
    lastUpdated: "2026-05-20",
    relatedEntities: ["user-service", "auth-service", "payments-engine", "kubernetes-cluster"],
    velocity: "stable",
  },
  {
    slug: "postgres-migration",
    name: "Postgres Migration",
    type: "project",
    compiledTruth:
      "Company-wide initiative to consolidate data stores onto Postgres 16. Started March 2025, targeting completion by Q4 2026. User Service and Auth Service completed. Payments Engine migration in progress. Motivation: reduce operational complexity from 4 data stores (MongoDB, MySQL, Redis, DynamoDB) to 2 (Postgres + Redis).",
    factCount: 7,
    currentFactCount: 5,
    supersededCount: 2,
    lastUpdated: "2026-08-10",
    relatedEntities: ["user-service", "auth-service", "payments-engine", "sarah-chen", "unified-data-layer"],
    velocity: "active",
  },
  {
    slug: "payments-engine",
    name: "Payments Engine",
    type: "system",
    compiledTruth:
      "Core payment processing service handling Stripe and Plaid integrations. Currently runs on MySQL 8 with planned migration to Postgres. Processes ~$2.3M daily transaction volume. PCI DSS compliant. Owned by the Payments team (6 engineers) led by James Liu.",
    factCount: 9,
    currentFactCount: 6,
    supersededCount: 3,
    lastUpdated: "2026-08-25",
    relatedEntities: ["api-gateway", "james-liu", "postgres-migration", "stripe-integration", "plaid-connector"],
    velocity: "volatile",
  },
  {
    slug: "event-bus",
    name: "Event Bus",
    type: "system",
    compiledTruth:
      "Kafka-based event streaming platform. Handles inter-service communication, audit logging, and analytics pipelines. 23 topics, ~500K events/day. Migrated from RabbitMQ in Q4 2025. Managed by the Platform team.",
    factCount: 4,
    currentFactCount: 3,
    supersededCount: 1,
    lastUpdated: "2026-04-12",
    relatedEntities: ["sarah-chen", "user-service", "payments-engine", "analytics-pipeline"],
    velocity: "stable",
  },
  {
    slug: "auth-service",
    name: "Auth Service",
    type: "system",
    compiledTruth:
      "OAuth 2.0 / OIDC compliant authentication service. Supports SSO via Google Workspace and Okta. JWT-based token issuance with 15-min access tokens and 7-day refresh tokens. Migrated to Postgres alongside User Service in April 2025.",
    factCount: 5,
    currentFactCount: 4,
    supersededCount: 1,
    lastUpdated: "2026-04-15",
    relatedEntities: ["user-service", "api-gateway", "postgres-migration"],
    velocity: "stable",
  },
  {
    slug: "james-liu",
    name: "James Liu",
    type: "person",
    compiledTruth:
      "Senior Staff Engineer, Payments team lead. Joined Meridian in 2024 from Square. Owns the Payments Engine and Stripe/Plaid integrations. Leading the Payments Engine Postgres migration. Known for thorough ADRs and strong opinions on data consistency.",
    factCount: 4,
    currentFactCount: 4,
    supersededCount: 0,
    lastUpdated: "2026-07-20",
    relatedEntities: ["payments-engine", "postgres-migration", "stripe-integration"],
    velocity: "stable",
  },
  {
    slug: "kubernetes-cluster",
    name: "Kubernetes Cluster",
    type: "system",
    compiledTruth:
      "EKS cluster on AWS us-east-1. Runs all production services. 12 nodes (m6i.xlarge), autoscaling 8-20. ArgoCD for GitOps deployments. Istio service mesh added Q1 2026 for mTLS and traffic management.",
    factCount: 6,
    currentFactCount: 5,
    supersededCount: 1,
    lastUpdated: "2026-03-28",
    relatedEntities: ["api-gateway", "user-service", "payments-engine", "devops-team"],
    velocity: "stable",
  },
  {
    slug: "unified-data-layer",
    name: "Unified Data Layer",
    type: "decision",
    compiledTruth:
      "ADR-042: Decision to consolidate all persistent data stores onto Postgres 16 with specialized extensions (pgvector, pg_cron, pgaudit). Approved by Sarah Chen and Marcus Webb in Feb 2025. Rationale: reduce ops burden, enable cross-service queries, simplify backup/restore. Exception: Redis retained for caching and session management.",
    factCount: 3,
    currentFactCount: 3,
    supersededCount: 0,
    lastUpdated: "2025-02-15",
    relatedEntities: ["postgres-migration", "sarah-chen", "marcus-webb"],
    velocity: "stable",
  },
  {
    slug: "frontend-app",
    name: "Frontend App",
    type: "system",
    compiledTruth:
      "Next.js 14 React application serving the customer-facing dashboard. Deployed on Vercel. Uses Radix UI component library. ~45 routes. Performance budget: LCP < 2.5s. Recently migrated from Create React App (Q3 2025).",
    factCount: 5,
    currentFactCount: 4,
    supersededCount: 1,
    lastUpdated: "2026-06-30",
    relatedEntities: ["api-gateway", "user-service", "design-system"],
    velocity: "active",
  },
  {
    slug: "marcus-webb",
    name: "Marcus Webb",
    type: "person",
    compiledTruth:
      "CTO and co-founder. Previously Director of Engineering at Plaid. Drives technical strategy and architecture decisions. Advocates for simplicity and fewer moving parts. Approved the Unified Data Layer initiative.",
    factCount: 3,
    currentFactCount: 3,
    supersededCount: 0,
    lastUpdated: "2026-01-10",
    relatedEntities: ["sarah-chen", "unified-data-layer"],
    velocity: "stable",
  },
  {
    slug: "mobile-app",
    name: "Mobile App",
    type: "project",
    compiledTruth:
      "React Native mobile application for Meridian customers. Started Q1 2026, currently in beta. Shares business logic with Frontend App via shared packages. Target: iOS and Android launch Q4 2026. Team of 4 engineers led by Priya Patel.",
    factCount: 4,
    currentFactCount: 4,
    supersededCount: 0,
    lastUpdated: "2026-08-20",
    relatedEntities: ["frontend-app", "api-gateway", "design-system"],
    velocity: "active",
  },
  {
    slug: "analytics-pipeline",
    name: "Analytics Pipeline",
    type: "system",
    compiledTruth:
      "dbt + Snowflake analytics pipeline. Ingests events from Kafka, transforms into business metrics. Powers the internal dashboard and investor reporting. 47 models, refreshed every 4 hours. Owned by the Data team (3 engineers).",
    factCount: 4,
    currentFactCount: 3,
    supersededCount: 1,
    lastUpdated: "2026-07-05",
    relatedEntities: ["event-bus", "payments-engine"],
    velocity: "stable",
  },
];

// ─── Facts for User Service (detailed for entity card demo) ───────────────

export const userServiceFacts: Fact[] = [
  {
    id: "fact-001",
    entitySlug: "user-service",
    content: "User service created with MongoDB backend for user profiles and session data",
    kind: "architecture",
    confidence: 0.95,
    validFrom: "2024-01-15",
    validUntil: "2025-03-20",
    sourceType: "slack",
    sourceRef: "slack://C0123/p100",
    sourceAuthor: "Sarah Chen",
    supersededBy: "fact-003",
    supersessionReason: "MongoDB replaced by Postgres as part of Unified Data Layer initiative",
    isCurrent: false,
  },
  {
    id: "fact-002",
    entitySlug: "user-service",
    content: "Redis caching layer added for session management and frequently accessed user profiles",
    kind: "architecture",
    confidence: 0.92,
    validFrom: "2024-06-03",
    validUntil: null,
    sourceType: "git",
    sourceRef: "github.com/meridian/user-service/pull/1247",
    sourceAuthor: "James Liu",
    supersededBy: null,
    supersessionReason: null,
    isCurrent: true,
  },
  {
    id: "fact-003",
    entitySlug: "user-service",
    content: "User service migrated from MongoDB to Postgres. All user data, profiles, and relationships now in Postgres. MongoDB cluster decommissioned.",
    kind: "architecture",
    confidence: 0.98,
    validFrom: "2025-03-20",
    validUntil: "2026-06-01",
    sourceType: "notion",
    sourceRef: "notion.so/meridian/ADR-042",
    sourceAuthor: "Sarah Chen",
    supersededBy: "fact-005",
    supersessionReason: "Postgres upgraded to v16 with pgvector extension",
    isCurrent: false,
  },
  {
    id: "fact-004",
    entitySlug: "user-service",
    content: "User service handles approximately 12,000 requests per minute at peak load",
    kind: "context",
    confidence: 0.88,
    validFrom: "2025-08-12",
    validUntil: null,
    sourceType: "slack",
    sourceRef: "slack://C0456/p200",
    sourceAuthor: "Alex Kim",
    supersededBy: null,
    supersessionReason: null,
    isCurrent: true,
  },
  {
    id: "fact-005",
    entitySlug: "user-service",
    content: "User service upgraded to Postgres 16 with pgvector extension for user profile similarity search",
    kind: "architecture",
    confidence: 0.96,
    validFrom: "2026-06-01",
    validUntil: null,
    sourceType: "slack",
    sourceRef: "slack://C0789/p300",
    sourceAuthor: "DevOps Bot",
    supersededBy: null,
    supersessionReason: null,
    isCurrent: true,
  },
  {
    id: "fact-006",
    entitySlug: "user-service",
    content: "Owned by the Platform team, primary maintainer is Sarah Chen",
    kind: "process",
    confidence: 0.90,
    validFrom: "2024-01-15",
    validUntil: null,
    sourceType: "notion",
    sourceRef: "notion.so/meridian/team-ownership",
    sourceAuthor: "Sarah Chen",
    supersededBy: null,
    supersessionReason: null,
    isCurrent: true,
  },
  {
    id: "fact-007",
    entitySlug: "user-service",
    content: "User service API contract documented in OpenAPI 3.1 spec, auto-generated from code annotations",
    kind: "process",
    confidence: 0.85,
    validFrom: "2025-11-01",
    validUntil: null,
    sourceType: "git",
    sourceRef: "github.com/meridian/user-service/blob/main/openapi.yaml",
    sourceAuthor: "Alex Kim",
    supersededBy: null,
    supersessionReason: null,
    isCurrent: true,
  },
  {
    id: "fact-008",
    entitySlug: "user-service",
    content: "MongoDB was initially chosen for schema flexibility during rapid prototyping phase",
    kind: "decision",
    confidence: 0.80,
    validFrom: "2024-01-10",
    validUntil: "2025-03-20",
    sourceType: "meeting",
    sourceRef: "otter.ai/meetings/eng-kickoff-2024",
    sourceAuthor: "Marcus Webb",
    supersededBy: "fact-003",
    supersessionReason: "Decision reversed: schema flexibility less important than query power and operational simplicity",
    isCurrent: false,
  },
];

// ─── Search Results ───────────────────────────────────────────

export const searchResults: SearchResult[] = [
  {
    id: "sr-1",
    title: "User Service Database Architecture",
    snippet:
      "User service runs on Postgres 16 with pgvector for profile similarity search. Migrated from MongoDB in March 2025 as part of the Unified Data Layer initiative.",
    entitySlug: "user-service",
    sourceType: "notion",
    confidence: 0.96,
    date: "2026-06-01",
    isCurrent: true,
    kind: "architecture",
  },
  {
    id: "sr-2",
    title: "Payments Engine Migration Status",
    snippet:
      "Payments Engine MySQL to Postgres migration is in progress. Schema mapping complete, dual-write phase begins September 2026. Target cutover: November 2026.",
    entitySlug: "payments-engine",
    sourceType: "slack",
    confidence: 0.91,
    date: "2026-08-25",
    isCurrent: true,
    kind: "architecture",
  },
  {
    id: "sr-3",
    title: "API Gateway gRPC Support",
    snippet:
      "Kong API Gateway now supports gRPC for internal service-to-service communication. External API remains REST. Added in Q2 2026 to reduce serialization overhead.",
    entitySlug: "api-gateway",
    sourceType: "git",
    confidence: 0.93,
    date: "2026-05-20",
    isCurrent: true,
    kind: "architecture",
  },
  {
    id: "sr-4",
    title: "Event Bus Migration to Kafka",
    snippet:
      "Migrated from RabbitMQ to Kafka in Q4 2025. 23 topics, ~500K events/day. Improved throughput and enabled event replay for analytics backfill.",
    entitySlug: "event-bus",
    sourceType: "notion",
    confidence: 0.89,
    date: "2025-12-15",
    isCurrent: true,
    kind: "decision",
  },
  {
    id: "sr-5",
    title: "MongoDB Backend (Superseded)",
    snippet:
      "User service originally used MongoDB for user profiles and session data. Superseded by Postgres migration in March 2025.",
    entitySlug: "user-service",
    sourceType: "slack",
    confidence: 0.78,
    date: "2024-01-15",
    isCurrent: false,
    kind: "architecture",
  },
  {
    id: "sr-6",
    title: "Unified Data Layer Decision",
    snippet:
      "ADR-042: Consolidate all persistent stores onto Postgres 16. Approved by Sarah Chen and Marcus Webb. Exception: Redis retained for caching.",
    entitySlug: "unified-data-layer",
    sourceType: "notion",
    confidence: 0.97,
    date: "2025-02-15",
    isCurrent: true,
    kind: "decision",
  },
  {
    id: "sr-7",
    title: "Frontend Migration to Next.js",
    snippet:
      "Frontend App migrated from Create React App to Next.js 14 in Q3 2025. Improved LCP from 4.2s to 1.8s. Server-side rendering enabled for dashboard pages.",
    entitySlug: "frontend-app",
    sourceType: "git",
    confidence: 0.90,
    date: "2025-09-15",
    isCurrent: true,
    kind: "architecture",
  },
  {
    id: "sr-8",
    title: "Kubernetes Autoscaling Configuration",
    snippet:
      "EKS cluster autoscaling updated: 8-20 nodes (m6i.xlarge). Istio service mesh added Q1 2026 for mTLS between services.",
    entitySlug: "kubernetes-cluster",
    sourceType: "git",
    confidence: 0.87,
    date: "2026-03-28",
    isCurrent: true,
    kind: "architecture",
  },
  {
    id: "sr-9",
    title: "RabbitMQ Deprecation (Superseded)",
    snippet:
      "RabbitMQ was the original message broker. Deprecated in favor of Kafka due to throughput limits and lack of event replay capability.",
    entitySlug: "event-bus",
    sourceType: "slack",
    confidence: 0.72,
    date: "2025-10-01",
    isCurrent: false,
    kind: "decision",
  },
  {
    id: "sr-10",
    title: "Mobile App Beta Launch",
    snippet:
      "React Native mobile app entered beta in August 2026. Shares business logic with web frontend via shared packages. iOS and Android targets for Q4 2026.",
    entitySlug: "mobile-app",
    sourceType: "slack",
    confidence: 0.85,
    date: "2026-08-20",
    isCurrent: true,
    kind: "event",
  },
];

// ─── Timeline Events ───────────────────────────────────────────

export const timelineEvents: TimelineEvent[] = [
  {
    id: "te-01",
    date: "2024-01-10",
    entitySlug: "user-service",
    entityName: "User Service",
    entityType: "system",
    content: "MongoDB selected as primary database for user data during engineering kickoff",
    sourceType: "meeting",
    sourceAuthor: "Marcus Webb",
    kind: "decision",
    supersedes: null,
  },
  {
    id: "te-02",
    date: "2024-01-15",
    entitySlug: "user-service",
    entityName: "User Service",
    entityType: "system",
    content: "User service created with MongoDB backend",
    sourceType: "slack",
    sourceAuthor: "Sarah Chen",
    kind: "architecture",
    supersedes: null,
  },
  {
    id: "te-03",
    date: "2024-03-22",
    entitySlug: "api-gateway",
    entityName: "API Gateway",
    entityType: "system",
    content: "Kong API Gateway deployed for external traffic routing and rate limiting",
    sourceType: "git",
    sourceAuthor: "Alex Kim",
    kind: "architecture",
    supersedes: null,
  },
  {
    id: "te-04",
    date: "2024-06-03",
    entitySlug: "user-service",
    entityName: "User Service",
    entityType: "system",
    content: "Redis caching layer added for session management",
    sourceType: "git",
    sourceAuthor: "James Liu",
    kind: "architecture",
    supersedes: null,
  },
  {
    id: "te-05",
    date: "2024-09-15",
    entitySlug: "payments-engine",
    entityName: "Payments Engine",
    entityType: "system",
    content: "Stripe integration completed, processing live transactions",
    sourceType: "slack",
    sourceAuthor: "James Liu",
    kind: "event",
    supersedes: null,
  },
  {
    id: "te-06",
    date: "2024-11-20",
    entitySlug: "payments-engine",
    entityName: "Payments Engine",
    entityType: "system",
    content: "Plaid connector added for bank account verification and ACH transfers",
    sourceType: "git",
    sourceAuthor: "James Liu",
    kind: "architecture",
    supersedes: null,
  },
  {
    id: "te-07",
    date: "2025-02-15",
    entitySlug: "unified-data-layer",
    entityName: "Unified Data Layer",
    entityType: "decision",
    content: "ADR-042 approved: consolidate all data stores onto Postgres 16",
    sourceType: "notion",
    sourceAuthor: "Sarah Chen",
    kind: "decision",
    supersedes: null,
  },
  {
    id: "te-08",
    date: "2025-03-20",
    entitySlug: "user-service",
    entityName: "User Service",
    entityType: "system",
    content: "Migrated from MongoDB to Postgres. MongoDB cluster decommissioned.",
    sourceType: "notion",
    sourceAuthor: "Sarah Chen",
    kind: "architecture",
    supersedes: "te-02",
  },
  {
    id: "te-09",
    date: "2025-04-15",
    entitySlug: "auth-service",
    entityName: "Auth Service",
    entityType: "system",
    content: "Auth service migrated to Postgres alongside User Service",
    sourceType: "git",
    sourceAuthor: "Sarah Chen",
    kind: "architecture",
    supersedes: null,
  },
  {
    id: "te-10",
    date: "2025-09-15",
    entitySlug: "frontend-app",
    entityName: "Frontend App",
    entityType: "system",
    content: "Migrated from Create React App to Next.js 14. LCP improved from 4.2s to 1.8s.",
    sourceType: "git",
    sourceAuthor: "Priya Patel",
    kind: "architecture",
    supersedes: null,
  },
  {
    id: "te-11",
    date: "2025-10-01",
    entitySlug: "event-bus",
    entityName: "Event Bus",
    entityType: "system",
    content: "RabbitMQ deprecated in favor of Kafka migration",
    sourceType: "slack",
    sourceAuthor: "Sarah Chen",
    kind: "decision",
    supersedes: null,
  },
  {
    id: "te-12",
    date: "2025-12-15",
    entitySlug: "event-bus",
    entityName: "Event Bus",
    entityType: "system",
    content: "Kafka migration complete. 23 topics, 500K events/day throughput achieved.",
    sourceType: "notion",
    sourceAuthor: "Alex Kim",
    kind: "architecture",
    supersedes: "te-11",
  },
  {
    id: "te-13",
    date: "2026-01-15",
    entitySlug: "kubernetes-cluster",
    entityName: "Kubernetes Cluster",
    entityType: "system",
    content: "Istio service mesh deployed for mTLS and traffic management",
    sourceType: "git",
    sourceAuthor: "DevOps Bot",
    kind: "architecture",
    supersedes: null,
  },
  {
    id: "te-14",
    date: "2026-03-01",
    entitySlug: "mobile-app",
    entityName: "Mobile App",
    entityType: "project",
    content: "React Native mobile app project kicked off, team of 4 under Priya Patel",
    sourceType: "slack",
    sourceAuthor: "Marcus Webb",
    kind: "event",
    supersedes: null,
  },
  {
    id: "te-15",
    date: "2026-05-20",
    entitySlug: "api-gateway",
    entityName: "API Gateway",
    entityType: "system",
    content: "gRPC support added for internal service-to-service communication",
    sourceType: "git",
    sourceAuthor: "Alex Kim",
    kind: "architecture",
    supersedes: null,
  },
  {
    id: "te-16",
    date: "2026-06-01",
    entitySlug: "user-service",
    entityName: "User Service",
    entityType: "system",
    content: "Upgraded to Postgres 16 with pgvector for user profile similarity search",
    sourceType: "slack",
    sourceAuthor: "DevOps Bot",
    kind: "architecture",
    supersedes: "te-08",
  },
  {
    id: "te-17",
    date: "2026-07-15",
    entitySlug: "payments-engine",
    entityName: "Payments Engine",
    entityType: "system",
    content: "Payments Engine Postgres migration planning started. Schema mapping phase.",
    sourceType: "notion",
    sourceAuthor: "James Liu",
    kind: "process",
    supersedes: null,
  },
  {
    id: "te-18",
    date: "2026-08-20",
    entitySlug: "mobile-app",
    entityName: "Mobile App",
    entityType: "project",
    content: "Mobile app enters beta. Internal testing on iOS and Android.",
    sourceType: "slack",
    sourceAuthor: "Priya Patel",
    kind: "event",
    supersedes: null,
  },
  {
    id: "te-19",
    date: "2026-08-25",
    entitySlug: "payments-engine",
    entityName: "Payments Engine",
    entityType: "system",
    content: "Schema mapping complete. Dual-write phase begins September 2026.",
    sourceType: "slack",
    sourceAuthor: "James Liu",
    kind: "architecture",
    supersedes: "te-17",
  },
  {
    id: "te-20",
    date: "2026-06-30",
    entitySlug: "frontend-app",
    entityName: "Frontend App",
    entityType: "system",
    content: "Design system v2 rollout: migrated from custom components to Radix UI",
    sourceType: "git",
    sourceAuthor: "Priya Patel",
    kind: "architecture",
    supersedes: null,
  },
];

// ─── Integrations ───────────────────────────────────────────

export const integrations: Integration[] = [
  {
    id: "int-1",
    name: "Slack",
    sourceType: "slack",
    status: "connected",
    lastSyncAt: "2026-08-31T06:15:00Z",
    factCount: 342,
    description: "Monitoring 8 channels: #eng-decisions, #architecture, #incidents, #platform, #payments, #frontend, #devops, #general",
  },
  {
    id: "int-2",
    name: "Notion",
    sourceType: "notion",
    status: "pending",
    lastSyncAt: null,
    factCount: 0,
    description: "Connect to sync ADRs, runbooks, and team documentation from your Notion workspace",
  },
  {
    id: "int-3",
    name: "GitHub",
    sourceType: "git",
    status: "available",
    lastSyncAt: null,
    factCount: 0,
    description: "Monitor repositories for README changes, PR descriptions, commit messages, and documentation updates",
  },
  {
    id: "int-4",
    name: "Google Docs",
    sourceType: "manual",
    status: "available",
    lastSyncAt: null,
    factCount: 0,
    description: "Sync design documents, meeting notes, and shared documents from Google Workspace",
  },
  {
    id: "int-5",
    name: "Manual Upload",
    sourceType: "manual",
    status: "connected",
    lastSyncAt: "2026-08-30T14:22:00Z",
    factCount: 47,
    description: "Markdown files, PDFs, and text snippets uploaded directly by team members",
  },
];

// ─── Dream Runs ───────────────────────────────────────────

export const dreamRuns: DreamRun[] = [
  {
    id: "dr-1",
    startedAt: "2026-08-31T02:00:00Z",
    completedAt: "2026-08-31T02:23:14Z",
    duration: "23m 14s",
    factsCreated: 47,
    factsSuperseded: 3,
    edgesCreated: 12,
    entitiesUpdated: 8,
    phases: [
      { name: "sync", duration: "4m 12s", items: 156 },
      { name: "extract", duration: "8m 45s", items: 47 },
      { name: "embed", duration: "3m 02s", items: 52 },
      { name: "consolidate", duration: "5m 33s", items: 8 },
      { name: "health", duration: "1m 42s", items: 14 },
    ],
  },
  {
    id: "dr-2",
    startedAt: "2026-08-30T02:00:00Z",
    completedAt: "2026-08-30T02:18:47Z",
    duration: "18m 47s",
    factsCreated: 31,
    factsSuperseded: 1,
    edgesCreated: 7,
    entitiesUpdated: 5,
    phases: [
      { name: "sync", duration: "3m 55s", items: 98 },
      { name: "extract", duration: "6m 12s", items: 31 },
      { name: "embed", duration: "2m 44s", items: 35 },
      { name: "consolidate", duration: "4m 15s", items: 5 },
      { name: "health", duration: "1m 41s", items: 14 },
    ],
  },
  {
    id: "dr-3",
    startedAt: "2026-08-29T02:00:00Z",
    completedAt: "2026-08-29T02:31:02Z",
    duration: "31m 02s",
    factsCreated: 63,
    factsSuperseded: 5,
    edgesCreated: 19,
    entitiesUpdated: 11,
    phases: [
      { name: "sync", duration: "5m 30s", items: 241 },
      { name: "extract", duration: "12m 18s", items: 63 },
      { name: "embed", duration: "4m 55s", items: 71 },
      { name: "consolidate", duration: "6m 12s", items: 11 },
      { name: "health", duration: "2m 07s", items: 14 },
    ],
  },
  {
    id: "dr-4",
    startedAt: "2026-08-28T02:00:00Z",
    completedAt: "2026-08-28T02:15:33Z",
    duration: "15m 33s",
    factsCreated: 22,
    factsSuperseded: 0,
    edgesCreated: 4,
    entitiesUpdated: 4,
    phases: [
      { name: "sync", duration: "3m 10s", items: 67 },
      { name: "extract", duration: "5m 02s", items: 22 },
      { name: "embed", duration: "2m 18s", items: 24 },
      { name: "consolidate", duration: "3m 22s", items: 4 },
      { name: "health", duration: "1m 41s", items: 14 },
    ],
  },
  {
    id: "dr-5",
    startedAt: "2026-08-27T02:00:00Z",
    completedAt: "2026-08-27T02:20:11Z",
    duration: "20m 11s",
    factsCreated: 38,
    factsSuperseded: 2,
    edgesCreated: 9,
    entitiesUpdated: 7,
    phases: [
      { name: "sync", duration: "4m 05s", items: 134 },
      { name: "extract", duration: "7m 33s", items: 38 },
      { name: "embed", duration: "3m 12s", items: 42 },
      { name: "consolidate", duration: "3m 48s", items: 7 },
      { name: "health", duration: "1m 33s", items: 14 },
    ],
  },
];

// ─── Helper functions ───────────────────────────────────────────

export function getEntity(slug: string): Entity | undefined {
  return entities.find((e) => e.slug === slug);
}

export function getEntityFacts(slug: string): Fact[] {
  if (slug === "user-service") return userServiceFacts;
  return [];
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function getSourceIcon(sourceType: SourceType): string {
  switch (sourceType) {
    case "slack": return "#";
    case "notion": return "N";
    case "git": return "<>";
    case "manual": return "+";
    case "meeting": return "M";
    case "agent": return "A";
    default: return "?";
  }
}

export function getSourceLabel(sourceType: SourceType): string {
  switch (sourceType) {
    case "slack": return "Slack";
    case "notion": return "Notion";
    case "git": return "GitHub";
    case "manual": return "Manual";
    case "meeting": return "Meeting";
    case "agent": return "Agent";
    default: return "Unknown";
  }
}

export function getEntityTypeColor(type: EntityType): string {
  switch (type) {
    case "person": return "#a78bfa";
    case "system": return "#60a5fa";
    case "project": return "#34d399";
    case "decision": return "#fbbf24";
    case "concept": return "#f87171";
    default: return "#94a3b8";
  }
}

export function getVelocityColor(velocity: Velocity): string {
  switch (velocity) {
    case "stable": return "#34d399";
    case "active": return "#60a5fa";
    case "volatile": return "#f97316";
    default: return "#94a3b8";
  }
}
