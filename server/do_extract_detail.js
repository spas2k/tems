const fs = require('fs');
const content = fs.readFileSync(process.argv[2], 'utf8');

const regex = /```(?:jsx|javascript)?\n([\s\S]*?)```/g;
let match = regex.exec(content);
if (match) {
    fs.writeFileSync('../client/src/pages/ContractDetail.jsx', match[1].trim() + '\n');
    console.log("Saved ContractDetail.jsx");
} else {
    console.log('No block matched');
}
