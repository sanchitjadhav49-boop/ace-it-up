'use strict';
const fs = require('fs');
const path = require('path');
const CSS = path.join(__dirname, 'frontend', 'src', 'exam.css');
let s = fs.readFileSync(CSS, 'utf8').replace(/\r\n/g, '\n');
let removed = 0;

const b1 = '  .section-scores__grid { grid-template-columns: 1fr; }\n';
if (s.includes(b1)) { s = s.split(b1).join(''); removed++; }

const b2 = [
  '.section-score-card__stats {',
  '  display: flex;',
  '  gap: 6px;',
  '  flex-wrap: wrap;',
  '  margin-top: 10px;',
  '  padding-top: 10px;',
  '  border-top: 1px solid #eef1f5;',
  '}',
  '',
  '.mini-chip {',
  '  padding: 2px 9px;',
  '  border-radius: 999px;',
  '  font-size: 0.72rem;',
  '  font-weight: 700;',
  '}',
  '.mini-chip--correct { background: #e9f9ee; color: #166534; }',
  '.mini-chip--incorrect { background: #fef2f2; color: #b3261e; }',
  '.mini-chip--unattempted { background: #f1f4f8; color: #475569; }',
  '',
].join('\n');
if (s.includes(b2)) { s = s.split(b2).join(''); removed++; }

fs.writeFileSync(CSS, s.replace(/\n/g, '\r\n'), 'utf8');
console.log('removed blocks:', removed);
if (removed !== 2) process.exit(1);
