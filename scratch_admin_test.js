// Scratch test for the admin static UI served by vite + basic asset sanity.
const fs = require('fs');

async function main() {
  const base = 'http://localhost:5174/admin';
  const checks = [
    ['/index.html', 'text/html', 'Ace It Up · Admin'],
    ['/style.css', 'text/css', '.sidebar'],
    ['/admin.js', 'text/javascript', 'renderDashboard'],
  ];
  for (const [path, type, needle] of checks) {
    const res = await fetch(base + path);
    const text = await res.text();
    const ok = res.status === 200 && text.includes(needle);
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + path + ' -> ' + res.status + ' (' + res.headers.get('content-type') + ')' + (ok ? '' : ' needle not found'));
  }

  const html = fs.readFileSync('frontend/public/admin/index.html', 'utf8');
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
  console.log((dup.length ? 'FAIL' : 'PASS') + ' duplicate ids: ' + (dup.length ? dup.join(',') : 'none'));

  // ids referenced via $('#..') must exist in index.html OR be created
  // dynamically by admin.js itself (id=".." inside a view template).
  const js = fs.readFileSync('frontend/public/admin/admin.js', 'utf8');
  const defined = new Set(ids);
  for (const m of js.matchAll(/id="([a-zA-Z0-9_-]+)"/g)) defined.add(m[1]);
  const refs = [...new Set([...js.matchAll(/\$\('#([a-zA-Z0-9_-]+)'\)/g)].map((m) => m[1]))];
  const missing = refs.filter((id) => !defined.has(id));
  console.log((missing.length ? 'FAIL' : 'PASS') + ' unresolved selector ids: ' + (missing.length ? missing.join(',') : 'none'));

  // basic bracket/paren balance sanity for the JS
  let depth = 0;
  let inStr = null;
  for (let i = 0; i < js.length; i++) {
    const ch = js[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '(' || ch === '{' || ch === '[') depth++;
    if (ch === ')' || ch === '}' || ch === ']') depth--;
    if (depth < 0) { console.log('FAIL unbalanced at', i); process.exit(1); }
  }
  console.log((depth === 0 && inStr === null ? 'PASS' : 'FAIL') + ' bracket balance (depth=' + depth + ')');
}

main().catch((e) => {
  console.error('ERROR', e.message);
  process.exit(1);
});
