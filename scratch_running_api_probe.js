'use strict';
// scratch: does the ALREADY-RUNNING API on port 3000 return topic/subtopic?
const http = require('http');

function get(port, path) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path, timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', (e) => resolve({ status: 0, body: 'ERR:' + e.code }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'timeout' }); });
  });
}

(async () => {
  const res = await get(3000, '/attempts/123/result');
  console.log('HTTP', res.status);
  if (res.status !== 200) {
    console.log('body:', String(res.body).slice(0, 300));
    return;
  }
  const json = JSON.parse(res.body);
  const q = (json.questions || [])[0] || {};
  console.log('has topic field:', Object.prototype.hasOwnProperty.call(q, 'topic'));
  console.log('topic =', q.topic, '| subtopic =', q.subtopic);
  console.log('tagged:', (json.questions || []).filter((x) => x.topic).length, '/', (json.questions || []).length);
})();
