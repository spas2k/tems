/**
 * Workflow Registry
 *
 * Auto-loads all workflow definition files in this folder
 * (excluding engine.js and index.js) and exports them as a map
 * keyed by workflow_key.
 */
const fs = require('fs');
const path = require('path');

const workflows = {};

fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.js') && f !== 'engine.js' && f !== 'index.js')
  .forEach(f => {
    const def = require(path.join(__dirname, f));
    if (def.key) workflows[def.key] = def;
  });

module.exports = workflows;
