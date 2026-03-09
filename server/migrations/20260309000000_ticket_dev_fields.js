// ============================================================
// Migration: Add developer-focused fields to tickets
// environment, steps_to_reproduce, expected/actual behavior,
// console_errors, browser_info
// ============================================================

exports.up = async function (knex) {
  await knex.schema.alterTable('tickets', (t) => {
    t.string('environment', 80).nullable();
    t.text('steps_to_reproduce').nullable();
    t.text('expected_behavior').nullable();
    t.text('actual_behavior').nullable();
    t.text('console_errors').nullable();
    t.string('browser_info', 500).nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('tickets', (t) => {
    t.dropColumn('browser_info');
    t.dropColumn('console_errors');
    t.dropColumn('actual_behavior');
    t.dropColumn('expected_behavior');
    t.dropColumn('steps_to_reproduce');
    t.dropColumn('environment');
  });
};
