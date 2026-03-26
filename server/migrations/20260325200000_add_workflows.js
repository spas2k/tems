exports.up = async function (knex) {
  await knex.schema.createTable('workflow_runs', (t) => {
    t.increments('workflow_runs_id').primary();
    t.string('workflow_key').notNullable();        // e.g. 'assign_invoice'
    t.string('workflow_name').notNullable();        // display name
    t.string('status').notNullable().defaultTo('running'); // running | success | failed
    t.integer('triggered_by').unsigned().references('users_id').inTable('users').onDelete('SET NULL');
    t.jsonb('context');                            // arbitrary input params (invoice_id, target_user, etc.)
    t.string('error_message');
    t.timestamp('started_at').defaultTo(knex.fn.now());
    t.timestamp('finished_at');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('workflow_steps', (t) => {
    t.increments('workflow_steps_id').primary();
    t.integer('workflow_runs_id').unsigned().notNullable()
      .references('workflow_runs_id').inTable('workflow_runs').onDelete('CASCADE');
    t.integer('step').notNullable();               // sequential step number
    t.string('type').notNullable();                // process | decision | start | end
    t.string('label').notNullable();               // short label for flowchart node
    t.text('instruction');                         // description of what the step does
    t.string('status').notNullable().defaultTo('pending'); // success | failed | skipped | pending
    t.text('status_detail');                       // optional detail / error message
    t.timestamp('executed_at');
    t.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('workflow_steps');
  await knex.schema.dropTableIfExists('workflow_runs');
};
