# TEMS — Telecom Expense Management System

A full-stack web application for managing telecom vendor accounts, contracts, circuits, invoices, cost savings, and billing disputes.

---

## Quick Start (Development)

### Prerequisites
- Node.js 18+
- MySQL 8+, PostgreSQL 14+, or SQL Server 2019+

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
# Edit server/.env with your DB credentials
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

## Production Deployment

### 1. Build the client

```bash
cd client && npm run build
# Output: client/dist/
```

### 2. Serve static files

Configure your reverse proxy (Nginx, Caddy, etc.) to:
- Serve `client/dist/` as static files for all non-API routes
- Proxy `/api/*` requests to the Node server on port 2001

**Nginx example:**
```nginx
server {
    listen 443 ssl;
    server_name tems.yourdomain.com;

    root /var/www/tems/client/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:2001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 3. Environment variables

```bash
cp server/.env.example server/.env
```

Set:
- `NODE_ENV=production`
- `AUTH_MODE=sso` (required — dev mode gives every user Admin access)
- `CORS_ORIGINS=https://tems.yourdomain.com`
- `TRUST_PROXY=1` (if behind Nginx/load balancer)
- All `SSO_*` variables for your identity provider
- Strong DB credentials

### 4. Run migrations

```bash
cd server && npx knex migrate:latest --env production
```

### 5. Start the server (with PM2)

```bash
npm install -g pm2
pm2 start server/server.js --name tems-api --max-memory-restart 512M
pm2 save
pm2 startup
```

### Health check

The server exposes `GET /health` (no auth required) for load balancers:

```
HTTP/1.1 200 OK
{"status":"ok","timestamp":"2026-03-07T12:00:00.000Z"}
```

---

## Switching Databases

Edit `server/.env`:

| Database   | `DB_CLIENT` | Driver package |
|------------|-------------|----------------|
| MySQL 8    | `mysql2`    | pre-installed  |
| PostgreSQL | `pg`        | pre-installed  |
| SQL Server | `mssql`     | `npm i tedious` |

Then run `npx knex migrate:latest`.

---

## Authentication

| `AUTH_MODE` | Behavior |
|-------------|----------|
| `dev` (default) | No login. Auto-attaches first Admin user. **Not for production.** |
| `sso` | JWT validation via `SSO_ISSUER` / `SSO_AUDIENCE` / `SSO_JWKS_URI`. See `server/middleware/auth.js` for the SSO block to uncomment. |

---

## Project Structure

```
tems/
├── client/          # React + Vite (port 2000 in dev)
│   └── src/
│       ├── pages/   # One file per route
│       ├── components/
│       ├── context/
│       ├── api.js   # All axios calls
│       └── App.jsx  # Router + sidebar
└── server/          # Express + Knex (port 2001)
    ├── routes/      # One file per resource
    ├── middleware/  # auth.js, audit.js
    ├── migrations/  # Database schema (run in order)
    ├── seeds/       # Demo / default data
    └── server.js    # Entry point
```

---

## Full Documentation

See [DOCUMENTATION.md](DOCUMENTATION.md) for complete documentation including data model, API reference, and all page descriptions.
