const fs = require('fs');
const file = 'frontend/src/exam.css';
let s = fs.readFileSync(file, 'utf8');
const CRLF = '\r\n';
const eol = s.includes('\r\n') ? '\r\n' : '\n';

const css = `/* ============================================================================
   ERROR DISTRIBUTION PAGE  (.ed-*)
   ============================================================================ */

.ed-progress { display: flex; align-items: center; gap: 12px; margin: 0 0 16px; }
.ed-progress__bar { flex: 1; height: 10px; border-radius: 999px; background: #e8edf4; overflow: hidden; }
body.dark .ed-progress__bar { background: #2c2f38; }
.ed-progress__fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #1b4f9c, #3b82f6); transition: width 0.25s ease; }
.ed-progress__label { font-size: 0.85rem; font-weight: 700; color: #1b4f9c; white-space: nowrap; }

.ed-palette { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 6px; margin: 0 0 14px; }
.ed-palette__cell { padding: 6px 0; border: 1px solid #d1d9e6; border-radius: 8px; background: #fff; color: #475569; font-family: inherit; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.12s; }
.ed-palette__cell:hover { border-color: #1b4f9c; color: #1b4f9c; }
.ed-palette__cell--done { background: #e8f0fb; border-color: #1b4f9c; color: #1b4f9c; }
body.dark .ed-palette__cell { background: #1f2229; border-color: #2c2f38; color: #d1d5db; }
body.dark .ed-palette__cell--done { background: #14233d; border-color: #1b4f9c; color: #93b4e8; }

.ed-hint { margin: 0 0 14px; }

.ed-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.ed-question { border: 1px solid #d1d9e6; border-radius: 12px; background: #fff; padding: 12px 14px; transition: border-color 0.15s, box-shadow 0.15s; }
.ed-question--done { border-color: #9db8e0; box-shadow: 0 1px 3px rgba(27, 79, 156, 0.12); }
body.dark .ed-question { background: #1f2229; border-color: #2c2f38; }
body.dark .ed-question--done { border-color: #1b4f9c; }
.ed-question__meta { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
.ed-question__num { font-weight: 800; font-size: 0.9rem; color: #143a7a; min-width: 34px; }
.ed-question__body { margin: 0; flex: 1; min-width: 200px; font-size: 0.88rem; color: #334155; line-height: 1.5; }
body.dark .ed-question__body { color: #d1d5db; }
.ed-options { display: flex; flex-wrap: wrap; gap: 6px; }
.ed-option { padding: 6px 12px; border: 1px solid #d1d9e6; border-radius: 999px; background: #f8fafc; color: #475569; font-family: inherit; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.12s; }
.ed-option:hover { border-color: #1b4f9c; color: #1b4f9c; }
.ed-option--active { border-color: transparent; }
body.dark .ed-option { background: #2c2f38; border-color: #3a3e48; color: #d1d5db; }

.ed-report-bar { text-align: center; padding: 18px 0 8px; }
.ed-report-btn { font-size: 1rem; padding: 12px 36px; }

.ed-report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 0 0 24px; }
.ed-report-card { border: 1px solid #d1d9e6; border-radius: 12px; background: #fff; padding: 16px; }
.ed-report-card h2 { margin: 0 0 4px; }
body.dark .ed-report-card { background: #1f2229; border-color: #2c2f38; }

.ed-pie { display: flex; justify-content: center; padding-top: 6px; }

.ed-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.ed-legend__row { display: flex; align-items: center; gap: 8px; font-size: 0.88rem; }
.ed-legend__label { flex: 1; font-weight: 600; color: #334155; }
body.dark .ed-legend__label { color: #d1d5db; }
.ed-legend__count { color: #64748b; font-size: 0.8rem; font-weight: 700; }
.ed-legend__pct { min-width: 48px; text-align: right; font-weight: 800; color: #143a7a; font-variant-numeric: tabular-nums; }

.ed-type-cell { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; color: #334155; }
body.dark .ed-type-cell { color: #d1d5db; }
.ed-count-cell { font-weight: 800; color: #143a7a; text-align: center; white-space: nowrap; }
.ed-qnos { line-height: 1.7; color: #334155; }
body.dark .ed-qnos { color: #d1d5db; }

.ed-empty { border: 1px dashed #86d9a5; background: #e9f9ee; color: #166534; border-radius: 12px; padding: 28px; text-align: center; font-weight: 600; margin-bottom: 24px; }

@media (max-width: 720px) {
  .ed-report-grid { grid-template-columns: 1fr; }
}
`;

// ensure exactly one blank line between the existing content and the new block
const trimmed = s.replace(/\s+$/, '');
fs.writeFileSync(file, trimmed + eol + eol + css.replace(/\n/g, eol), 'utf8');
console.log('APPENDED', file, '->', fs.readFileSync(file, 'utf8').length, 'bytes');
