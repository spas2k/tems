# TEMS — System Architecture

> Telecom Expense Management System — Technical Architecture Document  
> Last updated: 2026-03-28

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Infrastructure Architecture](#2-infrastructure-architecture)
3. [Application Architecture](#3-application-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Database Architecture](#6-database-architecture)
7. [Security Architecture](#7-security-architecture)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Future: Invoice Worker Service](#9-future-invoice-worker-service)
10. [Sizing & Capacity Planning](#10-sizing--capacity-planning)

---

## 1. System Overview

TEMS is a full-stack web application for managing telecom expenses across vendors, contracts, invoices, inventory, and cost tracking. It provides automated invoice parsing (Excel, EDI X12 810, PDF), rate auditing, dispute management, multi-level approval workflows, and reporting with Excel/CSV export.

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React, Vite, React Router | 18.2, 5.4, 6.22 |
| **UI Libraries** | Chakra UI, Recharts, Lucide React, Day.js | 3.34, 3.7, 0.575, 1.11 |
| **Data Export** | ExcelJS, file-saver | 4.4, 2.0 |
| **HTTP Client** | Axios | 1.6 |
| **Backend** | Node.js, Express | 20.x LTS, 4.18 |
| **Database** | PostgreSQL, Knex.js (query builder) | 14+, 3.1 |
| **File Parsing** | ExcelJS (Excel), pdf-parse (PDF), custom EDI parser | 4.4, 1.1 |
| **Email** | Nodemailer | 8.0 |
| **Security** | Helmet, CORS, express-rate-limit, express-validator | 8.1, 2.8, 8.2, 7.3 |
| **File Upload** | Multer | 2.1 |
| **Auth** | RBAC middleware, SSO-ready (JWT/JWKS) | Custom |

### Application Scale

| Metric | Count |
|--------|-------|
| API route modules | 34 (+ 4 utility helpers) |
| API endpoints | ~200 |
| API client functions | 186 |
| Page components | 68 |
| Shared components | 18 |
| Context providers | 4 |
| Database tables | 45 |
| Database migrations | 16 |
| Server dependencies | 12 |
| Client dependencies | 10 |
| Server test suites / tests | 7 / 92 |
| Client test suites / tests | 16 / 279 |

---

## 2. Infrastructure Architecture

### 2.1 — Development Environment

```
┌──────────────────────┐       ┌──────────────────────┐
│   Vite Dev Server    │       │   Express API Server  │
│   http://localhost:   │  /api │   http://localhost:   │
│   2000               │──────►│   2001                │
│                      │ proxy │                       │
│   React SPA          │       │   34 route modules    │
│   Hot Module Reload  │       │   Auth: dev mode      │
└──────────────────────┘       └──────────┬────────────┘
                                          │
                               ┌──────────▼────────────┐
                               │   PostgreSQL           │
                               │   localhost:5432       │
                               │   Database: tems       │
                               └────────────────────────┘
```

- Vite proxies `/api` to the backend — no CORS issues in dev
- `AUTH_MODE=dev` auto-attaches first Admin user to all requests
- `X-Dev-User-Id` header enables user impersonation for testing

### 2.2 — Production Environment (Recommended)

```
                         ┌─────────────────┐
                         │     Internet     │
                         └────────┬────────┘
                                  │ HTTPS (443)
                         ┌────────▼────────┐
                         │  Load Balancer   │
                         │  (Nginx / ALB)   │
                         │                  │
                         │  • TLS termination│
                         │  • Static files  │
                         │  • /api proxy    │
                         │  • Health checks │
                         └───┬──────────┬───┘
                             │          │
                    ┌────────▼──┐  ┌────▼───────┐
                    │  App Node  │  │  App Node  │
                    │  #1        │  │  #2        │
                    │            │  │            │
                    │  Express   │  │  Express   │
                    │  PM2 (2w)  │  │  PM2 (2w)  │
                    └────┬──────┘  └────┬───────┘
                         │              │
                    ┌────▼──────────────▼───┐
                    │    PostgreSQL Primary  │
                    │    (All reads/writes)  │
                    └────────────┬──────────┘
                                │ streaming replication
                    ┌───────────▼───────────┐
                    │  PostgreSQL Replica    │
                    │  (Standby / failover)  │
                    └───────────────────────┘

           ┌────────────────────────────────────────┐
           │  Invoice Worker (Future — Phase 2)     │
           │  Separate Node.js process              │
           │  Polls: SFTP folders, email inbox      │
           │  Direct DB connection (no HTTP)         │
           └────────────────────────────────────────┘
```

### 2.3 — Server Sizing

| Component | Qty | CPU | RAM | Storage | Purpose |
|-----------|-----|-----|-----|---------|---------|
| App servers | 2 | 2 vCPU | 4 GB | 20 GB SSD | Express API (active-active) |
| Invoice worker | 1 | 2 vCPU | 4 GB | 20 GB SSD | Automated ingestion (Future) |
| DB primary | 1 | 2 vCPU | 8 GB | 50 GB SSD | All database reads/writes |
| DB replica | 1 | 2 vCPU | 8 GB | 50 GB SSD | Standby failover |
| Load balancer | 1 | — | — | — | TLS, routing, static files |
| **Total** | **6** | | | | |

**Managed DB alternative:** Use AWS RDS or Azure Database for PostgreSQL with Multi-AZ enabled. This replaces both DB servers with a single managed instance that handles replication and failover automatically, reducing to **4 servers** total.

### 2.4 — Capacity Justification

| Workload | Volume | Impact |
|----------|--------|--------|
| Monthly invoices | 2,000+ | ~100/business day, with month-end spikes |
| Concurrent users | 20–50 estimated | Standard CRUD + dashboard queries |
| File parsing | Excel (ExcelJS), PDF, EDI | CPU/memory spike per file — isolated to worker |
| Report exports | On-demand + scheduled jobs | ExcelJS writeBuffer is memory-intensive for large datasets |
| Database size | ~45 tables, moderate rows | 8 GB RAM provides ample shared_buffers for query caching |

**Why 2 app nodes:** Not for capacity — a single Node.js instance handles this load easily. The second node provides **zero-downtime failover** and **rolling deployments** (deploy to node 2 while node 1 serves traffic, then swap).

---

## 3. Application Architecture

### 3.1 — High-Level Layers

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (React SPA)                │
│                                                     │
│  Pages (68) → Components (18) → API Client (186 fn) │
│       ↓              ↓                ↓              │
│  Context Providers (4): Auth, Favorites, Confirm,   │
│                         ConsoleError                 │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP (Axios → /api/*)
┌───────────────────────▼─────────────────────────────┐
│                   SERVER (Express)                   │
│                                                     │
│  Middleware: Helmet → CORS → Rate Limit → Auth      │
│       ↓                                             │
│  Routes (34 modules, ~200 endpoints)                │
│       ↓                                             │
│  Services: Email, Notifications, ReportExporter     │
│  Workflows: Engine, AssignInvoice                   │
│       ↓                                             │
│  Data: Knex.js → PostgreSQL                         │
│  Guards: Cascade, Validators, Bulk Update, SafeError│
└─────────────────────────────────────────────────────┘
```

### 3.2 — Request Lifecycle

```
Browser Request
    │
    ▼
Nginx (TLS termination, static files, /api proxy)
    │
    ▼
Express Middleware Chain:
    1. helmet()          — Security headers
    2. cors()            — Origin validation
    3. express.json()    — Body parsing (1 MB limit)
    4. rateLimit()       — 200 req/min per IP on /api
    5. authenticate()    — Attach req.user (dev or SSO)
    │
    ▼
Route Handler:
    1. requireRole() / requirePermission()  — Authorization
    2. express-validator rules              — Input validation
    3. Business logic                       — Queries, mutations
    4. Audit middleware                     — Log changes
    5. res.json()                          — Response
```

---

## 4. Backend Architecture

### 4.1 — Route Modules by Domain

#### Core Entity Management (CRUD)

| Module | Mount Point | Endpoints | Description |
|--------|-------------|-----------|-------------|
| vendors | `/api/vendors` | 7 | Vendor master data, KPIs, related entities |
| accounts | `/api/accounts` | 7 | Billing accounts linked to vendors |
| locations | `/api/locations` | 5 | Physical site/address management |
| contracts | `/api/contracts` | 7 | Contract lifecycle, terms, rates |
| inventory | `/api/inventory` | 7 | Circuit/service inventory tracking |
| orders | `/api/orders` | 7 | Service orders and provisioning |

#### Invoice & Financial

| Module | Mount Point | Endpoints | Description |
|--------|-------------|-----------|-------------|
| invoices | `/api/invoices` | 7 | Invoice CRUD, recalculation |
| lineItems | `/api/line-items` | 5 | Line item management, audit status |
| invoiceReader | `/api/invoice-reader` | 20 | **Heavy** — File parsing (Excel/EDI/PDF), template mapping, profile matching, batch import, exceptions |
| invoiceAuditor | `/api/invoice-auditor` | 5 | Automated invoice validation |
| invoiceApprovers | `/api/invoice-approvers` | 6 | Multi-level approval routing |
| disputes | `/api/disputes` | 5 | Dispute filing and resolution |
| allocations | `/api/allocations` | 3 | Cost allocation across departments |

#### Analysis & Reporting

| Module | Mount Point | Endpoints | Description |
|--------|-------------|-----------|-------------|
| costSavings | `/api/cost-savings` | 5 | Savings opportunity tracking |
| savingsTracker | `/api/savings-tracker` | 3 | Savings realization trends |
| varianceAnalysis | `/api/variance-analysis` | 3 | Invoice variance detection |
| reports | `/api/reports` | 7 | Report catalog, execution, saved configs |
| reports (jobs) | `/api/report-jobs` | 5 | Async report export queue |
| contractRates | `/api/contract-rates` | 5 | Contract rate schedules |
| usocCodes | `/api/usoc-codes` | 5 | USOC code reference data |

#### Administration

| Module | Mount Point | Endpoints | Description |
|--------|-------------|-----------|-------------|
| users | `/api/users` | 10 | User CRUD, activity, preferences |
| roles | `/api/roles` | 7 | Role and permission management |
| adminDashboard | `/api/admin-dashboard` | 6 | **Heavy** — DB stats, cascade purge, email retry |
| announcements | `/api/announcements` | 4 | System-wide announcements |
| notifications | `/api/notifications` | 3 | In-app notification feed |
| emailConfig | `/api/email-config` | 4 | SMTP configuration |
| workflows | `/api/workflows` | 6 | Workflow definitions and execution |
| tickets | `/api/tickets` | 8 | Internal support tickets |

#### Utilities

| Module | Mount Point | Endpoints | Description |
|--------|-------------|-----------|-------------|
| search | `/api/search` | 1 | Global cross-entity search |
| batchUpload | `/api/batch-upload` | 3 | **Heavy** — Bulk data import via Excel/CSV |
| favorites | `/api/favorites` | 4 | Saved filter bookmarks |
| notes | `/api/notes` | 3 | Entity-attached notes/comments |
| fieldCatalog | `/api/field-catalog` | 5 | Dynamic field metadata |
| formInstructions | `/api/form-instructions` | 3 | Contextual form help text |
| vendorRemit | `/api/vendor-remit` | 5 | ACH/banking remittance data |
| spendCategories | `/api/spend-categories` | 4 | Expense categorization |
| executiveDashboard | `/api/executive-dashboard` | 3 | High-level KPIs |

#### Inline Endpoints (server.js)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /health` | None | Database connectivity check — returns `{"status":"ok"}` |
| `GET /api/dashboard` | Required | Main dashboard aggregation — 14 parallel queries for KPIs, trends, recent activity |

#### Route Utility Helpers

| File | Purpose |
|------|---------|
| `_bulkUpdate.js` | Generic multi-record update middleware with validation |
| `_cascadeGuard.js` | Prevents deletion of entities that have dependent child records |
| `_safeError.js` | Standardized error responses — maps DB errors to user-friendly messages |
| `_validators.js` | Reusable express-validator rule sets for common entities |

### 4.2 — Services

| Service | File | Purpose |
|---------|------|---------|
| Email | `services/email.js` | SMTP transport via Nodemailer; loads config from DB; sends templated emails |
| Notifications | `services/notifications.js` | Creates in-app notifications; queries notification table |
| Report Exporter | `services/reportExporter.js` | Generates Excel/CSV files from report data using ExcelJS |

### 4.3 — Middleware

| Middleware | File | Purpose |
|------------|------|---------|
| Auth | `middleware/auth.js` | Resolves `req.user` from dev mode or SSO JWT; exports `requireRole()` and `requirePermission()` guards |
| Audit | `middleware/audit.js` | Logs CREATE/UPDATE/DELETE operations with user ID, timestamp, old/new values to `change_history` table |

### 4.4 — Workflows

| Workflow | File | Purpose |
|----------|------|---------|
| Engine | `workflows/engine.js` | Executes workflow definitions — parses steps, evaluates conditions, runs actions |
| Assign Invoice | `workflows/assignInvoice.js` | Auto-assigns invoices to approvers based on vendor/account rules |
| Registry | `workflows/index.js` | Maps workflow keys to definitions; entry point for workflow execution |

---

## 5. Frontend Architecture

### 5.1 — Component Hierarchy

```
main.jsx
  └─ App.jsx (Router, Context Providers)
       ├─ AuthContext         — User session, roles, permissions
       ├─ FavoritesContext    — Saved bookmarks/filters
       ├─ ConfirmContext      — Global confirm dialogs
       ├─ ConsoleErrorContext — Error boundary
       │
       └─ Routes (68 pages)
            ├─ Dashboard.jsx
            ├─ Vendors.jsx → VendorDetail.jsx → VendorAdd.jsx
            ├─ Invoices.jsx → InvoiceDetail.jsx → InvoiceAdd.jsx
            ├─ ... (pattern repeats for all entities)
            │
            └─ Shared Components
                 ├─ DataTable      — Sortable, filterable, paginated grid
                 ├─ FormPage       — Entity edit/create wrapper
                 ├─ CrudModal      — Inline CRUD dialogs
                 ├─ DetailHeader   — Breadcrumbs + actions
                 ├─ LookupField    — FK combobox selector
                 ├─ Pagination     — Page controls
                 ├─ BulkUpdatePanel— Multi-record updates
                 ├─ ChangeHistory  — Audit trail timeline
                 ├─ NoteTimeline   — Entity comments
                 └─ ... (18 total)
```

### 5.2 — Pages by Domain (68 total)

| Domain | Pages | Key Pages |
|--------|-------|-----------|
| Dashboards & Reports | 6 | Dashboard, ExecutiveDashboard, AdminDashboard, Reports, CreateReport, CreateGraph |
| Vendor & Account Mgmt | 12 | Vendors, VendorDetail, VendorAdd, Accounts, AccountDetail, AccountAdd, Locations, LocationDetail, LocationAdd, VendorRemit, VendorRemitDetail, VendorRemitAdd |
| Contracts | 3 | Contracts, ContractDetail, ContractAdd |
| Inventory | 3 | Inventory, InventoryDetail, InventoryAdd |
| Orders | 3 | Orders, OrderDetail, OrderAdd |
| Invoices | 3 | Invoices, InvoiceDetail, InvoiceAdd |
| Invoice Processing | 4 | InvoiceReader, InvoiceAuditor, ReaderProfiles, ReaderExceptions |
| Approvals | 1 | InvoiceApprovers |
| Disputes | 3 | Disputes, DisputeDetail, DisputeAdd |
| Financial Analysis | 4 | CostSavings, CostSavingAdd, SavingsTracker, VarianceAnalysis, RateAudit |
| USOC & Rates | 3 | UsocCodes, UsocCodeDetail, UsocCodeAdd |
| User & Role Admin | 9 | Users, UserDetail, UserAdd, UserManagement, Roles, RoleDetail, RoleForm, RolePermissions |
| System Admin | 6 | AdminDashboard, AdminPurge, EmailConfig, FieldCatalog, FieldCatalogDetail, FormInstructions |
| Utilities | 8 | BatchUpload, Announcements, SpendCategories, Preferences, Tickets, TicketDetail, TicketAdd, AuditLog |
| Other | 3 | Milestones, Projects, GLCodes, Workflows, WorkflowDetail |

### 5.3 — State Management

| Context | Scope | Key State |
|---------|-------|-----------|
| AuthContext | Global | `user`, `role_name`, `permissions[]`, `hasPermission()`, `hasRole()`, `canWrite()`, `isAdmin` |
| FavoritesContext | Global | `favorites[]`, `addFavorite()`, `removeFavorite()`, `isFavorited()` |
| ConfirmContext | Global | `confirm(message)` → Promise<boolean> — replaces `window.confirm()` |
| ConsoleErrorContext | Global | Error queue, error boundary state |

Page-level state uses React `useState` / `useCallback` / `useMemo`. No Redux or external state management — each page fetches its own data via the API client.

### 5.4 — API Client (`api.js`)

- **Base URL:** `/api` (proxied in dev, same-domain in prod)
- **186 exported functions** organized by domain
- **Request interceptor:** Attaches `X-Dev-User-Id` header from localStorage for dev impersonation
- **Heavy modules:** Invoice Reader (28 functions), Users/Roles (20), Reports (13), Admin (7)

---

## 6. Database Architecture

### 6.1 — Overview

- **Engine:** PostgreSQL 14+
- **Query Builder:** Knex.js 3.1 (supports migration to MySQL/MSSQL with config change only)
- **Migrations:** 16 versioned files, idempotent up/down
- **Tables:** 45
- **Naming convention:** PKs are `{table_name}_id`, FKs reference parent PKs

### 6.2 — Table Inventory by Domain

#### Vendor & Account Management (7 tables)
| Table | Key Relationships |
|-------|-------------------|
| `vendors` | Parent of accounts, contracts, invoices, orders |
| `accounts` | FK → vendors |
| `account_billing_accounts` | FK → accounts |
| `locations` | FK → accounts |
| `vendor_remits` | FK → vendors (ACH banking data) |
| `spend_categories` | Reference data for expense classification |
| `field_catalog` | Dynamic field metadata |

#### Contract & Rate Management (3 tables)
| Table | Key Relationships |
|-------|-------------------|
| `contracts` | FK → vendors, accounts |
| `contract_rates` | FK → contracts, usoc_codes |
| `usoc_codes` | Reference data (USOC catalog) |

#### Invoice Processing (8 tables)
| Table | Key Relationships |
|-------|-------------------|
| `invoices` | FK → vendors, accounts |
| `line_items` | FK → invoices, usoc_codes |
| `invoice_reader_templates` | Import mapping configurations |
| `invoice_reader_uploads` | Upload history and status |
| `invoice_reader_profiles` | Auto-matching rules for recurring imports |
| `invoice_reader_exceptions` | Failed/flagged import records |
| `invoice_approvers` | FK → users (approval routing) |
| `approval_levels` | Multi-tier approval thresholds |

#### Inventory & Orders (2 tables)
| Table | Key Relationships |
|-------|-------------------|
| `inventory` | FK → vendors, accounts, contracts (nullable) |
| `orders` | FK → vendors, accounts |

#### Financial Tracking (3 tables)
| Table | Key Relationships |
|-------|-------------------|
| `cost_savings` | FK → vendors |
| `allocations` | FK → line_items |
| `disputes` | FK → invoices, line_items, accounts |

#### User & Access Control (4 tables)
| Table | Key Relationships |
|-------|-------------------|
| `users` | Auth identity, profile |
| `roles` | RBAC role definitions |
| `role_permissions` | FK → roles (permission grants) |
| `user_preferences` | FK → users (UI settings) |

#### Notifications & Communication (5 tables)
| Table | Key Relationships |
|-------|-------------------|
| `notifications` | FK → users |
| `notification_preferences` | FK → users |
| `email_config` | SMTP settings (singleton) |
| `email_log` | Send history and status |
| `announcements` | System-wide messages |

#### Workflow & Automation (2 tables)
| Table | Key Relationships |
|-------|-------------------|
| `workflow_runs` | Execution history |
| `workflow_steps` | FK → workflow_runs |

#### Reporting (2 tables)
| Table | Key Relationships |
|-------|-------------------|
| `saved_reports` | FK → users (saved configurations) |
| `report_jobs` | Async export queue |

#### Support & Audit (5 tables)
| Table | Key Relationships |
|-------|-------------------|
| `tickets` | FK → users |
| `ticket_comments` | FK → tickets, users |
| `notes` | Polymorphic (entity_type + entity_id) |
| `change_history` | Audit trail for all mutations |
| `form_instructions` | Contextual help per form |

### 6.3 — Key Indexes

All foreign key columns have dedicated indexes (added in migration `20260327150000_add_fk_indexes.js`) for join performance. The core tables (`invoices`, `line_items`, `inventory`) have composite indexes on frequently-filtered columns.

---

## 7. Security Architecture

### 7.1 — Authentication

| Mode | Mechanism | Use Case |
|------|-----------|----------|
| **Dev** (`AUTH_MODE=dev`) | Auto-attaches first Admin user; `X-Dev-User-Id` header for impersonation | Development only |
| **SSO** (`AUTH_MODE=sso`) | JWT validation via JWKS endpoint (Azure AD, Okta, etc.) | UAT and Production |

### 7.2 — Authorization (RBAC)

```
User → Role → Permissions
              ├─ vendors:read
              ├─ vendors:write
              ├─ invoices:read
              ├─ invoices:write
              ├─ invoices:approve
              ├─ admin:*
              └─ ... (granular per entity)
```

Route-level enforcement via `requireRole('Admin', 'Manager')` and `requirePermission('invoices', 'write')` middleware.

### 7.3 — Security Middleware Stack

| Layer | Protection |
|-------|------------|
| **Helmet** | XSS protection, clickjacking prevention, MIME-sniff blocking, HSTS |
| **CORS** | Origin whitelist (env-driven); dev allows localhost/private IPs |
| **Rate Limiting** | 200 requests/minute per IP on `/api/*` |
| **express-validator** | Input validation on all mutation endpoints |
| **Multer** | File upload size limit (10 MB), extension/MIME whitelist |
| **Cascade Guards** | Prevents deletion of entities with dependent child records |
| **Audit Middleware** | Logs all CREATE/UPDATE/DELETE with user, timestamp, old/new values |

### 7.4 — Data Sensitivity

| Data | Location | Current Protection | Recommended for Prod |
|------|----------|--------------------|---------------------|
| User credentials | SSO provider | Not stored locally | N/A — delegated to IdP |
| SMTP password | `email_config` table | Plaintext | pgcrypto or env vars |
| ACH/bank data | `vendor_remits` table | Plaintext | TDE + column encryption |
| API traffic | HTTP in dev | No encryption in dev | TLS via Nginx in prod |

---

## 8. Data Flow Diagrams

### 8.1 — Invoice Processing Flow

```
  ┌──────────┐     ┌──────────┐     ┌──────────┐
  │  Excel   │     │  EDI 810 │     │   PDF    │
  │  (.xlsx) │     │  (.edi)  │     │  (.pdf)  │
  └────┬─────┘     └────┬─────┘     └────┬─────┘
       │                │                │
       └────────┬───────┘────────────────┘
                │
       ┌────────▼────────┐
       │  detectFormat()  │  ← MIME + extension check
       └────────┬─────────┘
                │
       ┌────────▼─────────────────┐
       │  Parse (format-specific) │
       │  • parseExcel() — ExcelJS│
       │  • parseEDI()  — custom  │
       │  • parsePDF()  — pdf-parse│
       └────────┬─────────────────┘
                │
       ┌────────▼──────────────────┐
       │  extractFileIdentifiers() │  ← Headers, sender ID, filename
       └────────┬──────────────────┘
                │
       ┌────────▼──────────────┐
       │  matchProfile()       │  ← Auto-match to reader profile
       │  (or manual template) │
       └────────┬──────────────┘
                │
       ┌────────▼──────────────┐
       │  Column Mapping       │  ← Map file columns → DB fields
       │  + Validation         │     (invoice_number, amount, etc.)
       └────────┬──────────────┘
                │
       ┌────────▼──────────────┐
       │  Insert to DB         │  ← invoices + line_items
       │  + Audit Log          │
       └────────┬──────────────┘
                │
       ┌────────▼──────────────┐
       │  Workflow Trigger      │  ← Auto-assign to approver
       │  (assignInvoice)       │
       └────────────────────────┘
```

### 8.2 — Report Export Flow

```
  User clicks "Export XLSX"
       │
       ▼
  handleExport() (client)
       │
       ├─ CSV: Manual string build → Blob → saveAs()
       │
       └─ XLSX: ExcelJS Workbook
              → addWorksheet()
              → addRow() per record
              → wb.xlsx.writeBuffer()
              → Blob → saveAs()

  ── OR (large / scheduled reports) ──

  User creates Report Job
       │
       ▼
  POST /api/report-jobs (server)
       │
       ▼
  reportExporter.js
       │
       ├─ CSV: Manual CSV generation → fs.writeFile
       └─ XLSX: ExcelJS Workbook → writeBuffer → fs.writeFile
       │
       ▼
  Job status: queued → running → completed
  User downloads via GET /api/report-jobs/:id/download
```

### 8.3 — Batch Upload Flow

```
  GET /api/batch-upload/template/:table
       │
       ▼
  Server generates Excel template
  (ExcelJS: headers from field catalog)
       │
       ▼
  User fills in data, uploads file
       │
       ▼
  POST /api/batch-upload/:table
       │
       ▼
  ExcelJS: wb.xlsx.load(buffer)
       │
       ▼
  Row-by-row validation
  (type checking, FK existence, required fields)
       │
       ▼
  Bulk insert with audit logging
       │
       ▼
  Response: { inserted: N, errors: [...] }
```

---

## 9. Future: Invoice Worker Service

### 9.1 — Purpose

A dedicated background process that automatically ingests invoices from external sources (shared folders, email inboxes, SFTP) without impacting the web API's responsiveness.

### 9.2 — Architecture

```
  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │  SFTP Server  │     │  Email Inbox  │     │  Shared      │
  │  /incoming/   │     │  (IMAP/O365)  │     │  Folder/S3   │
  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
         │                     │                    │
         └──────────┬──────────┘────────────────────┘
                    │
           ┌────────▼─────────────┐
           │   Invoice Worker     │
           │   (Node.js process)  │
           │                      │
           │   Poll Loop:         │
           │   1. Check sources   │
           │   2. Download new    │
           │   3. Deduplicate     │
           │   4. Parse file      │  ← Reuses parseExcel/parseEDI/parsePDF
           │   5. Match profile   │  ← Reuses matchProfile()
           │   6. Map & validate  │
           │   7. Insert to DB    │
           │   8. Log result      │
           │   9. Move to archive │
           └────────┬─────────────┘
                    │ Direct PostgreSQL connection
           ┌────────▼─────────────┐
           │    PostgreSQL         │
           │                      │
           │  import_jobs table:   │
           │  • file_name          │
           │  • source (sftp/email)│
           │  • status             │
           │  • rows_imported      │
           │  • errors             │
           │  • started_at         │
           │  • completed_at       │
           └──────────────────────┘
```

### 9.3 — Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Separate process, not API route** | Isolates CPU/memory spikes from web users. Crash-safe — API stays up. |
| **Direct DB, not HTTP** | No timeout limits. Better throughput for bulk inserts. |
| **Shared parsing logic** | Extract `parseExcel`, `parseEDI`, `matchProfile` into `server/services/invoiceParser.js` — used by both API and worker |
| **File deduplication** | Track processed files by SHA-256 hash to prevent re-imports |
| **Retry with dead-letter** | Failed files retry 3× with exponential backoff, then move to `/failed/` and alert admin |
| **Single instance** | No HA required — if worker is down, files queue up. Process on restart. |

### 9.4 — New Database Tables (Future)

```sql
-- Tracks automated import jobs
CREATE TABLE import_jobs (
    import_jobs_id  SERIAL PRIMARY KEY,
    source_type     VARCHAR(20) NOT NULL,  -- 'sftp', 'email', 'folder'
    source_path     VARCHAR(500),
    file_name       VARCHAR(255) NOT NULL,
    file_hash       VARCHAR(64),           -- SHA-256 for dedup
    status          VARCHAR(20) DEFAULT 'queued',  -- queued, running, completed, failed, dead_letter
    rows_imported   INTEGER DEFAULT 0,
    error_message   TEXT,
    retry_count     INTEGER DEFAULT 0,
    profile_id      INTEGER REFERENCES invoice_reader_profiles(invoice_reader_profiles_id),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Source configuration
CREATE TABLE import_sources (
    import_sources_id  SERIAL PRIMARY KEY,
    name               VARCHAR(100) NOT NULL,
    source_type        VARCHAR(20) NOT NULL,  -- 'sftp', 'imap', 'folder', 's3'
    config             JSONB NOT NULL,         -- host, port, credentials, path, etc.
    poll_interval_min  INTEGER DEFAULT 15,
    status             VARCHAR(20) DEFAULT 'Active',
    created_at         TIMESTAMPTZ DEFAULT NOW()
);
```

### 9.5 — Implementation Timeline

| Phase | When | Scope |
|-------|------|-------|
| **Phase 1** | After UAT | Extract parsing logic into shared service; create `import_jobs` table |
| **Phase 2** | Pre-production | Build worker process with folder polling; admin UI for monitoring |
| **Phase 3** | Post-launch | Add email/SFTP polling; retry queue; dead-letter alerting |

---

## 10. Sizing & Capacity Planning

### 10.1 — Current Load Profile

| Metric | Expected Volume | Bottleneck |
|--------|----------------|------------|
| Invoices/month | 2,000+ | Parsing CPU (isolated to worker) |
| Line items/invoice | 10–500 avg | DB insert throughput |
| Concurrent users | 20–50 | Express handles 1000s/sec of CRUD |
| Dashboard queries | 14 parallel per load | PostgreSQL parallel query |
| Report exports | 5–20/day | ExcelJS memory (~50 MB for 100K rows) |
| File uploads | 100–200/month | Multer 10 MB limit; temp storage |

### 10.2 — Growth Triggers

| Milestone | Action |
|-----------|--------|
| 5,000+ invoices/month | Add 3rd app node; increase DB pool max |
| 500+ concurrent users | Consider read replica for report queries |
| 1M+ rows in line_items | Add table partitioning by date |
| Report exports > 100K rows | Stream XLSX instead of buffer-in-memory |
| Multi-region users | CDN for static assets; consider DB read replicas per region |

### 10.3 — Monitoring Recommendations

| Metric | Tool | Threshold |
|--------|------|-----------|
| API response time | Nginx access logs / APM | p95 < 500ms |
| DB connection pool | pgBouncer or Knex pool stats | Utilization < 80% |
| Node.js memory | PM2 monitoring | < 1.5 GB per worker |
| Disk usage | OS monitoring | < 80% |
| Error rate | Log aggregation | < 1% of requests |
| Health endpoint | Uptime monitor | `GET /health` every 30s |

---

## Appendix: Full Dependency List

### Server Production Dependencies (12)

| Package | Purpose |
|---------|---------|
| `cors` | Cross-Origin Resource Sharing |
| `dotenv` | Environment variable loading |
| `exceljs` | Excel file read/write |
| `express` | HTTP framework |
| `express-rate-limit` | API throttling |
| `express-validator` | Input validation |
| `helmet` | Security headers |
| `knex` | SQL query builder + migrations |
| `multer` | File upload handling |
| `nodemailer` | SMTP email sending |
| `pdf-parse` | PDF text extraction |
| `pg` | PostgreSQL driver |

### Client Production Dependencies (10)

| Package | Purpose |
|---------|---------|
| `@chakra-ui/react` | UI component library |
| `axios` | HTTP client |
| `dayjs` | Date formatting/parsing |
| `exceljs` | Client-side Excel export |
| `file-saver` | Trigger browser file downloads |
| `lucide-react` | Icon library |
| `react` | UI framework |
| `react-dom` | React DOM renderer |
| `react-router-dom` | Client-side routing |
| `recharts` | Charting library |
