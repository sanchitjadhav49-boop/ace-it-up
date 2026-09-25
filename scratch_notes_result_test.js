const { Pool } = require('pg');

const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/aceitup' });

async function main() {
  const { rows } = await pool.query(
    "SELECT id, user_id, test_id, status, submitted_at FROM attempts WHERE status = 'submitted' ORDER BY id DESC LIMIT 3"
  );
  if (rows.length === 0) {
    console.log('no submitted attempts in the database');
    return;
  }
  for (const a of rows) {
    const res = await fetch('http://localhost:3000/attempts/' + a.id + '/result');
    const body = await res.json().catch(() => ({}));
    const ok = Number(body.test_id) === Number(a.test_id);
    console.log(
      'attempt ' + a.id + ' -> HTTP ' + res.status +
      ' | test_id=' + body.test_id + ' expected=' + a.test_id + ' -> ' + (ok ? 'OK' : 'MISMATCH') +
      ' | title=' + body.title
    );
    // A note saved against that test must be readable for that user.
    const noteRes = await fetch('http://localhost:3000/api/users/' + a.user_id + '/notes/' + a.test_id);
    const noteBody = await noteRes.json().catch(() => ({}));
    console.log('   note lookup user ' + a.user_id + ' test ' + a.test_id + ' -> HTTP ' + noteRes.status);
  }
}

main()
  .catch((e) => { console.error('FAILED', e.message); process.exitCode = 1; })
  .finally(() => pool.end());
