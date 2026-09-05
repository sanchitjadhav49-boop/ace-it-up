import { useEffect, useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// ErrorDistribution
// For one mock test (75 questions): the student tags every question with the
// single most fitting category (Correct or one of 7 error types). Once all
// questions are tagged, a Report button unlocks a pie chart of the error
// distribution plus a per-error-type question-number table.
//
// Tags are persisted per attempt via the API (GET/POST /attempts/:id/error-tags),
// so selections survive tab switches AND leaving the app entirely.
//
// Props:
//   result  - same result object passed to Analysis (has result.questions[],
//             result.attempt_id)
//   onBack  - go back to the Analysis page
// ---------------------------------------------------------------------------

const API = ''; // same origin; vite proxies /attempts to the API
const LS_PREFIX = 'aceitup_ed_tags_v1:';

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

function getLsKey(attemptId, result) {
  if (attemptId != null) return `${LS_PREFIX}attempt:${attemptId}`;
  const title = (result && result.title) ? encodeURIComponent(result.title) : 'guest';
  return `${LS_PREFIX}guest:${title}`;
}

function loadLocalTags(lsKey) {
  try {
    const raw = localStorage.getItem(lsKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // expected shape: { [questionIndex]: tagKey }
    return parsed;
  } catch (e) {
    console.error('Failed to read local error-tags:', e.message);
    return null;
  }
}

function saveLocalTags(lsKey, tags) {
  try {
    localStorage.setItem(lsKey, JSON.stringify(tags || {}));
  } catch (e) {
    console.error('Failed to persist local error-tags:', e.message);
  }
}

const ERROR_TYPES = [
  { key: 'concept',     label: 'Concept gap',         color: '#dc2626' },
  { key: 'silly',       label: 'Silly mistake',       color: '#d97706' },
  { key: 'reading',     label: 'Reading mistake',     color: '#7c3aed' },
  { key: 'application', label: 'Application mistake', color: '#2563eb' },
  { key: 'time',        label: 'Time pressure',       color: '#0891b2' },
  { key: 'guess',       label: 'Guess',               color: '#db2777' },
  { key: 'recall',      label: 'Recall mistake',      color: '#65a30d' },
  { key: 'skip',        label: 'Skip',                color: '#6b7280' },
];

const CORRECT_KEY = 'correct';
const ALL_OPTIONS = [{ key: CORRECT_KEY, label: 'Correct', color: '#16a34a' }, ...ERROR_TYPES];

const SUBJECT_COLORS = {
  Physics: '#2563eb',
  Chemistry: '#7c3aed',
  Mathematics: '#059669',
};

const DIFFICULTY_COLORS = {
  easy: '#16a34a',
  moderate: '#d97706',
  difficult: '#dc2626',
};

// ---------------------------------------------------------------------------
// SVG helpers for the pie chart (angles clockwise from 12 o'clock)
// ---------------------------------------------------------------------------
function polarToCartesian(cx, cy, r, angleRad) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= Math.PI ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function pctOf(n, total) {
  return total > 0 ? ((n / total) * 100).toFixed(1) : '0.0';
}

// ---------------------------------------------------------------------------
// ErrorPie: interactive SVG donut of the error distribution.
//   rows        - [{ key, label, color, count, questions }] with count > 0
//   totalErrors - total number of non-correct questions
// ---------------------------------------------------------------------------
function ErrorPie({ rows, totalErrors }) {
  const [hovered, setHovered] = useState(null);

  const size = 230;
  const cx = size / 2;
  const cy = size / 2;
  const r = 82;
  const stroke = 34;
  const gap = 0.035; // radians of whitespace between slices

  let cursor = -Math.PI / 2; // start at top
  const slices = rows.map((row, i) => {
    const share = totalErrors > 0 ? row.count / totalErrors : 0;
    const sweep = share * Math.PI * 2;
    let start = cursor;
    let end = cursor + sweep;
    if (rows.length > 1) {
      start += gap / 2;
      end -= gap / 2;
    }
    cursor += sweep;
    return { row, start, end, i };
  });

  const active = hovered != null ? slices[hovered] : null;

  return (
    <div className="ed-pie">
      <svg
        className="ta-pie__svg"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Error distribution pie chart"
        onMouseLeave={() => setHovered(null)}
      >
        {/* track (full ring) */}
        <circle cx={cx} cy={cy} r={r} fill="none" className="ta-pie__track" strokeWidth={stroke} />
        {slices.map(({ row, start, end, i }) => {
          const isHovered = hovered === i;
          const radius = isHovered ? r + 7 : r;
          const d = arcPath(cx, cy, radius, start, end);
          return (
            <path
              key={row.key}
              d={d}
              fill="none"
              stroke={row.color}
              strokeWidth={isHovered ? stroke + 6 : stroke}
              strokeLinecap={slices.length === 1 ? 'round' : 'butt'}
              className={`ta-pie__slice${isHovered ? ' ta-pie__slice--hover' : ''}`}
              onMouseEnter={() => setHovered(i)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
            >
              <title>{`${row.label}: ${row.count} questions (${pctOf(row.count, totalErrors)}%)`}</title>
            </path>
          );
        })}

        {/* center readout */}
        <text x={cx} y={cy - 2} textAnchor="middle" className="ta-pie__center-value">
          {active ? active.row.count : totalErrors}
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle" className="ta-pie__center-label">
          {active
            ? `${active.row.label} (${pctOf(active.row.count, totalErrors)}%)`
            : totalErrors === 1 ? 'Error' : 'Errors'}
        </text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ErrorDistribution component
// ---------------------------------------------------------------------------
export default function ErrorDistribution({ result, onBack }) {
  const [tags, setTags] = useState(null);   // null = still loading from server
  const [view, setView] = useState('tag');  // 'tag' | 'report'
  const [saveError, setSaveError] = useState('');

  const questions = (result && result.questions) || [];
  const total = questions.length;
  const attemptId = result && result.attempt_id;

  // Load previously saved tags for this attempt.
  useEffect(() => {
    let cancelled = false;
    const lsKey = getLsKey(attemptId, result);

    // quick local restore so the UI feels snappy
    const local = loadLocalTags(lsKey);
    if (!cancelled) setTags(local || {});

    if (!attemptId) {
      // no server-backed attempt id; rely solely on localStorage
      return () => { cancelled = true; };
    }

    api(`/attempts/${attemptId}/error-tags`)
      .then((res) => {
        if (cancelled) return;
        // server keys by question_id; convert to question-index keys
        const byIndex = {};
        questions.forEach((q, i) => {
          if (res.tags && res.tags[q.id] != null) byIndex[i] = res.tags[q.id];
        });
        // merge local and server: server wins where present
        const merged = { ...(local || {}), ...byIndex };
        setTags(merged);
        // persist merged state locally so offline/guest usage is covered
        saveLocalTags(lsKey, merged);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load error tags:', err.message, err.status, err.body);
        // keep whatever local tags we had
        setTags(local || {});
      });

    return () => { cancelled = true; };
  }, [attemptId, result]); // eslint-disable-line react-hooks/exhaustive-deps

  const tagMap = tags || {};
  const answered = Object.keys(tagMap).length;
  const allDone = total > 0 && answered === total;

  const setTag = (qi, key) => {
    const q = questions[qi];
    if (!q) return;
    // optimistic local update
    setTags((prev) => {
      const next = { ...(prev || {}), [qi]: key };
      const lsKey = getLsKey(attemptId, result);
      saveLocalTags(lsKey, next);
      return next;
    });
    setSaveError('');
    if (attemptId) {
      api(`/attempts/${attemptId}/error-tags`, {
        method: 'POST',
        body: JSON.stringify({ question_id: q.id, error_tag: key }),
      }).catch((err) => {
        // Show more details in console and to the user so it's easier to debug.
        console.error('Failed to save error tag:', err.message, 'status=', err.status, 'body=', err.body);
        setSaveError(err.body && err.body.error ? `Save failed: ${err.body.error}` : 'Could not save your tag - check your connection.');
        // resync from the server so the UI matches what is stored
        api(`/attempts/${attemptId}/error-tags`)
          .then((res) => {
            const byIndex = {};
            questions.forEach((qq, i) => {
              if (res.tags && res.tags[qq.id] != null) byIndex[i] = res.tags[qq.id];
            });
            const lsKey = getLsKey(attemptId, result);
            const local = loadLocalTags(lsKey) || {};
            const merged = { ...local, ...byIndex };
            setTags(merged);
            saveLocalTags(lsKey, merged);
          })
          .catch(() => {});
      });
    }
  };

  const jumpTo = (i) => {
    const el = document.getElementById(`ed-q-${i}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const firstUnanswered = questions.findIndex((q, i) => !tagMap[i]);

  // Aggregate tags into per-error-type question lists (Q numbers are 1-based).
  const report = useMemo(() => {
    const perType = {};
    ERROR_TYPES.forEach((e) => { perType[e.key] = []; });
    let correctCount = 0;
    questions.forEach((q, i) => {
      const tag = tagMap[i];
      if (tag === CORRECT_KEY) { correctCount += 1; return; }
      if (tag && perType[tag]) perType[tag].push(q.global_position || i + 1);
    });
    const rows = ERROR_TYPES.map((e) => {
      const list = perType[e.key];
      return { ...e, questions: list, count: list.length };
    });
    return { rows, errorTotal: total - correctCount, correctCount };
  }, [tagMap, questions, total]);

  if (!result || total === 0) {
    return (
      <div className="ta-page">
        <button className="btn-ghost ta-back-btn" onClick={onBack}>Back to Analysis</button>
        <p className="muted">No questions available for error tagging.</p>
      </div>
    );
  }

  if (tags === null) {
    return (
      <div className="ta-page ed-page">
        <header className="ta-header">
          <button className="btn-ghost ta-back-btn" onClick={onBack}>&#8592; Back to Analysis</button>
          <div className="ta-header__center">
            <h1 className="ta-heading">Error Distribution</h1>
            <p className="ta-subheading muted">{result.title}</p>
          </div>
        </header>
        <p className="muted">Loading saved tags...</p>
      </div>
    );
  }

  // ============================ REPORT VIEW ================================
  if (view === 'report') {
    const { rows, errorTotal, correctCount } = report;
    const pieRows = rows.filter((r) => r.count > 0);

    return (
      <div className="ta-page ed-page">
        <header className="ta-header">
          <button className="btn-ghost ta-back-btn" onClick={onBack}>&#8592; Back to Analysis</button>
          <div className="ta-header__center">
            <h1 className="ta-heading">Error Distribution Report</h1>
            <p className="ta-subheading muted">
              {result.title} &middot; {total} questions &middot; {correctCount} Correct
              &middot; {errorTotal} with errors
            </p>
          </div>
        </header>

        {errorTotal === 0 ? (
          <div className="ed-empty">
            No errors to report - every question was marked Correct. Great job!
          </div>
        ) : (
          <div className="ed-report-grid">
            <div className="ed-report-card">
              <h2 className="ta-pie-card__title">Error Distribution</h2>
              <p className="ta-pie-card__sub muted">
                Percentage share of each error type among the {errorTotal} non-correct questions.
              </p>
              <ErrorPie rows={pieRows} totalErrors={errorTotal} />
            </div>
            <div className="ed-report-card">
              <h2 className="ta-pie-card__title">Breakdown</h2>
              <ul className="ed-legend">
                {rows.map((r) => (
                  <li key={r.key} className="ed-legend__row">
                    <span className="ta-legend__dot" style={{ background: r.color }} />
                    <span className="ed-legend__label">{r.label}</span>
                    <span className="ed-legend__count">{r.count} Q</span>
                    <span className="ed-legend__pct">{pctOf(r.count, errorTotal)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="ta-table-wrap">
          <h2 className="ta-table-title">Error Types and Question Numbers</h2>
          <p className="ta-table-sub muted">
            Each row lists the questions (Q1 to Q{total}) tagged with that error type.
          </p>
          <div className="ta-table-scroll">
            <table className="ta-table ed-table">
              <thead>
                <tr>
                  <th>Error Type</th>
                  <th>Count</th>
                  <th>Share</th>
                  <th>Question Numbers</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td>
                      <span className="ed-type-cell">
                        <span className="ta-legend__dot" style={{ background: r.color }} />
                        {r.label}
                      </span>
                    </td>
                    <td className="ed-count-cell">{r.count}</td>
                    <td className="ed-count-cell">{pctOf(r.count, errorTotal)}%</td>
                    <td className="ed-qnos">
                      {r.questions.length > 0
                        ? r.questions.map((n) => `Q${n}`).join(', ')
                        : <span className="muted">�</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ta-footer">
          <button className="btn-ghost" onClick={() => setView('tag')}>Edit Tags</button>
          <button className="btn-primary" onClick={onBack}>Back to Performance Analysis</button>
        </div>
      </div>
    );
  }

  // ============================= TAGGING VIEW ==============================
  return (
    <div className="ta-page ed-page">
      <header className="ta-header">
        <button className="btn-ghost ta-back-btn" onClick={onBack}>&#8592; Back to Analysis</button>
        <div className="ta-header__center">
          <h1 className="ta-heading">Error Distribution</h1>
          <p className="ta-subheading muted">
            {result.title} &middot; tag the single biggest reason for each question.
          </p>
        </div>
      </header>

      {saveError && <p className="error" style={{ textAlign: 'center', margin: '0 0 10px' }}>{saveError}</p>}

      {/* progress */}
      <div className="ed-progress">
        <div className="ed-progress__bar">
          <div className="ed-progress__fill" style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
        </div>
        <span className="ed-progress__label">{answered} / {total} answered</span>
      </div>

      {/* quick-jump palette */}
      <div className="ed-palette" role="navigation" aria-label="Jump to question">
        {questions.map((q, i) => (
          <button
            key={i}
            className={`ed-palette__cell${tagMap[i] ? ' ed-palette__cell--done' : ''}`}
            onClick={() => jumpTo(i)}
            title={tagMap[i] ? `Q${q.global_position || i + 1} - tagged` : `Q${q.global_position || i + 1} - not tagged`}
          >
            {q.global_position || i + 1}
          </button>
        ))}
      </div>

      {!allDone && firstUnanswered >= 0 && (
        <div className="ed-hint">
          <button className="btn-ghost" onClick={() => jumpTo(firstUnanswered)}>
            Jump to first unanswered (Q{questions[firstUnanswered]?.global_position || firstUnanswered + 1})
          </button>
        </div>
      )}

      <div className="ed-list">
        {questions.map((q, i) => {
          const subjectColor = SUBJECT_COLORS[q.section] || '#475569';
          const diffColor = DIFFICULTY_COLORS[q.difficulty] || '#475569';
          return (
            <div key={q.id} id={`ed-q-${i}`} className={`ed-question${tagMap[i] ? ' ed-question--done' : ''}`}>
              <div className="ed-question__meta">
                <span className="ed-question__num">Q{q.global_position || i + 1}</span>
                <span className="ta-subject-pill" style={{ background: subjectColor + '18', color: subjectColor, border: `1px solid ${subjectColor}40` }}>
                  {q.section}
                </span>
                <span className="ta-diff-pill" style={{ color: diffColor }}>
                  {q.difficulty || 'easy'}
                </span>
                <p className="ed-question__body" title={q.body}>
                  {q.body.length > 130 ? q.body.slice(0, 130) + '...' : q.body}
                </p>
              </div>
              <div className="ed-options">
                {ALL_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    className={`ed-option${tagMap[i] === o.key ? ' ed-option--active' : ''}`}
                    style={tagMap[i] === o.key ? { background: o.color, borderColor: o.color, color: '#fff' } : undefined}
                    onClick={() => setTag(i, o.key)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ed-report-bar">
        {allDone ? (
          <button className="btn-primary ed-report-btn" onClick={() => setView('report')}>
            Report
          </button>
        ) : (
          <p className="muted">Answer all {total} questions to unlock the Report.</p>
        )}
      </div>
    </div>
  );
}
