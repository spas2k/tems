// ============================================================
// Migration: Ticketing System
// Creates tickets and ticket_comments tables
// ============================================================

exports.up = async function (knex) {
  await knex.schema.createTable('tickets', (t) => {
    t.increments('tickets_id').primary();
    t.string('ticket_number', 30).notNullable().unique();
    t.string('title', 255).notNullable();
    t.text('description');
    t.string('category', 80).notNullable().defaultTo('Other');
    // Low | Medium | High | Critical
    t.string('priority', 20).notNullable().defaultTo('Medium');
    // Open | In Progress | Pending Vendor | Pending Internal | Resolved | Closed
    t.string('status', 40).notNullable().defaultTo('Open');
    // Source record linkback
    t.string('source_entity_type', 50).nullable();   // invoice | circuit | contract | order | account | dispute
    t.integer('source_entity_id').unsigned().nullable();
    t.string('source_label', 255).nullable();         // human-readable (e.g. invoice number)
    // Assignment + creator
    t.integer('assigned_users_id').unsigned().nullable()
      .references('users_id').inTable('users').onDelete('SET NULL');
    t.string('created_by', 150);
    // Dates
    t.date('due_date').nullable();
    t.date('resolved_date').nullable();
    // Resolution
    t.text('resolution').nullable();
    // Tags (comma-delimited)
    t.string('tags', 500).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());

    t.index(['status'],                          'idx_tickets_status');
    t.index(['priority'],                        'idx_tickets_priority');
    t.index(['assigned_users_id'],               'idx_tickets_assigned');
    t.index(['source_entity_type', 'source_entity_id'], 'idx_tickets_source');
    t.index(['created_by'],                      'idx_tickets_created_by');
  });

  await knex.schema.createTable('ticket_comments', (t) => {
    t.increments('ticket_comments_id').primary();
    t.integer('tickets_id').unsigned().notNullable()
      .references('tickets_id').inTable('tickets').onDelete('CASCADE');
    t.string('author', 150).notNullable();
    t.text('content').notNullable();
    // comment | status_change | assignment | resolution | note
    t.string('comment_type', 30).notNullable().defaultTo('comment');
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.index(['tickets_id'], 'idx_tc_ticket');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('ticket_comments');
  await knex.schema.dropTableIfExists('tickets');
};
