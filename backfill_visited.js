'use strict';
// Backfill: mark attempt_questions as 'visited' when they were actually seen
// (accumulated time > 0) but never answered. This makes resumed attempts show
// grey "Not Answered" palette entries instead of white "Not Visited".
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/aceitup' });
  const res = await pool.query(
    `UPDATE attempt_questions
        SET status = 'visited'
      WHERE status = 'not_visited'
        AND time_spent_seconds > 0`
  );
  console.log(`backfilled ${res.rowCount} question(s) to status 'visited'`);
  await pool.end();
})().catch((e) => { console.error('backfill failed:', e.message); process.exit(1); });
