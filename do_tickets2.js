const fs = require('fs');
let text = fs.readFileSync('server/routes/tickets.js', 'utf8');

// Replace globally
text = text.replace(
  /tags,[\s]+steps_to_reproduce/g,
  'tags, environment, browser_info,\n        steps_to_reproduce'
);

text = text.replace(
  /resolution:\s+resolution\?\.trim\(\) \|\| null,/g,
  "resolution:         resolution?.trim() || null,\n        environment:        environment?.trim() || null,\n        browser_info:       browser_info?.trim() || null,"
);

fs.writeFileSync('server/routes/tickets.js', text);
