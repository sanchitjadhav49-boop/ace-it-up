const fs = require('fs');
const s = fs.readFileSync('app.js','utf8');
const terms = ['error-tags', 'error_tags', "app.post('/attempts/:id/error-tags'", 'POST /attempts/:id/error-tags'];
for (const t of terms) {
  const idx = s.indexOf(t);
  console.log('term', t, 'idx', idx);
  if (idx !== -1) console.log(s.slice(Math.max(0, idx-200), idx+200));
}
