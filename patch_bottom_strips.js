'use strict';
// User wants:
//  - NO bottom strips at all (remove the quick-jump strip AND the 1-75
//    "Go To" number strip below the exam).
//  - The subject+type quick-jump strip (Maths MCQ / Maths Numerical / ...)
//    moved to the TOP, just under the section tabs.
const fs = require('fs');

function patchFile(path, pairs) {
  const raw = fs.readFileSync(path, 'utf8');
  const crlf = raw.includes('\r\n');
  const src = raw.replace(/\r\n/g, '\n');
  for (const [oldStr, newStr] of pairs) {
    const n = src.split(oldStr).length - 1;
    if (n !== 1) throw new Error(`${path}: pattern found ${n} times (expected 1): ${oldStr.split('\n')[0].slice(0, 70)}`);
  }
  let out = src;
  for (const [oldStr, newStr] of pairs) out = out.replace(oldStr, newStr);
  fs.writeFileSync(path, crlf ? out.replace(/\n/g, '\r\n') : out, 'utf8');
  console.log('patched', path);
}

// 1) Groups: back to 6 subject+type entries.
const oldGroups = `const QUICK_JUMP_GROUPS = [
  { section: 'Physics', label: 'Physics' },
  { section: 'Chemistry', label: 'Chemistry' },
  { section: 'Mathematics', label: 'Mathematics' },
];`;
const newGroups = `const QUICK_JUMP_GROUPS = [
  { section: 'Mathematics', type: 'mcq', label: 'Maths MCQ' },
  { section: 'Mathematics', type: 'numerical', label: 'Maths Numerical' },
  { section: 'Physics', type: 'mcq', label: 'Physics MCQ' },
  { section: 'Physics', type: 'numerical', label: 'Physics Numerical' },
  { section: 'Chemistry', type: 'mcq', label: 'Chemistry MCQ' },
  { section: 'Chemistry', type: 'numerical', label: 'Chemistry Numerical' },
];`;

// 2) Index lookup: subject + type.
const oldFind = `      const index = allQuestions.findIndex((q) => q.sectionName === g.section);`;
const newFind = `      const index = allQuestions.findIndex(
        (q) => q.sectionName === g.section && q.question_type === g.type
      );`;

// 3) Remove the whole bottom block (subject strip + Go To number strip).
const oldBottom = `      <nav className="quick-jump" aria-label="Jump to section">
        {quickJumps.map((g) => (
          <button
            key={g.label}
            className={\`section-tab\${question.sectionName === g.section ? ' section-tab--active' : ''}\`}
            onClick={() => goTo(g.index)}
            title={\`Jump to \${g.label} (Q\${g.index + 1})\`}
          >
            <span className="section-tab__name">{g.label}</span>
          </button>
        ))}
      </nav>

      <nav className="goto-bar" aria-label="Go to question">
        <span className="goto-bar__label">Go To</span>
        <div className="goto-bar__links">
          {allQuestions.map((q, i) => (
            <button
              key={q.id}
              className={\`goto-btn goto-btn--\${paletteState(q, i)}\${i === current ? ' goto-btn--current' : ''}\`}
              onClick={() => goTo(i)}
              title={\`\${q.sectionName} Q\${i + 1}\`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </nav>

      <button className="palette-toggle" onClick={() => setShowPalette(true)}>`;
const newBottom = `      <button className="palette-toggle" onClick={() => setShowPalette(true)}>`;

// 4) Insert the subject+type strip at the TOP, right after the section tabs.
const oldTop = `      </nav>

      <div className="exam-layout">`;
const newTop = `      </nav>

      <nav className="quick-jump" aria-label="Jump to section and question type">
        {quickJumps.map((g) => (
          <button
            key={g.label}
            className={\`quick-jump__btn\${question.sectionName === g.section && question.question_type === g.type ? ' quick-jump__btn--active' : ''}\`}
            onClick={() => goTo(g.index)}
            title={\`Jump to \${g.label} (Q\${g.index + 1})\`}
          >
            {g.label}
          </button>
        ))}
      </nav>

      <div className="exam-layout">`;

patchFile('frontend/src/App.jsx', [
  [oldGroups, newGroups],
  [oldFind, newFind],
  [oldBottom, newBottom],
  [oldTop, newTop],
]);

// 5) CSS: switch .quick-jump back to chip buttons sitting at the top
//    (margin-bottom instead of margin-top; remove the .section-tab reuse).
const cssPath = 'frontend/src/exam.css';
const rawCss = fs.readFileSync(cssPath, 'utf8');
const crlf = rawCss.includes('\r\n');
const css = rawCss.replace(/\r\n/g, '\n');
const marker = '/* ======================== QUICK-JUMP STRIP ========================= */';
const idx = css.indexOf(marker);
if (idx < 0) throw new Error('quick-jump CSS marker not found');
const newBlock = `/* ======================== QUICK-JUMP STRIP ========================= */
/* Subject+type quick jump, shown at the TOP just under the section tabs. */
.quick-jump {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
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
const outCss = css.slice(0, idx) + newBlock;
fs.writeFileSync(cssPath, crlf ? outCss.replace(/\n/g, '\r\n') : outCss, 'utf8');
console.log('updated quick-jump styles in', cssPath);
