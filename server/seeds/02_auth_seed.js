// ============================================================
// Seed: Default roles, permissions, and dev admin user
// ============================================================

const ROLES = [
  { name: 'Admin',   description: 'Full system access — manage users, roles, and all data' },
  { name: 'Manager', description: 'Create, read, update all data — cannot manage users or roles' },
  { name: 'Analyst', description: 'Read all data, create/update cost savings and disputes' },
  { name: 'Viewer',  description: 'Read-only access to all data' },
];

// All TEMS resources
const RESOURCES = [
  'accounts', 'contracts', 'circuits', 'orders', 'invoices',
  'line_items', 'allocations', 'cost_savings', 'usoc_codes',
  'contract_rates', 'disputes', 'users', 'roles',
];

const ACTIONS = ['create', 'read', 'update', 'delete'];

// Role → allowed [resource:action] matrix
const ROLE_MATRIX = {
  Admin:   '*',   // all permissions
  Manager: {
    deny: ['users:create', 'users:update', 'users:delete', 'roles:create', 'roles:update', 'roles:delete'],
  },
  Analyst: {
    allow: [
      // Read everything
      ...RESOURCES.map(r => `${r}:read`),
      // CUD on cost_savings and disputes only
      'cost_savings:create', 'cost_savings:update', 'cost_savings:delete',
      'disputes:create', 'disputes:update', 'disputes:delete',
    ],
  },
  Viewer: {
    allow: RESOURCES.map(r => `${r}:read`),
  },
};

exports.seed = async function (knex) {
  // ── Clear existing auth data (order matters for FKs) ──
  await knex('audit_log').del();
  await knex('users').del();
  await knex('role_permissions').del();
  await knex('permissions').del();
  await knex('roles').del();

  // ── Insert roles ────────────────────────────────────────
  for (const role of ROLES) {
    await knex('roles').insert(role);
  }
  const roleRows = await knex('roles').select('roles_id', 'name');
  const roleMap = Object.fromEntries(roleRows.map(r => [r.name, r.roles_id]));

  // ── Insert permissions ──────────────────────────────────
  const permInserts = [];
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      permInserts.push({
        resource,
        action,
        description: `${action} ${resource}`,
      });
    }
  }
  await knex('permissions').insert(permInserts);
  const permRows = await knex('permissions').select('permissions_id', 'resource', 'action');
  const permMap = Object.fromEntries(
    permRows.map(p => [`${p.resource}:${p.action}`, p.permissions_id])
  );

  // ── Assign permissions to roles ─────────────────────────
  const allPerms = Object.keys(permMap);
  const rpInserts = [];

  for (const [roleName, matrix] of Object.entries(ROLE_MATRIX)) {
    let allowed;
    if (matrix === '*') {
      allowed = allPerms;
    } else if (matrix.allow) {
      allowed = matrix.allow;
    } else if (matrix.deny) {
      allowed = allPerms.filter(p => !matrix.deny.includes(p));
    }
    for (const perm of allowed) {
      if (permMap[perm]) {
        rpInserts.push({ roles_id: roleMap[roleName], permissions_id: permMap[perm] });
      }
    }
  }
  await knex('role_permissions').insert(rpInserts);

  // ── Insert dev admin user ───────────────────────────────
  await knex('users').insert({
    email: 'admin@tems.local',
    display_name: 'TEMS Admin',
    roles_id: roleMap['Admin'],
    status: 'Active',
    sso_subject: null,
    sso_provider: null,
  });

  // ── Insert demo role users (User Switcher) ───────────────
  // These represent the three switchable personas in dev/demo mode.
  await knex('users').insert([
    {
      email: 'manager@tems.local',
      display_name: 'Demo User',
      roles_id: roleMap['Manager'],
      status: 'Active',
      sso_subject: null,
      sso_provider: null,
    },
    {
      email: 'viewer@tems.local',
      display_name: 'Demo Guest',
      roles_id: roleMap['Viewer'],
      status: 'Active',
      sso_subject: null,
      sso_provider: null,
    },
  ]);
};
