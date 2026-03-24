const fs = require('fs');
let file = 'client/src/pages/OrderAdd.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\?  —  \+/g, "? ' — ' +");
fs.writeFileSync(file, content);

file = 'client/src/pages/OrderDetail.jsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/\?  —  \+/g, "? ' — ' +");
fs.writeFileSync(file, content);
