'use strict';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup' });
(async () => {
  const res = await pool.query(
    `SELECT a.id AS attempt_id, a.status, a.test_id,
            (SELECT count(*) FROM attempt_questions aq WHERE aq.attempt_id = a.id) AS q_count
       FROM attempts a ORDER BY a.id DESC LIMIT 3`
  );
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
