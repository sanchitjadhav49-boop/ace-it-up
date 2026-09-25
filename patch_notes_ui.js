'use strict';

// patch_notes_ui.js -- wires the Notes feature into the app so a student gets
// a note-taking option after EVERY test:
//
//   * "Notes" tab + "My Notes" button + a reminder banner in the Test Analysis
//     shell that appears right after a test is submitted
//   * a "Notes" button on every attempt row in My History
//   * a "Start writing" picker on the My Notes page (a note could previously
//     only be edited, never created)
//   * the note editor now works for both new and existing notes, returns to
//     wherever it was opened from, and shows real save failures
//
// App.jsx is CRLF-encoded with a BOM, and parts of it carry a stray blank line
// between every line, so multi-line needles are matched with a
// whitespace-tolerant regex (an optional blank line may sit between any two
// needle lines) and every match is asserted to be unique.
//
// Run once:  node patch_notes_ui.js

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'frontend', 'src', 'App.jsx');
let src = fs.readFileSync(FILE, 'utf8');
const before = src;

const crlf = (text) => text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Replace one uniquely-occurring chunk of code (blank-line tolerant).
function patch(needle, replacement, label) {
  const lines = crlf(needle).replace(/\r\n/g, '\n').split('\n');
  const pattern = lines.map(escapeRegExp).join('\\r?\\n(?:[ \\t]*\\r?\\n)?');
  const rx = new RegExp(pattern, 'g');
  const found = src.match(rx);
  if (!found || found.length !== 1) {
    throw new Error(`expected 1 match for ${label}, found ${found ? found.length : 0}`);
  }
  src = src.replace(rx, () => crlf(replacement));
}

// Replace the region starting at startMarker up to (but excluding) endMarker.
function splice(startMarker, endMarker, replacement, label) {
  const start = src.indexOf(crlf(startMarker));
  const end = src.indexOf(crlf(endMarker));
  if (start === -1) throw new Error(`start marker not found: ${label}`);
  if (end === -1) throw new Error(`end marker not found: ${label}`);
  if (end <= start) throw new Error(`markers out of order: ${label}`);
  src = src.slice(0, start) + crlf(replacement) + src.slice(end);
}

// ---------------------------------------------------------------------------
// 1. Import the notes panel
// ---------------------------------------------------------------------------
patch(
  `import TopicAnalysis from './TopicAnalysis.jsx';`,
  `import TopicAnalysis from './TopicAnalysis.jsx';
import TestNotes from './TestNotes.jsx';`,
  'TestNotes import'
);

// ---------------------------------------------------------------------------
// 2. A pencil icon for the notes buttons
// ---------------------------------------------------------------------------
patch(
  `  print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
};`,
  `  print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  note: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
};`,
  'note icon path'
);

// ---------------------------------------------------------------------------
// 3. Rewrite the My Notes page + the note editor
// ---------------------------------------------------------------------------
splice(
  `// NOTES PAGE - List all notes grouped by test`,
  `// App - realistic JEE Main mock-test interface.`,
  `// NOTES PAGE - every learning note the student has written, plus a starter for
// a test they have not written about yet.
function NotesPage({ notes, loading, error, onBack, onEdit, onDelete, tests, onNew }) {
  const [newTestId, setNewTestId] = useState('');

  const notYetNoted = (tests || []).filter(
    (t) => !notes.some((n) => asId(n.test_id) === asId(t.id))
  );

  function startNew(e) {
    e.preventDefault();
    const id = Number(newTestId);
    if (!Number.isInteger(id)) return;
    const chosen = (tests || []).find((x) => asId(x.id) === id) || { id: id, title: 'Test ' + id };
    setNewTestId('');
    onNew(chosen);
  }

  const header = (
    <div className="notes-header">
      <button className="btn-secondary" onClick={onBack}>Back</button>
      <h1>My Notes</h1>
    </div>
  );

  if (loading) {
    return (
      <div className="notes-page">
        {header}
        <div className="notes-loading">Loading notes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notes-page">
        {header}
        <div className="notes-error">Error: {error}</div>
        <button className="btn-primary" onClick={onBack}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="notes-page">
      {header}

      <form className="notes-new" onSubmit={startNew}>
        <label className="notes-new__label" htmlFor="notes-new-test">
          Write a note for another test
        </label>
        <div className="notes-new__row">
          <select
            id="notes-new-test"
            className="notes-new__select"
            value={newTestId}
            onChange={(e) => setNewTestId(e.target.value)}
          >
            <option value="">Choose a test...</option>
            {notYetNoted.map((t) => (
              <option key={t.id} value={asId(t.id)}>{t.title}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary" disabled={!newTestId}>Start writing</button>
        </div>
        <p className="notes-new__hint">
          Do this right after every mock test: list your mistakes and learnings while they are still fresh.
        </p>
      </form>

      {notes.length === 0 ? (
        <div className="notes-empty">
          <p>No notes yet. Start writing your learnings after each mock test!</p>
        </div>
      ) : (
        <div className="notes-list">
          {notes.map((note) => {
            const updated = note.updated_at
              ? new Date(note.updated_at).toLocaleString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
              : '';
            const text = (note.content || '').trim();
            return (
              <div key={note.id} className="note-card">
                <div className="note-card__header">
                  <h3 className="note-card__title">{note.test_title}</h3>
                  <span className="note-card__updated">Updated: {updated}</span>
                </div>
                <p className="note-card__preview">
                  {text
                    ? (text.length > 260 ? text.slice(0, 260) + '...' : text)
                    : <em>No content yet</em>}
                </p>
                <div className="note-card__actions">
                  <button className="btn-secondary" onClick={() => onEdit(note)}>Edit</button>
                  <button className="btn-danger" onClick={() => onDelete(note)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NOTE EDITOR - write (or update) the learning note for one test.
// ---------------------------------------------------------------------------
function NoteEditor({ note, test, onSave, onCancel, saving }) {
  const [content, setContent] = useState(
    note && typeof note.content === 'string' ? note.content : ''
  );
  const [error, setError] = useState('');
  const hasText = content.trim().length > 0;
  const words = hasText ? content.trim().split(/\\s+/).length : 0;

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    try {
      await onSave(content);
    } catch (err) {
      setError(err.message || 'Could not save the note');
    }
  }

  return (
    <div className="note-editor-page">
      <div className="note-editor-header">
        <button className="btn-secondary" onClick={onCancel}>Back</button>
        <h1>{hasText ? 'Edit Note' : 'New Note'}</h1>
      </div>

      <div className="note-editor-test-info">
        <strong>{test ? test.title : 'Unknown Test'}</strong>
        {test && test.description ? <p className="muted">{test.description}</p> : null}
      </div>

      <form onSubmit={handleSave} className="note-editor-form">
        <p className="note-editor-prompt">
          Mistakes I made, what I learnt, and what I must revise before the next test:
        </p>
        <textarea
          className="note-editor-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={'Q12 Physics - I rushed the rotation formula.\\nLearnt: always write the torque balance first.\\nRevise: moment of inertia of standard bodies.'}
          rows={18}
          spellCheck={true}
        />
        {error ? <p className="error">{error}</p> : null}
        <div className="note-editor-actions">
          <span className="note-editor-count">{words} words</span>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </form>
    </div>
  );
}
`,
  'NotesPage + NoteEditor rewrite'
);

// ---------------------------------------------------------------------------
// 4. App state + helpers for opening the editor from anywhere
// ---------------------------------------------------------------------------
patch(
  `  const [savingNote, setSavingNote] = useState(false);`,
  `  const [savingNote, setSavingNote] = useState(false);
  // Where the note editor should return to: 'notes' (My Notes page) or 'history'.
  const [noteReturn, setNoteReturn] = useState('notes');`,
  'noteReturn state'
);

patch(
  `  const [resultData, setResultData] = useState(null);`,
  `  // Open the note editor for a test from anywhere: the My Notes page, the
  // attempt history and the analysis screen all funnel through here.
  async function openNoteForTest(testLike, returnTo) {
    if (!testLike) return;
    const id = asId(testLike.id != null ? testLike.id : testLike.test_id);
    if (!Number.isInteger(id) || Number.isNaN(id)) return;

    const known = tests.find((t) => asId(t.id) === id);
    setEditingTest(known || {
      id: id,
      title: testLike.title || testLike.test_title || 'Test ' + id,
      description: testLike.description || null,
    });
    setNoteReturn(returnTo || 'notes');
    setPhase('note-editor');
    setSavingNote(false);

    // Never clobber an existing note with an empty editor.
    try {
      const res = await api('/api/users/' + userId + '/notes/' + id);
      setEditingNote(res.note || { test_id: id, content: '' });
    } catch (err) {
      setEditingNote({ test_id: id, content: '' });
    }
  }

  // Leave the note editor and return to where it was opened from.
  function closeNoteEditor() {
    setEditingNote(null);
    setEditingTest(null);
    if (noteReturn === 'history') {
      openHistory();
    } else {
      setPhase('notes');
      openNotes();
    }
  }

  const [resultData, setResultData] = useState(null);`,
  'openNoteForTest + closeNoteEditor'
);

// ---------------------------------------------------------------------------
// 5. My Notes page wiring (create a note for any test)
// ---------------------------------------------------------------------------
splice(
  `  // ============================== NOTES =======================================`,
  `  // ============================ NOTE EDITOR =================================`,
  `  // ============================== NOTES =======================================

  if (phase === 'notes') {
    return (
      <NotesPage
        notes={notesData}
        loading={notesLoading}
        error={notesError}
        tests={tests}
        onNew={(t) => openNoteForTest(t, 'notes')}
        onBack={() => setPhase('start')}
        onEdit={(note) => openNoteForTest({ id: note.test_id, title: note.test_title }, 'notes')}
        onDelete={async (note) => {
          if (!window.confirm('Delete this note?')) return;
          try {
            await api('/api/users/' + userId + '/notes/' + note.test_id, { method: 'DELETE' });
            setNotesData(notesData.filter((n) => n.id !== note.id));
          } catch (err) {
            alert(err.message || 'Failed to delete note');
          }
        }}
      />
    );
  }


`,
  'notes phase render'
);

// ---------------------------------------------------------------------------
// 6. Note editor wiring: save into the notes list, then go back
// ---------------------------------------------------------------------------
splice(
  `  // ============================ NOTE EDITOR =================================`,
  `  // ============================ INSTRUCTIONS ==============================`,
  `  // ============================ NOTE EDITOR =================================

  if (phase === 'note-editor') {
    return (
      <NoteEditor
        note={editingNote}
        test={editingTest}
        saving={savingNote}
        onCancel={closeNoteEditor}
        onSave={async (content) => {
          const testId = editingTest ? asId(editingTest.id) : null;
          if (testId == null) throw new Error('This note is not linked to a test');
          setSavingNote(true);
          try {
            const res = await api('/api/users/' + userId + '/notes', {
              method: 'POST',
              body: JSON.stringify({ test_id: testId, content: content }),
            });
            const saved = res.note;
            setNotesData((prev) => [saved, ...prev.filter((n) => asId(n.test_id) !== asId(testId))]);
            closeNoteEditor();
          } catch (err) {
            alert(err.message || 'Failed to save note');
            throw err;
          } finally {
            setSavingNote(false);
          }
        }}
      />
    );
  }


`,
  'note editor phase render'
);

// ---------------------------------------------------------------------------
// 7. Analysis gets the student id (notes are per user)
// ---------------------------------------------------------------------------
patch(
  `      <Analysis
        result={result}
        onRetake={backToTests}
        onBackHome={backToHome}
      />`,
  `      <Analysis
        result={result}
        userId={userId}
        onRetake={backToTests}
        onBackHome={backToHome}
      />`,
  'submitted Analysis render'
);

patch(
  `function Analysis({ result, onRetake, onBackHome, backLabel }) {`,
  `function Analysis({ result, userId, onRetake, onBackHome, backLabel }) {`,
  'Analysis signature'
);

// ---------------------------------------------------------------------------
// 8. Notes as a sixth section of the Test Analysis shell
// ---------------------------------------------------------------------------
patch(
  `    { key: 'errors', label: 'Errors' },
  ];`,
  `    { key: 'errors', label: 'Errors' },
    { key: 'notes', label: 'Notes' },
  ];`,
  'analysis sections'
);

patch(
  `  } else {
    content = <ErrorDistribution result={result} onBack={() => openSection('overview')} />;
  }`,
  `  } else if (section === 'notes') {
    content = (
      <TestNotes result={result} userId={userId} onBack={() => openSection('overview')} />
    );
  } else {
    content = <ErrorDistribution result={result} onBack={() => openSection('overview')} />;
  }`,
  'analysis notes branch'
);

patch(
  `            <button className="ta2-btn" onClick={() => setShowSummary(true)}>
              <Ta2Icon name="file" />
              Score Summary
            </button>`,
  `            <button className="ta2-btn" onClick={() => setShowSummary(true)}>
              <Ta2Icon name="file" />
              Score Summary
            </button>
            <button className="ta2-btn ta2-btn--notes" onClick={() => openSection('notes')}>
              <Ta2Icon name="note" />
              My Notes
            </button>`,
  'analysis topbar notes button'
);

// ---------------------------------------------------------------------------
// 9. Reminder to write the note for the test that was just analysed
// ---------------------------------------------------------------------------
patch(
  `  useEffect(() => {
    if (!exportOpen) return undefined;
    const close = () => setExportOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [exportOpen]);`,
  `  useEffect(() => {
    if (!exportOpen) return undefined;
    const close = () => setExportOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [exportOpen]);

  // Has this student written a note for the test that was just analysed?
  const noteBannerTestId = result && result.test_id != null ? Number(result.test_id) : null;
  const [noteMissing, setNoteMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId || noteBannerTestId == null) return undefined;
    api('/api/users/' + userId + '/notes/' + noteBannerTestId)
      .then((res) => {
        if (cancelled) return;
        setNoteMissing(!(res.note && String(res.note.content || '').trim()));
      })
      .catch(() => {
        if (!cancelled) setNoteMissing(false);
      });
    return () => { cancelled = true; };
  }, [userId, noteBannerTestId]);`,
  'analysis notes nudge hook'
);

patch(
  `        <div className="ta2-tabs" role="tablist">`,
  `        {!showSummary && section !== 'notes' && noteMissing && (
          <div className="ta2-notes-nudge">
            <Ta2Icon name="note" />
            <div className="ta2-notes-nudge__text">
              <strong>Write your learnings for this test</strong>
              <span>Note the mistakes you made and what you learnt while it is still fresh.</span>
            </div>
            <button className="ta2-btn ta2-btn--primary" onClick={() => openSection('notes')}>
              Write notes
            </button>
          </div>
        )}

        <div className="ta2-tabs" role="tablist">`,
  'analysis notes nudge banner'
);

// ---------------------------------------------------------------------------
// 10. History: notes button on every attempt row
// ---------------------------------------------------------------------------
patch(
  `function HistoryPage({
  attempts, loading, error, selectedTestId, result, resultLoading, resultError,
  onBack, onSelectTest, onBackToTestsList, onViewAnalysis, onResume,
}) {`,
  `function HistoryPage({
  attempts, loading, error, selectedTestId, result, resultLoading, resultError,
  userId, onBack, onSelectTest, onBackToTestsList, onViewAnalysis, onResume, onOpenNote,
}) {`,
  'HistoryPage signature'
);

patch(
  `      <Analysis
        result={result}
        onRetake={onBackToTestsList}
        onBackHome={onBack}
        backLabel="Back to History"
      />`,
  `      <Analysis
        result={result}
        userId={userId}
        onRetake={onBackToTestsList}
        onBackHome={onBack}
        backLabel="Back to History"
      />`,
  'history Analysis render'
);

patch(
  `                  <div className="history-attempt-row__actions">
                    {done ? (
                      <button className="btn-primary" onClick={() => onViewAnalysis(a.id)}>View Analysis</button>
                    ) : (
                      <button className="btn-primary" onClick={() => onResume(a.test_id, a.id)}>Resume Attempt</button>
                    )}
                  </div>`,
  `                  <div className="history-attempt-row__actions">
                    {done ? (
                      <button className="btn-primary" onClick={() => onViewAnalysis(a.id)}>View Analysis</button>
                    ) : (
                      <button className="btn-primary" onClick={() => onResume(a.test_id, a.id)}>Resume Attempt</button>
                    )}
                    {onOpenNote ? (
                      <button
                        className="btn-secondary history-attempt-row__notes"
                        onClick={() => onOpenNote(a.test_id, selected.title)}
                      >
                        Notes
                      </button>
                    ) : null}
                  </div>`,
  'history attempt row notes button'
);

patch(
  `        onResume={(testId, attemptId) => {
          const t = tests.find((x) => asId(x.id) === asId(testId));
          if (!t) { setPhase('start'); return; }
          setPendingTest(t);
          setPendingResumeId(attemptId);
          setPhase('instructions');
        }}
      />`,
  `        onResume={(testId, attemptId) => {
          const t = tests.find((x) => asId(x.id) === asId(testId));
          if (!t) { setPhase('start'); return; }
          setPendingTest(t);
          setPendingResumeId(attemptId);
          setPhase('instructions');
        }}
        userId={userId}
        onOpenNote={(testId, title) => openNoteForTest({ id: testId, title: title }, 'history')}
      />`,
  'App HistoryPage props'
);

if (src === before) throw new Error('nothing changed');

// Syntax is verified for real by the vite build; here we only make sure the
// edits did not leave unbalanced braces behind.
const unbalanced = (str, open, close) => str.split(open).length - str.split(close).length;
if (unbalanced(src, "{", "}") > 2) {
  throw new Error("edit left unbalanced braces: " + unbalanced(src, "{", "}"));
}

fs.writeFileSync(FILE, src);
console.log('App.jsx patched (notes tab, history buttons, create-note flow)');
