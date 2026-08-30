'use strict';
const fs = require('fs');
const s = fs.readFileSync('frontend/src/App.jsx', 'utf8');

const out = [];
out.push('import TimeAnalysis: ' + s.includes("import TimeAnalysis from './TimeAnalysis.jsx';"));
out.push('showTimeAnalysis state: ' + s.includes('const [showTimeAnalysis, setShowTimeAnalysis] = useState(false);'));
out.push('if (showTimeAnalysis) block: ' + s.includes('if (showTimeAnalysis) {'));
out.push('TimeAnalysis render: ' + s.includes('<TimeAnalysis result={result} onBack={() => setShowTimeAnalysis(false)} />'));
out.push('btn-time-analysis: ' + s.includes('btn-time-analysis'));

function cnt(needle) { return s.split(needle).length - 1; }
out.push('--- occurrence counts ---');
out.push('TimeAnalysis mention: ' + cnt('TimeAnalysis'));
out.push('showTimeAnalysis mention: ' + cnt('showTimeAnalysis'));
out.push('btn-time-analysis: ' + cnt('btn-time-analysis'));

const i1 = s.indexOf("import TimeAnalysis from './TimeAnalysis.jsx';");
out.push('--- IMPORT ---');
out.push(s.slice(i1 - 70, i1 + 60));

const i2 = s.indexOf('const [showTimeAnalysis');
out.push('--- STATE ---');
out.push(s.slice(i2 - 60, i2 + 90));

const i3 = s.indexOf('if (showTimeAnalysis)');
out.push('--- RENDER BLOCK ---');
out.push(s.slice(i3, i3 + 220));

const i4 = s.indexOf('btn-time-analysis');
out.push('--- BUTTON ---');
out.push(s.slice(i4 - 140, i4 + 140));

process.stdout.write(out.join('\r\n'));
