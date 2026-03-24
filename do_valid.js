const fs = require('fs');
let content = fs.readFileSync('server/routes/_validators.js', 'utf8');

const newAccountRules = `const accountRules = [
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
];`;

content = content.replace(/const accountRules = \[[\s\S]*?\];/, newAccountRules);

fs.writeFileSync('server/routes/_validators.js', content);
