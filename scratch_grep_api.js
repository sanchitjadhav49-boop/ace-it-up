const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'frontend', 'src');
const re = /api\(\s*['"`]([^'"`]+)['"`]|fetch\(\s*['"`]([^'"`]+)['"`]/;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.jsx')) continue;
  const lines = fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/);
  lines.forEach((l, i) => {
    if (re.test(l)) console.log(f + ':' + (i + 1) + ': ' + l.trim());
  });
}
