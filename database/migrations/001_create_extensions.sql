-- Migration: 001_create_extensions.sql
-- Description: Enable required PostgreSQL extensions
-- Created: 2024-11-18

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geographic data types
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enable pg_trgm for fuzzy text search (useful for searching customers/addresses)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

COMMENT ON EXTENSION "uuid-ossp" IS 'Generate UUIDs for primary keys';
COMMENT ON EXTENSION "postgis" IS 'Geographic data types and functions for location tracking';
COMMENT ON EXTENSION "pg_trgm" IS 'Trigram matching for fuzzy text search';
