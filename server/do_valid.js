const fs = require('fs');
let code = fs.readFileSync('routes/_validators.js', 'utf8');

const contractCode = "const contractRules = [\\n" +
"  requiredFk('vendors_id'),\\n" +
"  optionalStr('contract_name', 160),\\n" +
"  optionalStr('contract_number', 80),\\n" +
"  optionalStr('type', 60),\\n" +
"  optionalStr('subtype', 60),\\n" +
"  optionalFk('parent_contract_id'),\\n" +
"  optionalFk('currency_id'),\\n" +
"  optionalStr('contract_record_url', 500),\\n" +
"  optionalDate('start_date'),\\n" +
"  optionalDate('expiration_date'),\\n" +
"  optionalStr('term_type', 60),\\n" +
"  optionalDate('renew_date'),\\n" +
"  optionalDecimal('contracted_rate'),\\n" +
"  optionalStr('rate_unit', 60),\\n" +
"  body('term_months').optional({ nullable: true, values: 'falsy' }).isInt({ min: 1 }).withMessage('term_months must be a positive integer'),\\n" +
"  optionalDecimal('minimum_spend'),\\n" +
"  optionalDecimal('etf_amount'),\\n" +
"  optionalStr('commitment_type', 60),\\n" +
"  optionalDecimal('contract_value'),\\n" +
"  optionalDecimal('tax_assessed'),\\n" +
"  optionalStr('product_service_types', 255),\\n" +
"  optionalStr('business_line', 120),\\n" +
"  enumField('status', ['Active', 'Expired', 'Pending', 'Terminated']),\\n" +
"  body('auto_renew').optional().isBoolean().withMessage('auto_renew must be boolean'),\\n" +
"];";

code = code.replace(/const contractRules = \[[\s\S]*?\];/, contractCode.replace(/\\n/g, '\n'));
code = code.replace(/optionalFk\('cir_id'\),/g, "optionalFk('inventory_id'),");

fs.writeFileSync('routes/_validators.js', code);
