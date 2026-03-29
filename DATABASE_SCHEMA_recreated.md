# TEMS Database Schema
**Last Updated:** March 29, 2026 | **Database:** PostgreSQL | **ORM:** Knex.js

---

## Core Tables

### vendors
**PK:** `vendors_id` | Top-level vendor entities (AT&T, Verizon, etc.)

**Key Columns:** name, vendor_number, vendor_type, contact_name/email/phone, country, currency_id->currencies, tier, fourth_party_vendor, website, status, created_by->users, created_at

**FKs:** currency_id->currencies, created_by->users

---

### accounts
**PK:** `accounts_id` | Billing accounts belonging to vendors

**Key Columns:** vendors_id->vendors (NOT NULL), name, account_number, subaccount_number, assigned_user_id->users, team, account_hierarchy, parent_account_id->accounts (self-ref), account_type/subtype, currency_id->currencies, company_code_id->company_codes, ship_to_location_id/asset_location_id->locations, tax_analyst_id->users, payment_info, allocation_settings, contact_details, status, created_by->users, created_at

**Notable:** 60+ fields covering invoicing, payment, purchasing, AP handling, tax, audit, allocation

**FKs:** vendors_id->vendors (CASCADE), assigned_user_id/tax_analyst_id/created_by->users, parent_account_id->accounts, currency_id->currencies, company_code_id->company_codes, ship_to_location_id/asset_location_id->locations

---

### contracts
**PK:** `contracts_id` | Service contracts tied to vendors

**Key Columns:** vendors_id->vendors (NOT NULL), contract_number, contract_name, type, subtype, parent_contract_id->contracts, currency_id->currencies, contract_record_url, start_date, expiration_date, term_type, renew_date, contracted_rate, rate_unit, term_months, minimum_spend, etf_amount, commitment_type, contract_value, tax_assessed, product_service_types, business_line, status, auto_renew, created_by->users

**FKs:** vendors_id->vendors (RESTRICT), parent_contract_id->contracts, currency_id->currencies, created_by->users

---

### orders
**PK:** `orders_id` | Service orders for installations/changes

**Key Columns:** vendors_id->vendors (NOT NULL), contracts_id->contracts (NOT NULL), inventory_id->inventory, order_number (NOT NULL), description, contracted_rate, order_date, due_date, status, notes, assigned_users_id->users

**FKs:** vendors_id->vendors (RESTRICT), contracts_id->contracts (RESTRICT), assigned_users_id->users

---

### inventory
**PK:** `inventory_id` | Telecommunications inventory (formerly circuits)

**Key Columns:** accounts_id->accounts (NOT NULL), contracts_id->contracts (nullable), orders_id->orders, inventory_number (NOT NULL), type, bandwidth, location, contracted_rate, status, install_date, disconnect_date

**FKs:** accounts_id->accounts (RESTRICT), contracts_id->contracts (RESTRICT), orders_id->orders (SET NULL)

---

### invoices
**PK:** `invoices_id` | Invoice headers

**Key Columns:** accounts_id->accounts (NOT NULL), invoice_number (NOT NULL), invoice_date, due_date, period_start, period_end, total_amount (NOT NULL, default 0), billing_account (string), status, payment_date, assigned_users_id->users

**FKs:** accounts_id->accounts (RESTRICT), assigned_users_id->users

---

### line_items
**PK:** `line_items_id` | Individual charges within invoices

**Key Columns:** invoices_id->invoices (NOT NULL), inventory_id->inventory, usoc_codes_id->usoc_codes, description, charge_type, amount (NOT NULL), mrc_amount, nrc_amount, contracted_rate, variance, audit_status, quantity (decimal(14,4), default 1), tax_amount (decimal(14,2)), period_start, period_end

**FKs:** invoices_id->invoices (CASCADE), inventory_id->inventory, usoc_codes_id->usoc_codes

---

## Financial & Allocation Tables

### allocations
**PK:** `allocations_id` | Cost allocation mappings

**Key Columns:** line_items_id->line_items (NOT NULL), cost_center, department, percentage, allocated_amount, notes

**FKs:** line_items_id->line_items (CASCADE)

---

### cost_savings
**PK:** `cost_savings_id` | Cost savings tracking

**Key Columns:** vendors_id->vendors (NOT NULL), inventory_id->inventory, line_items_id->line_items, invoices_id->invoices, category, description, identified_date, status, projected_savings, realized_savings, notes

**FKs:** vendors_id->vendors (RESTRICT), inventory_id/line_items_id/invoices_id (SET NULL)

---

### bank_cost_centers
**PK:** `bank_cost_centers_id` | Cost center directory

**Key Columns:** name (NOT NULL), code, description, department, manager, status, created_at

---

### allocation_rules
**PK:** `allocation_rules_id` | Cost-center split templates per account

**Key Columns:** accounts_id->accounts (NOT NULL), bank_cost_centers_id->bank_cost_centers (NOT NULL), percentage (decimal 5,2, NOT NULL), department, notes, created_at, updated_at

**Unique:** (accounts_id, bank_cost_centers_id)

**FKs:** accounts_id->accounts (CASCADE), bank_cost_centers_id->bank_cost_centers (CASCADE)

---

### company_codes
**PK:** `company_codes_id` | Company code directory

**Key Columns:** name (NOT NULL), code, description, entity_type, country (default 'USA'), currency (default 'USD'), status, created_at

---

### projects
**PK:** `projects_id` | Project tracking

**Key Columns:** name (NOT NULL), code, description, project_type, status, manager, start_date, end_date, budget, created_at

---

### currencies
**PK:** `currencies_id` | Currency reference

**Key Columns:** currency_code (UNIQUE, NOT NULL), name (NOT NULL), symbol (NOT NULL), exchange_rate (decimal 14,6 default 1.000000), status, created_at

**Default Data:** USD, EUR, GBP, CAD, MXN, INR, SGD, SEK, NOK, PLN, BZD, KYD

---

## Rate & Pricing Tables

### usoc_codes
**PK:** `usoc_codes_id` | Universal Service Order Code catalog

**Key Columns:** usoc_code (UNIQUE, NOT NULL), description (NOT NULL), category, sub_category, default_mrc, default_nrc, unit, status

---

### contract_rates
**PK:** `contract_rates_id` | Per-USOC contracted rates

**Key Columns:** contracts_id->contracts (NOT NULL), usoc_codes_id->usoc_codes (NOT NULL), mrc, nrc, effective_date, expiration_date, notes

**Unique:** (contracts_id, usoc_codes_id, effective_date)

**FKs:** contracts_id->contracts (CASCADE), usoc_codes_id->usoc_codes (RESTRICT)

---

## Support & Reference Tables

### locations
**PK:** `locations_id` | Physical site directory

**Key Columns:** name (NOT NULL), site_code, site_type, address, city, state, zip, country (default 'USA'), contact_name/phone/email, status, notes, created_at

---

### field_catalog
**PK:** `field_catalog_id` | Configurable dropdown values

**Key Columns:** category (NOT NULL), label (NOT NULL), value (NOT NULL), description, sort_order, is_active, created_at

---

### vendor_remit
**PK:** `vendor_remit_id` | Vendor payment info

**Key Columns:** vendors_id->vendors, remit_name (NOT NULL), remit_code, payment_method (default 'ACH'), bank_name, routing_number, bank_account_number, remit_address/city/state/zip, status, notes, created_at

**Security:** Banking fields should be encrypted at rest

**FKs:** vendors_id->vendors (RESTRICT)

---

### spend_categories
**PK:** `spend_categories_id` | Hierarchical cost categories

**Key Columns:** name (NOT NULL), code, description, parent_id->spend_categories (self-ref), is_active, created_at

**FKs:** parent_id->spend_categories (SET NULL)

---

### form_instructions
**PK:** `id` | Per-form help text / instructions

**Key Columns:** form_id (UNIQUE, NOT NULL), instruction (NOT NULL), is_active (default true), created_at, updated_at

---

## Invoice Processing

### invoice_reader_templates
**PK:** `invoice_reader_templates_id` | Parsing configs per vendor/format

**Key Columns:** vendors_id->vendors, name (NOT NULL), format_type (NOT NULL: EDI/Excel/PDF), config (NOT NULL: JSON), status, created_at, updated_at

**FKs:** vendors_id->vendors

---

### invoice_reader_uploads
**PK:** `invoice_reader_uploads_id` | Upload history & status

**Key Columns:** invoice_reader_templates_id->invoice_reader_templates, vendors_id->vendors, invoice_reader_profiles_id->invoice_reader_profiles, file_name (NOT NULL), format_type (NOT NULL), status (default 'Pending'), total_rows, inserted_invoices, inserted_line_items, error_count, errors (JSON), created_at, completed_at

**FKs:** invoice_reader_templates_id->invoice_reader_templates, vendors_id->vendors, invoice_reader_profiles_id->invoice_reader_profiles (SET NULL)

---

### invoice_reader_profiles
**PK:** `invoice_reader_profiles_id` | Auto-match rules + defaults per vendor/format

**Key Columns:** name (NOT NULL), vendors_id->vendors, format_type (NOT NULL: EDI/Excel/CSV/PDF), invoice_reader_templates_id->invoice_reader_templates, match_rules (JSONB, default '{}'), defaults (JSONB, default '{}'), error_handling (JSONB, default '{}'), status (default 'Active'), created_at, updated_at

**FKs:** vendors_id->vendors (SET NULL), invoice_reader_templates_id->invoice_reader_templates (SET NULL)

---

### invoice_reader_exceptions
**PK:** `invoice_reader_exceptions_id` | Structured issues requiring human resolution

**Key Columns:** invoice_reader_uploads_id->invoice_reader_uploads, invoice_reader_profiles_id->invoice_reader_profiles, type (NOT NULL: no_template_match/no_account/no_vendor/parse_error/unknown_format), severity (default 'blocking': blocking/warning), context (JSONB, default '{}'), resolution (JSONB), status (default 'open': open/resolved/ignored), resolved_by->users, resolved_at, created_at, updated_at

**FKs:** invoice_reader_uploads_id->invoice_reader_uploads (CASCADE), invoice_reader_profiles_id->invoice_reader_profiles (SET NULL), resolved_by->users (SET NULL)

---

## Dispute Management

### disputes
**PK:** `disputes_id` | Invoice dispute tracking

**Key Columns:** line_items_id->line_items, invoices_id->invoices (NOT NULL), vendors_id->vendors (NOT NULL), dispute_type (default 'Overcharge'), amount (NOT NULL), status (default 'Open'), filed_date (NOT NULL), resolved_date, resolution_notes, credit_amount, reference_number, notes, created_at, updated_at

**FKs:** line_items_id->line_items (SET NULL), invoices_id/vendors_id (CASCADE)

---

## Ticketing System

### tickets
**PK:** `tickets_id` | Internal issue/task tracking

**Key Columns:** ticket_number (UNIQUE, NOT NULL), title (NOT NULL), description, category (default 'Other'), priority (default 'Medium': Low/Medium/High/Critical), status (default 'Open'), source_entity_type/id/label (polymorphic), assigned_users_id->users, created_by, due_date, resolved_date, resolution, tags, environment, steps_to_reproduce, expected_behavior, actual_behavior, console_errors, browser_info, created_at, updated_at

**FKs:** assigned_users_id->users

---

### ticket_comments
**PK:** `ticket_comments_id` | Comments & activity log

**Key Columns:** tickets_id->tickets (NOT NULL), author (NOT NULL), content (NOT NULL), comment_type (default 'comment'), created_at

**FKs:** tickets_id->tickets (CASCADE)

---

## User Management & Security

### users
**PK:** `users_id` | Application users

**Key Columns:** email (UNIQUE, NOT NULL), display_name (NOT NULL), sso_subject, sso_provider, roles_id->roles (NOT NULL), status (default 'Active'), avatar_url, preferences (JSONB, default '{}'), last_login, created_at, updated_at

**FKs:** roles_id->roles (RESTRICT)

---

### roles
**PK:** `roles_id` | User roles

**Key Columns:** name (UNIQUE, NOT NULL), description, color (string(20), nullable), created_at

---

### permissions
**PK:** `permissions_id` | Granular permissions (resource + action)

**Key Columns:** resource (NOT NULL), action (NOT NULL), description, created_at

**Unique:** (resource, action)

---

### role_permissions
**PK:** `role_permissions_id` | Junction: roles + permissions

**Key Columns:** roles_id->roles (NOT NULL), permissions_id->permissions (NOT NULL)

**Unique:** (roles_id, permissions_id)

**FKs:** roles_id->roles (CASCADE), permissions_id->permissions (CASCADE)

---

### user_favorites
**PK:** `user_favorites_id` | Per-user saved filters

**Key Columns:** users_id->users (NOT NULL), name (NOT NULL), path (NOT NULL), filters (JSON), filter_summary, icon, created_at

**FKs:** users_id->users (CASCADE)

---

### audit_log
**PK:** `audit_log_id` | System-wide audit trail

**Key Columns:** users_id->users, action (NOT NULL: CREATE/UPDATE/DELETE), resource (NOT NULL: table name), resource_id, old_values (JSON), new_values (JSON), ip_address, created_at

**FKs:** users_id->users (SET NULL)

---

## Communication Tables

### announcements
**PK:** `announcements_id` | System-wide banners

**Key Columns:** title (NOT NULL), message (NOT NULL), type (default 'info': info/warning/danger/success), is_active (default true), start_date, end_date, created_by->users, created_at

**FKs:** created_by->users

---

### notifications
**PK:** `notifications_id` | User-targeted notifications

**Key Columns:** users_id->users (NOT NULL), type (default 'info'), title (NOT NULL), message (NOT NULL), entity_type, entity_id, is_read (default false), created_at

**FKs:** users_id->users (CASCADE)

---

### notes
**PK:** `notes_id` | Inline notes (polymorphic)

**Key Columns:** entity_type (NOT NULL), entity_id (NOT NULL), content (NOT NULL), author (default 'System'), note_type (default 'note'), created_at

---

## Reporting

### saved_reports
**PK:** `saved_reports_id` | User-saved report configs

**Key Columns:** name (NOT NULL), description, config (JSONB, NOT NULL), created_by->users, created_at, updated_at

**FKs:** created_by->users

---

### saved_graphs
**PK:** `saved_graphs_id` | User-created chart configurations

**Key Columns:** name (NOT NULL), description, config (JSONB — chart type, data source, axes, filters), created_by->users, created_at, updated_at

**FKs:** created_by->users

---

### report_jobs
**PK:** `report_jobs_id` | Background report exports

**Key Columns:** users_id->users, name (NOT NULL), config (text, NOT NULL — JSON report config), format (default 'csv': csv/xlsx), status (default 'queued': queued/running/completed/failed), total_rows (default 0), row_limit (default 100000), file_path, file_size (bigInteger, default 0), error_message, email_to, email_sent (default false), started_at, completed_at, created_at, updated_at

**FKs:** users_id->users (SET NULL)

---

## Workflow Engine

### workflow_runs
**PK:** `workflow_runs_id` | Top-level workflow execution records

**Key Columns:** workflow_key (NOT NULL — e.g. 'assign_invoice'), workflow_name (NOT NULL), status (default 'running': running/success/failed), triggered_by->users, context (JSONB — input params), error_message, started_at (default now()), finished_at, created_at, updated_at

**FKs:** triggered_by->users (SET NULL)

---

### workflow_steps
**PK:** `workflow_steps_id` | Individual steps within a workflow run

**Key Columns:** workflow_runs_id->workflow_runs (NOT NULL), step (NOT NULL — sequential number), type (NOT NULL: process/decision/start/end), label (NOT NULL), instruction (text), status (default 'pending': success/failed/skipped/pending), status_detail (text), executed_at, created_at, updated_at

**FKs:** workflow_runs_id->workflow_runs (CASCADE)

---

## Email System

### email_config
**PK:** `email_config_id` | Admin-editable SMTP settings (single-row config)

**Key Columns:** enabled (default false), smtp_host, smtp_port (default 587), smtp_secure (default false), smtp_user, smtp_pass, from_address (default 'tems-noreply@example.com'), from_name (default 'TEMS'), reply_to, require_tls (default true), reject_unauthorized (default true), notify_invoice_assigned/notify_approval_needed/notify_status_changed/notify_user_created/notify_user_suspended/notify_role_changed/notify_announcements (all default true), notify_digest (default false), created_at, updated_at

**Seeds:** One default disabled config row

---

### email_log
**PK:** `email_log_id` | Audit trail for every email send attempt

**Key Columns:** users_id->users, notifications_id->notifications, to_address (NOT NULL), subject (NOT NULL), body (text), status (default 'pending': pending/sent/failed), error_message (text), smtp_response, retry_count (default 0), sent_at, created_at

**FKs:** users_id->users (SET NULL), notifications_id->notifications (SET NULL)

---

### notification_preferences
**PK:** `notification_preferences_id` | Per-user notification opt-out settings

**Key Columns:** users_id->users (UNIQUE, NOT NULL), email_enabled (default true), in_app_enabled (default true), email_invoice_assigned/email_approval_needed/email_status_changed/email_user_management/email_announcements (all default true), email_digest (default false), created_at, updated_at

**FKs:** users_id->users (CASCADE)

---

### notification_types
**PK:** `notification_types_id` | Catalog of system notification event types

**Key Columns:** key (UNIQUE, NOT NULL), name (NOT NULL), description, category, default_type, in_app_enabled (default true), email_enabled (default true), is_system (default false), created_at, updated_at

**Seeded:** invoice_assigned, ticket_assigned, contract_expiry, rate_variance, open_disputes, approval_needed, status_changed, announcement

---

## Invoice Approval

### approval_levels
**PK:** `approval_levels_id` | Dollar-threshold approval tiers

**Key Columns:** level (UNIQUE, NOT NULL), name (NOT NULL), min_amount (decimal(14,2), default 0), max_amount (decimal(14,2), nullable), created_at, updated_at

**Seeds:** Level 1 – Standard ($0–$5,000), Level 2 – Manager ($5,000.01–$25,000), Level 3 – Executive ($25,000.01+)

---

### invoice_approvers
**PK:** `invoice_approvers_id` | Approver assignments per user per level

**Key Columns:** users_id->users (NOT NULL), level (NOT NULL), primary_approver_id->users, alternate_approver_id->users, created_at, updated_at

**Unique:** (users_id, level)

**FKs:** users_id->users (CASCADE), primary_approver_id->users (SET NULL), alternate_approver_id->users (SET NULL)

---

## Entity Relationships

- vendors (1:M) -> accounts, contracts, orders, disputes, cost_savings, vendor_remit, invoice_reader_*
- accounts (1:M) -> invoices, inventory
- contracts (1:M) -> orders, inventory, contract_rates
- invoices (1:M) -> line_items, disputes
- inventory (1:M) -> line_items
- line_items (1:M) -> allocations, cost_savings
- accounts (1:M) -> allocation_rules
- bank_cost_centers (1:M) -> allocation_rules
- usoc_codes (1:M) -> line_items, contract_rates
- users (1:M) -> audit_log, user_favorites, notifications, saved_reports
- users (M:1) -> roles
- roles (M:M) -> permissions (via role_permissions)
- tickets (1:M) -> ticket_comments
- workflow_runs (1:M) -> workflow_steps
- invoice_reader_profiles (1:M) -> invoice_reader_exceptions, invoice_reader_uploads
- invoice_reader_uploads (1:M) -> invoice_reader_exceptions
- notifications (1:M) -> email_log
- approval_levels — reference table for invoice_approvers.level
- users (1:M) -> invoice_approvers, notification_preferences, email_log, report_jobs

---

## Application Settings

### system_settings
**PK:** `key` (string) | Global key/value application configuration

**Key Columns:** key (PRIMARY, NOT NULL), value (JSONB), updated_at

---

## Naming Conventions

- **PK:** `{table}_id` (integer, auto-increment)
- **FK:** `{referenced_table}_id`
- **Business ID:** `{entity}_number` or `{entity}_code` (varchar)
- **Status:** varchar(30), always indexed
- **Timestamps:** `created_at` (NOT NULL, DEFAULT now()), `updated_at`

---

## FK Performance Indexes

Migration `20260327150000_add_fk_indexes.js` adds 19 indexes on critical FK columns:

| Index Name | Table.Column |
|---|---|
| idx_accounts_vendors_id | accounts.vendors_id |
| idx_contracts_vendors_id | contracts.vendors_id |
| idx_inventory_accounts_id | inventory.accounts_id |
| idx_inventory_contracts_id | inventory.contracts_id |
| idx_inventory_orders_id | inventory.orders_id |
| idx_orders_vendors_id | orders.vendors_id |
| idx_orders_contracts_id | orders.contracts_id |
| idx_invoices_accounts_id | invoices.accounts_id |
| idx_invoices_invoice_number | invoices.invoice_number |
| idx_line_items_invoices_id | line_items.invoices_id |
| idx_line_items_inventory_id | line_items.inventory_id |
| idx_line_items_usoc_codes_id | line_items.usoc_codes_id |
| idx_disputes_vendors_id | disputes.vendors_id |
| idx_disputes_invoices_id | disputes.invoices_id |
| idx_allocations_line_items_id | allocations.line_items_id |
| idx_cost_savings_vendors_id | cost_savings.vendors_id |
| idx_vendor_remit_vendors_id | vendor_remit.vendors_id |
| idx_contract_rates_contracts_id | contract_rates.contracts_id |
| idx_tickets_assigned_users_id | tickets.assigned_users_id |

---

## Recent Schema Changes (March 2026)

1. **Vendor/Account Split:** Old `accounts` -> `vendors`; new `accounts` for billing
2. **Circuits -> Inventory:** Renamed table, PK, and all references
3. **Form Enhancements:** Added 60+ fields to vendors/accounts/contracts
4. **USOC Management:** Added usoc_codes, contract_rates tables
5. **Multi-currency:** Added currencies table and FKs
6. **Workflow Engine:** Added workflow_runs + workflow_steps tables
7. **Invoice Reader Profiles:** Added invoice_reader_profiles + invoice_reader_exceptions
8. **Email System:** Added email_config, email_log, notification_preferences
9. **Invoice Approval:** Added approval_levels + invoice_approvers with 3-tier thresholds
10. **Report Jobs:** Added report_jobs for background report exports
11. **FK Indexes:** 19 performance indexes on high-traffic FK columns
12. **Column Additions:** roles.color, line_items.quantity/tax_amount, invoices.billing_account
13. **Schema Relaxation:** inventory.contracts_id changed from NOT NULL to nullable
14. **System Settings:** Added system_settings table for global application configuration
15. **Currency Exchange:** Added currency_exchange_rates table for multi-currency conversions
16. **Allocation Rules:** Added allocation_rules table for default cost-center splits per account
17. **Notification Types:** Added notification_types table with 8 seeded event types (invoice_assigned, ticket_assigned, etc.)
18. **Saved Graphs:** Added saved_graphs table for user-created chart configurations

**Total: 49 tables across 21 migration files (incl. 1 no-op)**

---

## Security Notes

- **Encryption Required:** `vendor_remit.routing_number`, `vendor_remit.bank_account_number`, `email_config.smtp_pass`
- **Audit Trail:** All changes logged in `audit_log` with user, timestamp, IP, before/after snapshots
- **Email Audit:** All send attempts logged in `email_log` with status/error tracking
- **RBAC:** Granular permissions via `{resource}:{action}` (e.g., `accounts:read`, `invoices:create`)
- **Approval Workflow:** 3-tier invoice approval with primary + alternate approvers per user

---

## Migration Commands

```bash
npx knex migrate:latest    # Apply migrations
npx knex migrate:rollback  # Rollback last batch
npx knex seed:run          # Seed reference data
```

---

**Total Tables:** 48 | **Migration Files:** 21 | **Migration Path:** `server/migrations/`
