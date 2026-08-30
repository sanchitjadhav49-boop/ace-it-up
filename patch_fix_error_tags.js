const fs = require('fs');
const file = 'app.js';
let s = fs.readFileSync(file, 'utf8');
const bad1 = "await client.query(\n        INSERT INTO error_tags (attempt_id, question_id, error_tag, updated_at) VALUES ($1, $2, $3, now()) ON CONFLICT (attempt_id, question_id) DO UPDATE SET error_tag = EXCLUDED.error_tag, updated_at = now() DO UPDATE' + EOL +\n        '            SET error_tag = EXCLUDED.error_tag, updated_at = now()',\n        [attemptId, questionId, tag]\n      );";
if (s.indexOf(bad1) !== -1) {
  s = s.replace(bad1, "await client.query(\n        `INSERT INTO error_tags (attempt_id, question_id, error_tag, updated_at)\n         VALUES ($1, $2, $3, now())\n         ON CONFLICT (attempt_id, question_id) DO UPDATE\n            SET error_tag = EXCLUDED.error_tag, updated_at = now()`,\n        [attemptId, questionId, tag]\n      );");
  fs.writeFileSync(file, s, 'utf8');
  console.log('patched by exact match');
  process.exit(0);
}

// Fallback: find the INSERT INTO error_tags block and replace the whole await client.query(...) call
const re = /await client.query\([\s\S]*?error_tags[\s\S]*?saved\[questionId\] = tag;\n\s*}\);/m;
if (re.test(s)) {
  s = s.replace(re, "await client.query(\n        `INSERT INTO error_tags (attempt_id, question_id, error_tag, updated_at)\n         VALUES ($1, $2, $3, now())\n         ON CONFLICT (attempt_id, question_id) DO UPDATE\n            SET error_tag = EXCLUDED.error_tag, updated_at = now()`,\n        [attemptId, questionId, tag]\n      );\n      saved[questionId] = tag;\n    }");
  fs.writeFileSync(file, s, 'utf8');
  console.log('patched by regex');
  process.exit(0);
}
console.error('pattern not found');
process.exit(2);
