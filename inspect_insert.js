const fs = require('fs');
const s = fs.readFileSync('app.js','utf8');
const idx = s.indexOf('INSERT INTO error_tags');
console.log('idx', idx);
console.log(s.slice(idx-200, idx+200));
