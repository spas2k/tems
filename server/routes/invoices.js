const express = require('express');
const router = express.Router();
const db = require('../db');

const BASE_SQL = `
  SELECT i.*, a.name AS account_name
  FROM invoices i
  LEFT JOIN accounts a ON i.account_id = a.id
`;

router.get('/', async (req, res) => {
  try {
    const { account_id, status } = req.query;
    let sql = BASE_SQL;
    const params = [];
    const wheres = [];
    if (account_id) { wheres.push('i.account_id=?'); params.push(account_id); }
    if (status)     { wheres.push('i.status=?');     params.push(status); }
    if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
    sql += ' ORDER BY i.invoice_date DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(BASE_SQL + ' WHERE i.id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const invoice = rows[0];
    const [lineItems] = await db.query(
      'SELECT li.*, ci.circuit_id AS circuit_identifier FROM line_items li LEFT JOIN circuits ci ON li.circuit_id=ci.id WHERE li.invoice_id=?',
      [req.params.id]
    );
    res.json({ ...invoice, line_items: lineItems });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { account_id, invoice_number, invoice_date, due_date, period_start, period_end, total_amount, status, payment_date } = req.body;
    const [result] = await db.query(
      'INSERT INTO invoices (account_id, invoice_number, invoice_date, due_date, period_start, period_end, total_amount, status, payment_date) VALUES (?,?,?,?,?,?,?,?,?)',
      [account_id, invoice_number, invoice_date, due_date, period_start, period_end, total_amount, status || 'Open', payment_date || null]
    );
    const [rows] = await db.query(BASE_SQL + ' WHERE i.id=?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { account_id, invoice_number, invoice_date, due_date, period_start, period_end, total_amount, status, payment_date } = req.body;
    await db.query(
      'UPDATE invoices SET account_id=?, invoice_number=?, invoice_date=?, due_date=?, period_start=?, period_end=?, total_amount=?, status=?, payment_date=? WHERE id=?',
      [account_id, invoice_number, invoice_date, due_date, period_start, period_end, total_amount, status, payment_date || null, req.params.id]
    );
    const [rows] = await db.query(BASE_SQL + ' WHERE i.id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM invoices WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
