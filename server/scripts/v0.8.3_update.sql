-- ============================================================
-- TEMS v0.8.3 Database Update (PostgreSQL)
-- Date: 2026-03-09
-- Description: Enhanced Ticketing System — Developer-focused fields
-- ============================================================
--
-- This script adds 6 new columns to the `tickets` table to support
-- development-oriented ticket tracking: environment, reproduction
-- steps, expected/actual behavior, console errors, and browser info.
--
-- Run this against your production database to apply v0.8.3 changes.
-- ============================================================

-- 1. Add developer-focused fields to tickets table
ALTER TABLE tickets ADD COLUMN environment VARCHAR(80) NULL;
ALTER TABLE tickets ADD COLUMN steps_to_reproduce TEXT NULL;
ALTER TABLE tickets ADD COLUMN expected_behavior TEXT NULL;
ALTER TABLE tickets ADD COLUMN actual_behavior TEXT NULL;
ALTER TABLE tickets ADD COLUMN console_errors TEXT NULL;
ALTER TABLE tickets ADD COLUMN browser_info VARCHAR(500) NULL;

-- 2. Record this migration in the knex migrations table
--    (so knex migrate:latest won't try to re-run it)
INSERT INTO knex_migrations (name, batch, migration_time)
VALUES ('20260309000000_ticket_dev_fields.js',
        (SELECT COALESCE(MAX(batch), 0) + 1 FROM (SELECT batch FROM knex_migrations) AS t),
        NOW());

-- ============================================================
-- 3. Circuit PK Rename: circuits_id → cir_id
--    Rename circuit_number → circuit_id (regular varchar)
--    Rename FK columns in child tables → cir_id
-- ============================================================

-- Drop existing FK constraints
ALTER TABLE line_items  DROP CONSTRAINT IF EXISTS line_items_circuits_id_foreign;
ALTER TABLE cost_savings DROP CONSTRAINT IF EXISTS cost_savings_circuits_id_foreign;

-- Rename columns in circuits table
ALTER TABLE circuits     RENAME COLUMN circuits_id    TO cir_id;
ALTER TABLE circuits     RENAME COLUMN circuit_number TO circuit_id;

-- Rename FK columns in child tables
ALTER TABLE orders       RENAME COLUMN circuits_id TO cir_id;
ALTER TABLE line_items   RENAME COLUMN circuits_id TO cir_id;
ALTER TABLE cost_savings RENAME COLUMN circuits_id TO cir_id;

-- Recreate FK constraints with new column name
ALTER TABLE line_items
  ADD CONSTRAINT line_items_cir_id_foreign
  FOREIGN KEY (cir_id) REFERENCES circuits(cir_id) ON DELETE SET NULL;

ALTER TABLE cost_savings
  ADD CONSTRAINT cost_savings_cir_id_foreign
  FOREIGN KEY (cir_id) REFERENCES circuits(cir_id) ON DELETE SET NULL;

-- Record this migration in the knex migrations table
INSERT INTO knex_migrations (name, batch, migration_time)
VALUES ('20260309100000_cir_id_pk.js',
        (SELECT COALESCE(MAX(batch), 0) + 1 FROM (SELECT batch FROM knex_migrations) AS t),
        NOW());

-- ============================================================
-- Verification: Confirm renamed columns exist
-- ============================================================
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'circuits'   AND column_name IN ('cir_id','circuit_id');
-- Expected: 2 rows
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name IN ('orders','line_items','cost_savings')
--   AND column_name = 'cir_id';
-- Expected: 3 rows
-- ============================================================
