# TEMS — Feature Overview

Telecom Expense Management System · Feature Listing

---

## Core Modules

### Accounts
- Vendor account directory
- Account detail view with linked circuits, contracts, and invoices
- Service Providers sub-list

### Contracts
- Contract lifecycle tracking (Active, Pending, Expired, Terminated)
- Start/end dates, term, auto-renew flag, contracted rate
- Expiration alerts — banners for contracts expiring within 30 days or already expired
- USOC Codes catalog
- Disputes management (Open, Under Review, Resolved, Closed)
- Rate Audit — contract rate vs. actual line-item charge compliance validation

### Circuits
- Circuit inventory (MPLS, Internet, Ethernet, Voice, SD-WAN, Dedicated)
- Linked to vendor accounts and contracts
- Cost Savings pipeline (billing errors, renegotiations, cancellations)
- Projects tracking

### Orders
- Circuit order and provisioning management (Pending, In Progress, Completed, Cancelled)
- Linked to accounts, contracts, and circuits
- Milestones tracking per order

### Invoices
- Invoice recording and review (Open, Paid, Disputed, Void)
- Line item detail with MRC/NRC amounts and audit status (Validated, Variance, Pending)
- Allocations — cost center assignment for line items
- Invoice Approvers workflow management
- GL Codes management
- **Invoice Reader** — dynamic multi-format invoice parsing and batch import tool

---

## Dashboard

- KPI cards: accounts, active contracts, active circuits, open invoices, pending orders, open disputes
- Total billed, MRC, NRC, and variance summaries
- Audit status distribution (Pie chart — Validated / Variance / Pending)
- Invoice amounts by vendor (Bar chart)
- Savings pipeline by category (Bar chart)
- Recent invoices and savings opportunities tables
- Recent variances list

---

## Reporting

- All Reports — landing page for the reports module
- Create Graph — custom chart builder (placeholder)
- Create Report — custom report builder (placeholder)

---

## Quality of Life Features

### Data Tables (all list pages)
- Column filtering — text, select, date, and boolean filter types
- Sort by any column (ascending / descending)
- Pagination with configurable page size
- Record count display in table header
- Summary / totals row — sums, counts, or averages on configured columns
- Sticky table headers — headers remain visible while scrolling
- Export to CSV or Excel (.xlsx) — exports full filtered dataset
- Saved/Favorite filters — save and reload named filter combinations per page (localStorage)
- Bulk actions — checkbox multi-select with bulk delete
- Copy to clipboard — inline copy button on ID/number columns

### Navigation & Search
- Global search — searches across accounts, contracts, circuits, orders, invoices, and USOC codes
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
- Notes panel on all detail pages (Account, Contract, Circuit, Order, Invoice)
- Add, view, and delete notes with author and timestamp
- `Ctrl+Enter` to submit a note
- Note types: Note, Status Change, System

---

## Administration

### User Management
- Full user management section (list, detail, and add pages)
- Users list page with KPI cards (Total Users, Active, Inactive/Suspended, SSO Linked)
- User detail page with editable profile, SSO configuration, assigned invoices, assigned orders, recent activity, and change history
- User add page with role dropdown, status selection, and SSO fields
- Role-based access control (admin vs. standard user)
- User statuses: Active, Inactive, Suspended
- SSO-ready fields: `sso_subject`, `sso_provider` (preparation for SSO transition)
- Admin-only nav sections (Administration, Audit Log)
- Enriched user detail endpoint with KPI counts (assigned invoices, orders, audit actions)

### Batch Upload
- Excel template download per entity type
- Drag-and-drop or file-picker upload
- Row-level validation feedback on import

### Invoice Reader
- Supports **EDI** (X12 810), **Excel** (.xlsx, .xls, .csv), and **PDF** formats — up to 20 MB per file
- Auto-detects file format from extension and content inspection
- 4-step wizard: Upload → Map Columns → Review → Results
- Column mapping UI — map any source column to any invoice or line-item field
- Saved templates — store column mappings per vendor/format for one-click reuse on future uploads
- Batch inserts in chunks of 500 rows for high-volume files (1000s of line items)
- Circuit number and USOC code auto-lookup and FK resolution during import
- Upload history tab — tracks every import with row counts, error counts, and timestamps
- Two new DB tables: `invoice_reader_templates`, `invoice_reader_uploads`

### Audit Log
- System-wide activity history for create, update, and delete operations

---

## Application Settings

### Preferences
- Theme selection: Light, Dark, Auto (follows OS preference)
- Dark mode applies across all components, tables, modals, charts, and navigation

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| UI | Lucide React icons, Recharts, custom CSS |
| HTTP | Axios |
| Backend | Node.js, Express 4 |
| ORM | Knex.js |
| Database | MySQL 8 |
| Data Export | xlsx, file-saver |
| Invoice Parsing | pdf-parse (PDF), xlsx (Excel/CSV), custom EDI X12 810 parser |
| Auth | RBAC with role-aware middleware, SSO-ready (sso_subject / sso_provider fields) |
| Security | Helmet, CORS whitelist, rate limiting, audit middleware |
