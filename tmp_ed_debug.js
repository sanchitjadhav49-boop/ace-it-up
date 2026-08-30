'use strict';
// Debug the error-tags API: check table existence + try a real save.
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});

(async () => {
  // 1. does the table exist?
  const t = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'error_tags' ORDER BY ordinal_position`
  );
  console.log('error_tags columns:', JSON.stringify(t.rows));

  // 2. find one submitted attempt and one of its questions
  const a = await pool.query(
    `SELECT aq.attempt_id, aq.question_id
       FROM attempt_questions aq
       JOIN attempts a ON a.id = aq.attempt_id
      WHERE a.status = 'submitted'
      ORDER BY aq.attempt_id DESC
      LIMIT 1`
  );
  if (a.rows.length === 0) {
    console.log('no submitted attempts found');
    await pool.end();
    return;
  }
  const { attempt_id, question_id } = a.rows[0];
  console.log('using attempt', attempt_id, 'question', question_id);

  // 3. try the same INSERT the endpoint runs
  await pool.query(
    `INSERT INTO error_tags (attempt_id, question_id, error_tag, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (attempt_id, question_id) DO UPDATE
        SET error_tag = EXCLUDED.error_tag, updated_at = now()`,
    [attempt_id, question_id, 'concept']
  );
  console.log('direct INSERT ok');

  // 4. and the in-attempt check query
  const c = await pool.query(
    'SELECT 1 FROM attempt_questions WHERE attempt_id = $1 AND question_id = $2',
    [attempt_id, question_id]
  );
  console.log('in-attempt check rows:', c.rows.length);

  await pool.end();
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
