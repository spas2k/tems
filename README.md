# TEMS — Telecom Expense Management System

A full-stack web application for managing telecom vendors, accounts, contracts, inventory (circuits), invoices, cost savings, billing disputes, and operational workflows.

---

## Quick Start (Development)

### Prerequisites
- Node.js 18+ (developed on v20.9)
- PostgreSQL 14+

### 1. Install dependencies

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 2. Configure the database

```bash
cp server/.env.example server/.env
# Edit server/.env with your PostgreSQL credentials
```

### 3. Create the database schema and seed demo data

```bash
cd server
npx knex migrate:latest
npx knex seed:run
```

### 4. Start the development servers

Open two terminals:

```bash
# Terminal 1 — API server (port 2001)
cd server && npm run dev

# Terminal 2 — Vite dev server (port 2000)
cd client && npm run dev
```

Open **http://localhost:2000** in your browser.

---

## Testing

TEMS has a comprehensive unit test suite covering server and client code.

### Run all tests

```bash
# Server tests (Jest)
cd server && npm test

# Client tests (Vitest)
cd client && npm test
```

### Test results summary

| Layer | Framework | Suites | Tests | Status |
|-------|-----------|--------|-------|--------|
| Server | Jest + Supertest | 7 | 92 | All passing |
| Client | Vitest + Testing Library | 16 | 279 | All passing |
| **Total** | | **23** | **371** | **All passing** |

### Server test suites (92 tests)

| Suite | Tests | Covers |
|-------|-------|--------|
| `validators.test.js` | 31 | Request validation rules for all entities |
| `bulkUpdate.test.js` | 16 | Bulk update ID/field validation and stripping |
| `cascadeGuard.test.js` | 10 | FK dependency map and delete guards |
| `safeError.test.js` | 11 | Error mapping, context logging, production mode |
| `auth.test.js` | 15 | Role guards, permission guards, 401/403 flows |
| `db.test.js` | 7 | Knex instance, PK conventions, insertReturningId |
| `engine.test.js` | 2 | Workflow engine exports and params |

### Client test suites (279 tests)

| Suite | Tests | Covers |
|-------|-------|--------|
| `Pagination.test.jsx` | 20 | Page controls, ranges, edge cases |
| `Modal.test.jsx` | 13 | Open/close, overlay click, Escape key, portal |
| `AnnouncementBanner.test.jsx` | 6 | Banner rendering, dismiss, API calls |
| `ScrollToTop.test.jsx` | 4 | Scroll position reset on navigation |
| `DataTable.test.jsx` | 14 | Columns, rows, export, loading, favorites |
| `CrudModal.test.jsx` | 19 | All field types (text, select, date, etc.) |
| `AuthContext.test.jsx` | 20 | Permissions, roles, admin detection, user switching |
| `ConfirmContext.test.jsx` | 9 | Promise-based confirm/cancel dialog |
| `ConsoleErrorContext.test.jsx` | 7 | Error capture, formatting, clear |
| `FavoritesContext.test.jsx` | 9 | Bookmark CRUD, dedup, error resilience |
| `useCrudTable.test.jsx` | 33 | Filters, sort, pagination, CRUD operations |
| `Dashboard.test.jsx` | 5 | Loading, error, KPIs, sections, charts |
| `Vendors.test.jsx` | 5 | Render, loading, data, headers, KPIs |
| `Preferences.test.jsx` | 6 | Theme options, form instructions toggle |
| `lookupConfigs.test.js` | 90 | 10 lookup factories × 9 assertions each |
| `roleColors.test.js` | 19 | Color schemes, role mapping functions |

### Test configuration

- **Server:** Jest (`server/jest.config.js`) — `testEnvironment: 'node'`
- **Client:** Vitest 2.1.8 (`client/vite.config.js` test block) — `environment: 'jsdom'`, setup file at `client/src/test/setup.js`
- **Note:** Vitest pinned to 2.1.8 and jsdom to 24.1.3 for Node 20.9 compatibility

---

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full production guide including Nginx config, PM2 setup, SSO, and security hardening.

### Quick production steps

```bash
cd client && npm run build          # Build frontend → client/dist/
cd ../server
npx knex migrate:latest             # Apply database migrations
pm2 start server.js --name tems-api # Start with process manager
```

### Health check

```
GET /health → {"status":"ok","timestamp":"..."}
```

---

## Authentication

| `AUTH_MODE` | Behavior |
|-------------|----------|
| `dev` (default) | No login. Auto-attaches first Admin user. **Not for production.** |
| `sso` | JWT validation via `SSO_ISSUER` / `SSO_AUDIENCE` / `SSO_JWKS_URI`. See [SSO_TRANSITION.md](SSO_TRANSITION.md). |

---

## Project Structure

```
tems/
├── client/                 # React + Vite (port 2000 in dev)
│   └── src/
│       ├── pages/          # ~70 page components (list, detail, add views)
│       ├── components/     # Reusable UI (DataTable, CrudModal, Modal, etc.)
│       ├── context/        # Auth, Confirm, Favorites, ConsoleError providers
│       ├── hooks/          # useCrudTable (filter/sort/pagination/CRUD engine)
│       ├── utils/          # Lookup configs, role colors, formatters
│       ├── __tests__/      # Vitest unit tests (16 suites, 279 tests)
│       ├── api.js          # All Axios API calls
│       └── App.jsx         # Router + sidebar layout
└── server/                 # Express + Knex (port 2001)
    ├── routes/             # ~35 route files (one per resource)
    ├── middleware/          # auth.js (RBAC), audit.js (change logging)
    ├── migrations/         # 16 Knex migration files (45 tables)
    ├── seeds/              # Auth seed + test data
    ├── workflows/          # Workflow engine + definitions
    ├── __tests__/          # Jest unit tests (7 suites, 92 tests)
    └── server.js           # Entry point
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 5, React Router v6, Axios, Recharts, Lucide React, Day.js |
| Backend | Node.js, Express 4, Knex.js |
| Database | PostgreSQL 14+ |
| Auth | RBAC with role/permission middleware, SSO-ready (JWT/JWKS) |
| Security | Helmet, CORS whitelist, rate limiting, express-validator, audit middleware |
| Testing | Jest + Supertest (server), Vitest + Testing Library (client) |
| Data Export | ExcelJS, file-saver |
| Invoice Parsing | pdf-parse, ExcelJS, custom EDI X12 810 parser |

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [README.md](README.md) | This file — quick start, testing, and project overview |
| [FEATURES.md](FEATURES.md) | Complete feature listing by module |
| [DOCUMENTATION.md](DOCUMENTATION.md) | Comprehensive project documentation (architecture, setup, data model, API) |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment, security, Nginx, PM2, backups |
| [SSO_TRANSITION.md](SSO_TRANSITION.md) | SSO/authentication transition guide |
| [DATABASE_SCHEMA_recreated.md](DATABASE_SCHEMA_recreated.md) | Full database schema reference (45 tables) |
| [CREATE_REPORT.md](CREATE_REPORT.md) | Report builder developer reference |
