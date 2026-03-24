const fs = require('fs');

function fixAccountsToVendors(file) {
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(/accounts_id/g, 'vendors_id');
  text = text.replace(/getAccounts/g, 'getVendors');
  text = text.replace(/rel\.accounts/g, 'rel.vendors');
  text = text.replace(/accounts:/g, 'vendors:');
  text = text.replace(/accounts \=/g, 'vendors =');
  text = text.replace(/account_name/g, 'vendor_name');
  
  if (file.includes('Detail')) {
    text = text.replace(/getAccount/g, 'getVendor');
  }
  
  fs.writeFileSync(file, text);
  console.log('Fixed ' + file);
}

fixAccountsToVendors('client/src/pages/DisputeAdd.jsx');
fixAccountsToVendors('client/src/pages/DisputeDetail.jsx');
fixAccountsToVendors('client/src/pages/CostSavingDetail.jsx');

