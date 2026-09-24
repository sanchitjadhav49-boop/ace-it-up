const fs = require('fs');
const text = fs.readFileSync('frontend/src/App.jsx', 'utf8');
const lines = text.split(/\r?\n/);
function dump(a, b) { for (let i = a - 1; i < Math.min(b, lines.length); i++) console.log((i + 1) + ': ' + lines[i]); }
// auth gate + nav
dump(160, 300);
