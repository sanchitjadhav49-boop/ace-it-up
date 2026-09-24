// End-to-end tests for the admin API endpoints against the local test server.
const BASE = 'http://localhost:3101';
const ADMIN = '/api/admin';

let passed = 0;
let failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (extra ? ' :: ' + extra : '')); }
}

async function req(path, opts) {
  const res = await fetch(BASE + path, opts);
  let body = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) body = await res.json().catch(() => null);
  else body = await res.text().catch(() => null);
  return { status: res.status, body, headers: res.headers };
}

async function main() {
  // 1. endpoints reject anonymous callers (401) and disabled state is gone
  let r = await req(ADMIN + '/overview');
  check('overview without token -> 401', r.status === 401, r.status);

  // 2. wrong password -> 401
  r = await req(ADMIN + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'wrong' }) });
  check('login wrong password -> 401', r.status === 401, r.status);

  // 3. correct password -> token
  r = await req(ADMIN + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'test-password-123' }) });
  check('login correct -> 200 + token', r.status === 200 && r.body && r.body.token, r.status);
  if (r.status !== 200) { console.log('FATAL: login failed, aborting'); process.exit(1); }
  const token = r.body.token;
  const auth = { Authorization: 'Bearer ' + token };

  // 4. overview
  r = await req(ADMIN + '/overview', { headers: auth });
  check('overview -> 200', r.status === 200, r.status);
  if (r.status === 200) {
    const o = r.body;
    check('overview.users.total is a number', typeof o.users.total === 'number');
    check('overview.attempts.total >= 0', o.attempts.total >= 0);
    check('overview.tests.total >= 0', o.tests.total >= 0);
    check('overview.trend has 14 days', Array.isArray(o.trend) && o.trend.length === 14);
    check('overview.recent_signups array', Array.isArray(o.recent_signups));
    check('overview.recent_attempts array', Array.isArray(o.recent_attempts));
  }

  // 5. users list + search
  r = await req(ADMIN + '/users?limit=10', { headers: auth });
  check('users -> 200', r.status === 200, r.status);
  const users = r.status === 200 ? (r.body.users || []) : [];
  check('users array non-empty', Array.isArray(users) && users.length > 0, String(users.length));
  const someUser = users[0];
  if (someUser) {
    check('user has email', !!someUser.email);
    r = await req(ADMIN + '/users?q=' + encodeURIComponent(someUser.email.slice(0, 6)), { headers: auth });
    check('users search finds the user', r.status === 200 && (r.body.users || []).some((u) => u.id === someUser.id));
  }

  // 6. user detail + attempts history
  if (someUser) {
    r = await req(ADMIN + '/users/' + someUser.id, { headers: auth });
    check('user detail -> 200', r.status === 200, r.status);
    if (r.status === 200) {
      check('user detail.user.email matches', r.body.user.email === someUser.email);
      check('user detail.attempts is array', Array.isArray(r.body.attempts));
    }
    r = await req(ADMIN + '/users/99999999', { headers: auth });
    check('user detail unknown -> 404', r.status === 404, r.status);
    r = await req(ADMIN + '/users/abc', { headers: auth });
    check('user detail bad id -> 400', r.status === 400, r.status);
  }

  // 7. attempts list + filters
  r = await req(ADMIN + '/attempts?limit=5', { headers: auth });
  check('attempts -> 200', r.status === 200, r.status);
  const attempts = r.status === 200 ? (r.body.attempts || []) : [];
  check('attempts array non-empty', Array.isArray(attempts) && attempts.length > 0, String(attempts.length));
  if (r.status === 200) {
    check('attempts.total matches >= shown', r.body.total >= attempts.length);
    const first = attempts[0];
    if (first) {
      check('attempt row has student+test', !!first.full_name && !!first.test_title);
      r = await req(ADMIN + '/attempts?status=submitted&limit=3', { headers: auth });
      check('attempts filtered by status', r.status === 200 && (r.body.attempts || []).every((a) => a.status === 'submitted'));
      if (first.test_id) {
        r = await req(ADMIN + '/attempts?test_id=' + first.test_id + '&limit=3', { headers: auth });
        check('attempts filtered by test_id', r.status === 200 && (r.body.attempts || []).every((a) => a.test_id === first.test_id));
      }
    }
  }

  // 8. tests analytics
  r = await req(ADMIN + '/tests', { headers: auth });
  check('tests -> 200', r.status === 200, r.status);
  const tests = r.status === 200 ? (r.body.tests || []) : [];
  check('tests array non-empty', Array.isArray(tests) && tests.length > 0, String(tests.length));
  const someTest = tests[0];
  if (someTest) {
    check('test row has max_marks', typeof someTest.max_marks === 'number' && someTest.max_marks > 0);
  }

  // 9. CSV exports (BOM is char code 65279 before the header)
  r = await req(ADMIN + '/export/users.csv', { headers: auth });
  check('users.csv -> 200 text/csv', r.status === 200 && (r.headers.get('content-type') || '').includes('text/csv'), r.status + ' ' + (r.headers.get('content-type') || ''));
  if (r.status === 200) {
    const csv = String(r.body);
    const firstLine = csv.split(/\r?\n/)[0].replace(/^\uFEFF/, '');
    check('users.csv header: id,full_name,email,signed_up_at,...', firstLine.startsWith('id,full_name,email,signed_up_at'), firstLine.slice(0, 60));
    check('users.csv has >1 line', csv.split(/\r?\n/).length > 1);
  }
  if (someTest) {
    r = await req(ADMIN + '/export/attempts.csv?test_id=' + someTest.id, { headers: auth });
    check('attempts.csv?test_id -> 200 csv', r.status === 200 && (r.headers.get('content-type') || '').includes('text/csv'), r.status);
  }
  r = await req(ADMIN + '/export/attempts.csv', { headers: auth });
  check('attempts.csv (all) -> 200 csv', r.status === 200 && (r.headers.get('content-type') || '').includes('text/csv'), r.status);

  // 10. logout invalidates token
  r = await req(ADMIN + '/logout', { method: 'POST', headers: auth });
  check('logout -> 200', r.status === 200);
  r = await req(ADMIN + '/overview', { headers: auth });
  check('overview after logout -> 401', r.status === 401, r.status);

  // 11. login with empty password field -> 401 (no crash)
  r = await req(ADMIN + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
  check('login empty -> 401', r.status === 401, r.status);

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('ERROR', e);
  process.exit(1);
});