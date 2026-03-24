const fs = require('fs');

let rContent = fs.readFileSync('server/routes/invoiceReader.js', 'utf8');

rContent = rContent.replace(/update\.accounts_id/g, 'update.vendors_id');
rContent = rContent.replace(/req\.body\.accounts_id/g, 'req.body.vendors_id');
rContent = rContent.replace(/req\.query\.accounts_id/g, 'req.query.vendors_id');
rContent = rContent.replace(/const \{ accounts_id/g, "const { vendors_id");
rContent = rContent.replace(/accounts_id !== undefined/g, "vendors_id !== undefined");

fs.writeFileSync('server/routes/invoiceReader.js', rContent);

console.log('Fixed req accounts_id!');
