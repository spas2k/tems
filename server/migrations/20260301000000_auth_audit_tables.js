// ============================================================
// Migration: Auth & Audit Tables
// Creates users, roles, permissions, role_permissions, audit_log
// ============================================================

exports.up = async function (knex) {
  await knex.schema

    // ── roles ──────────────────────────────────────────────
    .createTable('roles', t => {
      t.increments('roles_id').primary();
      t.string('name', 60).notNullable().unique();
      t.string('description', 255);
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })

    // ── permissions ────────────────────────────────────────
    .createTable('permissions', t => {
      t.increments('permissions_id').primary();
      t.string('resource', 80).notNullable();   // e.g. 'accounts', 'contracts', 'invoices'
      t.string('action', 40).notNullable();      // e.g. 'create', 'read', 'update', 'delete'
      t.string('description', 255);
      t.unique(['resource', 'action']);
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })

    // ── role_permissions (junction) ────────────────────────
    .createTable('role_permissions', t => {
      t.increments('role_permissions_id').primary();
      t.integer('roles_id').unsigned().notNullable()
        .references('roles_id').inTable('roles').onDelete('CASCADE');
      t.integer('permissions_id').unsigned().notNullable()
        .references('permissions_id').inTable('permissions').onDelete('CASCADE');
      t.unique(['roles_id', 'permissions_id']);
    })

    // ── users ──────────────────────────────────────────────
    .createTable('users', t => {
      t.increments('users_id').primary();
      t.string('email', 255).notNullable().unique();
      t.string('display_name', 120).notNullable();
      t.string('sso_subject', 255).nullable();       // Future: IdP subject/OID
      t.string('sso_provider', 80).nullable();        // Future: 'azure_ad', 'okta', etc.
      t.integer('roles_id').unsigned().notNullable()
        .references('roles_id').inTable('roles').onDelete('RESTRICT');
      t.string('status', 30).notNullable().defaultTo('Active');
      t.string('avatar_url', 500).nullable();
      t.timestamp('last_login').nullable();
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('updated_at').defaultTo(knex.fn.now());
      t.index('sso_subject');
      t.index('status');
    })

    // ── audit_log ──────────────────────────────────────────
    .createTable('audit_log', t => {
      t.increments('audit_log_id').primary();
      t.integer('users_id').unsigned().nullable()
        .references('users_id').inTable('users').onDelete('SET NULL');
      t.string('action', 20).notNullable();          // 'CREATE', 'UPDATE', 'DELETE'
      t.string('resource', 80).notNullable();         // table name
      t.integer('resource_id').unsigned().nullable();  // PK of affected row
      t.json('old_values').nullable();                 // snapshot before change
      t.json('new_values').nullable();                 // snapshot after change
      t.string('ip_address', 45).nullable();
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.index('resource');
      t.index('users_id');
      t.index('created_at');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('audit_log')
    .dropTableIfExists('users')
    .dropTableIfExists('role_permissions')
    .dropTableIfExists('permissions')
    .dropTableIfExists('roles');
};
