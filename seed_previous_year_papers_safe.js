// Seed previous year papers one at a time with per-paper transactions to survive connection drops
'use strict';

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});

const DIFFICULTIES = ['easy', 'moderate', 'difficult'];
const DATA_DIR = path.join(__dirname, 'papers_2026');

function loadPapers() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^paper\d+\.js$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0], 10);
      const nb = parseInt(b.match(/\d+/)[0], 10);
      return na - nb;
    });
  if (files.length === 0) throw new Error(`No paper files found in ${DATA_DIR}`);
  return files.map((f) => require(path.join(DATA_DIR, f)));
}

function validatePaperShape(paper, index) {
  if (!paper.title || !Array.isArray(paper.sections) || paper.sections.length !== 3) {
    throw new Error(`Paper ${index + 1}: must have exactly 3 sections`);
  }
  for (const sec of paper.sections) {
    if (!['Physics', 'Chemistry', 'Mathematics'].includes(sec.name)) {
      throw new Error(`Paper ${index + 1}: unknown section "${sec.name}"`);
    }
    if (!Array.isArray(sec.mcq) || sec.mcq.length !== 20) {
      throw new Error(`Paper ${index + 1} (${sec.name}): need exactly 20 MCQ, got ${sec.mcq ? sec.mcq.length : 0}`);
    }
    if (!Array.isArray(sec.num) || sec.num.length !== 5) {
      throw new Error(`Paper ${index + 1} (${sec.name}): need exactly 5 numerical, got ${sec.num ? sec.num.length : 0}`);
    }
    for (const q of sec.mcq) {
      if (!Array.isArray(q) || q.length !== 4 || !Array.isArray(q[1]) || q[1].length !== 4 ||
          typeof q[2] !== 'number' || q[2] < 0 || q[2] > 3 ||
          !DIFFICULTIES.includes(q[3])) {
        throw new Error(`Paper ${index + 1} (${sec.name}): malformed MCQ entry ${JSON.stringify(q)}`);
      }
    }
    for (const q of sec.num) {
      if (!Array.isArray(q) || q.length !== 3 || typeof q[1] !== 'number' ||
          !DIFFICULTIES.includes(q[2])) {
        throw new Error(`Paper ${index + 1} (${sec.name}): malformed numerical entry ${JSON.stringify(q)}`);
      }
    }
  }
  return true;
}

async function seedPaperOneTransaction(paper) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // delete existing test with same title
    await client.query('DELETE FROM tests WHERE title = $1', [paper.title]);

    const testRes = await client.query(
      `INSERT INTO tests (title, description, duration_minutes)
       VALUES ($1, $2, 180) RETURNING id`,
      [paper.title, paper.description]
    );
    const testId = testRes.rows[0].id;

    let total = 0;
    for (const section of paper.sections) {
      const secRes = await client.query(
        `INSERT INTO sections (test_id, name, position)
         VALUES ($1, $2, $3) RETURNING id`,
        [testId, section.name, paper.sections.indexOf(section) + 1]
      );
      const sectionId = secRes.rows[0].id;

      let position = 1;
      for (const [body, options, correctIdx, difficulty] of section.mcq) {
        const qRes = await client.query(
          `INSERT INTO questions (section_id, question_type, body, difficulty, position)
           VALUES ($1, 'mcq', $2, $3, $4) RETURNING id`,
          [sectionId, body, difficulty, position]
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
        await client.query(`UPDATE questions SET correct_option_id = $1 WHERE id = $2`, [correctOptionId, qId]);
        position++;
        total++;
      }
      for (const [body, answer, difficulty] of section.num) {
        await client.query(
          `INSERT INTO questions (section_id, question_type, body, correct_answer, difficulty, position)
           VALUES ($1, 'numerical', $2, $3, $4, $5)`,
          [sectionId, body, answer, difficulty, position]
        );
        position++;
        total++;
      }
    }

    await client.query('SELECT fn_validate_test_for_publish($1)', [testId]);
    await client.query('UPDATE tests SET is_published = TRUE WHERE id = $1', [testId]);

    await client.query('COMMIT');
    client.release();
    return { testId, total };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    throw err;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const papers = loadPapers();
  // validate shape first
  for (let i = 0; i < papers.length; i++) {
    validatePaperShape(papers[i], i);
  }

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];
    try {
      const { testId, total } = await seedPaperOneTransaction(paper);
      console.log(`Seeded test #${testId} "${paper.title}" with ${total} questions (published).`);
    } catch (err) {
      console.error(`Failed to seed paper ${i + 1} (${paper.title}):`, err.message || err);
      // Decide whether to continue or abort: we'll continue to next paper after a short wait
      console.log('Waiting 3s before next attempt...');
      await sleep(3000);
    }
    // small pause between papers to reduce connection stress
    await sleep(500);
  }

  console.log('Done seeding papers (per-paper transactions attempted).');
  await pool.end();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
