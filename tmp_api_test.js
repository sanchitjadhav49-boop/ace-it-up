'use strict';
(async () => {
  // GET (should be empty tags initially)
  const get1 = await fetch('http://localhost:3000/attempts/104/error-tags');
  console.log('GET status:', get1.status, '->', await get1.text());
  // POST a couple of tags
  const post = await fetch('http://localhost:3000/attempts/104/error-tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags: { 1: 'concept', 2: 'silly', 3: 'correct' } }),
  });
  console.log('POST status:', post.status, '->', await post.text());
  // GET again
  const get2 = await fetch('http://localhost:3000/attempts/104/error-tags');
  console.log('GET status:', get2.status, '->', await get2.text());
  // invalid tag
  const bad = await fetch('http://localhost:3000/attempts/104/error-tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_id: 4, error_tag: 'bogus' }),
  });
  console.log('BAD status:', bad.status, '->', await bad.text());
  // unknown attempt
  const nf = await fetch('http://localhost:3000/attempts/999999/error-tags');
  console.log('NF status:', nf.status, '->', await nf.text());
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
