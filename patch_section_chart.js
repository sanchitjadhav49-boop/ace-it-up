// ---------------------------------------------------------------------------
// Patch: convert the "Section-wise Performance" cards on the Analysis page
// into a professional SVG bar graph (gridlines, value labels, per-subject
// breakdown row). Files are UTF-8 with CRLF line endings; normalize to \n,
// patch, write back with \r\n.
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
// 1) App.jsx - new section markup (SVG bar chart + breakdown row)
// ---------------------------------------------------------------------------
let app = readNormalized(APP);

const OLD_MARKUP = [
  '      <section className="section-scores">',
  '        <h2>Section-wise Performance</h2>',
  '        <div className="section-scores__grid">',
  '          {result.sections.map((s) => {',
  '            const spct = s.max_marks > 0 ? (s.section_marks / s.max_marks) * 100 : 0;',
  '            return (',
  '              <div key={s.name} className="section-score-card">',
  '                <div className="section-score-card__head">',
  '                  <h3 style={{ color: SUBJECT_COLORS[s.name] }}>{s.name}</h3>',
  '                  <span>{s.correct_count}/{s.question_count} correct</span>',
  '                </div>',
  '                <div className="section-bar">',
  '                  <div',
  '                    className="section-bar__fill"',
  '                    style={{ width: `${spct}%`, background: SUBJECT_COLORS[s.name] }}',
  '                  />',
  '                </div>',
  '                <p className="section-score-card__marks">',
  '                  <strong>{s.section_marks}</strong> / {s.max_marks} marks',
  '                </p>',
  '                <div className="section-score-card__stats">',
  '                  <span className="mini-chip mini-chip--correct">Correct {sectionStats[s.name] ? sectionStats[s.name].correct : 0}</span>',
  '                  <span className="mini-chip mini-chip--incorrect">Incorrect {sectionStats[s.name] ? sectionStats[s.name].incorrect : 0}</span>',
  '                  <span className="mini-chip mini-chip--unattempted">Unattempted {sectionStats[s.name] ? sectionStats[s.name].unattempted : 0}</span>',
  '                </div>',
  '              </div>',
  '            );',
  '          })}',
  '        </div>',
  '      </section>',
].join('\n');

const NEW_MARKUP = [
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
].join('\n');

app = replaceOnce(app, OLD_MARKUP, NEW_MARKUP, 'section-scores markup');
writeCrlf(APP, app);
console.log('[App.jsx] patched OK');

// ---------------------------------------------------------------------------
// 2) exam.css - replace card styles with chart styles
// ---------------------------------------------------------------------------
let css = readNormalized(CSS);

const OLD_CSS = [
  '.section-scores { margin-bottom: 26px; }',
  '.section-scores h2 { font-size: 1.1rem; margin-bottom: 12px; color: #143a7a; }',
  '.section-scores__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }',
  '',
  '.section-score-card {',
  '  background: #ffffff;',
  '  border: 1px solid #d8dde4;',
  '  border-radius: 6px;',
  '  padding: 16px;',
  '}',
  '.section-score-card__head {',
  '  display: flex;',
  '  justify-content: space-between;',
  '  align-items: baseline;',
  '  gap: 8px;',
  '  margin-bottom: 10px;',
  '}',
  '.section-score-card__head h3 { margin: 0; font-size: 1rem; }',
  '.section-score-card__head span { font-size: 0.8rem; color: #64748b; }',
  '.section-bar {',
  '  height: 8px;',
  '  background: #eef1f5;',
  '  border-radius: 999px;',
  '  overflow: hidden;',
  '}',
  '.section-bar__fill { height: 100%; border-radius: 999px; }',
  '.section-score-card__marks { margin: 10px 0 0; font-size: 0.9rem; color: #475569; }',
  '.section-score-card__marks strong { color: #143a7a; }',
  '',
].join('\n');

if (!css.includes(OLD_CSS)) {
  throw new Error('[exam.css] section-scores block not found');
}
css = css.split(OLD_CSS).join('');

const NEW_CSS = [
  '/* Section-wise performance bar chart */',
  '.section-chart { margin-bottom: 28px; }',
  '.section-chart__head {',
  '  display: flex;',
  '  justify-content: space-between;',
  '  align-items: baseline;',
  '  gap: 12px;',
  '  flex-wrap: wrap;',
  '  margin-bottom: 14px;',
  '}',
  '.section-chart__head h2 { font-size: 1.1rem; margin: 0; color: #143a7a; }',
  '.section-chart__legend { display: flex; gap: 16px; }',
  '.chart-legend-item {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  gap: 6px;',
  '  font-size: 0.8rem;',
  '  font-weight: 600;',
  '  color: #475569;',
  '}',
  '.chart-dot { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }',
  '.chart-dot--correct { background: #16a34a; }',
  '.chart-dot--incorrect { background: #dc2626; }',
  '.chart-dot--unattempted { background: #9aa4b2; }',
  '',
  '.chart-box {',
  '  background: #ffffff;',
  '  border: 1px solid #e6eaf0;',
  '  border-radius: 14px;',
  '  box-shadow: 0 4px 16px rgba(20, 58, 122, 0.05);',
  '  padding: 22px 16px 10px;',
  '}',
  '.chart-svg { width: 100%; height: auto; display: block; }',
  '.chart-gridline { stroke: #eef1f6; stroke-width: 1; }',
  '.chart-gridlabel { font-size: 11px; fill: #9aa4b2; font-weight: 600; }',
  '.chart-value { font-size: 15px; font-weight: 800; fill: #143a7a; }',
  '.chart-value-sub { font-size: 11px; fill: #7c8ba1; font-weight: 600; }',
  '.chart-pct { font-size: 11px; fill: #7c8ba1; font-weight: 700; }',
  '.chart-subject { font-size: 13px; font-weight: 700; fill: #475569; }',
  '',
  '.chart-breakdown {',
  '  display: grid;',
  '  grid-template-columns: repeat(3, 1fr);',
  '  gap: 14px;',
  '  margin-top: 16px;',
  '  padding: 14px 8px 0;',
  '  border-top: 1px solid #eef1f5;',
  '}',
  '.chart-breakdown__col { display: flex; flex-direction: column; gap: 4px; text-align: center; }',
  '.chart-breakdown__subject { font-weight: 800; font-size: 0.9rem; margin-bottom: 2px; }',
  '.chart-breakdown__item { font-size: 0.82rem; font-weight: 600; color: #475569; }',
  '.chart-breakdown__item--correct { color: #067647; }',
  '.chart-breakdown__item--incorrect { color: #b42318; }',
  '.chart-breakdown__item--unattempted { color: #667085; }',
  '',
  '@media (max-width: 640px) {',
  '  .section-chart__head { flex-direction: column; align-items: flex-start; }',
  '  .chart-breakdown { grid-template-columns: 1fr; gap: 10px; }',
  '}',
  '',
].join('\n');

css = css.replace('/* review list */', NEW_CSS + '/* review list */');

// Update dark-mode overrides for the new chart classes.
const OLD_DARK = [
  'body.dark .section-score-card__stats { border-top-color: #2c2f38; }',
  'body.dark .mini-chip--correct { background: #14532d; color: #bbf7d0; }',
  'body.dark .mini-chip--incorrect { background: #7f1d1d; color: #fecaca; }',
  'body.dark .mini-chip--unattempted { background: #374151; color: #d1d5db; }',
].join('\n');
const NEW_DARK = [
  'body.dark .section-chart__head h2 { color: #e5e7eb; }',
  'body.dark .chart-legend-item { color: #9ca3af; }',
  'body.dark .chart-box { background: #1f2229; border-color: #3a3e48; }',
  'body.dark .chart-gridline { stroke: #2c2f38; }',
  'body.dark .chart-gridlabel { fill: #9ca3af; }',
  'body.dark .chart-value { fill: #e5e7eb; }',
  'body.dark .chart-value-sub { fill: #9ca3af; }',
  'body.dark .chart-pct { fill: #9ca3af; }',
  'body.dark .chart-subject { fill: #d1d5db; }',
  'body.dark .chart-breakdown { border-top-color: #2c2f38; }',
  'body.dark .chart-breakdown__item { color: #9ca3af; }',
  'body.dark .chart-breakdown__item--correct { color: #bbf7d0; }',
  'body.dark .chart-breakdown__item--incorrect { color: #fecaca; }',
  'body.dark .chart-breakdown__item--unattempted { color: #d1d5db; }',
].join('\n');

if (!css.includes(OLD_DARK)) {
  throw new Error('[exam.css] dark-mode mini-chip block not found');
}
css = css.split(OLD_DARK).join(NEW_DARK);

writeCrlf(CSS, css);
console.log('[exam.css] patched OK');
