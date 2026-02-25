const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { account_id } = req.query;
    let sql = `SELECT c.*, a.name AS account_name FROM contracts c LEFT JOIN accounts a ON c.account_id=a.id`;
    const params = [];
    if (account_id) { sql += ' WHERE c.account_id=?'; params.push(account_id); }
    sql += ' ORDER BY c.name';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT c.*, a.name AS account_name FROM contracts c LEFT JOIN accounts a ON c.account_id=a.id WHERE c.id=?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { account_id, name, contract_number, start_date, end_date, contracted_rate, rate_unit, term_months, status, auto_renew } = req.body;
    const [result] = await db.query(
      'INSERT INTO contracts (account_id, name, contract_number, start_date, end_date, contracted_rate, rate_unit, term_months, status, auto_renew) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [account_id, name, contract_number, start_date, end_date, contracted_rate, rate_unit, term_months, status || 'Active', auto_renew ? 1 : 0]
    );
    const [rows] = await db.query('SELECT c.*, a.name AS account_name FROM contracts c LEFT JOIN accounts a ON c.account_id=a.id WHERE c.id=?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { account_id, name, contract_number, start_date, end_date, contracted_rate, rate_unit, term_months, status, auto_renew } = req.body;
    await db.query(
      'UPDATE contracts SET account_id=?, name=?, contract_number=?, start_date=?, end_date=?, contracted_rate=?, rate_unit=?, term_months=?, status=?, auto_renew=? WHERE id=?',
      [account_id, name, contract_number, start_date, end_date, contracted_rate, rate_unit, term_months, status, auto_renew ? 1 : 0, req.params.id]
    );
    const [rows] = await db.query('SELECT c.*, a.name AS account_name FROM contracts c LEFT JOIN accounts a ON c.account_id=a.id WHERE c.id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/circuits', async (req, res) => {
  try {
    const sql = `
      SELECT ci.*, a.name AS account_name
      FROM circuits ci
      LEFT JOIN accounts a ON ci.account_id = a.id
      WHERE ci.contract_id = ?
      ORDER BY ci.status, ci.location
    `;
    const [rows] = await db.query(sql, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/orders', async (req, res) => {
  try {
    const sql = `
      SELECT o.*, a.name AS account_name
      FROM orders o
      LEFT JOIN accounts a ON o.account_id = a.id
      WHERE o.contract_id = ?
      ORDER BY o.order_date DESC
    `;
    const [rows] = await db.query(sql, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM contracts WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
