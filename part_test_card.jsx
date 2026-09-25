// ---------------------------------------------------------------------------
// HOME screen building blocks: inline SVG icon set + shared helpers.
// ---------------------------------------------------------------------------

const HP_ACCENTS = ['blue', 'green', 'violet', 'amber', 'rose', 'indigo'];

const HP_LEVEL_RANK = { easy: 0, moderate: 1, mixed: 1, difficult: 2 };

// Difficulty of a test, read from the leading word of its description
// ("Easy mock: ...", "Moderate mock: ...", "Difficult mock: ...").
function testLevel(test) {
  const text = String(test && test.description ? test.description : '');
  const head = text.split(':')[0].trim().toLowerCase();
  if (head.startsWith('difficult')) return 'difficult';
  if (head.startsWith('moderate')) return 'moderate';
  if (head.startsWith('easy')) return 'easy';
  return 'mixed';
}

// Lightweight stroke icon set (24x24 grid) - no external icon dependency.
function HpIcon({ name, size = 18 }) {
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

  if (name === 'star') {
    return (
      <svg {...base} fill="currentColor" stroke="none">
        <path d="M12 3.4l2.6 5.3 5.8.8-4.2 4.1.9 5.8-5.1-2.7-5.1 2.7.9-5.8L3.6 9.5l5.8-.8z" />
      </svg>
    );
  }

  if (name === 'home') {
    return (
      <svg {...base}>
        <path d="M3.5 10.6 12 3.6l8.5 7v9a1 1 0 0 1-1 1h-4.8v-5.6H9.3v5.6H4.5a1 1 0 0 1-1-1z" />
      </svg>
    );
  }

  if (name === 'clock') {
    return (
      <svg {...base}>
        <circle cx="12" cy="12" r="8.6" />
        <path d="M12 7.4V12l3.3 2" />
      </svg>
    );
  }

  if (name === 'note' || name === 'doc') {
    return (
      <svg {...base}>
        <path d="M14 3.4H7.4a2 2 0 0 0-2 2v13.2a2 2 0 0 0 2 2h9.2a2 2 0 0 0 2-2V8z" />
        <path d="M14 3.4V8h4.6" />
        <path d="M8.6 12.6h6.2M8.6 16.2h4.2" />
      </svg>
    );
  }

  if (name === 'target') {
    return (
      <svg {...base}>
        <circle cx="12" cy="12" r="8.4" />
        <circle cx="12" cy="12" r="4.3" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (name === 'focus') {
    return (
      <svg {...base}>
        <path d="M12 3.4a8.6 8.6 0 1 0 8.6 8.6" />
        <path d="M12 12l6.4-6.4" />
        <circle cx="12" cy="12" r="2.2" />
      </svg>
    );
  }

  if (name === 'logout') {
    return (
      <svg {...base}>
        <path d="M10 21H6.4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2H10" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H10" />
      </svg>
    );
  }

  if (name === 'search') {
    return (
      <svg {...base}>
        <circle cx="11" cy="11" r="7" />
        <path d="M16.3 16.3 21 21" />
      </svg>
    );
  }

  if (name === 'moon') {
    return (
      <svg {...base}>
        <path d="M20.6 13.7A8.6 8.6 0 1 1 10.3 3.4a6.9 6.9 0 0 0 10.3 10.3z" />
      </svg>
    );
  }

  if (name === 'sun') {
    return (
      <svg {...base}>
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.4v2.4M12 19.2v2.4M2.4 12h2.4M19.2 12h2.4M5.1 5.1l1.7 1.7M17.2 17.2l1.7 1.7M18.9 5.1l-1.7 1.7M6.8 17.2l-1.7 1.7" />
      </svg>
    );
  }

  if (name === 'filter') {
    return (
      <svg {...base}>
        <path d="M4 5.4h16l-6.2 7.2v5.6l-3.6 1.8v-7.4z" />
      </svg>
    );
  }

  if (name === 'bulb') {
    return (
      <svg {...base}>
        <path d="M9.6 18.2h4.8M10.6 21.4h2.8" />
        <path d="M12 2.6a6 6 0 0 0-3.5 10.9v4.7h7v-4.7A6 6 0 0 0 12 2.6z" />
      </svg>
    );
  }

  if (name === 'chart') {
    return (
      <svg {...base}>
        <path d="M3.4 20.2h17.2" />
        <path d="M6.6 20.2v-6M11.4 20.2V7.8M16.2 20.2v-9" />
      </svg>
    );
  }

  if (name === 'mark') {
    return (
      <svg {...base}>
        <path d="M9.4 6.2H21M9.4 12h11.6M9.4 17.8H21" />
        <path d="M3.6 6l1.6 1.6L8 4.8M3.6 11.8l1.6 1.6 2.8-2.8M3.6 17.6l1.6 1.6 2.8-2.8" />
      </svg>
    );
  }

  if (name === 'chevron') {
    return (
      <svg {...base}>
        <path d="M9 5.6 15.4 12 9 18.4" />
      </svg>
    );
  }

  if (name === 'arrow') {
    return (
      <svg {...base}>
        <path d="M4 12h15" />
        <path d="M13 6l6 6-6 6" />
      </svg>
    );
  }

  if (name === 'check') {
    return (
      <svg {...base}>
        <path d="M4.8 12.6 9.4 17.2 19.2 6.8" />
      </svg>
    );
  }

  // fall back to a dot so an unknown name never breaks the layout
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// TestCard - one mock test inside the home grid.
// ---------------------------------------------------------------------------

function TestCard({ test, index = 0, userId, onStart }) {
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

  const accent = HP_ACCENTS[index % HP_ACCENTS.length];
  const recommended = index === 0;
  const questions = test.question_count || 75;
  const minutes = test.duration_minutes || 180;

  return (
    <article className={`hp-card hp-card--${accent}`}>
      <div className="hp-card__head">
        <span className="hp-card__icon"><HpIcon name="doc" size={22} /></span>
        <h3 className="hp-card__title">{test.title}</h3>
        <span className="hp-card__head-end">
          {recommended && (
            <span className="hp-card__badge hp-card__badge--reco">
              <HpIcon name="star" size={12} /> Recommended
            </span>
          )}
          {!recommended && resume && (
            <span className="hp-card__badge hp-card__badge--progress">
              <HpIcon name="clock" size={12} /> In Progress
            </span>
          )}
        </span>
      </div>

      {test.description && <p className="hp-card__desc">{test.description}</p>}

      <div className="hp-card__meta">
        <span><HpIcon name="mark" size={15} /> {questions} questions</span>
        <span><HpIcon name="clock" size={15} /> {minutes} min</span>
        <span><HpIcon name="chart" size={15} /> +4 / -1</span>
      </div>

      {checking ? (
        <div className="hp-card__checking">Checking your progress...</div>
      ) : resume ? (
        <button className="hp-card__cta hp-card__cta--resume" type="button" onClick={() => onStart(resume.attempt_id)}>
          Resume Attempt <HpIcon name="arrow" size={17} />
        </button>
      ) : (
        <button className="hp-card__cta" type="button" onClick={() => onStart(null)}>
          Start Test <HpIcon name="arrow" size={17} />
        </button>
      )}
    </article>
  );
}

