const fs = require('fs');
const glob = require('glob');

function replaceFileContent(file, replacements) {
  if (!fs.existsSync(file)) return false;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  for (const repl of replacements) {
    if (typeof repl.from === 'string') {
      content = content.split(repl.from).join(repl.to);
    } else {
      content = content.replace(repl.from, repl.to);
    }
  }
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
    return true;
  }
  return false;
}

// 1. Vendor Remittance
['server/routes/vendorRemit.js'].forEach(file => {
  replaceFileContent(file, [
    { from: /accounts_id/g, to: 'vendors_id' },
    { from: /Account/g, to: 'Vendor' },
    { from: /account/g, to: 'vendor' },
    { from: /Accounts/g, to: 'Vendors' }
  ]);
});

['client/src/pages/VendorRemit.jsx', 'client/src/pages/VendorRemitAdd.jsx', 'client/src/pages/VendorRemitDetail.jsx'].forEach(file => {
  replaceFileContent(file, [
    { from: /accounts_id/g, to: 'vendors_id' },
    { from: /Account/g, to: 'Vendor' },
    { from: /account/g, to: 'vendor' },
    { from: /Accounts/g, to: 'Vendors' },
    { from: /getAccounts/g, to: 'getVendors' },
  ]);
});

// 2. Contract Rates
replaceFileContent('server/routes/contractRates.js', [
  { from: 'JOIN accounts a ON c.accounts_id = a.accounts_id', to: 'LEFT JOIN vendors v ON c.vendors_id = v.vendors_id' },
  { from: 'a.account_name', to: 'v.vendor_name' }
]);

// 3. Global Search
replaceFileContent('server/routes/search.js', [
  { from: 'JOIN accounts a ON c.accounts_id = a.accounts_id', to: 'LEFT JOIN vendors v ON c.vendors_id = v.vendors_id' },
  { from: /a\.account_name/g, to: 'v.vendor_name' }
]);

// 4. Vendors Page
replaceFileContent('client/src/pages/Vendors.jsx', [
  { from: /r\.accounts_id/g, to: 'r.vendors_id' }
]);

