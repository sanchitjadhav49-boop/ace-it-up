'use strict';
const fs = require('fs');
const s = fs.readFileSync('frontend/src/App.jsx', 'utf8');

const checks = [
  ['inline timeAnalysis useMemo present', s.includes('const timeAnalysis = useMemo')],
  ['view state present', s.includes("const [view, setView] = useState('performance');")],
  ['navTabs defined', s.includes('const navTabs = (')],
  ['navTabs in main return', s.includes('{navTabs}')],
  ['navTabs above ScoreSummary', s.includes('<ScoreSummary')],
  ['navTabs above TimeAnalysis', s.includes('<TimeAnalysis')],
  ["Let's Do Analysis button intact", s.includes("Let&apos;s Do Analysis")],
  ['btn-time-analysis gone', !s.includes('btn-time-analysis')],
  ['inline Time Analysis section gone', !s.includes('<section style={{ marginTop: 24 }}>')],
  ['showTimeAnalysis gone', !s.includes('showTimeAnalysis')],
];
checks.forEach(([k, v]) => console.log((v ? 'PASS' : 'FAIL') + '  ' + k));

function cnt(n) { return s.split(n).length - 1; }
console.log('---');
console.log('navTabs mentions:', cnt('navTabs'));
console.log('TimeAnalysis renders:', cnt('<TimeAnalysis'));
