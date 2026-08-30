'use strict';
// One-off UI patch (JEE Main CBT look):
//  1) App.jsx: JEE-style header (brand, candidate chip, Submit button) and
//     a bottom "Go To" question-number strip. Logic is untouched.
//  2) ExamTimer.jsx: add a clock icon span (styled in CSS).
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

// ---------------------------------------------------------------- App.jsx --
const appOldHeader = `      <header className="exam-header">
        <div className="exam-title">
          <h1>{test.title}</h1>
          <span className="muted">Attempt #{attempt.attempt_id} | {answeredCount}/{allQuestions.length} answered</span>
        </div>
        <div className="exam-header-right">
          <ExamTimer
            durationSeconds={(test.duration_minutes || 180) * 60}
            startTime={attempt.start_time}
            onTimeUp={handleTimeUp}
            title={test.title}
          />
          <button className="btn-exit" onClick={() => setShowExitModal(true)} disabled={submitting}>
            Exit
          </button>
        </div>
      </header>`;

const appNewHeader = `      <header className="exam-header">
        <div className="exam-brand">
          <span className="exam-brand__kicker">JEE (Main) | Computer Based Test</span>
          <h1 className="exam-brand__title">{test.title}</h1>
          <span className="exam-brand__meta">Attempt #{attempt.attempt_id} | {answeredCount}/{allQuestions.length} answered</span>
        </div>
        <div className="exam-header-right">
          <ExamTimer
            durationSeconds={(test.duration_minutes || 180) * 60}
            startTime={attempt.start_time}
            onTimeUp={handleTimeUp}
            title={test.title}
          />
          <div className="candidate-chip" title="Candidate details">
            <span className="candidate-chip__avatar">{String(userId).padStart(2, '0').slice(-2)}</span>
            <span className="candidate-chip__info">
              <span className="candidate-chip__name">Candidate</span>
              <span className="candidate-chip__roll">Roll No: {100000 + userId}</span>
            </span>
          </div>
          <button className="btn-submit-top" onClick={() => setShowSubmitModal(true)} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
          <button className="btn-exit" onClick={() => setShowExitModal(true)} disabled={submitting}>
            Exit
          </button>
        </div>
      </header>`;

const appOldToggle = `      <button className="palette-toggle" onClick={() => setShowPalette(true)}>`;

const appNewToggle = `      <nav className="goto-bar" aria-label="Go to question">
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

patchFile('frontend/src/App.jsx', [
  [appOldHeader, appNewHeader],
  [appOldToggle, appNewToggle],
]);

// ------------------------------------------------------------ ExamTimer.jsx
const timerOld = `      <span className="exam-timer__label">{label}</span>`;
const timerNew = `      <span className="exam-timer__icon" aria-hidden="true" />
      <span className="exam-timer__label">{label}</span>`;

patchFile('frontend/src/ExamTimer.jsx', [[timerOld, timerNew]]);
