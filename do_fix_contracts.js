const fs = require('fs');
let content = fs.readFileSync('client/src/pages/Contracts.jsx', 'utf8');
content = content.replace(/accounts_id/g, 'vendors_id');
content = content.replace(/getAccounts/g, 'getVendors');
content = content.replace(/account_name/g, 'vendor_name');
content = content.replace(/Vendor Account/g, 'Vendor');
content = content.replace(/accounts/g, 'vendors');
// fixing confirm quotes if any
content = content.replace(/confirm\(Delete \$\{rows.length\} records\?\)/g, "confirm(Delete  records?)"); // Should be same
fs.writeFileSync('client/src/pages/Contracts.jsx', content);
