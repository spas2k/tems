const fs = require('fs');
const path = require('path');

const DIR_SERVER = path.join(__dirname, 'routes');
const DIR_CLIENT = path.join(__dirname, '../client/src');
const FILES_TO_CHECK = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else {
      if (full.endsWith('.js') || full.endsWith('.jsx')) {
        FILES_TO_CHECK.push(full);
      }
    }
  }
}

walk(DIR_SERVER);
walk(DIR_CLIENT);

FILES_TO_CHECK.push(path.join(__dirname, 'server.js'));

let totalChanges = 0;

for (const file of FILES_TO_CHECK) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  content = content.replace(/circuits_id/gi, 'inventory_id');
  content = content.replace(/circuit_id/gi, 'inventory_number');
  
  content = content.replace(/\/api\/circuits/g, '/api/inventory');
  
  content = content.replace(/'\/circuits/g, "'/inventory");
  content = content.replace(/'\/circuits\//g, "'/inventory/");
  content = content.replace(/`\/circuits/g, "`/inventory");

  content = content.replace(/CircuitDetail/g, 'InventoryDetail');
  content = content.replace(/Circuits/g, 'Inventory'); 
  
  content = content.replace(/circuits/g, 'inventory');
  content = content.replace(/circuit([a-z0-9_]*)/gi, (match) => {
    // Preserve casing
    if (match.startsWith('Circuit')) return 'InventoryItem' + match.substring(7);
    if (match.startsWith('circuit')) return 'inventoryItem' + match.substring(7);
    return match;
  });
  
  if (original !== content) {
    fs.writeFileSync(file, content);
    console.log('Updated:', file);
    totalChanges++;
  }
}

console.log('Total files updated:', totalChanges);

const renameMap = [
  ['routes/circuits.js', 'routes/inventory.js'],
  ['../client/src/pages/CircuitDetail.jsx', '../client/src/pages/InventoryDetail.jsx'],
  ['../client/src/pages/Circuits.jsx', '../client/src/pages/Inventory.jsx']
];

for (const [oldPath, newPath] of renameMap) {
  const oldFull = path.join(__dirname, oldPath);
  const newFull = path.join(__dirname, newPath);
  if (fs.existsSync(oldFull)) {
    fs.renameSync(oldFull, newFull);
    console.log('Renamed:', oldPath, '->', newPath);
  }
}
