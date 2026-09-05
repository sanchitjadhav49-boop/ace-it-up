import { useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// QuestionTypeAnalysis  (MCQ vs Numerical)
//
// Same layout as DifficultyAnalysis but the two groups are question types:
//   MCQ        - single-correct-answer multiple choice questions
//   Numerical  - numeric answer questions (NAT)
// Tabs at the top switch between Overall / Physics / Chemistry / Mathematics.
// For the active scope each type card shows a stacked Correct / Incorrect /
// Skipped bar with counts and percentages plus the time spent, and the
// "Where your time went" panel compares MCQ vs Numerical so the student can
// see which question format consumes the clock.
// ---------------------------------------------------------------------------

const TYPES = [
  { key: 'mcq', label: 'MCQ', color: '#2563eb' },
  { key: 'numerical', label: 'Numerical', color: '#0d9488' },
];

const RESULTS = [
  { key: 'correct', label: 'Correct', color: '#16a34a' },
  { key: 'incorrect', label: 'Incorrect', color: '#dc2626' },
  { key: 'skipped', label: 'Skipped', color: '#94a3b8' },
];

const SCOPE_TABS = ['Overall', 'Physics', 'Chemistry', 'Mathematics'];

function classifySubject(q) {
  const sec = String((q && q.section) || (q && q.subject) || '');
  if (/physics/i.test(sec)) return 'Physics';
  if (/chem/i.test(sec)) return 'Chemistry';
  if (/math/i.test(sec)) return 'Mathematics';
  return 'Other';
}

function formatDuration(totalSeconds) {
  const t = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function computeRows(questions) {
  const stats = {};
  TYPES.forEach((t) => {
    stats[t.key] = { total: 0, correct: 0, incorrect: 0, skipped: 0, seconds: 0 };
  });

  let grandSec = 0;

  for (const q of questions) {
    const raw = String(q.question_type || 'mcq').toLowerCase();
    const type = raw === 'numerical' ? 'numerical' : 'mcq';
    const st = stats[type];
    const secs = Number(q.time_spent_seconds) || 0;

    st.total += 1;
    st.seconds += secs;
    grandSec += secs;

    const attempted =
      q.selected_option_id != null ||
      q.numerical_answer != null ||
      q.answer_id != null ||
      q.selected_option != null;

    if (q.is_correct === true) st.correct += 1;
    else if (attempted) st.incorrect += 1;
    else st.skipped += 1;
  }

  const rows = TYPES.map((t) => {
    const st = stats[t.key];
    const attempted = st.correct + st.incorrect;
    return {
      ...t,
      st,
      attempted,
      accuracy: attempted > 0 ? st.correct / attempted : null,
      avgPerQ: st.total ? Math.round(st.seconds / st.total) : 0,
      share: pct(st.seconds, grandSec),
    };
  });

  return { rows, grandSec, totalQ: questions.length };
}

function buildTakeaways(rows, grandSec) {
  const takeaways = [];

  if (grandSec > 0) {
    const withQ = rows.filter((r) => r.st.total > 0);
    if (withQ.length) {
      const most = [...withQ].sort((a, b) => b.st.seconds - a.st.seconds)[0];
      takeaways.push(
        <li key="t1">
          Most of your time went to <strong style={{ color: most.color }}>{most.label}</strong>{' '}
          questions — <strong>{formatDuration(most.st.seconds)}</strong> ({most.share}% of total,
          avg {formatDuration(most.avgPerQ)} per question).
        </li>
      );
    }
  } else {
    takeaways.push(
      <li key="t1">No per-question time was recorded for this attempt, so time insights are unavailable.</li>
    );
  }

  const totalSkipped = rows.reduce((a, r) => a + r.st.skipped, 0);
  if (totalSkipped > 0) {
    const worstSkip = rows.filter((r) => r.st.skipped > 0)
      .sort((a, b) => b.st.skipped - a.st.skipped)[0];
    takeaways.push(
      <li key="t2">
        You skipped <strong>{worstSkip.st.skipped} of {worstSkip.st.total}</strong>{' '}
        <strong style={{ color: worstSkip.color }}>{worstSkip.label.toLowerCase()}</strong>{' '}
        questions — skipped questions always score 0, so attempting them is free marks.
      </li>
    );
  } else {
    takeaways.push(
      <li key="t2">You attempted every question — no easy marks were left on the table.</li>
    );
  }

  const withAttempts = rows.filter((r) => r.attempted > 0);
  if (withAttempts.length) {
    const worstAcc = [...withAttempts].sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))[0];
    if (worstAcc.accuracy >= 1) {
      takeaways.push(
        <li key="t3">Excellent — every question you attempted was answered correctly.</li>
      );
    } else {
      takeaways.push(
        <li key="t3">
          On <strong style={{ color: worstAcc.color }}>{worstAcc.label.toLowerCase()}</strong> you got{' '}
          <strong>{worstAcc.st.correct} of {worstAcc.attempted} attempted</strong> right (
          {pct(worstAcc.st.correct, worstAcc.attempted)}% accuracy) — review these in the question
          review to lift your score.
        </li>
      );
    }
  } else {
    takeaways.push(
      <li key="t3">You did not attempt any question — in JEE a careful attempt is better than leaving it blank.</li>
    );
  }

  return takeaways;
}

export default function QuestionTypeAnalysis({ result, onBack }) {
  const [scope, setScope] = useState('Overall');

  const data = useMemo(() => {
    if (!result || !Array.isArray(result.questions) || result.questions.length === 0) {
      return null;
    }

    // Bucket every question under its subject so tab switches stay instant.
    const bySubject = { Overall: [], Physics: [], Chemistry: [], Mathematics: [], Other: [] };
    for (const q of result.questions) {
      bySubject.Overall.push(q);
      bySubject[classifySubject(q)].push(q);
    }

    const scopes = {};
    for (const key of SCOPE_TABS) {
      scopes[key] = computeRows(bySubject[key]);
    }

    return {
      scopes,
      scopeCounts: SCOPE_TABS.map((key) => ({ key, count: bySubject[key].length })),
      title: result.title || '',
    };
  }, [result]);

  if (!data) {
    return (
      <div className="ta-page">
        <button className="btn-ghost ta-back-btn" onClick={onBack}>Back to Analysis</button>
        <p className="muted">No question data available for this attempt.</p>
      </div>
    );
  }

  const active = data.scopes[scope];
  const activeEmpty = scope !== 'Overall' && active.totalQ === 0;
  const { rows, grandSec } = active;

  return (
    <div className="ta-page">
      <header className="ta-header">
        <button className="btn-ghost ta-back-btn" onClick={onBack}>&#8592; Back to Analysis</button>
        <div className="ta-header__center">
          <h1 className="ta-heading">MCQ vs Numerical Analysis</h1>
          <p className="ta-subheading muted">
            {data.title} · {active.totalQ} questions
            {scope !== 'Overall' && ` · ${scope}`}
            {' · Total time: '}<strong>{formatDuration(grandSec)}</strong>
          </p>
        </div>
      </header>

      {/* ---- Scope tabs: Overall / Physics / Chemistry / Mathematics ---- */}
      <div className="da2-tabs" role="tablist" aria-label="Show analysis for">
        {data.scopeCounts.map(({ key, count }) => (
          <button
            key={key}
            role="tab"
            aria-selected={scope === key}
            className={`da2-tab${scope === key ? ' da2-tab--active' : ''}`}
            onClick={() => setScope(key)}
          >
            {key}
            {key !== 'Overall' && (
              <span className={`da2-tab__count${count === 0 ? ' da2-tab__count--zero' : ''}`}>
                {count} Q
              </span>
            )}
          </button>
        ))}
      </div>

      {activeEmpty ? (
        <div className="da2-empty">
          No {scope} questions in this test. Switch to Overall or another subject to see its
          question-type breakdown.
        </div>
      ) : (
        <>
          {/* ---- One stacked bar card per question type ---- */}
          <div className="da2-cards da2-cards--two">
            {rows.map((r) => {
              const st = r.st;
              const segs = RESULTS.filter((res) => st[res.key] > 0);
              const hasQ = st.total > 0;
              return (
                <div className="da2-card" key={r.key}>
                  <div className="da2-card__top">
                    <span className={`da2-pill da2-pill--${r.key}`}>{r.label}</span>
                    <span className="da2-card__count">{st.total} Q</span>
                  </div>

                  <div className="da2-card__time">
                    <span className="da2-card__time-value" style={{ color: r.color }}>
                      {formatDuration(st.seconds)}
                    </span>
                    <span className="da2-card__time-meta">
                      spent · avg {formatDuration(r.avgPerQ)} per question
                    </span>
                  </div>

                  {hasQ ? (
                    <div
                      className="da2-bar"
                      role="img"
                      aria-label={`${r.label}: correct vs incorrect vs skipped`}
                    >
                      {segs.map((res) => {
                        const count = st[res.key];
                        const share = pct(count, st.total);
                        return (
                          <div
                            key={res.key}
                            className="da2-bar__seg"
                            style={{ flexGrow: count, background: res.color, minWidth: 6 }}
                            title={`${res.label}: ${count} (${share}%)`}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="da2-card__empty">
                      No {r.label.toLowerCase()} questions in this scope
                    </div>
                  )}

                  <div className="da2-stats">
                    {RESULTS.map((res) => {
                      const count = st[res.key];
                      return (
                        <div className="da2-stat" key={res.key}>
                          <span className="da2-stat__swatch" style={{ background: res.color }} />
                          <div>
                            <div
                              className="da2-stat__value"
                              style={{ color: count > 0 ? res.color : '#9aa3af' }}
                            >
                              {count}
                              <span className="da2-stat__pct">
                                {hasQ ? `${pct(count, st.total)}%` : '—'}
                              </span>
                            </div>
                            <div className="da2-stat__label">{res.label}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ---- Where your time went ---- */}
          <div className="ta-table-wrap">
            <h2 className="ta-table-title">
              Where your time went{scope !== 'Overall' ? ` — ${scope}` : ''}
            </h2>
            <p className="ta-table-sub muted">
              Compare how much of the clock each question format consumed. Numerical questions
              usually need a higher per-question time — a large gap may be worth practising.
            </p>

            {grandSec === 0 ? (
              <p className="muted" style={{ padding: '8px 2px 18px' }}>
                No time data was recorded for this attempt, so there is nothing to compare yet.
              </p>
            ) : (
              <div className="da2-time">
                {rows.map((r) => {
                  const st = r.st;
                  const share = r.share;
                  return (
                    <div className="da2-time__row" key={r.key}>
                      <div className="da2-time__label">
                        <span className="da2-time__dot" style={{ background: r.color }} />
                        {r.label}
                      </div>
                      <div className="da2-time__track">
                        <div className="da2-time__bar">
                          <div
                            className="da2-time__fill"
                            style={{
                              width: `${Math.max(share, st.seconds > 0 ? 2 : 0)}%`,
                              background: r.color,
                            }}
                            title={`${r.label}: ${formatDuration(st.seconds)} (${share}%)`}
                          />
                        </div>
                        <div className="da2-time__sub">
                          {st.total} Q · avg {formatDuration(r.avgPerQ)} per question
                        </div>
                      </div>
                      <div className="da2-time__value">
                        {formatDuration(st.seconds)}
                        <span className="da2-time__pct">{share}% of time</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ---- Key takeaways ---- */}
      {!activeEmpty && (
        <div className="ta-insight-box">
          <span className="ta-insight-box__heading">What to work on</span>
          <div className="ta-insight-box__text">
            <ul className="da2-takeaways">{buildTakeaways(rows, grandSec)}</ul>
          </div>
        </div>
      )}

      <div className="ta-footer">
        <button className="btn-primary" onClick={onBack}>Back to Performance Analysis</button>
      </div>
    </div>
  );
}
