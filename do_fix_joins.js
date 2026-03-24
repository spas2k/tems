const fs = require('fs');

let searchContent = fs.readFileSync('server/routes/search.js', 'utf8');
searchContent = searchContent.replace(/\.leftJoin\('accounts as a', 'c\.accounts_id', 'a\.accounts_id'\)/g, ".leftJoin('vendors as a', 'c.vendors_id', 'a.vendors_id')");
fs.writeFileSync('server/routes/search.js', searchContent);

let ratesContent = fs.readFileSync('server/routes/contractRates.js', 'utf8');
ratesContent = ratesContent.replace(/\.leftJoin\('accounts as a', 'c\.accounts_id', 'a\.accounts_id'\)/g, ".leftJoin('vendors as a', 'c.vendors_id', 'a.vendors_id')");
fs.writeFileSync('server/routes/contractRates.js', ratesContent);
console.log('Fixed search and rates!');
