import { useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// TimeAnalysis
// Props:
//   result  - same result object passed to Analysis (has result.questions[])
//   onBack  - go back to the Analysis page
// ---------------------------------------------------------------------------

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

const RESULT_COLORS = {
  correct: '#16a34a',
  incorrect: '#dc2626',
  unattempted: '#94a3b8',
};

function formatDuration(totalSeconds) {
  const t = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function questionNumber(question, fallback) {
  return question.global_position || question.position || fallback;
}

// ---------------------------------------------------------------------------
// SVG helpers for the donut chart
// ---------------------------------------------------------------------------
function polarToCartesian(cx, cy, r, angleRad) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

// Arc path for a slice, angles measured clockwise from 12 o'clock.
function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= Math.PI ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

// ---------------------------------------------------------------------------
// PieChart: interactive SVG donut with a center readout.
//   rows         - [{ label, seconds, color, count, countLabel }]
//   totalSeconds - sum of all seconds (used for shares + center readout)
// ---------------------------------------------------------------------------
function PieChart({ rows, totalSeconds }) {
  const [hovered, setHovered] = useState(null);

  const size = 210;
  const cx = size / 2;
  const cy = size / 2;
  const r = 74;
  const rHover = 80;
  const stroke = 30;
  const gap = 0.035; // radians of whitespace between slices

  const visible = rows.filter((row) => row.seconds > 0);
  const hasData = totalSeconds > 0 && visible.length > 0;

  // Build slices with angles.
  let cursor = -Math.PI / 2; // start at top
  const slices = [];
  const sliceRows = hasData ? visible : rows;
  sliceRows.forEach((row, i) => {
    const share = hasData ? row.seconds / totalSeconds : 0;
    const sweep = share * Math.PI * 2;
    let start = cursor;
    let end = cursor + sweep;
    if (hasData && sliceRows.length > 1) {
      // carve small gaps between slices
      start += gap / 2;
      end -= gap / 2;
    }
    slices.push({ row, start, end, sweep, i });
    cursor += sweep;
  });

  const active = hovered != null ? slices[hovered] : null;

  return (
    <div className="ta-pie">
      <svg
        className="ta-pie__svg"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Time distribution pie chart"
        onMouseLeave={() => setHovered(null)}
      >
        {/* track (full ring) */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          className="ta-pie__track"
          strokeWidth={stroke}
        />
        {slices.map(({ row, start, end, i }) => {
          const isHovered = hovered === i;
          const radius = isHovered ? rHover : r;
          const d = arcPath(cx, cy, radius, start, end);
          return (
            <path
              key={row.label}
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
              <title>{`${row.label}: ${formatDuration(row.seconds)} (${pct(row.seconds, totalSeconds)}%)`}</title>
            </path>
          );
        })}

        {/* center readout */}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          className="ta-pie__center-value"
        >
          {active
            ? formatDuration(active.row.seconds)
            : formatDuration(totalSeconds)}
        </text>
        <text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          className="ta-pie__center-label"
        >
          {active
            ? `${active.row.label} \u00b7 ${pct(active.row.seconds, totalSeconds)}%`
            : 'Total time'}
        </text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PieCard: a single breakdown card (title + donut + legend)
// ---------------------------------------------------------------------------
function PieCard({ title, subtitle, rows, totalSeconds }) {
  return (
    <div className="ta-pie-card">
      <div className="ta-pie-card__header">
        <h2 className="ta-pie-card__title">{title}</h2>
        <span className="ta-pie-card__total">{formatDuration(totalSeconds)}</span>
      </div>
      <div className="ta-pie-card__body">
        <PieChart rows={rows} totalSeconds={totalSeconds} />
        <ul className="ta-legend">
          {rows.map(({ label, seconds, color, count, countLabel }) => (
            <li key={label} className="ta-legend__row">
              <span className="ta-legend__dot" style={{ background: color }} />
              <span className="ta-legend__label">{label}</span>
              <span className="ta-legend__count">
                {count} {countLabel}
              </span>
              <span className="ta-legend__time">{formatDuration(seconds)}</span>
              <span className="ta-legend__pct">{pct(seconds, totalSeconds)}%</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="ta-pie-card__sub muted">{subtitle}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-question table
// ---------------------------------------------------------------------------
function QuestionTable({ questions }) {
  return (
    <div className="ta-table-wrap">
      <h2 className="ta-table-title">Per-Question Time Breakdown</h2>
      <p className="ta-table-sub muted">
        Questions listed in order (Q1 to Q75). Hover a row to see the question body.
      </p>
      <div className="ta-table-scroll">
        <table className="ta-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Subject</th>
              <th>Type</th>
              <th>Difficulty</th>
              <th>Result</th>
              <th>Time Spent</th>
              <th>Marks</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, i) => {
              let resultLabel, resultCls;
              if (q.is_correct) { resultLabel = 'Correct'; resultCls = 'ta-result--correct'; }
              else if (q.marks_awarded < 0) { resultLabel = 'Incorrect'; resultCls = 'ta-result--incorrect'; }
              else { resultLabel = 'Unattempted'; resultCls = 'ta-result--unattempted'; }

              const subjectColor = SUBJECT_COLORS[q.section] || '#475569';
              const diffColor = DIFFICULTY_COLORS[q.difficulty] || '#475569';

              return (
                <tr key={q.id} className="ta-table__row" title={q.body}>
                  <td className="ta-table__num">{questionNumber(q, i + 1)}</td>
                  <td>
                    <span className="ta-subject-pill" style={{ background: subjectColor + '18', color: subjectColor, border: `1px solid ${subjectColor}40` }}>
                      {q.section}
                    </span>
                  </td>
                  <td className="ta-table__type">{q.question_type === 'mcq' ? 'MCQ' : 'Numerical'}</td>
                  <td>
                    <span className="ta-diff-pill" style={{ color: diffColor }}>
                      {q.difficulty || 'easy'}
                    </span>
                  </td>
                  <td><span className={`ta-result-pill ${resultCls}`}>{resultLabel}</span></td>
                  <td className="ta-table__time"><strong>{formatDuration(q.time_spent_seconds)}</strong></td>
                  <td className={q.marks_awarded > 0 ? 'ta-marks--pos' : q.marks_awarded < 0 ? 'ta-marks--neg' : 'ta-marks--zero'}>
                    {q.marks_awarded > 0 ? '+' : ''}{q.marks_awarded}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main TimeAnalysis component
// ---------------------------------------------------------------------------
export default function TimeAnalysis({ result, onBack }) {
  const data = useMemo(() => {
    if (!result || !result.questions) return null;

    const bySubject = {};
    const byDifficulty = {};
    const byResult = { correct: 0, incorrect: 0, unattempted: 0 };
    const countBySubject = {};
    const countByDifficulty = {};
    const countByResult = { correct: 0, incorrect: 0, unattempted: 0 };

    let totalSeconds = 0;

    for (const q of result.questions) {
      const t = Number(q.time_spent_seconds) || 0;
      const subj = q.section || 'Unknown';
      const diff = (q.difficulty || 'easy').toLowerCase();

      // subject
      bySubject[subj] = (bySubject[subj] || 0) + t;
      countBySubject[subj] = (countBySubject[subj] || 0) + 1;

      // difficulty
      byDifficulty[diff] = (byDifficulty[diff] || 0) + t;
      countByDifficulty[diff] = (countByDifficulty[diff] || 0) + 1;

      // result
      let rKey;
      if (q.selected_option_id == null && q.numerical_answer == null) rKey = 'unattempted';
      else if (q.is_correct) rKey = 'correct';
      else rKey = 'incorrect';
      byResult[rKey] += t;
      countByResult[rKey] += 1;

      totalSeconds += t;
    }

    // Subject rows (fixed order)
    const subjectOrder = ['Physics', 'Chemistry', 'Mathematics'];
    const subjectRows = subjectOrder
      .filter((s) => bySubject[s] != null || countBySubject[s])
      .map((s) => ({
        label: s,
        seconds: bySubject[s] || 0,
        color: SUBJECT_COLORS[s] || '#475569',
        count: countBySubject[s] || 0,
        countLabel: 'questions',
      }));

    // Difficulty rows (easy -> moderate -> difficult)
    const diffOrder = ['easy', 'moderate', 'difficult'];
    const difficultyRows = diffOrder
      .filter((d) => byDifficulty[d] != null || countByDifficulty[d])
      .map((d) => ({
        label: d.charAt(0).toUpperCase() + d.slice(1),
        seconds: byDifficulty[d] || 0,
        color: DIFFICULTY_COLORS[d] || '#475569',
        count: countByDifficulty[d] || 0,
        countLabel: 'questions',
      }));

    // Result rows
    const resultRows = [
      { label: 'Correct', key: 'correct', color: RESULT_COLORS.correct },
      { label: 'Incorrect', key: 'incorrect', color: RESULT_COLORS.incorrect },
      { label: 'Unattempted', key: 'unattempted', color: RESULT_COLORS.unattempted },
    ].map(({ label, key, color }) => ({
      label,
      seconds: byResult[key] || 0,
      color,
      count: countByResult[key] || 0,
      countLabel: 'questions',
    }));

    // Slowest-question lookup (sorted by time spent desc)
    const questionsByTime = [...result.questions].sort(
      (a, b) => (Number(b.time_spent_seconds) || 0) - (Number(a.time_spent_seconds) || 0)
    );

    // Per-question table sorted by question number (Q1 -> QN)
    const questionsSorted = [...result.questions].sort(
              (a, b) => questionNumber(a, 0) - questionNumber(b, 0)
    );

    // Key insight metrics
    const avgPerQuestion = result.questions.length > 0
      ? Math.round(totalSeconds / result.questions.length) : 0;

    const slowestQ = questionsByTime[0] || null;
    const fastestAttemptedQ = [...result.questions]
      .filter((q) => q.selected_option_id != null || q.numerical_answer != null)
      .sort((a, b) => (Number(a.time_spent_seconds) || 0) - (Number(b.time_spent_seconds) || 0))[0] || null;

    // Most time-expensive subject per-question (by average)
    let mostTimeSubject = null, mostTimeAvg = 0;
    for (const [subj, secs] of Object.entries(bySubject)) {
      const cnt = countBySubject[subj] || 1;
      const avg = secs / cnt;
      if (avg > mostTimeAvg) { mostTimeAvg = avg; mostTimeSubject = subj; }
    }

    return {
      totalSeconds,
      avgPerQuestion,
      subjectRows,
      difficultyRows,
      resultRows,
      questionsSorted,
      slowestQ,
      fastestAttemptedQ,
      mostTimeSubject,
      mostTimeAvg,
    };
  }, [result]);

  if (!result || !data) {
    return (
      <div className="ta-page">
        <button className="btn-ghost ta-back-btn" onClick={onBack}>Back to Analysis</button>
        <p className="muted">No data available.</p>
      </div>
    );
  }

  const { totalSeconds, avgPerQuestion, subjectRows, difficultyRows, resultRows, questionsSorted,
          slowestQ, fastestAttemptedQ, mostTimeSubject, mostTimeAvg } = data;

  const totalCount = (result.overall && result.overall.total) || result.questions.length;

  const correctRow = resultRows.find(r => r.label === 'Correct');
  const incorrectRow = resultRows.find(r => r.label === 'Incorrect');
  const unattemptedRow = resultRows.find(r => r.label === 'Unattempted');

  return (
    <div className="ta-page">
      {/* Header */}
      <header className="ta-header">
        <button className="btn-ghost ta-back-btn" onClick={onBack}>
          &#8592; Back to Analysis
        </button>
        <div className="ta-header__center">
          <h1 className="ta-heading">Time Analysis</h1>
          <p className="ta-subheading muted">
            {result.title} &middot; {totalCount} questions &middot; Total time:{' '}
            <strong>{formatDuration(totalSeconds)}</strong>
          </p>
        </div>
      </header>

      {/* Key metrics strip */}
      <div className="ta-metrics">
        <div className="ta-metric-card">
          <span className="ta-metric-card__value">{formatDuration(totalSeconds)}</span>
          <span className="ta-metric-card__label">Total Time Used</span>
        </div>
        <div className="ta-metric-card">
          <span className="ta-metric-card__value">{formatDuration(avgPerQuestion)}</span>
          <span className="ta-metric-card__label">Avg per Question</span>
        </div>
        {slowestQ && (
          <div className="ta-metric-card ta-metric-card--warn">
            <span className="ta-metric-card__value">{formatDuration(slowestQ.time_spent_seconds)}</span>
            <span className="ta-metric-card__label">
              Slowest: {slowestQ.section} Q{questionNumber(slowestQ, '?')}
            </span>
          </div>
        )}
        {mostTimeSubject && (
          <div className="ta-metric-card">
            <span className="ta-metric-card__value" style={{ color: SUBJECT_COLORS[mostTimeSubject] || '#1b4f9c' }}>
              {mostTimeSubject}
            </span>
            <span className="ta-metric-card__label">
              Most time/question ({formatDuration(Math.round(mostTimeAvg))} avg)
            </span>
          </div>
        )}
      </div>

      {/* 3 pie breakdown cards */}
      <div className="ta-cards-grid">
        <PieCard
          title="By Subject"
          subtitle="Share of total time spent on each subject."
          rows={subjectRows}
          totalSeconds={totalSeconds}
        />
        <PieCard
          title="By Difficulty"
          subtitle="How your time splits across easy, moderate and difficult questions."
          rows={difficultyRows}
          totalSeconds={totalSeconds}
        />
        <PieCard
          title="By Result"
          subtitle="Time spent on correct, incorrect and unattempted questions."
          rows={resultRows}
          totalSeconds={totalSeconds}
        />
      </div>

      {/* Insight box */}
      <div className="ta-insight-box">
        <span className="ta-insight-box__heading">Insight</span>
        <div className="ta-insight-box__text">
          {unattemptedRow && unattemptedRow.seconds > 0 && (
            <span>
              You spent <strong>{formatDuration(unattemptedRow.seconds)}</strong> on questions you
              left unattempted ({pct(unattemptedRow.seconds, totalSeconds)}% of total time).{' '}
            </span>
          )}
          {correctRow && incorrectRow && (
            <span>
              Correct questions consumed{' '}
              <strong>{pct(correctRow.seconds, totalSeconds)}%</strong> of your time, incorrect
              ones took <strong>{pct(incorrectRow.seconds, totalSeconds)}%</strong>.{' '}
            </span>
          )}
          {fastestAttemptedQ && (
            <span>
              Your fastest attempted question was {fastestAttemptedQ.section} Q
              {questionNumber(fastestAttemptedQ, '?')} at just{' '}
              <strong>{formatDuration(fastestAttemptedQ.time_spent_seconds)}</strong>.
            </span>
          )}
        </div>
      </div>

      {/* Per-question table */}
      <QuestionTable questions={questionsSorted} />

      {/* Bottom back button */}
      <div className="ta-footer">
        <button className="btn-primary" onClick={onBack}>
          Back to Performance Analysis
        </button>
      </div>
    </div>
  );
}
