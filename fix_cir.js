const fs = require('fs');

function replaceInFile(file) {
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(/cir_id/g, 'inventory_id');
  fs.writeFileSync(file, text);
  console.log('Fixed ' + file);
}

replaceInFile('server/routes/batchUpload.js');
replaceInFile('server/routes/invoiceReader.js');
replaceInFile('server/routes/reports.js');
replaceInFile('server/routes/search.js');
replaceInFile('server/routes/_cascadeGuard.js');
replaceInFile('client/src/App.jsx');
replaceInFile('client/src/components/ChangeHistory.jsx');

