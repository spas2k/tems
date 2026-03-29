/**
 * @file Add notification_types table for admin-managed notification settings.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('notification_types', table => {
    table.increments('notification_types_id').primary();
    table.string('key').notNullable().unique();
    table.string('name').notNullable();
    table.text('description');
    table.string('category').notNullable().defaultTo('system');
    table.string('default_type').notNullable().defaultTo('info');
    table.boolean('in_app_enabled').notNullable().defaultTo(true);
    table.boolean('email_enabled').notNullable().defaultTo(false);
    table.boolean('is_system').notNullable().defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Seed built-in notification types
  await knex('notification_types').insert([
    {
      key: 'invoice_assigned',
      name: 'Invoice Assigned',
      description: 'Sent when an invoice is assigned to a user for review.',
      category: 'invoices',
      default_type: 'info',
      in_app_enabled: true,
      email_enabled: true,
      is_system: true,
    },
    {
      key: 'ticket_assigned',
      name: 'Ticket Assigned',
      description: 'Sent when a ticket or issue is assigned to a user.',
      category: 'tickets',
      default_type: 'info',
      in_app_enabled: true,
      email_enabled: true,
      is_system: true,
    },
    {
      key: 'contract_expiry',
      name: 'Contract Expiration Alert',
      description: 'Shown when a contract is expiring within 90 days or has already expired.',
      category: 'contracts',
      default_type: 'warning',
      in_app_enabled: true,
      email_enabled: false,
      is_system: true,
    },
    {
      key: 'rate_variance',
      name: 'Rate Variance Detected',
      description: 'Shown when line items have billing rate variances against contracted rates.',
      category: 'invoices',
      default_type: 'warning',
      in_app_enabled: true,
      email_enabled: false,
      is_system: true,
    },
    {
      key: 'open_disputes',
      name: 'Open Disputes',
      description: 'Shown when there are unresolved disputes that need attention.',
      category: 'contracts',
      default_type: 'info',
      in_app_enabled: true,
      email_enabled: false,
      is_system: true,
    },
    {
      key: 'approval_needed',
      name: 'Approval Needed',
      description: 'Sent when an item requires the user\'s approval.',
      category: 'invoices',
      default_type: 'warning',
      in_app_enabled: true,
      email_enabled: true,
      is_system: true,
    },
    {
      key: 'status_changed',
      name: 'Status Changed',
      description: 'Sent when an entity\'s status changes (e.g. invoice approved, ticket closed).',
      category: 'system',
      default_type: 'info',
      in_app_enabled: true,
      email_enabled: false,
      is_system: true,
    },
    {
      key: 'announcement',
      name: 'System Announcement',
      description: 'System-wide announcement broadcast to all users.',
      category: 'system',
      default_type: 'info',
      in_app_enabled: true,
      email_enabled: true,
      is_system: true,
    },
  ]);
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('notification_types');
};
