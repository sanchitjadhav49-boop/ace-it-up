'use strict';

// ---------------------------------------------------------------------------
// migrate_notes.js -- create the `notes` table (student's learning/mistake
// notes per mock test).
//
// The schema (jee_mock_test_schema.sql) declares `notes`, but the live
// database was created before that block existed, so every call to
// /api/users/:userId/notes died with
//   error: relation "notes" does not exist
// ...and the Notes screens stayed empty. This migration is idempotent.
//
// Usage:
//   node migrate_notes.js
//   DATABASE_URL=postgres://... node migrate_notes.js
// ---------------------------------------------------------------------------

const { Pool } = require('pg');

const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup';

const pool = new Pool({ connectionString });

const DDL = [
  // One note per (user, test): the note survives retakes of the same test.
  `CREATE TABLE IF NOT EXISTS notes (
     id         BIGSERIAL PRIMARY KEY,
     user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     test_id    BIGINT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
     content    TEXT NOT NULL DEFAULT '',
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE (user_id, test_id)
   )`,
  'CREATE INDEX IF NOT EXISTS idx_notes_user ON notes (user_id)',
  'CREATE INDEX IF NOT EXISTS idx_notes_test ON notes (test_id)',
];

async function main() {
  const client = await pool.connect();
  try {
    for (const sql of DDL) {
      await client.query(sql);
    }

    await client.query(
      `ALTER TABLE notes ADD COLUMN IF NOT EXISTS mistake_notes TEXT`
    ).catch(() => {});

    const cols = await client.query(
      `SELECT column_name, data_type
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'notes'
        ORDER BY ordinal_position`
    );

    console.log('notes table is ready:');
    for (const c of cols.rows) console.log('  -', c.column_name, '(' + c.data_type + ')');

    const users = await client.query('SELECT count(*)::int AS n FROM users');
    const tests = await client.query('SELECT count(*)::int AS n FROM tests');
    console.log(`users: ${users.rows[0].n}, tests: ${tests.rows[0].n}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('migration failed:', err.message);
  process.exit(1);
});
