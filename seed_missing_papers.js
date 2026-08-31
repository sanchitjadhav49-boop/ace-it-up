// Seed only missing papers; retry up to N times on transient errors
'use strict';

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup' });
const DATA_DIR = path.join(__dirname, 'papers_2026');

function loadPapers() {
  const files = fs.readdirSync(DATA_DIR).filter((f) => /^paper\d+\.js$/.test(f)).sort();
  return files.map((f) => require(path.join(DATA_DIR, f)));
}

async function existingTitles() {
  const client = await pool.connect();
  try {
    const r = await client.query('SELECT title FROM tests');
    return new Set(r.rows.map((x) => x.title));
  } finally {
    client.release();
  }
}

async function seedPaper(client, paper) {
  await client.query('BEGIN');
  try {
    await client.query('DELETE FROM tests WHERE title = $1', [paper.title]);
    const res = await client.query(
      `INSERT INTO tests (title, description, duration_minutes) VALUES ($1, $2, 180) RETURNING id`,
      [paper.title, paper.description]
    );
    const testId = res.rows[0].id;
    let total = 0;
    for (const section of paper.sections) {
      const secRes = await client.query('INSERT INTO sections (test_id, name, position) VALUES ($1, $2, $3) RETURNING id', [testId, section.name, paper.sections.indexOf(section) + 1]);
      const sectionId = secRes.rows[0].id;
      let position = 1;
      for (const [body, options, correctIdx, difficulty] of section.mcq) {
        const qRes = await client.query("INSERT INTO questions (section_id, question_type, body, difficulty, position) VALUES ($1,'mcq',$2,$3,$4) RETURNING id", [sectionId, body, difficulty, position]);
        const qId = qRes.rows[0].id;
        let correctOptionId = null;
        for (let i = 0; i < options.length; i++) {
          const oRes = await client.query('INSERT INTO question_options (question_id, body, position) VALUES ($1,$2,$3) RETURNING id', [qId, options[i], i + 1]);
          if (i === correctIdx) correctOptionId = oRes.rows[0].id;
        }
        await client.query('UPDATE questions SET correct_option_id = $1 WHERE id = $2', [correctOptionId, qId]);
        position++; total++;
      }
      for (const [body, answer, difficulty] of section.num) {
        await client.query("INSERT INTO questions (section_id, question_type, body, correct_answer, difficulty, position) VALUES ($1,'numerical',$2,$3,$4,$5)", [sectionId, body, answer, difficulty, position]);
        position++; total++;
      }
    }
    await client.query('SELECT fn_validate_test_for_publish($1)', [testId]);
    await client.query('UPDATE tests SET is_published = TRUE WHERE id = $1', [testId]);
    await client.query('COMMIT');
    return { testId, total };
  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    throw err;
  }
}

async function main() {
  const papers = loadPapers();
  const titles = await existingTitles();
  const client = await pool.connect();
  try {
    for (const paper of papers) {
      if (titles.has(paper.title)) {
        console.log('Skipping already-present:', paper.title);
        continue;
      }
      let attempts = 0;
      let ok = false;
      while (attempts < 4 && !ok) {
        attempts++;
        try {
          const res = await seedPaper(client, paper);
          console.log(`Seeded test #${res.testId} "${paper.title}" with ${res.total} questions (published).`);
          ok = true;
        } catch (err) {
          console.error(`Attempt ${attempts} failed for ${paper.title}:`, err.message || err);
          // wait and retry
          await new Promise((r) => setTimeout(r, 2000 * attempts));
        }
      }
      if (!ok) console.error('Giving up on', paper.title);
      // small pause
      await new Promise((r) => setTimeout(r, 500));
    }
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) main().catch((err)=>{console.error('Fatal', err); process.exit(1);});