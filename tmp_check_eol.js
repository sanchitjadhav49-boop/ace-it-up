const fs = require('fs');
const s = fs.readFileSync('jee_mock_test_schema.sql', 'utf8');
console.log('len', s.length);
console.log('CRLF count', (s.match(/\r\n/g) || []).length);
console.log('bare LF count', (s.match(/\n/g) || []).length - (s.match(/\r\n/g) || []).length);
const i = s.indexOf('-- INDEXES');
console.log('INDEXES idx', i);
if (i > 0) console.log(JSON.stringify(s.slice(i - 80, i + 20)));
