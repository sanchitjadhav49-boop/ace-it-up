'use strict';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/aceitup' });
(async () => {
  const t = await pool.query(`SELECT t.id, t.title, count(q.id) n FROM tests t
    JOIN sections s ON s.test_id = t.id JOIN questions q ON q.section_id = s.id
    GROUP BY t.id ORDER BY t.id`);
  for (const r of t.rows) console.log(JSON.stringify(r));
  const m2 = await pool.query(`SELECT q.body FROM questions q JOIN sections s ON s.id=q.section_id
    WHERE s.test_id=4 ORDER BY q.id LIMIT 3`);
  console.log('Mock2 sample bodies:', JSON.stringify(m2.rows));
  const m1 = await pool.query(`SELECT q.body FROM questions q JOIN sections s ON s.id=q.section_id
    WHERE s.test_id=2 ORDER BY q.id LIMIT 3`);
  console.log('Mock1 sample bodies:', JSON.stringify(m1.rows));
  await pool.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
