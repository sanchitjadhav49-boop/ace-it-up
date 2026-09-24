const fs = require('fs');
const { Pool } = require('pg');

const pw = fs.existsSync('pg_pw.txt') ? fs.readFileSync('pg_pw.txt', 'utf8').trim() : '';
const candidates = [];
if (pw) candidates.push(['local postgres/' + pw, `postgres://postgres:${encodeURIComponent(pw)}@localhost:5432/aceitup`]);
candidates.push(['local postgres/postgres', 'postgres://postgres:postgres@localhost:5432/aceitup']);

// Any file that looks like a full connection string / neon host
for (const f of fs.readdirSync('.')) {
  if (!/\.txt$/i.test(f)) continue;
  let content = '';
  try { content = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
  const m = content.match(/postgres(?:ql)?:\/\/[^\s"']+/g);
  if (m) for (const s of m) candidates.push(['file:' + f, s]);
}

(async () => {
  for (const [label, cs] of candidates) {
    const pool = new Pool({ connectionString: cs, connectionTimeoutMillis: 6000, ssl: /neon|render|sslmode=require/i.test(cs) ? { rejectUnauthorized: false } : false });
    try {
      const r = await pool.query('select count(*)::int as n from users');
      const t = await pool.query('select count(*)::int as n from tests');
      console.log('OK  ', label, 'users=' + r.rows[0].n, 'tests=' + t.rows[0].n);
    } catch (e) {
      console.log('FAIL', label, e.code || '', String(e.message).slice(0, 140));
    }
    await pool.end().catch(() => {});
  }
})();
