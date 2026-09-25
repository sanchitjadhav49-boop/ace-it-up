// ===========================================================================
// MY HISTORY - split view redesign (hp-* shell from home.css + hsh-* styles)
//   left pane  : "Mock Tests" - every published test as a card (+ search and
//                status chips). Clicking a card selects that test.
//   right pane : every attempt made on the selected test - 2 attempts -> 2
//                cards, 3 attempts -> 3 cards, each opening its own analysis.
// ===========================================================================

// --- helpers ---------------------------------------------------------------

// "JEE Main 2026 Moderate Mock A (Full Length)" -> "JEE Main 2026 Moderate Mock A"
function hshShortTitle(title) {
  return String(title || '')
    .replace(/\s*[\(\[]\s*full\s*length\s*[\)\]]\s*$/i, '')
    .trim();
}

function hshIsFullLength(title) {
  return /full\s*length/i.test(String(title || ''));
}

// "9 Jun 2026, 5:51 PM"
function hshDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date}, ${time}`;
}

function hshMark(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function hshAgoTime(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

const HSH_ACCENTS = ['blue', 'violet', 'green', 'amber', 'rose', 'indigo'];

const HSH_ACCENT_BY_INDEX = (i) => HSH_ACCENTS[i % HSH_ACCENTS.length];

// --- icons -----------------------------------------------------------------

// History-only glyphs, everything else falls through to the HpIcon set.
function HshIcon({ name, size = 18 }) {
  const base = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  };

  if (name === 'calendar') {
    return (
      <svg {...base}>
        <rect x="3.4" y="5.2" width="17.2" height="15.4" rx="2.4" />
        <path d="M3.4 9.6h17.2M8.2 3.2v3.6M15.8 3.2v3.6" />
      </svg>
    );
  }

  if (name === 'back') {
    return (
      <svg {...base}>
        <path d="M20 12H4.6" />
        <path d="M11 5.4 4.4 12 11 18.6" />
      </svg>
    );
  }

  if (name === 'queue') {
    return (
      <svg {...base}>
        <path d="M7.6 5.4h12.8M7.6 12h12.8M7.6 18.6h12.8" />
        <path d="M3.6 5.4h.02M3.6 12h.02M3.6 18.6h.02" strokeWidth="2.4" />
      </svg>
    );
  }

  if (name === 'checkcircle') {
    return (
      <svg {...base}>
        <circle cx="12" cy="12" r="8.6" />
        <path d="M8.2 12.3l2.6 2.6 5-5.2" />
      </svg>
    );
  }

  if (name === 'xcircle') {
    return (
      <svg {...base}>
        <circle cx="12" cy="12" r="8.6" />
        <path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6" />
      </svg>
    );
  }

  if (name === 'history') {
    return (
      <svg {...base}>
        <path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1" />
        <path d="M3.2 4.6v4.2h4.2" />
        <path d="M12 7.8V12l3.2 1.9" />
      </svg>
    );
  }

  if (name === 'layers') {
    return (
      <svg {...base}>
        <path d="M12 3.4 3.4 8l8.6 4.6L20.6 8z" />
        <path d="M4.4 12.4 12 16.4l7.6-4" />
        <path d="M4.4 16.4 12 20.4l7.6-4" />
      </svg>
    );
  }

  if (name === 'mountain') {
    return (
      <svg {...base}>
        <path d="M2.6 19.8h18.8" />
        <path d="M3.4 19.8 9.6 8.6l3.6 6.2 2-3 5 8" />
        <path d="M8.2 5.4V2.6" />
        <path d="M8.2 2.6h4.4l-1.1 1.4 1.1 1.4H8.2z" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (name === 'sparkle') {
    return (
      <svg {...base} fill="currentColor" stroke="none">
        <path d="M12 3.6l1.3 4.6 4.6 1.3-4.6 1.3L12 15.4l-1.3-4.6L6.1 9.5l4.6-1.3z" />
      </svg>
    );
  }

  return <HpIcon name={name} size={size} />;
}

// --- illustration ----------------------------------------------------------

function HshBooksArt() {
  return (
    <svg className="hsh-pickhead__art" width="132" height="92" viewBox="0 0 132 92" fill="none" aria-hidden="true">
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="62" width="72" height="17" rx="4" fill="#f7c948" stroke="#e2a300" strokeWidth="2.2" />
        <rect x="14" y="46" width="64" height="17" rx="4" fill="#4a86f7" stroke="#1f5ed6" strokeWidth="2.2" />
        <rect x="2" y="30" width="60" height="17" rx="4" fill="#ffffff" stroke="#8fb4ee" strokeWidth="2.2" />
        <path d="M12 39h22" stroke="#a8c6f2" strokeWidth="2.2" />
        <path d="M92 82h34l-5 10h-24z" fill="#7cc7d9" stroke="#3f9cb4" strokeWidth="2.2" />
        <path d="M109 82V58" stroke="#2f9e5f" strokeWidth="2.2" />
        <path d="M109 64c-11-2-18-9-18-19 10 0 17 7 18 19z" fill="#63c88a" stroke="#2f9e5f" strokeWidth="2" />
        <path d="M109 66c10-5 15-13 13-23-10 2-15 10-13 23z" fill="#4cbb77" stroke="#2f9e5f" strokeWidth="2" />
        <path d="M76 22l2.4 5.6 5.6 2.4-5.6 2.4L76 38l-2.4-5.6L68 30l5.6-2.4z" fill="#9ec1f5" />
        <path d="M124 30l1.6 3.8 3.9 1.7-3.9 1.6-1.6 3.9-1.7-3.9-3.8-1.6 3.8-1.7z" fill="#c2d8fb" />
      </g>
    </svg>
  );
}

// --- sidebar / topbar (hp-* classes, shared with the home page) -------------

function HshSidebar({ active, onHome, onHistory, onNotes, onLogout, darkMode, onToggleDark }) {
  return (
    <aside className="hp-side">
      <div className="hp-brand">
        <span className="hp-brand__logo">A</span>
        <div>
          <h1 className="hp-brand__name">Ace It Up</h1>
          <p className="hp-brand__tag">Practice {'\u00B7'} Improve {'\u00B7'} Achieve</p>
        </div>
      </div>

      <nav className="hp-nav">
        <button
          className={`hp-nav__item${active === 'home' ? ' hp-nav__item--active' : ''}`}
          type="button"
          onClick={onHome}
        >
          <HshIcon name="home" /> Home
        </button>
        <button
          className={`hp-nav__item${active === 'history' ? ' hp-nav__item--active' : ''}`}
          type="button"
          onClick={onHistory}
        >
          <HshIcon name="history" /> My History
        </button>
        <button
          className={`hp-nav__item${active === 'notes' ? ' hp-nav__item--active' : ''}`}
          type="button"
          onClick={onNotes}
        >
          <HshIcon name="note" /> Notes
        </button>
        <button className="hp-nav__item" type="button" onClick={onToggleDark}>
          <HshIcon name={darkMode ? 'sun' : 'moon'} /> {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </nav>

      <div className="hp-promo">
        <span className="hp-promo__icon"><HshIcon name="mountain" size={22} /></span>
        <p>
          Small steps<br />
          every day lead to<br />
          <b>big results!</b>
        </p>
        <span className="hp-promo__dot hp-promo__dot--a" />
        <span className="hp-promo__dot hp-promo__dot--b" />
        <span className="hp-promo__dot hp-promo__dot--c" />
      </div>

      <button className="hp-logout" type="button" onClick={onLogout}>
        <HshIcon name="logout" /> Logout
      </button>
    </aside>
  );
}

function HshTopbar({
  user, searchQuery, onSearch, darkMode, onToggleDark,
  showProfileMenu, setShowProfileMenu, onHome, onHistory, onNotes, onLogout,
}) {
  const initial = user && user.full_name ? user.full_name.charAt(0).toUpperCase() : 'A';

  return (
    <header className="hsh-bar">
      <div className="hp-search">
        <HshIcon name="search" size={18} />
        <input
          type="text"
          placeholder="Search tests..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
        />
        {searchQuery && (
          <button className="hp-search__clear" type="button" onClick={() => onSearch('')} title="Clear search">
            {'\u00D7'}
          </button>
        )}
      </div>

      <div className="hp-topbar__spacer" />

      <div className="hp-avatar-wrap">
        <button className="hp-avatar" type="button" onClick={() => setShowProfileMenu((v) => !v)}>
          {initial}
        </button>
        {showProfileMenu && (
          <div className="hp-menu">
            <div className="hp-menu__name">{user && user.full_name}</div>
            <div className="hp-menu__email">{user && user.email}</div>
            <button type="button" onClick={() => { setShowProfileMenu(false); onHome(); }}>Home</button>
            <button type="button" onClick={() => { setShowProfileMenu(false); onHistory(); }}>My History</button>
            <button type="button" onClick={() => { setShowProfileMenu(false); onNotes(); }}>Notes</button>
            <button type="button" onClick={onToggleDark}>{darkMode ? 'Light Mode' : 'Dark Mode'}</button>
            <button type="button" onClick={onLogout}>Logout</button>
          </div>
        )}
      </div>

      <button className="hp-theme" type="button" onClick={onToggleDark}>
        <HshIcon name={darkMode ? 'sun' : 'moon'} size={17} />
        <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
      </button>
    </header>
  );
}

// --- one test card in the left pane ---------------------------------------

function HshTestCard({ card, selected, onSelect }) {
  const pct = card.best != null && card.max_marks > 0 ? ((card.best / card.max_marks) * 100).toFixed(1) : null;

  return (
    <button
      type="button"
      className={`hsh-pick${selected ? ' hsh-pick--on' : ''}`}
      onClick={() => onSelect(selected ? null : card.test_id)}
      title={card.title}
      aria-pressed={selected}
    >
      <div className="hsh-pick__top">
        {card.fullLength && <span className="hsh-pick__tag">Full Length</span>}
        {card.attempts > 0 && (
          <span className="hsh-pick__count" title={`${card.attempts} attempt(s) on this test`}>
            <HshIcon name="layers" size={12} />
            {card.attempts} {card.attempts === 1 ? 'attempt' : 'attempts'}
          </span>
        )}
        {card.completed > 0 && (
          <span className="hsh-pick__check" title="You have completed this test">
            <HshIcon name="check" size={13} />
          </span>
        )}
      </div>

      <h3 className="hsh-pick__title">{card.short}</h3>

      <div className="hsh-pick__meta">
        <span><HshIcon name="clock" size={14} /> {card.duration} min</span>
        {card.last != null && <span><HshIcon name="calendar" size={14} /> {hshDateTime(card.last)}</span>}
      </div>

      {card.best != null ? (
        <div className="hsh-pick__score">
          Best {hshMark(card.best)} / {hshMark(card.max_marks)}
          {pct != null && <em>({pct}%)</em>}
        </div>
      ) : (
        <div className="hsh-pick__score hsh-pick__score--none">
          {card.attempts > 0 ? `${card.attempts} in progress` : 'Not attempted yet'}
        </div>
      )}

      {card.attempts > 0 ? (
        <span className="hsh-pick__cta">
          {selected ? 'Viewing attempts' : 'View attempts'} <HshIcon name="arrow" size={15} />
        </span>
      ) : (
        <span className="hsh-pick__cta hsh-pick__cta--none">No attempts yet</span>
      )}
    </button>
  );
}

// --- one attempt card (right pane) ----------------------------------------

function HshAttemptCard({ attempt, accent, position, onAnalysis, onResume, onNotes }) {
  const max = Number(attempt.max_marks) || 300;
  const marks = attempt.total_marks == null ? null : Number(attempt.total_marks);
  const pct = marks != null && max > 0 ? ((marks / max) * 100).toFixed(1) : null;

  const tone = marks == null ? 'zero' : marks > 0 ? 'good' : marks === 0 ? 'zero' : 'neg';
  const scoreClass = 'hsh-score' + (tone === 'zero' ? ' hsh-score--zero' : tone === 'neg' ? ' hsh-score--neg' : '');

  const done = attempt.status === 'submitted' || attempt.status === 'expired';
  const statusLabel = attempt.status === 'in_progress'
    ? 'In Progress'
    : attempt.status === 'expired' ? 'Expired' : 'Submitted';

  return (
    <article className={`hsh-attempt hsh-attempt--${accent}`}>
      <div className="hsh-attempt__top">
        <span className="hsh-attempt__icon"><HshIcon name="doc" size={20} /></span>

        <div className="hsh-attempt__main">
          <div className="hsh-attempt__line">
            <h3 className="hsh-attempt__title">
              {position ? `Attempt ${position}` : (hshShortTitle(attempt.test_title) || 'Mock Test')}
            </h3>
            {hshIsFullLength(attempt.test_title) && <span className="hsh-tag">Full Length</span>}
          </div>
          <div className="hsh-attempt__meta">
            <span><HshIcon name="calendar" size={15} /> {hshDateTime(attempt.started_at) || 'Not started'}</span>
            <span><HshIcon name="clock" size={15} /> {attempt.duration_minutes || 180} min</span>
          </div>
        </div>

        <button
          className="hsh-attempt__chev"
          type="button"
          title={done ? 'View analysis' : 'Resume attempt'}
          onClick={() => (done ? onAnalysis(attempt.id) : onResume(attempt.test_id, attempt.id))}
        >
          <HshIcon name="chevron" size={16} />
        </button>
      </div>

      <div className="hsh-attempt__foot">
        {marks != null ? (
          <span className={scoreClass}>
            {hshMark(marks)} / {hshMark(max)}
            {pct != null && <em>({pct}%)</em>}
          </span>
        ) : (
          <span className="hsh-score hsh-score--zero">Not scored yet</span>
        )}

        <span className={`hsh-badge hsh-badge--${attempt.status}`}>
          {done && <HshIcon name="check" size={13} />}
          {statusLabel}
        </span>

        <div className="hsh-attempt__actions">
          {done ? (
            <button className="hsh-btn hsh-btn--analysis" type="button" onClick={() => onAnalysis(attempt.id)}>
              <HshIcon name="chart" size={16} /> View Analysis
            </button>
          ) : (
            <button
              className="hsh-btn hsh-btn--resume"
              type="button"
              onClick={() => onResume(attempt.test_id, attempt.id)}
            >
              <HshIcon name="arrow" size={16} /> Resume Attempt
            </button>
          )}
          <button className="hsh-btn hsh-btn--notes" type="button" onClick={() => onNotes(attempt.test_id, attempt.test_title)}>
            <HshIcon name="note" size={16} /> Notes
          </button>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// HistoryPage - split view: mock test cards on the left, and for the test you
// click, every attempt made on it (one analysis card each) on the right.
// ---------------------------------------------------------------------------

function HistoryPage({
  attempts, loading, error, selectedTestId, result, resultLoading, resultError,
  userId, tests, user, darkMode, onToggleDark, showProfileMenu, setShowProfileMenu,
  onBack, onHome, onLogout, onNotes, onSelectTest, onBackToTestsList, onViewAnalysis,
  onResume, onOpenNote,
}) {
  const [statusFilter, setStatusFilter] = useState('all');   // all | completed | progress | pending
  const [histQuery, setHistQuery] = useState('');
  const rightScrollRef = useRef(null);

  // -------- group the flat attempt list by test --------------------------
  const groups = useMemo(() => {
    const map = new Map();
    for (const a of attempts) {
      const key = String(a.test_id);
      if (!map.has(key)) {
        map.set(key, {
          test_id: a.test_id,
          title: a.test_title,
          duration_minutes: a.duration_minutes,
          max_marks: Number(a.max_marks) || 0,
          attempts: [],
        });
      }
      map.get(key).attempts.push(a);
    }
    return [...map.values()];
  }, [attempts]);

  // -------- every published test, merged with whatever attempts it has ----
  const testCards = useMemo(() => {
    const byId = new Map();
    for (const g of groups) byId.set(String(g.test_id), g);

    const rows = [];
    for (const t of (tests || [])) {
      const key = String(t.id);
      rows.push({ test: t, group: byId.get(key) || null });
      byId.delete(key);
    }
    for (const g of byId.values()) rows.push({ test: null, group: g });

    const built = rows.map(({ test, group }) => {
      const title = (test && test.title) || (group && group.title) || 'Mock Test';
      const list = group ? group.attempts : [];

      let best = null;
      let completed = 0;
      let inProgress = 0;
      let last = null;

      for (const a of list) {
        if (a.status === 'submitted') {
          completed += 1;
          const v = Number(a.total_marks);
          if (Number.isFinite(v)) best = best == null ? v : Math.max(best, v);
        } else if (a.status === 'in_progress') {
          inProgress += 1;
        }
        const at = hshAgoTime(a.started_at);
        if (at > 0 && (last == null || at > last)) last = at;
      }

      return {
        test_id: group ? group.test_id : test.id,
        title,
        short: hshShortTitle(title) || 'Mock Test',
        fullLength: hshIsFullLength(title),
        duration: (test && test.duration_minutes) || (group && group.duration_minutes) || 180,
        max_marks: (group && Number(group.max_marks)) || 300,
        best,
        last,
        attempts: list.length,
        completed,
        inProgress,
      };
    });

    // attempted tests first (most recent first), then the untouched ones
    built.sort((a, b) => {
      if (a.attempts > 0 && b.attempts === 0) return -1;
      if (b.attempts > 0 && a.attempts === 0) return 1;
      if (a.attempts > 0 && b.attempts > 0) return (b.last || 0) - (a.last || 0);
      return asId(a.test_id) - asId(b.test_id);
    });

    return built;
  }, [groups, tests]);

  // -------- left pane: which test cards survive search + status chips -----
  const visibleCards = useMemo(() => {
    let list = testCards;

    if (statusFilter === 'completed') list = list.filter((c) => c.completed > 0);
    else if (statusFilter === 'progress') list = list.filter((c) => c.inProgress > 0);
    else if (statusFilter === 'pending') list = list.filter((c) => c.completed === 0);

    const q = histQuery.trim().toLowerCase();
    if (q) list = list.filter((c) => String(c.title || '').toLowerCase().includes(q));

    return list;
  }, [testCards, statusFilter, histQuery]);

  // -------- right pane: the selected test and ALL of its attempts --------
  const selectedCard = selectedTestId == null
    ? null
    : testCards.find((c) => asId(c.test_id) === asId(selectedTestId)) || null;

  const selectedAttempts = useMemo(() => {
    if (selectedTestId == null) return [];
    return attempts
      .filter((a) => asId(a.test_id) === asId(selectedTestId))
      .slice()
      .sort((a, b) => hshAgoTime(a.started_at) - hshAgoTime(b.started_at));
  }, [attempts, selectedTestId]);

  const selectedStats = useMemo(() => {
    let best = null;
    let completed = 0;
    let inProgress = 0;
    let last = null;
    for (const a of selectedAttempts) {
      if (a.status === 'submitted') {
        completed += 1;
        const v = Number(a.total_marks);
        if (Number.isFinite(v)) best = best == null ? v : Math.max(best, v);
      } else if (a.status === 'in_progress') {
        inProgress += 1;
      }
      const at = hshAgoTime(a.started_at);
      if (at > 0 && (last == null || at > last)) last = at;
    }
    return { best, completed, inProgress, last };
  }, [selectedAttempts]);

  // always show the top of the selected test's attempts
  useEffect(() => {
    if (rightScrollRef.current) rightScrollRef.current.scrollTop = 0;
  }, [selectedTestId]);

  const selectedTitle = selectedCard
    ? selectedCard.short
    : (selectedTestId == null
      ? null
      : ((attempts.find((a) => asId(a.test_id) === asId(selectedTestId)) || {}).test_title || 'Mock Test'));

  // ----- analysis loading / error keep the shell of the right pane --------
  if (resultLoading) {
    return (
      <div className="hp-root">
        <HshSidebar
          active="history" onHome={onBack} onHistory={onBackToTestsList}
          onNotes={onNotes} onLogout={onLogout} darkMode={darkMode} onToggleDark={onToggleDark}
        />
        <div className="hp-main">
          <div className="hsh-split">
            <section className="hsh-pane hsh-pane--attempts" style={{ flex: '1 1 100%' }}>
              <div className="hsh-bar">
                <button className="hsh-back" type="button" onClick={onBackToTestsList}>
                  <HshIcon name="back" size={17} /> Back to History
                </button>
              </div>
              <div className="hsh-pane__scroll">
                <div className="hsh-skel" />
                <div className="hsh-skel" style={{ height: 84 }} />
                <p className="muted">Loading performance analysis...</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (resultError) {
    return (
      <div className="hp-root">
        <HshSidebar
          active="history" onHome={onBack} onHistory={onBackToTestsList}
          onNotes={onNotes} onLogout={onLogout} darkMode={darkMode} onToggleDark={onToggleDark}
        />
        <div className="hp-main">
          <div className="hsh-split">
            <section className="hsh-pane hsh-pane--attempts" style={{ flex: '1 1 100%' }}>
              <div className="hsh-bar">
                <button className="hsh-back" type="button" onClick={onBackToTestsList}>
                  <HshIcon name="back" size={17} /> Back to History
                </button>
              </div>
              <div className="hsh-pane__scroll">
                <div className="hsh-error">{resultError}</div>
                <div>
                  <button className="hsh-btn hsh-btn--analysis" type="button" onClick={onBackToTestsList}>
                    Back to Attempts
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <Analysis
        result={result}
        userId={userId}
        onRetake={onBackToTestsList}
        onBackHome={onBack}
        backLabel="Back to History"
      />
    );
  }

  const filters = [
    { key: 'all', label: 'All Tests', icon: 'queue', cls: '' },
    { key: 'completed', label: 'Completed', icon: 'checkcircle', cls: ' hsh-chip--completed' },
    { key: 'progress', label: 'In Progress', icon: 'clock', cls: ' hsh-chip--progress' },
    { key: 'pending', label: 'Not Completed', icon: 'xcircle', cls: ' hsh-chip--pending' },
  ];

  const noAttemptsAtAll = !loading && !error && attempts.length === 0;

  return (
    <div className="hp-root">
      <HshSidebar
        active="history"
        onHome={onBack}
        onHistory={onBackToTestsList}
        onNotes={onNotes}
        onLogout={onLogout}
        darkMode={darkMode}
        onToggleDark={onToggleDark}
      />

      <div className="hp-main">
        <div className="hsh-split">
          {/* ---------------- left: pick a mock test ---------------- */}
          <section className="hsh-pane hsh-pane--tests">
            <HshTopbar
              user={user}
              searchQuery={histQuery}
              onSearch={setHistQuery}
              darkMode={darkMode}
              onToggleDark={onToggleDark}
              showProfileMenu={showProfileMenu}
              setShowProfileMenu={setShowProfileMenu}
              onHome={onBack}
              onHistory={onBackToTestsList}
              onNotes={onNotes}
              onLogout={onLogout}
            />

            <div className="hsh-pane__scroll">
              <div className="hsh-pickhead">
                <span className="hsh-pickhead__icon"><HshIcon name="doc" size={24} /></span>
                <div>
                  <h2 className="hsh-pickhead__title">Mock Tests</h2>
                  <p>Pick a mock test to see every attempt you have made on it.</p>
                </div>
              </div>

              <div className="hsh-filters">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={`hsh-chip${f.cls}${statusFilter === f.key ? ' hsh-chip--active' : ''}`}
                    onClick={() => setStatusFilter(f.key)}
                  >
                    <HshIcon name={f.icon} size={16} /> {f.label}
                  </button>
                ))}
              </div>

              {loading && (
                <div className="hsh-pickgrid">
                  <div className="hsh-skel hsh-skel--card" />
                  <div className="hsh-skel hsh-skel--card" />
                  <div className="hsh-skel hsh-skel--card" />
                  <div className="hsh-skel hsh-skel--card" />
                </div>
              )}

              {!loading && error && <div className="hsh-error">{error}</div>}

              {noAttemptsAtAll && (
                <div className="hsh-empty">
                  <h3>No attempts yet</h3>
                  <p>Take a mock test and your attempt history will show up here with a full analysis.</p>
                  <div style={{ marginTop: 14 }}>
                    <button className="hsh-btn hsh-btn--analysis" type="button" onClick={onBack}>
                      <HshIcon name="arrow" size={16} /> Browse Tests
                    </button>
                  </div>
                </div>
              )}

              {!loading && !error && !noAttemptsAtAll && visibleCards.length === 0 && (
                <div className="hsh-empty">
                  <h3>Nothing matches</h3>
                  <p>No mock test matches this search or filter. Try another status or clear the search.</p>
                  <div style={{ marginTop: 14 }}>
                    <button
                      className="hsh-btn hsh-btn--analysis"
                      type="button"
                      onClick={() => { setStatusFilter('all'); setHistQuery(''); }}
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              )}

              {!loading && !error && visibleCards.length > 0 && (
                <div className="hsh-pickgrid">
                  {visibleCards.map((c) => (
                    <HshTestCard
                      key={c.test_id}
                      card={c}
                      selected={selectedTestId != null && asId(c.test_id) === asId(selectedTestId)}
                      onSelect={onSelectTest}
                    />
                  ))}
                </div>
              )}

              {!loading && !error && testCards.length > 0 && (
                <p className="hsh-count">
                  Showing {visibleCards.length} of {testCards.length} mock tests
                </p>
              )}
            </div>
          </section>

          {/* ---------------- right: every attempt on the selected test ------- */}
          <section className="hsh-pane hsh-pane--attempts">
            <div className="hsh-bar hsh-bar--picker">
              {selectedCard ? (
                <button
                  className="hsh-back"
                  type="button"
                  onClick={() => onSelectTest(null)}
                  title="Back to all mock tests"
                >
                  <HshIcon name="back" size={17} /> All Tests
                </button>
              ) : (
                <span className="hsh-bar__label">
                  <HshIcon name="chart" size={17} /> Attempt Analysis
                </span>
              )}
              <button className="hp-theme" type="button" onClick={onToggleDark}>
                <HshIcon name={darkMode ? 'sun' : 'moon'} size={17} />
                <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>

            <div className="hsh-pane__scroll" ref={rightScrollRef}>
              {!selectedCard ? (
                <>
                  <div className="hsh-pickhead">
                    <span className="hsh-pickhead__icon"><HshIcon name="chart" size={26} /></span>
                    <div>
                      <h2>Attempt Analysis</h2>
                      <p>Click a mock test on the left and every attempt made on it appears here.</p>
                    </div>
                    <HshBooksArt />
                  </div>

                  <div className="hsh-empty">
                    <h3>No mock test selected</h3>
                    <p>
                      Choose a mock test card to see its attempts - two attempts if you took it twice,
                      three if you took it three times - each one opening its own analysis.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="hsh-attempts-head">
                    <div className="hsh-attempts-head__txt">
                      <h2>{selectedTitle}</h2>
                      <p>
                        {selectedAttempts.length === 0
                          ? 'No attempts on this mock test yet'
                          : `${selectedAttempts.length} ${selectedAttempts.length === 1 ? 'attempt' : 'attempts'} on this mock test`}
                        {selectedStats.best != null
                          ? ` \u00B7 best ${hshMark(selectedStats.best)} / ${hshMark(selectedCard.max_marks)}`
                          : ''}
                        {selectedStats.inProgress > 0 ? ` \u00B7 ${selectedStats.inProgress} in progress` : ''}
                      </p>
                    </div>
                    {selectedCard.fullLength && <span className="hsh-tag">Full Length</span>}
                  </div>

                  {loading && (
                    <div className="hsh-list">
                      <div className="hsh-skel" />
                      <div className="hsh-skel" />
                    </div>
                  )}

                  {!loading && error && <div className="hsh-error">{error}</div>}

                  {!loading && !error && selectedAttempts.length === 0 && (
                    <div className="hsh-empty">
                      <h3>No attempts yet</h3>
                      <p>
                        You have not taken this mock test. Start it from the Home screen and every attempt
                        will show up here with its own analysis.
                      </p>
                      <div style={{ marginTop: 14 }}>
                        <button className="hsh-btn hsh-btn--analysis" type="button" onClick={onBack}>
                          <HshIcon name="arrow" size={16} /> Browse Tests
                        </button>
                      </div>
                    </div>
                  )}

                  {!loading && !error && selectedAttempts.length > 0 && (
                    <div className="hsh-list">
                      {selectedAttempts.map((a, i) => (
                        <HshAttemptCard
                          key={a.id}
                          attempt={a}
                          accent={HSH_ACCENT_BY_INDEX(i)}
                          position={i + 1}
                          onAnalysis={onViewAnalysis}
                          onResume={onResume}
                          onNotes={(testId, title) => onOpenNote && onOpenNote(testId, hshShortTitle(title))}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
