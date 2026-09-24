import { useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// TopicAnalysis  (chapter / sub-chapter performance)
//
// Answers the question "which topic and which subtopic did I get wrong?".
// Every question in the attempt carries a topic (JEE chapter) and a subtopic
// (sub-chapter inside it) - see topics/ and tag_topics.js in the backend repo.
//
// Layout:
//   * Scope tabs        Overall / Physics / Chemistry / Mathematics
//   * Summary strip     topics covered, accuracy, marks lost, weakest topic
//   * Topic cards       one card per chapter, weakest first. Each card shows a
//                       correct / incorrect / skipped stacked bar, accuracy,
//                       marks earned-lost-forgone, time spent, and an
//                       expandable list of its subtopics.
//   * Subtopic rows     per sub-chapter counts, accuracy bar and the actual
//                       question numbers you got right / wrong / skipped.
//   * Takeaways         what to revise this week.
// ---------------------------------------------------------------------------

const RESULTS = [
  { key: 'correct', label: 'Correct', color: '#16a34a' },
  { key: 'incorrect', label: 'Incorrect', color: '#dc2626' },
  { key: 'skipped', label: 'Skipped', color: '#94a3b8' },
];

const SCOPE_TABS = ['Overall', 'Physics', 'Chemistry', 'Mathematics'];

const FALLBACK_TOPIC = 'Unclassified';
const FALLBACK_SUBTOPIC = 'General';

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

function subjectOf(q) {
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

function accuracyOf(row) {
  const attempted = row.correct + row.incorrect;
  if (attempted === 0) return null;
  return row.correct / attempted;
}

function accClass(row) {
  const acc = accuracyOf(row);
  if (acc === null) return 'tp-acc--none';
  if (acc >= 0.85) return 'tp-acc--good';
  if (acc >= 0.6) return 'tp-acc--warn';
  return 'tp-acc--bad';
}

function accText(row) {
  const acc = accuracyOf(row);
  if (acc === null) return 'not attempted';
  return `${Math.round(acc * 100)}% accuracy`;
}

function wasAttempted(q) {
  return (
    q.selected_option_id != null ||
    q.numerical_answer != null ||
    q.answer_id != null ||
    q.selected_option != null ||
    String(q.status || '').toLowerCase() === 'answered'
  );
}

function stateOf(q) {
  if (q.is_correct === true) return 'correct';
  return wasAttempted(q) ? 'incorrect' : 'skipped';
}

function topicLabel(q) {
  return String(q.topic || FALLBACK_TOPIC) || FALLBACK_TOPIC;
}

function subtopicLabel(q) {
  return String(q.subtopic || FALLBACK_SUBTOPIC) || FALLBACK_SUBTOPIC;
}

function emptyBucket(name) {
  return {
    name,
    total: 0,
    correct: 0,
    incorrect: 0,
    skipped: 0,
    marksNet: 0,
    marksLost: 0,
    marksForgone: 0,
    seconds: 0,
    questions: [],
  };
}

function addQuestion(bucket, q, state) {
  bucket.total += 1;
  bucket[state] += 1;
  bucket.seconds += Number(q.time_spent_seconds) || 0;
  const marks = Number(q.marks_awarded) || 0;
  bucket.marksNet += marks;
  if (state === 'incorrect') bucket.marksLost += Math.abs(marks) || Number(q.negative_marks) || 0;
  if (state === 'skipped') bucket.marksForgone += Number(q.positive_marks) || 0;
  bucket.questions.push({ q, state });
  return bucket;
}

function finalise(bucket) {
  const attempted = bucket.correct + bucket.incorrect;
  return {
    ...bucket,
    attempted,
    accuracy: attempted > 0 ? bucket.correct / attempted : null,
    avgPerQ: bucket.total ? Math.round(bucket.seconds / bucket.total) : 0,
    // Weakness drives the sort order: paid negative marks plus half the marks
    // left on the table by skipping.
    weakness: bucket.marksLost + 0.5 * bucket.marksForgone,
  };
}

function buildTopicRows(questions) {
  const topics = new Map();

  for (const q of questions) {
    const topicName = topicLabel(q);
    const subtopicName = subtopicLabel(q);
    const state = stateOf(q);

    if (!topics.has(topicName)) {
      const topic = emptyBucket(topicName);
      topic.subject = subjectOf(q);
      topic.subtopics = new Map();
      topics.set(topicName, topic);
    }
    const topic = topics.get(topicName);
    addQuestion(topic, q, state);

    if (!topic.subtopics.has(subtopicName)) {
      topic.subtopics.set(subtopicName, emptyBucket(subtopicName));
    }
    addQuestion(topic.subtopics.get(subtopicName), q, state);
  }

  const rows = [...topics.values()].map((topic) => ({
    ...finalise(topic),
    subject: topic.subject,
    subtopics: [...topic.subtopics.values()]
      .map(finalise)
      .sort((a, b) => b.weakness - a.weakness || a.name.localeCompare(b.name)),
  }));

  rows.sort(
    (a, b) =>
      b.weakness - a.weakness ||
      (a.accuracy === null ? 1 : a.accuracy) - (b.accuracy === null ? 1 : b.accuracy) ||
      b.total - a.total ||
      a.name.localeCompare(b.name)
  );

  return rows;
}

function summarise(questions, rows) {
  const total = questions.length;
  const attempted = questions.filter((q) => wasAttempted(q)).length;
  const correct = questions.filter((q) => q.is_correct === true).length;
  const incorrect = questions.filter((q) => stateOf(q) === 'incorrect').length;
  const skipped = questions.filter((q) => stateOf(q) === 'skipped').length;

  const marksLost = rows.reduce((sum, r) => sum + r.marksLost, 0);
  const marksForgone = rows.reduce((sum, r) => sum + r.marksForgone, 0);
  const marksNet = rows.reduce((sum, r) => sum + r.marksNet, 0);

  const weakRows = rows.filter((r) => r.incorrect + r.skipped > 0);
  const cleanRows = rows.filter((r) => r.incorrect + r.skipped === 0 && r.total > 0);

  const allSubtopics = rows.flatMap((r) => r.subtopics.map((s) => ({ ...s, topic: r.name })));

  return {
    total,
    attempted,
    correct,
    incorrect,
    skipped,
    accuracy: attempted > 0 ? correct / attempted : null,
    marksLost,
    marksForgone,
    marksNet,
    topicCount: rows.length,
    weakCount: weakRows.length,
    cleanCount: cleanRows.length,
    weakestTopic: weakRows[0] || null,
    strongestTopic: cleanRows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))[0] || null,
    weakestSubtopic:
      allSubtopics
        .filter((s) => s.incorrect + s.skipped > 0)
        .sort((a, b) => b.weakness - a.weakness || a.name.localeCompare(b.name))[0] || null,
  };
}

function buildTakeaways(rows, stats) {
  const items = [];

  if (stats.weakestTopic) {
    const t = stats.weakestTopic;
    const badSubs = t.subtopics
      .filter((s) => s.incorrect + s.skipped > 0)
      .slice(0, 3)
      .map((s) => s.name);
    items.push(
      <li key="t1">
        Weakest chapter: <strong>{t.name}</strong> ({t.subject}) - you got{' '}
        <strong>{t.correct} of {t.attempted || t.total}</strong> attempted right ({accText(t)}) and
        paid <strong>{t.marksLost}</strong> negative marks
        {badSubs.length > 0 && (
          <>
            . Revise: <strong>{badSubs.join(', ')}</strong>
          </>
        )}
        .
      </li>
    );
  } else {
    items.push(
      <li key="t1">
        No chapter cost you marks in this attempt - every attempted question was right. Push the
        level of difficulty up in the next mock.
      </li>
    );
  }

  if (stats.weakestSubtopic) {
    const s = stats.weakestSubtopic;
    items.push(
      <li key="t2">
        Weakest subtopic: <strong>{s.name}</strong> (under {s.topic}) - {s.correct} correct,{' '}
        {s.incorrect} wrong, {s.skipped} skipped across {s.total} question
        {s.total === 1 ? '' : 's'}.
      </li>
    );
  }

  if (stats.skipped > 0) {
    const worst = rows
      .filter((r) => r.skipped > 0)
      .sort((a, b) => b.skipped - a.skipped)[0];
    items.push(
      <li key="t3">
        You left <strong>{stats.skipped}</strong> question{stats.skipped === 1 ? '' : 's'} blank
        (about <strong>{Math.round(stats.marksForgone)} marks</strong> untouched), most of them in{' '}
        <strong>{worst ? worst.name : 'this paper'}</strong>. Skipped questions score zero, so an
        honest attempt is free upside.
      </li>
    );
  }

  if (stats.strongestTopic) {
    const t = stats.strongestTopic;
    items.push(
      <li key="t4">
        Strongest chapter: <strong>{t.name}</strong> - {t.correct} of {t.total} correct with no
        mistakes. Keep revising it lightly, but spend your hours where you lost marks.
      </li>
    );
  }

  const slowest = [...rows].sort((a, b) => b.avgPerQ - a.avgPerQ)[0];
  if (slowest && slowest.avgPerQ > 0) {
    items.push(
      <li key="t5">
        Most time-hungry chapter: <strong>{slowest.name}</strong> - {formatDuration(slowest.seconds)}{' '}
        spent, averaging <strong>{formatDuration(slowest.avgPerQ)}</strong> per question. If it is
        also weak, that combination is the biggest score leak.
      </li>
    );
  }

  return items;
}

// ---------------------------------------------------------------------------
// components
// ---------------------------------------------------------------------------

function ResultBar({ row }) {
  const segs = RESULTS.filter((r) => row[r.key] > 0);
  if (!segs.length) return null;
  return (
    <div className="tp-bar" role="img" aria-label={`${row.name}: correct vs incorrect vs skipped`}>
      {segs.map((r) => {
        const count = row[r.key];
        return (
          <div
            key={r.key}
            className="tp-bar__seg"
            style={{ flexGrow: count, background: r.color, minWidth: 6 }}
            title={`${r.label}: ${count} (${pct(count, row.total)}%)`}
          />
        );
      })}
    </div>
  );
}

function QuestionChips({ entries, onJump }) {
  const short = (q) => `Q${q.global_position != null ? q.global_position : q.position}`;
  const label = (entry) => {
    const body = String(entry.q.body || '').replace(/\s+/g, ' ').slice(0, 110);
    return `${entry.state.toUpperCase()} - ${short(entry.q)} (${entry.q.section}): ${body}`;
  };
  return (
    <div className="tp-chips">
      {entries.map((entry) => (
        <button
          type="button"
          key={`${entry.q.id}-${entry.state}`}
          className={`tp-chip tp-chip--${entry.state}`}
          title={label(entry)}
          onClick={() => onJump && onJump(entry.q)}
        >
          {short(entry.q)}
        </button>
      ))}
    </div>
  );
}

function SubtopicRow({ sub, onJump }) {
  const [open, setOpen] = useState(false);
  const wrong = sub.questions.filter((e) => e.state !== 'correct');

  return (
    <div className={`tp-sub${wrong.length ? ' tp-sub--weak' : ''}`}>
      <button
        type="button"
        className="tp-sub__head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={`tp-sub__caret${open ? ' tp-sub__caret--open' : ''}`} aria-hidden="true">
          {'>'}
        </span>
        <span className="tp-sub__name">{sub.name}</span>
        <span className="tp-sub__bar">
          <ResultBar row={sub} />
        </span>
        <span className="tp-sub__counts">
          <span className="tp-sub__ok">{sub.correct}</span>
          {' / '}
          <span className="tp-sub__bad">{sub.incorrect}</span>
          {' / '}
          <span className="tp-sub__skip">{sub.skipped}</span>
        </span>
        <span className={`tp-sub__acc ${accClass(sub)}`}>{sub.accuracy === null ? '-' : `${Math.round(sub.accuracy * 100)}%`}</span>
      </button>

      {open && (
        <div className="tp-sub__detail">
          <div className="tp-sub__meta">
            {sub.total} question{sub.total === 1 ? '' : 's'} | {accText(sub)} | net{' '}
            <strong>{sub.marksNet}</strong> marks | -{sub.marksLost} lost
            {sub.marksForgone > 0 && <> | {sub.marksForgone} unclaimed</>} |{' '}
            {formatDuration(sub.seconds)} spent
          </div>
          <QuestionChips entries={sub.questions} onJump={onJump} />
          <div className="tp-sub__legend">
            Correct / Incorrect / Skipped - click a question number to jump to it in the review.
          </div>
        </div>
      )}
    </div>
  );
}

function TopicCard({ topic, defaultOpen, onJump }) {
  const [open, setOpen] = useState(defaultOpen);
  const wrong = topic.questions.filter((e) => e.state !== 'correct');

  return (
    <div className="tp-card">
      <div className="tp-card__head">
        <div className="tp-card__title-wrap">
          <h3 className="tp-card__title">{topic.name}</h3>
          <span className="tp-card__subject">{topic.subject}</span>
          <span className={`tp-card__acc ${accClass(topic)}`}>{accText(topic)}</span>
        </div>
        <div className="tp-card__numbers">
          <span className="tp-card__qcount">
            {topic.total} question{topic.total === 1 ? '' : 's'}
          </span>
          <span className="tp-card__marks">
            net <strong>{topic.marksNet}</strong> marks
          </span>
        </div>
      </div>

      <ResultBar row={topic} />

      <div className="tp-stats">
        {RESULTS.map((r) => (
          <div className="tp-stat" key={r.key}>
            <span className="tp-stat__swatch" style={{ background: r.color }} />
            <div>
              <div className="tp-stat__value" style={{ color: topic[r.key] > 0 ? r.color : '#9aa3af' }}>
                {topic[r.key]}
                <span className="tp-stat__pct">{pct(topic[r.key], topic.total)}%</span>
              </div>
              <div className="tp-stat__label">{r.label}</div>
            </div>
          </div>
        ))}
        <div className="tp-stat">
          <span className="tp-stat__swatch" style={{ background: '#6366f1' }} />
          <div>
            <div className="tp-stat__value" style={{ color: '#4338ca' }}>
              {formatDuration(topic.seconds)}
            </div>
            <div className="tp-stat__label">Time (avg {formatDuration(topic.avgPerQ)})</div>
          </div>
        </div>
      </div>

      {topic.incorrect + topic.skipped > 0 && (
        <div className="tp-card__loss">
          This chapter cost you <strong>{topic.marksLost}</strong> marks in wrong answers
          {topic.marksForgone > 0 && <> and left <strong>{topic.marksForgone}</strong> marks blank</>}.
        </div>
      )}

      <button type="button" className="tp-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide' : 'Show'} {topic.subtopics.length} subtopic
        {topic.subtopics.length === 1 ? '' : 's'}
        {wrong.length > 0 && !open ? ` (${wrong.length} question${wrong.length === 1 ? '' : 's'} to review)` : ''}
      </button>

      {open && (
        <div className="tp-sub-list">
          {topic.subtopics.map((sub) => (
            <SubtopicRow key={sub.name} sub={sub} onJump={onJump} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

export default function TopicAnalysis({ result, onBack, onJumpToQuestion }) {
  const [scope, setScope] = useState('Overall');
  const [onlyWeak, setOnlyWeak] = useState(false);

  const data = useMemo(() => {
    if (!result || !Array.isArray(result.questions) || result.questions.length === 0) return null;

    const byScope = { Overall: [], Physics: [], Chemistry: [], Mathematics: [], Other: [] };
    for (const q of result.questions) {
      byScope.Overall.push(q);
      byScope[subjectOf(q)].push(q);
    }

    const scopes = {};
    for (const key of SCOPE_TABS) {
      const rows = buildTopicRows(byScope[key]);
      scopes[key] = { rows, stats: summarise(byScope[key], rows) };
    }

    const tagged = result.questions.filter((q) => q.topic).length;

    return {
      scopes,
      counts: SCOPE_TABS.map((key) => ({ key, count: byScope[key].length })),
      title: result.title || '',
      tagged,
      totalQuestions: result.questions.length,
    };
  }, [result]);

  if (!data) {
    return (
      <div className="ta-page">
        <button className="btn-ghost ta-back-btn" onClick={onBack}>
          Back to Analysis
        </button>
        <p className="muted">No question data available for this attempt.</p>
      </div>
    );
  }

  const active = data.scopes[scope];
  const scopeEmpty = scope !== 'Overall' && active.stats.total === 0;
  const visibleRows = onlyWeak
    ? active.rows.filter((r) => r.incorrect + r.skipped > 0)
    : active.rows;

  const summaryCards = [
    {
      key: 'topics',
      label: 'Chapters covered',
      value: active.stats.topicCount,
      hint: `${active.stats.weakCount} need work | ${active.stats.cleanCount} clean`,
      tone: 'neutral',
    },
    {
      key: 'accuracy',
      label: 'Accuracy',
      value: active.stats.accuracy === null ? '-' : `${Math.round(active.stats.accuracy * 100)}%`,
      hint: `${active.stats.correct} correct of ${active.stats.attempted} attempted`,
      tone:
        active.stats.accuracy === null
          ? 'neutral'
          : active.stats.accuracy >= 0.85
          ? 'good'
          : active.stats.accuracy >= 0.6
          ? 'warn'
          : 'bad',
    },
    {
      key: 'lost',
      label: 'Marks lost to wrong answers',
      value: active.stats.marksLost,
      hint: `${active.stats.incorrect} incorrect question${active.stats.incorrect === 1 ? '' : 's'}`,
      tone: active.stats.marksLost > 0 ? 'bad' : 'good',
    },
    {
      key: 'blank',
      label: 'Marks left blank',
      value: active.stats.marksForgone,
      hint: `${active.stats.skipped} skipped question${active.stats.skipped === 1 ? '' : 's'}`,
      tone: active.stats.skipped > 0 ? 'warn' : 'good',
    },
  ];

  return (
    <div className="ta-page">
      <header className="ta-header">
        <button className="btn-ghost ta-back-btn" onClick={onBack}>
          &lt;- Back to Analysis
        </button>
        <div className="ta-header__center">
          <h1 className="ta-heading">Topic and Subtopic Analysis</h1>
          <p className="ta-subheading muted">
            {data.title} | {active.stats.total} questions | {active.stats.topicCount} chapters
            {scope !== 'Overall' && ` | ${scope}`}
          </p>
        </div>
      </header>

      <div className="da2-tabs" role="tablist" aria-label="Show topic analysis for">
        {data.counts.map(({ key, count }) => (
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

      {data.tagged === 0 && (
        <div className="tp-note">
          This attempt was taken before questions were tagged with topics, so every question falls
          into <strong>Unclassified</strong>. Take a fresh mock to see the chapter-wise breakdown.
        </div>
      )}

      {scopeEmpty ? (
        <div className="da2-empty">
          No {scope} questions in this attempt. Switch to Overall or another subject to see its
          chapter-wise breakdown.
        </div>
      ) : (
        <>
          <div className="tp-summary">
            {summaryCards.map((card) => (
              <div className={`tp-summary__card tp-summary__card--${card.tone}`} key={card.key}>
                <div className="tp-summary__label">{card.label}</div>
                <div className="tp-summary__value">{card.value}</div>
                <div className="tp-summary__hint">{card.hint}</div>
              </div>
            ))}
          </div>

          <div className="tp-toolbar">
            <div className="tp-filter" role="group" aria-label="Filter chapters">
              <button
                type="button"
                className={`tp-filter__btn${!onlyWeak ? ' tp-filter__btn--active' : ''}`}
                onClick={() => setOnlyWeak(false)}
              >
                All chapters ({active.rows.length})
              </button>
              <button
                type="button"
                className={`tp-filter__btn${onlyWeak ? ' tp-filter__btn--active' : ''}`}
                onClick={() => setOnlyWeak(true)}
              >
                Needs work ({active.stats.weakCount})
              </button>
            </div>
            <div className="tp-legend">
              {RESULTS.map((r) => (
                <span className="tp-legend__item" key={r.key}>
                  <span className="tp-legend__swatch" style={{ background: r.color }} />
                  {r.label}
                </span>
              ))}
            </div>
          </div>

          {visibleRows.length === 0 ? (
            <div className="da2-empty">
              Nothing to fix in this scope - every chapter you touched was answered correctly.
            </div>
          ) : (
            <div className="tp-cards">
              {visibleRows.map((topic, index) => (
                <TopicCard
                  key={topic.name}
                  topic={topic}
                  defaultOpen={index === 0}
                  onJump={onJumpToQuestion}
                />
              ))}
            </div>
          )}
        </>
      )}

      {!scopeEmpty && (
        <div className="ta-insight-box">
          <span className="ta-insight-box__heading">What to revise</span>
          <div className="ta-insight-box__text">
            <ul className="da2-takeaways">{buildTakeaways(active.rows, active.stats)}</ul>
          </div>
        </div>
      )}

      <div className="ta-footer">
        <button className="btn-primary" onClick={onBack}>
          Back to Performance Analysis
        </button>
      </div>
    </div>
  );
}
