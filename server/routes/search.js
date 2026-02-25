const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) return res.json({ accounts: [], contracts: [], circuits: [], orders: [], invoices: [] });

  const like = `%${q}%`;
  try {
    const [[accounts], [contracts], [circuits], [orders], [invoices]] = await Promise.all([
      db.query(
        `SELECT a.id, a.name, a.account_number AS sub
         FROM accounts a
         WHERE a.name LIKE ? OR a.account_number LIKE ?
         LIMIT 6`,
        [like, like]
      ),
      db.query(
        `SELECT c.id, COALESCE(c.contract_number, c.name) AS contract_number, c.name,
                a.name AS sub
         FROM contracts c LEFT JOIN accounts a ON c.account_id = a.id
         WHERE c.contract_number LIKE ? OR c.name LIKE ?
         LIMIT 6`,
        [like, like]
      ),
      db.query(
        `SELECT ci.id, ci.circuit_id, ci.location AS sub
         FROM circuits ci
         WHERE ci.circuit_id LIKE ? OR ci.location LIKE ? OR ci.type LIKE ?
         LIMIT 6`,
        [like, like, like]
      ),
      db.query(
        `SELECT o.id, o.order_number, LEFT(o.description, 60) AS sub
         FROM orders o
         WHERE o.order_number LIKE ? OR o.description LIKE ?
         LIMIT 6`,
        [like, like]
      ),
      db.query(
        `SELECT i.id, i.invoice_number, a.name AS sub
         FROM invoices i LEFT JOIN accounts a ON i.account_id = a.id
         WHERE i.invoice_number LIKE ?
         LIMIT 6`,
        [like]
      ),
    ]);

    res.json({ accounts, contracts, circuits, orders, invoices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
