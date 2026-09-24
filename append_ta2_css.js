const fs = require('fs');

const target = 'frontend/src/exam.css';
const partPath = 'new_analysis.css.part';

const src = fs.readFileSync(target, 'utf8');
if (src.includes('TEST ANALYSIS  (redesigned performance analysis workspace, .ta2-*)')) {
  console.log('CSS block already present - nothing appended.');
  process.exit(0);
}
const crlf = src.includes('\r\n');
let block = fs.readFileSync(partPath, 'utf8');
block = block.replace(/\r?\n/g, '\n');
if (crlf) block = block.replace(/\n/g, '\r\n');

const out = src.replace(/\s*$/, '\r\n'.repeat(1) + (crlf ? '' : '')) + block;
fs.writeFileSync(target, out, 'utf8');
console.log('appended', block.length, 'chars; css now', out.length, 'chars; crlf=' + crlf);
