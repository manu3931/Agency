#!/usr/bin/env node
/* Turns the private rate card (data.private.js, kept in the private repo) into the file the live site's
   Settings page loads for the team: owner names, values, notes, the buying list and research included.

     node tools/export-private.js path/to/data.private.js > rate-card.private.json

   Load it from Settings, Full rate card, then delete the file. Never commit it: .gitignore skips *.private.json. */
const fs = require('fs');
const vm = require('vm');

const file = process.argv[2];
if (!file) { console.error('usage: node tools/export-private.js path/to/data.private.js > rate-card.private.json'); process.exit(2); }
const ctx = {};
vm.runInNewContext(fs.readFileSync(file, 'utf8') + '\n;this.SNAPSHOT = SNAPSHOT;', ctx);
const S = ctx.SNAPSHOT;
if (!S || !Array.isArray(S.rows) || !S.rows.length) { console.error('That file has no rate card in it.'); process.exit(1); }
process.stdout.write(JSON.stringify(Object.assign({}, S, { preview: false })));
console.error(`rate card as of ${S.asOf}: ${S.rows.length} items, ${S.packages.length} kits`);
