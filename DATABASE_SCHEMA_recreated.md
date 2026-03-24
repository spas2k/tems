# TEMS Database Schema
**Last Updated:** March 24, 2026 | **Database:** PostgreSQL | **ORM:** Knex.js

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

**Key Columns:** accounts_id->accounts (NOT NULL), contracts_id->contracts (NOT NULL), orders_id->orders, inventory_number (NOT NULL), type, bandwidth, location, contracted_rate, status, install_date, disconnect_date

**FKs:** accounts_id->accounts (RESTRICT), contracts_id->contracts (RESTRICT), orders_id->orders (SET NULL)

---

### invoices
**PK:** `invoices_id` | Invoice headers

**Key Columns:** accounts_id->accounts (NOT NULL), invoice_number (NOT NULL), invoice_date, due_date, period_start, period_end, total_amount (NOT NULL, default 0), status, payment_date, assigned_users_id->users

**FKs:** accounts_id->accounts (RESTRICT), assigned_users_id->users

---

### line_items
**PK:** `line_items_id` | Individual charges within invoices

**Key Columns:** invoices_id->invoices (NOT NULL), inventory_id->inventory, usoc_codes_id->usoc_codes, description, charge_type, amount (NOT NULL), mrc_amount, nrc_amount, contracted_rate, variance, audit_status, period_start, period_end

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

**Key Columns:** currency_code (UNIQUE, NOT NULL), name (NOT NULL), symbol (NOT NULL), status, created_at

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
**Key Columns:** form_name (NOT NULL), section_name (NOT NULL), content, status, created_by->users, created_at, updated_at

**Unique:** (form_name, section_name)

**FKs:** created_by->users

---

## Invoice Processing

### invoice_reader_templates
**PK:** `invoice_reader_templates_id` | Parsing configs per vendor/format

**Key Columns:** vendors_id->vendors, name (NOT NULL), format_type (NOT NULL: EDI/Excel/PDF), config (NOT NULL: JSON), status, created_at, updated_at

**FKs:** vendors_id->vendors

---

### invoice_reader_uploads
**PK:** `invoice_reader_uploads_id` | Upload history & status

**Key Columns:** invoice_reader_templates_id->invoice_reader_templates, vendors_id->vendors, file_name (NOT NULL), format_type (NOT NULL), status (default 'Pending'), total_rows, inserted_invoices, inserted_line_items, error_count, errors (JSON), created_at, completed_at

**FKs:** invoice_reader_templates_id->invoice_reader_templates, vendors_id->vendors

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

**Key Columns:** email (UNIQUE, NOT NULL), display_name (NOT NULL), sso_subject, sso_provider, roles_id->roles (NOT NULL), status (default 'Active'), avatar_url, last_login, created_at, updated_at

**FKs:** roles_id->roles (RESTRICT)

---

### roles
**PK:** `roles_id` | User roles

**Key Columns:** name (UNIQUE, NOT NULL), description, created_at

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

## Entity Relationships

- vendors (1:M) -> accounts, contracts, orders, disputes, cost_savings, vendor_remit, invoice_reader_*
- accounts (1:M) -> invoices, inventory
- contracts (1:M) -> orders, inventory, contract_rates
- invoices (1:M) -> line_items, disputes
- inventory (1:M) -> line_items
- line_items (1:M) -> allocations, cost_savings
- usoc_codes (1:M) -> line_items, contract_rates
- users (1:M) -> audit_log, user_favorites, notifications, saved_reports
- users (M:1) -> roles
- roles (M:M) -> permissions (via role_permissions)
- tickets (1:M) -> ticket_comments

---

## Naming Conventions

- **PK:** `{table}_id` (integer, auto-increment)
- **FK:** `{referenced_table}_id`
- **Business ID:** `{entity}_number` or `{entity}_code` (varchar)
- **Status:** varchar(30), always indexed
- **Timestamps:** `created_at` (NOT NULL, DEFAULT now()), `updated_at`

---

## Recent Schema Changes (March 2026)

1. **Vendor/Account Split:** Old `accounts` -> `vendors`; new `accounts` for billing
2. **Circuits -> Inventory:** Renamed table, PK, and all references
3. **Form Enhancements:** Added 60+ fields to vendors/accounts/contracts
4. **USOC Management:** Added usoc_codes, contract_rates tables
5. **Multi-currency:** Added currencies table and FKs

---

## Security Notes

- **Encryption Required:** `vendor_remit.routing_number`, `vendor_remit.bank_account_number`
- **Audit Trail:** All changes logged in `audit_log` with user, timestamp, IP, before/after snapshots
- **RBAC:** Granular permissions via `{resource}:{action}` (e.g., `accounts:read`, `invoices:create`)

---

## Migration Commands

```bash
npx knex migrate:latest    # Apply migrations
npx knex migrate:rollback  # Rollback last batch
npx knex seed:run          # Seed reference data
```

---

**Total Tables:** 40+ | **Schema Version:** v0.83 | **Migration Path:** `server/migrations/`
