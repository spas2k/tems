// ============================================================
// Email Service — thin abstraction over Nodemailer
// Transport is configured from DB (email_config table).
// When disabled or misconfigured, emails are logged but not sent.
// ============================================================
const nodemailer = require('nodemailer');
const db = require('../db');

let _transporter = null;
let _config = null;
let _configTs = 0;

const CONFIG_TTL_MS = 60_000; // re-read config every 60 s

/**
 * Load the single-row email_config from DB (cached for 60 s).
 */
async function getConfig(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _config && now - _configTs < CONFIG_TTL_MS) return _config;
  _config = await db('email_config').first();
  _configTs = now;
  return _config;
}

/**
 * Create (or recycle) a Nodemailer transporter from the current config.
 */
async function getTransporter() {
  const cfg = await getConfig();
  if (!cfg || !cfg.enabled || !cfg.smtp_host) return null;

  // Rebuild transporter if config changed
  if (!_transporter || _transporter._temsConfigId !== cfg.email_config_id || _transporter._temsUpdatedAt !== String(cfg.updated_at)) {
    _transporter = nodemailer.createTransport({
      host: cfg.smtp_host,
      port: cfg.smtp_port || 587,
      secure: !!cfg.smtp_secure,                        // true → port 465
      auth: cfg.smtp_user ? { user: cfg.smtp_user, pass: cfg.smtp_pass } : undefined,
      tls: {
        rejectUnauthorized: cfg.reject_unauthorized !== false,
        requireTLS: cfg.require_tls !== false,
      },
    });
    _transporter._temsConfigId  = cfg.email_config_id;
    _transporter._temsUpdatedAt = String(cfg.updated_at);
  }
  return _transporter;
}

/**
 * Send a single email. Returns the email_log row.
 *
 * @param {object} opts
 * @param {string} opts.to           – recipient email
 * @param {string} opts.subject      – email subject
 * @param {string} opts.html         – HTML body
 * @param {string} [opts.text]       – plain-text fallback
 * @param {number} [opts.users_id]   – linked user
 * @param {number} [opts.notifications_id] – linked notification
 */
async function send({ to, subject, html, text, users_id, notifications_id }) {
  const cfg = await getConfig();

  // Create log row first (pending)
  const logId = await db.insertReturningId('email_log', {
    users_id: users_id || null,
    notifications_id: notifications_id || null,
    to_address: to,
    subject,
    body: html,
    status: 'pending',
  });

  // If email is globally disabled, mark skipped
  if (!cfg || !cfg.enabled) {
    await db('email_log').where('email_log_id', logId).update({ status: 'skipped', error_message: 'Email sending is disabled' });
    return db('email_log').where('email_log_id', logId).first();
  }

  try {
    const transporter = await getTransporter();
    if (!transporter) {
      await db('email_log').where('email_log_id', logId).update({ status: 'failed', error_message: 'Transporter not configured' });
      return db('email_log').where('email_log_id', logId).first();
    }

    const info = await transporter.sendMail({
      from: `"${cfg.from_name || 'TEMS'}" <${cfg.from_address || 'tems-noreply@example.com'}>`,
      replyTo: cfg.reply_to || undefined,
      to,
      subject,
      html,
      text: text || undefined,
    });

    await db('email_log').where('email_log_id', logId).update({
      status: 'sent',
      smtp_response: info.response || info.messageId || null,
      sent_at: db.fn.now(),
    });
  } catch (err) {
    await db('email_log').where('email_log_id', logId).update({
      status: 'failed',
      error_message: String(err.message || err).slice(0, 2000),
      retry_count: db.raw('retry_count + 1'),
    });
  }

  return db('email_log').where('email_log_id', logId).first();
}

/**
 * Test the current SMTP configuration by sending a test email.
 * @param {string} toAddress – where to send the test
 */
async function sendTest(toAddress) {
  return send({
    to: toAddress,
    subject: 'TEMS — Email Configuration Test',
    html: emailTemplate({
      title: 'Email Test',
      body: '<p>If you are reading this, the TEMS email configuration is working correctly.</p>',
    }),
  });
}

/**
 * Flush the cached config (e.g. after admin saves changes).
 */
function flushConfigCache() {
  _config = null;
  _configTs = 0;
  _transporter = null;
}

// ── Simple HTML template wrapper ──────────────────────────────
function emailTemplate({ title, body, footerText }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin:0; padding:0; background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  .wrap { max-width:600px; margin:32px auto; background:#ffffff; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,0.08); overflow:hidden; }
  .header { background:linear-gradient(135deg,#1e293b 0%,#334155 100%); padding:24px 32px; }
  .header h1 { margin:0; color:#f8fafc; font-size:18px; font-weight:800; }
  .header p  { margin:4px 0 0; color:#94a3b8; font-size:12px; }
  .body { padding:28px 32px; color:#334155; font-size:14px; line-height:1.6; }
  .body h2 { margin:0 0 12px; font-size:16px; color:#1e293b; }
  .btn { display:inline-block; padding:10px 24px; background:#2563eb; color:#ffffff!important; text-decoration:none; border-radius:8px; font-weight:700; font-size:13px; }
  .footer { padding:16px 32px; background:#f8fafc; border-top:1px solid #e2e8f0; text-align:center; color:#94a3b8; font-size:11px; }
  .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
</style>
</head><body>
<div class="wrap">
  <div class="header">
    <h1>TEMS</h1>
    <p>Telecom Expense Management System</p>
  </div>
  <div class="body">
    <h2>${title}</h2>
    ${body}
  </div>
  <div class="footer">${footerText || 'This is an automated message from TEMS. Please do not reply directly.'}</div>
</div>
</body></html>`;
}

module.exports = { send, sendTest, getConfig, flushConfigCache, emailTemplate };
