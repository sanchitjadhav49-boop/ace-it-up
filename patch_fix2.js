const fs = require('fs');
const file = 'app.js';
let s = fs.readFileSync(file, 'utf8');
const re = /await client.query\([\s\S]*?INSERT INTO error_tags[\s\S]*?\);/m;
if (!re.test(s)) {
  console.error('pattern not found');
  process.exit(2);
}
const repl = "await client.query(\n        `INSERT INTO error_tags (attempt_id, question_id, error_tag, updated_at)\n         VALUES ($1, $2, $3, now())\n         ON CONFLICT (attempt_id, question_id) DO UPDATE\n            SET error_tag = EXCLUDED.error_tag, updated_at = now()`,\n        [attemptId, questionId, tag]\n      );";
s = s.replace(re, repl);
fs.writeFileSync(file, s, 'utf8');
console.log('patched');
