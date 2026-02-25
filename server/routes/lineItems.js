const express = require('express');
const router = express.Router();
const db = require('../db');

const BASE_SQL = `
  SELECT li.*, ci.circuit_id AS circuit_identifier, ci.location AS circuit_location,
         i.invoice_number
  FROM line_items li
  LEFT JOIN circuits ci ON li.circuit_id = ci.id
  LEFT JOIN invoices i  ON li.invoice_id = i.id
`;

router.get('/', async (req, res) => {
  try {
    const { invoice_id, circuit_id } = req.query;
    let sql = BASE_SQL;
    const params = [];
    const wheres = [];
    if (invoice_id) { wheres.push('li.invoice_id=?'); params.push(invoice_id); }
    if (circuit_id) { wheres.push('li.circuit_id=?'); params.push(circuit_id); }
    if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(BASE_SQL + ' WHERE li.id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { invoice_id, circuit_id, description, charge_type, amount, contracted_rate, period_start, period_end } = req.body;
    const variance = (contracted_rate != null && amount != null) ? (parseFloat(amount) - parseFloat(contracted_rate)) : null;
    const [result] = await db.query(
      'INSERT INTO line_items (invoice_id, circuit_id, description, charge_type, amount, contracted_rate, variance, period_start, period_end) VALUES (?,?,?,?,?,?,?,?,?)',
      [invoice_id, circuit_id || null, description, charge_type, amount, contracted_rate || null, variance, period_start, period_end]
    );
    const [rows] = await db.query(BASE_SQL + ' WHERE li.id=?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { invoice_id, circuit_id, description, charge_type, amount, contracted_rate, period_start, period_end } = req.body;
    const variance = (contracted_rate != null && amount != null) ? (parseFloat(amount) - parseFloat(contracted_rate)) : null;
    await db.query(
      'UPDATE line_items SET invoice_id=?, circuit_id=?, description=?, charge_type=?, amount=?, contracted_rate=?, variance=?, period_start=?, period_end=? WHERE id=?',
      [invoice_id, circuit_id || null, description, charge_type, amount, contracted_rate || null, variance, period_start, period_end, req.params.id]
    );
    const [rows] = await db.query(BASE_SQL + ' WHERE li.id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM line_items WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
