const express = require('express');
const router = express.Router();
const db = require('../db');

const BASE_SQL = `
  SELECT o.*, a.name AS account_name, co.contract_number, ci.circuit_id AS circuit_identifier
  FROM orders o
  LEFT JOIN accounts a ON o.account_id = a.id
  LEFT JOIN contracts co ON o.contract_id = co.id
  LEFT JOIN circuits ci ON o.circuit_id = ci.id
`;

router.get('/', async (req, res) => {
  try {
    const { account_id, status } = req.query;
    let sql = BASE_SQL;
    const params = [];
    const wheres = [];
    if (account_id) { wheres.push('o.account_id=?'); params.push(account_id); }
    if (status)     { wheres.push('o.status=?');     params.push(status); }
    if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
    sql += ' ORDER BY o.order_date DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(BASE_SQL + ' WHERE o.id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { account_id, contract_id, circuit_id, order_number, description, contracted_rate, order_date, due_date, status, notes } = req.body;
    const [result] = await db.query(
      'INSERT INTO orders (account_id, contract_id, circuit_id, order_number, description, contracted_rate, order_date, due_date, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [account_id, contract_id, circuit_id || null, order_number, description, contracted_rate, order_date, due_date || null, status || 'In Progress', notes || '']
    );
    const [rows] = await db.query(BASE_SQL + ' WHERE o.id=?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { account_id, contract_id, circuit_id, order_number, description, contracted_rate, order_date, due_date, status, notes } = req.body;
    await db.query(
      'UPDATE orders SET account_id=?, contract_id=?, circuit_id=?, order_number=?, description=?, contracted_rate=?, order_date=?, due_date=?, status=?, notes=? WHERE id=?',
      [account_id, contract_id, circuit_id || null, order_number, description, contracted_rate, order_date, due_date || null, status, notes || '', req.params.id]
    );
    const [rows] = await db.query(BASE_SQL + ' WHERE o.id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/circuits', async (req, res) => {
  try {
    const sql = `
      SELECT ci.*, a.name AS account_name, co.contract_number
      FROM circuits ci
      LEFT JOIN accounts a ON ci.account_id = a.id
      LEFT JOIN contracts co ON ci.contract_id = co.id
      WHERE ci.order_id = ?
      ORDER BY ci.install_date DESC, ci.circuit_id
    `;
    const [rows] = await db.query(sql, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM orders WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
