const fs = require('fs');

let rContent = fs.readFileSync('server/routes/invoiceReader.js', 'utf8');

rContent = rContent.replace(/t\.accounts_id/g, 't.vendors_id');
rContent = rContent.replace(/a\.accounts_id/g, 'a.vendors_id');

fs.writeFileSync('server/routes/invoiceReader.js', rContent);

let ratesContent = fs.readFileSync('server/routes/contractRates.js', 'utf8');
ratesContent = ratesContent.replace(/a\.accounts_id/g, 'a.vendors_id');
fs.writeFileSync('server/routes/contractRates.js', ratesContent);

let searchContent = fs.readFileSync('server/routes/search.js', 'utf8');
searchContent = searchContent.replace(/a\.accounts_id/g, 'a.vendors_id');
fs.writeFileSync('server/routes/search.js', searchContent);

console.log('Fixed wrong keys!');
