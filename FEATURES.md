# TEMS — Feature Overview

Telecom Expense Management System · Complete Feature Listing

---

## Core Modules

### Vendors
- Top-level vendor directory (AT&T, Verizon, Lumen, etc.)
- Vendor detail view with linked accounts, contracts, and remittance info
- Vendor add page with comprehensive fields
- Vendor types, tiers, fourth-party vendor tracking

### Accounts
- Billing account directory under vendors
- Account detail view with linked inventory, contracts, invoices
- 60+ fields covering invoicing, payment, purchasing, AP handling, tax, allocation
- Self-referential parent/child account hierarchy
- Account add page

### Contracts
- Contract lifecycle tracking (Active, Pending, Expired, Terminated)
- Start/end dates, term, auto-renew flag, contracted rate
- Expiration alerts — banners for contracts expiring within 30 days or already expired
- Contract rates (per-USOC negotiated MRC/NRC)
- Self-referential parent contract hierarchy
- Contract add page

### Inventory (Circuits)
- Telecom inventory tracking (MPLS, Internet, Ethernet, Voice, SD-WAN, Dedicated)
- Linked to vendor accounts and contracts
- Install/disconnect date tracking
- Inventory add page

### Orders
- Service order and provisioning management (Pending, In Progress, Completed, Cancelled)
- Linked to vendors, contracts, and inventory
- Milestones tracking per order
- Order add page

### Invoices
- Invoice recording and review (Open, Paid, Disputed, Void)
- Line item detail with MRC/NRC amounts and audit status (Validated, Variance, Pending)
- Allocations — cost center assignment for line items
- **Allocation Rules** — define default cost-center percentage splits per account with interactive sliders
- Invoice Approvers workflow management
- GL Codes management
- Billing account linkage
- Invoice add page
- **Invoice Reader** — dynamic multi-format invoice parsing and batch import tool
- **Reader Profiles** — saved parsing configurations per vendor/format
- **Reader Exceptions** — flagged import issues requiring manual review

### USOC Codes
- Universal Service Order Code catalog
- Default MRC/NRC rates per code
- Categories and sub-categories
- USOC code add page

### Disputes
- Billing dispute tracking (Open, Under Review, Escalated, Credited, Denied, Closed)
- Dispute types: Overcharge, Missing Credit, Wrong Rate, Duplicate Charge, Service Issue
- Linked to invoices, line items, and vendors
- Credit tracking and resolution notes
- Dispute add page

### Cost Savings
- Savings pipeline tracking (billing errors, renegotiations, cancellations)
- Projected vs. realized savings
- Linked to vendors, inventory, invoices, line items
- Cost saving add page

### Rate Audit
- Contract rate vs. actual line-item charge compliance validation
- Automated mismatch detection across all line items
- Summary KPIs: validated, variance, pending, unmatched

---

## Dashboard

- KPI cards: vendors, active contracts, active inventory, open invoices, pending orders, open disputes
- Total billed, MRC, NRC, and variance summaries
- Audit status distribution chart (Validated / Variance / Pending)
- Invoice amounts by vendor chart
- Savings pipeline by category chart
- Recent invoices and savings opportunities tables
- Recent variances list

---

## Reporting

### Report Builder
- Graph-based multi-table join system (14 reportable tables, 21 FK relationships)
- Pick a primary table, link related tables through foreign keys
- Field selection, filtering, sorting, grouping, and aggregation
- Save and reload report configurations
- Export results to CSV/Excel
- 10 built-in report templates

### Create Graph
- Custom chart builder

### All Reports
- Saved reports listing with load/delete

---

## Supporting Modules

### Locations
- Physical site directory (address, site code, type, contacts)
- Location detail and add pages

### Vendor Remit
- Vendor payment/remittance info (ACH, routing numbers, bank accounts)
- Vendor remit detail and add pages

### Spend Categories
- Hierarchical cost categorization
- Parent/child category structure

### Field Catalog
- Configurable dropdown values for form fields
- Category-based organization with sort order

### Projects
- Project tracking linked to inventory and orders

### Tickets
- Internal issue/task tracking with ticket numbers
- Linked to any entity (polymorphic source)
- Priority levels, due dates, resolution tracking
- Comments/activity timeline per ticket
- Ticket add page

### Workflows
- Configurable workflow engine with step definitions
- Workflow detail view

### Announcements
- System-wide banners (info, warning, danger, success)
- Scheduled start/end dates
- Active/inactive toggle

---

## Quality of Life Features

### Data Tables (all list pages)
- Column filtering — text contains/starts/ends, select, date range, numeric comparison, set membership, empty/not-empty
- Sort by any column (ascending / descending)
- Pagination with configurable page size
- Record count display in table header
- Summary / totals row — sums, counts, or averages on configured columns
- Sticky table headers — headers remain visible while scrolling
- Export to CSV or Excel (.xlsx) — exports full filtered dataset
- Saved/Favorite filters — save and reload named filter combinations per page
- Bulk actions — checkbox multi-select with bulk update/delete
- Copy to clipboard — inline copy button on ID/number columns

### Navigation & Search
- Global search — searches across vendors, accounts, contracts, inventory, orders, invoices, and USOC codes
- Keyboard shortcut: `Ctrl+K` to focus global search
- Keyboard shortcut: `Esc` to close modals
- Breadcrumb navigation history bar (up to 10 entries, clearable)
- Collapsible sidebar with grouped nav sections
- Recent Items dropdown — last 10 detail records viewed, persisted across sessions

### Notifications
- Notification center bell icon in the app header
- Unread badge count
- Database-persisted user-targeted notifications (e.g. invoice assignment changes)
- Computed alerts for: contract expirations, rate variances, and open disputes
- Mark individual or all notifications as read
- Auto-refreshes every 60 seconds
- Dedicated `notifications` table with entity linking (type, entity_type, entity_id)

### Notes & Activity Timeline
- Notes panel on all detail pages
- Add, view, and delete notes with author and timestamp
- `Ctrl+Enter` to submit a note
- Note types: Note, Status Change, System

### Form Instructions
- Configurable per-form, per-section help text
- Admin-managed content
- Collapsible instruction banners

---

## Administration

### User Management
- Full user management section (list, detail, and add pages)
- Users list page with KPI cards (Total Users, Active, Inactive/Suspended, SSO Linked)
- User detail page with editable profile, SSO configuration, assigned invoices, assigned orders, recent activity, and change history
- User add page with role dropdown, status selection, and SSO fields
- User statuses: Active, Inactive, Suspended
- SSO-ready fields: `sso_subject`, `sso_provider`

### Role & Permission Management
- Full RBAC: roles, permissions, role-permission assignments
- Role detail and form pages
- Granular permissions per resource and action (create, read, update, delete)
- 4 default roles: Admin, Manager, Analyst, Viewer

### Batch Upload
- Excel template download per entity type
- Drag-and-drop or file-picker upload
- Row-level validation feedback on import

### Invoice Reader
- Supports **EDI** (X12 810), **Excel** (.xlsx, .xls, .csv), and **PDF** formats
- Auto-detects file format from extension and content inspection
- 4-step wizard: Upload → Map Columns → Review → Results
- Column mapping UI — map any source column to any invoice or line-item field
- Saved templates — store column mappings per vendor/format for one-click reuse
- Batch inserts in chunks of 500 rows for high-volume files
- Inventory number and USOC code auto-lookup and FK resolution during import
- Upload history tab — tracks every import with row counts, error counts, and timestamps

### Audit Log
- System-wide activity history for create, update, and delete operations
- User attribution, IP logging, before/after snapshots

### Admin Dashboard
- Administrative overview and system metrics

### Admin Purge
- Data cleanup utilities

### Email Configuration
- Outbound email settings (Nodemailer)

---

## Application Settings

### Preferences
- Theme selection: Light, Dark, Auto (follows OS preference)
- Dark mode applies across all components, tables, modals, charts, and navigation
- Form instruction visibility toggle
- Per-user preferences persisted in database

---

## Testing

| Layer | Framework | Suites | Tests |
|-------|-----------|--------|-------|
| Server | Jest + Supertest | 7 | 92 |
| Client | Vitest + Testing Library | 16 | 279 |
| **Total** | | **23** | **371** |

All 371 tests passing.

All 371 tests passing. Coverage spans routes, middleware, DB helpers, workflows, UI components, React contexts, hooks, pages, and utilities.

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, React Router v6 |
| UI | Lucide React icons, Recharts, Chakra UI (provider), custom CSS |
| HTTP | Axios |
| Backend | Node.js, Express 4 |
| ORM | Knex.js |
| Database | PostgreSQL 14+ |
| Testing | Jest + Supertest (server), Vitest 2.1.8 + Testing Library (client) |
| Data Export | ExcelJS, file-saver |
| Invoice Parsing | pdf-parse (PDF), ExcelJS (Excel/CSV), custom EDI X12 810 parser |
| Email | Nodemailer |
| Auth | RBAC with role/permission middleware, SSO-ready (JWT/JWKS) |
| Security | Helmet, CORS whitelist, rate limiting, express-validator, audit middleware, cascade guards |
