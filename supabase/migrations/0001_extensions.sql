-- 0001_extensions.sql
-- Enable PostgreSQL extensions required by the platform.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "vector";       -- pgvector for AI embeddings
create extension if not exists "pg_trgm";      -- trigram search for Thai text
create extension if not exists "citext";       -- case-insensitive emails/slugs
create extension if not exists "unaccent";     -- diacritic-insensitive search
