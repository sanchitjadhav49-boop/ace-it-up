'use strict';

// patch_notes_api.js -- makes the per-test Notes feature actually work on the
// server side:
//   1. creates the `notes` table on boot (idempotent) so databases where the
//      table was never migrated stop failing with
//      "relation notes does not exist"
//   2. validates that the user (and test) really exist, returning clean 404s
//      instead of a 500 from a foreign-key violation
//   3. exposes `test_id` in GET /attempts/:id/result so the analysis page can
//      save a note against the test that was just attempted
//
// app.js uses CRLF line endings, so every needle below is written with plain
// \n and converted to the file's own line endings before matching.
//
// Run once:  node patch_notes_api.js

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'app.js');
let src = fs.readFileSync(FILE, 'utf8');
const before = src;

const crlf = (text) => text.replace(/\n/g, '\r\n');

function patch(needle, replacement, label, expected) {
  const want = expected === undefined ? 1 : expected;
  const rx = new RegExp(crlf(needle).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const hits = src.split(crlf(needle)).length - 1;
  if (hits !== want) {
    throw new Error(`expected ${want} occurrence(s) of ${label}, found ${hits}`);
  }
  src = src.replace(rx, () => crlf(replacement));
}

// ---------------------------------------------------------------------------
// 1. ensureNotesTable() + requireUser(), placed above the notes API section.
//    (the section header contains a non-ASCII dash in the existing file, so it
//    is anchored on the two following lines instead)
// ---------------------------------------------------------------------------
patch(
  `//   One note per (user, test), updated over time across retakes.
// ---------------------------------------------------------------------------
`,
  `//   One note per (user, test), updated over time across retakes.
// ---------------------------------------------------------------------------

const NOTES_DDL =
  'CREATE TABLE IF NOT EXISTS notes (' +
  '  id BIGSERIAL PRIMARY KEY,' +
  '  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,' +
  '  test_id BIGINT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,' +
  "  content TEXT NOT NULL DEFAULT ''," +
  '  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),' +
  '  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),' +
  '  UNIQUE (user_id, test_id)' +
  ')';

// The notes table is declared in jee_mock_test_schema.sql, but databases
// created before that block existed do not have it - every notes call used to
// die with 'relation "notes" does not exist'. Create it lazily and on boot.
async function ensureNotesTable() {
  await pool.query(NOTES_DDL);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notes_user ON notes (user_id)').catch(() => {});
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notes_test ON notes (test_id)').catch(() => {});
}

async function requireUser(userId) {
  const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  if (rows.length === 0) throw new ApiError(404, 'user not found');
}
`,
  'notes section helpers'
);

// ---------------------------------------------------------------------------
// 2. GET all notes: table + user guard
// ---------------------------------------------------------------------------
patch(
  `app.get('/api/users/:userId/notes', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) throw new ApiError(400, 'invalid user id');

    const { rows } = await pool.query(`,
  `app.get('/api/users/:userId/notes', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) throw new ApiError(400, 'invalid user id');
    await ensureNotesTable();
    await requireUser(userId);

    const { rows } = await pool.query(`,
  'GET /api/users/:userId/notes'
);

// ---------------------------------------------------------------------------
// 3. GET one note: table + user guard
// ---------------------------------------------------------------------------
patch(
  `    if (!Number.isInteger(userId) || !Number.isInteger(testId)) {
      throw new ApiError(400, 'invalid user id or test id');
    }

    const { rows } = await pool.query(
      \`SELECT n.id, n.user_id, n.test_id, n.content, n.created_at, n.updated_at,
              t.title AS test_title, t.description AS test_description
         FROM notes n
         JOIN tests t ON t.id = n.test_id
        WHERE n.user_id = $1 AND n.test_id = $2\`,`,
  `    if (!Number.isInteger(userId) || !Number.isInteger(testId)) {
      throw new ApiError(400, 'invalid user id or test id');
    }
    await ensureNotesTable();
    await requireUser(userId);

    const { rows } = await pool.query(
      \`SELECT n.id, n.user_id, n.test_id, n.content, n.created_at, n.updated_at,
              t.title AS test_title, t.description AS test_description
         FROM notes n
         JOIN tests t ON t.id = n.test_id
        WHERE n.user_id = $1 AND n.test_id = $2\`,`,
  'GET /api/users/:userId/notes/:testId'
);

// ---------------------------------------------------------------------------
// 4. POST upsert: table + user guards, length cap, coerce the test id
// ---------------------------------------------------------------------------
patch(
  `    const { test_id: testId, content } = req.body || {};
    if (!Number.isInteger(testId)) throw new ApiError(400, 'test_id (integer) is required');
    if (typeof content !== 'string') throw new ApiError(400, 'content must be a string');

    await client.query('BEGIN');

    // Verify test exists
    const testRes = await client.query('SELECT id FROM tests WHERE id = $1', [testId]);
    if (testRes.rows.length === 0) throw new ApiError(404, 'test not found');`,
  `    const body = req.body || {};
    const testId = Number(body.test_id);
    const content = body.content;
    if (!Number.isInteger(testId)) throw new ApiError(400, 'test_id (integer) is required');
    if (typeof content !== 'string') throw new ApiError(400, 'content must be a string');
    if (content.length > 20000) throw new ApiError(400, 'note is too long (max 20000 characters)');

    await ensureNotesTable();
    await requireUser(userId);

    await client.query('BEGIN');

    // Verify test exists
    const testRes = await client.query('SELECT id FROM tests WHERE id = $1', [testId]);
    if (testRes.rows.length === 0) throw new ApiError(404, 'test not found');`,
  'POST /api/users/:userId/notes body handling'
);

// Return the test title with the saved note so the UI can label it at once.
patch(
  `    await client.query('COMMIT');
    res.json({ note: rows[0] });`,
  `    const titleRes = await client.query('SELECT title FROM tests WHERE id = $1', [testId]);
    const saved = rows[0];
    saved.test_title = titleRes.rows[0] ? titleRes.rows[0].title : null;

    await client.query('COMMIT');
    res.json({ note: saved });`,
  'POST /api/users/:userId/notes response'
);

// ---------------------------------------------------------------------------
// 5. DELETE: guard the table too
// ---------------------------------------------------------------------------
patch(
  `    if (!Number.isInteger(userId) || !Number.isInteger(testId)) {
      throw new ApiError(400, 'invalid user id or test id');
    }

    const { rowCount } = await pool.query(
      'DELETE FROM notes WHERE user_id = $1 AND test_id = $2',`,
  `    if (!Number.isInteger(userId) || !Number.isInteger(testId)) {
      throw new ApiError(400, 'invalid user id or test id');
    }
    await ensureNotesTable();

    const { rowCount } = await pool.query(
      'DELETE FROM notes WHERE user_id = $1 AND test_id = $2',`,
  'DELETE /api/users/:userId/notes/:testId'
);

// ---------------------------------------------------------------------------
// 6. Expose test_id in the analysis payload (notes are keyed by test).
// ---------------------------------------------------------------------------
patch(
  `    res.json({
      attempt_id: attempt.id,
      status: attempt.status,
      title: attempt.title,
      started_at: attempt.started_at,
      submitted_at: attempt.submitted_at,`,
  `    res.json({
      attempt_id: attempt.id,
      test_id: Number(attempt.test_id),
      status: attempt.status,
      title: attempt.title,
      started_at: attempt.started_at,
      submitted_at: attempt.submitted_at,`,
  'result payload test_id'
);

// ---------------------------------------------------------------------------
// 7. Create the table on boot, next to the journey table bootstrap.
// ---------------------------------------------------------------------------
patch(
  `ensureJourneyTable()
  .then(() => console.log('attempt_journey table ready'))
  .catch((e) => console.error('could not ensure attempt_journey table:', e.message));`,
  `ensureJourneyTable()
  .then(() => console.log('attempt_journey table ready'))
  .catch((e) => console.error('could not ensure attempt_journey table:', e.message));

// Same idea for the per-test notes table.
ensureNotesTable()
  .then(() => console.log('notes table ready'))
  .catch((e) => console.error('could not ensure notes table:', e.message));`,
  'boot bootstrap'
);

if (src === before) throw new Error('nothing changed');

fs.writeFileSync(FILE, src);
console.log('app.js patched (notes API hardening + test_id in result payload)');
