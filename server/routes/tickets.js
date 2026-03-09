// ============================================================
// Tickets API Routes
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { body } = require('express-validator');
const safeError = require('./_safeError');
const { validate, idParam } = require('./_validators');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

const CATEGORIES = [
  'Enhancement', 'System Issue', 'Bug Report',
  'Billing Error', 'Rate Dispute', 'Service Issue', 'Contract Problem',
  'Data Quality', 'Invoice Discrepancy', 'Provisioning',
  'Access & Permissions', 'Feature Request', 'Documentation', 'Other',
];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES   = [
  'Open', 'In Progress', 'Pending Vendor', 'Pending Internal',
  'On Hold', 'In Review', 'Resolved', 'Closed',
];

const ticketRules = [
  body('title').trim().notEmpty().withMessage('title is required').isLength({ max: 255 }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 10000 }),
  body('category').optional().isIn(CATEGORIES).withMessage('Invalid category'),
  body('priority').optional().isIn(PRIORITIES).withMessage('Invalid priority'),
  body('status').optional().isIn(STATUSES).withMessage('Invalid status'),
  body('source_entity_type').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 50 }),
  body('source_entity_id').optional({ nullable: true, values: 'falsy' }).isInt({ min: 1 }),
  body('source_label').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 255 }),
  body('assigned_users_id').optional({ nullable: true, values: 'falsy' }).isInt({ min: 1 }),
  body('due_date').optional({ nullable: true, values: 'falsy' }).isISO8601(),
  body('resolved_date').optional({ nullable: true, values: 'falsy' }).isISO8601(),
  body('resolution').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 10000 }),
  body('tags').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 500 }),
  body('steps_to_reproduce').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 10000 }),
  body('expected_behavior').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 5000 }),
  body('actual_behavior').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 5000 }),
  body('console_errors').optional({ nullable: true, values: 'falsy' }).trim(),
];

function baseQuery() {
  return db('tickets as t')
    .leftJoin('users as u', 't.assigned_users_id', 'u.users_id')
    .select('t.*', 'u.display_name as assigned_user_name');
}

// ── GET /api/tickets/meta ────────────────────────────────
// Returns categories, priorities, statuses for dynamic forms
router.get('/meta', async (_req, res) => {
  res.json({ categories: CATEGORIES, priorities: PRIORITIES, statuses: STATUSES });
});

// ── GET /api/tickets ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let q = baseQuery();
    if (req.query.status)             q = q.where('t.status', req.query.status);
    if (req.query.priority)           q = q.where('t.priority', req.query.priority);
    if (req.query.category)           q = q.where('t.category', req.query.category);
    if (req.query.assigned_users_id)  q = q.where('t.assigned_users_id', req.query.assigned_users_id);
    if (req.query.source_entity_type) q = q.where('t.source_entity_type', req.query.source_entity_type);
    if (req.query.source_entity_id)   q = q.where('t.source_entity_id', req.query.source_entity_id);
    if (req.query.created_by)         q = q.where('t.created_by', req.query.created_by);
    const rows = await q.orderBy('t.created_at', 'desc');
    res.json(rows);
  } catch (err) { safeError(res, err, 'tickets'); }
});

// ── GET /api/tickets/:id ─────────────────────────────────
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const ticket = await baseQuery().where('t.tickets_id', req.params.id).first();
    if (!ticket) return res.status(404).json({ error: 'Not found' });
    const comments = await db('ticket_comments')
      .where('tickets_id', req.params.id)
      .orderBy('created_at', 'asc');
    res.json({ ...ticket, comments });
  } catch (err) { safeError(res, err, 'tickets'); }
});

// ── POST /api/tickets ────────────────────────────────────
router.post('/', ticketRules, validate, auditCreate('tickets', 'tickets_id'), async (req, res) => {
  try {
    const {
      title, description, category, priority, status,
      source_entity_type, source_entity_id, source_label,
      assigned_users_id, due_date, resolution, tags,
      steps_to_reproduce, expected_behavior, actual_behavior,
      console_errors,
    } = req.body;

    const created_by = req.user?.display_name || req.user?.username || 'System';

    // Insert with a placeholder ticket_number first so we can use the PK to build it
    const id = await db.insertReturningId('tickets', {
      ticket_number:      'TKT-TEMP',
      title:              title.trim(),
      description:        description?.trim() || '',
      category:           category  || 'Other',
      priority:           priority  || 'Medium',
      status:             status    || 'Open',
      source_entity_type: source_entity_type || null,
      source_entity_id:   source_entity_id   || null,
      source_label:       source_label       || null,
      assigned_users_id:  assigned_users_id  || null,
      created_by,
      due_date:           due_date           || null,
      resolution:         resolution?.trim() || null,
      tags:               tags?.trim()       || null,
      steps_to_reproduce: steps_to_reproduce?.trim() || null,
      expected_behavior:  expected_behavior?.trim() || null,
      actual_behavior:    actual_behavior?.trim() || null,
      console_errors:     console_errors?.trim() || null,
    });

    // Update to the real ticket number (zero-padded 5 digits based on PK)
    const ticket_number = `TKT-${String(id).padStart(5, '0')}`;
    await db('tickets').where('tickets_id', id).update({ ticket_number });

    // Log creation as first system comment
    await db.insertReturningId('ticket_comments', {
      tickets_id:   id,
      author:       created_by,
      content:      `Ticket created with priority **${priority || 'Medium'}** and category **${category || 'Other'}**`,
      comment_type: 'status_change',
    });

    // Notify assignee if set at creation time
    if (assigned_users_id) {
      await db.insertReturningId('notifications', {
        users_id:    Number(assigned_users_id),
        type:        'info',
        title:       'Ticket Assigned to You',
        message:     `${ticket_number}: ${title.trim()}`,
        entity_type: 'ticket',
        entity_id:   id,
      });
    }

    // Notify all admin users about the new ticket
    const admins = await db('users')
      .join('roles', 'users.roles_id', 'roles.roles_id')
      .where('roles.name', 'Admin')
      .where('users.status', 'Active')
      .select('users.users_id');
    if (admins.length) {
      await db('notifications').insert(
        admins.map(a => ({
          users_id:    a.users_id,
          type:        'info',
          title:       'New Ticket Created',
          message:     `${ticket_number}: ${title.trim()}`,
          entity_type: 'ticket',
          entity_id:   id,
        }))
      );
    }

    const row = await baseQuery().where('t.tickets_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'tickets'); }
});

// ── PUT /api/tickets/:id ─────────────────────────────────
router.put('/:id', idParam, ...ticketRules, validate, auditUpdate('tickets', 'tickets_id'), async (req, res) => {
  try {
    const {
      title, description, category, priority, status,
      source_entity_type, source_entity_id, source_label,
      assigned_users_id, due_date, resolved_date, resolution, tags,
      steps_to_reproduce, expected_behavior, actual_behavior,
      console_errors,
    } = req.body;

    const author = req.user?.display_name || req.user?.username || 'System';
    const prev   = await db('tickets').where('tickets_id', req.params.id).first();

    // Auto-log status change
    if (prev && prev.status !== status) {
      await db.insertReturningId('ticket_comments', {
        tickets_id:   req.params.id,
        author,
        content:      `Status changed from **${prev.status}** to **${status}**`,
        comment_type: 'status_change',
      });
    }

    // Auto-log priority change
    if (prev && prev.priority !== priority) {
      await db.insertReturningId('ticket_comments', {
        tickets_id:   req.params.id,
        author,
        content:      `Priority changed from **${prev.priority}** to **${priority}**`,
        comment_type: 'status_change',
      });
    }

    // Auto-log assignment change + notify new assignee
    const newAssignee = assigned_users_id ? Number(assigned_users_id) : null;
    if (prev && prev.assigned_users_id !== newAssignee) {
      let content;
      if (newAssignee) {
        const u = await db('users').where('users_id', newAssignee).first();
        content = `Assigned to **${u?.display_name || 'Unknown'}**`;
        // Notify the new assignee
        const ticketRow = await db('tickets').where('tickets_id', req.params.id).first();
        await db.insertReturningId('notifications', {
          users_id:    newAssignee,
          type:        'info',
          title:       'Ticket Assigned to You',
          message:     `${ticketRow?.ticket_number}: ${title?.trim() || ticketRow?.title}`,
          entity_type: 'ticket',
          entity_id:   Number(req.params.id),
        });
      } else {
        content = 'Unassigned';
      }
      await db.insertReturningId('ticket_comments', {
        tickets_id:   req.params.id,
        author,
        content,
        comment_type: 'assignment',
      });
    }

    // Auto-set resolved_date when moving to Resolved/Closed
    const autoResolvedDate =
      (status === 'Resolved' || status === 'Closed') && (!prev || (prev.status !== 'Resolved' && prev.status !== 'Closed'))
        ? new Date().toISOString().split('T')[0]
        : (resolved_date || null);

    await db('tickets').where('tickets_id', req.params.id).update({
      title:              title?.trim(),
      description:        description?.trim() || '',
      category,
      priority,
      status,
      source_entity_type: source_entity_type || null,
      source_entity_id:   source_entity_id   || null,
      source_label:       source_label       || null,
      assigned_users_id:  assigned_users_id  || null,
      due_date:           due_date           || null,
      resolved_date:      autoResolvedDate,
      resolution:         resolution?.trim() || null,
      tags:               tags?.trim()       || null,
      steps_to_reproduce: steps_to_reproduce?.trim() || null,
      expected_behavior:  expected_behavior?.trim() || null,
      actual_behavior:    actual_behavior?.trim() || null,
      console_errors:     console_errors?.trim() || null,
      updated_at:         db.fn.now(),
    });

    const row = await baseQuery().where('t.tickets_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'tickets'); }
});

// ── DELETE /api/tickets/:id ──────────────────────────────
router.delete('/:id', idParam, validate, auditDelete('tickets', 'tickets_id'), async (req, res) => {
  try {
    // Delete child comments first within a transaction
    await db.transaction(async trx => {
      await trx('ticket_comments').where('tickets_id', req.params.id).del();
      await trx('tickets').where('tickets_id', req.params.id).del();
    });
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'tickets'); }
});

// ── POST /api/tickets/:id/comments ───────────────────────
router.post('/:id/comments', idParam, validate, async (req, res) => {
  try {
    const { content, comment_type = 'comment' } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Comment content is required' });
    if (!['comment', 'note', 'resolution'].includes(comment_type)) {
      return res.status(400).json({ error: 'Invalid comment_type' });
    }
    const author = req.user?.display_name || req.user?.username || 'System';
    const id = await db.insertReturningId('ticket_comments', {
      tickets_id:   req.params.id,
      author,
      content:      content.trim(),
      comment_type,
    });
    const row = await db('ticket_comments').where('ticket_comments_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'tickets'); }
});

// ── DELETE /api/tickets/:id/comments/:commentId ──────────
router.delete('/:id/comments/:commentId', async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId, 10);
    if (!Number.isInteger(commentId) || commentId < 1) {
      return res.status(400).json({ error: 'Invalid commentId' });
    }
    // Verify comment belongs to this ticket and check ownership
    const comment = await db('ticket_comments').where('ticket_comments_id', commentId).first();
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (String(comment.tickets_id) !== String(req.params.id)) {
      return res.status(403).json({ error: 'Comment does not belong to this ticket' });
    }
    const isAdmin = req.user?.role_name === 'Admin' || req.user?.role_name === 'Manager';
    const isAuthor = comment.author === (req.user?.display_name || req.user?.username);
    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }
    await db('ticket_comments').where('ticket_comments_id', commentId).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'tickets'); }
});

module.exports = router;
