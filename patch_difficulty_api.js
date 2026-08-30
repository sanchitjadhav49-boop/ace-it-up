'use strict';
// Patch app.js to expose questions.difficulty in the exam page (GET /tests/:id,
// GET /attempts/:id) and in the post-submit review (GET /attempts/:id/result).
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app.js');
let s = fs.readFileSync(file, 'utf8');
// Normalize CRLF so anchors match.
const crlf = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');

function replaceOnce(from, to, label) {
  const i = s.indexOf(from);
  if (i === -1) {
    console.error('NOT FOUND: ' + label);
    process.exit(1);
  }
  s = s.slice(0, i) + to + s.slice(i + from.length);
}

// 1) PAGE_QUESTIONS_COLS gains difficulty (covers /tests/:id and /attempts/:id).
replaceOnce(
  "  'q.positive_marks, q.negative_marks, q.position';",
  "  'q.positive_marks, q.negative_marks, q.position, q.difficulty';",
  'PAGE_QUESTIONS_COLS'
);

// 2) /tests/:id question payload.
replaceOnce(
  "        position: q.position,\n        options: optionsByQuestion.get(q.id) || [],\n      };\n      if (!questionsBySection.has(q.section_id)) questionsBySection.set(q.section_id, []);",
  "        position: q.position,\n        difficulty: q.difficulty,\n        options: optionsByQuestion.get(q.id) || [],\n      };\n      if (!questionsBySection.has(q.section_id)) questionsBySection.set(q.section_id, []);",
  'tests/:id payload'
);

// 3) /attempts/:id question payload.
replaceOnce(
  "        time_spent_seconds: aq.time_spent_seconds != null ? Number(aq.time_spent_seconds) : 0,\n        options: optionsByQuestion.get(q.id) || [],",
  "        time_spent_seconds: aq.time_spent_seconds != null ? Number(aq.time_spent_seconds) : 0,\n        difficulty: q.difficulty,\n        options: optionsByQuestion.get(q.id) || [],",
  'attempts/:id payload'
);

// 4) /attempts/:id/result review query column list.
replaceOnce(
  'q.positive_marks, q.negative_marks, q.position,\n              aq.status,',
  'q.positive_marks, q.negative_marks, q.position, q.difficulty,\n              aq.status,',
  'result review columns'
);

// 5) /attempts/:id/result question mapping.
replaceOnce(
  "      position: r.position,\n      status: r.status,",
  "      position: r.position,\n      difficulty: r.difficulty,\n      status: r.status,",
  'result review mapping'
);

fs.writeFileSync(file, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('app.js patched: difficulty now returned by /tests/:id, /attempts/:id and /attempts/:id/result.');
