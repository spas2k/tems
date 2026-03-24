/**
 * TEMS Report Builder API
 * POST /api/reports/run      — execute a dynamic report query
 * GET  /api/reports/catalog  — return field catalog for all reportable tables
 * GET  /api/reports          — list saved reports
 * POST /api/reports          — save a new report
 * PUT  /api/reports/:id      — update a saved report
 * DELETE /api/reports/:id    — delete a saved report
 */

const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');

// ══════════════════════════════════════════════════════════════
//  Field Catalog — defines all reportable tables and their fields
// ══════════════════════════════════════════════════════════════
const CATALOG = {
  inventory: {
    label: 'Inventory',
    description: 'InventoryItem inventory: bandwidth, rates, status, linked accounts & contracts',
    table: 'inventory',
    alias: 'ci',
    color: '#7c3aed',
    icon: 'Network',
    joins: {
      a:  { table: 'accounts',  on: ['ci.accounts_id',  'a.accounts_id']  },
      co: { table: 'contracts', on: ['ci.contracts_id', 'co.contracts_id'] },
      o:  { table: 'orders',    on: ['ci.orders_id',    'o.orders_id']     },
    },
    fields: [
      { key: 'inventoryItem_number',  label: 'InventoryItem Number',    type: 'text',   col: 'ci.inventory_number' },
      { key: 'location',        label: 'Location',          type: 'text',   col: 'ci.location' },
      { key: 'type',            label: 'InventoryItem Type',      type: 'select', col: 'ci.type',
        options: ['MPLS','Internet','Ethernet','Voice','SD-WAN','Dedicated','Other'] },
      { key: 'bandwidth',       label: 'Bandwidth',         type: 'text',   col: 'ci.bandwidth' },
      { key: 'contracted_rate', label: 'Monthly Rate',      type: 'number', col: 'ci.contracted_rate', format: 'currency', aggregable: true },
      { key: 'status',          label: 'Status',            type: 'select', col: 'ci.status',
        options: ['Active','Pending','Disconnected','Suspended'] },
      { key: 'install_date',    label: 'Install Date',      type: 'date',   col: 'ci.install_date',    format: 'date' },
      { key: 'disconnect_date', label: 'Disconnect Date',   type: 'date',   col: 'ci.disconnect_date', format: 'date' },
      { key: 'account_name',    label: 'Vendor Name',       type: 'text',   col: 'a.name',             join: 'a' },
      { key: 'contract_number', label: 'Contract Number',   type: 'text',   col: 'co.contract_number', join: 'co' },
      { key: 'order_number',    label: 'Order Number',      type: 'text',   col: 'o.order_number',     join: 'o' },
    ],
  },

  invoices: {
    label: 'Invoices',
    description: 'Invoice records with status, amounts, and payment tracking',
    table: 'invoices',
    alias: 'i',
    color: '#dc2626',
    icon: 'Receipt',
    joins: {
      a: { table: 'accounts', on: ['i.accounts_id', 'a.accounts_id'] },
    },
    fields: [
      { key: 'invoice_number', label: 'Invoice Number',  type: 'text',   col: 'i.invoice_number' },
      { key: 'invoice_date',   label: 'Invoice Date',    type: 'date',   col: 'i.invoice_date',   format: 'date' },
      { key: 'due_date',       label: 'Due Date',        type: 'date',   col: 'i.due_date',        format: 'date' },
      { key: 'period_start',   label: 'Period Start',    type: 'date',   col: 'i.period_start',    format: 'date' },
      { key: 'period_end',     label: 'Period End',      type: 'date',   col: 'i.period_end',      format: 'date' },
      { key: 'total_amount',   label: 'Total Amount',    type: 'number', col: 'i.total_amount',    format: 'currency', aggregable: true },
      { key: 'status',         label: 'Status',          type: 'select', col: 'i.status',
        options: ['Open','Paid','Disputed','Overdue','Void'] },
      { key: 'payment_date',   label: 'Payment Date',   type: 'date',   col: 'i.payment_date',   format: 'date' },
      { key: 'account_name',   label: 'Vendor Name',    type: 'text',   col: 'a.name',            join: 'a' },
    ],
  },

  line_items: {
    label: 'Line Items',
    description: 'Detailed invoice line items with audit status and variance analysis',
    table: 'line_items',
    alias: 'li',
    color: '#d97706',
    icon: 'Layers',
    joins: {
      i:  { table: 'invoices',  on: ['li.invoices_id',  'i.invoices_id']  },
      a:  { table: 'accounts',  on: ['i.accounts_id',   'a.accounts_id'],  dependsOn: 'i' },
      ci: { table: 'inventory',  on: ['li.cir_id',  'ci.cir_id'] },
    },
    fields: [
      { key: 'description',    label: 'Description',      type: 'text',   col: 'li.description' },
      { key: 'charge_type',    label: 'Charge Type',      type: 'text',   col: 'li.charge_type' },
      { key: 'amount',         label: 'Billed Amount',    type: 'number', col: 'li.amount',          format: 'currency', aggregable: true },
      { key: 'contracted_rate',label: 'Contracted Rate',  type: 'number', col: 'li.contracted_rate', format: 'currency', aggregable: true },
      { key: 'variance',       label: 'Variance',         type: 'number', col: 'li.variance',        format: 'currency', aggregable: true },
      { key: 'mrc_amount',     label: 'MRC Amount',       type: 'number', col: 'li.mrc_amount',      format: 'currency', aggregable: true },
      { key: 'nrc_amount',     label: 'NRC Amount',       type: 'number', col: 'li.nrc_amount',      format: 'currency', aggregable: true },
      { key: 'audit_status',   label: 'Audit Status',     type: 'select', col: 'li.audit_status',
        options: ['Pending','Validated','Variance','Disputed'] },
      { key: 'period_start',   label: 'Period Start',     type: 'date',   col: 'li.period_start',    format: 'date' },
      { key: 'period_end',     label: 'Period End',       type: 'date',   col: 'li.period_end',      format: 'date' },
      { key: 'invoice_number', label: 'Invoice Number',   type: 'text',   col: 'i.invoice_number',   join: 'i' },
      { key: 'invoice_date',   label: 'Invoice Date',     type: 'date',   col: 'i.invoice_date',     format: 'date', join: 'i' },
      { key: 'account_name',   label: 'Vendor Name',      type: 'text',   col: 'a.name',             join: ['i','a'] },
      { key: 'inventoryItem_number', label: 'InventoryItem Number',   type: 'text',   col: 'ci.inventory_number',  join: 'ci' },
      { key: 'inventoryItem_location',label: 'InventoryItem Location',type: 'text',   col: 'ci.location',        join: 'ci' },
    ],
  },

  contracts: {
    label: 'Contracts',
    description: 'Contract terms, renewal dates, and rate commitments',
    table: 'contracts',
    alias: 'co',
    color: '#0d9488',
    icon: 'FileText',
    joins: {
      a: { table: 'accounts', on: ['co.accounts_id', 'a.accounts_id'] },
    },
    fields: [
      { key: 'contract_number',  label: 'Contract Number', type: 'text',   col: 'co.contract_number' },
      { key: 'name',             label: 'Contract Name',   type: 'text',   col: 'co.name' },
      { key: 'start_date',       label: 'Start Date',      type: 'date',   col: 'co.start_date',       format: 'date' },
      { key: 'end_date',         label: 'End Date',        type: 'date',   col: 'co.end_date',         format: 'date' },
      { key: 'contracted_rate',  label: 'Contracted Rate', type: 'number', col: 'co.contracted_rate',  format: 'currency', aggregable: true },
      { key: 'term_months',      label: 'Term (Months)',   type: 'number', col: 'co.term_months',      aggregable: true },
      { key: 'status',           label: 'Status',          type: 'select', col: 'co.status',
        options: ['Active','Expired','Pending','Cancelled'] },
      { key: 'auto_renew',       label: 'Auto Renew',      type: 'boolean',col: 'co.auto_renew' },
      { key: 'account_name',     label: 'Vendor Name',     type: 'text',   col: 'a.name',              join: 'a' },
    ],
  },

  accounts: {
    label: 'Vendors / Accounts',
    description: 'Vendor account profiles, contact information, and status',
    table: 'accounts',
    alias: 'a',
    color: '#2563eb',
    icon: 'Building2',
    joins: {},
    fields: [
      { key: 'name',          label: 'Vendor Name',    type: 'text',   col: 'a.name' },
      { key: 'account_number',label: 'Account Number', type: 'text',   col: 'a.account_number' },
      { key: 'vendor_type',   label: 'Vendor Type',    type: 'text',   col: 'a.vendor_type' },
      { key: 'contact_name',  label: 'Contact Name',   type: 'text',   col: 'a.contact_name' },
      { key: 'contact_email', label: 'Contact Email',  type: 'text',   col: 'a.contact_email' },
      { key: 'contact_phone', label: 'Contact Phone',  type: 'text',   col: 'a.contact_phone' },
      { key: 'status',        label: 'Status',         type: 'select', col: 'a.status',
        options: ['Active','Inactive'] },
      { key: 'created_at',    label: 'Created Date',   type: 'date',   col: 'a.created_at',   format: 'date' },
    ],
  },

  orders: {
    label: 'Orders',
    description: 'Service orders with completion tracking and linked accounts',
    table: 'orders',
    alias: 'o',
    color: '#ea580c',
    icon: 'ShoppingCart',
    joins: {
      a:  { table: 'accounts',  on: ['o.accounts_id',  'a.accounts_id']  },
      co: { table: 'contracts', on: ['o.contracts_id', 'co.contracts_id'] },
    },
    fields: [
      { key: 'order_number',    label: 'Order Number',    type: 'text',   col: 'o.order_number' },
      { key: 'description',     label: 'Description',     type: 'text',   col: 'o.description' },
      { key: 'order_date',      label: 'Order Date',      type: 'date',   col: 'o.order_date',     format: 'date' },
      { key: 'due_date',        label: 'Due Date',        type: 'date',   col: 'o.due_date',       format: 'date' },
      { key: 'contracted_rate', label: 'Contracted Rate', type: 'number', col: 'o.contracted_rate', format: 'currency', aggregable: true },
      { key: 'status',          label: 'Status',          type: 'select', col: 'o.status',
        options: ['Pending','In Progress','Completed','Cancelled'] },
      { key: 'account_name',    label: 'Vendor Name',     type: 'text',   col: 'a.name',           join: 'a' },
      { key: 'contract_number', label: 'Contract Number', type: 'text',   col: 'co.contract_number', join: 'co' },
    ],
  },

  disputes: {
    label: 'Disputes',
    description: 'Billing disputes filed against invoices and their resolution status',
    table: 'disputes',
    alias: 'd',
    color: '#be123c',
    icon: 'ShieldAlert',
    joins: {
      a: { table: 'accounts', on: ['d.accounts_id', 'a.accounts_id'] },
      i: { table: 'invoices', on: ['d.invoices_id', 'i.invoices_id'] },
    },
    fields: [
      { key: 'dispute_type',       label: 'Dispute Type',       type: 'select', col: 'd.dispute_type',
        options: ['Overcharge','Missing Credit','Incorrect Rate','Duplicate','Other'] },
      { key: 'amount',             label: 'Disputed Amount',    type: 'number', col: 'd.amount',          format: 'currency', aggregable: true },
      { key: 'credit_amount',      label: 'Credit Amount',      type: 'number', col: 'd.credit_amount',   format: 'currency', aggregable: true },
      { key: 'status',             label: 'Status',             type: 'select', col: 'd.status',
        options: ['Open','In Review','Resolved','Closed'] },
      { key: 'filed_date',         label: 'Filed Date',         type: 'date',   col: 'd.filed_date',      format: 'date' },
      { key: 'resolved_date',      label: 'Resolved Date',      type: 'date',   col: 'd.resolved_date',   format: 'date' },
      { key: 'reference_number',   label: 'Reference Number',   type: 'text',   col: 'd.reference_number' },
      { key: 'resolution_notes',   label: 'Resolution Notes',   type: 'text',   col: 'd.resolution_notes' },
      { key: 'account_name',       label: 'Vendor Name',        type: 'text',   col: 'a.name',            join: 'a' },
      { key: 'invoice_number',     label: 'Invoice Number',     type: 'text',   col: 'i.invoice_number',  join: 'i' },
    ],
  },

  cost_savings: {
    label: 'Cost Savings',
    description: 'Identified savings opportunities, projections, and realization tracking',
    table: 'cost_savings',
    alias: 'cs',
    color: '#16a34a',
    icon: 'DollarSign',
    joins: {
      a: { table: 'accounts', on: ['cs.accounts_id', 'a.accounts_id'] },
    },
    fields: [
      { key: 'category',          label: 'Category',          type: 'text',   col: 'cs.category' },
      { key: 'description',       label: 'Description',       type: 'text',   col: 'cs.description' },
      { key: 'status',            label: 'Status',            type: 'select', col: 'cs.status',
        options: ['Identified','In Progress','Resolved'] },
      { key: 'identified_date',   label: 'Identified Date',   type: 'date',   col: 'cs.identified_date', format: 'date' },
      { key: 'projected_savings', label: 'Projected Savings', type: 'number', col: 'cs.projected_savings', format: 'currency', aggregable: true },
      { key: 'realized_savings',  label: 'Realized Savings',  type: 'number', col: 'cs.realized_savings',  format: 'currency', aggregable: true },
      { key: 'account_name',      label: 'Vendor Name',       type: 'text',   col: 'a.name',              join: 'a' },
    ],
  },

  allocations: {
    label: 'Allocations',
    description: 'Cost allocations across departments and cost centers from line items',
    table: 'allocations',
    alias: 'al',
    color: '#9333ea',
    icon: 'PieChart',
    joins: {
      li: { table: 'line_items', on: ['al.line_items_id', 'li.line_items_id'] },
      i:  { table: 'invoices',   on: ['li.invoices_id',   'i.invoices_id'],   dependsOn: 'li' },
      a:  { table: 'accounts',   on: ['i.accounts_id',    'a.accounts_id'],   dependsOn: 'i'  },
    },
    fields: [
      { key: 'department',       label: 'Department',     type: 'text',   col: 'al.department' },
      { key: 'cost_center',      label: 'Cost Center',    type: 'text',   col: 'al.cost_center' },
      { key: 'percentage',       label: 'Percentage (%)', type: 'number', col: 'al.percentage',       aggregable: true },
      { key: 'allocated_amount', label: 'Allocated $',    type: 'number', col: 'al.allocated_amount', format: 'currency', aggregable: true },
      { key: 'notes',            label: 'Notes',          type: 'text',   col: 'al.notes' },
      { key: 'invoice_number',   label: 'Invoice Number', type: 'text',   col: 'i.invoice_number',   join: ['li','i'] },
      { key: 'account_name',     label: 'Vendor Name',    type: 'text',   col: 'a.name',             join: ['li','i','a'] },
    ],
  },
};

// ══════════════════════════════════════════════════════════════
//  Multi-Table Catalog — native fields per table, no cross-refs
// ══════════════════════════════════════════════════════════════
const TABLES = {
  accounts: {
    label: 'Vendors / Accounts',
    description: 'Vendor account profiles, contact information, and status',
    table: 'accounts', alias: 'a', color: '#2563eb', icon: 'Building2',
    fields: [
      { key: 'name',           label: 'Vendor Name',    type: 'text',   col: 'name' },
      { key: 'account_number', label: 'Account Number', type: 'text',   col: 'account_number' },
      { key: 'vendor_type',    label: 'Vendor Type',    type: 'text',   col: 'vendor_type' },
      { key: 'contact_name',   label: 'Contact Name',   type: 'text',   col: 'contact_name' },
      { key: 'contact_email',  label: 'Contact Email',  type: 'text',   col: 'contact_email' },
      { key: 'contact_phone',  label: 'Contact Phone',  type: 'text',   col: 'contact_phone' },
      { key: 'status',         label: 'Status',         type: 'select', col: 'status', options: ['Active','Inactive'] },
      { key: 'created_at',     label: 'Created Date',   type: 'date',   col: 'created_at', format: 'date' },
    ],
  },
  contracts: {
    label: 'Contracts',
    description: 'Contract terms, renewal dates, and rate commitments',
    table: 'contracts', alias: 'co', color: '#0d9488', icon: 'FileText',
    fields: [
      { key: 'contract_number', label: 'Contract Number', type: 'text',   col: 'contract_number' },
      { key: 'name',            label: 'Contract Name',   type: 'text',   col: 'name' },
      { key: 'start_date',      label: 'Start Date',      type: 'date',   col: 'start_date',      format: 'date' },
      { key: 'end_date',        label: 'End Date',        type: 'date',   col: 'end_date',        format: 'date' },
      { key: 'contracted_rate', label: 'Contracted Rate', type: 'number', col: 'contracted_rate', format: 'currency', aggregable: true },
      { key: 'term_months',     label: 'Term (Months)',   type: 'number', col: 'term_months',     aggregable: true },
      { key: 'minimum_spend',   label: 'Minimum Spend',   type: 'number', col: 'minimum_spend',  format: 'currency', aggregable: true },
      { key: 'etf_amount',      label: 'ETF Amount',      type: 'number', col: 'etf_amount',     format: 'currency', aggregable: true },
      { key: 'commitment_type', label: 'Commitment Type', type: 'text',   col: 'commitment_type' },
      { key: 'status',          label: 'Status',          type: 'select', col: 'status', options: ['Active','Expired','Pending','Cancelled'] },
      { key: 'auto_renew',      label: 'Auto Renew',      type: 'boolean',col: 'auto_renew' },
    ],
  },
  orders: {
    label: 'Orders',
    description: 'Service orders with completion tracking and linked accounts',
    table: 'orders', alias: 'o', color: '#ea580c', icon: 'ShoppingCart',
    fields: [
      { key: 'order_number',    label: 'Order Number',    type: 'text',   col: 'order_number' },
      { key: 'description',     label: 'Description',     type: 'text',   col: 'description' },
      { key: 'order_date',      label: 'Order Date',      type: 'date',   col: 'order_date',      format: 'date' },
      { key: 'due_date',        label: 'Due Date',        type: 'date',   col: 'due_date',        format: 'date' },
      { key: 'contracted_rate', label: 'Contracted Rate', type: 'number', col: 'contracted_rate', format: 'currency', aggregable: true },
      { key: 'status',          label: 'Status',          type: 'select', col: 'status', options: ['Pending','In Progress','Completed','Cancelled'] },
    ],
  },
  inventory: {
    label: 'Inventory',
    description: 'InventoryItem inventory: bandwidth, rates, status',
    table: 'inventory', alias: 'ci', color: '#7c3aed', icon: 'Network',
    fields: [
      { key: 'inventoryItem_number',  label: 'InventoryItem Number',  type: 'text',   col: 'inventory_number' },
      { key: 'type',            label: 'InventoryItem Type',    type: 'select', col: 'type', options: ['MPLS','Internet','Ethernet','Voice','SD-WAN','Dedicated','Other'] },
      { key: 'bandwidth',       label: 'Bandwidth',       type: 'text',   col: 'bandwidth' },
      { key: 'location',        label: 'Location',        type: 'text',   col: 'location' },
      { key: 'contracted_rate', label: 'Monthly Rate',    type: 'number', col: 'contracted_rate', format: 'currency', aggregable: true },
      { key: 'install_date',    label: 'Install Date',    type: 'date',   col: 'install_date',    format: 'date' },
      { key: 'disconnect_date', label: 'Disconnect Date', type: 'date',   col: 'disconnect_date', format: 'date' },
      { key: 'status',          label: 'Status',          type: 'select', col: 'status', options: ['Active','Pending','Disconnected','Suspended'] },
    ],
  },
  invoices: {
    label: 'Invoices',
    description: 'Invoice records with status, amounts, and payment tracking',
    table: 'invoices', alias: 'i', color: '#dc2626', icon: 'Receipt',
    fields: [
      { key: 'invoice_number', label: 'Invoice Number', type: 'text',   col: 'invoice_number' },
      { key: 'invoice_date',   label: 'Invoice Date',   type: 'date',   col: 'invoice_date',  format: 'date' },
      { key: 'due_date',       label: 'Due Date',       type: 'date',   col: 'due_date',      format: 'date' },
      { key: 'period_start',   label: 'Period Start',   type: 'date',   col: 'period_start',  format: 'date' },
      { key: 'period_end',     label: 'Period End',     type: 'date',   col: 'period_end',    format: 'date' },
      { key: 'total_amount',   label: 'Total Amount',   type: 'number', col: 'total_amount',  format: 'currency', aggregable: true },
      { key: 'status',         label: 'Status',         type: 'select', col: 'status', options: ['Open','Paid','Disputed','Overdue','Void'] },
      { key: 'payment_date',   label: 'Payment Date',   type: 'date',   col: 'payment_date',  format: 'date' },
    ],
  },
  line_items: {
    label: 'Line Items',
    description: 'Detailed invoice line items with audit status and variance',
    table: 'line_items', alias: 'li', color: '#d97706', icon: 'Layers',
    fields: [
      { key: 'description',     label: 'Description',     type: 'text',   col: 'description' },
      { key: 'charge_type',     label: 'Charge Type',     type: 'text',   col: 'charge_type' },
      { key: 'amount',          label: 'Billed Amount',   type: 'number', col: 'amount',          format: 'currency', aggregable: true },
      { key: 'contracted_rate', label: 'Contracted Rate', type: 'number', col: 'contracted_rate', format: 'currency', aggregable: true },
      { key: 'variance',        label: 'Variance',        type: 'number', col: 'variance',        format: 'currency', aggregable: true },
      { key: 'mrc_amount',      label: 'MRC Amount',      type: 'number', col: 'mrc_amount',      format: 'currency', aggregable: true },
      { key: 'nrc_amount',      label: 'NRC Amount',      type: 'number', col: 'nrc_amount',      format: 'currency', aggregable: true },
      { key: 'audit_status',    label: 'Audit Status',    type: 'select', col: 'audit_status', options: ['Pending','Validated','Variance','Disputed'] },
      { key: 'period_start',    label: 'Period Start',    type: 'date',   col: 'period_start', format: 'date' },
      { key: 'period_end',      label: 'Period End',      type: 'date',   col: 'period_end',   format: 'date' },
    ],
  },
  allocations: {
    label: 'Allocations',
    description: 'Cost allocations across departments and cost centers',
    table: 'allocations', alias: 'al', color: '#9333ea', icon: 'PieChart',
    fields: [
      { key: 'department',       label: 'Department',     type: 'text',   col: 'department' },
      { key: 'cost_center',      label: 'Cost Center',    type: 'text',   col: 'cost_center' },
      { key: 'percentage',       label: 'Percentage (%)', type: 'number', col: 'percentage',       aggregable: true },
      { key: 'allocated_amount', label: 'Allocated $',    type: 'number', col: 'allocated_amount', format: 'currency', aggregable: true },
      { key: 'notes',            label: 'Notes',          type: 'text',   col: 'notes' },
    ],
  },
  disputes: {
    label: 'Disputes',
    description: 'Billing disputes filed against invoices and resolution status',
    table: 'disputes', alias: 'd', color: '#be123c', icon: 'ShieldAlert',
    fields: [
      { key: 'dispute_type',     label: 'Dispute Type',     type: 'select', col: 'dispute_type', options: ['Overcharge','Missing Credit','Incorrect Rate','Duplicate','Other'] },
      { key: 'amount',           label: 'Disputed Amount',  type: 'number', col: 'amount',          format: 'currency', aggregable: true },
      { key: 'credit_amount',    label: 'Credit Amount',    type: 'number', col: 'credit_amount',   format: 'currency', aggregable: true },
      { key: 'status',           label: 'Status',           type: 'select', col: 'status', options: ['Open','In Review','Resolved','Closed'] },
      { key: 'filed_date',       label: 'Filed Date',       type: 'date',   col: 'filed_date',      format: 'date' },
      { key: 'resolved_date',    label: 'Resolved Date',    type: 'date',   col: 'resolved_date',   format: 'date' },
      { key: 'reference_number', label: 'Reference Number', type: 'text',   col: 'reference_number' },
      { key: 'resolution_notes', label: 'Resolution Notes', type: 'text',   col: 'resolution_notes' },
    ],
  },
  cost_savings: {
    label: 'Cost Savings',
    description: 'Identified savings opportunities and realization tracking',
    table: 'cost_savings', alias: 'cs', color: '#16a34a', icon: 'DollarSign',
    fields: [
      { key: 'category',          label: 'Category',          type: 'text',   col: 'category' },
      { key: 'description',       label: 'Description',       type: 'text',   col: 'description' },
      { key: 'status',            label: 'Status',            type: 'select', col: 'status', options: ['Identified','In Progress','Resolved'] },
      { key: 'identified_date',   label: 'Identified Date',   type: 'date',   col: 'identified_date',   format: 'date' },
      { key: 'projected_savings', label: 'Projected Savings', type: 'number', col: 'projected_savings', format: 'currency', aggregable: true },
      { key: 'realized_savings',  label: 'Realized Savings',  type: 'number', col: 'realized_savings',  format: 'currency', aggregable: true },
    ],
  },
  usoc_codes: {
    label: 'USOC Codes',
    description: 'Universal Service Order Code catalog with default rates',
    table: 'usoc_codes', alias: 'uc', color: '#06b6d4', icon: 'Tag',
    fields: [
      { key: 'usoc_code',    label: 'USOC Code',     type: 'text',   col: 'usoc_code' },
      { key: 'description',  label: 'Description',   type: 'text',   col: 'description' },
      { key: 'category',     label: 'Category',      type: 'text',   col: 'category' },
      { key: 'sub_category', label: 'Sub Category',  type: 'text',   col: 'sub_category' },
      { key: 'default_mrc',  label: 'Default MRC',   type: 'number', col: 'default_mrc', format: 'currency', aggregable: true },
      { key: 'default_nrc',  label: 'Default NRC',   type: 'number', col: 'default_nrc', format: 'currency', aggregable: true },
      { key: 'unit',         label: 'Unit',          type: 'text',   col: 'unit' },
      { key: 'status',       label: 'Status',        type: 'select', col: 'status', options: ['Active','Inactive'] },
    ],
  },
  contract_rates: {
    label: 'Contract Rates',
    description: 'Per-USOC contracted rates within contracts',
    table: 'contract_rates', alias: 'cr', color: '#14b8a6', icon: 'CircleDollarSign',
    fields: [
      { key: 'mrc',             label: 'Contracted MRC',  type: 'number', col: 'mrc',             format: 'currency', aggregable: true },
      { key: 'nrc',             label: 'Contracted NRC',  type: 'number', col: 'nrc',             format: 'currency', aggregable: true },
      { key: 'effective_date',  label: 'Effective Date',  type: 'date',   col: 'effective_date',  format: 'date' },
      { key: 'expiration_date', label: 'Expiration Date', type: 'date',   col: 'expiration_date', format: 'date' },
      { key: 'notes',           label: 'Notes',           type: 'text',   col: 'notes' },
    ],
  },
  vendor_remit: {
    label: 'Vendor Remittance',
    description: 'Vendor payment and remittance address details',
    table: 'vendor_remit', alias: 'vr', color: '#8b5cf6', icon: 'CreditCard',
    fields: [
      { key: 'remit_name',     label: 'Remit Name',     type: 'text',   col: 'remit_name' },
      { key: 'remit_code',     label: 'Remit Code',     type: 'text',   col: 'remit_code' },
      { key: 'payment_method', label: 'Payment Method', type: 'select', col: 'payment_method', options: ['ACH','Check','Wire','EFT','Credit Card'] },
      { key: 'bank_name',      label: 'Bank Name',      type: 'text',   col: 'bank_name' },
      { key: 'remit_address',  label: 'Remit Address',  type: 'text',   col: 'remit_address' },
      { key: 'remit_city',     label: 'City',           type: 'text',   col: 'remit_city' },
      { key: 'remit_state',    label: 'State',          type: 'text',   col: 'remit_state' },
      { key: 'remit_zip',      label: 'ZIP',            type: 'text',   col: 'remit_zip' },
      { key: 'status',         label: 'Status',         type: 'select', col: 'status', options: ['Active','Inactive'] },
      { key: 'created_at',     label: 'Created Date',   type: 'date',   col: 'created_at', format: 'date' },
    ],
  },
  locations: {
    label: 'Locations',
    description: 'Physical site directory with addresses and contacts',
    table: 'locations', alias: 'loc', color: '#f59e0b', icon: 'MapPin',
    fields: [
      { key: 'name',          label: 'Site Name',     type: 'text',   col: 'name' },
      { key: 'site_code',     label: 'Site Code',     type: 'text',   col: 'site_code' },
      { key: 'site_type',     label: 'Site Type',     type: 'select', col: 'site_type', options: ['Data Center','Office','Remote','Warehouse','Colocation','Other'] },
      { key: 'address',       label: 'Address',       type: 'text',   col: 'address' },
      { key: 'city',          label: 'City',          type: 'text',   col: 'city' },
      { key: 'state',         label: 'State',         type: 'text',   col: 'state' },
      { key: 'zip',           label: 'ZIP',           type: 'text',   col: 'zip' },
      { key: 'country',       label: 'Country',       type: 'text',   col: 'country' },
      { key: 'contact_name',  label: 'Contact Name',  type: 'text',   col: 'contact_name' },
      { key: 'contact_phone', label: 'Contact Phone', type: 'text',   col: 'contact_phone' },
      { key: 'contact_email', label: 'Contact Email', type: 'text',   col: 'contact_email' },
      { key: 'status',        label: 'Status',        type: 'select', col: 'status', options: ['Active','Inactive'] },
      { key: 'created_at',    label: 'Created Date',  type: 'date',   col: 'created_at', format: 'date' },
    ],
  },
  tickets: {
    label: 'Tickets',
    description: 'Support tickets with priority, status, and assignment tracking',
    table: 'tickets', alias: 'tk', color: '#ef4444', icon: 'Ticket',
    fields: [
      { key: 'ticket_number', label: 'Ticket #',      type: 'text',   col: 'ticket_number' },
      { key: 'title',         label: 'Title',         type: 'text',   col: 'title' },
      { key: 'description',   label: 'Description',   type: 'text',   col: 'description' },
      { key: 'category',      label: 'Category',      type: 'text',   col: 'category' },
      { key: 'priority',      label: 'Priority',      type: 'select', col: 'priority', options: ['Low','Medium','High','Critical'] },
      { key: 'status',        label: 'Status',        type: 'select', col: 'status', options: ['Open','In Progress','Pending Vendor','Pending Internal','Resolved','Closed'] },
      { key: 'source_label',  label: 'Source',        type: 'text',   col: 'source_label' },
      { key: 'created_by',    label: 'Created By',    type: 'text',   col: 'created_by' },
      { key: 'due_date',      label: 'Due Date',      type: 'date',   col: 'due_date',      format: 'date' },
      { key: 'resolved_date', label: 'Resolved Date', type: 'date',   col: 'resolved_date', format: 'date' },
      { key: 'tags',          label: 'Tags',          type: 'text',   col: 'tags' },
      { key: 'created_at',    label: 'Created Date',  type: 'date',   col: 'created_at', format: 'date' },
      { key: 'updated_at',    label: 'Updated Date',  type: 'date',   col: 'updated_at', format: 'date' },
    ],
  },
};

// ══════════════════════════════════════════════════════════════
//  Relationship Edges — all FK connections (bidirectional)
//  Format: [tableA, tableB, colInA, colInB]
// ══════════════════════════════════════════════════════════════
const EDGES = [
  // accounts hub
  ['accounts', 'contracts',      'accounts_id',  'accounts_id'],
  ['accounts', 'orders',         'accounts_id',  'accounts_id'],
  ['accounts', 'inventory',       'accounts_id',  'accounts_id'],
  ['accounts', 'invoices',       'accounts_id',  'accounts_id'],
  ['accounts', 'disputes',       'accounts_id',  'accounts_id'],
  ['accounts', 'cost_savings',   'accounts_id',  'accounts_id'],
  ['accounts', 'vendor_remit',   'accounts_id',  'accounts_id'],
  // contracts
  ['contracts', 'orders',         'contracts_id', 'contracts_id'],
  ['contracts', 'inventory',       'contracts_id', 'contracts_id'],
  ['contracts', 'contract_rates', 'contracts_id', 'contracts_id'],
  // orders ↔ inventory
  ['orders', 'inventory', 'orders_id', 'orders_id'],
  // invoices
  ['invoices', 'line_items',   'invoices_id', 'invoices_id'],
  ['invoices', 'disputes',     'invoices_id', 'invoices_id'],
  ['invoices', 'cost_savings', 'invoices_id', 'invoices_id'],
  // inventory
  ['inventory', 'line_items',   'cir_id', 'cir_id'],
  ['inventory', 'cost_savings', 'cir_id', 'cir_id'],
  // line_items
  ['line_items', 'allocations',  'line_items_id', 'line_items_id'],
  ['line_items', 'disputes',     'line_items_id', 'line_items_id'],
  ['line_items', 'cost_savings', 'line_items_id', 'line_items_id'],
  ['line_items', 'usoc_codes',   'usoc_codes_id', 'usoc_codes_id'],
  // contract_rates ↔ usoc_codes
  ['contract_rates', 'usoc_codes', 'usoc_codes_id', 'usoc_codes_id'],
];

// Build bidirectional adjacency map from edges
const ADJACENCY = {};
for (const [a, b, colA, colB] of EDGES) {
  if (!ADJACENCY[a]) ADJACENCY[a] = {};
  if (!ADJACENCY[b]) ADJACENCY[b] = {};
  ADJACENCY[a][b] = { fromCol: colA, toCol: colB };
  ADJACENCY[b][a] = { fromCol: colB, toCol: colA };
}
for (const key of Object.keys(TABLES)) {
  if (!ADJACENCY[key]) ADJACENCY[key] = {};
}

// ══════════════════════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════════════════════

const VALID_OPS = new Set([
  'equals','not_equals','contains','not_contains','starts_with','ends_with',
  'gt','gte','lt','lte','is_empty','not_empty','between',
  'in_set','not_in_set','on','not_on','before','after',
  'this_week','this_month','this_quarter','this_year',
]);

function getField(tableKey, fieldKey) {
  const tbl = CATALOG[tableKey];
  if (!tbl) return null;
  return tbl.fields.find(f => f.key === fieldKey) || null;
}

function resolveJoins(tableDef, requiredJoinSets) {
  // Collect all needed join aliases, respecting dependsOn order
  const needed = new Set();
  for (const jset of requiredJoinSets) {
    const keys = Array.isArray(jset) ? jset : (jset ? [jset] : []);
    keys.forEach(k => needed.add(k));
  }
  // Add dependsOn parents
  let changed = true;
  while (changed) {
    changed = false;
    for (const alias of [...needed]) {
      const jdef = tableDef.joins[alias];
      if (jdef?.dependsOn && !needed.has(jdef.dependsOn)) {
        needed.add(jdef.dependsOn);
        changed = true;
      }
    }
  }
  // Return in definition order (preserves dependency order)
  return Object.keys(tableDef.joins).filter(a => needed.has(a));
}

function applyOperator(query, col, op, value) {
  const NO_VAL = ['is_empty','not_empty','this_week','this_month','this_quarter','this_year'];
  if (NO_VAL.includes(op)) {
    switch (op) {
      case 'is_empty':     return query.where(q => q.whereNull(col).orWhere(col, ''));
      case 'not_empty':    return query.where(q => q.whereNotNull(col).andWhereNot(col, ''));
      case 'this_week':    return query.whereRaw(`?? >= DATE_TRUNC('week', NOW()) AND ?? < DATE_TRUNC('week', NOW()) + INTERVAL '1 week'`, [col, col]);
      case 'this_month':   return query.whereRaw(`DATE_TRUNC('month', ??) = DATE_TRUNC('month', NOW())`, [col]);
      case 'this_quarter': return query.whereRaw(`DATE_TRUNC('quarter', ??) = DATE_TRUNC('quarter', NOW())`, [col]);
      case 'this_year':    return query.whereRaw(`DATE_TRUNC('year', ??) = DATE_TRUNC('year', NOW())`, [col]);
    }
  }
  switch (op) {
    case 'equals':       return query.where(col, value);
    case 'not_equals':   return query.whereNot(col, value);
    case 'contains':     { const e = value.replace(/[%_\\]/g, '\\$&'); return query.whereILike ? query.whereILike(col, `%${e}%`) : query.where(col, 'ilike', `%${e}%`); }
    case 'not_contains': { const e = value.replace(/[%_\\]/g, '\\$&'); return query.where(q => q.whereNot(col, 'ilike', `%${e}%`)); }
    case 'starts_with':  { const e = value.replace(/[%_\\]/g, '\\$&'); return query.where(col, 'ilike', `${e}%`); }
    case 'ends_with':    { const e = value.replace(/[%_\\]/g, '\\$&'); return query.where(col, 'ilike', `%${e}`); }
    case 'gt':           return query.where(col, '>', value);
    case 'gte':          return query.where(col, '>=', value);
    case 'lt':           return query.where(col, '<', value);
    case 'lte':          return query.where(col, '<=', value);
    case 'on':           return query.whereRaw(`??::date = ?::date`, [col, value]);
    case 'not_on':       return query.whereRaw(`?? != ?`, [col, value]);
    case 'before':       return query.where(col, '<', value);
    case 'after':        return query.where(col, '>', value);
    case 'between': {
      const [p1, p2] = String(value).split('|');
      if (p1) query = query.where(col, '>=', p1);
      if (p2) query = query.where(col, '<=', p2);
      return query;
    }
    case 'in_set': {
      const vals = String(value).split(',').map(v => v.trim()).filter(Boolean);
      return query.whereIn(col, vals);
    }
    case 'not_in_set': {
      const vals = String(value).split(',').map(v => v.trim()).filter(Boolean);
      return query.whereNotIn(col, vals);
    }
    default: return query;
  }
}

// ══════════════════════════════════════════════════════════════
//  GET /catalog  — returns tables + relationship graph
// ══════════════════════════════════════════════════════════════
router.get('/catalog', (req, res) => {
  // Build tables (strip internal col references)
  const tables = {};
  for (const [key, def] of Object.entries(TABLES)) {
    tables[key] = {
      key,
      label: def.label,
      description: def.description,
      color: def.color,
      icon: def.icon,
      fields: def.fields.map(f => ({
        key:        f.key,
        label:      f.label,
        type:       f.type,
        format:     f.format,
        options:    f.options,
        aggregable: f.aggregable || false,
      })),
    };
  }
  // Build relationship adjacency (table → [linked tables])
  const relationships = {};
  for (const key of Object.keys(TABLES)) {
    relationships[key] = Object.keys(ADJACENCY[key] || {});
  }
  res.json({ tables, relationships });
});

// ══════════════════════════════════════════════════════════════
//  Multi-table query handler
// ══════════════════════════════════════════════════════════════
async function runMultiTable(req, res) {
  const {
    tableKey,
    linkedTables = [],
    fields       = [],
    filters      = [],
    filterLogic  = 'AND',
    sorts        = [],
    groupBy      = [],
    aggregations = [],
    limit        = 500,
    offset       = 0,
    distinct     = false,
  } = req.body;

  const VALID_AGG = new Set(['sum','avg','min','max','count']);

  // Validate primary table
  const primaryDef = TABLES[tableKey];
  if (!primaryDef) return res.status(400).json({ error: 'Invalid data source' });

  // Build alias map and validate linked tables
  const aliasMap = { [tableKey]: primaryDef.alias };
  const joinOrder = [];
  for (const lt of linkedTables) {
    const ltDef = TABLES[lt.tableKey];
    if (!ltDef) return res.status(400).json({ error: `Invalid linked table: ${lt.tableKey}` });
    if (!ADJACENCY[lt.joinFrom]?.[lt.tableKey])
      return res.status(400).json({ error: `No relationship: ${lt.joinFrom} → ${lt.tableKey}` });
    if (aliasMap[lt.tableKey])
      return res.status(400).json({ error: `Duplicate table: ${lt.tableKey}` });
    aliasMap[lt.tableKey] = ltDef.alias;
    joinOrder.push(lt);
  }

  // Helper: resolve table.field → qualified column
  const resolveCol = (tbl, fld) => {
    const tDef = TABLES[tbl];
    if (!tDef) throw new Error(`Invalid table: ${tbl}`);
    if (!aliasMap[tbl]) throw new Error(`Table not selected: ${tbl}`);
    const fDef = tDef.fields.find(f => f.key === fld);
    if (!fDef) throw new Error(`Invalid field: ${tbl}.${fld}`);
    return { col: `${aliasMap[tbl]}.${fDef.col}`, fDef, tDef };
  };

  // Validate fields
  const resolvedFields = [];
  for (const f of fields) {
    const { col, fDef, tDef } = resolveCol(f.table, f.field);
    resolvedFields.push({
      col, table: f.table, field: f.field,
      label: fDef.label, format: fDef.format, type: fDef.type,
      tableLabel: tDef.label,
      resultKey: `${f.table}__${f.field}`,
    });
  }

  // Validate filters
  for (const f of filters) {
    resolveCol(f.table, f.field);
    if (!VALID_OPS.has(f.op)) throw new Error(`Invalid operator: ${f.op}`);
  }
  // Validate sorts
  for (const s of sorts) {
    resolveCol(s.table, s.field);
    if (!['asc','desc'].includes((s.direction || '').toLowerCase()))
      throw new Error('Invalid sort direction');
  }
  // Validate groupBy
  for (const g of groupBy) { resolveCol(g.table, g.field); }
  // Validate aggregations
  for (const ag of aggregations) {
    resolveCol(ag.table, ag.field);
    if (!VALID_AGG.has(ag.func)) throw new Error(`Invalid agg function: ${ag.func}`);
  }

  const isGrouped = groupBy.length > 0 || aggregations.length > 0;
  if (resolvedFields.length === 0 && !isGrouped)
    return res.status(400).json({ error: 'Select at least one column' });

  // Build query
  let query = db(`${primaryDef.table} as ${primaryDef.alias}`);
  if (distinct) query = query.distinct();

  // Add JOINs in order
  for (const lt of joinOrder) {
    const ltDef = TABLES[lt.tableKey];
    const rel = ADJACENCY[lt.joinFrom][lt.tableKey];
    const fromAlias = aliasMap[lt.joinFrom];
    const toAlias = ltDef.alias;
    query = query.leftJoin(
      `${ltDef.table} as ${toAlias}`,
      `${fromAlias}.${rel.fromCol}`,
      `${toAlias}.${rel.toCol}`
    );
  }

  // SELECT
  if (isGrouped) {
    const selectParts = [];
    for (const g of groupBy) {
      const { col } = resolveCol(g.table, g.field);
      const rk = `${g.table}__${g.field}`;
      selectParts.push(db.raw(`?? as ??`, [col, rk]));
    }
    for (const ag of aggregations) {
      const { col } = resolveCol(ag.table, ag.field);
      const rk = `${ag.func}_${ag.table}__${ag.field}`;
      selectParts.push(db.raw(`${ag.func.toUpperCase()}(??) as ??`, [col, rk]));
    }
    query = query.select(selectParts);
    for (const g of groupBy) {
      const { col } = resolveCol(g.table, g.field);
      query = query.groupBy(col);
    }
  } else {
    const selectParts = resolvedFields.map(f => db.raw(`?? as ??`, [f.col, f.resultKey]));
    query = query.select(selectParts);
  }

  // Filters
  if (filters.length > 0) {
    if (filterLogic === 'OR') {
      query = query.where(function () {
        for (const f of filters) {
          const { col } = resolveCol(f.table, f.field);
          this.orWhere(function () { applyOperator(this, col, f.op, f.value); });
        }
      });
    } else {
      for (const f of filters) {
        const { col } = resolveCol(f.table, f.field);
        query = applyOperator(query, col, f.op, f.value);
      }
    }
  }

  // Sorts
  for (const s of sorts) {
    const { col } = resolveCol(s.table, s.field);
    query = query.orderBy(col, s.direction);
  }

  // Count (before pagination)
  const countQuery = query.clone().clearSelect().clearGroup().clearOrder()
    .count('* as total').first();

  const safeLimit  = Math.min(Number(limit) || 500, 10000);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  query = query.limit(safeLimit).offset(safeOffset);

  const [rows, countResult] = await Promise.all([query, countQuery]);

  // Build result field metadata
  const multiTable = linkedTables.length > 0;
  let resultFields;
  if (isGrouped) {
    resultFields = [
      ...groupBy.map(g => {
        const { fDef, tDef } = resolveCol(g.table, g.field);
        return {
          key: `${g.table}__${g.field}`, table: g.table,
          label: multiTable ? `${tDef.label}: ${fDef.label}` : fDef.label,
          format: fDef.format, type: fDef.type,
        };
      }),
      ...aggregations.map(ag => {
        const { fDef, tDef } = resolveCol(ag.table, ag.field);
        return {
          key: `${ag.func}_${ag.table}__${ag.field}`, table: ag.table,
          label: multiTable
            ? `${ag.func.toUpperCase()}(${tDef.label}: ${fDef.label})`
            : `${ag.func.toUpperCase()}(${fDef.label})`,
          format: fDef.format, type: 'number',
        };
      }),
    ];
  } else {
    resultFields = resolvedFields.map(f => ({
      key: f.resultKey, table: f.table,
      label: multiTable ? `${f.tableLabel}: ${f.label}` : f.label,
      format: f.format, type: f.type,
    }));
  }

  res.json({
    data:   rows,
    total:  Number(countResult?.total || 0),
    fields: resultFields,
  });
}

// ══════════════════════════════════════════════════════════════
//  POST /run  — execute a report query (legacy + multi-table)
// ══════════════════════════════════════════════════════════════
router.post('/run', async (req, res) => {
  try {
    // Multi-table mode: linkedTables present
    if (Array.isArray(req.body.linkedTables)) {
      return await runMultiTable(req, res);
    }

    // ── Legacy single-table mode ──
    const {
      tableKey,
      fields        = [],
      filters       = [],
      filterLogic   = 'AND',
      sorts         = [],
      groupBy       = [],
      aggregations  = [],   // [{ field, func }] func: sum|avg|min|max|count
      limit         = 500,
      offset        = 0,
      distinct      = false,
    } = req.body;

    // ── Validate table ──
    const tableDef = CATALOG[tableKey];
    if (!tableDef) return res.status(400).json({ error: 'Invalid data source' });

    // ── Validate & resolve fields ──
    const VALID_AGG_FUNCS = new Set(['sum','avg','min','max','count']);
    const selectedFields = fields.map(fkey => {
      const fd = getField(tableKey, fkey);
      if (!fd) throw new Error(`Invalid field: ${fkey}`);
      return fd;
    });
    if (selectedFields.length === 0) {
      return res.status(400).json({ error: 'Select at least one column' });
    }

    // ── Validate filters ──
    for (const f of filters) {
      if (!getField(tableKey, f.field)) throw new Error(`Invalid filter field: ${f.field}`);
      if (!VALID_OPS.has(f.op)) throw new Error(`Invalid operator: ${f.op}`);
    }

    // ── Validate sorts ──
    for (const s of sorts) {
      if (!getField(tableKey, s.field)) throw new Error(`Invalid sort field: ${s.field}`);
      if (!['asc','desc'].includes((s.direction || '').toLowerCase())) throw new Error('Invalid sort direction');
    }

    // ── Validate group by ──
    for (const g of groupBy) {
      if (!getField(tableKey, g)) throw new Error(`Invalid group-by field: ${g}`);
    }

    // ── Validate aggregations ──
    for (const ag of aggregations) {
      if (!getField(tableKey, ag.field)) throw new Error(`Invalid aggregation field: ${ag.field}`);
      if (!VALID_AGG_FUNCS.has(ag.func)) throw new Error(`Invalid aggregation function: ${ag.func}`);
    }

    // ── Determine which joins are needed ──
    const allJoinSets = [
      ...selectedFields.map(f => f.join),
      ...filters.map(f => getField(tableKey, f.field)?.join),
      ...sorts.map(s => getField(tableKey, s.field)?.join),
      ...groupBy.map(g => getField(tableKey, g)?.join),
      ...aggregations.map(ag => getField(tableKey, ag.field)?.join),
    ].filter(Boolean);

    const orderedJoins = resolveJoins(tableDef, allJoinSets);

    // ── Build base query ──
    let query = db(`${tableDef.table} as ${tableDef.alias}`);
    if (distinct) query = query.distinct();

    // Add joins
    for (const alias of orderedJoins) {
      const jdef = tableDef.joins[alias];
      query = query.leftJoin(`${jdef.table} as ${alias}`, jdef.on[0], jdef.on[1]);
    }

    // ── SELECT columns ──
    const isGrouped = groupBy.length > 0 || aggregations.length > 0;

    if (isGrouped) {
      // Group by query — select group fields + aggregate fields
      const selectParts = [];
      for (const g of groupBy) {
        const fd = getField(tableKey, g);
        selectParts.push(db.raw(`?? as ??`, [fd.col, g]));
      }
      for (const ag of aggregations) {
        const fd = getField(tableKey, ag.field);
        selectParts.push(db.raw(`${ag.func.toUpperCase()}(??) as ??`, [fd.col, `${ag.func}_${ag.field}`]));
      }
      query = query.select(selectParts);
      for (const g of groupBy) {
        const fd = getField(tableKey, g);
        query = query.groupBy(fd.col);
      }
    } else {
      // Regular select
      const selectParts = selectedFields.map(f => db.raw(`?? as ??`, [f.col, f.key]));
      query = query.select(selectParts);
    }

    // ── Apply filters ──
    if (filters.length > 0) {
      if (filterLogic === 'OR') {
        query = query.where(function () {
          for (const f of filters) {
            const fd = getField(tableKey, f.field);
            this.orWhere(function () { applyOperator(this, fd.col, f.op, f.value); });
          }
        });
      } else {
        for (const f of filters) {
          const fd = getField(tableKey, f.field);
          query = applyOperator(query, fd.col, f.op, f.value);
        }
      }
    }

    // ── Apply sort ──
    for (const s of sorts) {
      const fd = getField(tableKey, s.field);
      query = query.orderBy(fd.col, s.direction);
    }

    // ── Count for pagination (clone before limit/offset) ──
    const countQuery = query.clone()
      .clearSelect()
      .clearGroup()
      .clearOrder()
      .count('* as total')
      .first();

    // Apply limit/offset
    const safeLimit  = Math.min(Number(limit)  || 500, 10000);
    const safeOffset = Math.max(Number(offset) || 0,   0);
    query = query.limit(safeLimit).offset(safeOffset);

    const [rows, countResult] = await Promise.all([query, countQuery]);

    // ── Build result column metadata ──
    let resultFields;
    if (isGrouped) {
      resultFields = [
        ...groupBy.map(g => {
          const fd = getField(tableKey, g);
          return { key: g, label: fd.label, format: fd.format, type: fd.type };
        }),
        ...aggregations.map(ag => {
          const fd = getField(tableKey, ag.field);
          return {
            key: `${ag.func}_${ag.field}`,
            label: `${ag.func.toUpperCase()}(${fd.label})`,
            format: fd.format,
            type: 'number',
          };
        }),
      ];
    } else {
      resultFields = selectedFields.map(f => ({
        key:    f.key,
        label:  f.label,
        format: f.format,
        type:   f.type,
      }));
    }

    res.json({
      data:   rows,
      total:  Number(countResult?.total || 0),
      fields: resultFields,
    });
  } catch (err) {
    if (err.message?.startsWith('Invalid') || err.message?.startsWith('Select')
        || err.message?.startsWith('Table') || err.message?.startsWith('No ')) {
      return res.status(400).json({ error: err.message });
    }
    safeError(res, err, 'reports');
  }
});

// ══════════════════════════════════════════════════════════════
//  Saved Reports CRUD
// ══════════════════════════════════════════════════════════════

// GET /  — list saved reports
router.get('/', async (req, res) => {

  try {
    const hasTable = await db.schema.hasTable('saved_reports');
    if (!hasTable) return res.json([]);
    const rows = await db('saved_reports as sr')
      .leftJoin('users as u', 'sr.created_by', 'u.users_id')
      .select('sr.*', 'u.display_name as created_by_name')
      .orderBy('sr.updated_at', 'desc');
    res.json(rows);
  } catch (err) { safeError(res, err, 'saved_reports'); }
});

// GET /:id — single saved report
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const row = await db('saved_reports as sr')
      .leftJoin('users as u', 'sr.created_by', 'u.users_id')
      .select('sr.*', 'u.display_name as created_by_name')
      .where('sr.saved_reports_id', id)
      .first();
    if (!row) return res.status(404).json({ error: 'Report not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'saved_reports'); }
});

// POST /  — save a new report
router.post('/save', async (req, res) => {
  try {
    const { name, description, config } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!config || !config.tableKey) return res.status(400).json({ error: 'Invalid report config' });

    const hasTable = await db.schema.hasTable('saved_reports');
    if (!hasTable) return res.status(503).json({ error: 'Database not ready — run migrations' });

    const id = await db.insertReturningId('saved_reports', {
      name:        name.trim().slice(0, 200),
      description: description ? description.slice(0, 2000) : null,
      config:      JSON.stringify(config),
      created_by:  req.user?.users_id || null,
    });
    const row = await db('saved_reports').where('saved_reports_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'saved_reports'); }
});

// PUT /:id  — update saved report
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const { name, description, config } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    const row = await db('saved_reports').where('saved_reports_id', id).first();
    if (!row) return res.status(404).json({ error: 'Report not found' });

    await db('saved_reports').where('saved_reports_id', id).update({
      name:        name.trim().slice(0, 200),
      description: description ? description.slice(0, 2000) : null,
      config:      JSON.stringify(config),
      updated_at:  db.fn.now(),
    });
    const updated = await db('saved_reports').where('saved_reports_id', id).first();
    res.json(updated);
  } catch (err) { safeError(res, err, 'saved_reports'); }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const row = await db('saved_reports').where('saved_reports_id', id).first();
    if (!row) return res.status(404).json({ error: 'Report not found' });
    await db('saved_reports').where('saved_reports_id', id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'saved_reports'); }
});

module.exports = router;
