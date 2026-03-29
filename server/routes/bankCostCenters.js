const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');

/* ── GET / — list all cost centers ─────────────────────── */
router.get('/', async (_req, res) => {
  try {
    const rows = await db('bank_cost_centers').orderBy('name');
    res.json(rows);
  } catch (err) { safeError(res, err, 'bank_cost_centers'); }
});

module.exports = router;
