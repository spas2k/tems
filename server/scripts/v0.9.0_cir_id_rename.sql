-- ============================================================
-- TEMS v0.9.0 Database Update — Circuit PK Rename (PostgreSQL)
-- Date: 2026-03-09
-- Description: Rename circuits PK from circuits_id → cir_id,
--              rename circuit_number → circuit_id (varchar),
--              rename FK column in child tables (orders, line_items,
--              cost_savings) from circuits_id → cir_id.
-- ============================================================
--
-- IMPORTANT: Back up your database before running this script.
--
-- ============================================================

-- ── 1. Drop FK constraints from child tables ──
ALTER TABLE line_items  DROP CONSTRAINT IF EXISTS line_items_circuits_id_foreign;
ALTER TABLE cost_savings DROP CONSTRAINT IF EXISTS cost_savings_circuits_id_foreign;

-- ── 2. Rename PK column in circuits table ──
ALTER TABLE circuits    RENAME COLUMN circuits_id    TO cir_id;

-- ── 3. Rename circuit_number → circuit_id (regular varchar) ──
ALTER TABLE circuits    RENAME COLUMN circuit_number TO circuit_id;

-- ── 4. Rename FK columns in child tables ──
ALTER TABLE orders      RENAME COLUMN circuits_id TO cir_id;
ALTER TABLE line_items  RENAME COLUMN circuits_id TO cir_id;
ALTER TABLE cost_savings RENAME COLUMN circuits_id TO cir_id;

-- ── 5. Recreate FK constraints with new column name ──
ALTER TABLE line_items
  ADD CONSTRAINT line_items_cir_id_foreign
  FOREIGN KEY (cir_id) REFERENCES circuits(cir_id) ON DELETE SET NULL;

ALTER TABLE cost_savings
  ADD CONSTRAINT cost_savings_cir_id_foreign
  FOREIGN KEY (cir_id) REFERENCES circuits(cir_id) ON DELETE SET NULL;
