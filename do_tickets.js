const fs = require('fs');
let text = fs.readFileSync('server/routes/tickets.js', 'utf8');

text = text.replace(
  "body('console_errors')",
  "body('environment').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 500 }),\n  body('browser_info').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 500 }),\n  body('console_errors')"
);

text = text.replace(
  /tags,[\s]+steps_to_reproduce/,
  'tags, environment, browser_info,\n        steps_to_reproduce'
);

text = text.replace(
  "resolution:         resolution?.trim() || null,",
  "resolution:         resolution?.trim() || null,\n        environment:        environment?.trim() || null,\n        browser_info:       browser_info?.trim() || null,"
);

fs.writeFileSync('server/routes/tickets.js', text);
