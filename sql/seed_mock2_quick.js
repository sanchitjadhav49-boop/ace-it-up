'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});

const TITLE = 'JEE Main 2026 Mock 2 (Full Length)';
const SECTIONS = ['Physics', 'Chemistry', 'Mathematics'];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM tests WHERE title = $1', [TITLE]);

    const testRes = await client.query(
      `INSERT INTO tests (title, description, duration_minutes)
       VALUES ($1, $2, 180) RETURNING id`,
      [TITLE, 'Second full-length JEE Main mock: 20 MCQ + 5 numerical per subject (25 per subject, 75 total), 3 hours, +4/-1 marking.']
    );
    const testId = testRes.rows[0].id;

    let total = 0;
    for (const sectionName of SECTIONS) {
      const secRes = await client.query(
        `INSERT INTO sections (test_id, name, position) VALUES ($1, $2, $3) RETURNING id`,
        [testId, sectionName, SECTIONS.indexOf(sectionName) + 1]
      );
      const sectionId = secRes.rows[0].id;

      let position = 1;

      // 20 MCQs
      for (let q = 1; q <= 20; q++) {
        const qRes = await client.query(
          `INSERT INTO questions (section_id, question_type, body, position)
           VALUES ($1, 'mcq', $2, $3) RETURNING id`,
          [sectionId, `[Mock 2] ${sectionName} MCQ #${q}: sample question placeholder.`, position]
        );
        const qId = qRes.rows[0].id;

        const correctIdx = q % 4;
        let correctOptionId = null;
        for (let i = 0; i < 4; i++) {
          const oRes = await client.query(
            `INSERT INTO question_options (question_id, body, position) VALUES ($1, $2, $3) RETURNING id`,
            [qId, `Option ${['A', 'B', 'C', 'D'][i]}`, i + 1]
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

      // 5 numericals
      for (let q = 1; q <= 5; q++) {
        await client.query(
          `INSERT INTO questions (section_id, question_type, body, correct_answer, position)
           VALUES ($1, 'numerical', $2, $3, $4)`,
          [sectionId, `[Mock 2] ${sectionName} Numerical #${q}: sample question placeholder.`, q, position]
        );
        position++;
        total++;
      }
    }

    await client.query('UPDATE tests SET is_published = TRUE WHERE id = $1', [testId]);

    await client.query('COMMIT');
    console.log(`Seeded test #${testId} "${TITLE}" with ${total} questions (published).`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();