'use strict';
// Adds a quick-jump strip above the "Go To" bar:
//   Maths MCQ | Maths Numerical | Physics MCQ | Physics Numerical |
//   Chemistry MCQ | Chemistry Numerical
// Each button jumps straight to the first question of that group.
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

// 1) Module-level list of jump groups (order shown on the strip).
const oldColors = `const SUBJECT_COLORS = { Physics: '#2563eb', Chemistry: '#7c3aed', Mathematics: '#059669' };`;
const newColors = `const SUBJECT_COLORS = { Physics: '#2563eb', Chemistry: '#7c3aed', Mathematics: '#059669' };

// Quick-jump groups for the strip above the "Go To" bar: subject + type,
// in display order (Maths first, MCQ before numerical, as on the real CBT).
const QUICK_JUMP_GROUPS = [
  { section: 'Mathematics', type: 'mcq', label: 'Maths MCQ' },
  { section: 'Mathematics', type: 'numerical', label: 'Maths Numerical' },
  { section: 'Physics', type: 'mcq', label: 'Physics MCQ' },
  { section: 'Physics', type: 'numerical', label: 'Physics Numerical' },
  { section: 'Chemistry', type: 'mcq', label: 'Chemistry MCQ' },
  { section: 'Chemistry', type: 'numerical', label: 'Chemistry Numerical' },
];`;

// 2) Compute first-question index of each group (inside the component).
const oldCounts = `  const paletteCounts = useMemo(() => {`;
const newCounts = `  // First question index for every quick-jump group; null if a group is empty.
  const quickJumps = useMemo(() =>
    QUICK_JUMP_GROUPS.map((g) => {
      const index = allQuestions.findIndex(
        (q) => q.sectionName === g.section && q.question_type === g.type
      );
      return index >= 0 ? { ...g, index } : null;
    }).filter(Boolean),
    [allQuestions]
  );

  const paletteCounts = useMemo(() => {`;

// 3) Render the strip directly above the "Go To" bar.
const oldGoto = `      <nav className="goto-bar" aria-label="Go to question">`;
const newGoto = `      <nav className="quick-jump" aria-label="Jump to section and question type">
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

      <nav className="goto-bar" aria-label="Go to question">`;

patchFile('frontend/src/App.jsx', [
  [oldColors, newColors],
  [oldCounts, newCounts],
  [oldGoto, newGoto],
]);
