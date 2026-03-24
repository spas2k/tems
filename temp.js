const fs = require('fs');
const lines = fs.readFileSync('DATABASE_SCHEMA_recreated.md', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes('notifications') || l.includes('notifications'));
console.log(lines.slice(idx, idx + 10).join('\n'));
