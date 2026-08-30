'use strict';
// Patch frontend/src/App.jsx (exam question meta + analysis ReviewItem) and
// frontend/src/exam.css (difficulty badge styles) to display the difficulty
// level of each question. Files are UTF-8 with CRLF line endings.
const fs = require('fs');
const path = require('path');

const appFile = path.join(__dirname, 'frontend', 'src', 'App.jsx');
const cssFile = path.join(__dirname, 'frontend', 'src', 'exam.css');

function readCrlf(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  return { text: raw.replace(/\r\n/g, '\n'), crlf };
}
function writeCrlf(file, text, crlf) {
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, '\r\n') : text);
}
function replaceOnce(text, from, to, label) {
  const i = text.indexOf(from);
  if (i === -1) {
    console.error('NOT FOUND: ' + label);
    process.exit(1);
  }
  return text.slice(0, i) + to + text.slice(i + from.length);
}

// --- 1) Exam question page: difficulty badge in question-meta ----------------
let app = readCrlf(appFile);
app.text = replaceOnce(
  app.text,
  "            <span>\n              {question.sectionName} | Question {current + 1} of {allQuestions.length}\n            </span>",
  "            <span>\n              {question.sectionName} | Question {current + 1} of {allQuestions.length}\n              <span className={`difficulty-badge difficulty-badge--${question.difficulty || 'easy'}`}>\n                {question.difficulty || 'easy'}\n              </span>\n            </span>",
  'exam question-meta'
);

// --- 2) Analysis: difficulty chip in ReviewItem head --------------------------
app.text = replaceOnce(
  app.text,
  '        <span className="review-item__qno">Q{q.position}</span>',
  '        <span className="review-item__qno">Q{q.position}</span>\n' +
  '        <span className={`difficulty-badge difficulty-badge--${q.difficulty || \'easy\'}`}>\n' +
  '          {q.difficulty || \'easy\'}\n' +
  '        </span>',
  'review-item head'
);
writeCrlf(appFile, app.text, app.crlf);
console.log('App.jsx patched: difficulty badge in question-meta + ReviewItem.');

// --- 3) CSS: difficulty badge styles ------------------------------------------
let css = readCrlf(cssFile);
const badgeCss =
  '/* Difficulty badges (easy / moderate / difficult) */\n' +
  '.difficulty-badge {\n' +
  '  display: inline-block;\n' +
  '  margin-left: 8px;\n' +
  '  padding: 2px 10px;\n' +
  '  border-radius: 999px;\n' +
  '  font-size: 0.7rem;\n' +
  '  font-weight: 700;\n' +
  '  text-transform: capitalize;\n' +
  '  vertical-align: middle;\n' +
  '  border: 1px solid;\n' +
  '}\n' +
  '.difficulty-badge--easy { background: #e9f9ee; color: #166534; border-color: #86d9a5; }\n' +
  '.difficulty-badge--moderate { background: #fef7e6; color: #92400e; border-color: #f0d9a0; }\n' +
  '.difficulty-badge--difficult { background: #fef2f2; color: #b3261e; border-color: #f5a3a3; }\n' +
  'body.dark .difficulty-badge--easy { background: #14532d; color: #86efac; border-color: #166534; }\n' +
  'body.dark .difficulty-badge--moderate { background: #78350f; color: #fcd34d; border-color: #92400e; }\n' +
  'body.dark .difficulty-badge--difficult { background: #7f1d1d; color: #fca5a5; border-color: #991b1b; }\n';
if (css.text.includes('.difficulty-badge')) {
  console.log('exam.css already has difficulty badge styles; skipping append.');
} else {
  css.text = css.text.replace(/\n\s*$/, '\n') + '\n' + badgeCss;
  writeCrlf(cssFile, css.text, css.crlf);
  console.log('exam.css patched: difficulty badge styles appended.');
}
