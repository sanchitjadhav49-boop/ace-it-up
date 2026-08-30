'use strict';
// One-off migration: add a 'visited' status to attempt_questions so the
// palette can show "Not Answered" (seen, no answer) separately from
// "Not Visited", matching the real JEE Main CBT palette.
// 1) Updates jee_mock_test_schema.sql (source of truth).
// 2) Applies the ALTERs to the live aceitup database.
const fs = require('fs');
const { Pool } = require('pg');

const SCHEMA = 'jee_mock_test_schema.sql';
const raw = fs.readFileSync(SCHEMA, 'utf8');
const crlf = raw.includes('\r\n');
const sql = raw.replace(/\r\n/g, '\n');

const pairs = [
  [
    "--   status: not_visited (never touched) / answered / marked_for_review.",
    "--   status: not_visited (never touched) / visited (seen, no answer) /\n--            answered / marked_for_review.",
  ],
  [
    "                       CHECK (status IN ('answered', 'marked_for_review', 'not_visited')),",
    "                       CHECK (status IN ('answered', 'marked_for_review', 'not_visited', 'visited')),",
  ],
  [
    "       count(*) FILTER (WHERE status = 'not_visited')       AS not_visited,\n       count(*) FILTER (WHERE status = 'answered')          AS answered,",
    "       count(*) FILTER (WHERE status = 'not_visited')       AS not_visited,\n       count(*) FILTER (WHERE status = 'visited')           AS not_answered,\n       count(*) FILTER (WHERE status = 'answered')          AS answered,",
  ],
];

for (const [oldStr] of pairs) {
  const n = sql.split(oldStr).length - 1;
  if (n !== 1) throw new Error(`pattern found ${n} times (expected 1): ${oldStr.slice(0, 60)}`);
}
const patched = pairs.reduce((acc, [oldStr, newStr]) => acc.replace(oldStr, newStr), sql);
fs.writeFileSync(SCHEMA, crlf ? patched.replace(/\n/g, '\r\n') : patched, 'utf8');
console.log('schema file updated');

(async () => {
  const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/aceitup' });
  await pool.query('ALTER TABLE attempt_questions DROP CONSTRAINT attempt_questions_status_check');
  await pool.query(`ALTER TABLE attempt_questions ADD CONSTRAINT attempt_questions_status_check
      CHECK (status IN ('answered', 'marked_for_review', 'not_visited', 'visited'))`);
  await pool.query(`CREATE OR REPLACE VIEW v_attempt_progress AS
      SELECT attempt_id,
             count(*) FILTER (WHERE status = 'not_visited')       AS not_visited,
             count(*) FILTER (WHERE status = 'visited')           AS not_answered,
             count(*) FILTER (WHERE status = 'answered')          AS answered,
             count(*) FILTER (WHERE status = 'marked_for_review') AS marked_for_review,
             count(*)                                             AS total
        FROM attempt_questions
       GROUP BY attempt_id`);
  const r = await pool.query(
    `SELECT conname, pg_get_constraintdef(oid) AS def
       FROM pg_constraint
      WHERE conrelid = 'attempt_questions'::regclass AND conname = 'attempt_questions_status_check'`
  );
  console.log('live DB constraint:', JSON.stringify(r.rows[0]));
  await pool.end();
})().catch((e) => { console.error('DB migration failed:', e.message); process.exit(1); });
