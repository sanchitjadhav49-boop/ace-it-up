const { Pool } = require('pg');
async function probe(name, conn) {
  const pool = new Pool({ connectionString: conn, connectionTimeoutMillis: 3000 });
  try {
    const r = await pool.query('SELECT count(*)::int AS users FROM users');
    const t = await pool.query('SELECT count(*)::int AS tests FROM tests');
    const a = await pool.query('SELECT count(*)::int AS attempts FROM attempts');
    console.log(name, 'OK users=' + r.rows[0].users, 'tests=' + t.rows[0].tests, 'attempts=' + a.rows[0].attempts);
  } catch (e) {
    console.log(name, 'FAIL', e.message.split('\n')[0]);
  } finally {
    await pool.end().catch(() => {});
  }
}
(async () => {
  await probe('local ', 'postgres://postgres:postgres@localhost:5432/aceitup');
  await probe('local2', 'postgres://postgres:' + require('fs').readFileSync('pg_pw.txt', 'utf8').trim() + '@localhost:5432/aceitup');
})();
