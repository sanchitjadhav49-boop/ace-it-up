'use strict';
// ---------------------------------------------------------------------------
// migrate_topics.js
//   Adds questions.topic and questions.subtopic - the JEE chapter and
//   sub-chapter a question belongs to. Used by the Topic Analysis tab in the
//   analysis page (which topic/subtopic did the student get wrong / right).
//
//   The script is idempotent: it patches jee_mock_test_schema.sql (only when
//   the columns are missing) and then applies the same ALTER TABLE to the live
//   database named by DATABASE_URL.
//
//   Usage:
//     node migrate_topics.js
//     DATABASE_URL=postgres://... node migrate_topics.js
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const schemaFile = path.join(__dirname, 'jee_mock_test_schema.sql');

// ---- 1. schema file ------------------------------------------------------
let sql = fs.readFileSync(schemaFile, 'utf8');
const crlf = sql.includes('\r\n');

// Anchor on the difficulty column so topic/subtopic land right after it.
const colAnchor =
  /( {4}difficulty {2,}TEXT NOT NULL DEFAULT 'easy'\r?\n {22}CHECK \(difficulty IN \('easy', 'moderate', 'difficult'\)\),\r?\n)/;
const colBlock =
  "    topic             TEXT,                -- JEE chapter (filled by tag_topics.js)\n" +
  "    subtopic          TEXT,                -- sub-chapter inside the topic\n";

if (/^\s*topic\s+TEXT/m.test(sql)) {
  console.log('schema file already declares questions.topic; skipping file edit');
} else if (!colAnchor.test(sql)) {
  console.error('ANCHOR NOT FOUND: questions.difficulty block in jee_mock_test_schema.sql');
  process.exit(1);
} else {
  sql = sql.replace(colAnchor, (m) => m + (crlf ? colBlock.replace(/\n/g, '\r\n') : colBlock));
  console.log('schema file: added questions.topic / questions.subtopic');
}

const idxAnchor = /(CREATE INDEX idx_options_question\s+ON question_options \(question_id\);\r?\n)/;
const idxBlock = 'CREATE INDEX idx_questions_topic      ON questions (topic, subtopic);\n';
if (sql.includes('idx_questions_topic')) {
  console.log('schema file already declares idx_questions_topic; skipping');
} else if (!idxAnchor.test(sql)) {
  console.log('note: index anchor not found - schema file left without idx_questions_topic');
} else {
  sql = sql.replace(idxAnchor, (m) => m + (crlf ? idxBlock.replace(/\n/g, '\r\n') : idxBlock));
  console.log('schema file: added idx_questions_topic');
}

fs.writeFileSync(schemaFile, sql);

// ---- 2. live database ---------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});

(async () => {
  const info = await pool.query('SELECT current_database() AS db');
  console.log('connected to', info.rows[0].db);

  for (const col of ['topic', 'subtopic']) {
    const exists = await pool.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_name = 'questions' AND column_name = $1`,
      [col]
    );
    if (exists.rows.length > 0) {
      console.log(`live DB: questions.${col} already exists`);
    } else {
      await pool.query(`ALTER TABLE questions ADD COLUMN ${col} TEXT`);
      console.log(`live DB: added questions.${col}`);
    }
  }

  await pool.query('CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions (topic, subtopic)');
  console.log('live DB: idx_questions_topic present');

  const tagged = await pool.query(
    `SELECT count(*)::int AS total,
            count(topic)::int    AS with_topic,
            count(subtopic)::int AS with_subtopic
       FROM questions`
  );
  const r = tagged.rows[0];
  console.log(`live DB: ${r.total} questions, ${r.with_topic} tagged with a topic, ${r.with_subtopic} with a subtopic`);
  await pool.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
