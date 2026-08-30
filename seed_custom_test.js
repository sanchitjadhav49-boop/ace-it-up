'use strict';
// Seed a custom full-length JEE Main test from a JSON file.
// Usage:
//   node seed_custom_test.js tests/custom_moderate_test_A.json
// Uses DATABASE_URL or defaults to postgres://postgres:postgres@localhost:5432/aceitup
// Ensures: 3 sections; each has 20 MCQ (4 options, 1 correct) + 5 numerical; publishes the test.
// For numerical questions, sets negative_marks = 0 per JEE rule (+4/0).

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function normalizeStr(s) {
  // Ensure plain ASCII to avoid cp1252/encoding issues in this environment
  if (s == null) return null;
  return String(s)
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\u03BC/g, 'mu')
    .replace(/\u03BB/g, 'lambda')
    .replace(/[\u03C0]/g, 'pi')
    .replace(/[\u2212]/g, '-')
    .replace(/[\u00B0]/g, ' degrees');
}

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Provide path to test JSON. Example: node seed_custom_test.js tests/custom_moderate_test_A.json');
    process.exit(1);
  }
  const abs = path.resolve(jsonPath);
  const raw = fs.readFileSync(abs, 'utf8');
  const data = JSON.parse(raw);

  // Validate top-level
  assert(data && data.title && data.sections && Array.isArray(data.sections) && data.sections.length === 3,
         'JSON must have title and exactly 3 sections');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Remove any existing test with the same title (cascade via FK)
    await client.query('DELETE FROM tests WHERE title = $1', [data.title]);

    const testRes = await client.query(
      `INSERT INTO tests (title, description, duration_minutes, is_published)
       VALUES ($1, $2, $3, FALSE) RETURNING id`,
      [normalizeStr(data.title), normalizeStr(data.description || ''), data.duration_minutes || 180]
    );
    const testId = testRes.rows[0].id;

    // Insert 3 sections in order Physics, Chemistry, Mathematics (as provided)
    for (let si = 0; si < data.sections.length; si++) {
      const sec = data.sections[si];
      assert(['Physics','Chemistry','Mathematics'].includes(sec.name), 'Section name must be Physics/Chemistry/Mathematics');

      const secRes = await client.query(
        `INSERT INTO sections (test_id, name, position) VALUES ($1, $2, $3) RETURNING id`,
        [testId, sec.name, si + 1]
      );
      const sectionId = secRes.rows[0].id;

      assert(Array.isArray(sec.questions), `Section ${sec.name} must have questions array`);
      const mcqs = sec.questions.filter(q => q.type === 'mcq');
      const nums = sec.questions.filter(q => q.type === 'numerical');
      assert(mcqs.length === 20 && nums.length === 5, `${sec.name} must have 20 MCQ and 5 numerical`);

      // Insert MCQs (positions 1..20)
      for (let i = 0; i < mcqs.length; i++) {
        const q = mcqs[i];
        assert(Array.isArray(q.options) && q.options.length === 4, 'MCQ must have 4 options');
        assert(Number.isInteger(q.answer_index) && q.answer_index >= 0 && q.answer_index < 4, 'MCQ needs answer_index 0..3');
        const qRes = await client.query(
          `INSERT INTO questions (section_id, question_type, difficulty, body, position)
           VALUES ($1, 'mcq', $2, $3, $4) RETURNING id`,
          [sectionId, q.difficulty || 'moderate', normalizeStr(q.body), i + 1]
        );
        const qid = qRes.rows[0].id;
        let correctId = null;
        for (let oi = 0; oi < 4; oi++) {
          const optRes = await client.query(
            `INSERT INTO question_options (question_id, body, position)
             VALUES ($1, $2, $3) RETURNING id`,
            [qid, normalizeStr(q.options[oi]), oi + 1]
          );
          if (oi === q.answer_index) correctId = optRes.rows[0].id;
        }
        await client.query(`UPDATE questions SET correct_option_id = $1 WHERE id = $2`, [correctId, qid]);
      }

      // Insert numerical (positions 21..25) with negative_marks = 0
      for (let j = 0; j < nums.length; j++) {
        const q = nums[j];
        assert(typeof q.answer === 'number', 'Numerical needs numeric exact answer');
        await client.query(
          `INSERT INTO questions (section_id, question_type, difficulty, body, correct_answer, negative_marks, position)
           VALUES ($1, 'numerical', $2, $3, $4, 0, $5)`,
          [sectionId, q.difficulty || 'moderate', normalizeStr(q.body), q.answer, 21 + j]
        );
      }
    }

    // Full-structure validation and publish
    await client.query('SELECT fn_validate_test_for_publish($1)', [testId]);
    await client.query('UPDATE tests SET is_published = TRUE WHERE id = $1', [testId]);

    await client.query('COMMIT');
    console.log(`Seeded and published test #${testId}: ${data.title}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
