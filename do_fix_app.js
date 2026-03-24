const fs = require('fs');
let content = fs.readFileSync('client/src/App.jsx', 'utf8');
content = content.replace(/InventoryItemAdd/g, 'InventoryAdd');
fs.writeFileSync('client/src/App.jsx', content);
