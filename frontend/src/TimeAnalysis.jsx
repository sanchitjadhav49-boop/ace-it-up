import { useEffect, useMemo, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// TimeAnalysis - the "Time" section of the Test Analysis workspace.
//
// Frame (matches the approved design):
//   * header     - gradient badge + title + meta line, Test Date card, tagline
//   * KPI row    - 4 cards (icon, figure, label, description, decorative spark)
//   * insight    - banner with "View Details" that jumps to the distribution card
//   * body       - left: paginated per-question table
//                  right: Time Distribution (3 donuts + legend + tip strip)
//
// Props:
//   result  - the /attempts/:id/result payload (has result.questions[])
//   onBack  - go back to the Analysis overview
//
// Every number on the page is derived from `result`; nothing is hard-coded.
// ---------------------------------------------------------------------------

const SUBJECT_COLORS = {
  Physics: '#3b82f6',
  Chemistry: '#a855f7',
  Mathematics: '#16a34a',
};

const DIFFICULTY_COLORS = {
  easy: '#16a34a',
  moderate: '#f59e0b',
  difficult: '#ef4444',
};

const RESULT_COLORS = {
  correct: '#16a34a',
  incorrect: '#ef4444',
  unattempted: '#94a3b8',
};

// The design lists six questions per page (75 questions -> 13 pages).
const PAGE_SIZE = 6;

const DIFFICULTY_ORDER = ['easy', 'moderate', 'difficult'];

// ---------------------------------------------------------------------------
// tiny inline icon set (self-contained so this screen has no extra imports)
// ---------------------------------------------------------------------------
const TX_ICON_PATHS = {
  bars: 'M4 20V11M10 20V4M16 20v-6M22 20H2',
  clock: 'M12 7.5V12l3 1.8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  warning: 'M10.3 3.9 2.6 17.6A2 2 0 0 0 4.3 20.6h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0ZM12 9v4.5M12 17h.01',
  sigma: 'M17.5 4H6.5l6 8-6 8h11',
  bulb: 'M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3Z',
  calendar: 'M7.5 3v3M16.5 3v3M3.5 9.5h17M5.5 5h13a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  list: 'M8.5 6H20M8.5 12H20M8.5 18H20M4 6h.01M4 12h.01M4 18h.01',
  arrowRight: 'M4.5 12h15M13.5 6l6 6-6 6',
  chevronLeft: 'm14.5 6-6 6 6 6',
  chevronRight: 'm9.5 6 6 6-6 6',
  check: 'm5 13 4.5 4.5L19 7',
  info: 'M12 16.5V11M12 7.8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
};

function TxIcon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={TX_ICON_PATHS[name] || TX_ICON_PATHS.info} />
    </svg>
  );
}

// Decorative sparkline drawn in the corner of every KPI card.
function TxSpark({ variant = 'line', color = '#60a5fa', points, values }) {
  if (variant === 'bars') {
    const bars = values || [6, 10, 14, 19, 22];
    return (
      <svg className="tx-spark" viewBox="0 0 56 26" width="56" height="26" aria-hidden="true" focusable="false">
        {bars.map((v, i) => (
          <rect
            key={i}
            x={5 + i * 10}
            y={25 - v}
            width="6"
            height={v}
            rx="1.8"
            fill={color}
            opacity={0.45 + i * 0.13}
          />
        ))}
      </svg>
    );
  }
  return (
    <svg className="tx-spark" viewBox="0 0 56 26" width="56" height="26" aria-hidden="true" focusable="false">
      <polyline
        points={points || '3,21 15,15 27,18 39,9 51,12'}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// formatting helpers
// ---------------------------------------------------------------------------
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

function formatDate(value) {
  if (!value) return '\u2014';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '\u2014';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function titleCase(word) {
  return String(word || '').charAt(0).toUpperCase() + String(word || '').slice(1).toLowerCase();
}

// Page numbers for the pager: 1..5 ... N with a window that follows the
// current page once you move towards the end of the paper.
function pageItems(current, count) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const items = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i += 1) items.push(i);
    items.push('gap');
    items.push(count);
  } else if (current >= count - 3) {
    items.push(1);
    items.push('gap');
    for (let i = count - 4; i <= count; i += 1) items.push(i);
  } else {
    items.push(1);
    items.push('gap');
    for (let i = current - 1; i <= current + 1; i += 1) items.push(i);
    items.push('gap');
    items.push(count);
  }
  return items;
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
// PieChart: interactive SVG donut with a centre readout.
//   rows         - [{ label, seconds, color, count, countLabel }]
//   totalSeconds - sum of all seconds (shares + centre readout)
//   size/radius/stroke/compact - geometry overrides for the 3-up layout
// ---------------------------------------------------------------------------
function PieChart({ rows, totalSeconds, size = 210, radius = 74, stroke = 30, compact = false }) {
  const [hovered, setHovered] = useState(null);

  const cx = size / 2;
  const cy = size / 2;
  const r = radius;
  const rHover = radius + 6;
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
    <div className={`ta-pie${compact ? ' ta-pie--compact' : ''}`}>
      <svg
        className="ta-pie__svg"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Time distribution donut chart"
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
          const hoverRadius = isHovered ? rHover : r;
          const d = arcPath(cx, cy, hoverRadius, start, end);
          return (
            <path
              key={row.label}
              d={d}
              fill="none"
              stroke={row.color}
              strokeWidth={isHovered ? stroke + 5 : stroke}
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

        {/* centre readout */}
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
          y={cy + (compact ? 14 : 20)}
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
// Donut + legend + caption column inside the Time Distribution card.
// ---------------------------------------------------------------------------
function DistributionBlock({ caption, rows, totalSeconds }) {
  return (
    <div className="tx-donut">
      <PieChart
        rows={rows}
        totalSeconds={totalSeconds}
        size={152}
        radius={54}
        stroke={19}
        compact
      />
      <ul className="tx-legend">
        {rows.map(({ label, seconds, color, count, countLabel }) => (
          <li key={label} className="tx-legend__row">
            <span className="tx-legend__dot" style={{ background: color }} />
            <span className="tx-legend__label">{label}</span>
            <span className="tx-legend__stats">
              <span className="tx-legend__pct">{pct(seconds, totalSeconds)}%</span>
              <span className="tx-legend__count" title={`${count} ${countLabel}`}>{count}</span>
              <span className="tx-legend__time">{formatDuration(seconds)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="tx-donut__caption">{caption}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main TimeAnalysis component
// ---------------------------------------------------------------------------
export default function TimeAnalysis({ result, onBack }) {
  const [page, setPage] = useState(1);
  const [tipOpen, setTipOpen] = useState(false);
  const [distFlash, setDistFlash] = useState(false);

  const distRef = useRef(null);
  const flashTimer = useRef(null);

  useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
  }, []);

  // A fresh attempt always starts on page 1.
  useEffect(() => { setPage(1); }, [result]);

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
    const knownSubjects = Object.keys(bySubject).filter((s) => !subjectOrder.includes(s));
    const subjectRows = [...subjectOrder, ...knownSubjects]
      .filter((s) => bySubject[s] != null || countBySubject[s])
      .map((s) => ({
        label: s,
        seconds: bySubject[s] || 0,
        color: SUBJECT_COLORS[s] || '#94a3b8',
        count: countBySubject[s] || 0,
        countLabel: 'questions',
      }));

    // Difficulty rows (easy -> moderate -> difficult, then anything unusual)
    const knownDiffs = Object.keys(byDifficulty).filter((d) => !DIFFICULTY_ORDER.includes(d));
    const difficultyRows = [...DIFFICULTY_ORDER, ...knownDiffs]
      .filter((d) => byDifficulty[d] != null || countByDifficulty[d])
      .map((d) => ({
        label: titleCase(d),
        seconds: byDifficulty[d] || 0,
        color: DIFFICULTY_COLORS[d] || '#94a3b8',
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
      ? totalSeconds / result.questions.length : 0;

    const slowestQ = questionsByTime[0] || null;
    const fastestAttemptedQ = [...result.questions]
      .filter((q) => q.selected_option_id != null || q.numerical_answer != null)
      .sort((a, b) => (Number(a.time_spent_seconds) || 0) - (Number(b.time_spent_seconds) || 0))[0] || null;

    // Most time-expensive subject per question (by average)
    let mostTimeSubject = null, mostTimeAvg = 0;
    for (const [subj, secs] of Object.entries(bySubject)) {
      const cnt = countBySubject[subj] || 1;
      const avg = secs / cnt;
      if (avg > mostTimeAvg) { mostTimeAvg = avg; mostTimeSubject = subj; }
    }

    // Difficulty mix of the paper (drives the "Difficulty:" breadcrumb item).
    let dominantDifficulty = null, dominantCount = 0;
    for (const d of DIFFICULTY_ORDER) {
      const c = countByDifficulty[d] || 0;
      if (c > dominantCount) { dominantCount = c; dominantDifficulty = d; }
    }

    // Attempted-question pace, used by the tip strip.
    const attemptedList = result.questions.filter(
      (q) => q.selected_option_id != null || q.numerical_answer != null
    );
    const attemptedTime = attemptedList.reduce(
      (sum, q) => sum + (Number(q.time_spent_seconds) || 0), 0
    );
    const avgAttemptedTime = attemptedList.length > 0 ? attemptedTime / attemptedList.length : 0;

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
      dominantDifficulty,
      attemptedCount: attemptedList.length,
      avgAttemptedTime,
    };
  }, [result]);

  if (!result || !data) {
    return (
      <div className="ta-page tx-page">
        <button className="btn-ghost ta-back-btn" onClick={onBack}>Back to Analysis</button>
        <p className="muted">No data available.</p>
      </div>
    );
  }

  const {
    totalSeconds, avgPerQuestion, subjectRows, difficultyRows, resultRows, questionsSorted,
    slowestQ, fastestAttemptedQ, mostTimeSubject, mostTimeAvg, dominantDifficulty,
    attemptedCount, avgAttemptedTime,
  } = data;

  const totalCount = (result.overall && result.overall.total) || result.questions.length;
  const difficultyLabel = dominantDifficulty ? titleCase(dominantDifficulty) : 'Mixed';

  const correctRow = resultRows.find((r) => r.label === 'Correct');
  const incorrectRow = resultRows.find((r) => r.label === 'Incorrect');
  const unattemptedRow = resultRows.find((r) => r.label === 'Unattempted');

  // ---- KPI cards ---------------------------------------------------------
  const kpis = [
    {
      key: 'total',
      icon: 'clock',
      tone: 'blue',
      value: formatDuration(totalSeconds),
      label: 'Total Time Used',
      desc: 'Time spent on all questions of this mock test.',
      spark: <TxSpark variant="line" color="#60a5fa" points="3,21 15,14 27,18 39,8 51,11" />,
    },
    {
      key: 'avg',
      icon: 'bars',
      tone: 'purple',
      value: formatDuration(avgPerQuestion),
      label: 'Avg per Question',
      desc: 'Average time taken per question.',
      spark: <TxSpark variant="line" color="#c084fc" points="3,22 15,18 27,10 39,15 51,6" />,
    },
    slowestQ ? {
      key: 'slowest',
      icon: 'warning',
      tone: 'amber',
      warn: true,
      value: formatDuration(slowestQ.time_spent_seconds),
      label: `Slowest: ${slowestQ.section || 'Unknown'} Q${questionNumber(slowestQ, '?')}`,
      desc: 'Took the most time on this question.',
      spark: <TxSpark variant="bars" color="#f59e0b" values={[6, 10, 14, 19, 23]} />,
    } : null,
    mostTimeSubject ? {
      key: 'subject',
      icon: 'sigma',
      tone: 'green',
      value: mostTimeSubject,
      valueColor: SUBJECT_COLORS[mostTimeSubject],
      label: `Most Time/Question (${formatDuration(Math.round(mostTimeAvg))} avg)`,
      desc: `You spent the most time on ${mostTimeSubject} section.`,
      spark: <TxSpark variant="line" color="#34d399" points="3,20 15,22 27,12 39,17 51,6" />,
    } : null,
  ].filter(Boolean);

  // ---- pagination --------------------------------------------------------
  const pageCount = Math.max(1, Math.ceil(questionsSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = questionsSorted.slice(pageStart, pageStart + PAGE_SIZE);
  const pagerItems = pageItems(safePage, pageCount);

  // ---- insight + tips ---------------------------------------------------
  const fastQ = fastestAttemptedQ;
  const tipSubject = mostTimeSubject || (slowestQ && slowestQ.section) || 'your weakest section';

  const tipText = unattemptedRow && unattemptedRow.count > 0
    ? `Focus on ${tipSubject} first, manage time better, and reduce unattempted questions to improve your score.`
    : `Focus on ${tipSubject} first, manage your time better and keep this attempt rate up to protect your score.`;

  const extraTips = [];
  if (unattemptedRow && unattemptedRow.seconds > 0) {
    extraTips.push(
      `Unattempted questions consumed ${formatDuration(unattemptedRow.seconds)} `
      + `(${pct(unattemptedRow.seconds, totalSeconds)}% of your total time) - your biggest time leak.`
    );
  }
  if (slowestQ) {
    extraTips.push(
      `Your slowest question was ${slowestQ.section || 'Unknown'} Q${questionNumber(slowestQ, '?')} at `
      + `${formatDuration(slowestQ.time_spent_seconds)} `
      + `(${pct(slowestQ.time_spent_seconds, totalSeconds)}% of the whole test).`
    );
  }
  if (attemptedCount > 0) {
    extraTips.push(
      `You averaged ${formatDuration(Math.round(avgAttemptedTime))} on the ${attemptedCount} questions `
      + `you attempted, against ${formatDuration(Math.round(avgPerQuestion))} across the full paper.`
    );
  }
  if (fastQ) {
    extraTips.push(
      `${fastQ.section || 'Unknown'} Q${questionNumber(fastQ, '?')} was your fastest attempt at `
      + `${formatDuration(fastQ.time_spent_seconds)} - a pace worth repeating on easy questions.`
    );
  }

  function jumpToDistribution() {
    const el = distRef.current;
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setDistFlash(true);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setDistFlash(false), 1500);
  }

  return (
    <div className="ta-page tx-page">
      {/* standalone back link - hidden while this panel is embedded in the shell */}
      <button className="btn-ghost ta-back-btn" onClick={onBack}>
        &#8592; Back to Analysis
      </button>

      {/* ---------------- header ---------------- */}
      <header className="tx-head">
        <div className="tx-head__left">
          <span className="tx-head__badge"><TxIcon name="bars" /></span>
          <div className="tx-head__copy">
            <h1 className="tx-head__title">Time Analysis</h1>
            <p className="tx-head__meta">
              <span className="tx-head__exam">{result.title}</span>
              <span className="tx-dot" aria-hidden="true" />
              <span>Difficulty: <strong>{difficultyLabel}</strong></span>
              <span className="tx-dot" aria-hidden="true" />
              <span>Total questions: <strong>{totalCount}</strong></span>
              <span className="tx-dot" aria-hidden="true" />
              <span>Total time: <strong>{formatDuration(totalSeconds)}</strong></span>
            </p>
          </div>
        </div>

        <div className="tx-head__right">
          <div className="tx-date">
            <span className="tx-date__icon"><TxIcon name="calendar" /></span>
            <span className="tx-date__body">
              <span className="tx-date__label">Test Date</span>
              <span className="tx-date__value">{formatDate(result.submitted_at)}</span>
            </span>
          </div>

          <div className="tx-tagline" aria-hidden="true">
            <span className="tx-tagline__line">Better <em>analysis</em></span>
            <span className="tx-tagline__line"><i>=</i> Better <em>performance</em></span>
            <svg className="tx-tagline__swoosh" viewBox="0 0 150 12" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="txSwooshGrad" x1="0" y1="0" x2="150" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#818cf8" />
                  <stop offset="1" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <path
                d="M3 9 C 42 2 104 1 147 6"
                fill="none"
                stroke="url(#txSwooshGrad)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </header>

      {/* ---------------- KPI row ---------------- */}
      <div className="tx-kpis">
        {kpis.map((kpi) => (
          <article key={kpi.key} className={`tx-kpi${kpi.warn ? ' tx-kpi--warn' : ''}`}>
            <div className="tx-kpi__top">
              <span className={`tx-kpi__icon tx-kpi__icon--${kpi.tone}`}>
                <TxIcon name={kpi.icon} />
              </span>
              <div className="tx-kpi__fig">
                <span className="tx-kpi__value" style={kpi.valueColor ? { color: kpi.valueColor } : undefined}>
                  {kpi.value}
                </span>
                <span className="tx-kpi__label">{kpi.label}</span>
              </div>
              {kpi.spark}
            </div>
            <p className="tx-kpi__desc">{kpi.desc}</p>
          </article>
        ))}
      </div>

      {/* ---------------- insight banner ---------------- */}
      <section className="tx-insight">
        <span className="tx-insight__icon"><TxIcon name="bulb" /></span>
        <div className="tx-insight__body">
          <span className="tx-insight__title">Insight</span>
          <p className="tx-insight__text">
            {unattemptedRow && (
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
            {fastQ && (
              <span>
                Your fastest attempted question was {fastQ.section || 'Unknown'} Q
                {questionNumber(fastQ, '?')} at just{' '}
                <strong>{formatDuration(fastQ.time_spent_seconds)}</strong>.
              </span>
            )}
          </p>
        </div>
        <button className="tx-insight__btn" onClick={jumpToDistribution}>
          View Details
          <TxIcon name="arrowRight" />
        </button>
      </section>

      {/* ---------------- table + distribution ---------------- */}
      <div className="tx-grid">
        <section className="tx-panel tx-panel--table">
          <header className="tx-panel__head">
            <span className="tx-panel__icon"><TxIcon name="list" /></span>
            <div>
              <h2 className="tx-panel__title">Per-Question Time Breakdown</h2>
              <p className="tx-panel__sub">
                Questions listed in order (Q1 to Q{totalCount}). Hover a row to see more details.
              </p>
            </div>
          </header>

          <div className="ta-table-scroll tx-table-scroll">
            <table className="ta-table tx-table">
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
                {pageRows.map((q) => {
                  let resultLabel, resultCls;
                  if (q.is_correct) { resultLabel = 'Correct'; resultCls = 'ta-result--correct'; }
                  else if (q.marks_awarded < 0) { resultLabel = 'Incorrect'; resultCls = 'ta-result--incorrect'; }
                  else { resultLabel = 'Unattempted'; resultCls = 'ta-result--unattempted'; }

                  const subjectColor = SUBJECT_COLORS[q.section] || '#64748b';
                  const diffColor = DIFFICULTY_COLORS[(q.difficulty || 'easy').toLowerCase()] || '#64748b';

                  return (
                    <tr key={q.id} className="ta-table__row" title={q.body}>
                      <td className="ta-table__num">{questionNumber(q, '?')}</td>
                      <td>
                        <span
                          className="ta-subject-pill"
                          style={{
                            background: `${subjectColor}22`,
                            color: subjectColor,
                            border: `1px solid ${subjectColor}55`,
                          }}
                        >
                          {q.section}
                        </span>
                      </td>
                      <td className="ta-table__type">{q.question_type === 'mcq' ? 'MCQ' : 'Numerical'}</td>
                      <td>
                        <span className="ta-diff-pill" style={{ color: diffColor }}>
                          {titleCase(q.difficulty || 'easy')}
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
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="tx-table__empty">No questions in this attempt.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="tx-pager">
            <div className="tx-pager__pages">
              <button
                type="button"
                className="tx-pager__btn tx-pager__btn--arrow"
                onClick={() => setPage(Math.max(1, safePage - 1))}
                disabled={safePage <= 1}
                aria-label="Previous page of questions"
              >
                <TxIcon name="chevronLeft" />
              </button>

              {pagerItems.map((item, i) => (
                item === 'gap' ? (
                  <span key={`gap-${i}`} className="tx-pager__gap">&hellip;</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={`tx-pager__btn${item === safePage ? ' tx-pager__btn--active' : ''}`}
                    onClick={() => setPage(item)}
                    aria-current={item === safePage ? 'page' : undefined}
                    aria-label={`Page ${item}`}
                  >
                    {item}
                  </button>
                )
              ))}

              <button
                type="button"
                className="tx-pager__btn tx-pager__btn--arrow"
                onClick={() => setPage(Math.min(pageCount, safePage + 1))}
                disabled={safePage >= pageCount}
                aria-label="Next page of questions"
              >
                <TxIcon name="chevronRight" />
              </button>
            </div>

            <span className="tx-pager__info">
              Showing {questionsSorted.length === 0 ? 0 : pageStart + 1} - {pageStart + pageRows.length} of{' '}
              {questionsSorted.length}
            </span>
          </footer>
        </section>

        <section
          className={`tx-panel tx-panel--dist${distFlash ? ' tx-panel--flash' : ''}`}
          ref={distRef}
        >
          <header className="tx-panel__head">
            <span className="tx-panel__icon"><TxIcon name="clock" /></span>
            <div>
              <h2 className="tx-panel__title">Time Distribution</h2>
              <p className="tx-panel__sub">How your time was spent across sections and question types.</p>
            </div>
          </header>

          <div className="tx-donuts">
            <DistributionBlock
              caption="Time distribution by subject"
              rows={subjectRows}
              totalSeconds={totalSeconds}
            />
            <DistributionBlock
              caption="Time distribution by difficulty"
              rows={difficultyRows}
              totalSeconds={totalSeconds}
            />
            <DistributionBlock
              caption="Time distribution by result"
              rows={resultRows}
              totalSeconds={totalSeconds}
            />
          </div>

          <div className="tx-tip">
            <span className="tx-tip__icon"><TxIcon name="bulb" /></span>
            <div className="tx-tip__body">
              <p className="tx-tip__text"><strong>Tip:</strong> {tipText}</p>
              {tipOpen && extraTips.length > 0 && (
                <ul className="tx-tip__list">
                  {extraTips.map((tip) => <li key={tip}>{tip}</li>)}
                </ul>
              )}
            </div>
            <button
              type="button"
              className="tx-tip__toggle"
              onClick={() => setTipOpen((v) => !v)}
              aria-expanded={tipOpen}
              aria-label={tipOpen ? 'Hide extra time tips' : 'Show extra time tips'}
            >
              <TxIcon name="chevronRight" />
            </button>
          </div>
        </section>
      </div>

      {/* footer back button - hidden while embedded in the analysis shell */}
      <div className="ta-footer">
        <button className="btn-primary" onClick={onBack}>
          Back to Performance Analysis
        </button>
      </div>
    </div>
  );
}
