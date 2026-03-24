const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');

router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) return res.json({ vendors: [], contracts: [], inventory: [], orders: [], invoices: [], usoc_codes: [] });

  const escaped = q.replace(/[%_\\]/g, '\\$&');
  const like = `%${escaped}%`;
  const matchOperator = db.client.config.client === 'pg' ? 'ilike' : 'like';
  try {
    const [vendors, contracts, inventory, orders, invoices, usoc_codes] = await Promise.all([
      db('accounts as a')
        .select('a.accounts_id', 'a.name', 'a.account_number as sub')
        .where('a.name', matchOperator, like)
        .orWhere('a.account_number', matchOperator, like)
        .limit(6),

      db('contracts as c')
        .leftJoin('accounts as a', 'c.accounts_id', 'a.accounts_id')
        .select('c.contracts_id', db.raw('COALESCE(c.contract_number, c.name) as contract_number'), 'c.name', 'a.name as sub')
        .where('c.contract_number', matchOperator, like)
        .orWhere('c.name', matchOperator, like)
        .limit(6),

      db('inventory as ci')
        .select('ci.inventory_id', 'ci.inventory_number', 'ci.location as sub')
        .where('ci.inventory_number', matchOperator, like)
        .orWhere('ci.location', matchOperator, like)
        .orWhere('ci.type', matchOperator, like)
        .limit(6),

      db('orders as o')
        .select('o.orders_id', 'o.order_number', db.raw('SUBSTRING(o.description, 1, 60) as sub'))
        .where('o.order_number', matchOperator, like)
        .orWhere('o.description', matchOperator, like)
        .limit(6),

      db('invoices as i')
        .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
        .select('i.invoices_id', 'i.invoice_number', 'a.name as sub')
        .where('i.invoice_number', matchOperator, like)
        .limit(6),

      db('usoc_codes as u')
        .select('u.usoc_codes_id', 'u.usoc_code', 'u.description as sub')
        .where('u.usoc_code', matchOperator, like)
        .orWhere('u.description', matchOperator, like)
        .limit(6),
    ]);

    res.json({ vendors, contracts, inventory, orders, invoices, usoc_codes });
  } catch (err) {
    safeError(res, err, 'search');
  }
});

module.exports = router;
