const fs = require('fs');

let serverContent = fs.readFileSync('server/server.js', 'utf8');

serverContent = serverContent.replace(/v\.vendor_name as vendor_name/g, 'v.name as vendor_name');

fs.writeFileSync('server/server.js', serverContent);

let dashboardContent = fs.readFileSync('client/src/pages/Dashboard.jsx', 'utf8');

dashboardContent = dashboardContent.replace(/s\.account_name/g, "s.vendor_name");

fs.writeFileSync('client/src/pages/Dashboard.jsx', dashboardContent);
console.log('Fixed cost_savings query in server/server.js and Dashboard!');
