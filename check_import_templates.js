'use strict';
// ============================================================================
// check_import_templates.js - validate every template in papers_2026/import/
// before importing: structural shape (via import_real_paper.js) plus a check
// that NO placeholders were left unfilled.
//
// Run:  node check_import_templates.js
// Exits 1 if any template is unfinished or malformed, 0 if all are ready.
// ============================================================================

const fs = require('fs');
const path = require('path');
const { validatePaperShape } = require('./import_real_paper.js');

const DIR = path.join(__dirname, 'papers_2026', 'import');

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

function checkFile(file) {
  const abs = path.join(DIR, file);
  let paper;
  try {
    paper = JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    return { file, ok: false, errors: ['cannot parse JSON: ' + err.message] };
  }

  const errors = [];
  try {
    validatePaperShape(paper, file);
  } catch (err) {
    errors.push(err.message);
  }

  // Every question must be filled (no placeholders) and MCQ answers valid.
  paper.sections.forEach((sec) => {
    sec.mcq.forEach((q, i) => {
      const [body, options, correctIdx] = q;
      const hits = findPlaceholders(JSON.stringify([body, options]));
      if (hits.length) {
        errors.push(`${sec.name} MCQ #${i + 1}: unfilled placeholder(s) ${hits.join(', ')}`);
      }
      if (typeof correctIdx !== 'number' || correctIdx < 0 || correctIdx >= options.length) {
        errors.push(`${sec.name} MCQ #${i + 1}: correctIdx must be 0-${options.length - 1}`);
      }
    });
    sec.num.forEach((q, i) => {
      const [body, answer] = q;
      const hits = findPlaceholders(JSON.stringify([body, answer]));
      if (hits.length) {
        errors.push(`${sec.name} numerical #${i + 1}: unfilled placeholder(s) ${hits.join(', ')}`);
      }
      if (String(answer).trim() === '') {
        errors.push(`${sec.name} numerical #${i + 1}: empty answer`);
      }
    });
  });

  return { file, ok: errors.length === 0, errors };
}

function main() {
  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.error(`No template files found in ${DIR}`);
    process.exit(1);
  }

  let bad = 0;
  for (const file of files) {
    const res = checkFile(file);
    if (res.ok) {
      console.log(`OK    ${file}`);
    } else {
      bad++;
      console.log(`FAIL  ${file}`);
      res.errors.forEach((e) => console.log(`        - ${e}`));
    }
  }
  console.log(bad === 0 ? `All ${files.length} templates are ready to import.` : `${bad} of ${files.length} templates still need work.`);
  process.exitCode = bad === 0 ? 0 : 1;
}

main();
