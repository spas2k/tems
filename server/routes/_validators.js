// ============================================================
// Shared express-validator rules for all TEMS entities
// ============================================================
const { body, param, validationResult } = require('express-validator');

// ── Middleware: run after validation rules to return 400 on failure ──
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

// ── Reusable: id param must be a positive integer ──
const idParam = param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer');

// ── Helper: optional integer FK field ──
const optionalFk = (field) =>
  body(field).optional({ nullable: true, values: 'falsy' }).isInt({ min: 1 }).withMessage(`${field} must be a positive integer`);

// ── Helper: required integer FK field ──
const requiredFk = (field) =>
  body(field).notEmpty().withMessage(`${field} is required`).isInt({ min: 1 }).withMessage(`${field} must be a positive integer`);

// ── Helper: optional decimal field ──
const optionalDecimal = (field) =>
  body(field).optional({ nullable: true, values: 'falsy' }).isFloat().withMessage(`${field} must be a number`);

// ── Helper: required string with max length ──
const requiredStr = (field, max = 255) =>
  body(field)
    .trim()
    .notEmpty().withMessage(`${field} is required`)
    .isLength({ max }).withMessage(`${field} must be at most ${max} characters`);

// ── Helper: optional string with max length ──
const optionalStr = (field, max = 255) =>
  body(field)
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max }).withMessage(`${field} must be at most ${max} characters`);

// ── Helper: optional date field ──
const optionalDate = (field) =>
  body(field).optional({ nullable: true, values: 'falsy' }).isISO8601().withMessage(`${field} must be a valid date`);

// ── Helper: required date field ──
const requiredDate = (field) =>
  body(field).notEmpty().withMessage(`${field} is required`).isISO8601().withMessage(`${field} must be a valid date`);

// ── Helper: enum field ──
const enumField = (field, values, required = false) => {
  let chain = body(field);
  if (required) chain = chain.notEmpty().withMessage(`${field} is required`);
  else chain = chain.optional({ values: 'falsy' });
  return chain.isIn(values).withMessage(`${field} must be one of: ${values.join(', ')}`);
};

// ============================================================
// Entity-specific validation rule sets
// ============================================================

const accountRules = [
  requiredStr('name', 120),
  optionalStr('account_number', 80),
  optionalStr('vendor_type', 60),
  optionalStr('contact_name', 120),
  body('contact_email').optional({ values: 'falsy' }).trim().isEmail().withMessage('contact_email must be a valid email').isLength({ max: 120 }).withMessage('contact_email max 120 chars'),
  optionalStr('contact_phone', 40),
  enumField('status', ['Active', 'Inactive']),
];

const contractRules = [
  requiredFk('accounts_id'),
  optionalStr('name', 160),
  optionalStr('contract_number', 80),
  optionalDate('start_date'),
  optionalDate('end_date'),
  optionalDecimal('contracted_rate'),
  optionalStr('rate_unit', 60),
  body('term_months').optional({ nullable: true, values: 'falsy' }).isInt({ min: 1 }).withMessage('term_months must be a positive integer'),
  optionalDecimal('minimum_spend'),
  optionalDecimal('etf_amount'),
  optionalStr('commitment_type', 60),
  enumField('status', ['Active', 'Expired', 'Pending', 'Terminated']),
  body('auto_renew').optional().isBoolean().withMessage('auto_renew must be boolean'),
];

const circuitRules = [
  requiredFk('accounts_id'),
  optionalFk('contracts_id'),
  optionalFk('orders_id'),
  requiredStr('circuit_number', 100),
  optionalStr('type', 60),
  optionalStr('bandwidth', 40),
  optionalStr('location', 200),
  optionalDecimal('contracted_rate'),
  enumField('status', ['Active', 'Pending', 'Disconnected', 'Suspended']),
  optionalDate('install_date'),
  optionalDate('disconnect_date'),
];

const orderRules = [
  requiredFk('accounts_id'),
  optionalFk('contracts_id'),
  optionalFk('circuits_id'),
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
  optionalFk('circuits_id'),
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
  requiredFk('accounts_id'),
  optionalFk('circuits_id'),
  optionalFk('line_items_id'),
  optionalFk('invoices_id'),
  optionalStr('category', 80),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }).withMessage('description max 2000 chars'),
  optionalDate('identified_date'),
  enumField('status', ['Identified', 'In Progress', 'Resolved', 'Dismissed']),
  optionalDecimal('projected_savings'),
  optionalDecimal('realized_savings'),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }).withMessage('notes max 2000 chars'),
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
  optionalFk('invoices_id'),
  requiredFk('accounts_id'),
  enumField('dispute_type', ['Overcharge', 'Duplicate Charge', 'Wrong Rate', 'Missing Credit', 'Service Not Delivered', 'Other']),
  body('amount').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('amount must be >= 0'),
  enumField('status', ['Open', 'Under Review', 'Credited', 'Denied', 'Closed']),
  optionalDate('filed_date'),
  optionalDate('resolved_date'),
  body('resolution_notes').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
  optionalDecimal('credit_amount'),
  optionalStr('reference_number', 80),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
];

module.exports = {
  validate,
  idParam,
  accountRules,
  contractRules,
  circuitRules,
  orderRules,
  invoiceRules,
  lineItemRules,
  allocationRules,
  costSavingsRules,
  usocCodeRules,
  contractRateRules,
  disputeRules,
};
