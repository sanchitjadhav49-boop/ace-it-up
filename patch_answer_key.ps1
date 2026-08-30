# Patch: add Answer Key table + explicit Your answer / Correct answer line in
# the Performance Analysis page (App.jsx + exam.css).
# ASCII-only script; sources are UTF-8 with CRLF, normalized to LF for patching.

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

# ---------- 1. module-level optionLetterFor helper before Analysis ----------
$a1old = @'
function Analysis({ result, onRetake, backLabel }) {
'@
$a1new = @'
// Option letter (A/B/C/D) for an option id inside a question's ordered options.
function optionLetterFor(q, optionId) {
  if (optionId == null) return '-';
  const idx = q.options.findIndex((o) => o.id === optionId);
  return idx >= 0 ? String.fromCharCode(65 + idx) : '-';
}

function Analysis({ result, onRetake, backLabel }) {
'@
ReplaceOnce ([ref]$app) $a1old $a1new 'Analysis function anchor'

# ---------- 2. Answer Key section right before section-scores ----------
$a2old = @'
      <section className="section-scores">
'@
$a2new = @'
      <section className="answer-key">
        <div className="answer-key__head">
          <h2>Answer Key</h2>
          <p className="muted">
            Your answer vs the correct answer for every question. Green = correct, red = wrong,
            grey = not attempted. Click any row to jump to that question below.
          </p>
        </div>
        <div className="answer-key__table-wrap">
          <table className="answer-key__table">
            <thead>
              <tr>
                <th>Q No</th>
                <th>Subject</th>
                <th>Your Answer</th>
                <th>Correct Answer</th>
                <th>Marks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => {
                const isMcqQ = q.question_type === 'mcq';
                const yourAns = isMcqQ
                  ? (q.selected_option_id != null ? optionLetterFor(q, q.selected_option_id) : '-')
                  : (q.numerical_answer != null ? String(q.numerical_answer) : '-');
                const correctAns = isMcqQ
                  ? optionLetterFor(q, q.correct_option_id)
                  : (q.correct_answer != null ? String(q.correct_answer) : '-');
                const rowCls = q.is_correct
                  ? 'answer-key__row--correct'
                  : q.marks_awarded < 0
                    ? 'answer-key__row--incorrect'
                    : 'answer-key__row--unattempted';
                const statusCls = q.is_correct
                  ? 'answer-key__status--correct'
                  : q.marks_awarded < 0
                    ? 'answer-key__status--incorrect'
                    : 'answer-key__status--unattempted';
                const status = q.is_correct ? 'Correct' : q.marks_awarded < 0 ? 'Incorrect' : 'Unattempted';
                return (
                  <tr key={q.id} className={rowCls} onClick={() => jumpToQuestion(q)}>
                    <td>Q{q.position}</td>
                    <td>{q.section}</td>
                    <td className="answer-key__your">{yourAns}</td>
                    <td className="answer-key__correct">{correctAns}</td>
                    <td>{q.marks_awarded > 0 ? '+' + q.marks_awarded : q.marks_awarded}</td>
                    <td><span className={`answer-key__status ${statusCls}`}>{status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-scores">
'@
ReplaceOnce ([ref]$app) $a2old $a2new 'section-scores anchor'

# ---------- 3. ReviewItem: derived answer texts ----------
$a3old = @'
  const yourOption = q.options.find((o) => o.id === q.selected_option_id);
  const correctOption = q.options.find((o) => o.id === q.correct_option_id);
'@
$a3new = @'
  const yourOption = q.options.find((o) => o.id === q.selected_option_id);
  const correctOption = q.options.find((o) => o.id === q.correct_option_id);

  const yourAnswerText = isMcq
    ? (q.selected_option_id != null ? optionLetterFor(q, q.selected_option_id) : 'Not attempted')
    : (q.numerical_answer != null ? String(q.numerical_answer) : 'Not attempted');

  const correctAnswerText = isMcq
    ? optionLetterFor(q, q.correct_option_id)
    : (q.correct_answer != null ? String(q.correct_answer) : '-');
'@
ReplaceOnce ([ref]$app) $a3old $a3new 'ReviewItem answer texts anchor'

# ---------- 4. ReviewItem: answer line above the options ----------
$a4old = @'
      <p className="review-item__body">{q.body}</p>
      {q.formula && <p className="formula">{q.formula}</p>}

      {isMcq ? (
'@
$a4new = @'
      <p className="review-item__body">{q.body}</p>
      {q.formula && <p className="formula">{q.formula}</p>}

      <div className={`answer-line${q.marks_awarded > 0 ? ' answer-line--correct' : q.marks_awarded < 0 ? ' answer-line--incorrect' : ''}`}>
        <span className="answer-line__item">
          Your answer: <strong>{yourAnswerText}</strong>
        </span>
        <span className="answer-line__item answer-line__item--right">
          Correct answer: <strong>{correctAnswerText}</strong>
        </span>
      </div>

      {isMcq ? (
'@
ReplaceOnce ([ref]$app) $a4old $a4new 'ReviewItem answer line anchor'

# ---------- 5. ReviewItem: option class logic (highlight your pick) ----------
$a5old = @'
            const isCorrect = opt.id === q.correct_option_id;
            const isYour = opt.id === q.selected_option_id;
            let cls = 'review-option';
            if (isCorrect) cls += ' review-option--correct';
            else if (isYour) cls += ' review-option--wrong';
'@
$a5new = @'
            const isCorrect = opt.id === q.correct_option_id;
            const isYour = opt.id === q.selected_option_id;
            const yourMatch = isYour && isCorrect;
            let cls = 'review-option';
            if (isCorrect) cls += ' review-option--correct';
            if (isYour) cls += yourMatch ? ' review-option--your' : ' review-option--wrong';
'@
ReplaceOnce ([ref]$app) $a5old $a5new 'ReviewItem option class anchor'

# ---------- 6. ReviewItem: tags (your answer highlighted when right) ----------
$a6old = @'
                {isCorrect && <span className="tag-correct">Correct answer</span>}
                {isYour && !isCorrect && <span className="tag-your">Your answer</span>}
'@
$a6new = @'
                {isCorrect && <span className="tag-correct">Correct answer</span>}
                {isYour && yourMatch && <span className="tag-your tag-your--right">Your answer</span>}
                {isYour && !isCorrect && <span className="tag-your">Your answer</span>}
'@
ReplaceOnce ([ref]$app) $a6old $a6new 'ReviewItem tags anchor'

# ---------- 7. CSS: append styles ----------
$cssAdd = @'


/* ========================= ANSWER KEY ============================= */
.answer-key {
  background: #ffffff;
  border: 1px solid #d8dde4;
  border-radius: 8px;
  padding: 18px;
  margin-bottom: 22px;
}
.answer-key__head { margin-bottom: 12px; }
.answer-key__head h2 { margin: 0 0 4px; font-size: 1.1rem; color: #143a7a; }
.answer-key__head p { margin: 0; font-size: 0.85rem; }
.answer-key__table-wrap { overflow-x: auto; }
.answer-key__table { width: 100%; border-collapse: collapse; font-size: 0.85rem; min-width: 560px; }
.answer-key__table th,
.answer-key__table td {
  padding: 8px 10px;
  text-align: center;
  border-bottom: 1px solid #e4e9f0;
}
.answer-key__table th {
  background: #f1f4f8;
  color: #475569;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: sticky;
  top: 0;
  z-index: 1;
}
.answer-key__table td:first-child { font-weight: 700; color: #143a7a; }
.answer-key__table tbody tr { cursor: pointer; transition: background 0.1s ease; }
.answer-key__table tbody tr:hover { background: #f8fafc; }
.answer-key__row--correct { background: #f3fbf5; }
.answer-key__row--incorrect { background: #fef6f6; }
.answer-key__your { font-weight: 800; color: #b3261e; }
.answer-key__correct { font-weight: 800; color: #166534; }
.answer-key__row--correct .answer-key__your { color: #166534; }
.answer-key__status {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}
.answer-key__status--correct { background: #e9f9ee; color: #166534; }
.answer-key__status--incorrect { background: #fef2f2; color: #b3261e; }
.answer-key__status--unattempted { background: #f1f4f8; color: #64748b; }

/* ========================= YOUR/CORRECT ANSWER LINE ============================= */
.answer-line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 0.9rem;
  background: #f8fafc;
  border: 1px solid #d8dde4;
}
.answer-line--correct { background: #e9f9ee; border-color: #86d9a5; }
.answer-line--incorrect { background: #fef2f2; border-color: #f5a3a3; }
.answer-line__item { display: inline-flex; gap: 6px; align-items: center; }
.answer-line__item--right { margin-left: auto; }
.answer-line strong { font-weight: 800; }
.answer-line--correct strong { color: #166534; }
.answer-line--incorrect strong { color: #b3261e; }

/* your pick that is also the right answer: green with inner ring */
.review-option--your {
  border-color: #1e9e4a;
  box-shadow: inset 0 0 0 2px rgba(30, 158, 74, 0.3);
}
.tag-your--right { background: #86d9a5; color: #14532d; }

/* ========================= DARK MODE ============================= */
body.dark .answer-key { background: #1f2229; border-color: #3a3e48; }
body.dark .answer-key__head h2 { color: #e5e7eb; }
body.dark .answer-key__table th { background: #2a2e37; color: #9ca3af; }
body.dark .answer-key__table th,
body.dark .answer-key__table td { border-bottom-color: #2c2f38; }
body.dark .answer-key__table td:first-child { color: #e5e7eb; }
body.dark .answer-key__table tbody tr:hover { background: #24272f; }
body.dark .answer-key__row--correct { background: #16281d; }
body.dark .answer-key__row--incorrect { background: #2a1717; }
body.dark .answer-key__status--unattempted { background: #374151; color: #d1d5db; }
body.dark .answer-line { background: #24272f; border-color: #3a3e48; }
body.dark .answer-line--correct { background: #16281d; border-color: #14532d; }
body.dark .answer-line--incorrect { background: #2a1717; border-color: #7f1d1d; }
body.dark .answer-line--correct strong { color: #bbf7d0; }
body.dark .answer-line--incorrect strong { color: #fecaca; }

/* ========================= RESPONSIVE ============================= */
@media (max-width: 640px) {
  .answer-key { padding: 14px; }
  .answer-line__item--right { margin-left: 0; }
}
'@

$css = $css + $cssAdd

Write-Utf8 $appPath $app
Write-Utf8 $cssPath $css
Write-Output 'PATCH OK'
