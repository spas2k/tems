const express = require('express');
const router = express.Router();
const db = require('../db');

const BASE_SQL = `
  SELECT al.*, li.description AS line_item_description, li.amount AS line_item_amount,
         i.id AS invoice_id, i.invoice_number, a.name AS account_name
  FROM allocations al
  LEFT JOIN line_items li ON al.line_item_id = li.id
  LEFT JOIN invoices i    ON li.invoice_id   = i.id
  LEFT JOIN accounts a    ON i.account_id    = a.id
`;

router.get('/', async (req, res) => {
  try {
    const { line_item_id, invoice_id } = req.query;
    let sql = BASE_SQL;
    const params = [];
    const wheres = [];
    if (line_item_id) { wheres.push('al.line_item_id=?'); params.push(line_item_id); }
    if (invoice_id)   { wheres.push('li.invoice_id=?');   params.push(invoice_id); }
    if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(BASE_SQL + ' WHERE al.id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { line_item_id, cost_center, department, percentage, allocated_amount, notes } = req.body;
    const [result] = await db.query(
      'INSERT INTO allocations (line_item_id, cost_center, department, percentage, allocated_amount, notes) VALUES (?,?,?,?,?,?)',
      [line_item_id, cost_center, department, percentage, allocated_amount, notes || '']
    );
    const [rows] = await db.query(BASE_SQL + ' WHERE al.id=?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { line_item_id, cost_center, department, percentage, allocated_amount, notes } = req.body;
    await db.query(
      'UPDATE allocations SET line_item_id=?, cost_center=?, department=?, percentage=?, allocated_amount=?, notes=? WHERE id=?',
      [line_item_id, cost_center, department, percentage, allocated_amount, notes || '', req.params.id]
    );
    const [rows] = await db.query(BASE_SQL + ' WHERE al.id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM allocations WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
