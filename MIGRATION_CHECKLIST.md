# TEMS — Migration & Deployment Checklist

> Last updated: 2026-03-28

This document covers what must be done at each stage of deployment:
1. **Dev → Dev** (moving to a new development instance)
2. **Dev → UAT** (preparing for user acceptance testing)
3. **Dev → Production** (go-live)

---

## Stage 1: Dev → Dev (New Development Instance)

These steps get TEMS running on a fresh development machine or server.

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 20.x LTS |
| PostgreSQL | 14+ |
| npm | 10+ |

### Steps

1. **Clone the repository**
   ```bash
   git clone <repo-url> tems
   cd tems
   ```

2. **Install dependencies**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

3. **Create the PostgreSQL database**
   ```sql
   CREATE DATABASE tems;
   ```

4. **Configure environment variables**
   ```bash
   cd server
   cp .env.example .env
   ```
   Edit `.env` with your local database credentials:
   ```
   NODE_ENV=development
   PORT=2001
   DB_CLIENT=pg
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=<your-local-password>
   DB_NAME=tems
   AUTH_MODE=dev
   CORS_ORIGINS=http://localhost:2000
   TRUST_PROXY=false
   ```

5. **Run database migrations**
   ```bash
   cd server
   npx knex migrate:latest
   ```
   This creates all 45 tables across 16 migration files. Verify with:
   ```bash
   npx knex migrate:status
   ```

6. **Seed reference and demo data**
   ```bash
   npx knex seed:run
   ```
   Seeds run in order:
   - `01_seed_data.js` — empty (placeholder)
   - `02_auth_seed.js` — creates roles (Admin, Manager, Analyst, Viewer), permissions, and three demo users (`admin@tems.local`, `manager@tems.local`, `viewer@tems.local`)
   - `03_test_data.js` — creates currencies, locations, company codes, cost centers, and additional reference data

7. **Start the servers**
   ```bash
   # Terminal 1 — API server
   cd server && npm start          # Runs on http://localhost:2001

   # Terminal 2 — Client dev server
   cd client && npm run dev        # Runs on http://localhost:2000
   ```

8. **Verify**
   - Health check: `GET http://localhost:2001/health` → `{"status":"ok"}`
   - Open `http://localhost:2000` — should load the dashboard
   - Dev mode auto-logs in as the first Admin user

### Dev Environment Notes

- `AUTH_MODE=dev` bypasses login. The first Admin user is auto-attached to every request.
- The `X-Dev-User-Id` header (set via localStorage `tems-demo-user-id`) lets you impersonate other users for testing.
- Vite proxies `/api` requests to `http://localhost:2001` automatically.
- All localhost and private-IP origins are allowed by CORS in development.

---

## Stage 2: Dev → UAT (User Acceptance Testing)

UAT is a production-like environment where real users validate the application. The items below must be addressed before UAT deployment.

### 2.1 — Authentication (REQUIRED)

The SSO JWT validation code is **commented out** in `server/middleware/auth.js` (lines 113–150). Before UAT:

- [ ] **Install SSO packages** (not yet in `package.json`):
  ```bash
  cd server
  npm install jsonwebtoken jwks-rsa
  ```

- [ ] **Uncomment the SSO block** in `server/middleware/auth.js`:
  - Lines 113–150 contain the JWT verification logic using `jwks-rsa` and `jsonwebtoken`
  - Remove the comment markers and the `res.status(501)` fallback

- [ ] **Set SSO environment variables**:
  ```
  AUTH_MODE=sso
  SSO_ISSUER=https://login.microsoftonline.com/{tenant-id}/v2.0
  SSO_AUDIENCE=api://{your-app-client-id}
  SSO_JWKS_URI=https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys
  ```

- [ ] **Test the full auth flow** — login, token refresh, role enforcement, permission checks

### 2.2 — Environment Configuration (REQUIRED)

- [ ] **Set `NODE_ENV=production`** (even for UAT — this enables strict CORS, hides error details, and triggers the auth warning if SSO is not configured)

- [ ] **Set `CORS_ORIGINS`** to the UAT frontend URL:
  ```
  CORS_ORIGINS=https://uat-tems.yourdomain.com
  ```

- [ ] **Set `TRUST_PROXY=1`** if behind a reverse proxy (Nginx, ALB)

- [ ] **Database credentials** — use a dedicated UAT database, not dev:
  ```
  DB_HOST=<uat-db-host>
  DB_USER=<uat-db-user>
  DB_PASSWORD=<secure-password>
  DB_NAME=tems_uat
  ```

### 2.3 — Seed Data (REQUIRED)

- [ ] **Run migrations**: `npx knex migrate:latest`
- [ ] **Run `02_auth_seed.js` only** to create roles and permissions — or create roles manually through the admin interface
- [ ] **Do NOT run `03_test_data.js`** in UAT — it contains synthetic data. Neither seed file has a `NODE_ENV` guard, so be deliberate about which seeds you run.
- [ ] **Delete or deactivate demo users** (`admin@tems.local`, `manager@tems.local`, `viewer@tems.local`) after creating real SSO-linked users

### 2.4 — Security Hardening (REQUIRED)

- [ ] **Block dev impersonation header** — In `server/middleware/auth.js`, the `X-Dev-User-Id` header is checked regardless of mode. When `AUTH_MODE=sso`, this code path is not reached (SSO validates the JWT instead), but verify this is the case.

- [ ] **Rate limiting** — Currently hardcoded at 200 requests/minute per IP in `server/server.js` (line ~70). Consider making it configurable:
  ```
  RATE_LIMIT_MAX=200
  RATE_LIMIT_WINDOW=60000
  ```

- [ ] **HTTPS enforcement** — TEMS does not enforce HTTPS at the app level. The reverse proxy (Nginx) must handle HTTP→HTTPS redirects and TLS termination.

### 2.5 — Email Configuration (IF NEEDED)

- [ ] The email system defaults to `tems-noreply@example.com` as the sender — configure real SMTP credentials through the admin UI (`/admin/email-config`) after deployment
- [ ] SMTP password is stored in plaintext in the `email_config` database table — acceptable for dev/UAT; see Production section for hardening options

### 2.6 — Client Build (REQUIRED)

- [ ] Build the production client bundle:
  ```bash
  cd client
  npm run build
  ```
  This outputs to `client/dist/`. Serve via Nginx or your static hosting.

- [ ] Ensure `client/src/api.js` base URL resolves correctly. The Vite proxy only works in dev mode. In UAT/production, the API and client must be served from the same domain (Nginx proxying `/api` to the backend) or `VITE_API_URL` must be set at build time.

### 2.7 — UAT Verification Checklist

- [ ] Health endpoint returns `200 OK`
- [ ] SSO login works and returns correct user roles
- [ ] Role-based access control enforced (Viewer can't create, Analyst can't delete, etc.)
- [ ] All 16 migrations applied (`knex_migrations` table has 16 rows)
- [ ] CORS blocks requests from non-allowed origins
- [ ] File uploads work (invoices, batch upload)
- [ ] Excel/CSV export works (ExcelJS)
- [ ] Email notifications send (if SMTP configured)
- [ ] Rate limiting triggers at threshold

---

## Stage 3: UAT → Production

Everything in Stage 2 applies, plus the following production-specific items.

### 3.1 — Security (CRITICAL)

- [ ] **Confirm `AUTH_MODE=sso`** — if this is `dev` in production, there is NO authentication
- [ ] **Remove demo users** from the database entirely
- [ ] **Rotate all credentials** — DB password, SMTP password, any API keys
- [ ] **Audit `vendor_remit` table access** — contains ACH routing and bank account numbers in plaintext. Consider:
  - PostgreSQL TDE (Transparent Data Encryption)
  - Application-level encryption with `pgcrypto`
  - Restricting DB read access to the application user only
- [ ] **SMTP password encryption** — move SMTP credentials to environment variables or implement DB-level encryption for the `email_config` table
- [ ] **Disable `X-Dev-User-Id` header** — add an explicit reject in `server/middleware/auth.js` when `NODE_ENV=production`:
  ```javascript
  if (process.env.NODE_ENV === 'production' && req.headers['x-dev-user-id']) {
    return res.status(403).json({ error: 'Dev impersonation disabled in production' });
  }
  ```

### 3.2 — Infrastructure (REQUIRED)

- [ ] **Nginx reverse proxy** — serve `client/dist/` as static files, proxy `/api` and `/health` to the backend
- [ ] **HTTPS** — TLS certificate (Let's Encrypt or organizational CA) configured in Nginx
- [ ] **Process manager** — run the Node.js server with PM2 or systemd for auto-restart
  ```bash
  pm2 start server/server.js --name tems-api
  ```
- [ ] **Database backups** — automated daily backups with point-in-time recovery
- [ ] **Health monitoring** — uptime monitor polling `GET /health` (expect HTTP 200 with `{"status":"ok"}`)

### 3.3 — Performance (RECOMMENDED)

- [ ] **Database connection pool** — production knexfile.js uses `min: 2, max: 20`. Adjust based on expected concurrent users.
- [ ] **Rate limiting** — review 200 req/min limit. May need adjustment based on actual usage patterns.
- [ ] **Bundle size** — client bundle is ~2.5 MB (665 KB gzipped). Consider code-splitting with dynamic `import()` if load times are a concern:
  ```javascript
  // vite.config.js — manual chunks example
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          exceljs: ['exceljs'],
          recharts: ['recharts'],
        }
      }
    }
  }
  ```

### 3.4 — Logging (RECOMMENDED)

- [ ] Replace `console.error` / `console.log` with a structured logging library (Winston, Pino, or Bunyan) for:
  - JSON log format (parseable by log aggregators)
  - Log levels (error, warn, info, debug)
  - Request ID correlation
  - File/service rotation

### 3.5 — Database (REQUIRED)

- [ ] Run all migrations: `NODE_ENV=production npx knex migrate:latest`
- [ ] Verify all 16 migration files applied
- [ ] **Do NOT run any seed files** in production
- [ ] Create initial Admin user manually or via SSO first-login provisioning
- [ ] Set up automated backups (pg_dump or cloud-native snapshots)

### 3.6 — Production Verification Checklist

- [ ] `GET /health` → `{"status":"ok"}`
- [ ] SSO login flow works end-to-end
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] CORS rejects non-allowed origins
- [ ] Rate limiting active
- [ ] File upload/download works
- [ ] Excel/CSV export works
- [ ] Email delivery works
- [ ] Error responses hide internal details (no stack traces)
- [ ] Backup/restore tested

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | `development` or `production` |
| `PORT` | No | `2001` | API server port |
| `DB_CLIENT` | No | `pg` | Database driver (`pg` for PostgreSQL) |
| `DB_HOST` | Prod: Yes | `localhost` | Database host |
| `DB_PORT` | No | `5432` | Database port |
| `DB_USER` | Prod: Yes | `postgres` | Database user |
| `DB_PASSWORD` | Prod: Yes | — | Database password |
| `DB_NAME` | Prod: Yes | `tems` | Database name |
| `AUTH_MODE` | Yes | `dev` | `dev` (no auth) or `sso` (JWT) |
| `SSO_ISSUER` | SSO only | — | JWT issuer URL |
| `SSO_AUDIENCE` | SSO only | — | JWT audience |
| `SSO_JWKS_URI` | SSO only | — | JWKS endpoint for key retrieval |
| `CORS_ORIGINS` | Prod: Yes | `http://localhost:2000` | Comma-separated allowed origins |
| `TRUST_PROXY` | If proxied | `false` | Set to `1` behind one proxy hop |

---

## Current Codebase Status (as of 2026-03-28)

| Area | Status |
|------|--------|
| Database migrations | 16 files, 45 tables — all tested |
| Dependencies | No known vulnerabilities (xlsx replaced with ExcelJS) |
| Server tests | 7 suites, 92 tests — all passing |
| Client tests | 16 suites, 279 tests — all passing |
| Client build | 4390 modules, 0 errors |
| Documentation | README, FEATURES, DEPLOYMENT, DOCUMENTATION, DATABASE_SCHEMA — all current |
| SSO code | Written but commented out — needs uncomment + package install for UAT/Prod |
| Dev auth | Working — auto-attaches first Admin user, supports impersonation |
