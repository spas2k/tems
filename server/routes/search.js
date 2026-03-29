/**
 * @file search.js — Global Search API — /api/search
 * Full-text search across all major entity tables.
 * Searches run in parallel with ILIKE pattern matching.
 *
 * @module routes/search
 */
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');

/**
 * GET /
 * Search across all major entities using ?q= query param (min 2 chars).
 * Returns grouped results from vendors, accounts, contracts, inventory,
 * orders, invoices, locations, disputes, tickets, cost_savings, usoc_codes.
 */
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  const empty = {
    vendors: [], accounts: [], contracts: [], inventory: [], orders: [],
    invoices: [], locations: [], disputes: [], tickets: [],
    cost_savings: [], usoc_codes: [],
  };
  if (!q || q.length < 2) return res.json(empty);

  const escaped = q.replace(/[%_\\]/g, '\\$&');
  const like = `%${escaped}%`;
  const op = db.client.config.client === 'pg' ? 'ilike' : 'like';

  try {
    const [
      vendors, accounts, contracts, inventory, orders,
      invoices, locations, disputes, tickets, cost_savings, usoc_codes,
    ] = await Promise.all([

      // ── Vendors ──
      db('vendors as v')
        .select('v.vendors_id', 'v.name', 'v.vendor_number', 'v.vendor_type', 'v.status')
        .where(function () {
          this.where('v.name', op, like)
            .orWhere('v.vendor_number', op, like)
            .orWhere('v.contact_name', op, like)
            .orWhere('v.contact_email', op, like);
        })
        .orderBy('v.name')
        .limit(8),

      // ── Accounts ──
      db('accounts as a')
        .leftJoin('vendors as v', 'a.vendors_id', 'v.vendors_id')
        .select('a.accounts_id', 'a.name', 'a.account_number', 'a.status', 'v.name as vendor_name')
        .where(function () {
          this.where('a.name', op, like)
            .orWhere('a.account_number', op, like);
        })
        .orderBy('a.name')
        .limit(8),

      // ── Contracts ──
      db('contracts as c')
        .leftJoin('vendors as v', 'c.vendors_id', 'v.vendors_id')
        .select('c.contracts_id', 'c.contract_number', 'c.contract_name', 'c.status', 'v.name as vendor_name')
        .where(function () {
          this.where('c.contract_number', op, like)
            .orWhere('c.contract_name', op, like);
        })
        .orderBy('c.contract_number')
        .limit(8),

      // ── Inventory ──
      db('inventory as i')
        .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
        .select('i.inventory_id', 'i.inventory_number', 'i.type', 'i.location', 'i.status', 'a.name as account_name')
        .where(function () {
          this.where('i.inventory_number', op, like)
            .orWhere('i.location', op, like)
            .orWhere('i.type', op, like);
        })
        .orderBy('i.inventory_number')
        .limit(8),

      // ── Orders ──
      db('orders as o')
        .leftJoin('vendors as v', 'o.vendors_id', 'v.vendors_id')
        .select('o.orders_id', 'o.order_number', 'o.status', 'v.name as vendor_name',
          db.raw('SUBSTRING(o.description, 1, 80) as description'))
        .where(function () {
          this.where('o.order_number', op, like)
            .orWhere('o.description', op, like);
        })
        .orderBy('o.order_number')
        .limit(8),

      // ── Invoices ──
      db('invoices as inv')
        .leftJoin('accounts as a', 'inv.accounts_id', 'a.accounts_id')
        .select('inv.invoices_id', 'inv.invoice_number', 'inv.total_amount',
          'inv.status', 'inv.invoice_date', 'a.name as account_name')
        .where(function () {
          this.where('inv.invoice_number', op, like);
        })
        .orderBy('inv.invoice_date', 'desc')
        .limit(8),

      // ── Locations ──
      db('locations as l')
        .select('l.locations_id', 'l.name', 'l.site_code', 'l.city', 'l.state', 'l.status')
        .where(function () {
          this.where('l.name', op, like)
            .orWhere('l.site_code', op, like)
            .orWhere('l.city', op, like)
            .orWhere('l.address', op, like);
        })
        .orderBy('l.name')
        .limit(8),

      // ── Disputes ──
      db('disputes as d')
        .leftJoin('vendors as v', 'd.vendors_id', 'v.vendors_id')
        .select('d.disputes_id', 'd.reference_number', 'd.dispute_type', 'd.amount',
          'd.status', 'v.name as vendor_name')
        .where(function () {
          this.where('d.reference_number', op, like)
            .orWhere('d.dispute_type', op, like)
            .orWhere('d.notes', op, like);
        })
        .orderBy('d.filed_date', 'desc')
        .limit(8),

      // ── Tickets ──
      db('tickets as t')
        .select('t.tickets_id', 't.ticket_number', 't.title', 't.priority', 't.status', 't.category')
        .where(function () {
          this.where('t.ticket_number', op, like)
            .orWhere('t.title', op, like)
            .orWhere('t.description', op, like);
        })
        .orderBy('t.created_at', 'desc')
        .limit(8),

      // ── Cost Savings ──
      db('cost_savings as cs')
        .leftJoin('vendors as v', 'cs.vendors_id', 'v.vendors_id')
        .select('cs.cost_savings_id', 'cs.category', 'cs.description', 'cs.projected_savings',
          'cs.status', 'v.name as vendor_name')
        .where(function () {
          this.where('cs.description', op, like)
            .orWhere('cs.category', op, like);
        })
        .orderBy('cs.identified_date', 'desc')
        .limit(8),

      // ── USOC Codes ──
      db('usoc_codes as u')
        .select('u.usoc_codes_id', 'u.usoc_code', 'u.description', 'u.category', 'u.status')
        .where(function () {
          this.where('u.usoc_code', op, like)
            .orWhere('u.description', op, like);
        })
        .orderBy('u.usoc_code')
        .limit(8),
    ]);

    res.json({
      vendors, accounts, contracts, inventory, orders,
      invoices, locations, disputes, tickets, cost_savings, usoc_codes,
    });
  } catch (err) {
    safeError(res, err, 'search');
  }
});

module.exports = router;
