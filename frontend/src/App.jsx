import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ExamTimer, { DEFAULT_DURATION_SECONDS } from './ExamTimer.jsx';

import SplashScreen from './SplashScreen.jsx';

import TimeAnalysis from './TimeAnalysis.jsx';

import TimeIntervalAnalysis from './TimeIntervalAnalysis.jsx';

import ErrorDistribution from './ErrorDistribution.jsx';

import DifficultyAnalysis from './DifficultyAnalysis.jsx';
import QuestionJourney from './QuestionJourney.jsx';
import QuestionTypeAnalysis from './QuestionTypeAnalysis.jsx';



const API = ''; // same origin; vite proxies /tests and /attempts to the API



async function api(path, options) {

  const res = await fetch(API + path, {

    headers: { 'Content-Type': 'application/json' },

    ...options,

  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {

    const err = new Error(body.error || `Request failed (${res.status})`);

    err.status = res.status;

    throw err;

  }

  return body;

}



// pg returns bigint columns as strings; always coerce ids to Number.

const asId = (v) => Number(v);



// 95 -> "1m 35s", 3725 -> "1h 2m 5s"

function formatDuration(totalSeconds) {

  const t = Math.max(0, Math.round(Number(totalSeconds) || 0));

  const h = Math.floor(t / 3600);

  const m = Math.floor((t % 3600) / 60);

  const s = t % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;

  if (m > 0) return `${m}m ${s}s`;

  return `${s}s`;

}



// Flatten a test into a single ordered list of questions carrying their

// section name/index for tabs, palette and the review screen.

function flattenTest(test) {

  if (!test) return [];

  const flat = [];

  test.sections.forEach((section, sectionIndex) => {

    section.questions.forEach((q) => {

      flat.push({ ...q, sectionName: section.name, sectionIndex });

    });

  });

  return flat;

}

function questionNumber(question, fallback) {
  return question.global_position || question.position || fallback;
}



const SUBJECT_COLORS = { Physics: '#2563eb', Chemistry: '#7c3aed', Mathematics: '#059669' };

const HIDDEN_HOME_TEST_TITLE = 'JEE Main 2026 Mock 2 (Full Length)';



// Quick-jump groups for the strip above the "Go To" bar: subject + type,

// in display order (Maths first, MCQ before numerical, as on the real CBT).

const QUICK_JUMP_GROUPS = [

  { section: 'Mathematics', type: 'mcq', label: 'Maths MCQ' },

  { section: 'Mathematics', type: 'numerical', label: 'Maths Numerical' },

  { section: 'Physics', type: 'mcq', label: 'Physics MCQ' },

  { section: 'Physics', type: 'numerical', label: 'Physics Numerical' },

  { section: 'Chemistry', type: 'mcq', label: 'Chemistry MCQ' },

  { section: 'Chemistry', type: 'numerical', label: 'Chemistry Numerical' },

];



// ---------------------------------------------------------------------------

// App - realistic JEE Main mock-test interface.

//   ?test_id=N  pick a specific test (default: first published test)

//   ?user_id=N  user taking the exam (default: 1)

// ---------------------------------------------------------------------------

export default function App() {

    // AceIT Up cinematic splash screen

  const [showSplash, setShowSplash] = useState(true);



  useEffect(() => {

    const splashTimer = setTimeout(() => {

      setShowSplash(false);

    }, 4800);



    return () => clearTimeout(splashTimer);

  }, []);

  // ---------------------------------------------------------------------

  // LOGIN STATE — remembers who's logged in, even after closing the app

  // ---------------------------------------------------------------------

  const [user, setUser] = useState(() => {

    const saved = localStorage.getItem('aceitup_user');

    return saved ? JSON.parse(saved) : null;

  });

  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

  const [authForm, setAuthForm] = useState({ email: '', password: '', full_name: '' });

  const [authError, setAuthError] = useState('');



  async function handleAuthSubmit(e) {

    e.preventDefault();

    setAuthError('');

    try {

      const path = authMode === 'login' ? '/api/login' : '/api/signup';

      const body = authMode === 'login'

        ? { email: authForm.email, password: authForm.password }

        : { email: authForm.email, password: authForm.password, full_name: authForm.full_name };

      const data = await api(path, { method: 'POST', body: JSON.stringify(body) });

      setUser(data.user);

      localStorage.setItem('aceitup_user', JSON.stringify(data.user));

    } catch (err) {

      setAuthError(err.message || 'Something went wrong');

    }

  }



  function handleLogout() {

    setUser(null);

    localStorage.removeItem('aceitup_user');

  }

  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  const testIdParam = Number(params.get('test_id'));

  const userId = user ? asId(user.id) : null;

  const [historyView, setHistoryView] = useState({ testId: null }); // null = test picker

  const [historyError, setHistoryError] = useState('');

  const [historyData, setHistoryData] = useState([]);

  const [historyLoading, setHistoryLoading] = useState(false);



  async function openHistory() {

    setPhase('history');

    setHistoryView({ testId: null });

    setResultData(null);

    setResultError('');

    setHistoryLoading(true);

    setHistoryError('');

    try {

      const data = await api(`/api/users/${userId}/attempts`);

      setHistoryData(data.attempts);

    } catch (err) {

      setHistoryError(err.message || 'Could not load history');

    } finally {

      setHistoryLoading(false);

    }

  }

  const [resultData, setResultData] = useState(null);

  const [resultLoading, setResultLoading] = useState(false);

  const [resultError, setResultError] = useState('');



  async function openResult(attemptId) {

    setResultLoading(true);

    setResultData(null);

    setResultError('');

    try {

      const data = await api(`/attempts/${attemptId}/result`);

      setResultData(data);

    } catch (err) {

      setResultError(err.message || 'Could not load analysis');

    } finally {

      setResultLoading(false);

    }

  }

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('aceitup_theme') === 'dark');



  useEffect(() => {

    document.body.classList.toggle('dark', darkMode);

    localStorage.setItem('aceitup_theme', darkMode ? 'dark' : 'light');

  }, [darkMode]);



  const [phase, setPhase] = useState('loading'); // loading | start | ready | submitted | exited | error

  const [pendingTest, setPendingTest] = useState(null);

  const [pendingResumeId, setPendingResumeId] = useState(null);

  const [error, setError] = useState('');

  const [tests, setTests] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');

  const [test, setTest] = useState(null);

  const [attempt, setAttempt] = useState(null); // { attempt_id, start_time }

  const [answers, setAnswers] = useState({});   // qid -> { status, selected_option_id, numerical_value }

  const [current, setCurrent] = useState(0);    // index into allQuestions

  const [result, setResult] = useState(null);   // detailed analysis

  const [submitting, setSubmitting] = useState(false);

  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const [showExitModal, setShowExitModal] = useState(false);

  const [showPalette, setShowPalette] = useState(false); // mobile drawer



  const allQuestions = useMemo(() => flattenTest(test), [test]);



  // --- per-question time tracking ------------------------------------------

  // timeSpentRef: question_id -> accumulated whole seconds the student had

  // that question on screen. A 1s tick adds to the visible question while the

  // exam is live; values are sent with each save and with the submit call.

  const timeSpentRef = useRef({});

  const lastTickRef = useRef(Date.now());

  const currentRef = useRef(0);

  currentRef.current = current;



  const tick = useCallback(() => {

    const now = Date.now();

    const last = lastTickRef.current;

    lastTickRef.current = now;

    if (phase !== 'ready' || !attempt || !last) return;

    const q = allQuestions[currentRef.current];

    if (!q) return;

    const delta = Math.round((now - last) / 1000);

    if (delta > 0) {

      timeSpentRef.current[q.id] = (timeSpentRef.current[q.id] || 0) + delta;

    }

  }, [phase, attempt, allQuestions]);



  // Accumulate time on the visible question once per second.

  useEffect(() => {

    if (phase !== 'ready') return undefined;

    const iv = setInterval(tick, 1000);

    return () => clearInterval(iv);

  }, [phase, tick]);



  // --- load the test catalogue --------------------------------------------

  useEffect(() => {

    let cancelled = false;

    (async () => {

      try {

        const list = await api('/tests');

        if (cancelled) return;

        setTests(list);

        setPhase('start');

      } catch (err) {

        if (!cancelled) {

          setError(err.message);

          setPhase('error');

        }

      }

    })();

    return () => { cancelled = true; };

  }, []);



    // --- filter the catalogue by the topbar search box -----------------------

  const filteredTests = useMemo(() => {

    const q = searchQuery.trim().toLowerCase();

    const availableTests = tests

      .filter((t) => t.title !== HIDDEN_HOME_TEST_TITLE)

      .map((t, index) => ({ ...t, title: `Mock Test ${index + 1}` }));

    if (!q) return availableTests;

    return availableTests.filter((t) =>

      (t.title || '').toLowerCase().includes(q) ||

      (t.description || '').toLowerCase().includes(q)

    );

  }, [tests, searchQuery]);

// --- build the answers map from server state (questions carry status) ----

  const buildAnswersFromTest = useCallback((detail) => {

    const map = {};

    for (const q of flattenTest(detail)) {

      map[q.id] = {

        status: q.status || 'not_visited',

        selected_option_id: q.selected_option_id != null ? asId(q.selected_option_id) : null,

        numerical_value: q.numerical_answer != null ? String(q.numerical_answer) : '',

      };

    }

    return map;

  }, []);



  // Start (or resume) an attempt on the chosen test.

  const beginAttempt = useCallback(

    async (chosenTest, resumeId) => {

      setPhase('loading');

      setError('');

      try {

        let attemptData;

        if (resumeId) {

          attemptData = await api(`/attempts/${asId(resumeId)}`);

        } else {

          attemptData = await api('/attempts', {

            method: 'POST',

            body: JSON.stringify({ user_id: userId, test_id: asId(chosenTest.id) }),

          });

          attemptData = await api(`/attempts/${asId(attemptData.attempt_id)}`);

        }

        setTest({ ...attemptData.test, title: chosenTest.title });

        setAttempt({ attempt_id: asId(attemptData.attempt_id), start_time: attemptData.start_time });

        setAnswers(buildAnswersFromTest(attemptData.test));

        // Restore accumulated per-question times for this attempt.

        timeSpentRef.current = {};

        lastTickRef.current = Date.now();

        for (const q of flattenTest(attemptData.test)) {

          if (q.time_spent_seconds) timeSpentRef.current[q.id] = Number(q.time_spent_seconds);

        }

        setCurrent(0);

        setShowPalette(false);

        setPhase('ready');

      } catch (err) {

        if (err.status === 409 && /in.progress/i.test(err.message)) {

          // Another attempt is already running for this user+test.

          try {

            const running = await api(`/attempts?user_id=${userId}&test_id=${asId(chosenTest.id)}`);

            await beginAttempt(chosenTest, running.attempt_id);

            return;

          } catch (_) { /* fall through */ }

        }

        setError(err.message);

        setPhase('error');

      }

    },

    [userId, buildAnswersFromTest]

  );



  // --- answer state helpers ------------------------------------------------

  const answerFor = (question) => answers[question.id];



  const hasAnswer = (question) => {

    const a = answerFor(question);

    if (!a) return false;

    if (question.question_type === 'mcq') return a.selected_option_id != null;

    return a.numerical_value !== undefined && a.numerical_value !== null && String(a.numerical_value).trim() !== '';

  };



  // Debounced live-save queue: one pending payload per question.

  const pendingRef = useRef({});

  const saveTimerRef = useRef(null);

  const attemptRef = useRef(null);

  attemptRef.current = attempt;



  const flushPending = useCallback(async () => {

    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }

    const pending = pendingRef.current;

    pendingRef.current = {};

    const attemptId = attemptRef.current && attemptRef.current.attempt_id;

    if (!attemptId) return;

    const entries = Object.entries(pending);

    for (const [qid, payload] of entries) {

      try {

        await api(`/attempts/${asId(attemptId)}/answer`, {

          method: 'POST',

          body: JSON.stringify({ question_id: asId(qid), ...payload }),

        });

      } catch (_) { /* a failed live-save is retried on the next change */ }

    }

  }, []);



  const scheduleSave = useCallback(

    (qid, payload) => {

      pendingRef.current[qid] = payload;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => { flushPending(); }, 800);

    },

    [flushPending]

  );



  // Update local state + schedule the live save (answer + accumulated time).

  const setAnswer = useCallback(

    (question, patch) => {

      setAnswers((prev) => {

        const prevA = prev[question.id] || { status: 'not_visited', selected_option_id: null, numerical_value: '' };

        const next = { ...prev, [question.id]: { ...prevA, ...patch } };

        return next;

      });

      const a = { ...(answers[question.id] || {}), ...patch };

      const payload = {

        status: a.status || 'answered',

        time_spent_seconds: Math.round(timeSpentRef.current[question.id] || 0),

      };

      if (a.selected_option_id != null) payload.selected_option_id = asId(a.selected_option_id);

      if (a.numerical_value !== undefined && a.numerical_value !== null && String(a.numerical_value).trim() !== '') {

        payload.numerical_value = a.numerical_value;

      }

      scheduleSave(question.id, payload);

    },

    [answers, scheduleSave]

  );



  // A question becomes "visited" (JEE palette: red / Not Answered) as soon as

  // it is on screen, even without an answer. Persisted so a page refresh keeps

  // the palette accurate.

  useEffect(() => {

    if (phase !== 'ready') return;

    const q = allQuestions[current];

    if (!q) return;

    const a = answers[q.id];

    if (a && !hasAnswer(q) && (a.status === 'not_visited' || a.status === 'visited') && a.status !== 'visited') {

      setAnswer(q, { status: 'visited' });

    }

  }, [phase, current, allQuestions, answers, setAnswer]);



  const selectOption = (question, optId) => {

    setAnswer(question, { status: 'answered', selected_option_id: asId(optId) });

  };



  const changeNumerical = (question, value) => {

    if (value === '') {

      // Cleared numerical input: question was seen, so it becomes "Not Answered".

      setAnswer(question, { status: 'visited', numerical_value: '' });

    } else {

      setAnswer(question, { status: 'answered', numerical_value: value });

    }

  };



  const clearResponse = (question) => {

    // Cleared answers still count as "seen" (Not Answered), like the real CBT.

    setAnswer(question, { status: 'visited', selected_option_id: null, numerical_value: '' });

  };



  const markForReview = (question) => {

    const a = answerFor(question) || {};

    const answered = hasAnswer(question);

    setAnswer(question, {

      status: 'marked_for_review',

      selected_option_id: answered ? a.selected_option_id : null,

      numerical_value: answered ? a.numerical_value : '',

    });

  };



  // --- palette / navigation helpers ----------------------------------------

  // JEE Main palette states: Not Visited / Not Answered / Answered /

  // Marked for Review / Answered & Marked for Review. The current question

  // gets an additional class so its status color remains visible.

  const paletteState = (q) => {

    const a = answerFor(q);

    if (!a || a.status === 'not_visited') return 'not-visited';

    if (a.status === 'marked_for_review') {

      return hasAnswer(q) ? 'answered-marked' : 'marked';

    }

    if (a.status === 'answered') return 'answered';

    return 'not-answered'; // visited, no answer

  };



  // Palette + submit-summary counts across the whole test.

  // First question index for every quick-jump group; null if a group is empty.

  const quickJumps = useMemo(() =>

    QUICK_JUMP_GROUPS.map((g) => {

      const index = allQuestions.findIndex(

        (q) => q.sectionName === g.section && q.question_type === g.type

      );

      return index >= 0 ? { ...g, index } : null;

    }).filter(Boolean),

    [allQuestions]

  );



  const paletteCounts = useMemo(() => {

    const c = { not_visited: 0, not_answered: 0, answered: 0, marked: 0, answered_marked: 0 };

    for (const q of allQuestions) {

      const a = answerFor(q);

      if (!a || a.status === 'not_visited') {

        c.not_visited += 1;

      } else if (a.status === 'marked_for_review') {

        if (hasAnswer(q)) c.answered_marked += 1;

        else c.marked += 1;

      } else if (a.status === 'visited') {

        c.not_answered += 1;

      } else if (hasAnswer(q)) {

        c.answered += 1;

      } else {

        c.not_answered += 1;

      }

    }

    return c;

  }, [allQuestions, answers]);



  const goToQuestion = (i) => {

    goTo(i);

    setShowPalette(false);

  };



  // Navigate: flush elapsed time to the outgoing question and (if nothing is

  // already queued for it) persist its status + accumulated time so a page

  // close mid-exam does not lose the time spent so far.

  const goTo = useCallback(

    (index) => {

      const clamped = Math.max(0, Math.min(index, allQuestions.length - 1));

      tick(); // attribute elapsed time to the outgoing question

      const oldQid = allQuestions[currentRef.current] && allQuestions[currentRef.current].id;

      if (oldQid != null && !pendingRef.current[oldQid]) {

        const a = answers[oldQid] || {};

        const payload = {

          status: a.status || 'not_visited',

          time_spent_seconds: Math.round(timeSpentRef.current[oldQid] || 0),

        };

        if (a.selected_option_id != null) payload.selected_option_id = asId(a.selected_option_id);

        if (a.numerical_value !== undefined && a.numerical_value !== null && String(a.numerical_value).trim() !== '') {

          payload.numerical_value = a.numerical_value;

        }

        scheduleSave(oldQid, payload);

      }

      setCurrent(clamped);
      // record navigation (fire-and-forget)
      try {
        const newQid = allQuestions[clamped] && allQuestions[clamped].id;
        const aId = attempt && attempt.attempt_id ? asId(attempt.attempt_id) : null;
        if (aId && oldQid != null && newQid != null) {
          fetch('/api/attempts/' + aId + '/journey', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_question_id: oldQid, to_question_id: newQid, viewed_at: new Date().toISOString() })
          }).catch(() => {});
        }
      } catch (e) { /* ignore */ }


    },

    [allQuestions, answers, scheduleSave, tick]

  );



  const answeredCount = allQuestions.filter((q) => hasAnswer(q)).length;

  // --- submit --------------------------------------------------------------

  const buildPayload = useCallback(() => {

    const payload = [];

    for (const q of allQuestions) {

      const a = answerFor(q);

      if (!a || !hasAnswer(q)) continue;

      if (q.question_type === 'mcq') {

        payload.push({ question_id: asId(q.id), selected_option_id: asId(a.selected_option_id) });

      } else {

        payload.push({ question_id: asId(q.id), numerical_value: Number(a.numerical_value) });

      }

    }

    return payload;

  }, [allQuestions, answers]);



  const submitAttempt = useCallback(

    async (auto) => {

      if (!attempt || submitting) return;

      setSubmitting(true);

      try {

        await flushPending();

        tick(); // count the final moment on the visible question

        const payload = buildPayload();

        await api(`/attempts/${asId(attempt.attempt_id)}/submit`, {

          method: 'POST',

          body: JSON.stringify({ answers: payload, time_spent: timeSpentRef.current }),

        });

        const detail = await api(`/attempts/${asId(attempt.attempt_id)}/result`);

        setResult(detail);

        setPhase('submitted');

      } catch (err) {

        setError(`Submit${auto ? ' (auto)' : ''} failed: ${err.message}`);

        setSubmitting(false);

        setShowSubmitModal(false);

      }

    },

    [attempt, submitting, flushPending, buildPayload, tick]

  );



  const handleTimeUp = useCallback(() => { submitAttempt(true); }, [submitAttempt]);



  const confirmExit = () => {

    setShowExitModal(false);

    setPhase('exited');

  };



  const backToTests = () => {

    window.location.reload();

  };



  const backToHome = () => {

    setResult(null);

    setResultData(null);

    setResultError('');

    setHistoryView({ testId: null });

    setPhase('start');

  };



  // -------------------------------------------------------------------------

  // Rendering

  // -------------------------------------------------------------------------

    if (showSplash) {

    return <SplashScreen />;

  }

  if (phase === 'loading') {

    return <div className="exam-page"><p className="muted">Loading...</p></div>;

  }



  if (!user) {

    return (

      <div style={{ maxWidth: 400, margin: '80px auto', padding: 24, border: '1px solid #b9c2ce', borderRadius: 8 }}>

        <h2>{authMode === 'login' ? 'Log In' : 'Sign Up'}</h2>

        <form onSubmit={handleAuthSubmit}>

          {authMode === 'signup' && (

            <div style={{ marginBottom: 12 }}>

              <label>Full Name</label><br />

              <input type="text" value={authForm.full_name} onChange={(e) => setAuthForm({ ...authForm, full_name: e.target.value })} style={{ width: '100%', padding: 8 }} required />

            </div>

          )}

          <div style={{ marginBottom: 12 }}>

            <label>Email</label><br />

            <input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} style={{ width: '100%', padding: 8 }} required />

          </div>

          <div style={{ marginBottom: 12 }}>

            <label>Password</label><br />

            <input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} style={{ width: '100%', padding: 8 }} required />

          </div>

          {authError && <p style={{ color: '#c62828' }}>{authError}</p>}

          <button type="submit" className="btn-primary" style={{ width: '100%' }}>

            {authMode === 'login' ? 'Log In' : 'Sign Up'}

          </button>

        </form>

        <p style={{ marginTop: 12, textAlign: 'center' }}>

          {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}

          <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}>

            {authMode === 'login' ? 'Sign Up' : 'Log In'}

          </a>

        </p>

      </div>

    );

  }

  

  if (phase === 'error') {

    return (

      <div className="exam-page">

        <h1>Something went wrong</h1>

        <p className="error">{error}</p>

        <button className="btn-primary" onClick={backToTests}>Back to tests</button>

      </div>

    );

  }



  // ============================= START SCREEN ==============================

  if (phase === 'start') {

    return (

      <div className="app-shell">

        <aside className="sidebar">

          <div className="sidebar__brand">

            <span className="sidebar__logo">A</span>

            <h1>Ace It Up</h1>

          </div>

          <nav className="sidebar__nav">

            <button className="sidebar__link sidebar__link--active">🏠 Home</button>

            <button className="sidebar__link" onClick={openHistory}>🕘 My History</button>

            <button className="sidebar__link" onClick={() => setDarkMode((v) => !v)}>

              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}

            </button>

          </nav>

          <div className="sidebar__footer">

            <button className="sidebar__link sidebar__link--logout" onClick={handleLogout}>🚪 Logout</button>

          </div>

        </aside>



        <div className="app-main">

          <header className="topbar">

            <div className="topbar__search">

                            <input

                type="text"

                placeholder="Search tests..."

                value={searchQuery}

                onChange={(e) => setSearchQuery(e.target.value)}

              />

              {searchQuery && (

                <button className="topbar__search-clear" onClick={() => setSearchQuery('')} title="Clear search">×</button>

              )}

            </div>

            <button className="avatar-btn" onClick={() => setShowProfileMenu((v) => !v)}>

              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : '?'}

            </button>

            {showProfileMenu && (

              <div className="profile-menu">

                <div className="profile-menu__name">{user?.full_name}</div>

                <div className="profile-menu__email">{user?.email}</div>

                <button onClick={() => { setShowProfileMenu(false); openHistory(); }}>My History</button>

                <button onClick={() => setDarkMode((v) => !v)}>

                  {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}

                </button>

                <button onClick={handleLogout}>Logout</button>

              </div>

            )}

          </header>



          <main className="content-area">

            <p className="hero-tagline">Let's go beyond rote learning.</p>



            <h2 className="test-list-title">Available Tests</h2>

            <div className="test-list">

              {tests.length === 0 && <p className="muted">No published tests available.</p>}

              {tests.length > 0 && filteredTests.length === 0 && (

                <p className="muted">No tests match "{searchQuery}".</p>

              )}

              {filteredTests.map((t) => (

                <TestCard

                  key={t.id}

                  test={t}

                  userId={userId}

                  onStart={(resumeId) => {

                    setPendingTest(t);

                    setPendingResumeId(resumeId);

                    setPhase('instructions');

                  }}

                />

              ))}

            </div>



          </main>

        </div>

      </div>

    );

  }



  // ============================== HISTORY =================================

  if (phase === 'history') {

    return (

      <HistoryPage

        attempts={historyData}

        loading={historyLoading}

        error={historyError}

        selectedTestId={historyView.testId}

        result={resultData}

        resultLoading={resultLoading}

        resultError={resultError}

        onBack={() => { setResultData(null); setResultError(''); setPhase('start'); }}

        onSelectTest={(testId) => setHistoryView({ testId })}

        onBackToTestsList={() => { setResultData(null); setResultError(''); }}

        onViewAnalysis={(attemptId) => openResult(attemptId)}

        onResume={(testId, attemptId) => {

          const t = tests.find((x) => asId(x.id) === asId(testId));

          if (!t) { setPhase('start'); return; }

          setPendingTest(t);

          setPendingResumeId(attemptId);

          setPhase('instructions');

        }}

      />

    );

  }



  // ============================ INSTRUCTIONS ==============================

if (phase === 'instructions' && pendingTest) {

  return (

    <div className="instructions-page">

      <div className="instructions-card">

        <h1>{pendingTest.title}</h1>

        <p>Read the instructions carefully before starting the test.</p>



        <h2>Exam Instructions</h2>

        <ul>

          <li>The test has 3 sections: Physics, Chemistry and Mathematics.</li>

          <li>Each section has 20 MCQ + 5 numerical questions.</li>

          <li>+4 marks for a correct answer and -1 for an incorrect answer.</li>

          <li>The duration is 3 hours (180 minutes).</li>

          <li>You can use Mark for Review to return to questions later.</li>

          <li>The test will automatically submit when the timer reaches zero.</li>

        </ul>



        <label>

          <input type="checkbox" id="instruction-confirm" />

          I have read and understood the instructions.

        </label>



        <br /><br />



        <button

          className="btn-primary"

          onClick={() => {

            if (!document.getElementById('instruction-confirm').checked) {

              alert('Please confirm that you have read the instructions.');

              return;

            }

            beginAttempt(pendingTest, pendingResumeId);

          }}

        >

          I’m Ready — Start Test

        </button>

      </div>

    </div>

  );

}

  // ============================== EXITED ==================================

  if (phase === 'exited') {

    return (

      <div className="exam-page">

        <h1>You have exited the exam</h1>

        <p className="muted">

          Your answers were not submitted. Attempt #{attempt ? attempt.attempt_id : '-'} was left incomplete

          ({answeredCount}/{allQuestions.length} answered).

        </p>

        <button className="btn-primary" onClick={backToTests}>Back to tests</button>

      </div>

    );

  }



  // ============================ SUBMITTED (ANALYSIS) =======================

  if (phase === 'submitted') {

    return (

      <Analysis

        result={result}

        onRetake={backToTests}

        onBackHome={backToHome}

      />

    );

  }



  // ============================== EXAM SCREEN ==============================

  const question = allQuestions[current];

  const isMcq = question.question_type === 'mcq';

  const qAnswer = answerFor(question) || {};



  return (

    <div className="exam-page">

      <header className="exam-header">

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

      </header>



      <nav className="quick-jump" aria-label="Jump to section and question type">

        {quickJumps.map((g) => (

          <button

            key={g.label}

            className={`quick-jump__btn${question.sectionName === g.section && question.question_type === g.type ? ' quick-jump__btn--active' : ''}`}

            onClick={() => goTo(g.index)}

            title={`Jump to ${g.label} (Q${g.index + 1})`}

          >

            {g.label}

          </button>

        ))}

      </nav>



      <div className="exam-layout">

        <main className="question-panel">

          <div className="question-meta">

            <span>

              {question.sectionName} | Question {current + 1} of {allQuestions.length}

              <span className={`difficulty-badge difficulty-badge--${question.difficulty || 'easy'}`}>

                {question.difficulty || 'easy'}

              </span>

            </span>

            <span className="muted">

              {isMcq ? 'MCQ' : 'Numerical'} | +{question.positive_marks} / -{question.negative_marks}

            </span>

          </div>

          <p className="question-body">{question.body}</p>

          {question.formula && <p className="formula">{question.formula}</p>}



          {isMcq ? (

            <div className="options">

              {question.options.map((opt, oi) => {

                const selected = qAnswer.selected_option_id === asId(opt.id);

                return (

                  <button

                    key={opt.id}

                    className={`option${selected ? ' option--selected' : ''}`}

                    onClick={() => selectOption(question, opt.id)}

                  >

                    <span className="option-key">{String.fromCharCode(65 + oi)}.</span>

                    {opt.formula ? opt.formula : opt.body}

                  </button>

                );

              })}

            </div>

          ) : (

            <div className="num-input-wrap">

              <label className="muted" htmlFor={`num-${question.id}`}>

                Enter your numerical answer (as a decimal number):

              </label>

              <input

                id={`num-${question.id}`}

                className="num-input"

                type="number"

                step="any"

                placeholder="Type your answer"

                value={qAnswer.numerical_value ?? ''}

                onChange={(e) => changeNumerical(question, e.target.value)}

              />

            </div>

          )}



          <div className="q-actions">

            <button

              className="btn-nav"

              disabled={current === 0}

              onClick={() => goTo(current - 1)}

            >

              Previous

            </button>

            <button className="btn-clear" onClick={() => clearResponse(question)}>

              Clear Response

            </button>

            <button

              className="btn-mark"

              onClick={() => {

                if (qAnswer.status === 'marked_for_review') {

                  // Unmark: restore answered (or visited) state.

                  const answered = hasAnswer(question);

                  setAnswer(question, {

                    status: answered ? 'answered' : 'visited',

                    selected_option_id: answered ? qAnswer.selected_option_id : null,

                    numerical_value: answered ? qAnswer.numerical_value : '',

                  });

                } else {

                  markForReview(question);

                  goTo(Math.min(current + 1, allQuestions.length - 1));

                }

              }}

            >

              {qAnswer.status === 'marked_for_review' ? 'Unmark' : 'Mark for Review & Next'}

            </button>

            <button

              className="btn-save"

              onClick={() => goTo(Math.min(current + 1, allQuestions.length - 1))}

            >

              Save & Next

            </button>

          </div>

        </main>



        <aside className={`palette-panel${showPalette ? ' palette-panel--open' : ''}`}>

          <div className="palette-head">

            <h2>Question Palette</h2>

            <button className="palette-close" onClick={() => setShowPalette(false)} aria-label="Close palette">

              Close

            </button>

          </div>          <div className="palette">

            {(() => {

              const activeLabel = `${question.sectionName} ${isMcq ? 'MCQ' : 'Numerical'}`;

              const groupQuestions = allQuestions

                .map((q, i) => ({ q, i }))

                .filter(({ q }) => q.sectionName === question.sectionName && q.question_type === question.question_type);

              return (

                <div className="palette-section">

                  <div className="palette-section__label">{activeLabel}</div>

                  <div className="palette-section__grid">

                    {groupQuestions.map(({ q, i }) => (

                      <button

                        key={q.id}

                        className={`palette-btn palette-btn--${paletteState(q, i)}${i === current ? ' palette-btn--current' : ''}`}

                        onClick={() => goToQuestion(i)}

                        title={`${q.sectionName} Q${questionNumber(q, i + 1)}`}

                      >

                        {questionNumber(q, i + 1)}

                      </button>

                    ))}

                  </div>

                </div>

              );

            })()}

          </div><div className="legend">

            <span><i className="dot dot--not-visited" /> Not Visited</span>

            <span><i className="dot dot--not-answered" /> Not Answered</span>

            <span><i className="dot dot--answered" /> Answered</span>

            <span><i className="dot dot--marked" /> Marked for Review</span>

            <span><i className="dot dot--answered-marked" /> Answered &amp; Marked for Review</span>

            <span><i className="dot dot--current" /> Current</span>

          </div>

          <div className="palette-summary">

            <p>Answered: <strong>{paletteCounts.answered}</strong></p>

            <p>Not Answered: <strong>{paletteCounts.not_answered}</strong></p>

            <p>Not Visited: <strong>{paletteCounts.not_visited}</strong></p>

            <p>Marked for Review: <strong>{paletteCounts.marked}</strong></p>

            <p>Answered &amp; Marked: <strong>{paletteCounts.answered_marked}</strong></p>

          </div>

          <button

            className="btn-submit"

            disabled={submitting}

            onClick={() => setShowSubmitModal(true)}

          >

            {submitting ? 'Submitting...' : 'Submit Test'}

          </button>

        </aside>

      </div>



      <button className="palette-toggle" onClick={() => setShowPalette(true)}>

        Palette ({answeredCount}/{allQuestions.length})

      </button>



      {/* Submit confirmation */}

      {showSubmitModal && (

        <div className="modal-overlay" role="dialog" aria-modal="true">

          <div className="modal-card">

            <h2>Are you sure you want to submit the test?</h2>

            <p className="muted">Once submitted, your answers cannot be changed.</p>

            <div className="submit-summary">

              <div className="summary-row">

                <span>Answered</span><strong>{paletteCounts.answered}</strong>

              </div>

              <div className="summary-row">

                <span>Not Answered</span><strong>{paletteCounts.not_answered + paletteCounts.not_visited}</strong>

              </div>

              <div className="summary-row">

                <span>Marked for Review</span><strong>{paletteCounts.marked}</strong>

              </div>

              <div className="summary-row">

                <span>Answered &amp; Marked for Review</span><strong>{paletteCounts.answered_marked}</strong>

              </div>

            </div>

            <div className="modal-actions">

              <button className="btn-secondary" onClick={() => setShowSubmitModal(false)}>

                Continue Exam

              </button>

              <button className="btn-danger" disabled={submitting} onClick={() => submitAttempt(false)}>

                {submitting ? 'Submitting...' : 'Submit & View Analysis'}

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Exit confirmation */}

      {showExitModal && (

        <div className="modal-overlay" role="dialog" aria-modal="true">

          <div className="modal-card">

            <h2>Exit the exam?</h2>

            <p className="muted">

              You have answered {answeredCount} of {allQuestions.length} questions. If you exit,

              your answers will NOT be submitted and this attempt will remain incomplete.

            </p>

            <div className="modal-actions">

              <button className="btn-secondary" onClick={() => setShowExitModal(false)}>

                Cancel

              </button>

              <button className="btn-danger" onClick={confirmExit}>

                Exit Without Submitting

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}



// ---------------------------------------------------------------------------

// HistoryPage - dedicated "My History" page: pick a mock test, then an

// attempt, then view the full performance analysis for that attempt.

// ---------------------------------------------------------------------------

function HistoryPage({

  attempts, loading, error, selectedTestId, result, resultLoading, resultError,

  onBack, onSelectTest, onBackToTestsList, onViewAnalysis, onResume,

}) {

  // Group the flat attempt list by test.

  const groups = useMemo(() => {

    const map = new Map();

    for (const a of attempts) {

      if (!map.has(a.test_id)) {

        map.set(a.test_id, {

          test_id: a.test_id,

          title: a.test_title,

          duration_minutes: a.duration_minutes,

          max_marks: Number(a.max_marks) || 0,

          attempts: [],

        });

      }

      map.get(a.test_id).attempts.push(a);

    }

    return [...map.values()];

  }, [attempts]);



  if (resultLoading) {

    return (

      <div className="history-page">

        <button className="btn-ghost" onClick={onBack}>Back to Tests</button>

        <h1 className="history-title">My History</h1>

        <div className="skeleton-card" style={{ marginTop: 16 }}>

          <div className="skeleton skeleton-line skeleton-line--title" />

          <div className="skeleton skeleton-line" />

          <div className="skeleton skeleton-line skeleton-line--short" />

        </div>

        <p className="muted" style={{ marginTop: 12 }}>Loading performance analysis...</p>

      </div>

    );

  }



  if (resultError) {

    return (

      <div className="history-page">

        <button className="btn-ghost" onClick={onBackToTestsList}>Back</button>

        <h1 className="history-title">My History</h1>

        <div className="history-error">

          <p>{resultError}</p>

          <button className="btn-primary" onClick={onBackToTestsList}>Back to Attempts</button>

        </div>

      </div>

    );

  }



  if (result) {

    return (

      <Analysis

        result={result}

        onRetake={onBackToTestsList}

        onBackHome={onBack}

        backLabel="Back to History"

      />

    );

  }



  const selected = groups.find((g) => g.test_id === selectedTestId);



  return (

    <div className="history-page">

      <header className="history-header">

        <button className="btn-ghost" onClick={onBack}>Back to Tests</button>

        <h1 className="history-title">My History</h1>

        <p className="muted">Select a mock test to review your previous attempts and performance.</p>

      </header>



      {loading && (

        <div className="history-loading">

          <div className="skeleton-card">

            <div className="skeleton skeleton-line skeleton-line--title" />

            <div className="skeleton skeleton-line" />

            <div className="skeleton skeleton-line skeleton-line--short" />

          </div>

          <div className="skeleton-card">

            <div className="skeleton skeleton-line skeleton-line--title" />

            <div className="skeleton skeleton-line" />

            <div className="skeleton skeleton-line skeleton-line--short" />

          </div>

        </div>

      )}



      {!loading && error && (

        <div className="history-error">

          <p>{error}</p>

          <button className="btn-primary" onClick={onBack}>Back to Tests</button>

        </div>

      )}



      {!loading && !error && attempts.length === 0 && (

        <div className="history-empty">

          <h2>No attempts yet</h2>

          <p className="muted">

            Once you take a mock test, your attempt history and performance analysis will appear here.

          </p>

          <button className="btn-primary" onClick={onBack}>Browse Tests</button>

        </div>

      )}



      {!loading && !error && attempts.length > 0 && selectedTestId == null && (

        <>

          <h2 className="history-subtitle">Choose a Mock Test</h2>

          <div className="history-test-grid">

            {groups.map((g) => {

              const completed = g.attempts.filter((a) => a.status !== 'in_progress');

              const best = completed.reduce(

                (m, a) => Math.max(m, Number(a.total_marks) || 0), null

              );

              return (

                <button key={g.test_id} className="history-test-card" onClick={() => onSelectTest(g.test_id)}>

                  <div className="history-test-card__title">{g.title}</div>

                  <div className="history-test-card__meta">

                    <span>{g.attempts.length} attempt{g.attempts.length === 1 ? '' : 's'}</span>

                    <span>{g.duration_minutes || 180} min</span>

                  </div>

                  <div className="history-test-card__best">

                    {best != null

                      ? <>Best score: <strong>{best}</strong> / {g.max_marks || 300}</>

                      : <span className="muted">No completed attempts yet</span>}

                  </div>

                  <span className="history-test-card__cta">View attempts &#8594;</span>

                </button>

              );

            })}

          </div>

        </>

      )}



      {!loading && !error && attempts.length > 0 && selectedTestId != null && selected && (

        <>

          <div className="history-attempts-head">

            <button className="btn-ghost" onClick={() => onSelectTest(null)}>All Tests</button>

            <h2 className="history-subtitle">{selected.title}</h2>

            <p className="muted">Pick an attempt below to view its detailed performance analysis.</p>

          </div>

          <div className="history-attempt-list">

            {selected.attempts.map((a, idx) => {

              const done = a.status !== 'in_progress';

              const pct = a.max_marks > 0 && a.total_marks != null

                ? ((Number(a.total_marks) / Number(a.max_marks)) * 100).toFixed(1)

                : null;

              return (

                <div key={a.id} className={`history-attempt-row${done ? ' history-attempt-row--clickable' : ''}`}>

                  <div className="history-attempt-row__main">

                    <div className="history-attempt-row__top">

                      <span className="history-attempt-row__label">Attempt #{selected.attempts.length - idx}</span>

                      <span className={`status-badge status-badge--${a.status}`}>

                        {a.status === 'in_progress' ? 'In Progress' : a.status === 'submitted' ? 'Submitted' : 'Expired'}

                      </span>

                    </div>

                    <div className="history-attempt-row__meta">

                      Started {new Date(a.started_at).toLocaleString()}

                      {a.submitted_at ? <> &#183; Submitted {new Date(a.submitted_at).toLocaleString()}</> : null}

                    </div>

                    <div className="history-attempt-row__score">

                      {a.total_marks != null ? (

                        <>

                          <strong>{a.total_marks}</strong> / {a.max_marks || 300} marks

                          {pct != null && <span className="muted"> ({pct}%)</span>}

                        </>

                      ) : (

                        <span className="muted">Not scored yet</span>

                      )}

                    </div>

                  </div>

                  <div className="history-attempt-row__actions">

                    {done ? (

                      <button className="btn-primary" onClick={() => onViewAnalysis(a.id)}>View Analysis</button>

                    ) : (

                      <button className="btn-primary" onClick={() => onResume(a.test_id, a.id)}>Resume Attempt</button>

                    )}

                  </div>

                </div>

              );

            })}

          </div>

        </>

      )}

    </div>

  );

}



// ---------------------------------------------------------------------------

// TestCard - one published test on the start screen, with resume detection.

// ---------------------------------------------------------------------------

function TestCard({ test, userId, onStart }) {

  const [resume, setResume] = useState(null); // { attempt_id } or null

  const [checking, setChecking] = useState(true);



  useEffect(() => {

    let cancelled = false;

    (async () => {

      try {

        const r = await api(`/attempts?user_id=${userId}&test_id=${asId(test.id)}`);

        if (!cancelled) setResume(r);

      } catch (_) { /* no in-progress attempt */ }

      if (!cancelled) setChecking(false);

    })();

    return () => { cancelled = true; };

  }, [test.id, userId]);



  return (

    <div className="test-card">

      <div className="test-card__info">

        <h3>{test.title}</h3>

        {test.description && <p className="muted">{test.description}</p>}

        <p className="test-card__meta">

          75 questions | 180 min | +4 / -1 marking

        </p>

      </div>

      <div className="test-card__actions">

        {checking ? (

          <span className="muted">Checking...</span>

        ) : resume ? (

          <button className="btn-primary" onClick={() => onStart(resume.attempt_id)}>

            Resume Attempt

          </button>

        ) : (

          <button className="btn-primary" onClick={() => onStart(null)}>

            Start Test

          </button>

        )}

      </div>

    </div>

  );

}



// ---------------------------------------------------------------------------

// Analysis - detailed performance breakdown after submission.

// ---------------------------------------------------------------------------

// Option letter (A/B/C/D) for an option id inside a question's ordered options.

function optionLetterFor(q, optionId) {

  if (optionId == null) return '-';

  const idx = q.options.findIndex((o) => o.id === optionId);

  return idx >= 0 ? String.fromCharCode(65 + idx) : '-';

}



function Analysis({ result, onRetake, onBackHome, backLabel }) {



  const [filter, setFilter] = useState('all');   // all | correct | incorrect | unattempted | marked

  const [subject, setSubject] = useState('all'); // all | Physics | Chemistry | Mathematics

  const [showSummary, setShowSummary] = useState(false);

  const [view, setView] = useState('performance'); // 'performance' | 'time' | 'interval' | 'error' | 'difficulty' | 'journey' | 'qtype'



  if (!result) {

    return (

      <div className="exam-page">

        <h1>Analysis unavailable</h1>

        <button className="btn-primary" onClick={onRetake}>Back to tests</button>

      </div>

    );

  }



  const navTabs = (

    <div className="ta-nav" role="tablist">

      <button

        role="tab"

        className={`ta-nav__tab${view === 'performance' ? ' ta-nav__tab--active' : ''}`}

        onClick={() => { setShowSummary(false); setView('performance'); }}

      >

        Performance Analysis

      </button>

      <button

        role="tab"

        className={`ta-nav__tab${view === 'time' ? ' ta-nav__tab--active' : ''}`}

        onClick={() => { setShowSummary(false); setView('time'); }}

      >

        Time Analysis

      </button>

      <button

        role="tab"

        className={`ta-nav__tab${view === 'interval' ? ' ta-nav__tab--active' : ''}`}

        onClick={() => { setShowSummary(false); setView('interval'); }}

      >

        Time Intervals

      </button>

      <button

        role="tab"

        className={`ta-nav__tab${view === 'error' ? ' ta-nav__tab--active' : ''}`}

        onClick={() => { setShowSummary(false); setView('error'); }}

      >

        Error Distribution

      </button>

    

      


      <button
        role="tab"
        className={`ta-nav__tab${view === 'difficulty' ? ' ta-nav__tab--active' : ''}`}
        onClick={() => { setShowSummary(false); setView('difficulty'); }}
      >
        Difficulty Analysis
      </button>
      <button
        role="tab"
        className={`ta-nav__tab${view === 'journey' ? ' ta-nav__tab--active' : ''}`}
        onClick={() => { setShowSummary(false); setView('journey'); }}
      >
        Question Journey
      </button>
      <button
        role="tab"
        className={`ta-nav__tab${view === 'qtype' ? ' ta-nav__tab--active' : ''}`}
        onClick={() => { setShowSummary(false); setView('qtype'); }}
      >
        MCQ vs Numerical
      </button>
</div>

  );

      



  if (showSummary) {

    return (

      <>

        {navTabs}

        <ScoreSummary

          result={result}

          onBack={() => setShowSummary(false)}

          onBackHome={onBackHome}

        />

      </>

    );

  }



  if (view === 'time') {

    return (

      <>

        {navTabs}

        <TimeAnalysis result={result} onBack={() => setView('performance')} />

      </>

    );

  }

  if (view === 'interval') {

    return (

      <>

        {navTabs}

        <TimeIntervalAnalysis result={result} onBack={() => setView('performance')} />

      </>

    );

  }

  if (view === 'error') {

    return (

      <>

        {navTabs}

        <ErrorDistribution result={result} onBack={() => setView('performance')} />

      </>

    );

  }



  if (view === 'difficulty') {

    return (

      <>

        {navTabs}

        <DifficultyAnalysis result={result} onBack={() => setView('performance')} />

      </>

    );

  }
    if (view === 'journey') {
    return (
      <>
        {navTabs}
        <QuestionJourney result={result} onBack={() => setView('performance')} />
      </>
    );
  }
if (view === 'qtype') {
    return (
      <>
        {navTabs}
        <QuestionTypeAnalysis result={result} onBack={() => setView('performance')} />
      </>
    );
  }


  const o = result.overall;

  const pct = o.max_marks > 0 ? ((o.total_marks / o.max_marks) * 100).toFixed(1) : '0.0';

  const accuracy = o.correct + o.incorrect > 0

    ? ((o.correct / (o.correct + o.incorrect)) * 100).toFixed(1)

    : '0.0';



  const totalTime = result.questions.reduce((sum, q) => sum + (Number(q.time_spent_seconds) || 0), 0);

  const avgTime = result.questions.length > 0 ? totalTime / result.questions.length : 0;



  const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics'];



  // Questions inside the selected subject (or all subjects).

  const subjectQuestions = subject === 'all'

    ? result.questions

    : result.questions.filter((q) => q.section === subject);



  // Combined subject + answer-status filter.

  const filtered = subjectQuestions.filter((q) => {

    if (filter === 'correct') return q.is_correct;

    if (filter === 'incorrect') return q.is_correct === false && q.marks_awarded < 0;

    if (filter === 'unattempted') return q.marks_awarded === 0;

    if (filter === 'marked') return q.status === 'marked_for_review';

    return true;

  });



  // Status counts scoped to the currently selected subject (drives the tabs).

  const counts = {

    all: subjectQuestions.length,

    correct: subjectQuestions.filter((q) => q.is_correct).length,

    incorrect: subjectQuestions.filter((q) => q.is_correct === false && q.marks_awarded < 0).length,

    unattempted: subjectQuestions.filter((q) => q.marks_awarded === 0).length,

    marked: subjectQuestions.filter((q) => q.status === 'marked_for_review').length,

  };



  return (



    <div className="analysis-page">

      {navTabs}

      <header className="analysis-header">

        <button className="btn-ghost analysis-home-button" onClick={onBackHome}>Back to Home</button>

        <h1>Test Score Summary</h1>

        <p className="muted">{result.title} | Submitted {new Date(result.submitted_at).toLocaleString()}</p>

        <button className="btn-primary analysis-boundaries-button" onClick={() => setShowSummary(true)}>

          Let&apos;s Do Analysis

        </button>

      </header>



      <section className="score-hero">

        <div className="score-hero__score">

          <span className="score-hero__value">{o.total_marks}</span>

          <span className="score-hero__max">/ {o.max_marks} marks</span>

        </div>

        <div className="score-hero__stats">

          <div className="stat-chip stat-chip--correct">Correct: {o.correct}</div>

          <div className="stat-chip stat-chip--incorrect">Incorrect: {o.incorrect}</div>

          <div className="stat-chip stat-chip--unattempted">Unattempted: {o.unattempted}</div>

          <div className="stat-chip stat-chip--neutral">Accuracy: {accuracy}%</div>

          <div className="stat-chip stat-chip--neutral">Score: {pct}%</div>

          <div className="stat-chip stat-chip--neutral" title={`Average ${formatDuration(avgTime)} per question`}>

            Time used: {formatDuration(totalTime)}

          </div>

        </div>

      </section>



      <section className="review-section">

        <div className="review-head">

          <h2>Question-wise Review</h2>

          <div className="review-toolbar">

            <div className="review-toolbar__group">

              <span className="review-toolbar__label">Subject</span>

              <div className="subject-tabs">

                <button

                  className={`subject-tab${subject === 'all' ? ' subject-tab--active' : ''}`}

                  onClick={() => setSubject('all')}

                >

                  All Subjects

                </button>

                {SUBJECTS.map((s) => (

                  <button

                    key={s}

                    className={`subject-tab${subject === s ? ' subject-tab--active' : ''}`}

                    style={subject === s

                      ? { background: SUBJECT_COLORS[s], borderColor: SUBJECT_COLORS[s], color: '#fff' }

                      : undefined}

                    onClick={() => setSubject(s)}

                  >

                    {s}

                  </button>

                ))}

              </div>

            </div>

            <div className="review-toolbar__group">

              <span className="review-toolbar__label">Status</span>

              <div className="filter-tabs">

                {Object.entries(counts).map(([key, n]) => (

                  <button

                    key={key}

                    className={`filter-tab${filter === key ? ' filter-tab--active' : ''}`}

                    onClick={() => setFilter(key)}

                  >

                    {key[0].toUpperCase() + key.slice(1)} ({n})

                  </button>

                ))}

              </div>

            </div>

          </div>

        </div>



        <p className="review-count">

          Showing {filtered.length} of {subjectQuestions.length} question{subjectQuestions.length === 1 ? '' : 's'}

          {subject !== 'all' ? ` in ${subject}` : ' across all subjects'}

          {filter !== 'all' ? ` (${filter})` : ''}

        </p>



        {filtered.length === 0 && (

          <div className="review-empty">

            <p className="muted">No {filter !== 'all' || subject !== 'all' ? 'matching ' : ''}questions in this view.</p>

            <button className="btn-ghost" onClick={() => { setFilter('all'); setSubject('all'); }}>

              Clear Filters

            </button>

          </div>

        )}



        <div className="review-list">

          {filtered.map((q) => (

            <ReviewItem key={q.id} q={q} />

          ))}

        </div>

      </section>



      <div className="analysis-actions">

        <button className="btn-primary" onClick={onRetake}>{backLabel || 'Take Another Test'}</button>

      </div>

    </div>

  );

}



// ---------------------------------------------------------------------------

// ScoreSummary - one-page test score report (opened from the analysis header).

// ---------------------------------------------------------------------------

function ScoreSummary({ result, onBack, onBackHome }) {

  const o = result.overall;

  const pct = o.max_marks > 0 ? Math.round((o.total_marks / o.max_marks) * 100) : 0;

  const R = 52;

  const CIRC = 2 * Math.PI * R;

  const dash = (pct / 100) * CIRC;



  // Per-subject correct / incorrect / unattempted counts (from questions).

  const stats = {};

  for (const q of result.questions) {

    const st = stats[q.section] || (stats[q.section] = { correct: 0, incorrect: 0, unattempted: 0 });

    if (q.is_correct) st.correct++;

    else if (q.marks_awarded < 0) st.incorrect++;

    else st.unattempted++;

  }



  return (

    <div className="score-summary-page">

      <header className="score-summary-header">

        <button className="btn-ghost" onClick={onBack}>Back to Test Score Summary</button>

        <button className="btn-ghost" onClick={onBackHome}>Home</button>

      </header>



      <div className="score-summary-title">

        <h1>Performance Analysis</h1>

        <p className="muted">{result.title} &middot; Submitted {new Date(result.submitted_at).toLocaleString()}</p>

      </div>



      <section className="score-summary-total">

        <div className="score-summary-total__info">

          <span className="score-summary-total__label">Total Score</span>

          <div className="score-summary-total__value">

            <strong>{o.total_marks}</strong>

            <span>/ {o.max_marks}</span>

          </div>

          <div className="score-summary-total__chips">

            <span className="sum-chip sum-chip--correct">{o.correct} Correct</span>

            <span className="sum-chip sum-chip--incorrect">{o.incorrect} Incorrect</span>

            <span className="sum-chip sum-chip--unattempted">{o.unattempted} Unattempted</span>

          </div>

        </div>

        <div className="score-summary-total__ring">

          <svg viewBox="0 0 120 120" className="ring" role="img" aria-label={pct + '% score'}>

            <circle className="ring__track" cx="60" cy="60" r={R} />

            <circle

              className="ring__fill"

              cx="60" cy="60" r={R}

              strokeDasharray={dash + ' ' + (CIRC - dash)}

            />

          </svg>

          <div className="ring__center">

            <strong>{pct}%</strong>

            <span>Score</span>

          </div>

        </div>

      </section>



      <section className="section-chart">

        <div className="section-chart__head">

          <h2>Section-wise Performance</h2>

          <div className="section-chart__legend">

            <span className="chart-legend-item"><i className="chart-dot chart-dot--correct" />Correct</span>

            <span className="chart-legend-item"><i className="chart-dot chart-dot--incorrect" />Incorrect</span>

            <span className="chart-legend-item"><i className="chart-dot chart-dot--unattempted" />Unattempted</span>

          </div>

        </div>



        <div className="chart-box">

          <svg viewBox="0 0 660 250" className="chart-svg" role="img" aria-label="Bar graph of marks scored in each subject">

            {[0, 25, 50, 75, 100].map((g) => {

              const gy = 212 - (g / 100) * 172;

              return (

                <g key={g}>

                  <line x1="52" x2="636" y1={gy} y2={gy} className="chart-gridline" />

                  <text x="46" y={gy + 4} className="chart-gridlabel" textAnchor="end">{g}</text>

                </g>

              );

            })}

            {result.sections.map((s, i) => {

              const pct = s.max_marks > 0 ? (s.section_marks / s.max_marks) * 100 : 0;

              const cx = 140 + i * 170;

              const bw = 92;

              const top = 212 - (pct / 100) * 172;

              const bh = Math.max(212 - top, 2);

              return (

                <g key={s.name}>

                  <rect x={cx - bw / 2} y={top} width={bw} height={bh} rx="6" fill={SUBJECT_COLORS[s.name]} opacity="0.92" />

                  <text x={cx} y={top - 22} className="chart-pct" textAnchor="middle">{Math.round(pct)}%</text>

                  <text x={cx} y={top - 6} className="chart-value" textAnchor="middle">

                    {s.section_marks}<tspan className="chart-value-sub">/{s.max_marks}</tspan>

                  </text>

                  <text x={cx} y="236" className="chart-subject" textAnchor="middle">{s.name}</text>

                </g>

              );

            })}

          </svg>

        </div>



        <div className="chart-breakdown">

          {result.sections.map((s) => {

            const st = stats[s.name] || { correct: 0, incorrect: 0, unattempted: 0 };

            return (

              <div key={s.name} className="chart-breakdown__col">

                <span className="chart-breakdown__subject" style={{ color: SUBJECT_COLORS[s.name] }}>{s.name}</span>

                <span className="chart-breakdown__item chart-breakdown__item--correct">Correct {st.correct}</span>

                <span className="chart-breakdown__item chart-breakdown__item--incorrect">Incorrect {st.incorrect}</span>

                <span className="chart-breakdown__item chart-breakdown__item--unattempted">Unattempted {st.unattempted}</span>

              </div>

            );

          })}

        </div>

      </section>

    </div>

  );

}

// ---------------------------------------------------------------------------

// ReviewItem - one graded question in the analysis screen.

// ---------------------------------------------------------------------------

function ReviewItem({ q, highlight }) {

  const isMcq = q.question_type === 'mcq';

  const marksClass =

    q.marks_awarded > 0 ? 'marks--correct' : q.marks_awarded < 0 ? 'marks--incorrect' : 'marks--neutral';



  const yourOption = q.options.find((o) => o.id === q.selected_option_id);

  const correctOption = q.options.find((o) => o.id === q.correct_option_id);



  const yourAnswerText = isMcq

    ? (q.selected_option_id != null ? optionLetterFor(q, q.selected_option_id) : 'Not attempted')

    : (q.numerical_answer != null ? String(q.numerical_answer) : 'Not attempted');



  const correctAnswerText = isMcq

    ? optionLetterFor(q, q.correct_option_id)

    : (q.correct_answer != null ? String(q.correct_answer) : '-');



  return (

    <div

      id={`review-q-${q.id}`}

      className={`review-item${q.marks_awarded > 0 ? ' review-item--correct' : q.marks_awarded < 0 ? ' review-item--incorrect' : ''}${highlight ? ' review-item--highlighted' : ''}`}

    >

      <div className="review-item__head">

        <span className="review-item__subject" style={{ color: SUBJECT_COLORS[q.section] }}>

          {q.section}

        </span>

        <span className="review-item__qno">Q{questionNumber(q, '?')}</span>

        <span className={`difficulty-badge difficulty-badge--${q.difficulty || 'easy'}`}>

          {q.difficulty || 'easy'}

        </span>

        <span className={`marks-chip ${marksClass}`}>

          {q.marks_awarded > 0 ? '+' : ''}{q.marks_awarded}

        </span>

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

        <span className="review-item__time" title="Time spent on this question">

          Time: {formatDuration(q.time_spent_seconds)}

        </span>

      </div>



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

        <div className="review-options">

          {q.options.map((opt, oi) => {

            const isCorrect = opt.id === q.correct_option_id;

            const isYour = opt.id === q.selected_option_id;

            const yourMatch = isYour && isCorrect;

            let cls = 'review-option';

            if (isCorrect) cls += ' review-option--correct';

            if (isYour) cls += yourMatch ? ' review-option--your' : ' review-option--wrong';

            return (

              <div key={opt.id} className={cls}>

                <span className="option-key">{String.fromCharCode(65 + oi)}.</span>

                {opt.formula ? opt.formula : opt.body}

                {isCorrect && <span className="tag-correct">Correct answer</span>}

                {isYour && yourMatch && <span className="tag-your tag-your--right">Your answer</span>}

                {isYour && !isCorrect && <span className="tag-your">Your answer</span>}

              </div>

            );

          })}

        </div>

      ) : (

        <div className="review-numerical">

          <p>

            Your answer: <strong>{q.numerical_answer != null ? q.numerical_answer : '-'}</strong>

          </p>

          <p>

            Correct answer: <strong>{q.correct_answer != null ? q.correct_answer : '-'}</strong>

          </p>

        </div>

      )}



      <p className="review-item__result muted">

        {q.marks_awarded > 0

          ? 'Correct - well done!'

          : q.marks_awarded < 0

            ? 'Incorrect - review this topic.'

            : 'Unattempted.'}

      </p>

    </div>

  );

}



export { DEFAULT_DURATION_SECONDS };



