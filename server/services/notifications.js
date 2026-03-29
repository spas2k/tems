// ============================================================
// Notification Service — creates in-app + email notifications
// Central place so all senders (routes, workflows) go through
// one function instead of duplicating insert + email logic.
// ============================================================
const db = require('../db');
const { send, getConfig, emailTemplate } = require('./email');

/**
 * Create an in-app notification and optionally send an email.
 *
 * @param {object} opts
 * @param {number}   opts.users_id       – target user
 * @param {string}   opts.type           – 'info' | 'warning' | 'success' | 'error'
 * @param {string}   opts.title          – short title
 * @param {string}   opts.message        – longer description
 * @param {string}   [opts.entity_type]  – e.g. 'invoice', 'ticket', 'user'
 * @param {number}   [opts.entity_id]    – linked record id
 * @param {string}   [opts.category]     – email category key (see below)
 * @param {string}   [opts.emailSubject] – override email subject (defaults to title)
 * @param {string}   [opts.emailBody]    – override email HTML body
 */
async function notify(opts) {
  const {
    users_id, type = 'info', title, message,
    entity_type, entity_id,
    category, emailSubject, emailBody,
  } = opts;

  if (!users_id || !title || !message) return null;

  // Check if this notification type is enabled
  if (category) {
    const nType = await db('notification_types').where('key', category).first();
    if (nType && !nType.in_app_enabled) return null;
  }

  // 1. Always create in-app notification
  const notifId = await db.insertReturningId('notifications', {
    users_id,
    type,
    title,
    message,
    entity_type: entity_type || null,
    entity_id:   entity_id || null,
    is_read: false,
  });

  // 2. Attempt email delivery (non-blocking — never throws to caller)
  try {
    await _maybeSendEmail({ users_id, notifId, title, message, category, emailSubject, emailBody });
  } catch (e) {
    // Swallow — the email_log table records the failure
    console.error('[notify] email error:', e.message);
  }

  return notifId;
}

/**
 * Broadcast a notification to multiple users.
 * @param {number[]} userIds
 * @param {object}   opts – same as notify() minus users_id
 */
async function notifyMany(userIds, opts) {
  const ids = [];
  for (const uid of userIds) {
    const nid = await notify({ ...opts, users_id: uid });
    if (nid) ids.push(nid);
  }
  return ids;
}

/**
 * Broadcast to all active users (optionally filtered by role).
 * @param {object} opts – same as notify() minus users_id
 * @param {object} [filters]
 * @param {string[]} [filters.roles] – role names to include (e.g. ['Admin', 'Manager'])
 */
async function notifyAll(opts, filters = {}) {
  let q = db('users').where('status', 'Active').select('users_id');
  if (filters.roles?.length) {
    q = q.whereIn('roles_id',
      db('roles').whereIn('name', filters.roles).select('roles_id')
    );
  }
  const users = await q;
  return notifyMany(users.map(u => u.users_id), opts);
}

// ── Internal: check prefs + config toggles, then send ─────────
const CATEGORY_CONFIG_MAP = {
  invoice_assigned:  'notify_invoice_assigned',
  approval_needed:   'notify_approval_needed',
  status_changed:    'notify_status_changed',
  user_created:      'notify_user_created',
  user_suspended:    'notify_user_suspended',
  role_changed:      'notify_role_changed',
  announcement:      'notify_announcements',
  digest:            'notify_digest',
};

const CATEGORY_PREF_MAP = {
  invoice_assigned:  'email_invoice_assigned',
  approval_needed:   'email_approval_needed',
  status_changed:    'email_status_changed',
  user_created:      'email_user_management',
  user_suspended:    'email_user_management',
  role_changed:      'email_user_management',
  announcement:      'email_announcements',
  digest:            'email_digest',
};

async function _maybeSendEmail({ users_id, notifId, title, message, category, emailSubject, emailBody }) {
  const cfg = await getConfig();
  if (!cfg || !cfg.enabled) return;

  // Check notification_types email toggle
  if (category) {
    const nType = await db('notification_types').where('key', category).first();
    if (nType && !nType.email_enabled) return;
  }

  // Check global toggle for this category
  if (category && CATEGORY_CONFIG_MAP[category]) {
    if (!cfg[CATEGORY_CONFIG_MAP[category]]) return;
  }

  // Check user preference
  const pref = await db('notification_preferences').where('users_id', users_id).first();
  if (pref) {
    if (!pref.email_enabled) return;
    if (category && CATEGORY_PREF_MAP[category] && !pref[CATEGORY_PREF_MAP[category]]) return;
  }

  // Look up user email
  const user = await db('users').where('users_id', users_id).select('email', 'status').first();
  if (!user || user.status === 'Suspended' || !user.email) return;

  const html = emailBody || emailTemplate({
    title: emailSubject || title,
    body: `<p>${message}</p>`,
  });

  await send({
    to: user.email,
    subject: emailSubject || title,
    html,
    users_id,
    notifications_id: notifId,
  });
}

module.exports = { notify, notifyMany, notifyAll };
