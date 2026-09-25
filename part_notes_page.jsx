// ===========================================================================
// MY NOTES - redesigned "learning notes" page (nts-* classes, notes.css)
//   header  : Back + "My Notes" + tagline, light-bulb slogan on the right
//   write    : "Write a note for another test" picker + Start writing
//   body     : note cards (or the "No notes yet." empty state)
//   footer   : Pro Tip strip
// ===========================================================================

// --- helpers ---------------------------------------------------------------

// "12 Jun 2026, 6:40 PM"
function ntsDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date}, ${time}`;
}

function ntsWords(text) {
  const t = String(text || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

function ntsStamp(value) {
  const t = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
}

// --- icons -----------------------------------------------------------------

function NtsIcon({ name, size = 18 }) {
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

  if (name === 'back') {
    return (
      <svg {...base}>
        <path d="M15.4 19.4 8 12l7.4-7.4" />
      </svg>
    );
  }

  if (name === 'note') {
    return (
      <svg {...base}>
        <path d="M18.6 4.6H5.4a1.4 1.4 0 0 0-1.4 1.4v12a1.4 1.4 0 0 0 1.4 1.4h7.2l6-6V6a1.4 1.4 0 0 0-1.4-1.4z" />
        <path d="M12.6 19.4v-4.2a1.6 1.6 0 0 1 1.6-1.6h4.4" />
        <path d="M7.4 9h6.4M7.4 12.4h4" />
      </svg>
    );
  }

  if (name === 'doc') {
    return (
      <svg {...base}>
        <path d="M14 3.4H7a1.6 1.6 0 0 0-1.6 1.6v14a1.6 1.6 0 0 0 1.6 1.6h10a1.6 1.6 0 0 0 1.6-1.6V8z" />
        <path d="M13.8 3.6V8h4.6" />
      </svg>
    );
  }

  if (name === 'target') {
    return (
      <svg {...base}>
        <circle cx="12" cy="12" r="8.4" />
        <circle cx="12" cy="12" r="4.4" />
        <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (name === 'brain') {
    return (
      <svg {...base}>
        <path d="M12 5.2a3.1 3.1 0 0 0-5.6 1.5c-1.6.5-2.4 2-1.9 3.5-1.2 1.1-1.2 2.9 0 4-.6 1.6.4 3.2 2 3.5.4 1.4 2 2.1 3.4 1.5.7.7 1.4 1 2.1 1V5.2z" />
        <path d="M12 5.2a3.1 3.1 0 0 1 5.6 1.5c1.6.5 2.4 2 1.9 3.5 1.2 1.1 1.2 2.9 0 4 .6 1.6-.4 3.2-2 3.5-.4 1.4-2 2.1-3.4 1.5-.7.7-1.4 1-2.1 1" />
      </svg>
    );
  }

  if (name === 'bars') {
    return (
      <svg {...base}>
        <path d="M4.6 19.6h15" />
        <path d="M7.6 19.6v-5.2M12 19.6V8.4M16.4 19.6v-8.4" strokeWidth="2.6" />
      </svg>
    );
  }

  if (name === 'star') {
    return (
      <svg {...base} fill="currentColor" stroke="none">
        <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8z" />
      </svg>
    );
  }

  if (name === 'pencil') {
    return (
      <svg {...base}>
        <path d="M16.4 3.9l3.7 3.7-11 11-4.7 1 1-4.7z" />
        <path d="M14.2 6.1l3.7 3.7" />
      </svg>
    );
  }

  if (name === 'bulb') {
    return (
      <svg {...base}>
        <path d="M9.4 17.4a5.6 5.6 0 1 1 5.2 0v1.4a1.6 1.6 0 0 1-1.6 1.6h-2a1.6 1.6 0 0 1-1.6-1.6z" />
        <path d="M9.8 20.8h4.4" />
      </svg>
    );
  }

  if (name === 'clock') {
    return (
      <svg {...base}>
        <circle cx="12" cy="12" r="8.4" />
        <path d="M12 7.4V12l3.2 1.9" />
      </svg>
    );
  }

  if (name === 'calendar') {
    return (
      <svg {...base}>
        <rect x="3.4" y="5.2" width="17.2" height="15.4" rx="2.4" />
        <path d="M3.4 9.6h17.2M8.2 3.2v3.6M15.8 3.2v3.6" />
      </svg>
    );
  }

  if (name === 'trash') {
    return (
      <svg {...base}>
        <path d="M4.8 6.8h14.4" />
        <path d="M9.4 6.8V4.6h5.2v2.2" />
        <path d="M6.6 6.8l.9 12a1.4 1.4 0 0 0 1.4 1.3h6.2a1.4 1.4 0 0 0 1.4-1.3l.9-12" />
        <path d="M10.2 10.4v6M13.8 10.4v6" />
      </svg>
    );
  }

  if (name === 'chev') {
    return (
      <svg {...base}>
        <path d="M5.6 8.8 12 15.2l6.4-6.4" />
      </svg>
    );
  }

  if (name === 'check') {
    return (
      <svg {...base}>
        <path d="M5.2 12.6l4.6 4.6 9-10" />
      </svg>
    );
  }

  if (name === 'arrow') {
    return (
      <svg {...base}>
        <path d="M4.6 12h14.8" />
        <path d="M13.4 6l6 6-6 6" />
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

  return <NtsIcon name="doc" size={size} />;
}

// --- illustrations ---------------------------------------------------------

function NtsBulbArt() {
  return (
    <svg className="nts-bulb" width="74" height="74" viewBox="0 0 74 74" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ntsBulbG" x1="20" y1="18" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.55" stopColor="#f7c948" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* rays */}
      <g stroke="#fbbf24" strokeWidth="3" strokeLinecap="round">
        <path d="M37 4.5v6.5" />
        <path d="M15.5 14.5l4.6 4.6" />
        <path d="M58.5 14.5l-4.6 4.6" />
        <path d="M4.5 37H11" />
        <path d="M63 37h6.5" />
      </g>
      {/* bulb */}
      <circle cx="37" cy="33" r="18.5" fill="url(#ntsBulbG)" />
      <circle cx="37" cy="33" r="18.5" fill="none" stroke="#e2a300" strokeWidth="2.4" />
      <path d="M30.6 51.5h12.8v4.2a3 3 0 0 1-3 3h-6.8a3 3 0 0 1-3-3z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
      <path d="M31.6 57.6h10.8" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      {/* filament */}
      <path d="M32.4 33.6c1.6-3 3-4.6 4.6-4.6s3 1.6 4.6 4.6" stroke="#fff8e1" strokeWidth="2.4" strokeLinecap="round" />
      {/* sparkle */}
      <path d="M56 45l1.6 3.8 3.8 1.6-3.8 1.6-1.6 3.9-1.7-3.9-3.8-1.6 3.8-1.6z" fill="#fcd34d" />
    </svg>
  );
}

function NtsPadArt() {
  return (
    <svg width="196" height="164" viewBox="0 0 196 164" fill="none" aria-hidden="true">
      {/* soft background blobs */}
      <ellipse cx="88" cy="92" rx="66" ry="58" fill="#eaf1fe" />
      <ellipse cx="140" cy="112" rx="34" ry="30" fill="#f1f6ff" />
      {/* notepad */}
      <rect x="46" y="34" width="86" height="104" rx="9" fill="#ffffff" stroke="#4a86f7" strokeWidth="3.2" />
      <path d="M46 56h86" stroke="#cddcf7" strokeWidth="2.6" />
      {/* spiral rings */}
      <g stroke="#4cbb77" strokeWidth="3">
        <path d="M58 26v12M72 26v12M86 26v12M100 26v12M114 26v12" strokeLinecap="round" />
      </g>
      {/* ruled lines */}
      <g stroke="#bfd4f7" strokeWidth="3" strokeLinecap="round">
        <path d="M60 74h48" />
        <path d="M60 90h58" />
        <path d="M60 106h40" />
        <path d="M60 122h52" />
      </g>
      {/* pencil */}
      <g transform="rotate(38 150 104)">
        <rect x="140" y="50" width="20" height="86" rx="4" fill="#f7c948" stroke="#e2a300" strokeWidth="2.6" />
        <rect x="140" y="50" width="20" height="18" rx="4" fill="#ffe08a" stroke="#e2a300" strokeWidth="2.6" />
        <path d="M140 136h20l-10 16z" fill="#e7ecd6" stroke="#c9a227" strokeWidth="2.4" />
        <path d="M146 145h8l-4 7z" fill="#3f4a5a" />
      </g>
      {/* sparkles */}
      <path d="M168 40l2.2 5.2 5.2 2.2-5.2 2.2-2.2 5.2-2.2-5.2-5.2-2.2 5.2-2.2z" fill="#9ec1f5" />
      <path d="M26 62l1.7 4 4 1.7-4 1.7-1.7 4-1.7-4-4-1.7 4-1.7z" fill="#c2d8fb" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// NOTES PAGE - every learning note the student has written, plus a starter for
// a test they have not written about yet.
// ---------------------------------------------------------------------------

function NotesPage({ notes, loading, error, onBack, onEdit, onDelete, tests, onNew }) {
  const [newTestId, setNewTestId] = useState('');

  // tests the student has not written a note for yet, easiest names first
  const notYetNoted = useMemo(() => {
    const noted = new Set((notes || []).map((n) => String(asId(n.test_id))));
    return (tests || [])
      .filter((t) => !noted.has(String(asId(t.id))))
      .slice()
      .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  }, [notes, tests]);

  // newest note first
  const ordered = useMemo(() => {
    return (notes || []).slice().sort((a, b) => {
      const d = ntsStamp(b.updated_at) - ntsStamp(a.updated_at);
      if (d !== 0) return d;
      return asId(b.id) - asId(a.id);
    });
  }, [notes]);

  function startNew(e) {
    e.preventDefault();
    const id = Number(newTestId);
    if (!Number.isInteger(id)) return;
    const chosen = (tests || []).find((x) => asId(x.id) === id) || { id: id, title: 'Test ' + id };
    setNewTestId('');
    onNew(chosen);
  }

  const header = (
    <header className="nts-head">
      <button className="nts-back" type="button" onClick={onBack}>
        <NtsIcon name="back" size={17} /> Back
      </button>
      <div className="nts-head__txt">
        <h1>My Notes</h1>
        <p>Write down your mistakes, track your learning and build a stronger you!</p>
      </div>
      <div className="nts-head__art">
        <NtsBulbArt />
        <span className="nts-head__slogan">
          Small notes.<br />
          <b>Big progress!</b>
        </span>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="nts-root">
        <div className="nts-wrap">
          {header}
          <div className="nts-skel" />
          <div className="nts-skel" style={{ height: 96 }} />
          <p className="nts-muted">Loading your notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nts-root">
        <div className="nts-wrap">
          {header}
          <div className="nts-error">{error}</div>
          <div>
            <button className="nts-btn nts-btn--primary" type="button" onClick={onBack}>
              <NtsIcon name="back" size={16} /> Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nts-root">
      <div className="nts-wrap">
        {header}

        {/* ---------------- write a note for another test ---------------- */}
        <section className="nts-write">
          <div className="nts-write__head">
            <span className="nts-write__icon"><NtsIcon name="note" size={22} /></span>
            <h2>Write a note for another test</h2>
          </div>

          <form className="nts-write__row" onSubmit={startNew}>
            <div className="nts-select">
              <select
                id="nts-new-test"
                aria-label="Choose a test to write a note for"
                value={newTestId}
                onChange={(e) => setNewTestId(e.target.value)}
                disabled={notYetNoted.length === 0}
              >
                <option value="">
                  {notYetNoted.length === 0
                    ? 'You have written a note for every test'
                    : 'Choose a test and write your note (e.g., mistake, concept to revise, learning)...'}
                </option>
                {notYetNoted.map((t) => (
                  <option key={t.id} value={asId(t.id)}>{t.title}</option>
                ))}
              </select>
              <span className="nts-select__chev"><NtsIcon name="chev" size={20} /></span>
            </div>

            <button type="submit" className="nts-start" disabled={!newTestId}>
              <NtsIcon name="pencil" size={18} /> Start writing
            </button>
          </form>

          <ul className="nts-perks">
            <li>
              <span className="nts-perks__icon nts-perks__icon--blue"><NtsIcon name="target" size={20} /></span>
              Track your mistakes
            </li>
            <li>
              <span className="nts-perks__icon nts-perks__icon--violet"><NtsIcon name="brain" size={20} /></span>
              Revisit key concepts
            </li>
            <li>
              <span className="nts-perks__icon nts-perks__icon--green"><NtsIcon name="bars" size={20} /></span>
              Improve over time
            </li>
            <li>
              <span className="nts-perks__icon nts-perks__icon--amber"><NtsIcon name="star" size={20} /></span>
              Be a better you
            </li>
          </ul>
        </section>

        {/* ---------------- notes (or the empty state) ---------------- */}
        {ordered.length === 0 ? (
          <section className="nts-empty">
            <NtsPadArt />
            <h3>No notes yet.</h3>
            <p>Start writing your learnings after each mock test!</p>
          </section>
        ) : (
          <section className="nts-listwrap">
            <div className="nts-listhead">
              <h2>Your notes</h2>
              <span className="nts-count">
                {ordered.length} {ordered.length === 1 ? 'test covered' : 'tests covered'}
              </span>
            </div>

            <div className="nts-grid">
              {ordered.map((note) => {
                const text = (note.content || '').trim();
                const words = ntsWords(text);
                return (
                  <article key={note.id} className="nts-card">
                    <div className="nts-card__top">
                      <span className="nts-card__icon"><NtsIcon name="doc" size={19} /></span>
                      <h3 className="nts-card__title">{note.test_title || 'Mock Test'}</h3>
                      <button
                        className="nts-card__del"
                        type="button"
                        title="Delete this note"
                        onClick={() => onDelete(note)}
                      >
                        <NtsIcon name="trash" size={17} />
                      </button>
                    </div>

                    <div className="nts-card__meta">
                      <span><NtsIcon name="calendar" size={14} /> {ntsDateTime(note.updated_at) || 'Not saved yet'}</span>
                      <span><NtsIcon name="note" size={14} /> {words} {words === 1 ? 'word' : 'words'}</span>
                    </div>

                    <p className="nts-card__preview">
                      {text
                        ? (text.length > 320 ? text.slice(0, 320) + '...' : text)
                        : <em>No content yet - open the note and start writing.</em>}
                    </p>

                    <div className="nts-card__actions">
                      <button className="nts-btn nts-btn--primary" type="button" onClick={() => onEdit(note)}>
                        <NtsIcon name="pencil" size={16} /> {text ? 'Open note' : 'Start writing'}
                      </button>
                      <button className="nts-btn nts-btn--ghost" type="button" onClick={() => onDelete(note)}>
                        <NtsIcon name="trash" size={16} /> Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------------- pro tip strip ---------------- */}
        <div className="nts-tip">
          <span className="nts-tip__icon"><NtsIcon name="bulb" size={22} /></span>
          <span className="nts-tip__label">Pro Tip:</span>
          <span className="nts-tip__div" />
          <p>Include what you got wrong, why it happened, and how you{'\u2019'}ll avoid it next time.</p>
        </div>
      </div>
    </div>
  );
}
