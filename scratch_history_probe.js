// scratch_history_probe.js - list users with attempts so the redesigned
// History page can be eyeballed with real data.
const { Pool } = require('pg');

const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/aceitup' });

(async () => {
  const r = await pool.query(
    `SELECT a.user_id, count(*) AS n, string_agg(DISTINCT a.status, ',') AS statuses
       FROM attempts a
      GROUP BY a.user_id
      ORDER BY n DESC`
  );
  console.table(r.rows);

  const top = r.rows[0];
  if (top) {
    const d = await pool.query(
      `SELECT a.id, a.test_id, a.status, a.total_marks, a.started_at, a.submitted_at,
              t.title, t.duration_minutes
         FROM attempts a JOIN tests t ON t.id = a.test_id
        WHERE a.user_id = $1
        ORDER BY a.started_at DESC LIMIT 12`,
      [top.user_id]
    );
    console.table(d.rows);
  }
  await pool.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
