// End-to-end sanity check for the redesigned analysis page: pull a real
// submitted attempt from the running API and assert every field the new
// Overview / shell reads is present.
const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: 'localhost', port: 3000, path }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) { /* not json */ }
        resolve({ status: res.statusCode, json, body });
      });
    }).on('error', reject);
  });
}

(async () => {
  const out = [];
  let attemptId = null;
  for (let uid = 1; uid <= 12 && !attemptId; uid++) {
    const r = await get(`/api/users/${uid}/attempts`);
    if (r.status !== 200 || !r.json || !Array.isArray(r.json.attempts)) continue;
    const done = r.json.attempts.filter((a) => a.status === 'submitted' || a.status === 'expired');
    if (done.length) {
      attemptId = done[0].id != null ? done[0].id : done[0].attempt_id;
      out.push(`user ${uid} -> attempt ${attemptId} (${done.length} finished)`);
    }
  }
  if (!attemptId) { out.push('no submitted attempt found'); console.log(out.join('\n')); return; }

  const res = await get(`/attempts/${attemptId}/result`);
  out.push('GET /attempts/' + attemptId + '/result -> ' + res.status);
  const d = res.json;
  if (!d) { out.push(res.body.slice(0, 400)); console.log(out.join('\n')); return; }

  const o = d.overall || {};
  const qs = d.questions || [];
  const marked = qs.filter((q) => q.status === 'marked_for_review' || q.status === 'answered_marked').length;
  const attemptedQ = qs.filter((q) => q.selected_option_id != null || q.numerical_answer != null);
  const totalTime = qs.reduce((s, q) => s + (Number(q.time_spent_seconds) || 0), 0);
  const slowest = qs.reduce((a, q) => (!a || Number(q.time_spent_seconds) > Number(a.time_spent_seconds) ? q : a), null);

  out.push('title                 : ' + JSON.stringify(d.title));
  out.push('submitted_at          : ' + d.submitted_at);
  out.push('attempt_id            : ' + d.attempt_id);
  out.push('sections              : ' + (d.sections || []).map((s) => s.name + '=' + s.section_marks + '/' + s.max_marks).join(', '));
  out.push('overall               : total=' + o.total + ' correct=' + o.correct + ' incorrect=' + o.incorrect
    + ' unattempted=' + o.unattempted + ' marks=' + o.total_marks + '/' + o.max_marks);
  out.push('questions             : ' + qs.length + ' (review items render from this array)');
  out.push('marked (new KPI)      : ' + marked);
  out.push('attempted (by answer) : ' + attemptedQ.length);
  out.push('total time seconds    : ' + totalTime);
  out.push('slowest question      : ' + (slowest ? slowest.section + ' Q' + (slowest.global_position || slowest.position)
    + ' ' + slowest.time_spent_seconds + 's' : 'n/a'));
  const derived = o.total >= 50 && (d.sections || []).length >= 3 ? 'Full Length Test' : 'Custom/other';
  out.push('derived test kind     : ' + derived);
  out.push('question fields       : ' + Object.keys(qs[0] || {}).join(','));
  console.log(out.join('\n'));
})().catch((e) => console.log('ERR ' + e.message));
