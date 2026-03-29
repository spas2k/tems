exports.up = async function (knex) {
  // Admin-editable SMTP / email settings (single-row config)
  await knex.schema.createTable('email_config', t => {
    t.increments('email_config_id').primary();
    t.boolean('enabled').notNullable().defaultTo(false);
    t.string('smtp_host', 255);
    t.integer('smtp_port').defaultTo(587);
    t.boolean('smtp_secure').defaultTo(false);           // true = implicit TLS (465), false = STARTTLS (587)
    t.string('smtp_user', 255);
    t.string('smtp_pass', 512);                          // encrypted at-rest recommendations deferred to org policy
    t.string('from_address', 255).defaultTo('tems-noreply@example.com');
    t.string('from_name', 120).defaultTo('TEMS');
    t.string('reply_to', 255);
    t.boolean('require_tls').defaultTo(true);
    t.boolean('reject_unauthorized').defaultTo(true);    // reject self-signed certs
    // Notification toggles
    t.boolean('notify_invoice_assigned').defaultTo(true);
    t.boolean('notify_approval_needed').defaultTo(true);
    t.boolean('notify_status_changed').defaultTo(true);
    t.boolean('notify_user_created').defaultTo(true);
    t.boolean('notify_user_suspended').defaultTo(true);
    t.boolean('notify_role_changed').defaultTo(true);
    t.boolean('notify_announcements').defaultTo(true);
    t.boolean('notify_digest').defaultTo(false);
    t.timestamps(true, true);
  });

  // Log every email send attempt for audit / troubleshooting
  await knex.schema.createTable('email_log', t => {
    t.increments('email_log_id').primary();
    t.integer('users_id').unsigned().references('users_id').inTable('users').onDelete('SET NULL');
    t.integer('notifications_id').unsigned().references('notifications_id').inTable('notifications').onDelete('SET NULL');
    t.string('to_address', 255).notNullable();
    t.string('subject', 500).notNullable();
    t.text('body');
    t.string('status', 30).notNullable().defaultTo('pending'); // pending, sent, failed
    t.text('error_message');
    t.string('smtp_response', 500);
    t.integer('retry_count').defaultTo(0);
    t.timestamp('sent_at');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Per-user notification preferences (opt-out model)
  await knex.schema.createTable('notification_preferences', t => {
    t.increments('notification_preferences_id').primary();
    t.integer('users_id').unsigned().notNullable().references('users_id').inTable('users').onDelete('CASCADE');
    t.boolean('email_enabled').defaultTo(true);
    t.boolean('in_app_enabled').defaultTo(true);
    t.boolean('email_invoice_assigned').defaultTo(true);
    t.boolean('email_approval_needed').defaultTo(true);
    t.boolean('email_status_changed').defaultTo(true);
    t.boolean('email_user_management').defaultTo(true);
    t.boolean('email_announcements').defaultTo(true);
    t.boolean('email_digest').defaultTo(false);
    t.timestamps(true, true);
    t.unique('users_id');
  });

  // Seed a default (disabled) email config row
  await knex('email_config').insert({
    enabled: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    from_address: 'tems-noreply@example.com',
    from_name: 'TEMS',
    require_tls: true,
    reject_unauthorized: true,
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('email_log');
  await knex.schema.dropTableIfExists('email_config');
};
