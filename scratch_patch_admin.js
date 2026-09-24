const fs = require('fs');
const file = 'app.js';
let text = fs.readFileSync(file, 'utf8');
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const anchor = 'app.use((req, res) => {' + eol + '  res.status(404).json({ error: \'not found\' });' + eol + '});';
if (!text.includes(anchor)) {
  console.error('ANCHOR NOT FOUND');
  process.exit(1);
}
if (text.includes('admin_routes')) {
  console.log('already patched');
  process.exit(0);
}
const insertion =
  '// ---------------------------------------------------------------------' + eol +
  '// ADMIN CONSOLE (read-only) - registered before the 404 catch-all' + eol +
  '// ---------------------------------------------------------------------' + eol +
  "require('./admin_routes')(app, pool);" + eol + eol +
  anchor;
text = text.replace(anchor, insertion);
fs.writeFileSync(file, text);
console.log('patched OK, eol=' + (eol === '\r\n' ? 'CRLF' : 'LF'));
