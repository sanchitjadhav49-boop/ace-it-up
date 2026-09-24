// Probe every GET endpoint per attempt on the deployed API to find the 500.
const BASE = process.env.API_BASE || 'https://ace-it-up-6uas.onrender.com';

async function hit(path) {
  const url = BASE + path;
  try {
    const res = await fetch(url);
    const text = await res.text();
    const short = text.length > 400 ? text.slice(0, 400) + '...' : text;
    console.log(String(res.status).padEnd(4), path, '->', short.replace(/\s+/g, ' '));
    try { return JSON.parse(text); } catch (e) { return null; }
  } catch (e) {
    console.log('ERR ', path, e.message);
    return null;
  }
}

async function main() {
  const ids = new Set();
  for (const uid of [1, 2, 3, 4]) {
    const list = await hit('/api/users/' + uid + '/attempts?limit=50');
    if (list && Array.isArray(list.attempts)) {
      for (const a of list.attempts) ids.add(String(a.id));
    }
  }
  console.log('attempt ids:', [...ids].join(','));
  for (const id of ids) {
    await hit('/attempts/' + id);
    await hit('/attempts/' + id + '/result');
    await hit('/attempts/' + id + '/error-tags');
    await hit('/api/attempts/' + id + '/time-analysis');
    await hit('/api/attempts/' + id + '/time-intervals');
    await hit('/api/attempts/' + id + '/journey');
  }
}

main().catch((e) => console.error('FATAL', e));
