// verify_history_api.js - run the exact SQL used by /api/users/:userId/attempts
'use strict';
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});

(async () => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.test_id, a.status, a.started_at, a.submitted_at, a.total_marks,
              t.title AS test_title, t.duration_minutes,
              (SELECT COALESCE(SUM(q.positive_marks), 0)
                 FROM questions q
                 JOIN sections s ON s.id = q.section_id
                WHERE s.test_id = a.test_id) AS max_marks
         FROM attempts a
         JOIN tests t ON t.id = a.test_id
        WHERE a.user_id = $1
        ORDER BY a.started_at DESC
        LIMIT 5`,
      [1]
    );
    console.log(JSON.stringify(rows, null, 1));
    console.log('OK - history query works, rows:', rows.length);
  } catch (err) {
    console.error('ERR', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
