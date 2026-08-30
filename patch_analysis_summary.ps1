# Patch: add Attempt Summary answer grid + Attempted/Correct badges to the
# Performance Analysis page (App.jsx + exam.css). ASCII-only script; the
# source files are UTF-8 and are read/written as UTF-8 (no BOM).
# The sources use CRLF; anchors are written with LF here-strings, so the
# content is normalized to LF before patching and restored to CRLF on write.

$ErrorActionPreference = 'Stop'

$utf8 = New-Object System.Text.UTF8Encoding($false)

function Read-Utf8([string]$path) {
  $content = [System.IO.File]::ReadAllText($path, $utf8)
  return $content.Replace("`r`n", "`n")
}

function Write-Utf8([string]$path, [string]$content) {
  $content = $content.Replace("`r`n", "`n").Replace("`n", "`r`n")
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

$appPath = Join-Path (Get-Location) 'frontend/src/App.jsx'
$cssPath = Join-Path (Get-Location) 'frontend/src/exam.css'

$app = Read-Utf8 $appPath
$css = Read-Utf8 $cssPath

function ReplaceOnce([ref]$text, [string]$old, [string]$new, [string]$what) {
  $old = $old.Replace("`r", "")
  $new = $new.Replace("`r", "")
  $idx = $text.Value.IndexOf($old, [System.StringComparison]::Ordinal)
  if ($idx -lt 0) { throw "ANCHOR NOT FOUND: $what" }
  $text.Value = $text.Value.Substring(0, $idx) + $new + $text.Value.Substring($idx + $old.Length)
}

# ---------- 1. highlightId state (next to the other Analysis hooks) ----------
$a1old = @'
  const [subject, setSubject] = useState('all'); // all | Physics | Chemistry | Mathematics
'@
$a1new = @'
  const [subject, setSubject] = useState('all'); // all | Physics | Chemistry | Mathematics

  const [highlightId, setHighlightId] = useState(null); // question being scrolled to from the grid
'@
ReplaceOnce ([ref]$app) $a1old $a1new 'Analysis subject state anchor'

# ---------- 2. summary computation + jumpToQuestion before render ----------
$a2old = @'
  return (
    <div className="analysis-page">
'@
$a2new = @'
  // Whole-paper attempt summary (not subject-filtered).
  const summary = { correct: 0, incorrect: 0, unattempted: 0, marked: 0, attempted: 0 };
  for (const q of result.questions) {
    if (q.is_correct) summary.correct++;
    else if (q.marks_awarded < 0) summary.incorrect++;
    else summary.unattempted++;
    if (q.status === 'marked_for_review') summary.marked++;
    if (q.selected_option_id != null || q.numerical_answer != null) summary.attempted++;
  }

  // Clicking a grid cell shows that question's review and scrolls to it.
  const jumpToQuestion = (q) => {
    setSubject(q.section);
    setFilter('all');
    setHighlightId(q.id);
    setTimeout(() => {
      const el = document.getElementById(`review-q-${q.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    setTimeout(() => setHighlightId(null), 1800);
  };

  return (

    <div className="analysis-page">
'@
ReplaceOnce ([ref]$app) $a2old $a2new 'Analysis return anchor'

# ---------- 3. Attempt Summary section before section-scores ----------
$a3old = @'
      <section className="section-scores">
'@
$a3new = @'
      <section className="attempt-summary">
        <div className="attempt-summary__head">
          <h2>Attempt Summary</h2>
          <p className="muted">
            Every question at a glance - green is correct, red is incorrect, grey is not attempted.
            Click any question to jump to its review below.
          </p>
        </div>

        <div className="attempt-legend">
          <span className="attempt-legend__item"><i className="attempt-dot attempt-dot--correct" />Correct ({summary.correct})</span>
          <span className="attempt-legend__item"><i className="attempt-dot attempt-dot--incorrect" />Incorrect ({summary.incorrect})</span>
          <span className="attempt-legend__item"><i className="attempt-dot attempt-dot--unattempted" />Not attempted ({summary.unattempted})</span>
          <span className="attempt-legend__item"><i className="attempt-dot attempt-dot--attempted" />Attempted ({summary.attempted})</span>
          <span className="attempt-legend__item"><i className="attempt-dot attempt-dot--marked" />Marked for review ({summary.marked})</span>
        </div>

        <div className="attempt-grid">
          {SUBJECTS.map((sub) => {
            const subQs = result.questions.filter((q) => q.section === sub);
            if (subQs.length === 0) return null;
            return (
              <div key={sub} className="attempt-grid__section">
                <div className="attempt-grid__label" style={{ color: SUBJECT_COLORS[sub] }}>{sub}</div>
                <div className="attempt-grid__cells">
                  {subQs.map((q) => {
                    const cellCls = q.is_correct
                      ? 'attempt-cell--correct'
                      : q.marks_awarded < 0
                        ? 'attempt-cell--incorrect'
                        : 'attempt-cell--unattempted';
                    const cellTitle = 'Q' + q.position + ' - '
                      + (q.is_correct ? 'Correct' : q.marks_awarded < 0 ? 'Incorrect' : 'Not attempted')
                      + (q.status === 'marked_for_review' ? ' (Marked for review)' : '');
                    return (
                      <button
                        key={q.id}
                        className={`attempt-cell ${cellCls}${q.status === 'marked_for_review' ? ' attempt-cell--marked' : ''}`}
                        title={cellTitle}
                        onClick={() => jumpToQuestion(q)}
                      >
                        {q.position}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section-scores">
'@
ReplaceOnce ([ref]$app) $a3old $a3new 'section-scores anchor'

# ---------- 4. pass highlight prop to ReviewItem ----------
$a4old = @'
            <ReviewItem key={q.id} q={q} />
'@
$a4new = @'
            <ReviewItem key={q.id} q={q} highlight={highlightId === q.id} />
'@
ReplaceOnce ([ref]$app) $a4old $a4new 'ReviewItem render anchor'

# ---------- 5. ReviewItem signature ----------
$a5old = @'
function ReviewItem({ q }) {
'@
$a5new = @'
function ReviewItem({ q, highlight }) {
'@
ReplaceOnce ([ref]$app) $a5old $a5new 'ReviewItem signature anchor'

# ---------- 6. ReviewItem root div: id + highlight class ----------
$a6old = @'
    <div className={`review-item${q.marks_awarded > 0 ? ' review-item--correct' : q.marks_awarded < 0 ? ' review-item--incorrect' : ''}`}>
'@
$a6new = @'
    <div
      id={`review-q-${q.id}`}
      className={`review-item${q.marks_awarded > 0 ? ' review-item--correct' : q.marks_awarded < 0 ? ' review-item--incorrect' : ''}${highlight ? ' review-item--highlighted' : ''}`}
    >
'@
ReplaceOnce ([ref]$app) $a6old $a6new 'ReviewItem root div anchor'

# ---------- 7. Attempted / Correct badges after the marked chip ----------
$a7old = @'
        {q.status === 'marked_for_review' && <span className="marked-chip">Marked</span>}
'@
$a7new = @'
        {q.status === 'marked_for_review' && <span className="marked-chip">Marked</span>}
        {q.selected_option_id != null || q.numerical_answer != null ? (
          <span className="attempted-chip">Attempted</span>
        ) : (
          <span className="attempted-chip attempted-chip--no">Not attempted</span>
        )}
        {q.is_correct ? (
          <span className="result-chip result-chip--correct">Correct</span>
        ) : q.marks_awarded < 0 ? (
          <span className="result-chip result-chip--incorrect">Incorrect</span>
        ) : (
          <span className="result-chip result-chip--unattempted">Unattempted</span>
        )}
'@
ReplaceOnce ([ref]$app) $a7old $a7new 'marked-chip anchor'

# ---------- 8. CSS: append styles ----------
$cssAdd = @'


/* ========================= ATTEMPT SUMMARY (ANSWER GRID) ============================= */
.attempt-summary {
  background: #ffffff;
  border: 1px solid #d8dde4;
  border-radius: 8px;
  padding: 18px;
  margin-bottom: 22px;
}
.attempt-summary__head { margin-bottom: 12px; }
.attempt-summary__head h2 { margin: 0 0 4px; font-size: 1.1rem; color: #143a7a; }
.attempt-summary__head p { margin: 0; font-size: 0.85rem; }
.attempt-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin-bottom: 14px;
  font-size: 0.8rem;
  color: #475569;
}
.attempt-legend__item { display: inline-flex; align-items: center; gap: 6px; }
.attempt-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; flex: 0 0 12px; }
.attempt-dot--correct { background: #1e9e4a; }
.attempt-dot--incorrect { background: #d32f2f; }
.attempt-dot--unattempted { background: #e3e8ef; border: 1.5px solid #9aa3af; }
.attempt-dot--attempted { background: #ffffff; border: 2px solid #1b4f9c; }
.attempt-dot--marked { background: #6d28d9; }
.attempt-grid { display: flex; flex-direction: column; gap: 16px; }
.attempt-grid__section { display: flex; flex-direction: column; gap: 8px; }
.attempt-grid__label { font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
.attempt-grid__cells {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
  gap: 7px;
}
.attempt-cell {
  position: relative;
  aspect-ratio: 1;
  border: 1px solid #b9c2ce;
  border-radius: 6px;
  background: #ffffff;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.85rem;
  color: #52606e;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.attempt-cell:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(20, 58, 122, 0.25); }
.attempt-cell--correct { background: #1e9e4a; border-color: #1e9e4a; color: #ffffff; }
.attempt-cell--incorrect { background: #d32f2f; border-color: #d32f2f; color: #ffffff; }
.attempt-cell--unattempted { background: #f1f4f8; border-color: #d8dde4; color: #8a94a3; }
.attempt-cell--marked::after {
  content: '';
  position: absolute;
  top: 3px;
  right: 3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6d28d9;
  border: 1.5px solid #ffffff;
}
.review-item--highlighted { animation: review-flash 1.8s ease; }
@keyframes review-flash {
  0% { box-shadow: 0 0 0 3px rgba(27, 79, 156, 0.6); }
  100% { box-shadow: 0 0 0 3px rgba(27, 79, 156, 0); }
}
.attempted-chip {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e8f0fd;
  color: #1b4f9c;
  border: 1px solid #b9d0f0;
}
.attempted-chip--no { background: #f1f4f8; color: #64748b; border-color: #d8dde4; }
.result-chip {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.result-chip--correct { background: #e9f9ee; color: #166534; border: 1px solid #86d9a5; }
.result-chip--incorrect { background: #fef2f2; color: #b3261e; border: 1px solid #f5a3a3; }
.result-chip--unattempted { background: #f1f4f8; color: #64748b; border: 1px solid #d8dde4; }

body.dark .attempt-summary { background: #1f2229; border-color: #3a3e48; }
body.dark .attempt-summary__head h2 { color: #e5e7eb; }
body.dark .attempt-legend { color: #9ca3af; }
body.dark .attempt-dot--unattempted { background: #374151; border-color: #4b5563; }
body.dark .attempt-cell--unattempted { background: #2a2e37; border-color: #3a3e48; color: #9ca3af; }
body.dark .attempted-chip { background: #1e3a5f; color: #93c5fd; border-color: #1e3a5f; }
body.dark .attempted-chip--no { background: #374151; color: #d1d5db; border-color: #4b5563; }
body.dark .result-chip--unattempted { background: #374151; color: #d1d5db; border-color: #4b5563; }

@media (max-width: 640px) {
  .attempt-summary { padding: 14px; }
  .attempt-grid__cells { grid-template-columns: repeat(5, 1fr); }
  .attempt-legend { gap: 6px 12px; }
}
'@

$css = $css + $cssAdd

Write-Utf8 $appPath $app
Write-Utf8 $cssPath $css
Write-Output 'PATCH OK'
