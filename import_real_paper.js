'use strict';
// ============================================================================
// import_real_paper.js - import a REAL (verbatim) JEE Main paper as a mock
// test, exactly as provided - no re-tagging, no re-balancing, no content
// changes. This is the pipeline for papers the user has legally obtained
// (e.g. downloaded from the NTA / a coaching site) and transcribed into the
// JSON format below.
//
// Input file format (default: imported_paper.json, override with argv[2]):
//
// {
//   "title": "JEE Main 2026 - 22 Jan Shift 1 (NTA)",
//   "description": "Real NTA paper, imported verbatim. Difficulty tags (if any)
//                    are from the coaching-site analysis.",
//   "duration_minutes": 180,
//   "sections": [
//     {
//       "name": "Physics",
//       "mcq": [
//         ["Question body text", ["Option A", "Option B", "Option C", "Option D"], 2, "moderate"],
//         //    body                  options (4)                     correct idx   difficulty (optional)
//       ],
//       "num": [
//         ["Numerical question body", "42", "easy"]
//         //    body                       answer    difficulty (optional)
//       ]
//     },
//     { "name": "Chemistry",  "mcq": [...], "num": [...] },
//     { "name": "Mathematics", "mcq": [...], "num": [...] }
//   ]
// }
//
// Difficulty is optional per question: if omitted it defaults to 'moderate'
// (the questions.difficulty column is NOT NULL). If the coaching sites tagged
// questions as easy/moderate/difficult, include those tags and they are kept
// verbatim.
//
// Run:  node import_real_paper.js path/to/paper.json
// Uses DATABASE_URL or defaults to postgres://postgres:postgres@localhost:5432/aceitup
// ============================================================================

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});

const DIFFICULTIES = ['easy', 'moderate', 'difficult'];
const DEFAULT_DIFFICULTY = 'moderate';

// ---------------------------------------------------------------------------
// Validate the paper shape without modifying anything.
// ---------------------------------------------------------------------------
function validatePaperShape(paper, label) {
  if (!paper || typeof paper !== 'object') throw new Error(`${label}: paper must be an object`);
  if (typeof paper.title !== 'string' || !paper.title.trim()) {
    throw new Error(`${label}: paper.title is required`);
  }
  if (!Array.isArray(paper.sections) || paper.sections.length === 0) {
    throw new Error(`${label}: paper.sections must be a non-empty array`);
  }
  paper.sections.forEach((sec, si) => {
    if (!sec || typeof sec !== 'object' || typeof sec.name !== 'string' || !sec.name.trim()) {
      throw new Error(`${label}: section ${si + 1} needs a name`);
    }
    if (!Array.isArray(sec.mcq) || !Array.isArray(sec.num)) {
      throw new Error(`${label}: section "${sec.name}" needs mcq[] and num[] arrays`);
    }
    sec.mcq.forEach((q, qi) => {
      if (!Array.isArray(q) || q.length < 3 || typeof q[0] !== 'string' || !Array.isArray(q[1])) {
        throw new Error(`${label}: ${sec.name} MCQ #${qi + 1} must be [body, options[], correctIdx, difficulty?]`);
      }
      if (typeof q[2] !== 'number' || q[2] < 0 || q[2] >= q[1].length) {
        throw new Error(`${label}: ${sec.name} MCQ #${qi + 1} correctIdx out of range`);
      }
      if (q[3] !== undefined && !DIFFICULTIES.includes(q[3])) {
        throw new Error(`${label}: ${sec.name} MCQ #${qi + 1} difficulty must be easy|moderate|difficult`);
      }
    });
    sec.num.forEach((q, qi) => {
      if (!Array.isArray(q) || q.length < 2 || typeof q[0] !== 'string') {
        throw new Error(`${label}: ${sec.name} numerical #${qi + 1} must be [body, answer, difficulty?]`);
      }
      if (q[2] !== undefined && !DIFFICULTIES.includes(q[2])) {
        throw new Error(`${label}: ${sec.name} numerical #${qi + 1} difficulty must be easy|moderate|difficult`);
      }
    });
  });
  return true;
}

// ---------------------------------------------------------------------------
// Insert the paper verbatim (no re-ordering, no re-tagging).
// ---------------------------------------------------------------------------
async function seedPaper(client, paper) {
  // Remove any previous test with the same title (cascade deletes everything).
  await client.query('DELETE FROM tests WHERE title = $1', [paper.title]);

  const testRes = await client.query(
    `INSERT INTO tests (title, description, duration_minutes)
     VALUES ($1, $2, $3) RETURNING id`,
    [paper.title, paper.description || '', paper.duration_minutes || 180]
  );
  const testId = testRes.rows[0].id;

  let total = 0;
  for (let si = 0; si < paper.sections.length; si++) {
    const section = paper.sections[si];
    const secRes = await client.query(
      `INSERT INTO sections (test_id, name, position)
       VALUES ($1, $2, $3) RETURNING id`,
      [testId, section.name, si + 1]
    );
    const sectionId = secRes.rows[0].id;

    let position = 1;
    for (const q of section.mcq) {
      const [body, options, correctIdx, difficulty] = q;
      const qRes = await client.query(
        `INSERT INTO questions (section_id, question_type, body, difficulty, position)
         VALUES ($1, 'mcq', $2, $3, $4) RETURNING id`,
        [sectionId, body, difficulty || DEFAULT_DIFFICULTY, position]
      );
      const qId = qRes.rows[0].id;
      let correctOptionId = null;
      for (let i = 0; i < options.length; i++) {
        const oRes = await client.query(
          `INSERT INTO question_options (question_id, body, position)
           VALUES ($1, $2, $3) RETURNING id`,
          [qId, options[i], i + 1]
        );
        if (i === correctIdx) correctOptionId = oRes.rows[0].id;
      }
      await client.query(
        `UPDATE questions SET correct_option_id = $1 WHERE id = $2`,
        [correctOptionId, qId]
      );
      position++;
      total++;
    }

    for (const q of section.num) {
      const [body, answer, difficulty] = q;
      await client.query(
        `INSERT INTO questions (section_id, question_type, body, correct_answer, difficulty, position)
         VALUES ($1, 'numerical', $2, $3, $4, $5)`,
        [sectionId, body, String(answer), difficulty || DEFAULT_DIFFICULTY, position]
      );
      position++;
      total++;
    }
  }

  // Enforce the app's structural contract, then publish.
  await client.query('SELECT fn_validate_test_for_publish($1)', [testId]);
  await client.query('UPDATE tests SET is_published = TRUE WHERE id = $1', [testId]);
  return { testId, total };
}

// ---------------------------------------------------------------------------
async function main() {
  const file = process.argv[2] || 'imported_paper.json';
  const abs = path.resolve(__dirname, file);
  let paper;
  try {
    paper = JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    console.error(`Cannot read paper file ${abs}: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  validatePaperShape(paper, file);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { testId, total } = await seedPaper(client, paper);
    await client.query('COMMIT');
    console.log(`Imported test #${testId} "${paper.title}" with ${total} questions (published, verbatim).`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Import failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = { validatePaperShape, seedPaper, DIFFICULTIES, DEFAULT_DIFFICULTY };

if (require.main === module) {
  main();
}
