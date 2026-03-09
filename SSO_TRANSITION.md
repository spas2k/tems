# TEMS — SSO / Authentication Transition Guide

> **Purpose**: This document captures everything needed to move TEMS from the
> current "dev-bypass" auth mode to full Single Sign-On (SSO) on a corporate
> domain. Follow this guide after the domain, identity provider (IdP), and SSL
> certificate are in place.

---

## 1. Current Auth Architecture (Dev Mode)

| Component | File | Description |
|-----------|------|-------------|
| Auth middleware | `server/middleware/auth.js` | `authenticate()` — in dev mode, auto-attaches the first Admin user from the database |
| Permission guard | `server/middleware/auth.js` | `requirePermission(resource, action)` — checks `req.user.permissions` |
| Role guard | `server/middleware/auth.js` | `requireRole(...roles)` — checks `req.user.role_name` |
| Audit logger | `server/middleware/audit.js` | Intercepts POST/PUT/DELETE responses to record changes |
| React context | `client/src/context/AuthContext.jsx` | `AuthProvider` + `useAuth()` — calls `/api/users/me` on mount |
| User/Role API | `server/routes/users.js`, `server/routes/roles.js` | Full CRUD for user and role management |

### Dev Bypass Flow
1. `AUTH_MODE` env var is **not set** or set to `dev`.
2. `authenticate()` middleware fetches the first Admin-role user from the DB.
3. That user (with full permissions) is attached to `req.user` on every request.
4. No login page is required in dev mode.

---

## 2. Database Tables (Recreate on Domain)

These 5 tables are created by migration `20260301000000_auth_audit_tables.js`.
They must be recreated on the production database alongside the 11 existing tables.

### 2.1 `roles`
| Column | Type | Notes |
|--------|------|-------|
| roles_id | INT PK AUTO | |
| name | VARCHAR(100) UNIQUE | e.g. Admin, Manager, Analyst, Viewer |
| description | VARCHAR(500) | |
| created_at / updated_at | TIMESTAMP | auto-managed |

### 2.2 `permissions`
| Column | Type | Notes |
|--------|------|-------|
| permissions_id | INT PK AUTO | |
| resource | VARCHAR(100) | e.g. accounts, circuits, users |
| action | VARCHAR(50) | create, read, update, delete |
| UNIQUE(resource, action) | | 52 seed rows (13 resources × 4 actions) |

### 2.3 `role_permissions` (junction)
| Column | Type | Notes |
|--------|------|-------|
| role_permissions_id | INT PK AUTO | |
| roles_id | INT FK → roles | CASCADE on delete |
| permissions_id | INT FK → permissions | CASCADE on delete |
| UNIQUE(roles_id, permissions_id) | | |

### 2.4 `users`
| Column | Type | Notes |
|--------|------|-------|
| users_id | INT PK AUTO | |
| email | VARCHAR(255) UNIQUE | |
| display_name | VARCHAR(255) | |
| sso_subject | VARCHAR(255) | IdP user identifier (sub claim) — nullable until SSO enabled |
| sso_provider | VARCHAR(100) | e.g. "azure-ad", "okta" — nullable until SSO enabled |
| roles_id | INT FK → roles | |
| status | ENUM('Active','Inactive','Suspended') | default Active |
| avatar_url | VARCHAR(500) | optional |
| last_login | DATETIME | updated on each SSO login |
| created_at / updated_at | TIMESTAMP | |

### 2.5 `audit_log`
| Column | Type | Notes |
|--------|------|-------|
| audit_log_id | INT PK AUTO | |
| users_id | INT FK → users (SET NULL) | who performed the action |
| action | VARCHAR(50) | CREATE, UPDATE, DELETE |
| resource | VARCHAR(100) | table name |
| resource_id | INT | PK of affected row |
| old_values | JSON | snapshot before change |
| new_values | JSON | snapshot after change |
| ip_address | VARCHAR(45) | IPv4 or IPv6 |
| created_at | TIMESTAMP | default CURRENT_TIMESTAMP |

---

## 3. Seed Data

After creating tables, run `server/seeds/02_auth_seed.js` (via `npx knex seed:run`) or manually insert:

| Role | Permissions |
|------|-------------|
| **Admin** | All 52 permissions (full access) |
| **Manager** | Everything except users/roles management |
| **Analyst** | Read all + create/update/delete on cost_savings, disputes |
| **Viewer** | Read-only on all resources |

A dev admin user (`admin@tems.local`) is created with the Admin role. Replace this with real users after SSO is configured.

---

## 4. SSO Transition Steps

### 4.1 Prerequisites
- [ ] Corporate domain with SSL certificate
- [ ] Identity Provider (IdP) configured: Azure AD, Okta, Auth0, etc.
- [ ] Client ID, Tenant/Issuer URL, and JWKS endpoint from IdP
- [ ] Decide on OIDC or SAML (OIDC recommended — the code is pre-built for JWT)

### 4.2 Install Required Packages
```bash
cd server
npm install jsonwebtoken jwks-rsa
# or for passport-based flow:
npm install passport passport-openidconnect express-session
```

### 4.3 Set Environment Variables
```env
AUTH_MODE=sso
SSO_ISSUER=https://login.microsoftonline.com/{tenant-id}/v2.0
SSO_AUDIENCE=your-client-id
SSO_JWKS_URI=https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys

# existing vars
CORS_ORIGINS=https://tems.yourdomain.com
DB_HOST=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=doctore
```

### 4.4 Uncomment SSO Code in `server/middleware/auth.js`
The file already contains a complete SSO implementation block (commented out). To enable:

1. **Open** `server/middleware/auth.js`
2. **Uncomment** the `// ── SSO mode ──` block inside `authenticate()`
3. This block:
   - Reads the `Authorization: Bearer <token>` header
   - Verifies the JWT against the JWKS endpoint
   - Extracts `sub`, `email`, `name` from the token
   - Finds or creates the user in the `users` table
   - Loads permissions from `role_permissions` join
   - Attaches `req.user` with full permission set

4. **Remove or guard** the dev bypass block (keep it for local testing only):
   ```js
   if (process.env.AUTH_MODE !== 'sso') {
     // dev bypass code...
   }
   ```

### 4.5 Frontend Changes
1. **Add a login redirect**: When `/api/users/me` returns 401, redirect to the IdP login page or display a "Sign In" button.
2. **Store the access token**: After SSO callback, store the JWT (cookie or memory).
3. **Attach token to API calls**: Update `client/src/api.js`:
   ```js
   api.interceptors.request.use(config => {
     const token = getAccessToken(); // from cookie, sessionStorage, or auth library
     if (token) config.headers.Authorization = `Bearer ${token}`;
     return config;
   });
   ```
4. **Handle token refresh**: IdPs typically issue short-lived access tokens. Use the refresh token flow or silent renew.

### 4.6 User Provisioning
Two options:

**Option A — JIT (Just-In-Time) Provisioning** (built into the SSO code):
- First login auto-creates a user with the default "Viewer" role.
- Admins then promote users via the Users management page.

**Option B — Pre-provisioned**:
- Admin adds users manually before they log in.
- Set `sso_subject` from the IdP user directory.

### 4.7 Post-Transition Checklist
- [ ] Verify all API calls return 401 without a valid token
- [ ] Verify the Users page shows real logged-in users
- [ ] Verify the Audit Log captures all CRUD actions with correct user attribution
- [ ] Test role-based access: Viewer cannot create/update/delete
- [ ] Test Manager cannot access Users or Roles management
- [ ] Remove the dev admin user (`admin@tems.local`) or set to Inactive
- [ ] Configure session/token expiry per security policy
- [ ] Set `CORS_ORIGINS` to the exact production domain
- [ ] Run a penetration test / security scan

---

## 5. All TEMS Database Tables (Full List)

For domain migration, all 16 tables must be recreated:

### Original Tables (11)
| # | Table | Migration |
|---|-------|-----------|
| 1 | accounts | 20250101000000_initial_schema |
| 2 | contracts | 20250101000000_initial_schema |
| 3 | circuits | 20250101000000_initial_schema |
| 4 | orders | 20250101000000_initial_schema |
| 5 | invoices | 20250101000000_initial_schema |
| 6 | line_items | 20250101000000_initial_schema |
| 7 | allocations | 20250101000000_initial_schema |
| 8 | cost_savings | 20250101000000_initial_schema |
| 9 | usoc_codes | 20250201000000_phase_a_usoc_rates |
| 10 | contract_rates | 20250201000000_phase_a_usoc_rates |
| 11 | disputes | 20250301000000_phase_bcd_disputes |

### Auth/Audit Tables (5)
| # | Table | Migration |
|---|-------|-----------|
| 12 | roles | 20260301000000_auth_audit_tables |
| 13 | permissions | 20260301000000_auth_audit_tables |
| 14 | role_permissions | 20260301000000_auth_audit_tables |
| 15 | users | 20260301000000_auth_audit_tables |
| 16 | audit_log | 20260301000000_auth_audit_tables |

### Recreating on a New Database
```bash
# 1. Update .env with the new database connection
# 2. Run all migrations
cd server
npx knex migrate:latest

# 3. Seed reference data (roles, permissions, role matrix)
npx knex seed:run

# 4. (Optional) Load sample data
mysql -u user -p database < seed.sql
mysql -u user -p database < seed_extra.sql
```

---

## 6. File Reference

| File | Purpose |
|------|---------|
| `server/migrations/20260301000000_auth_audit_tables.js` | Creates auth/audit tables |
| `server/seeds/02_auth_seed.js` | Seeds roles, permissions, role-permission matrix, dev admin |
| `server/middleware/auth.js` | Authentication + authorization middleware (dev bypass + SSO placeholder) |
| `server/middleware/audit.js` | Audit logging middleware for all CRUD routes |
| `server/routes/users.js` | User management API (CRUD + /me) |
| `server/routes/roles.js` | Role, permission, and audit-log API |
| `client/src/context/AuthContext.jsx` | React auth context provider |
| `client/src/pages/UserManagement.jsx` | User management UI (Admin only) |
| `client/src/pages/AuditLog.jsx` | Audit log viewer (Admin only) |
| `client/src/api.js` | API client (auth endpoints at bottom) |

---

## 7. Security Notes

- **Passwords**: TEMS does **not** store passwords. Authentication is fully delegated to the IdP via SSO.
- **Tokens**: JWTs are validated server-side against the IdP's JWKS endpoint. Never trust client-provided tokens without verification.
- **Rate limiting**: Already configured at 200 req/min via `express-rate-limit`.
- **CORS**: Restricted to `CORS_ORIGINS` whitelist.
- **Helmet**: HTTP security headers are in place.
- **Input validation**: All routes use `express-validator`.
- **Cascade guards**: DELETE operations check for dependent records before allowing deletion.

---

*Last updated: Auto-generated during auth groundwork implementation*
