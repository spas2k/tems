const fs = require('fs');
let text = fs.readFileSync('server/routes/tickets.js', 'utf8');

text = text.replace(/        environment:        environment\?\.trim\(\) \|\| null,\n        browser_info:       browser_info\?\.trim\(\) \|\| null,\n/g, '');

text = text.replace(
  /resolution:\s+resolution\?\.trim\(\) \|\| null,/g,
  "resolution:         resolution?.trim() || null,\n        environment:        environment?.trim() || null,\n        browser_info:       browser_info?.trim() || null,"
);

fs.writeFileSync('server/routes/tickets.js', text);
