// ---------------------------------------------------------------------------
// Patch: add a one-page "Test Score Summary" (fintech-dashboard style) that
// opens when the user clicks "Let's Do Analysis" on the Performance Analysis
// page. Replaces the old data-boundaries splash/page flow.
//
//  1. App.jsx  - add ScoreSummary component, rewire Analysis state/button,
//                remove DataBoundariesSplash flow.
//  2. exam.css - drop unused data-boundaries styles, append ScoreSummary CSS.
//
// Files are UTF-8 with CRLF line endings; we normalize to \n, patch, and
// write back with \r\n so the rest of the toolchain is unaffected.
// ---------------------------------------------------------------------------
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const APP = path.join(ROOT, 'frontend', 'src', 'App.jsx');
const CSS = path.join(ROOT, 'frontend', 'src', 'exam.css');

function readNormalized(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function writeCrlf(file, content) {
  fs.writeFileSync(file, content.replace(/\n/g, '\r\n'), 'utf8');
}

// Replace exactly once; throw if the anchor is missing so we never silently
// ship a half-patched file.
function replaceOnce(src, needle, replacement, label) {
  if (!src.includes(needle)) {
    throw new Error(`[App.jsx] anchor not found: ${label}`);
  }
  const count = src.split(needle).length - 1;
  if (count !== 1) {
    throw new Error(`[App.jsx] anchor "${label}" matched ${count} times (expected 1)`);
  }
  return src.split(needle).join(replacement);
}

// ---------------------------------------------------------------------------
// 1) App.jsx
// ---------------------------------------------------------------------------
let app = readNormalized(APP);

// 1a. Collapse the two data-boundaries state hooks into one showSummary hook.
app = replaceOnce(
  app,
  [
    '  const [showDataBoundariesPage, setShowDataBoundariesPage] = useState(false);',
    '  const [showDataBoundariesSplash, setShowDataBoundariesSplash] = useState(false);',
  ].join('\n'),
  '  const [showSummary, setShowSummary] = useState(false);',
  'data-boundaries state hooks'
);

// 1b. Remove the splash -> page timer effect.
app = replaceOnce(
  app,
  [
    '  useEffect(() => {',
    '    if (!showDataBoundariesSplash) return undefined;',
    '    const pageTimer = setTimeout(() => {',
    '      setShowDataBoundariesSplash(false);',
    '      setShowDataBoundariesPage(true);',
    '    }, 2600);',
    '    return () => clearTimeout(pageTimer);',
    '  }, [showDataBoundariesSplash]);',
    '',
  ].join('\n'),
  '',
  'data-boundaries useEffect'
);

// 1c. The data-boundaries page branch becomes the ScoreSummary branch.
app = replaceOnce(
  app,
  [
    '  if (showDataBoundariesPage) {',
    '    return (',
    '      <div className="data-boundaries-page">',
    '        <div className="data-boundaries-page__mark" aria-hidden="true">A</div>',
    '        <p className="data-boundaries-page__eyebrow">AceIT Up</p>',
    '        <h1>Respect Data Boundaries</h1>',
    '        <p>Thoughtful analysis starts with clear limits, careful handling, and respect for every learner&apos;s data.</p>',
    '        <button className="btn-primary" onClick={onBackHome}>Back to Home</button>',
    '      </div>',
    '    );',
    '  }',
  ].join('\n'),
  [
    '  if (showSummary) {',
    '    return (',
    '      <ScoreSummary',
    '        result={result}',
    '        onBack={() => setShowSummary(false)}',
    '        onBackHome={onBackHome}',
    '      />',
    '    );',
    '  }',
  ].join('\n'),
  'showDataBoundariesPage branch'
);

// 1d. "Let's Do Analysis" now opens the summary instead of the splash.
app = replaceOnce(
  app,
  'onClick={() => setShowDataBoundariesSplash(true)}',
  'onClick={() => setShowSummary(true)}',
  'Let\\\'s Do Analysis onClick'
);

// 1e. Drop the splash element from the analysis page.
app = replaceOnce(
  app,
  '      {showDataBoundariesSplash && <DataBoundariesSplash />}\n',
  '',
  'DataBoundariesSplash render'
);

// 1f. Remove the now-dead DataBoundariesSplash component.
const splashFn = /function DataBoundariesSplash\(\) \{[\s\S]*?\n\}\n\n/;
if (!splashFn.test(app)) {
  throw new Error('[App.jsx] anchor not found: DataBoundariesSplash function');
}
app = app.replace(splashFn, '');

// 1g. Insert the ScoreSummary component just before ReviewItem.
const SCORE_SUMMARY_SOURCE = [
  '// ---------------------------------------------------------------------------',
  '// ScoreSummary - one-page test score report (opened from the analysis header).',
  '// ---------------------------------------------------------------------------',
  'function ScoreSummary({ result, onBack, onBackHome }) {',
  '  const o = result.overall;',
  '  const pct = o.max_marks > 0 ? Math.round((o.total_marks / o.max_marks) * 100) : 0;',
  '  const R = 52;',
  '  const CIRC = 2 * Math.PI * R;',
  '  const dash = (pct / 100) * CIRC;',
  '',
  '  // Per-subject correct / incorrect / unattempted counts (from questions).',
  '  const stats = {};',
  '  for (const q of result.questions) {',
  '    const st = stats[q.section] || (stats[q.section] = { correct: 0, incorrect: 0, unattempted: 0 });',
  '    if (q.is_correct) st.correct++;',
  '    else if (q.marks_awarded < 0) st.incorrect++;',
  '    else st.unattempted++;',
  '  }',
  '',
  '  return (',
  '    <div className="score-summary-page">',
  '      <header className="score-summary-header">',
  '        <button className="btn-ghost" onClick={onBack}>Back to Analysis</button>',
  '        <button className="btn-ghost" onClick={onBackHome}>Home</button>',
  '      </header>',
  '',
  '      <div className="score-summary-title">',
  '        <h1>Test Score Summary</h1>',
  '        <p className="muted">{result.title} &middot; Submitted {new Date(result.submitted_at).toLocaleString()}</p>',
  '      </div>',
  '',
  '      <section className="score-summary-total">',
  '        <div className="score-summary-total__info">',
  '          <span className="score-summary-total__label">Total Score</span>',
  '          <div className="score-summary-total__value">',
  '            <strong>{o.total_marks}</strong>',
  '            <span>/ {o.max_marks}</span>',
  '          </div>',
  '          <div className="score-summary-total__chips">',
  '            <span className="sum-chip sum-chip--correct">{o.correct} Correct</span>',
  '            <span className="sum-chip sum-chip--incorrect">{o.incorrect} Incorrect</span>',
  '            <span className="sum-chip sum-chip--unattempted">{o.unattempted} Unattempted</span>',
  '          </div>',
  '        </div>',
  '        <div className="score-summary-total__ring">',
  '          <svg viewBox="0 0 120 120" className="ring" role="img" aria-label={pct + \'% score\'}>',
  '            <circle className="ring__track" cx="60" cy="60" r={R} />',
  '            <circle',
  '              className="ring__fill"',
  '              cx="60" cy="60" r={R}',
  '              strokeDasharray={dash + \' \' + (CIRC - dash)}',
  '            />',
  '          </svg>',
  '          <div className="ring__center">',
  '            <strong>{pct}%</strong>',
  '            <span>Score</span>',
  '          </div>',
  '        </div>',
  '      </section>',
  '',
  '      <div className="score-summary-subjects">',
  '        <h2>Subject-wise Performance</h2>',
  '        <div className="score-summary-grid">',
  '          {result.sections.map((s) => {',
  '            const st = stats[s.name] || { correct: 0, incorrect: 0, unattempted: 0 };',
  '            const spct = s.max_marks > 0 ? Math.round((s.section_marks / s.max_marks) * 100) : 0;',
  '            return (',
  '              <article key={s.name} className="subject-card">',
  '                <div className="subject-card__head">',
  '                  <h3 style={{ color: SUBJECT_COLORS[s.name] }}>{s.name}</h3>',
  '                  <span className="subject-card__marks">',
  '                    <strong>{s.section_marks}</strong> / {s.max_marks}',
  '                  </span>',
  '                </div>',
  '                <div className="subject-card__bar">',
  '                  <div',
  '                    className="subject-card__bar-fill"',
  '                    style={{ width: spct + \'%\', background: SUBJECT_COLORS[s.name] }}',
  '                  />',
  '                </div>',
  '                <div className="subject-card__stats">',
  '                  <div className="subject-stat subject-stat--correct">',
  '                    <span className="subject-stat__dot" />',
  '                    <span className="subject-stat__label">Correct</span>',
  '                    <strong>{st.correct}</strong>',
  '                  </div>',
  '                  <div className="subject-stat subject-stat--incorrect">',
  '                    <span className="subject-stat__dot" />',
  '                    <span className="subject-stat__label">Incorrect</span>',
  '                    <strong>{st.incorrect}</strong>',
  '                  </div>',
  '                  <div className="subject-stat subject-stat--unattempted">',
  '                    <span className="subject-stat__dot" />',
  '                    <span className="subject-stat__label">Unattempted</span>',
  '                    <strong>{st.unattempted}</strong>',
  '                  </div>',
  '                </div>',
  '              </article>',
  '            );',
  '          })}',
  '        </div>',
  '      </div>',
  '    </div>',
  '  );',
  '}',
  '',
].join('\n');

const reviewAnchor = '// ---------------------------------------------------------------------------\n// ReviewItem - one graded question in the analysis screen.';
if (!app.includes(reviewAnchor)) {
  throw new Error('[App.jsx] anchor not found: ReviewItem comment');
}
app = app.split(reviewAnchor).join(SCORE_SUMMARY_SOURCE + reviewAnchor);

writeCrlf(APP, app);
console.log('[App.jsx] patched OK');

// ---------------------------------------------------------------------------
// 2) exam.css
// ---------------------------------------------------------------------------
let css = readNormalized(CSS);
const cssLines = css.split('\n');

// Find the exact data-boundaries block by anchor lines (not hard-coded
// numbers) so the patch survives unrelated CSS edits.
const blockStart = cssLines.findIndex((l) => l.trim() === '.data-boundaries-splash {');
const blockEnd = cssLines.findIndex((l) => l.trim().startsWith('.score-hero {'));
if (blockStart < 0 || blockEnd < 0 || blockEnd <= blockStart) {
  throw new Error('[exam.css] could not locate data-boundaries CSS block');
}
cssLines.splice(blockStart, blockEnd - blockStart);
css = cssLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

const SUMMARY_CSS = [
  '/* ====================== TEST SCORE SUMMARY PAGE ====================== */',
  '.score-summary-page { max-width: 860px; margin: 0 auto; padding: 28px 20px 72px; }',
  '.score-summary-header { display: flex; justify-content: space-between; margin-bottom: 26px; }',
  '.score-summary-title { text-align: center; margin-bottom: 28px; }',
  '.score-summary-title h1 { font-size: 1.6rem; color: #143a7a; margin-bottom: 6px; }',
  '.score-summary-title .muted { margin: 0; }',
  '',
  '/* Big total score card */',
  '.score-summary-total {',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: space-between;',
  '  gap: 32px;',
  '  flex-wrap: wrap;',
  '  background: #ffffff;',
  '  border: 1px solid #e6eaf0;',
  '  border-radius: 16px;',
  '  box-shadow: 0 6px 24px rgba(20, 58, 122, 0.07);',
  '  padding: 32px 36px;',
  '  margin-bottom: 30px;',
  '  animation: score-summary-rise 0.35s ease-out;',
  '}',
  '.score-summary-total__label {',
  '  font-size: 0.78rem;',
  '  font-weight: 700;',
  '  letter-spacing: 0.1em;',
  '  text-transform: uppercase;',
  '  color: #7c8ba1;',
  '}',
  '.score-summary-total__value { display: flex; align-items: baseline; gap: 8px; margin: 8px 0 16px; }',
  '.score-summary-total__value strong { font-size: 3.4rem; font-weight: 800; line-height: 1; color: #143a7a; }',
  '.score-summary-total__value span { font-size: 1.1rem; font-weight: 600; color: #7c8ba1; }',
  '.score-summary-total__chips { display: flex; gap: 10px; flex-wrap: wrap; }',
  '.sum-chip {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  gap: 6px;',
  '  padding: 7px 13px;',
  '  border-radius: 999px;',
  '  font-size: 0.82rem;',
  '  font-weight: 700;',
  '  border: 1px solid transparent;',
  '}',
  '.sum-chip--correct { background: #ecfdf3; color: #067647; border-color: #a6f4c5; }',
  '.sum-chip--incorrect { background: #fef3f2; color: #b42318; border-color: #fecdca; }',
  '.sum-chip--unattempted { background: #f6f8fb; color: #667085; border-color: #e4e9f0; }',
  '',
  '/* Circular progress ring */',
  '.score-summary-total__ring { position: relative; width: 132px; height: 132px; flex-shrink: 0; }',
  '.ring { width: 100%; height: 100%; }',
  '.ring__track { fill: none; stroke: #edf1f6; stroke-width: 10; }',
  '.ring__fill {',
  '  fill: none;',
  '  stroke: #1b4f9c;',
  '  stroke-width: 10;',
  '  stroke-linecap: round;',
  '  transform: rotate(-90deg);',
  '  transform-origin: center;',
  '  transition: stroke-dasharray 0.6s ease;',
  '}',
  '.ring__center {',
  '  position: absolute;',
  '  inset: 0;',
  '  display: flex;',
  '  flex-direction: column;',
  '  align-items: center;',
  '  justify-content: center;',
  '  gap: 2px;',
  '}',
  '.ring__center strong { font-size: 1.55rem; font-weight: 800; color: #143a7a; line-height: 1; }',
  '.ring__center span { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #7c8ba1; }',
  '',
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
  '@keyframes score-summary-rise {',
  '  from { opacity: 0; transform: translateY(8px); }',
  '  to { opacity: 1; transform: translateY(0); }',
  '}',
  '',
  '@media (max-width: 760px) {',
  '  .score-summary-total { flex-direction: column; justify-content: center; text-align: center; }',
  '  .score-summary-total__chips { justify-content: center; }',
  '  .score-summary-total__value { justify-content: center; }',
  '  .score-summary-grid { grid-template-columns: 1fr; }',
  '}',
  '',
].join('\n');

css += SUMMARY_CSS;
writeCrlf(CSS, css);
console.log('[exam.css] patched OK');
