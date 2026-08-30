'use strict';
// Throwaway e2e smoke test: spawns app.js on a random port, exercises the
// full exam flow (list -> start -> fetch -> save answers -> submit -> result).
const { spawn } = require('child_process');

const PORT = 3199;
const BASE = `http://localhost:${PORT}`;

const server = spawn(process.execPath, ['app.js'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));

async function api(path, opts) {
  const res = await fetch(BASE + path, opts);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(BASE + '/tests');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error('server did not start; log:\n' + serverLog);
}

(async () => {
  try {
    await waitForServer();

    // 1. list tests
    const list = await api('/tests');
    console.log('GET /tests ->', list.status, list.body.map((t) => `${t.id}:${t.title} (${t.duration_minutes}min)`));

    // 2. fetch full-length test
    const test = await api('/tests/4');
    console.log('GET /tests/4 ->', test.status, 'sections:', test.body.sections.map((s) => `${s.name}:${s.questions.length}q`).join(', '));
    const leak = JSON.stringify(test.body).match(/correct_option_id|correct_answer/);
    if (leak) throw new Error('ANSWER LEAK in GET /tests/:id: ' + leak[0]);
    console.log('  no answer leak in test payload: OK');

    // collect mcq + numerical ids
    const all = test.body.sections.flatMap((s) => s.questions);
    const mcqs = all.filter((q) => q.question_type === 'mcq');
    const nums = all.filter((q) => q.question_type === 'numerical');
    console.log('  mcq:', mcqs.length, 'numerical:', nums.length, 'options per mcq ok:',
      mcqs.every((q) => q.options.length === 4));

    // 3. start an attempt (user 1 = demo@aceitup.local; no in-progress attempt on test 4)
    const start = await api('/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 1, test_id: 4 }),
    });
    console.log('POST /attempts ->', start.status, start.body);
    if (start.status !== 201) throw new Error('could not start attempt');
    const attemptId = start.body.attempt_id;

    // 4. fetch attempt (resume)
    const resume = await api(`/attempts/${attemptId}`);
    console.log('GET /attempts/:id ->', resume.status, 'questions:', resume.body.test.sections.reduce((n, s) => n + s.questions.length, 0));
    if (JSON.stringify(resume.body).match(/correct_option_id|correct_answer/)) throw new Error('ANSWER LEAK in attempt payload');

    // 5. save some answers live
    const save1 = await api(`/attempts/${attemptId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: mcqs[0].id, selected_option_id: mcqs[0].options[0].id, status: 'answered' }),
    });
    const save2 = await api(`/attempts/${attemptId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: nums[0].id, numerical_value: 42, status: 'marked_for_review' }),
    });
    console.log('POST answer mcq ->', save1.status, '| answer numerical ->', save2.status);

    // 6. submit with a mixed answer sheet (1 correct mcq, 1 wrong, rest unattempted)
    const answers = [
      { question_id: mcqs[0].id, selected_option_id: mcqs[0].options[0].id },
      { question_id: mcqs[1].id, selected_option_id: mcqs[1].options[1].id },
      { question_id: nums[0].id, numerical_value: 123 },
    ];
    const submit = await api(`/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    console.log('POST submit ->', submit.status, submit.body);

    // 7. result review
    const result = await api(`/attempts/${attemptId}/result`);
    console.log('GET result ->', result.status, 'overall:', JSON.stringify(result.body.overall));
    console.log('  sections:', result.body.sections.map((s) => `${s.name}:${s.correct_count}/${s.question_count}`).join(', '));
    const withAnswers = result.body.questions.filter((q) => q.correct_option_id != null || q.correct_answer != null);
    console.log('  review reveals answers for', withAnswers.length, 'of', result.body.questions.length, 'questions');
    if (withAnswers.length !== result.body.questions.length) throw new Error('result review missing correct answers');

    // 8. resubmit should 409
    const resubmit = await api(`/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: [] }),
    });
    console.log('resubmit ->', resubmit.status, '(expect 409)');
    if (resubmit.status !== 409) throw new Error('expected 409 on resubmit');

    // 9. in-progress result should 409
    const start2 = await api('/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 1, test_id: 4 }),
    });
    const result2 = await api(`/attempts/${start2.body.attempt_id}/result`);
    console.log('result of in-progress attempt ->', result2.status, '(expect 409)');

    console.log('\nALL SMOKE TESTS PASSED');
  } catch (err) {
    console.error('\nSMOKE TEST FAILED:', err.message);
    console.error('server log:\n', serverLog);
    process.exitCode = 1;
  } finally {
    server.kill();
  }
})();
