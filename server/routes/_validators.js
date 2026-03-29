/**
 * @file _validators.js — Shared express-validator rules for all TEMS entities.
 *
 * Exports reusable validation rule arrays for each entity type (vendorRules,
 * accountRules, etc.) and helper factories for common field patterns
 * (requiredStr, optionalFk, optionalDecimal, etc.).
 *
 * Usage in route files:
 *   const { validate, vendorRules } = require('./_validators');
 *   router.post('/', vendorRules, validate, async (req, res) => { ... });
 *
 * @module _validators
 * @requires express-validator
 */
// ============================================================
// Shared express-validator rules for all TEMS entities
// ============================================================
const { body, param, validationResult } = require('express-validator');

/**
 * Middleware: runs after validation rules, returns 400 with field-level
 * error details if any validation failed.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {Function}                   next
 * @returns {void} Sends 400 on failure with { error, details } payload
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

/**
 * Validation chain: ensures :id route param is a positive integer.
 * @type {import('express-validator').ValidationChain}
 */
const idParam = param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer');

/**
 * Creates a validation chain for an optional FK integer field.
 * Accepts null/falsy; when present, must be a positive integer.
 * @param {string} field - Body field name (e.g. 'vendors_id')
 * @returns {import('express-validator').ValidationChain}
 */
const optionalFk = (field) =>
  body(field).optional({ nullable: true, values: 'falsy' }).isInt({ min: 1 }).withMessage(`${field} must be a positive integer`);

/**
 * Creates a validation chain for a required FK integer field.
 * Must be non-empty and a positive integer.
 * @param {string} field - Body field name (e.g. 'accounts_id')
 * @returns {import('express-validator').ValidationChain}
 */
const requiredFk = (field) =>
  body(field).notEmpty().withMessage(`${field} is required`).isInt({ min: 1 }).withMessage(`${field} must be a positive integer`);

/**
 * Creates a validation chain for an optional numeric/decimal field.
 * Accepts null/falsy; when present, must parse as float.
 * @param {string} field - Body field name (e.g. 'projected_savings')
 * @returns {import('express-validator').ValidationChain}
 */
const optionalDecimal = (field) =>
  body(field).optional({ nullable: true, values: 'falsy' }).isFloat().withMessage(`${field} must be a number`);

/**
 * Creates a validation chain for a required, trimmed string with max length.
 * @param {string} field - Body field name (e.g. 'name')
 * @param {number} [max=255] - Maximum allowed character length
 * @returns {import('express-validator').ValidationChain}
 */
const requiredStr = (field, max = 255) =>
  body(field)
    .trim()
    .notEmpty().withMessage(`${field} is required`)
    .isLength({ max }).withMessage(`${field} must be at most ${max} characters`);

/**
 * Creates a validation chain for an optional, trimmed string with max length.
 * @param {string} field - Body field name
 * @param {number} [max=255] - Maximum allowed character length
 * @returns {import('express-validator').ValidationChain}
 */
const optionalStr = (field, max = 255) =>
  body(field)
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max }).withMessage(`${field} must be at most ${max} characters`);

/**
 * Creates a validation chain for an optional ISO-8601 date field.
 * @param {string} field - Body field name (e.g. 'start_date')
 * @returns {import('express-validator').ValidationChain}
 */
const optionalDate = (field) =>
  body(field).optional({ nullable: true, values: 'falsy' }).isISO8601().withMessage(`${field} must be a valid date`);

/**
 * Creates a validation chain for a required ISO-8601 date field.
 * @param {string} field - Body field name (e.g. 'filed_date')
 * @returns {import('express-validator').ValidationChain}
 */
const requiredDate = (field) =>
  body(field).notEmpty().withMessage(`${field} is required`).isISO8601().withMessage(`${field} must be a valid date`);

/**
 * Creates a validation chain for a field restricted to a set of allowed values.
 * @param {string}   field - Body field name (e.g. 'status')
 * @param {string[]} values - Allowed string values
 * @param {boolean}  [required=false] - Whether the field must be present
 * @returns {import('express-validator').ValidationChain}
 */
const enumField = (field, values, required = false) => {
  let chain = body(field);
  if (required) chain = chain.notEmpty().withMessage(`${field} is required`);
  else chain = chain.optional({ values: 'falsy' });
  return chain.isIn(values).withMessage(`${field} must be one of: ${values.join(', ')}`);
};

// ============================================================
// Entity-specific validation rule sets
// ============================================================

const vendorRules = [
  requiredStr('name', 120),
  optionalStr('vendor_number', 80),
  optionalStr('vendor_type', 80),
  optionalStr('contact_name', 120),
  optionalStr('contact_email', 120),
  optionalStr('contact_phone', 60),
  optionalStr('country', 120),
  optionalFk('currency_id'),
  optionalStr('tier', 60),
  body('fourth_party_vendor').optional({ nullable: true }).isBoolean(),
  optionalStr('website', 255),
  enumField('status', ['Active', 'Inactive']),
];

const accountRules = [
  requiredFk('vendors_id'),
  optionalStr('name', 120),
  requiredStr('account_number', 80),
  optionalStr('subaccount_number', 80),
  optionalFk('assigned_user_id'),
  optionalStr('team', 80),
  optionalStr('account_hierarchy', 120),
  optionalFk('parent_account_id'),
  optionalStr('account_type', 60),
  optionalStr('account_subtype', 60),
  optionalFk('currency_id'),
  optionalFk('company_code_id'),
  optionalFk('ship_to_location_id'),
  optionalFk('asset_location_id'),
  optionalFk('tax_analyst_id'),
  optionalStr('payment_info', 1000),         // Note: could be jsonb depending on db, string for now
  optionalStr('allocation_settings', 1000),  // Note: could be jsonb
  optionalStr('contact_details', 1000),      // Note: could be jsonb
  enumField('status', ['Active', 'Inactive']),
];

const contractRules = [
  requiredFk('vendors_id'),
  optionalStr('contract_name', 160),
  optionalStr('contract_number', 80),
  optionalStr('type', 60),
  optionalStr('subtype', 60),
  optionalFk('parent_contract_id'),
  optionalFk('currency_id'),
  optionalStr('contract_record_url', 500),
  optionalDate('start_date'),
  optionalDate('expiration_date'),
  optionalStr('term_type', 60),
  optionalDate('renew_date'),
  optionalDecimal('contracted_rate'),
  optionalStr('rate_unit', 60),
  body('term_months').optional({ nullable: true, values: 'falsy' }).isInt({ min: 1 }).withMessage('term_months must be a positive integer'),
  optionalDecimal('minimum_spend'),
  optionalDecimal('etf_amount'),
  optionalStr('commitment_type', 60),
  optionalDecimal('contract_value'),
  optionalDecimal('tax_assessed'),
  optionalStr('product_service_types', 255),
  optionalStr('business_line', 120),
  enumField('status', ['Active', 'Expired', 'Pending', 'Terminated']),
  body('auto_renew').optional().isBoolean().withMessage('auto_renew must be boolean'),
];

const inventoryItemRules = [
  requiredFk('accounts_id'),
  optionalFk('contracts_id'),
  optionalFk('orders_id'),
  requiredStr('inventory_number', 100),
  optionalStr('type', 60),
  optionalStr('bandwidth', 40),
  optionalStr('location', 200),
  optionalDecimal('contracted_rate'),
  enumField('status', ['Active', 'Pending', 'Disconnected', 'Suspended']),
  optionalDate('install_date'),
  optionalDate('disconnect_date'),
];

const orderRules = [
  requiredFk('vendors_id'),
  requiredFk('contracts_id'),
  optionalFk('inventory_id'),
  requiredStr('order_number', 80),
  optionalStr('description', 255),
  optionalDecimal('contracted_rate'),
  optionalDate('order_date'),
  optionalDate('due_date'),
  enumField('status', ['Pending', 'In Progress', 'Completed', 'Cancelled']),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }).withMessage('notes max 2000 chars'),
  optionalFk('assigned_users_id'),
];

const invoiceRules = [
  requiredFk('accounts_id'),
  requiredStr('invoice_number', 80),
  optionalDate('invoice_date'),
  optionalDate('due_date'),
  optionalDate('period_start'),
  optionalDate('period_end'),
  body('total_amount').notEmpty().withMessage('total_amount is required').isFloat({ min: 0 }).withMessage('total_amount must be >= 0'),
  enumField('status', ['Open', 'Paid', 'Disputed', 'Overdue', 'Void', 'Closed']),
  optionalDate('payment_date'),
  optionalFk('assigned_users_id'),
];

const lineItemRules = [
  requiredFk('invoices_id'),
  optionalFk('inventory_id'),
  optionalFk('usoc_codes_id'),
  optionalStr('description', 255),
  enumField('charge_type', ['MRC', 'NRC', 'Tax/Surcharge', 'Usage', 'One-Time', 'Other']),
  body('amount').notEmpty().withMessage('amount is required').isFloat().withMessage('amount must be a number'),
  optionalDecimal('mrc_amount'),
  optionalDecimal('nrc_amount'),
  optionalDecimal('contracted_rate'),
  optionalDate('period_start'),
  optionalDate('period_end'),
];

const allocationRules = [
  requiredFk('line_items_id'),
  optionalStr('cost_center', 120),
  optionalStr('department', 120),
  body('percentage').optional({ nullable: true }).isFloat({ min: 0, max: 100 }).withMessage('percentage must be 0-100'),
  optionalDecimal('allocated_amount'),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }).withMessage('notes max 2000 chars'),
];

const costSavingsRules = [
  requiredFk('vendors_id'),
  optionalFk('inventory_id'),
  optionalFk('line_items_id'),
  optionalFk('invoices_id'),
  optionalStr('category', 80),
  optionalStr('description', 255),
  optionalDate('identified_date'),
  enumField('status', ['Identified', 'Implemented', 'Rejected']),
  body('projected_savings').optional({ nullable: true }).isFloat().withMessage('projected_savings must be number'),
  body('realized_savings').optional({ nullable: true }).isFloat().withMessage('realized_savings must be number'),
];

const usocCodeRules = [
  requiredStr('usoc_code', 20),
  optionalStr('description', 255),
  enumField('category', ['Access', 'Transport', 'Wireless', 'Feature', 'Surcharge']),
  optionalStr('sub_category', 80),
  optionalDecimal('default_mrc'),
  optionalDecimal('default_nrc'),
  optionalStr('unit', 40),
  enumField('status', ['Active', 'Inactive']),
];

const contractRateRules = [
  requiredFk('contracts_id'),
  requiredFk('usoc_codes_id'),
  optionalDecimal('mrc'),
  optionalDecimal('nrc'),
  optionalDate('effective_date'),
  optionalDate('expiration_date'),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }).withMessage('notes max 2000 chars'),
];

const disputeRules = [
  optionalFk('line_items_id'),
  requiredFk('invoices_id'),
  requiredFk('vendors_id'),
  enumField('dispute_type', ['Overcharge', 'Duplicate Charge', 'Wrong Rate', 'Missing Credit', 'Service Not Delivered', 'Other']),
  body('amount').notEmpty().withMessage('amount required').isFloat({ min: 0 }).withMessage('amount must be >= 0'),
  enumField('status', ['Open', 'Won', 'Lost']),
  requiredDate('filed_date'),
  optionalDate('resolved_date'),
  optionalStr('resolution_notes', 1000),
  body('credit_amount').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('credit_amount must be >= 0'),
  optionalStr('reference_number', 80),
];

module.exports = {
  validate,
  idParam,
  vendorRules,
  accountRules,
  contractRules,
  inventoryItemRules,
  orderRules,
  invoiceRules,
  lineItemRules,
  allocationRules,
  costSavingsRules,
  usocCodeRules,
  contractRateRules,
  disputeRules,
};
