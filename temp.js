const fs = require('fs');
const lines = fs.readFileSync('DATABASE_SCHEMA_recreated.md', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes('invoice_reader_templates'));
console.log(lines.slice(idx, idx + 10).join('\n'));
