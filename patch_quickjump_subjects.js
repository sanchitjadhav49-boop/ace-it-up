'use strict';
// Rework the quick-jump strip: 6 subject+type buttons -> 3 subject buttons
// (Physics | Chemistry | Mathematics), styled exactly like the section tabs.
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

// 1) Groups: one per subject, jumping to the section's first question.
const oldGroups = `const QUICK_JUMP_GROUPS = [
  { section: 'Mathematics', type: 'mcq', label: 'Maths MCQ' },
  { section: 'Mathematics', type: 'numerical', label: 'Maths Numerical' },
  { section: 'Physics', type: 'mcq', label: 'Physics MCQ' },
  { section: 'Physics', type: 'numerical', label: 'Physics Numerical' },
  { section: 'Chemistry', type: 'mcq', label: 'Chemistry MCQ' },
  { section: 'Chemistry', type: 'numerical', label: 'Chemistry Numerical' },
];`;
const newGroups = `const QUICK_JUMP_GROUPS = [
  { section: 'Physics', label: 'Physics' },
  { section: 'Chemistry', label: 'Chemistry' },
  { section: 'Mathematics', label: 'Mathematics' },
];`;

// 2) First question of each subject.
const oldFind = `      const index = allQuestions.findIndex(
        (q) => q.sectionName === g.section && q.question_type === g.type
      );`;
const newFind = `      const index = allQuestions.findIndex((q) => q.sectionName === g.section);`;

// 3) Render as section tabs (same look as the strip above).
const oldRender = `      <nav className="quick-jump" aria-label="Jump to section and question type">
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
      </nav>`;
const newRender = `      <nav className="quick-jump" aria-label="Jump to section">
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
      </nav>`;

patchFile('frontend/src/App.jsx', [
  [oldGroups, newGroups],
  [oldFind, newFind],
  [oldRender, newRender],
]);

// 4) CSS: replace the quick-jump block at the end of exam.css.
const cssPath = 'frontend/src/exam.css';
const rawCss = fs.readFileSync(cssPath, 'utf8');
const crlf = rawCss.includes('\r\n');
const css = rawCss.replace(/\r\n/g, '\n');
const marker = '/* ======================== QUICK-JUMP STRIP ========================= */';
const idx = css.indexOf(marker);
if (idx < 0) throw new Error('quick-jump CSS marker not found');
const newBlock = `/* ======================== QUICK-JUMP STRIP ========================= */
/* Reuses the section-tab look so the bottom strip matches the top one. */
.quick-jump {
  display: flex;
  gap: 0;
  margin-top: 14px;
  border: 1px solid #c3ccd8;
  background: #ffffff;
  border-radius: 4px;
  overflow: hidden;
  flex-wrap: wrap;
}
.quick-jump .section-tab {
  flex: 1 1 auto;
  justify-content: center;
  min-width: 140px;
}
`;
const outCss = css.slice(0, idx) + newBlock;
fs.writeFileSync(cssPath, crlf ? outCss.replace(/\n/g, '\r\n') : outCss, 'utf8');
console.log('replaced quick-jump styles in', cssPath);
