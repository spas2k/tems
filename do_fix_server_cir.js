const fs = require('fs');

let serverContent = fs.readFileSync('server/server.js', 'utf8');

serverContent = serverContent.replace(/li\.cir_id/g, 'li.inventory_id');
serverContent = serverContent.replace(/ci\.cir_id/g, 'ci.inventory_id');

fs.writeFileSync('server/server.js', serverContent);
console.log('Fixed cir_id -> inventory_id in server/server.js!');
