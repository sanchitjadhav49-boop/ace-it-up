'use strict';
// Adds the difficulty column to the questions table in jee_mock_test_schema.sql
// and applies the same ALTER to the live aceitup database.
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const schemaFile = path.join(__dirname, 'jee_mock_test_schema.sql');
let sql = fs.readFileSync(schemaFile, 'utf8');

// Tolerate CRLF vs LF line endings.
const anchor = /(    question_type     TEXT NOT NULL CHECK \(question_type IN \('mcq', 'numerical'\)\),)\r?\n/;
const withCol = "$1\n" +
  "    difficulty        TEXT NOT NULL DEFAULT 'easy'\n" +
  "                      CHECK (difficulty IN ('easy', 'moderate', 'difficult')),\n";

if (sql.includes('difficulty')) {
  console.log('schema already has difficulty; skipping file edit');
} else if (!anchor.test(sql)) {
  console.error('ANCHOR NOT FOUND in schema file');
  process.exit(1);
} else {
  sql = sql.replace(anchor, withCol);
  fs.writeFileSync(schemaFile, sql);
  console.log('schema file updated with difficulty column');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});
(async () => {
  const exists = await pool.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_name = 'questions' AND column_name = 'difficulty'`
  );
  if (exists.rows.length > 0) {
    console.log('live DB already has difficulty column; nothing to do');
  } else {
    await pool.query(
      `ALTER TABLE questions
         ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'easy'
         CHECK (difficulty IN ('easy', 'moderate', 'difficult'))`
    );
    console.log('live DB: added questions.difficulty');
  }
  await pool.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
