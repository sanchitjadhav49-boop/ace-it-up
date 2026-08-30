'use strict';
// ============================================================================
// import_templates.js - import every FILLED template in papers_2026/import/
// as a published mock test. Reuses the verbatim importer
// (import_real_paper.js), so titles replace any existing test with the same
// name (idempotent).
//
// Run:  node import_templates.js [name-fragment]
//   - no argument: import all templates in papers_2026/import/
//   - name-fragment: import only templates whose file name contains it
//     (e.g. "node import_templates.js 2026-04-02" imports just that shift).
// Exits 1 if any template still contains placeholders or fails validation.
// Uses DATABASE_URL or defaults to postgres://postgres:postgres@localhost:5432/aceitup
// ============================================================================

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { validatePaperShape, seedPaper } = require('./import_real_paper.js');

const DIR = path.join(__dirname, 'papers_2026', 'import');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});

// Markers we expect to be GONE in a filled template.
const PLACEHOLDER_PATTERNS = [
  /__/,
  /PASTE QUESTION BODY HERE/i,
  /OPTION \d/i,
  /NUMERICAL ANSWER/i,
];

function findPlaceholders(text) {
  const hits = [];
  for (const re of PLACEHOLDER_PATTERNS) {
    const m = text.match(re);
    if (m) hits.push(m[0]);
  }
  return hits;
}

function checkFilled(paper, file) {
  const errors = [];
  validatePaperShape(paper, file);
  paper.sections.forEach((sec) => {
    sec.mcq.forEach((q, i) => {
      const hits = findPlaceholders(JSON.stringify([q[0], q[1]]));
      if (hits.length) {
        errors.push(`${file}: ${sec.name} MCQ #${i + 1} still has placeholder(s) ${hits.join(', ')}`);
      }
    });
    sec.num.forEach((q, i) => {
      const hits = findPlaceholders(JSON.stringify([q[0], q[1]]));
      if (hits.length) {
        errors.push(`${file}: ${sec.name} numerical #${i + 1} still has placeholder(s) ${hits.join(', ')}`);
      }
    });
  });
  return errors;
}

function loadPapers(filter) {
  const papers = [];
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
  for (const file of files) {
    if (filter && !file.includes(filter)) continue;
    const paper = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
    const errors = checkFilled(paper, file);
    if (errors.length) {
      throw new Error('\n  ' + errors.join('\n  '));
    }
    papers.push({ file, paper });
  }
  return papers;
}

async function main() {
  const filter = process.argv[2];
  let papers;
  try {
    papers = loadPapers(filter);
  } catch (err) {
    console.error('Template validation failed:' + err.message);
    process.exit(1);
  }
  if (papers.length === 0) {
    console.error(`No matching templates in ${DIR}${filter ? ' (filter: ' + filter + ')' : ''}`);
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { file, paper } of papers) {
      const { testId, total } = await seedPaper(client, paper);
      console.log(`Imported test #${testId} "${paper.title}" from ${file} (${total} questions).`);
    }
    await client.query('COMMIT');
    console.log(`Done: ${papers.length} real NTA paper(s) published.`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Import failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
