'use strict';
const fs = require('fs');
const s = fs.readFileSync('frontend/src/App.jsx', 'utf8');
const start = s.indexOf('function Analysis(');
const end = s.indexOf('function ScoreSummary(');
const region = s.slice(start, end);
const lines = region.split('\r\n');
lines.forEach((l, i) => console.log(String(i + 1).padStart(4) + '|' + l));
