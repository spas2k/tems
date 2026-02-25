const express = require('express');
const router = express.Router();
const db = require('../db');

const BASE_SQL = `
  SELECT cs.*, a.name AS account_name, ci.circuit_id AS circuit_identifier
  FROM cost_savings cs
  LEFT JOIN accounts a ON cs.account_id = a.id
  LEFT JOIN circuits ci ON cs.circuit_id = ci.id
`;

router.get('/', async (req, res) => {
  try {
    const { account_id, status } = req.query;
    let sql = BASE_SQL;
    const params = [];
    const wheres = [];
    if (account_id) { wheres.push('cs.account_id=?'); params.push(account_id); }
    if (status)     { wheres.push('cs.status=?');     params.push(status); }
    if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
    sql += ' ORDER BY cs.identified_date DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(BASE_SQL + ' WHERE cs.id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { account_id, circuit_id, line_item_id, invoice_id, category, description, identified_date, status, projected_savings, realized_savings, notes } = req.body;
    const [result] = await db.query(
      'INSERT INTO cost_savings (account_id, circuit_id, line_item_id, invoice_id, category, description, identified_date, status, projected_savings, realized_savings, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [account_id, circuit_id || null, line_item_id || null, invoice_id || null, category, description, identified_date, status || 'Identified', projected_savings, realized_savings || 0, notes || '']
    );
    const [rows] = await db.query(BASE_SQL + ' WHERE cs.id=?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { account_id, circuit_id, line_item_id, invoice_id, category, description, identified_date, status, projected_savings, realized_savings, notes } = req.body;
    await db.query(
      'UPDATE cost_savings SET account_id=?, circuit_id=?, line_item_id=?, invoice_id=?, category=?, description=?, identified_date=?, status=?, projected_savings=?, realized_savings=?, notes=? WHERE id=?',
      [account_id, circuit_id || null, line_item_id || null, invoice_id || null, category, description, identified_date, status, projected_savings, realized_savings || 0, notes || '', req.params.id]
    );
    const [rows] = await db.query(BASE_SQL + ' WHERE cs.id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM cost_savings WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
