/**
 * Migration: report_jobs table for background report exports.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('report_jobs', t => {
    t.increments('report_jobs_id').primary();
    t.integer('users_id').unsigned().references('users_id').inTable('users').onDelete('SET NULL');
    t.string('name', 200).notNullable();
    t.text('config').notNullable();                // JSON report config (same shape as POST /reports/run)
    t.string('format', 10).notNullable().defaultTo('csv');  // csv | xlsx
    t.string('status', 20).notNullable().defaultTo('queued'); // queued | running | completed | failed
    t.integer('total_rows').defaultTo(0);
    t.integer('row_limit').defaultTo(100000);
    t.string('file_path', 500);                    // path to generated file
    t.bigInteger('file_size').defaultTo(0);
    t.text('error_message');
    t.string('email_to', 500);                     // optional email recipient
    t.boolean('email_sent').defaultTo(false);
    t.timestamp('started_at');
    t.timestamp('completed_at');
    t.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('report_jobs');
};
