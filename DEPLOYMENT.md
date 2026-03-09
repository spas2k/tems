# TEMS Deployment Guide

This guide covers production deployment, security hardening, and operational maintenance for TEMS.

---

## Prerequisites

| Requirement | Minimum |
|-------------|---------|
| Node.js | 18 LTS |
| npm | 9+ |
| Database | MySQL 8 / PostgreSQL 14 / SQL Server 2019 |
| OS | Linux (recommended), Windows Server, or macOS |
| Memory | 512 MB RAM for Node process |

---

## Environment Variables Reference

Copy `server/.env.example` to `server/.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | No | HTTP port (default `2001`) |
| `DB_CLIENT` | Yes | `mysql2`, `pg`, or `mssql` |
| `DB_HOST` | Yes | Database hostname |
| `DB_PORT` | No | Database port (default per driver) |
| `DB_USER` | Yes | Database user |
| `DB_PASSWORD` | Yes | Database password |
| `DB_NAME` | Yes | Database name |
| `AUTH_MODE` | Yes | **Must be `sso` in production** |
| `SSO_ISSUER` | When SSO | JWT issuer URL |
| `SSO_AUDIENCE` | When SSO | JWT audience string |
| `SSO_JWKS_URI` | When SSO | JWKS endpoint URL |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `TRUST_PROXY` | When proxied | `1` if behind Nginx/load balancer |

---

## Production Checklist

### Security

- [ ] `AUTH_MODE=sso` — dev mode bypasses all authentication
- [ ] `CORS_ORIGINS` set to exact production domain(s)
- [ ] Database user has only `SELECT`, `INSERT`, `UPDATE`, `DELETE` on the `tems` database — no `CREATE`, `DROP`, `ALTER`
- [ ] SSL/TLS termination at the reverse proxy (not in Node)
- [ ] Firewall: port 2001 not exposed publicly (traffic only from reverse proxy)
- [ ] SSO token signing key rotated on a schedule
- [ ] `server/.env` not committed to version control (check `.gitignore`)

### Database

- [ ] Run `npx knex migrate:latest` before first start
- [ ] Run `npx knex seed:run` only if demo data is needed (seeds are idempotent)
- [ ] Connection pooling: default pool size is 2–10; adjust `DB_POOL_MIN` / `DB_POOL_MAX` in `knexfile.js` for load
- [ ] Enable automated database backups

### Application

- [ ] `NODE_ENV=production` (enables stricter error handling, disables stack traces in API responses)
- [ ] Build client: `cd client && npm run build`
- [ ] Static files served by Nginx/CDN — Node should not serve static files
- [ ] Use PM2 or systemd to manage the process (auto-restart on crash)

---

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name tems.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tems.yourdomain.com;

    ssl_certificate     /etc/ssl/certs/tems.crt;
    ssl_certificate_key /etc/ssl/private/tems.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Serve built React app
    root /var/www/tems/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # Hashed assets can be cached longer
    location ~* \.(js|css|woff2|png|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:2001;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Health check (no auth)
    location /health {
        proxy_pass http://127.0.0.1:2001/health;
        access_log off;
    }
}
```

---

## PM2 Process Management

**Install PM2:**
```bash
npm install -g pm2
```

**Start:**
```bash
cd /var/www/tems/server
pm2 start server.js --name tems-api --max-memory-restart 512M --env production
pm2 save
pm2 startup   # follow the printed command to enable on boot
```

**Common commands:**
```bash
pm2 status          # view process status
pm2 logs tems-api   # tail logs
pm2 restart tems-api
pm2 reload tems-api # zero-downtime reload
```

---

## Database Migrations

Migrations live in `server/migrations/` and run in timestamp order.

```bash
# Apply all pending migrations
cd server
npx knex migrate:latest

# Roll back the latest batch
npx knex migrate:rollback

# Check migration status
npx knex migrate:status
```

The supplemental migration (`20260303000000_supplemental_tables.js`) uses `hasTable`/`hasColumn` guards so it's safe to run even if some tables were created manually.

---

## SSO Configuration

Set `AUTH_MODE=sso` and configure your identity provider to issue JWTs with the required claims:

| JWT Claim | Mapped To |
|-----------|-----------|
| `sub` or `preferred_username` | `users.username` |
| `email` | `users.email` |
| `name` | `users.display_name` |

The middleware in `server/middleware/auth.js` expects the token in the `Authorization: Bearer <token>` header, validates it against the JWKS endpoint, then looks up the user in the `users` table. Users must be provisioned in `users` (or SSO auto-provisioning uncommented in the middleware).

---

## Logging and Monitoring

**Audit log** — all POST/PUT/DELETE API calls are logged to the `audit_log` table:
- `who`: username
- `action`: HTTP method
- `table_name`: affected resource
- `old_values` / `new_values`: JSON snapshots (sensitive fields are redacted)

**Application logs** — PM2 captures stdout/stderr:
```bash
pm2 logs tems-api --lines 200
```

**Structured logging** — For production, consider adding a logger (e.g., `pino`) to `server.js`. The app currently uses `console.error` for errors.

**Health check monitoring** — Configure your uptime monitor to poll `GET https://tems.yourdomain.com/health`. Expect `{"status":"ok"}` with HTTP 200. HTTP 503 means the database is unreachable.

---

## Known Limitations and Security Notes

### SheetJS (xlsx) Package
The `xlsx` package (SheetJS) version 0.18.5 — the last free/open-source release — has a known prototype pollution vulnerability ([CVE-2023-30533](https://nvd.nist.gov/vuln/detail/CVE-2023-30533)). The paid [SheetJS Pro](https://sheetjs.com/) resolves this. Mitigations in place:
- File size is limited via `multer` (10 MB)
- Only `.xlsx` and `.xls` extensions are accepted
- MIME type is checked
- Do not allow untrusted public users to upload files

### Vendor Remit Banking Data
The `vendor_remit` table stores ACH routing and bank account numbers as plaintext. For PCI-DSS or regulatory compliance:
- Enable **Transparent Data Encryption (TDE)** at the database level
- Restrict DB read access to application user only
- Consider application-level encryption for these columns

### Rate Limiting
The API is rate-limited to 200 requests/minute per IP. Behind a load balancer, ensure `TRUST_PROXY=1` is set so the real client IP is used (not the proxy IP). If all users appear to come from the same IP, they will share the rate limit.

### CORS
`CORS_ORIGINS` should be set to the exact production origin — do not use wildcards (`*`). The server validates the `Origin` header against this allowlist.

---

## Backup and Recovery

Recommended backup strategy:

| Item | Frequency | Method |
|------|-----------|--------|
| Database | Daily + before migrations | `mysqldump` / `pg_dump` |
| `server/.env` | On any change | Encrypted secrets manager |
| Uploaded files | Daily | If using disk storage |

**MySQL backup example:**
```bash
mysqldump -u tems_user -p tems > tems_backup_$(date +%Y%m%d).sql
```

**PostgreSQL backup example:**
```bash
pg_dump -U tems_user tems > tems_backup_$(date +%Y%m%d).sql
```

---

## Upgrading

1. Back up the database
2. Pull the latest code
3. `cd server && npm install`
4. `cd client && npm install && npm run build`
5. `npx knex migrate:latest` (from `server/`)
6. `pm2 reload tems-api`

All migrations use `hasTable`/`hasColumn` guards and are non-destructive forward-only.
