const fs = require('fs');
const file = 'app.js';
let s = fs.readFileSync(file, 'utf8');
const needle = 'INSERT INTO error_tags';
const ni = s.indexOf(needle);
if (ni === -1) { console.error('needle not found'); process.exit(2); }
// find 'await client.query(' before ni
const before = s.lastIndexOf('await client.query(', ni);
if (before === -1) { console.error('await client.query( not found before INSERT'); process.exit(2); }
// find the closing ');' after ni
const after = s.indexOf(');', ni);
if (after === -1) { console.error('closing ); not found after INSERT'); process.exit(2); }
const replaceStart = before;
const replaceEnd = after + 2; // include ');'
const old = s.slice(replaceStart, replaceEnd);
console.log('Old snippet:\n', old.slice(0,400));
const good = `await client.query(
        `INSERT INTO error_tags (attempt_id, question_id, error_tag, updated_at)\n         VALUES ($1, $2, $3, now())\n         ON CONFLICT (attempt_id, question_id) DO UPDATE\n            SET error_tag = EXCLUDED.error_tag, updated_at = now()`
,        [attemptId, questionId, tag]
      );`;
// but above uses backticks inside template - need to construct properly
const good2 = "await client.query(\n        `INSERT INTO error_tags (attempt_id, question_id, error_tag, updated_at)\n         VALUES ($1, $2, $3, now())\n         ON CONFLICT (attempt_id, question_id) DO UPDATE\n            SET error_tag = EXCLUDED.error_tag, updated_at = now()`,\n        [attemptId, questionId, tag]\n      );";

s = s.slice(0, replaceStart) + good2 + s.slice(replaceEnd);
fs.writeFileSync(file, s, 'utf8');
console.log('patched app.js');
process.exit(0);
