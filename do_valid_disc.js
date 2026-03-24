const fs = require('fs');
let content = fs.readFileSync('server/routes/_validators.js', 'utf8');

content = content.replace(/const costSavingsRules = \[[\s\S]*?\];/, `const costSavingsRules = [
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
];`);

content = content.replace(/const disputeRules = \[[\s\S]*?\];/, `const disputeRules = [
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
];`);

fs.writeFileSync('server/routes/_validators.js', content);
