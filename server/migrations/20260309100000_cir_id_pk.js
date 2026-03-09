// ============================================================
// Migration: Change circuits PK from circuits_id → cir_id
//            Rename circuit_number → circuit_id (regular varchar)
//            Rename circuits_id FK column in child tables → cir_id
// ============================================================

exports.up = async function (knex) {
  await knex.raw('ALTER TABLE line_items DROP CONSTRAINT IF EXISTS line_items_circuits_id_foreign');
  await knex.raw('ALTER TABLE cost_savings DROP CONSTRAINT IF EXISTS cost_savings_circuits_id_foreign');

  await knex.raw('ALTER TABLE circuits RENAME COLUMN circuits_id TO cir_id');
  await knex.raw('ALTER TABLE circuits RENAME COLUMN circuit_number TO circuit_id');
  await knex.raw('ALTER TABLE orders RENAME COLUMN circuits_id TO cir_id');
  await knex.raw('ALTER TABLE line_items RENAME COLUMN circuits_id TO cir_id');
  await knex.raw('ALTER TABLE cost_savings RENAME COLUMN circuits_id TO cir_id');

  await knex.raw('ALTER TABLE line_items ADD CONSTRAINT line_items_cir_id_foreign FOREIGN KEY (cir_id) REFERENCES circuits(cir_id) ON DELETE SET NULL');
  await knex.raw('ALTER TABLE cost_savings ADD CONSTRAINT cost_savings_cir_id_foreign FOREIGN KEY (cir_id) REFERENCES circuits(cir_id) ON DELETE SET NULL');
};

exports.down = async function (knex) {
  await knex.raw('ALTER TABLE line_items DROP CONSTRAINT IF EXISTS line_items_cir_id_foreign');
  await knex.raw('ALTER TABLE cost_savings DROP CONSTRAINT IF EXISTS cost_savings_cir_id_foreign');

  await knex.raw('ALTER TABLE circuits RENAME COLUMN cir_id TO circuits_id');
  await knex.raw('ALTER TABLE circuits RENAME COLUMN circuit_id TO circuit_number');
  await knex.raw('ALTER TABLE orders RENAME COLUMN cir_id TO circuits_id');
  await knex.raw('ALTER TABLE line_items RENAME COLUMN cir_id TO circuits_id');
  await knex.raw('ALTER TABLE cost_savings RENAME COLUMN cir_id TO circuits_id');

  await knex.raw('ALTER TABLE line_items ADD CONSTRAINT line_items_circuits_id_foreign FOREIGN KEY (circuits_id) REFERENCES circuits(circuits_id) ON DELETE SET NULL');
  await knex.raw('ALTER TABLE cost_savings ADD CONSTRAINT cost_savings_circuits_id_foreign FOREIGN KEY (circuits_id) REFERENCES circuits(circuits_id) ON DELETE SET NULL');
};
