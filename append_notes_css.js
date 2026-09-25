// append_notes_css.js -- appends the Notes UI styles (Test Analysis notes tab,
// My Notes page starter form, history notes button) to frontend/src/exam.css.
// Idempotent: re-running removes the previous block and re-appends it.
//
// Usage: node append_notes_css.js

const fs = require('fs');
const path = require('path');

const CSS_FILE = path.join(__dirname, 'frontend', 'src', 'exam.css');

// Unique single-line markers so the block can be replaced on re-runs.
const START_MARK = '/* NOTES FEATURE (appended by append_notes_css.js)';
const END_MARK = '/* NOTES FEATURE END */';

const HEADER = [
  START_MARK,
  '   Notes tab inside Test Analysis, My Notes page and history notes button.',
  '   ============================================================================ */',
].join('\n');

const BLOCK = `${HEADER}

/* ---- reminder banner on the analysis screen ----------------------------- */
.ta2-notes-nudge {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 18px;
  padding: 14px 16px;
  background: var(--ta2-purple-soft);
  border: 1px solid var(--ta2-border);
  border-left: 4px solid var(--ta2-purple);
  border-radius: 14px;
}
.ta2-notes-nudge svg { width: 20px; height: 20px; flex: none; color: var(--ta2-purple); }
.ta2-notes-nudge__text { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; }
.ta2-notes-nudge__text strong { font-size: 0.95rem; font-weight: 700; color: var(--ta2-text); }
.ta2-notes-nudge__text span { font-size: 0.84rem; color: var(--ta2-muted); }
.ta2-btn--notes svg { color: var(--ta2-purple); }

/* ---- the notes panel ---------------------------------------------------- */
.ta2-note { display: flex; flex-direction: column; gap: 18px; }

.ta2-note__intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 20px;
  background: var(--ta2-card);
  border: 1px solid var(--ta2-border);
  border-radius: var(--ta2-radius);
  box-shadow: var(--ta2-shadow);
}
.ta2-note__title { margin: 0 0 6px; font-size: 1.1rem; font-weight: 800; color: var(--ta2-text); }
.ta2-note__sub { margin: 0; font-size: 0.88rem; line-height: 1.5; color: var(--ta2-muted); max-width: 62ch; }
.ta2-note__score { display: flex; flex-direction: column; gap: 6px; text-align: right; white-space: nowrap; }
.ta2-note__score-row { font-size: 0.82rem; color: var(--ta2-muted); }
.ta2-note__score-row strong { font-size: 1rem; font-weight: 800; color: var(--ta2-text); }
.ta2-note__score-row--red strong { color: var(--ta2-red); }

.ta2-note__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.ta2-note__editor-card,
.ta2-note__side {
  background: var(--ta2-card);
  border: 1px solid var(--ta2-border);
  border-radius: var(--ta2-radius);
  box-shadow: var(--ta2-shadow);
}

.ta2-note__editor-card { padding: 18px 20px 16px; }

.ta2-note__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.ta2-note__toolbar-label { font-size: 0.78rem; font-weight: 700; color: var(--ta2-muted); }
.ta2-note__tpl {
  padding: 5px 11px;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ta2-text);
  background: var(--ta2-card-soft);
  border: 1px solid var(--ta2-border);
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.ta2-note__tpl:hover { color: var(--ta2-purple); border-color: var(--ta2-purple); }

.ta2-note__area {
  width: 100%;
  min-height: 320px;
  padding: 14px 16px;
  font: inherit;
  font-size: 0.94rem;
  line-height: 1.65;
  color: var(--ta2-text);
  background: var(--ta2-card-soft);
  border: 1px solid var(--ta2-border);
  border-radius: 12px;
  resize: vertical;
}
.ta2-note__area:focus { outline: none; border-color: var(--ta2-blue); background: var(--ta2-card); }
.ta2-note__area::placeholder { color: var(--ta2-faint); }

.ta2-note__foot {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.ta2-note__status { font-size: 0.8rem; font-weight: 600; color: var(--ta2-muted); }
.ta2-note__status--saved { color: var(--ta2-green); }
.ta2-note__status--saving,
.ta2-note__status--dirty { color: var(--ta2-amber); }
.ta2-note__status--error { color: var(--ta2-red); }
.ta2-note__counts { margin-left: auto; font-size: 0.78rem; color: var(--ta2-faint); }

.ta2-note__error { margin: 10px 0 0; font-size: 0.82rem; color: var(--ta2-red); }
.ta2-note__hint { margin: 8px 0 0; font-size: 0.78rem; line-height: 1.5; color: var(--ta2-amber); }

.ta2-note__side { padding: 18px 20px 16px; }
.ta2-note__side-head { margin-bottom: 12px; }
.ta2-note__side-title { margin: 0 0 4px; font-size: 0.95rem; font-weight: 800; color: var(--ta2-text); }
.ta2-note__side-sub { margin: 0; font-size: 0.8rem; line-height: 1.5; color: var(--ta2-muted); }

.ta2-note__tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.ta2-note__tab {
  padding: 6px 11px;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ta2-muted);
  background: var(--ta2-card-soft);
  border: 1px solid var(--ta2-border);
  border-radius: 999px;
  cursor: pointer;
}
.ta2-note__tab--active { color: var(--ta2-blue); border-color: var(--ta2-blue-line); background: var(--ta2-blue-soft); }

.ta2-note__chips { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }
.ta2-note__chip {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  font: inherit;
  font-size: 0.82rem;
  text-align: left;
  color: var(--ta2-text);
  background: var(--ta2-card-soft);
  border: 1px solid var(--ta2-border);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.ta2-note__chip:hover { border-color: var(--ta2-purple); background: var(--ta2-purple-soft); }
.ta2-note__chip-num { flex: none; font-weight: 800; color: var(--ta2-red); }
.ta2-note__chip-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ta2-note__chip-meta { flex: none; font-size: 0.72rem; color: var(--ta2-muted); }
.ta2-note__chip--topic .ta2-note__chip-num { color: var(--ta2-purple); }
.ta2-note__empty { margin: 4px 0; font-size: 0.84rem; color: var(--ta2-muted); }

.ta2-note__tips {
  margin: 16px 0 0;
  padding: 14px 16px 14px 30px;
  list-style: disc;
  background: var(--ta2-card-soft);
  border: 1px solid var(--ta2-border-soft);
  border-radius: 12px;
  font-size: 0.79rem;
  line-height: 1.55;
  color: var(--ta2-muted);
}
.ta2-note__tips li + li { margin-top: 6px; }
.ta2-note__tips strong { color: var(--ta2-text); }

.ta2-note__actions { display: flex; justify-content: flex-end; margin-top: 14px; }

/* ---- My Notes page: start a note for any test -------------------------- */
.notes-new {
  margin-bottom: 22px;
  padding: 16px 18px;
  background: #f8fafc;
  border: 1px solid #e1e5eb;
  border-radius: 10px;
}
.notes-new__label { display: block; margin-bottom: 8px; font-size: 0.85rem; font-weight: 700; color: #1e293b; }
.notes-new__row { display: flex; gap: 10px; flex-wrap: wrap; }
.notes-new__select {
  flex: 1 1 260px;
  padding: 10px 12px;
  font: inherit;
  font-size: 0.9rem;
  color: #1e293b;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}
.notes-new__hint { margin: 10px 0 0; font-size: 0.78rem; color: #6b7686; }

.note-editor-prompt { margin: 0 0 10px; font-size: 0.85rem; color: #475569; }
.note-editor-count { margin-right: auto; font-size: 0.78rem; color: #6b7686; }

.history-attempt-row__notes { white-space: nowrap; }

/* ---- dark theme -------------------------------------------------------- */
body.dark .notes-new { background: #20242d; border-color: #2c313c; }
body.dark .notes-new__label { color: #e6eaf2; }
body.dark .notes-new__select { color: #e6eaf2; background: #1b1f27; border-color: #2c313c; }
body.dark .notes-new__hint { color: #98a2b3; }
body.dark .note-editor-prompt { color: #98a2b3; }
body.dark .note-editor-count { color: #98a2b3; }
body.dark .note-card__preview em { color: #7d8798; }

@media (max-width: 900px) {
  .ta2-note__grid { grid-template-columns: minmax(0, 1fr); }
  .ta2-note__intro { flex-direction: column; }
  .ta2-note__score { flex-direction: row; gap: 16px; text-align: left; }
}

${END_MARK}
`;

function main() {
  let css = fs.readFileSync(CSS_FILE, 'utf8');
  const eol = css.includes('\r\n') ? '\r\n' : '\n';

  const startIdx = css.indexOf(START_MARK);
  if (startIdx !== -1) {
    const endIdx = css.indexOf(END_MARK, startIdx);
    if (endIdx === -1) throw new Error('previous notes block is not terminated');
    css = css.slice(0, startIdx) + css.slice(endIdx + END_MARK.length);
  }
  css = css.replace(/\s+$/, '');
  const block = eol === '\r\n' ? BLOCK.replace(/\n/g, '\r\n') : BLOCK;
  fs.writeFileSync(CSS_FILE, css + eol + eol + block);
  console.log('exam.css updated with the notes styles');
}

main();
