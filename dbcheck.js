'use strict';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/aceitup' });
(async () => {
  const t = await pool.query('SELECT id, title, is_published FROM tests ORDER BY id');
  console.log('TESTS:', JSON.stringify(t.rows));
  for (const r of t.rows) {
    const c = await pool.query('SELECT count(*) n FROM questions q JOIN sections s ON s.id=q.section_id WHERE s.test_id=$1', [r.id]);
    console.log('test', r.id, 'questions:', c.rows[0].n);
  }
  const a = await pool.query('SELECT id, user_id, test_id, status, started_at FROM attempts ORDER BY id');
  console.log('ATTEMPTS:', JSON.stringify(a.rows));
  const aq = await pool.query('SELECT attempt_id, count(*) n FROM attempt_questions GROUP BY attempt_id ORDER BY attempt_id');
  console.log('ATTEMPT_QUESTIONS:', JSON.stringify(aq.rows));
  await pool.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
