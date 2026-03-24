const fs = require('fs');

const fileTicketAdd = 'client/src/pages/TicketAdd.jsx';
let content = fs.readFileSync(fileTicketAdd, 'utf8');
content = content.replace(/console_errors: '',/g, "console_errors: '', environment: '', browser_info: '',");
content = content.replace(/key: 'actual_behavior', label: 'Actual Behavior', type: 'textarea', rows: 2,\s*placeholder: 'What actually happened\?' },/g, "key: 'actual_behavior', label: 'Actual Behavior', type: 'textarea', rows: 2,\n          placeholder: 'What actually happened?' },\n        { key: 'environment', label: 'Environment', type: 'text', placeholder: 'Production, Staging, Local...' },\n        { key: 'browser_info', label: 'Browser Info', type: 'text', placeholder: 'Chrome 120 on Windows...' },");
fs.writeFileSync(fileTicketAdd, content);

const fileTicketDetail = 'client/src/pages/TicketDetail.jsx';
let contentDetail = fs.readFileSync(fileTicketDetail, 'utf8');
contentDetail = contentDetail.replace(/key: 'actual_behavior', label: 'Actual Behavior', type: 'textarea', rows: 2,\s*placeholder: 'What actually happened\?' },/g, "key: 'actual_behavior', label: 'Actual Behavior', type: 'textarea', rows: 2,\n          placeholder: 'What actually happened?' },\n        { key: 'environment', label: 'Environment', type: 'text', placeholder: 'Production, Staging, Local...' },\n        { key: 'browser_info', label: 'Browser Info', type: 'text', placeholder: 'Chrome 120 on Windows...' },");
fs.writeFileSync(fileTicketDetail, contentDetail);

