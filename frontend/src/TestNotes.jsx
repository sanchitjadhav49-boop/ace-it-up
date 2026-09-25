import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// TestNotes - the student's own learning log for one mock test.
//
//   "After every test there should be an option of notes where the student can
//    write their learnings and mistakes from that test."
//
// This panel is embedded as the sixth tab of the Test Analysis shell (and can
// also be opened from the attempt history). It:
//   - loads the note saved for this test    (GET  /api/users/:userId/notes/:testId)
//   - saves it (debounced autosave + Save)  (POST /api/users/:userId/notes)
//   - offers one-click chips for every wrong / skipped question of the test,
//     so writing "what went wrong" takes seconds
//   - offers section templates (mistakes, learnings, revision, time)
//   - falls back to localStorage when nobody is logged in or the API is down,
//     so a note is never lost
//
// Props:
//   result   - the analysis payload (needs test_id, title, questions[])
//   userId   - logged-in student id (null for guests)
//   onBack   - navigate back to the analysis overview
// ---------------------------------------------------------------------------

const API = ''; // same origin; vite proxies /api to the Express API
const LS_PREFIX = 'aceitup_notes_v1:';

async function api(path, options) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function lsKey(testId, title) {
  if (testId != null) return `${LS_PREFIX}test:${testId}`;
  return `${LS_PREFIX}test:${encodeURIComponent(title || 'unknown')}`;
}

function loadLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveLocal(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    // storage full / disabled - the server copy is the source of truth
  }
}

function clockTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function qNumber(q, i) {
  return q.global_position || q.position || i + 1;
}

const TEMPLATES = [
  {
    key: 'mistakes',
    label: 'Mistakes',
    text: '\nMISTAKES I MADE\n- \n',
  },
  {
    key: 'learnings',
    label: 'Learnings',
    text: '\nWHAT I LEARNT\n- \n',
  },
  {
    key: 'revise',
    label: 'To revise',
    text: '\nCONCEPTS / FORMULAS TO REVISE\n- \n',
  },
  {
    key: 'strategy',
    label: 'Strategy',
    text: '\nSTRATEGY FOR NEXT TIME\n- \n',
  },
  {
    key: 'time',
    label: 'Time plan',
    text: '\nTIME MANAGEMENT\n- \n',
  },
];

export default function TestNotes({ result, userId, onBack }) {
  const questions = useMemo(() => (result && result.questions) || [], [result]);
  const testId = result && result.test_id != null ? Number(result.test_id) : null;
  const testTitle = (result && result.title) || 'This test';
  const key = useMemo(() => lsKey(testId, testTitle), [testId, testTitle]);

  const [content, setContent] = useState('');
  const [status, setStatus] = useState('loading'); // loading | clean | dirty | saving | saved | error
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [openGroup, setOpenGroup] = useState('wrong'); // wrong | skipped | topics

  const areaRef = useRef(null);
  const savedRef = useRef('');        // last content confirmed by the server
  const dirtyRef = useRef(false);

  // ---------------------------------------------------------------------
  // Load the note for this test
  // ---------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError('');

    const local = loadLocal(key);
    if (local && typeof local.content === 'string') {
      setContent(local.content);
      savedRef.current = local.content;
      setUpdatedAt(local.updated_at || null);
    } else {
      setContent('');
      savedRef.current = '';
      setUpdatedAt(null);
    }

    if (!userId || testId == null) {
      setOfflineOnly(true);
      setStatus('clean');
      return () => { cancelled = true; };
    }

    api(`/api/users/${userId}/notes/${testId}`)
      .then((res) => {
        if (cancelled) return;
        setOfflineOnly(false);
        if (res.note && typeof res.note.content === 'string') {
          setContent(res.note.content);
          savedRef.current = res.note.content;
          setUpdatedAt(res.note.updated_at || null);
          saveLocal(key, { content: res.note.content, updated_at: res.note.updated_at });
        }
        setStatus('clean');
      })
      .catch((err) => {
        if (cancelled) return;
        // Keep working from localStorage; the save path will retry the API.
        setOfflineOnly(true);
        setError(err.message || 'Could not load the saved note.');
        setStatus('clean');
      });

    return () => { cancelled = true; };
  }, [key, testId, userId]);

  // ---------------------------------------------------------------------
  // Save (used by the button, Ctrl+S and the debounced autosave)
  // ---------------------------------------------------------------------
  const persist = useCallback(async (text) => {
    if (text === savedRef.current) {
      dirtyRef.current = false;
      setStatus('saved');
      return;
    }
    setStatus('saving');
    setError('');

    saveLocal(key, { content: text, updated_at: new Date().toISOString() });

    if (!userId || testId == null) {
      savedRef.current = text;
      dirtyRef.current = false;
      setOfflineOnly(true);
      setUpdatedAt(new Date().toISOString());
      setStatus('saved');
      return;
    }

    try {
      const res = await api(`/api/users/${userId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ test_id: testId, content: text }),
      });
      savedRef.current = res.note && typeof res.note.content === 'string' ? res.note.content : text;
      dirtyRef.current = false;
      setOfflineOnly(false);
      setUpdatedAt((res.note && res.note.updated_at) || new Date().toISOString());
      setStatus('saved');
    } catch (err) {
      setError(err.message || 'Could not save your note.');
      setStatus('error');
    }
  }, [key, testId, userId]);

  // Autosave: 1.8s after the student stops typing.
  useEffect(() => {
    if (status === 'loading') return undefined;
    if (!dirtyRef.current) return undefined;
    const timer = window.setTimeout(() => { persist(content); }, 1800);
    return () => window.clearTimeout(timer);
  }, [content, persist, status]);

  const onChange = (e) => {
    const next = e.target.value;
    setContent(next);
    dirtyRef.current = next !== savedRef.current;
    setStatus(next !== savedRef.current ? 'dirty' : 'clean');
  };

  // Ctrl/Cmd + S saves immediately.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        persist(content);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [content, persist]);

  // ---------------------------------------------------------------------
  // Insert text at the caret (chips, templates, question lines)
  // ---------------------------------------------------------------------
  const insert = useCallback((text, moveCaretToEnd) => {
    const area = areaRef.current;
    const start = area && typeof area.selectionStart === 'number' ? area.selectionStart : content.length;
    const end = area && typeof area.selectionEnd === 'number' ? area.selectionEnd : content.length;
    const next = content.slice(0, start) + text + content.slice(end);
    setContent(next);
    dirtyRef.current = next !== savedRef.current;
    setStatus(next !== savedRef.current ? 'dirty' : 'clean');
    const caret = start + text.length;
    window.setTimeout(() => {
      const el = areaRef.current;
      if (!el) return;
      el.focus();
      const pos = text.indexOf('\n- ');
      const target = moveCaretToEnd || pos === -1 ? caret : start + pos + 3;
      try { el.setSelectionRange(target, target); } catch (e) { /* ignore */ }
    }, 0);
  }, [content]);

  // ---------------------------------------------------------------------
  // What went wrong in this test - the raw material for the note
  // ---------------------------------------------------------------------
  const log = useMemo(() => {
    const attempted = (q) => q.status === 'answered' || q.status === 'marked_for_review'
      || q.selected_option_id != null || q.numerical_answer != null;
    const wrong = [];
    const skipped = [];
    questions.forEach((q, i) => {
      const num = qNumber(q, i);
      if (q.is_correct) return;
      if (attempted(q)) wrong.push({ num, q });
      else skipped.push({ num, q });
    });

    const lost = wrong.reduce((sum, w) => sum + Math.abs(Number(w.q.negative_marks) || 0), 0);
    const missed = skipped.reduce((sum, s) => sum + (Number(s.q.positive_marks) || 0), 0);

    // topics that cost the most (wrong questions first, then skipped)
    const topicMap = new Map();
    const bump = (q, kind) => {
      const topic = q.topic || `${q.section} (untagged)`;
      const entry = topicMap.get(topic) || { topic, subject: q.section, wrong: 0, skipped: 0, numbers: [] };
      entry[kind] += 1;
      if (entry.numbers.length < 12) entry.numbers.push(q.global_position || q.position);
      topicMap.set(topic, entry);
    };
    wrong.forEach(({ q }) => bump(q, 'wrong'));
    skipped.forEach(({ q }) => bump(q, 'skipped'));
    const topics = [...topicMap.values()].sort(
      (a, b) => (b.wrong * 2 + b.skipped) - (a.wrong * 2 + a.skipped)
    );

    return { wrong, skipped, lost, missed, topics };
  }, [questions]);

  const chipLine = (num, q, kind) => {
    const bits = [q.section, q.topic, q.subtopic].filter(Boolean);
    const label = bits.length ? ` [${bits.join(' | ')}]` : '';
    const prompt = kind === 'skipped' ? 'skipped - why? ' : 'mistake: ';
    return `\nQ${num}${label} ${prompt}`;
  };

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;

  const statusText = (() => {
    switch (status) {
      case 'loading': return 'Loading your note...';
      case 'saving': return 'Saving...';
      case 'dirty': return 'Unsaved changes - saving automatically...';
      case 'saved': return offlineOnly ? 'Saved on this device' : `Saved${updatedAt ? ' at ' + clockTime(updatedAt) : ''}`;
      case 'error': return 'Not saved yet - retrying when you type';
      default: return updatedAt ? `Last saved at ${clockTime(updatedAt)}` : 'Start writing - your note saves itself';
    }
  })();

  const activeList = openGroup === 'wrong' ? log.wrong : log.skipped;

  return (
    <div className="ta2-note">
      <div className="ta2-note__intro">
        <div className="ta2-note__intro-main">
          <h2 className="ta2-note__title">Learning &amp; Mistake Notes</h2>
          <p className="ta2-note__sub">
            Write down what went wrong and what you learnt in <strong>{testTitle}</strong>. These notes
            stay with the test, so they are still there when you retake it.
          </p>
        </div>
        <div className="ta2-note__score">
          <span className="ta2-note__score-row">
            <strong>{log.wrong.length}</strong> wrong
          </span>
          <span className="ta2-note__score-row">
            <strong>{log.skipped.length}</strong> skipped
          </span>
          <span className="ta2-note__score-row ta2-note__score-row--red">
            <strong>-{Math.round(log.lost * 100) / 100}</strong> marks lost
          </span>
        </div>
      </div>

      <div className="ta2-note__grid">
        {/* ---------------------------- editor -------------------------- */}
        <div className="ta2-note__editor-card">
          <div className="ta2-note__toolbar">
            <span className="ta2-note__toolbar-label">Insert section:</span>
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                type="button"
                className="ta2-note__tpl"
                onClick={() => insert(t.text)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <textarea
            ref={areaRef}
            className="ta2-note__area"
            value={content}
            onChange={onChange}
            onBlur={() => { if (dirtyRef.current) persist(content); }}
            placeholder={'What mistakes did I make?\nWhat did I learn?\nWhat will I do differently next time?'}
            spellCheck
          />

          <div className="ta2-note__foot">
            <span className={`ta2-note__status ta2-note__status--${status}`}>{statusText}</span>
            <span className="ta2-note__counts">{words} words &middot; {chars} characters</span>
            <button
              type="button"
              className="ta2-btn ta2-btn--primary"
              onClick={() => persist(content)}
              disabled={status === 'saving'}
            >
              {status === 'saving' ? 'Saving...' : 'Save Note'}
            </button>
          </div>

          {error && <p className="ta2-note__error">{error}</p>}
          {offlineOnly && (
            <p className="ta2-note__hint">
              {userId
                ? 'The note is stored on this device because the server could not be reached. It will sync when you save again.'
                : 'Log in to sync your notes across devices - meanwhile they are saved in this browser.'}
            </p>
          )}
        </div>

        {/* --------------------------- checklist ------------------------ */}
        <div className="ta2-note__side">
          <div className="ta2-note__side-head">
            <h3 className="ta2-note__side-title">Questions to write about</h3>
            <p className="ta2-note__side-sub">
              Tap a question to drop it into your note, then explain the reason.
            </p>
          </div>

          <div className="ta2-note__tabs">
            <button
              type="button"
              className={`ta2-note__tab${openGroup === 'wrong' ? ' ta2-note__tab--active' : ''}`}
              onClick={() => setOpenGroup('wrong')}
            >
              Wrong ({log.wrong.length})
            </button>
            <button
              type="button"
              className={`ta2-note__tab${openGroup === 'skipped' ? ' ta2-note__tab--active' : ''}`}
              onClick={() => setOpenGroup('skipped')}
            >
              Skipped ({log.skipped.length})
            </button>
            <button
              type="button"
              className={`ta2-note__tab${openGroup === 'topics' ? ' ta2-note__tab--active' : ''}`}
              onClick={() => setOpenGroup('topics')}
            >
              Topics ({log.topics.length})
            </button>
          </div>

          <div className="ta2-note__chips">
            {openGroup !== 'topics' && activeList.length === 0 && (
              <p className="ta2-note__empty">
                Nothing here - {openGroup === 'wrong' ? 'no wrong answers' : 'no skipped questions'} in this
                test.
              </p>
            )}
            {openGroup !== 'topics' && activeList.map(({ num, q }) => (
              <button
                key={`${openGroup}-${q.id || num}`}
                type="button"
                className="ta2-note__chip"
                title={`${q.section}${q.topic ? ' - ' + q.topic : ''}: add to note`}
                onClick={() => insert(chipLine(num, q, openGroup))}
              >
                <span className="ta2-note__chip-num">Q{num}</span>
                <span className="ta2-note__chip-label">
                  {q.section}{q.topic ? ` \u00b7 ${q.topic}` : ''}
                </span>
              </button>
            ))}

            {openGroup === 'topics' && log.topics.length === 0 && (
              <p className="ta2-note__empty">No mistakes and no skipped questions - outstanding!</p>
            )}
            {openGroup === 'topics' && log.topics.map((t) => (
              <button
                key={t.topic}
                type="button"
                className="ta2-note__chip ta2-note__chip--topic"
                title={`${t.wrong} wrong, ${t.skipped} skipped`}
                onClick={() => insert(`\n${t.topic} (${t.subject}) - revise: `)}
              >
                <span className="ta2-note__chip-num">{t.wrong + t.skipped}x</span>
                <span className="ta2-note__chip-label">{t.topic}</span>
                <span className="ta2-note__chip-meta">
                  {t.wrong} wrong{t.skipped ? `, ${t.skipped} skipped` : ''}
                </span>
              </button>
            ))}
          </div>

          <ul className="ta2-note__tips">
            <li>Write the <strong>reason</strong>, not just the question: concept gap, silly mistake, misread, time pressure.</li>
            <li>One line per mistake is enough - the point is to read it before the next test.</li>
            <li>Add the formula or step you must remember, so revision takes seconds.</li>
          </ul>

          <div className="ta2-note__actions">
            <button type="button" className="ta2-btn" onClick={onBack}>Back to Analysis</button>
          </div>
        </div>
      </div>
    </div>
  );
}
