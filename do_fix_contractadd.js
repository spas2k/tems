const fs = require('fs');
let content = fs.readFileSync('client/src/pages/ContractAdd.jsx', 'utf8');
content = content.replace(/accounts_id/g, 'vendors_id');
content = content.replace(/getAccounts/g, 'getVendors');
content = content.replace(/account_name/g, 'vendor_name');
content = content.replace(/Vendor Account/g, 'Vendor');
content = content.replace(/accounts/g, 'vendors');
fs.writeFileSync('client/src/pages/ContractAdd.jsx', content);
