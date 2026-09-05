'use strict';
// Adds the error_tags table (per-attempt, per-question error tagging for the
// Error Distribution analysis) to jee_mock_test_schema.sql and applies the
// same DDL to the live aceitup database.
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const schemaFile = path.join(__dirname, 'jee_mock_test_schema.sql');
let sql = fs.readFileSync(schemaFile, 'utf8');
const EOL = sql.includes('\r\n') ? '\r\n' : '\n';

const tableDef = [
  '',
  '-- ---------------------------------------------------------------------------',
  '-- ERROR TAGS  (student\'s self-analysis of why a question went wrong)',
  '--   One row per (attempt, question). The student picks exactly one tag per',
  '--   question after the test: \'correct\', one of the 7 error types, or \'skip\'.',
  '--   Powers the Error Distribution tab in the analysis page.',
  '-- ---------------------------------------------------------------------------',
  'CREATE TABLE error_tags (',
  '    attempt_id  BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,',
  '    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,',
  '    error_tag   TEXT NOT NULL CHECK (error_tag IN',
  "                  ('correct', 'concept', 'silly', 'reading',",
  "                   'application', 'time', 'guess', 'recall', 'skip')),",
  '    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),',
  '    PRIMARY KEY (attempt_id, question_id)',
  ');',
  '',
  'CREATE INDEX idx_error_tags_attempt ON error_tags (attempt_id);',
].join(EOL);

if (/CREATE TABLE error_tags\b/.test(sql)) {
  console.log('schema already has error_tags; skipping file edit');
} else {
  const anchor = '-- ---------------------------------------------------------------------------' + EOL + '-- INDEXES' + EOL;
  const idx = sql.indexOf(anchor);
  if (idx === -1) {
    console.error('ANCHOR NOT FOUND in schema file (INDEXES section)');
    process.exit(1);
  }
  sql = sql.slice(0, idx) + tableDef + EOL + EOL + sql.slice(idx);
  fs.writeFileSync(schemaFile, sql);
  console.log('schema file updated with error_tags table');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});
(async () => {
  const exists = await pool.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_name = 'error_tags'`
  );
  if (exists.rows.length > 0) {
    console.log('live DB already has error_tags; nothing to do');
  } else {
    await pool.query(`
      CREATE TABLE error_tags (
        attempt_id  BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
        question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        error_tag   TEXT NOT NULL CHECK (error_tag IN
                      ('correct', 'concept', 'silly', 'reading',
                       'application', 'time', 'guess', 'recall')),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (attempt_id, question_id)
      );
      CREATE INDEX idx_error_tags_attempt ON error_tags (attempt_id);
    `);
    console.log('live DB: created error_tags table');
  }
  await pool.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
