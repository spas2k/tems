const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM accounts ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM accounts WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, account_number, vendor_type, contact_email, contact_phone, status } = req.body;
    const [result] = await db.query(
      'INSERT INTO accounts (name, account_number, vendor_type, contact_email, contact_phone, status) VALUES (?,?,?,?,?,?)',
      [name, account_number, vendor_type, contact_email, contact_phone, status || 'Active']
    );
    const [rows] = await db.query('SELECT * FROM accounts WHERE id=?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, account_number, vendor_type, contact_email, contact_phone, status } = req.body;
    await db.query(
      'UPDATE accounts SET name=?, account_number=?, vendor_type=?, contact_email=?, contact_phone=?, status=? WHERE id=?',
      [name, account_number, vendor_type, contact_email, contact_phone, status, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM accounts WHERE id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/circuits', async (req, res) => {
  try {
    const sql = `
      SELECT ci.*, co.contract_number
      FROM circuits ci
      LEFT JOIN contracts co ON ci.contract_id = co.id
      WHERE ci.account_id = ?
      ORDER BY ci.status, ci.location
    `;
    const [rows] = await db.query(sql, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM accounts WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
