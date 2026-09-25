const fs = require('fs');

const BASE = 'http://localhost:3000';

async function req(path, options) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const out = [];

  const health = await req('/api/health');
  out.push('GET /api/health -> ' + health.status + ' ' + JSON.stringify(health.body));

  // Pick a real user + test from the catalogue.
  const tests = await req('/tests');
  out.push('GET /tests -> ' + tests.status + ' (' + (tests.body.length || 0) + ' tests)');
  const test = tests.body[0];
  if (!test) throw new Error('no published tests');

  // users are not exposed by an endpoint; read one from the DB via the notes
  // route of a known id: try 1..8 and keep the first that answers.
  let userId = null;
  for (const candidate of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const r = await req('/api/users/' + candidate + '/notes');
    if (r.status === 200) { userId = candidate; break; }
    out.push('  user ' + candidate + ' -> ' + r.status + ' ' + JSON.stringify(r.body));
  }
  if (userId == null) throw new Error('no usable user id found');
  out.push('using user_id=' + userId + ', test_id=' + test.id + ' (' + test.title + ')');

  // 1. empty note for that test
  const empty = await req('/api/users/' + userId + '/notes/' + test.id);
  out.push('GET  note (before)  -> ' + empty.status + ' ' + JSON.stringify(empty.body));

  // 2. save a note
  const content = 'TEST RUN ' + new Date().toISOString() + '\n- Q12 Physics: rushed the rotation formula\n- Learnt: write torque balance first';
  const saved = await req('/api/users/' + userId + '/notes', {
    method: 'POST',
    body: JSON.stringify({ test_id: Number(test.id), content }),
  });
  out.push('POST note           -> ' + saved.status + ' ' + JSON.stringify(saved.body).slice(0, 220));

  // 3. read it back
  const read = await req('/api/users/' + userId + '/notes/' + test.id);
  out.push('GET  note (after)   -> ' + read.status + ' matches=' + (read.body.note && read.body.note.content === content));

  // 4. it must appear in the list
  const list = await req('/api/users/' + userId + '/notes');
  const inList = (list.body.notes || []).filter((n) => Number(n.test_id) === Number(test.id));
  out.push('GET  all notes      -> ' + list.status + ' count=' + (list.body.notes || []).length + ' containsTest=' + (inList.length === 1) + ' title=' + (inList[0] && inList[0].test_title));

  // 5. update (upsert) keeps one row
  const updated = await req('/api/users/' + userId + '/notes', {
    method: 'POST',
    body: JSON.stringify({ test_id: Number(test.id), content: content + '\n- Revise: moment of inertia' }),
  });
  const list2 = await req('/api/users/' + userId + '/notes');
  out.push('POST note (update)  -> ' + updated.status + ' stillOneRow=' + ((list2.body.notes || []).filter((n) => Number(n.test_id) === Number(test.id)).length === 1));

  // 6. the analysis payload must expose test_id (notes are keyed by test)
  const attempts = await req('/api/users/' + userId + '/attempts');
  const submitted = (attempts.body.attempts || []).find((a) => a.status === 'submitted');
  if (submitted) {
    const result = await req('/attempts/' + submitted.id + '/result');
    out.push('GET  result         -> ' + result.status + ' test_id=' + result.body.test_id + ' title=' + result.body.title);
  } else {
    out.push('GET  result         -> skipped (no submitted attempt for this user)');
  }

  // 7. the third argument (content) is required
  const bad = await req('/api/users/' + userId + '/notes', {
    method: 'POST',
    body: JSON.stringify({ test_id: Number(test.id) }),
  });
  out.push('POST note (no body) -> ' + bad.status + ' ' + JSON.stringify(bad.body));

  // 8. unknown user -> clean 404, not a 500
  const ghost = await req('/api/users/99999/notes');
  out.push('GET  ghost user     -> ' + ghost.status + ' ' + JSON.stringify(ghost.body));

  // 9. delete the test note
  const del = await req('/api/users/' + userId + '/notes/' + test.id);
  const removed = await req('/api/users/' + userId + '/notes/' + test.id, { method: 'DELETE' });
  out.push('DELETE note         -> ' + removed.status + ' ' + JSON.stringify(removed.body));

  fs.writeFileSync('scratch_notes_verify.txt', out.join('\n'));
  console.log(out.join('\n'));
}

main().catch((err) => {
  fs.writeFileSync('scratch_notes_verify.txt', 'FAILED: ' + err.message);
  console.error('FAILED:', err.message);
  process.exit(1);
});
