-- ============================================================
-- TEMS — Complete PostgreSQL Schema (consolidated)
-- Generated: 2026-03-26
-- 
-- This script recreates the entire database schema from scratch.
-- It consolidates all Knex migrations into a single idempotent DDL.
--
-- Usage:
--   psql -h <host> -U <user> -d <database> -f rebuild_schema.sql
--
-- WARNING: This will DROP all existing tables and data!
-- ============================================================

BEGIN;

-- ── Drop existing tables in reverse-dependency order ────────

ALTER TABLE IF EXISTS orders DROP CONSTRAINT IF EXISTS orders_inventory_id_foreign;

DROP TABLE IF EXISTS workflow_steps     CASCADE;
DROP TABLE IF EXISTS workflow_runs      CASCADE;
DROP TABLE IF EXISTS saved_reports      CASCADE;
DROP TABLE IF EXISTS notes              CASCADE;
DROP TABLE IF EXISTS notifications      CASCADE;
DROP TABLE IF EXISTS ticket_comments    CASCADE;
DROP TABLE IF EXISTS tickets            CASCADE;
DROP TABLE IF EXISTS disputes           CASCADE;
DROP TABLE IF EXISTS cost_savings       CASCADE;
DROP TABLE IF EXISTS allocations        CASCADE;
DROP TABLE IF EXISTS line_items         CASCADE;
DROP TABLE IF EXISTS invoices           CASCADE;
DROP TABLE IF EXISTS inventory          CASCADE;
DROP TABLE IF EXISTS orders             CASCADE;
DROP TABLE IF EXISTS contract_rates     CASCADE;
DROP TABLE IF EXISTS usoc_codes         CASCADE;
DROP TABLE IF EXISTS contracts          CASCADE;
DROP TABLE IF EXISTS accounts           CASCADE;
DROP TABLE IF EXISTS invoice_reader_exceptions CASCADE;
DROP TABLE IF EXISTS invoice_reader_uploads    CASCADE;
DROP TABLE IF EXISTS invoice_reader_profiles   CASCADE;
DROP TABLE IF EXISTS invoice_reader_templates  CASCADE;
DROP TABLE IF EXISTS vendor_remit       CASCADE;
DROP TABLE IF EXISTS vendors            CASCADE;
DROP TABLE IF EXISTS form_instructions  CASCADE;
DROP TABLE IF EXISTS announcements      CASCADE;
DROP TABLE IF EXISTS audit_log          CASCADE;
DROP TABLE IF EXISTS user_favorites     CASCADE;
DROP TABLE IF EXISTS users              CASCADE;
DROP TABLE IF EXISTS role_permissions   CASCADE;
DROP TABLE IF EXISTS permissions        CASCADE;
DROP TABLE IF EXISTS roles              CASCADE;
DROP TABLE IF EXISTS projects           CASCADE;
DROP TABLE IF EXISTS field_catalog      CASCADE;
DROP TABLE IF EXISTS spend_categories   CASCADE;
DROP TABLE IF EXISTS bank_cost_centers  CASCADE;
DROP TABLE IF EXISTS locations          CASCADE;
DROP TABLE IF EXISTS company_codes      CASCADE;
DROP TABLE IF EXISTS currencies         CASCADE;

-- ── Support & Reference Tables ──────────────────────────────

CREATE TABLE currencies (
    currencies_id     SERIAL PRIMARY KEY,
    currency_code     VARCHAR(3) NOT NULL UNIQUE,
    name              VARCHAR(255) NOT NULL,
    symbol            VARCHAR(10) NOT NULL,
    status            VARCHAR(255) DEFAULT 'Active',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE company_codes (
    company_codes_id  SERIAL PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    code              VARCHAR(255),
    description       VARCHAR(255),
    entity_type       VARCHAR(255),
    country           VARCHAR(255) DEFAULT 'USA',
    currency          VARCHAR(255) DEFAULT 'USD',
    status            VARCHAR(255) DEFAULT 'Active',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE locations (
    locations_id      SERIAL PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    site_code         VARCHAR(255),
    site_type         VARCHAR(255),
    address           VARCHAR(255),
    city              VARCHAR(255),
    state             VARCHAR(255),
    zip               VARCHAR(255),
    country           VARCHAR(255) DEFAULT 'USA',
    contact_name      VARCHAR(255),
    contact_phone     VARCHAR(255),
    contact_email     VARCHAR(255),
    status            VARCHAR(255) DEFAULT 'Active',
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bank_cost_centers (
    bank_cost_centers_id SERIAL PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    code              VARCHAR(255),
    description       VARCHAR(255),
    department        VARCHAR(255),
    manager           VARCHAR(255),
    status            VARCHAR(255) DEFAULT 'Active',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE spend_categories (
    spend_categories_id SERIAL PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    code              VARCHAR(255),
    description       VARCHAR(255),
    parent_id         INTEGER REFERENCES spend_categories(spend_categories_id) ON DELETE SET NULL,
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE field_catalog (
    field_catalog_id  SERIAL PRIMARY KEY,
    category          VARCHAR(255) NOT NULL,
    label             VARCHAR(255) NOT NULL,
    value             VARCHAR(255) NOT NULL,
    description       VARCHAR(255),
    sort_order        INTEGER DEFAULT 0,
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
    projects_id       SERIAL PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    code              VARCHAR(255),
    description       VARCHAR(255),
    project_type      VARCHAR(255),
    status            VARCHAR(255) DEFAULT 'Active',
    manager           VARCHAR(255),
    start_date        DATE,
    end_date          DATE,
    budget            NUMERIC(14,2),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Auth / RBAC ─────────────────────────────────────────────

CREATE TABLE roles (
    roles_id          SERIAL PRIMARY KEY,
    name              VARCHAR(255) NOT NULL UNIQUE,
    description       VARCHAR(255),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    permissions_id    SERIAL PRIMARY KEY,
    resource          VARCHAR(255) NOT NULL,
    action            VARCHAR(255) NOT NULL,
    description       VARCHAR(255),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (resource, action)
);

CREATE TABLE role_permissions (
    role_permissions_id SERIAL PRIMARY KEY,
    roles_id          INTEGER NOT NULL REFERENCES roles(roles_id) ON DELETE CASCADE,
    permissions_id    INTEGER NOT NULL REFERENCES permissions(permissions_id) ON DELETE CASCADE,
    UNIQUE (roles_id, permissions_id)
);

CREATE TABLE users (
    users_id          SERIAL PRIMARY KEY,
    email             VARCHAR(255) NOT NULL UNIQUE,
    display_name      VARCHAR(255) NOT NULL,
    sso_subject       VARCHAR(255),
    sso_provider      VARCHAR(255),
    roles_id          INTEGER NOT NULL REFERENCES roles(roles_id) ON DELETE RESTRICT,
    status            VARCHAR(255) DEFAULT 'Active',
    avatar_url        VARCHAR(255),
    last_login        TIMESTAMPTZ,
    preferences       JSONB DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_favorites (
    user_favorites_id SERIAL PRIMARY KEY,
    users_id          INTEGER NOT NULL REFERENCES users(users_id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    path              VARCHAR(255) NOT NULL,
    filters           JSONB,
    filter_summary    TEXT,
    icon              VARCHAR(255),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit / System ──────────────────────────────────────────

CREATE TABLE audit_log (
    audit_log_id      SERIAL PRIMARY KEY,
    users_id          INTEGER REFERENCES users(users_id) ON DELETE SET NULL,
    action            VARCHAR(255) NOT NULL,
    resource          VARCHAR(255) NOT NULL,
    resource_id       VARCHAR(255),
    old_values        JSONB,
    new_values        JSONB,
    ip_address        VARCHAR(255),
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE announcements (
    announcements_id  SERIAL PRIMARY KEY,
    title             VARCHAR(255) NOT NULL,
    message           TEXT NOT NULL,
    type              VARCHAR(255) DEFAULT 'info',
    is_active         BOOLEAN DEFAULT TRUE,
    start_date        TIMESTAMPTZ,
    end_date          TIMESTAMPTZ,
    created_by        INTEGER REFERENCES users(users_id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE form_instructions (
    id                SERIAL PRIMARY KEY,
    form_name         VARCHAR(255) NOT NULL,
    section_name      VARCHAR(255) NOT NULL,
    content           TEXT,
    status            VARCHAR(255) DEFAULT 'Active',
    created_by        INTEGER REFERENCES users(users_id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (form_name, section_name)
);

-- ── Vendors & Remittance ────────────────────────────────────

CREATE TABLE vendors (
    vendors_id        SERIAL PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    vendor_number     VARCHAR(255),
    vendor_type       VARCHAR(255),
    contact_name      VARCHAR(255),
    contact_email     VARCHAR(255),
    contact_phone     VARCHAR(255),
    country           VARCHAR(255),
    currency_id       INTEGER REFERENCES currencies(currencies_id),
    tier              VARCHAR(255),
    fourth_party_vendor BOOLEAN DEFAULT FALSE,
    website           VARCHAR(255),
    status            VARCHAR(255) DEFAULT 'Active',
    created_by        INTEGER REFERENCES users(users_id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vendor_remit (
    vendor_remit_id   SERIAL PRIMARY KEY,
    vendors_id        INTEGER REFERENCES vendors(vendors_id) ON DELETE RESTRICT,
    remit_name        VARCHAR(255) NOT NULL,
    remit_code        VARCHAR(255),
    payment_method    VARCHAR(255) DEFAULT 'ACH',
    bank_name         VARCHAR(255),
    routing_number    VARCHAR(255),
    bank_account_number VARCHAR(255),
    remit_address     VARCHAR(255),
    remit_city        VARCHAR(255),
    remit_state       VARCHAR(255),
    remit_zip         VARCHAR(255),
    status            VARCHAR(255) DEFAULT 'Active',
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Invoice Reader ──────────────────────────────────────────

CREATE TABLE invoice_reader_templates (
    invoice_reader_templates_id SERIAL PRIMARY KEY,
    vendors_id        INTEGER REFERENCES vendors(vendors_id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    format_type       VARCHAR(255) NOT NULL,
    config            JSONB NOT NULL,
    status            VARCHAR(255) DEFAULT 'Active',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_reader_uploads (
    invoice_reader_uploads_id SERIAL PRIMARY KEY,
    invoice_reader_templates_id INTEGER REFERENCES invoice_reader_templates(invoice_reader_templates_id) ON DELETE SET NULL,
    vendors_id        INTEGER REFERENCES vendors(vendors_id) ON DELETE CASCADE,
    file_name         VARCHAR(255) NOT NULL,
    format_type       VARCHAR(255) NOT NULL,
    status            VARCHAR(255) DEFAULT 'Pending',
    total_rows        INTEGER DEFAULT 0,
    inserted_invoices INTEGER DEFAULT 0,
    inserted_line_items INTEGER DEFAULT 0,
    error_count       INTEGER DEFAULT 0,
    errors            JSONB,
    invoice_reader_profiles_id INTEGER REFERENCES invoice_reader_profiles(invoice_reader_profiles_id) ON DELETE SET NULL,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_reader_profiles (
    invoice_reader_profiles_id   SERIAL PRIMARY KEY,
    name                         VARCHAR(120) NOT NULL,
    vendors_id                   INTEGER REFERENCES vendors(vendors_id) ON DELETE SET NULL,
    format_type                  VARCHAR(20) NOT NULL,
    invoice_reader_templates_id  INTEGER REFERENCES invoice_reader_templates(invoice_reader_templates_id) ON DELETE SET NULL,
    match_rules                  JSONB NOT NULL DEFAULT '{}',
    defaults                     JSONB NOT NULL DEFAULT '{}',
    error_handling               JSONB NOT NULL DEFAULT '{}',
    status                       VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_reader_exceptions (
    invoice_reader_exceptions_id SERIAL PRIMARY KEY,
    invoice_reader_uploads_id    INTEGER REFERENCES invoice_reader_uploads(invoice_reader_uploads_id) ON DELETE CASCADE,
    invoice_reader_profiles_id   INTEGER REFERENCES invoice_reader_profiles(invoice_reader_profiles_id) ON DELETE SET NULL,
    type                         VARCHAR(40) NOT NULL,
    severity                     VARCHAR(20) NOT NULL DEFAULT 'blocking',
    context                      JSONB NOT NULL DEFAULT '{}',
    resolution                   JSONB,
    status                       VARCHAR(20) NOT NULL DEFAULT 'open',
    resolved_by                  INTEGER REFERENCES users(users_id) ON DELETE SET NULL,
    resolved_at                  TIMESTAMPTZ,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Accounts ────────────────────────────────────────────────

CREATE TABLE accounts (
    accounts_id       SERIAL PRIMARY KEY,
    vendors_id        INTEGER NOT NULL REFERENCES vendors(vendors_id) ON DELETE CASCADE,
    name              VARCHAR(255),
    account_number    VARCHAR(255) NOT NULL,
    subaccount_number VARCHAR(255),
    assigned_user_id  INTEGER REFERENCES users(users_id) ON DELETE SET NULL,
    team              VARCHAR(255),
    account_hierarchy VARCHAR(255),
    parent_account_id INTEGER REFERENCES accounts(accounts_id) ON DELETE SET NULL,
    account_type      VARCHAR(255),
    account_subtype   VARCHAR(255),
    currency_id       INTEGER REFERENCES currencies(currencies_id) ON DELETE SET NULL,
    company_code_id   INTEGER REFERENCES company_codes(company_codes_id) ON DELETE SET NULL,
    ship_to_location_id INTEGER REFERENCES locations(locations_id) ON DELETE SET NULL,
    asset_location_id INTEGER REFERENCES locations(locations_id) ON DELETE SET NULL,
    tax_analyst_id    INTEGER REFERENCES users(users_id) ON DELETE SET NULL,
    payment_info      TEXT,
    allocation_settings TEXT,
    contact_details   TEXT,
    status            VARCHAR(255) DEFAULT 'Active',
    created_by        INTEGER REFERENCES users(users_id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Contracts & Rates ───────────────────────────────────────

CREATE TABLE contracts (
    contracts_id      SERIAL PRIMARY KEY,
    vendors_id        INTEGER NOT NULL REFERENCES vendors(vendors_id) ON DELETE RESTRICT,
    contract_number   VARCHAR(255),
    contract_name     VARCHAR(255),
    type              VARCHAR(255),
    subtype           VARCHAR(255),
    parent_contract_id INTEGER REFERENCES contracts(contracts_id) ON DELETE SET NULL,
    currency_id       INTEGER REFERENCES currencies(currencies_id) ON DELETE SET NULL,
    contract_record_url VARCHAR(255),
    start_date        DATE,
    expiration_date   DATE,
    term_type         VARCHAR(255),
    renew_date        DATE,
    contracted_rate   NUMERIC(14,2),
    rate_unit         VARCHAR(255),
    term_months       INTEGER,
    minimum_spend     NUMERIC(14,2),
    etf_amount        NUMERIC(14,2),
    commitment_type   VARCHAR(255),
    contract_value    NUMERIC(14,2),
    tax_assessed      BOOLEAN DEFAULT FALSE,
    product_service_types VARCHAR(255),
    business_line     VARCHAR(255),
    status            VARCHAR(255) DEFAULT 'Active',
    auto_renew        BOOLEAN DEFAULT FALSE,
    created_by        INTEGER REFERENCES users(users_id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE usoc_codes (
    usoc_codes_id     SERIAL PRIMARY KEY,
    usoc_code         VARCHAR(255) NOT NULL UNIQUE,
    description       VARCHAR(255) NOT NULL,
    category          VARCHAR(255),
    sub_category      VARCHAR(255),
    default_mrc       NUMERIC(14,2),
    default_nrc       NUMERIC(14,2),
    unit              VARCHAR(255),
    status            VARCHAR(255) DEFAULT 'Active'
);

CREATE TABLE contract_rates (
    contract_rates_id SERIAL PRIMARY KEY,
    contracts_id      INTEGER NOT NULL REFERENCES contracts(contracts_id) ON DELETE CASCADE,
    usoc_codes_id     INTEGER NOT NULL REFERENCES usoc_codes(usoc_codes_id) ON DELETE RESTRICT,
    mrc               NUMERIC(14,2),
    nrc               NUMERIC(14,2),
    effective_date    DATE,
    expiration_date   DATE,
    notes             TEXT,
    UNIQUE (contracts_id, usoc_codes_id, effective_date)
);

-- ── Orders (inventory_id FK added after inventory table) ────

CREATE TABLE orders (
    orders_id         SERIAL PRIMARY KEY,
    vendors_id        INTEGER NOT NULL REFERENCES vendors(vendors_id) ON DELETE RESTRICT,
    contracts_id      INTEGER NOT NULL REFERENCES contracts(contracts_id) ON DELETE RESTRICT,
    inventory_id      INTEGER,
    order_number      VARCHAR(255) NOT NULL,
    description       VARCHAR(255),
    contracted_rate   NUMERIC(14,2),
    order_date        DATE,
    due_date          DATE,
    status            VARCHAR(255) DEFAULT 'Pending',
    notes             TEXT,
    assigned_users_id INTEGER REFERENCES users(users_id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Inventory ───────────────────────────────────────────────

CREATE TABLE inventory (
    inventory_id      SERIAL PRIMARY KEY,
    accounts_id       INTEGER NOT NULL REFERENCES accounts(accounts_id) ON DELETE RESTRICT,
    contracts_id      INTEGER REFERENCES contracts(contracts_id) ON DELETE RESTRICT,  -- nullable for EDI imports
    orders_id         INTEGER REFERENCES orders(orders_id) ON DELETE SET NULL,
    inventory_number  VARCHAR(255) NOT NULL,
    type              VARCHAR(255),
    bandwidth         VARCHAR(255),
    location          VARCHAR(255),
    contracted_rate   NUMERIC(14,2),
    status            VARCHAR(255) DEFAULT 'Active',
    install_date      DATE,
    disconnect_date   DATE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add circular FK: orders.inventory_id -> inventory
ALTER TABLE orders
    ADD CONSTRAINT orders_inventory_id_foreign
    FOREIGN KEY (inventory_id) REFERENCES inventory(inventory_id) ON DELETE SET NULL;

-- ── Invoices & Line Items ───────────────────────────────────

CREATE TABLE invoices (
    invoices_id       SERIAL PRIMARY KEY,
    accounts_id       INTEGER NOT NULL REFERENCES accounts(accounts_id) ON DELETE RESTRICT,
    invoice_number    VARCHAR(255) NOT NULL,
    invoice_date      DATE,
    due_date          DATE,
    period_start      DATE,
    period_end        DATE,
    total_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
    status            VARCHAR(255) DEFAULT 'Unpaid',
    payment_date      DATE,
    assigned_users_id INTEGER REFERENCES users(users_id) ON DELETE SET NULL,
    billing_account   VARCHAR(255),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE line_items (
    line_items_id     SERIAL PRIMARY KEY,
    invoices_id       INTEGER NOT NULL REFERENCES invoices(invoices_id) ON DELETE CASCADE,
    inventory_id      INTEGER REFERENCES inventory(inventory_id) ON DELETE SET NULL,
    usoc_codes_id     INTEGER REFERENCES usoc_codes(usoc_codes_id) ON DELETE SET NULL,
    description       VARCHAR(255),
    charge_type       VARCHAR(255),
    amount            NUMERIC(14,2) NOT NULL,
    mrc_amount        NUMERIC(14,2),
    nrc_amount        NUMERIC(14,2),
    contracted_rate   NUMERIC(14,2),
    variance          NUMERIC(14,2),
    audit_status      VARCHAR(255),
    period_start      DATE,
    period_end        DATE,
    quantity          NUMERIC(14,4) DEFAULT 1,
    tax_amount        NUMERIC(14,2),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Allocations ─────────────────────────────────────────────

CREATE TABLE allocations (
    allocations_id    SERIAL PRIMARY KEY,
    line_items_id     INTEGER NOT NULL REFERENCES line_items(line_items_id) ON DELETE CASCADE,
    cost_center       VARCHAR(255),
    department        VARCHAR(255),
    percentage        NUMERIC(5,2),
    allocated_amount  NUMERIC(14,2),
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Cost Savings ────────────────────────────────────────────

CREATE TABLE cost_savings (
    cost_savings_id   SERIAL PRIMARY KEY,
    vendors_id        INTEGER NOT NULL REFERENCES vendors(vendors_id) ON DELETE RESTRICT,
    inventory_id      INTEGER REFERENCES inventory(inventory_id) ON DELETE SET NULL,
    line_items_id     INTEGER REFERENCES line_items(line_items_id) ON DELETE SET NULL,
    invoices_id       INTEGER REFERENCES invoices(invoices_id) ON DELETE SET NULL,
    category          VARCHAR(255),
    description       VARCHAR(255),
    identified_date   DATE,
    status            VARCHAR(255),
    projected_savings NUMERIC(14,2),
    realized_savings  NUMERIC(14,2),
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Disputes ────────────────────────────────────────────────

CREATE TABLE disputes (
    disputes_id       SERIAL PRIMARY KEY,
    line_items_id     INTEGER REFERENCES line_items(line_items_id) ON DELETE SET NULL,
    invoices_id       INTEGER NOT NULL REFERENCES invoices(invoices_id) ON DELETE CASCADE,
    vendors_id        INTEGER NOT NULL REFERENCES vendors(vendors_id) ON DELETE CASCADE,
    dispute_type      VARCHAR(255) DEFAULT 'Overcharge',
    amount            NUMERIC(14,2) NOT NULL,
    status            VARCHAR(255) DEFAULT 'Open',
    filed_date        DATE NOT NULL,
    resolved_date     DATE,
    resolution_notes  TEXT,
    credit_amount     NUMERIC(14,2),
    reference_number  VARCHAR(255),
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tickets ─────────────────────────────────────────────────

CREATE TABLE tickets (
    tickets_id        SERIAL PRIMARY KEY,
    ticket_number     VARCHAR(255) NOT NULL UNIQUE,
    title             VARCHAR(255) NOT NULL,
    description       TEXT,
    category          VARCHAR(255) DEFAULT 'Other',
    priority          VARCHAR(255) DEFAULT 'Medium',
    status            VARCHAR(255) DEFAULT 'Open',
    source_entity_type  VARCHAR(255),
    source_entity_id    INTEGER,
    source_entity_label VARCHAR(255),
    assigned_users_id INTEGER REFERENCES users(users_id) ON DELETE SET NULL,
    created_by        VARCHAR(255),
    due_date          DATE,
    resolved_date     DATE,
    resolution        TEXT,
    tags              VARCHAR(255),
    environment       VARCHAR(255),
    steps_to_reproduce  TEXT,
    expected_behavior   TEXT,
    actual_behavior     TEXT,
    console_errors      TEXT,
    browser_info        VARCHAR(255),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ticket_comments (
    ticket_comments_id SERIAL PRIMARY KEY,
    tickets_id        INTEGER NOT NULL REFERENCES tickets(tickets_id) ON DELETE CASCADE,
    author            VARCHAR(255) NOT NULL,
    content           TEXT NOT NULL,
    comment_type      VARCHAR(255) DEFAULT 'comment',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Notifications, Notes, Saved Reports ─────────────────────

CREATE TABLE notifications (
    notifications_id  SERIAL PRIMARY KEY,
    users_id          INTEGER NOT NULL REFERENCES users(users_id) ON DELETE CASCADE,
    type              VARCHAR(255) DEFAULT 'info',
    title             VARCHAR(255) NOT NULL,
    message           TEXT NOT NULL,
    entity_type       VARCHAR(255),
    entity_id         INTEGER,
    is_read           BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notes (
    notes_id          SERIAL PRIMARY KEY,
    entity_type       VARCHAR(255) NOT NULL,
    entity_id         INTEGER NOT NULL,
    content           TEXT NOT NULL,
    author            VARCHAR(255) DEFAULT 'System',
    note_type         VARCHAR(255) DEFAULT 'note',
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE saved_reports (
    saved_reports_id  SERIAL PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    description       TEXT,
    config            JSONB NOT NULL,
    created_by        INTEGER REFERENCES users(users_id),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Workflows ───────────────────────────────────────────────

CREATE TABLE workflow_runs (
    workflow_runs_id  SERIAL PRIMARY KEY,
    workflow_key      VARCHAR(255) NOT NULL,
    workflow_name     VARCHAR(255) NOT NULL,
    status            VARCHAR(255) NOT NULL DEFAULT 'running',
    triggered_by      INTEGER REFERENCES users(users_id) ON DELETE SET NULL,
    context           JSONB,
    error_message     VARCHAR(255),
    started_at        TIMESTAMPTZ DEFAULT NOW(),
    finished_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_steps (
    workflow_steps_id SERIAL PRIMARY KEY,
    workflow_runs_id  INTEGER NOT NULL REFERENCES workflow_runs(workflow_runs_id) ON DELETE CASCADE,
    step              INTEGER NOT NULL,
    type              VARCHAR(255) NOT NULL,
    label             VARCHAR(255) NOT NULL,
    instruction       TEXT,
    status            VARCHAR(255) NOT NULL DEFAULT 'pending',
    status_detail     TEXT,
    executed_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Knex migration tracking (so Knex sees the DB as up-to-date) ──

CREATE TABLE IF NOT EXISTS knex_migrations (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(255),
    batch             INTEGER,
    migration_time    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS knex_migrations_lock (
    index             SERIAL PRIMARY KEY,
    is_locked         INTEGER
);

INSERT INTO knex_migrations (name, batch, migration_time) VALUES
    ('20260324000000_core_schema.js',                  1, NOW()),
    ('20260324100000_add_missing_tables.js',            1, NOW()),
    ('20260324195936_add_user_preferences.js',          1, NOW()),
    ('20260325170226_add_form_instructions.js',         1, NOW()),
    ('20260325200000_add_workflows.js',                 1, NOW()),
    ('20260325210000_add_line_item_quantity.js',         1, NOW()),
    ('20260325220000_add_line_item_billing_account.js',  1, NOW()),
    ('20260325230000_move_billing_account_to_invoices.js', 1, NOW()),
    ('20260325240000_add_line_item_tax_amount.js',      1, NOW()),
    ('20260325250000_inventory_nullable_contracts.js',   1, NOW());

INSERT INTO knex_migrations_lock (is_locked) VALUES (0);

COMMIT;
