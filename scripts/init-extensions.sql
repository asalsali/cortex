-- Initialize required PostgreSQL extensions.
-- This runs before the schema migration (0001_initial.sql).
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
