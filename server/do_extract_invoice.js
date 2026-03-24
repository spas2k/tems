const fs = require('fs');
const content = fs.readFileSync(process.argv[2], 'utf8');

const regex = /```(?:jsx|js|javascript)?\n([\s\S]*?)```/;
let match = regex.exec(content);
if (match) {
    fs.writeFileSync('../client/src/pages/InvoiceDetail.jsx', match[1].trim() + '\n');
    console.log("Saved InvoiceDetail.jsx");
} else {
    console.log('No block matched');
}
