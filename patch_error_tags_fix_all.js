const fs = require('fs');
const p = 'app.js';
let s = fs.readFileSync(p, 'utf8');
const re = /await client\.query\([\s\S]*?INSERT INTO error_tags[\s\S]*?\);/g;
let m;
let count = 0;
const replacement = `await client.query(\n        `INSERT INTO error_tags (attempt_id, question_id, error_tag, updated_at)\n         VALUES ($1, $2, $3, now())\n         ON CONFLICT (attempt_id, question_id) DO UPDATE\n            SET error_tag = EXCLUDED.error_tag, updated_at = now()`,\n        [attemptId, questionId, tag]\n      );`;
if (!re.test(s)) {
  console.log('no matches to replace');
} else {
  s = s.replace(re, () => { count++; return replacement; });
  fs.writeFileSync(p, s, 'utf8');
  console.log('replaced', count, 'occurrence(s)');
}
