const express = require('express');
const router = express.Router();
const db = require('../db');

const BASE_SQL = `
  SELECT ci.*, a.name AS account_name, co.contract_number, o.order_number
  FROM circuits ci
  LEFT JOIN accounts a ON ci.account_id = a.id
  LEFT JOIN contracts co ON ci.contract_id = co.id
  LEFT JOIN orders o ON ci.order_id = o.id
`;

router.get('/', async (req, res) => {
  try {
    const { account_id, status } = req.query;
    let sql = BASE_SQL;
    const params = [];
    const wheres = [];
    if (account_id) { wheres.push('ci.account_id=?'); params.push(account_id); }
    if (status)     { wheres.push('ci.status=?');     params.push(status); }
    if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
    sql += ' ORDER BY ci.location';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(BASE_SQL + ' WHERE ci.id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { account_id, contract_id, order_id, circuit_id, type, bandwidth, location, contracted_rate, status, install_date, disconnect_date } = req.body;
    const [result] = await db.query(
      'INSERT INTO circuits (account_id, contract_id, order_id, circuit_id, type, bandwidth, location, contracted_rate, status, install_date, disconnect_date) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [account_id, contract_id, order_id || null, circuit_id, type, bandwidth, location, contracted_rate, status || 'Pending', install_date || null, disconnect_date || null]
    );
    const [rows] = await db.query(BASE_SQL + ' WHERE ci.id=?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { account_id, contract_id, order_id, circuit_id, type, bandwidth, location, contracted_rate, status, install_date, disconnect_date } = req.body;
    await db.query(
      'UPDATE circuits SET account_id=?, contract_id=?, order_id=?, circuit_id=?, type=?, bandwidth=?, location=?, contracted_rate=?, status=?, install_date=?, disconnect_date=? WHERE id=?',
      [account_id, contract_id, order_id || null, circuit_id, type, bandwidth, location, contracted_rate, status, install_date || null, disconnect_date || null, req.params.id]
    );
    const [rows] = await db.query(BASE_SQL + ' WHERE ci.id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/invoices', async (req, res) => {
  try {
    const sql = `
      SELECT i.*, a.name AS account_name,
        COUNT(li.id) AS line_item_count,
        SUM(li.amount) AS circuit_total
      FROM invoices i
      JOIN line_items li ON li.invoice_id = i.id
      JOIN accounts a ON i.account_id = a.id
      WHERE li.circuit_id = ?
      GROUP BY i.id
      ORDER BY i.invoice_date DESC
    `;
    const [rows] = await db.query(sql, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM circuits WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
