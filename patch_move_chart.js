// ---------------------------------------------------------------------------
// Patch: swap page titles and move the Section-wise bar chart.
//   - Analysis page (after submit): title "Performance Analysis" -> "Test
//     Score Summary"; remove the bar chart section from it.
//   - ScoreSummary page (after "Let's Do Analysis"): title "Test Score
//     Summary" -> "Performance Analysis"; replace the subject cards with the
//     bar chart (moved over). Back button label updated to match.
//   - exam.css: drop the now-unused subject-card styles.
// Files are UTF-8 with CRLF line endings; normalize to \n, patch, write back.
// ---------------------------------------------------------------------------
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const APP = path.join(ROOT, 'frontend', 'src', 'App.jsx');
const CSS = path.join(ROOT, 'frontend', 'src', 'exam.css');

const readNormalized = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const writeCrlf = (f, c) => fs.writeFileSync(f, c.replace(/\n/g, '\r\n'), 'utf8');

function replaceOnce(src, needle, replacement, label) {
  const count = src.split(needle).length - 1;
  if (count !== 1) {
    throw new Error(`anchor "${label}" matched ${count} times (expected 1)`);
  }
  return src.split(needle).join(replacement);
}

// ---------------------------------------------------------------------------
// 1) App.jsx
// ---------------------------------------------------------------------------
let app = readNormalized(APP);

// 1a. Swap the two page titles (each anchor is unique via the <p> after it).
app = replaceOnce(
  app,
  '<h1>Performance Analysis</h1>\n        <p className=\"muted\">{result.title} | Submitted',
  '<h1>Test Score Summary</h1>\n        <p className=\"muted\">{result.title} | Submitted',
  'Analysis page h1 (with | Submitted)'
);
app = replaceOnce(
  app,
  '<h1>Test Score Summary</h1>\n        <p className=\"muted\">{result.title} &middot; Submitted',
  '<h1>Performance Analysis</h1>\n        <p className=\"muted\">{result.title} &middot; Submitted',
  'ScoreSummary page h1 (with &middot; Submitted)'
);
// 1b. Back button label on the summary page now points at the other page.
app = replaceOnce(
  app,
  '>Back to Analysis</button>',
  '>Back to Test Score Summary</button>',
  'Back to Analysis button'
);

// 1c. Remove the bar chart section from the Analysis page.
const CHART_SECTION = [
  '      <section className="section-chart">',
  '        <div className="section-chart__head">',
  '          <h2>Section-wise Performance</h2>',
  '          <div className="section-chart__legend">',
  '            <span className="chart-legend-item"><i className="chart-dot chart-dot--correct" />Correct</span>',
  '            <span className="chart-legend-item"><i className="chart-dot chart-dot--incorrect" />Incorrect</span>',
  '            <span className="chart-legend-item"><i className="chart-dot chart-dot--unattempted" />Unattempted</span>',
  '          </div>',
  '        </div>',
  '',
  '        <div className="chart-box">',
  '          <svg viewBox="0 0 660 250" className="chart-svg" role="img" aria-label="Bar graph of marks scored in each subject">',
  '            {[0, 25, 50, 75, 100].map((g) => {',
  '              const gy = 212 - (g / 100) * 172;',
  '              return (',
  '                <g key={g}>',
  '                  <line x1="52" x2="636" y1={gy} y2={gy} className="chart-gridline" />',
  '                  <text x="46" y={gy + 4} className="chart-gridlabel" textAnchor="end">{g}</text>',
  '                </g>',
  '              );',
  '            })}',
  '            {result.sections.map((s, i) => {',
  '              const pct = s.max_marks > 0 ? (s.section_marks / s.max_marks) * 100 : 0;',
  '              const cx = 140 + i * 170;',
  '              const bw = 92;',
  '              const top = 212 - (pct / 100) * 172;',
  '              const bh = Math.max(212 - top, 2);',
  '              return (',
  '                <g key={s.name}>',
  '                  <rect x={cx - bw / 2} y={top} width={bw} height={bh} rx="6" fill={SUBJECT_COLORS[s.name]} opacity="0.92" />',
  '                  <text x={cx} y={top - 22} className="chart-pct" textAnchor="middle">{Math.round(pct)}%</text>',
  '                  <text x={cx} y={top - 6} className="chart-value" textAnchor="middle">',
  '                    {s.section_marks}<tspan className="chart-value-sub">/{s.max_marks}</tspan>',
  '                  </text>',
  '                  <text x={cx} y="236" className="chart-subject" textAnchor="middle">{s.name}</text>',
  '                </g>',
  '              );',
  '            })}',
  '          </svg>',
  '        </div>',
  '',
  '        <div className="chart-breakdown">',
  '          {result.sections.map((s) => {',
  '            const st = sectionStats[s.name] || { correct: 0, incorrect: 0, unattempted: 0 };',
  '            return (',
  '              <div key={s.name} className="chart-breakdown__col">',
  '                <span className="chart-breakdown__subject" style={{ color: SUBJECT_COLORS[s.name] }}>{s.name}</span>',
  '                <span className="chart-breakdown__item chart-breakdown__item--correct">Correct {st.correct}</span>',
  '                <span className="chart-breakdown__item chart-breakdown__item--incorrect">Incorrect {st.incorrect}</span>',
  '                <span className="chart-breakdown__item chart-breakdown__item--unattempted">Unattempted {st.unattempted}</span>',
  '              </div>',
  '            );',
  '          })}',
  '        </div>',
  '      </section>',
  '',
  '      <section className="review-section">',
].join('\n');

app = replaceOnce(
  app,
  CHART_SECTION,
  '      <section className="review-section">',
  'chart section in Analysis'
);

// 1d. Drop the now-unused sectionStats computation in Analysis.
const SECTION_STATS = [
  '  // Per-subject correct/incorrect/unattempted breakdown (from full result).',
  '  const sectionStats = {};',
  '  for (const q of result.questions) {',
  '    const st = sectionStats[q.section] || (sectionStats[q.section] = { correct: 0, incorrect: 0, unattempted: 0 });',
  '    if (q.is_correct) st.correct++;',
  '    else if (q.marks_awarded < 0) st.incorrect++;',
  '    else st.unattempted++;',
  '  }',
  '',
  '  return (',
].join('\n');
app = replaceOnce(app, SECTION_STATS, '  return (', 'sectionStats in Analysis');

// 1e. Replace the subject cards on the ScoreSummary page with the chart.
const CARDS_RE = /      <div className="score-summary-subjects">[\s\S]*?\n      <\/div>\n/;
if (!CARDS_RE.test(app)) {
  throw new Error('anchor not found: score-summary-subjects block');
}

const CHART_IN_SUMMARY = [
  '      <section className="section-chart">',
  '        <div className="section-chart__head">',
  '          <h2>Section-wise Performance</h2>',
  '          <div className="section-chart__legend">',
  '            <span className="chart-legend-item"><i className="chart-dot chart-dot--correct" />Correct</span>',
  '            <span className="chart-legend-item"><i className="chart-dot chart-dot--incorrect" />Incorrect</span>',
  '            <span className="chart-legend-item"><i className="chart-dot chart-dot--unattempted" />Unattempted</span>',
  '          </div>',
  '        </div>',
  '',
  '        <div className="chart-box">',
  '          <svg viewBox="0 0 660 250" className="chart-svg" role="img" aria-label="Bar graph of marks scored in each subject">',
  '            {[0, 25, 50, 75, 100].map((g) => {',
  '              const gy = 212 - (g / 100) * 172;',
  '              return (',
  '                <g key={g}>',
  '                  <line x1="52" x2="636" y1={gy} y2={gy} className="chart-gridline" />',
  '                  <text x="46" y={gy + 4} className="chart-gridlabel" textAnchor="end">{g}</text>',
  '                </g>',
  '              );',
  '            })}',
  '            {result.sections.map((s, i) => {',
  '              const pct = s.max_marks > 0 ? (s.section_marks / s.max_marks) * 100 : 0;',
  '              const cx = 140 + i * 170;',
  '              const bw = 92;',
  '              const top = 212 - (pct / 100) * 172;',
  '              const bh = Math.max(212 - top, 2);',
  '              return (',
  '                <g key={s.name}>',
  '                  <rect x={cx - bw / 2} y={top} width={bw} height={bh} rx="6" fill={SUBJECT_COLORS[s.name]} opacity="0.92" />',
  '                  <text x={cx} y={top - 22} className="chart-pct" textAnchor="middle">{Math.round(pct)}%</text>',
  '                  <text x={cx} y={top - 6} className="chart-value" textAnchor="middle">',
  '                    {s.section_marks}<tspan className="chart-value-sub">/{s.max_marks}</tspan>',
  '                  </text>',
  '                  <text x={cx} y="236" className="chart-subject" textAnchor="middle">{s.name}</text>',
  '                </g>',
  '              );',
  '            })}',
  '          </svg>',
  '        </div>',
  '',
  '        <div className="chart-breakdown">',
  '          {result.sections.map((s) => {',
  '            const st = stats[s.name] || { correct: 0, incorrect: 0, unattempted: 0 };',
  '            return (',
  '              <div key={s.name} className="chart-breakdown__col">',
  '                <span className="chart-breakdown__subject" style={{ color: SUBJECT_COLORS[s.name] }}>{s.name}</span>',
  '                <span className="chart-breakdown__item chart-breakdown__item--correct">Correct {st.correct}</span>',
  '                <span className="chart-breakdown__item chart-breakdown__item--incorrect">Incorrect {st.incorrect}</span>',
  '                <span className="chart-breakdown__item chart-breakdown__item--unattempted">Unattempted {st.unattempted}</span>',
  '              </div>',
  '            );',
  '          })}',
  '        </div>',
  '      </section>',
  '',
].join('\n');

app = app.replace(CARDS_RE, CHART_IN_SUMMARY);
writeCrlf(APP, app);
console.log('[App.jsx] patched OK');

// ---------------------------------------------------------------------------
// 2) exam.css - remove unused subject-card styles.
// ---------------------------------------------------------------------------
let css = readNormalized(CSS);

const SUBJECT_CARDS_CSS = [
  '/* Subject-wise cards */',
  '.score-summary-subjects { margin-top: 6px; }',
  '.score-summary-subjects h2 { font-size: 1.05rem; color: #143a7a; margin-bottom: 14px; }',
  '.score-summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }',
  '.subject-card {',
  '  background: #ffffff;',
  '  border: 1px solid #e6eaf0;',
  '  border-radius: 14px;',
  '  box-shadow: 0 4px 16px rgba(20, 58, 122, 0.05);',
  '  padding: 20px 20px 18px;',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 14px;',
  '  animation: score-summary-rise 0.35s ease-out;',
  '}',
  '.subject-card__head { display: flex; align-items: baseline; justify-content: space-between; }',
  '.subject-card__head h3 { margin: 0; font-size: 1.02rem; }',
  '.subject-card__marks { font-size: 0.85rem; color: #7c8ba1; }',
  '.subject-card__marks strong { font-size: 1.15rem; color: #212b36; }',
  '.subject-card__bar { height: 6px; border-radius: 999px; background: #edf1f6; overflow: hidden; }',
  '.subject-card__bar-fill { height: 100%; border-radius: 999px; }',
  '.subject-card__stats {',
  '  display: grid;',
  '  grid-template-columns: repeat(3, 1fr);',
  '  gap: 8px;',
  '  border-top: 1px solid #f1f4f8;',
  '  padding-top: 14px;',
  '}',
  '.subject-stat { display: flex; flex-direction: column; gap: 3px; align-items: flex-start; }',
  '.subject-stat__dot { width: 8px; height: 8px; border-radius: 999px; }',
  '.subject-stat--correct .subject-stat__dot { background: #16a34a; }',
  '.subject-stat--incorrect .subject-stat__dot { background: #dc2626; }',
  '.subject-stat--unattempted .subject-stat__dot { background: #9aa4b2; }',
  '.subject-stat__label { font-size: 0.7rem; font-weight: 600; color: #7c8ba1; }',
  '.subject-stat--correct strong { color: #067647; }',
  '.subject-stat--incorrect strong { color: #b42318; }',
  '.subject-stat--unattempted strong { color: #667085; }',
  '',
].join('\n');

if (!css.includes(SUBJECT_CARDS_CSS)) {
  throw new Error('[exam.css] subject-card block not found');
}
css = css.split(SUBJECT_CARDS_CSS).join('');

const GRID_MEDIA = '  .score-summary-grid { grid-template-columns: 1fr; }\n';
if (!css.includes(GRID_MEDIA)) {
  throw new Error('[exam.css] score-summary-grid media query not found');
}
css = css.split(GRID_MEDIA).join('');

// Give the chart box the same entrance animation as the rest of the page.
css = css.replace(
  '  box-shadow: 0 4px 16px rgba(20, 58, 122, 0.05);\n  padding: 22px 16px 10px;\n}',
  '  box-shadow: 0 4px 16px rgba(20, 58, 122, 0.05);\n  padding: 22px 16px 10px;\n  animation: score-summary-rise 0.35s ease-out;\n}'
);

writeCrlf(CSS, css);
console.log('[exam.css] patched OK');
