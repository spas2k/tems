const fs = require('fs');

const fixDash = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/label: i\.inventory_number \+ \(i\.location \? [^\+]+ \+/g, "label: i.inventory_number + (i.location ? ' — ' +");
  fs.writeFileSync(file, content);
};

fixDash('client/src/pages/OrderAdd.jsx');
fixDash('client/src/pages/OrderDetail.jsx');
