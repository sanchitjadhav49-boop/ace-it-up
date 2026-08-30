'use strict';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/aceitup' });
(async () => {
  const t = await pool.query('SELECT id, title, is_published FROM tests ORDER BY id');
  console.log('TESTS:');
  for (const r of t.rows) console.log(JSON.stringify(r));
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='questions' ORDER BY ordinal_position");
  console.log('questions cols:', cols.rows.map(x => x.column_name).join(', '));
  const a = await pool.query('SELECT id, user_id, test_id, status, started_at FROM attempts ORDER BY id');
  console.log('ATTEMPTS:', JSON.stringify(a.rows));
  await pool.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
