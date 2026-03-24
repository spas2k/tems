const fs = require('fs');

// Fix CostSavingAdd.jsx
let csa = fs.readFileSync('client/src/pages/CostSavingAdd.jsx', 'utf8');
csa = csa.replace(/accounts_id: ''/g, "vendors_id: ''");
csa = csa.replace(/cir_id:/g, "inventory_id:");
csa = csa.replace(/accounts_id/g, "vendors_id");
csa = csa.replace(/cir_id/g, "inventory_id");
csa = csa.replace(/getAccounts/g, "getVendors");
csa = csa.replace(/accounts:/g, "vendors:");
csa = csa.replace(/rel\.accounts/g, "rel.vendors");
fs.writeFileSync('client/src/pages/CostSavingAdd.jsx', csa);

// Fix VendorDetail.jsx
let vd = fs.readFileSync('client/src/pages/VendorDetail.jsx', 'utf8');
vd = vd.replace(/ci\.cir_id/g, "ci.inventory_id");
fs.writeFileSync('client/src/pages/VendorDetail.jsx', vd);

