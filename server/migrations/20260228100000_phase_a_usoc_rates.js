/**
 * TEMS — Phase A Migration: USOC Codes, Contract Rates, Line Item Enhancements
 *
 * New tables:
 *   usoc_codes      — Master catalog of Universal Service Order Codes
 *   contract_rates  — Per-USOC contracted rates within a contract
 *
 * Altered tables:
 *   contracts  — minimum_spend, etf_amount, commitment_type
 *   line_items — usoc_codes_id FK, mrc_amount, nrc_amount, audit_status
 *
 * Run:  npx knex migrate:latest
 * Undo: npx knex migrate:rollback
 */

exports.up = async function (knex) {
  // ── usoc_codes ────────────────────────────────────────────
  await knex.schema.createTable('usoc_codes', (t) => {
    t.increments('usoc_codes_id').primary();
    t.string('usoc_code', 20).notNullable().unique();
    t.string('description', 255).notNullable();
    t.string('category', 80);                          // e.g. Access, Transport, Feature, Equipment, Surcharge
    t.string('sub_category', 80);                      // optional granularity
    t.decimal('default_mrc', 12, 2).defaultTo(0);     // default monthly recurring charge
    t.decimal('default_nrc', 12, 2).defaultTo(0);     // default non-recurring charge
    t.string('unit', 60);                              // e.g. per circuit, per line, per GB
    t.string('status', 30).notNullable().defaultTo('Active');

    t.index('category', 'idx_usoc_category');
    t.index('status', 'idx_usoc_status');
  });

  // ── contract_rates ────────────────────────────────────────
  await knex.schema.createTable('contract_rates', (t) => {
    t.increments('contract_rates_id').primary();
    t.integer('contracts_id').unsigned().notNullable()
      .references('contracts_id').inTable('contracts').onDelete('CASCADE');
    t.integer('usoc_codes_id').unsigned().notNullable()
      .references('usoc_codes_id').inTable('usoc_codes').onDelete('RESTRICT');
    t.decimal('mrc', 12, 2).defaultTo(0);             // contracted MRC for this USOC
    t.decimal('nrc', 12, 2).defaultTo(0);             // contracted NRC for this USOC
    t.date('effective_date');                           // when this rate takes effect
    t.date('expiration_date');                         // when this rate expires (null = open-ended)
    t.text('notes');

    t.index('contracts_id', 'idx_cr_contract');
    t.index('usoc_codes_id', 'idx_cr_usoc');
    t.unique(['contracts_id', 'usoc_codes_id', 'effective_date'], { indexName: 'uq_cr_contract_usoc_eff' });
  });

  // ── contracts — add new financial columns ─────────────────
  await knex.schema.alterTable('contracts', (t) => {
    t.decimal('minimum_spend', 12, 2).nullable();
    t.decimal('etf_amount', 12, 2).nullable();
    t.string('commitment_type', 60).nullable();
    // commitment_type: e.g. Volume, Minimum Spend, Revenue, None
  });

  // ── line_items — add USOC FK and MRC/NRC split ────────────
  await knex.schema.alterTable('line_items', (t) => {
    t.integer('usoc_codes_id').unsigned().nullable()
      .references('usoc_codes_id').inTable('usoc_codes').onDelete('SET NULL');
    t.decimal('mrc_amount', 12, 2).nullable();
    t.decimal('nrc_amount', 12, 2).nullable();
    t.string('audit_status', 40).nullable().defaultTo(null);
    // audit_status: Validated, Variance, Unmatched, Orphan, Pending

    t.index('usoc_codes_id', 'idx_li_usoc');
  });
};

exports.down = async function (knex) {
  // ── line_items — remove added columns ─────────────────────
  await knex.schema.alterTable('line_items', (t) => {
    t.dropIndex('usoc_codes_id', 'idx_li_usoc');
    t.dropForeign('usoc_codes_id');
    t.dropColumn('usoc_codes_id');
    t.dropColumn('mrc_amount');
    t.dropColumn('nrc_amount');
    t.dropColumn('audit_status');
  });

  // ── contracts — remove added columns ──────────────────────
  await knex.schema.alterTable('contracts', (t) => {
    t.dropColumn('minimum_spend');
    t.dropColumn('etf_amount');
    t.dropColumn('commitment_type');
  });

  // ── drop new tables ───────────────────────────────────────
  await knex.schema.dropTableIfExists('contract_rates');
  await knex.schema.dropTableIfExists('usoc_codes');
};
