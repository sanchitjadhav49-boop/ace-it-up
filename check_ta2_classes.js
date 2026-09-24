// Cross-check: every ta2-* class used in App.jsx must exist in exam.css.
const fs = require('fs');
const jsx = fs.readFileSync('frontend/src/App.jsx', 'utf8');
const css = fs.readFileSync('frontend/src/exam.css', 'utf8');

const used = new Set();
for (const m of jsx.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
  const s = (m[1] || m[2] || '');
  s.split(/[\s${}?':()]+/).forEach((c) => { if (c.startsWith('ta2-')) used.add(c); });
}
const defined = new Set();
for (const m of css.matchAll(/\.(ta2-[a-zA-Z0-9_-]+)/g)) defined.add(m[1]);

const missing = [...used].filter((c) => !defined.has(c)).sort();
const unused = [...defined].filter((c) => !used.has(c)).sort();
console.log('used ta2 classes   : ' + used.size);
console.log('defined ta2 classes: ' + defined.size);
console.log('used but NOT styled: ' + (missing.length ? missing.join(', ') : 'none'));
console.log('styled but unused  : ' + (unused.length ? unused.join(', ') : 'none'));
