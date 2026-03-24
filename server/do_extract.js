const fs = require('fs');
const content = fs.readFileSync(process.argv[2], 'utf8');

const regex = /```(?:js|javascript)?\n([\s\S]*?)```/g;
let match;
let i = 0;
const names = ['routes/invoices.js', 'routes/lineItems.js'];

while ((match = regex.exec(content)) !== null) {
  if (i < names.length) {
    fs.writeFileSync(names[i], match[1].trim() + '\n');
    console.log("Saved " + names[i]);
    i++;
  }
}
