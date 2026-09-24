const fs = require('fs');

const target = 'frontend/src/App.jsx';
const src = fs.readFileSync(target, 'utf8');

const START = 'function Analysis({ result, onRetake, onBackHome, backLabel }) {';
const END_MARKER = '// ScoreSummary - one-page test score report';

if (src.includes('function Ta2Overview(')) {
  console.log('Already patched - aborting.');
  process.exit(0);
}

const start = src.indexOf(START);
if (start < 0) throw new Error('Analysis start marker not found');

const scoreMarker = src.indexOf(END_MARKER);
if (scoreMarker < 0) throw new Error('ScoreSummary marker not found');

const dashStart = src.lastIndexOf('// ---', scoreMarker);
if (dashStart < 0 || dashStart < start) throw new Error('separator before ScoreSummary not found');

let code = fs.readFileSync('new_analysis_code.txt', 'utf8').replace(/\r?\n/g, '\r\n');
if (!code.endsWith('\r\n')) code += '\r\n';

const next = src.slice(0, start) + code + src.slice(dashStart);

// safety checks
const mustHave = ['function Ta2Overview(', 'function Ta2ReviewPanel(', 'function Analysis(', 'function ScoreSummary(', 'function ReviewItem('];
for (const m of mustHave) {
  if (!next.includes(m)) throw new Error('missing after patch: ' + m);
}
if ((next.match(/function Analysis\(/g) || []).length !== 1) throw new Error('duplicate Analysis');
if (!next.includes('ta2-shell')) throw new Error('shell missing');

fs.writeFileSync(target, next, 'utf8');
console.log('patched App.jsx: ' + src.length + ' -> ' + next.length + ' chars');
