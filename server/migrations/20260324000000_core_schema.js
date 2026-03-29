exports.up = async function(knex) {
  // Support & Reference Tables
  await knex.schema.createTable('currencies', t => {
    t.increments('currencies_id').primary();
    t.string('currency_code', 3).unique().notNullable();
    t.string('name').notNullable();
    t.string('symbol', 10).notNullable();
    t.string('status').defaultTo('Active');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('company_codes', t => {
    t.increments('company_codes_id').primary();
    t.string('name').notNullable();
    t.string('code');
    t.string('description');
    t.string('entity_type');
    t.string('country').defaultTo('USA');
    t.string('currency').defaultTo('USD');
    t.string('status').defaultTo('Active');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('locations', t => {
    t.increments('locations_id').primary();
    t.string('name').notNullable();
    t.string('site_code');
    t.string('site_type');
    t.string('address');
    t.string('city');
    t.string('state');
    t.string('zip');
    t.string('country').defaultTo('USA');
    t.string('contact_name');
    t.string('contact_phone');
    t.string('contact_email');
    t.string('status').defaultTo('Active');
    t.text('notes');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('bank_cost_centers', t => {
    t.increments('bank_cost_centers_id').primary();
    t.string('name').notNullable();
    t.string('code');
    t.string('description');
    t.string('department');
    t.string('manager');
    t.string('status').defaultTo('Active');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('spend_categories', t => {
    t.increments('spend_categories_id').primary();
    t.string('name').notNullable();
    t.string('code');
    t.string('description');
    t.integer('parent_id').unsigned().references('spend_categories_id').inTable('spend_categories').onDelete('SET NULL');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('field_catalog', t => {
    t.increments('field_catalog_id').primary();
    t.string('category').notNullable();
    t.string('label').notNullable();
    t.string('value').notNullable();
    t.string('description');
    t.integer('sort_order').defaultTo(0);
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('projects', t => {
    t.increments('projects_id').primary();
    t.string('name').notNullable();
    t.string('code');
    t.string('description');
    t.string('project_type');
    t.string('status').defaultTo('Active');
    t.string('manager');
    t.date('start_date');
    t.date('end_date');
    t.decimal('budget', 14, 2);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('roles', t => {
    t.increments('roles_id').primary();
    t.string('name').unique().notNullable();
    t.string('description');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('permissions', t => {
    t.increments('permissions_id').primary();
    t.string('resource').notNullable();
    t.string('action').notNullable();
    t.string('description');
    t.timestamps(true, true);
    t.unique(['resource', 'action']);
  });

  await knex.schema.createTable('role_permissions', t => {
    t.increments('role_permissions_id').primary();
    t.integer('roles_id').unsigned().notNullable().references('roles_id').inTable('roles').onDelete('CASCADE');
    t.integer('permissions_id').unsigned().notNullable().references('permissions_id').inTable('permissions').onDelete('CASCADE');
    t.unique(['roles_id', 'permissions_id']);
  });

  await knex.schema.createTable('users', t => {
    t.increments('users_id').primary();
    t.string('email').unique().notNullable();
    t.string('display_name').notNullable();
    t.string('sso_subject');
    t.string('sso_provider');
    t.integer('roles_id').unsigned().notNullable().references('roles_id').inTable('roles').onDelete('RESTRICT');
    t.string('status').defaultTo('Active');
    t.string('avatar_url');
    t.timestamp('last_login');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('user_favorites', t => {
    t.increments('user_favorites_id').primary();
    t.integer('users_id').unsigned().notNullable().references('users_id').inTable('users').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('path').notNullable();
    t.jsonb('filters');
    t.text('filter_summary');
    t.string('icon');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('audit_log', t => {
    t.increments('audit_log_id').primary();
    t.integer('users_id').unsigned().references('users_id').inTable('users').onDelete('SET NULL');
    t.string('action').notNullable();
    t.string('resource').notNullable();
    t.string('resource_id');
    t.jsonb('old_values');
    t.jsonb('new_values');
    t.string('ip_address');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('announcements', t => {
    t.increments('announcements_id').primary();
    t.string('title').notNullable();
    t.text('message').notNullable();
    t.string('type').defaultTo('info');
    t.boolean('is_active').defaultTo(true);
    t.timestamp('start_date');
    t.timestamp('end_date');
    t.integer('created_by').unsigned().references('users_id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('form_instructions', t => {
    t.increments('id').primary();
    t.string('form_id').notNullable().unique();
    t.text('instruction').notNullable();
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('vendors', t => {
    t.increments('vendors_id').primary();
    t.string('name').notNullable();
    t.string('vendor_number');
    t.string('vendor_type');
    t.string('contact_name');
    t.string('contact_email');
    t.string('contact_phone');
    t.string('country');
    t.integer('currency_id').unsigned().references('currencies_id').inTable('currencies');
    t.string('tier');
    t.boolean('fourth_party_vendor').defaultTo(false);
    t.string('website');
    t.string('status').defaultTo('Active');
    t.integer('created_by').unsigned().references('users_id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('vendor_remit', t => {
    t.increments('vendor_remit_id').primary();
    t.integer('vendors_id').unsigned().references('vendors_id').inTable('vendors').onDelete('RESTRICT');
    t.string('remit_name').notNullable();
    t.string('remit_code');
    t.string('payment_method').defaultTo('ACH');
    t.string('bank_name');
    t.string('routing_number');
    t.string('bank_account_number');
    t.string('remit_address');
    t.string('remit_city');
    t.string('remit_state');
    t.string('remit_zip');
    t.string('status').defaultTo('Active');
    t.text('notes');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('invoice_reader_templates', t => {
    t.increments('invoice_reader_templates_id').primary();
    t.integer('vendors_id').unsigned().references('vendors_id').inTable('vendors').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('format_type').notNullable();
    t.jsonb('config').notNullable();
    t.string('status').defaultTo('Active');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('invoice_reader_uploads', t => {
    t.increments('invoice_reader_uploads_id').primary();
    t.integer('invoice_reader_templates_id').unsigned().references('invoice_reader_templates_id').inTable('invoice_reader_templates').onDelete('SET NULL');
    t.integer('vendors_id').unsigned().references('vendors_id').inTable('vendors').onDelete('CASCADE');
    t.string('file_name').notNullable();
    t.string('format_type').notNullable();
    t.string('status').defaultTo('Pending');
    t.integer('total_rows').defaultTo(0);
    t.integer('inserted_invoices').defaultTo(0);
    t.integer('inserted_line_items').defaultTo(0);
    t.integer('error_count').defaultTo(0);
    t.jsonb('errors');
    t.timestamp('completed_at');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('accounts', t => {
    t.increments('accounts_id').primary();
    t.integer('vendors_id').unsigned().notNullable().references('vendors_id').inTable('vendors').onDelete('CASCADE');
    t.string('name');
    t.string('account_number').notNullable();
    t.string('subaccount_number');
    t.integer('assigned_user_id').unsigned().references('users_id').inTable('users').onDelete('SET NULL');
    t.string('team');
    t.string('account_hierarchy');
    t.integer('parent_account_id').unsigned().references('accounts_id').inTable('accounts').onDelete('SET NULL');
    t.string('account_type');
    t.string('account_subtype');
    t.integer('currency_id').unsigned().references('currencies_id').inTable('currencies').onDelete('SET NULL');
    t.integer('company_code_id').unsigned().references('company_codes_id').inTable('company_codes').onDelete('SET NULL');
    t.integer('ship_to_location_id').unsigned().references('locations_id').inTable('locations').onDelete('SET NULL');
    t.integer('asset_location_id').unsigned().references('locations_id').inTable('locations').onDelete('SET NULL');
    t.integer('tax_analyst_id').unsigned().references('users_id').inTable('users').onDelete('SET NULL');
    t.text('payment_info');
    t.text('allocation_settings');
    t.text('contact_details');
    t.string('status').defaultTo('Active');
    t.integer('created_by').unsigned().references('users_id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('contracts', t => {
    t.increments('contracts_id').primary();
    t.integer('vendors_id').unsigned().notNullable().references('vendors_id').inTable('vendors').onDelete('RESTRICT');
    t.string('contract_number');
    t.string('contract_name');
    t.string('type');
    t.string('subtype');
    t.integer('parent_contract_id').unsigned().references('contracts_id').inTable('contracts').onDelete('SET NULL');
    t.integer('currency_id').unsigned().references('currencies_id').inTable('currencies').onDelete('SET NULL');
    t.string('contract_record_url');
    t.date('start_date');
    t.date('expiration_date');
    t.string('term_type');
    t.date('renew_date');
    t.decimal('contracted_rate', 14, 2);
    t.string('rate_unit');
    t.integer('term_months');
    t.decimal('minimum_spend', 14, 2);
    t.decimal('etf_amount', 14, 2);
    t.string('commitment_type');
    t.decimal('contract_value', 14, 2);
    t.boolean('tax_assessed').defaultTo(false);
    t.string('product_service_types');
    t.string('business_line');
    t.string('status').defaultTo('Active');
    t.boolean('auto_renew').defaultTo(false);
    t.integer('created_by').unsigned().references('users_id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('usoc_codes', t => {
    t.increments('usoc_codes_id').primary();
    t.string('usoc_code').unique().notNullable();
    t.string('description').notNullable();
    t.string('category');
    t.string('sub_category');
    t.decimal('default_mrc', 14, 2);
    t.decimal('default_nrc', 14, 2);
    t.string('unit');
    t.string('status').defaultTo('Active');
  });

  await knex.schema.createTable('contract_rates', t => {
    t.increments('contract_rates_id').primary();
    t.integer('contracts_id').unsigned().notNullable().references('contracts_id').inTable('contracts').onDelete('CASCADE');
    t.integer('usoc_codes_id').unsigned().notNullable().references('usoc_codes_id').inTable('usoc_codes').onDelete('RESTRICT');
    t.decimal('mrc', 14, 2);
    t.decimal('nrc', 14, 2);
    t.date('effective_date');
    t.date('expiration_date');
    t.text('notes');
    t.unique(['contracts_id', 'usoc_codes_id', 'effective_date']);
  });

  // orders -> temporarily no inventory_id FK
  await knex.schema.createTable('orders', t => {
    t.increments('orders_id').primary();
    t.integer('vendors_id').unsigned().notNullable().references('vendors_id').inTable('vendors').onDelete('RESTRICT');
    t.integer('contracts_id').unsigned().notNullable().references('contracts_id').inTable('contracts').onDelete('RESTRICT');
    t.integer('inventory_id').unsigned(); // will alter later
    t.string('order_number').notNullable();
    t.string('description');
    t.decimal('contracted_rate', 14, 2);
    t.date('order_date');
    t.date('due_date');
    t.string('status').defaultTo('Pending');
    t.text('notes');
    t.integer('assigned_users_id').unsigned().references('users_id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('inventory', t => {
    t.increments('inventory_id').primary();
    t.integer('accounts_id').unsigned().notNullable().references('accounts_id').inTable('accounts').onDelete('RESTRICT');
    t.integer('contracts_id').unsigned().notNullable().references('contracts_id').inTable('contracts').onDelete('RESTRICT');
    t.integer('orders_id').unsigned().references('orders_id').inTable('orders').onDelete('SET NULL');
    t.string('inventory_number').notNullable();
    t.string('type');
    t.string('bandwidth');
    t.string('location');
    t.decimal('contracted_rate', 14, 2);
    t.string('status').defaultTo('Active');
    t.date('install_date');
    t.date('disconnect_date');
    t.timestamps(true, true);
  });

  // Add circular FK
  await knex.schema.alterTable('orders', t => {
    t.foreign('inventory_id').references('inventory_id').inTable('inventory').onDelete('SET NULL');
  });

  await knex.schema.createTable('invoices', t => {
    t.increments('invoices_id').primary();
    t.integer('accounts_id').unsigned().notNullable().references('accounts_id').inTable('accounts').onDelete('RESTRICT');
    t.string('invoice_number').notNullable();
    t.date('invoice_date');
    t.date('due_date');
    t.date('period_start');
    t.date('period_end');
    t.decimal('total_amount', 14, 2).notNullable().defaultTo(0);
    t.string('status').defaultTo('Unpaid');
    t.date('payment_date');
    t.integer('assigned_users_id').unsigned().references('users_id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('line_items', t => {
    t.increments('line_items_id').primary();
    t.integer('invoices_id').unsigned().notNullable().references('invoices_id').inTable('invoices').onDelete('CASCADE');
    t.integer('inventory_id').unsigned().references('inventory_id').inTable('inventory').onDelete('SET NULL');
    t.integer('usoc_codes_id').unsigned().references('usoc_codes_id').inTable('usoc_codes').onDelete('SET NULL');
    t.string('description');
    t.string('charge_type');
    t.decimal('amount', 14, 2).notNullable();
    t.decimal('mrc_amount', 14, 2);
    t.decimal('nrc_amount', 14, 2);
    t.decimal('contracted_rate', 14, 2);
    t.decimal('variance', 14, 2);
    t.string('audit_status');
    t.date('period_start');
    t.date('period_end');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('allocations', t => {
    t.increments('allocations_id').primary();
    t.integer('line_items_id').unsigned().notNullable().references('line_items_id').inTable('line_items').onDelete('CASCADE');
    t.string('cost_center');
    t.string('department');
    t.decimal('percentage', 5, 2);
    t.decimal('allocated_amount', 14, 2);
    t.text('notes');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('cost_savings', t => {
    t.increments('cost_savings_id').primary();
    t.integer('vendors_id').unsigned().notNullable().references('vendors_id').inTable('vendors').onDelete('RESTRICT');
    t.integer('inventory_id').unsigned().references('inventory_id').inTable('inventory').onDelete('SET NULL');
    t.integer('line_items_id').unsigned().references('line_items_id').inTable('line_items').onDelete('SET NULL');
    t.integer('invoices_id').unsigned().references('invoices_id').inTable('invoices').onDelete('SET NULL');
    t.string('category');
    t.string('description');
    t.date('identified_date');
    t.string('status');
    t.decimal('projected_savings', 14, 2);
    t.decimal('realized_savings', 14, 2);
    t.text('notes');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('disputes', t => {
    t.increments('disputes_id').primary();
    t.integer('line_items_id').unsigned().references('line_items_id').inTable('line_items').onDelete('SET NULL');
    t.integer('invoices_id').unsigned().notNullable().references('invoices_id').inTable('invoices').onDelete('CASCADE');
    t.integer('vendors_id').unsigned().notNullable().references('vendors_id').inTable('vendors').onDelete('CASCADE');
    t.string('dispute_type').defaultTo('Overcharge');
    t.decimal('amount', 14, 2).notNullable();
    t.string('status').defaultTo('Open');
    t.date('filed_date').notNullable();
    t.date('resolved_date');
    t.text('resolution_notes');
    t.decimal('credit_amount', 14, 2);
    t.string('reference_number');
    t.text('notes');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('tickets', t => {
    t.increments('tickets_id').primary();
    t.string('ticket_number').unique().notNullable();
    t.string('title').notNullable();
    t.text('description');
    t.string('category').defaultTo('Other');
    t.string('priority').defaultTo('Medium');
    t.string('status').defaultTo('Open');
    t.string('source_entity_type');
    t.integer('source_entity_id');
    t.string('source_entity_label');
    t.integer('assigned_users_id').unsigned().references('users_id').inTable('users').onDelete('SET NULL');
    t.string('created_by');
    t.date('due_date');
    t.date('resolved_date');
    t.text('resolution');
    t.string('tags');
    t.string('environment');
    t.text('steps_to_reproduce');
    t.text('expected_behavior');
    t.text('actual_behavior');
    t.text('console_errors');
    t.string('browser_info');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('ticket_comments', t => {
    t.increments('ticket_comments_id').primary();
    t.integer('tickets_id').unsigned().notNullable().references('tickets_id').inTable('tickets').onDelete('CASCADE');
    t.string('author').notNullable();
    t.text('content').notNullable();
    t.string('comment_type').defaultTo('comment');
    t.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  // Alter order first to break cyclic dependency
  await knex.schema.alterTable('orders', t => {
    t.dropForeign('inventory_id');
  });

  const tables = [
    'ticket_comments', 'tickets', 'disputes', 'cost_savings', 'allocations', 
    'line_items', 'invoices', 'inventory', 'orders', 'contract_rates', 
    'usoc_codes', 'contracts', 'accounts', 'invoice_reader_uploads', 
    'invoice_reader_templates', 'vendor_remit', 'vendors', 'form_instructions',
    'announcements', 'audit_log', 'user_favorites', 'users', 'role_permissions',
    'permissions', 'roles', 'projects', 'field_catalog', 'spend_categories',
    'bank_cost_centers', 'locations', 'company_codes', 'currencies'
  ];

  for (let table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
