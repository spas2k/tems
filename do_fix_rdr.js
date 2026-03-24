const fs = require('fs');

let rContent = fs.readFileSync('server/routes/invoiceReader.js', 'utf8');

rContent = rContent.replace(/\t\.accounts_id/g, 't.vendors_id');
rContent = rContent.replace(/\u\.accounts_id/g, 'u.vendors_id');
rContent = rContent.replace(/\.leftJoin\('accounts as a',/g, ".leftJoin('vendors as a',");
rContent = rContent.replace(/accounts_id: accountFilter/g, "vendors_id: accountFilter");

fs.writeFileSync('server/routes/invoiceReader.js', rContent);
console.log('Fixed invoiceReader.js!');
