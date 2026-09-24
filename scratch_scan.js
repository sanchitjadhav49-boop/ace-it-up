const fs = require('fs');
const text = fs.readFileSync('frontend/src/App.jsx', 'utf8');
const lines = text.split(/\r?\n/);
const pats = [
  /phase ===|setPhase\(|setView\(|const \[phase|view ===|const API|API_BASE|apiBase|sessionStorage|localStorage|fetch\(['"]\/api|fetch\(['"]\//,
  /['"]login['"]|['"]signup['"]|['"]home['"]|['"]history['"]|['"]analysis['"]|['"]real_papers['"]|['"]difficulty['"]|['"]select_test['"]|['"]exam['"]|['"]result['"]/
];
lines.forEach((l, i) => {
  if (pats.some(p => p.test(l))) console.log((i + 1) + ': ' + l.trim().slice(0, 220));
});
