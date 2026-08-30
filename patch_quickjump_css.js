'use strict';
// Appends the quick-jump strip styles to exam.css (preserves CRLF).
const fs = require('fs');

const css = `

/* ======================== QUICK-JUMP STRIP ========================= */
.quick-jump {
  display: flex;
  gap: 6px;
  margin-top: 14px;
  padding: 8px 10px;
  background: #ffffff;
  border: 1px solid #d8dde4;
  border-radius: 4px;
  overflow-x: auto;
}
.quick-jump__btn {
  flex: 0 0 auto;
  padding: 7px 14px;
  border: 1px solid #c3ccd8;
  border-radius: 4px;
  background: #ffffff;
  color: #475569;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.quick-jump__btn:hover {
  border-color: #1b4f9c;
  color: #1b4f9c;
  background: #f2f6fc;
}
.quick-jump__btn--active {
  background: #1b4f9c;
  border-color: #1b4f9c;
  color: #ffffff;
}
`;

const path = 'frontend/src/exam.css';
const raw = fs.readFileSync(path, 'utf8');
const crlf = raw.includes('\r\n');
const block = crlf ? css.replace(/\n/g, '\r\n') : css;
fs.appendFileSync(path, block, 'utf8');
console.log('appended quick-jump styles to', path);
