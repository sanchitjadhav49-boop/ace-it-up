import { useEffect, useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// TimeIntervalAnalysis
// Props:
//   result  - result object from GET /attempts/:id/result (has attempt_id)
//   onBack  - go back to the Analysis page
// Divides the test into 30-minute intervals (0-30, 30-60, ...) and shows how
// many questions were attempted / correct / incorrect / unattempted in each.
// The bucket data comes from GET /api/attempts/:id/time-intervals.
// ---------------------------------------------------------------------------

function fetchIntervals(attemptId) {
  return fetch(`/api/attempts/${attemptId}/time-intervals`)
    .then(async (r) => {
      // Read as text first so empty / non-JSON responses (e.g. a proxy 500
      // with no body) never throw the raw "Unexpected end of JSON input".
      const text = await r.text();
      let j = null;
      if (text) {
        try { j = JSON.parse(text); } catch (e) { j = null; }
      }
      if (!r.ok) throw new Error((j && j.error) || `Request failed (${r.status})`);
      if (!j) throw new Error('The time-intervals API returned an empty response. Please try again.');
      if (j.error) throw new Error(j.error);
      return j;
    });
}

function accPct(attempted, correct) {
  if (!attempted) return 0;
  return Math.round((correct / attempted) * 100);
}

// Color-coded accuracy pill modifier: good >= 60%, mid >= 40%, low otherwise.
function accClass(attempted, correct) {
  if (!attempted) return ''; // neutral (no questions attempted in this block)
  const a = accPct(attempted, correct);
  if (a >= 60) return 'tia-acc--good';
  if (a >= 40) return 'tia-acc--mid';
  return 'tia-acc--low';
}

export default function TimeIntervalAnalysis({ result, onBack }) {
  const attemptId = result && result.attempt_id != null ? Number(result.attempt_id) : null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchIntervals(attemptId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e && e.message ? e.message : e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attemptId]);

  const totals = (data && data.totals) || null;
  const accuracy = useMemo(
    () => (totals ? accPct(totals.attempted, totals.correct) : 0),
    [totals]
  );

  const totalQuestions = (result && result.overall && result.overall.total)
    || (totals && totals.total)
    || 0;

  return (
    <div className="ta-page">
      <header className="ta-header">
        <button className="btn-ghost ta-back-btn" onClick={onBack}>
          &#8592; Back to Analysis
        </button>
        <div className="ta-header__center">
          <h1 className="ta-heading">Time Interval Analysis</h1>
          <p className="ta-subheading muted">
            How you performed in each {data ? data.interval_minutes : 30}-minute block of the test
            &middot; {totalQuestions} questions
          </p>
        </div>
      </header>

      {loading ? (
        <p className="muted">Loading time intervals...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : !totals ? (
        <p className="muted">No data available.</p>
      ) : (
        <>
          {/* Key metrics strip */}
          <div className="ta-metrics">
            <div className="ta-metric-card">
              <span className="ta-metric-card__value">{totals.attempted}</span>
              <span className="ta-metric-card__label">Attempted</span>
            </div>
            <div className="ta-metric-card">
              <span className="ta-metric-card__value tia-pos">{totals.correct}</span>
              <span className="ta-metric-card__label">Correct</span>
            </div>
            <div className="ta-metric-card">
              <span className="ta-metric-card__value tia-neg">{totals.incorrect}</span>
              <span className="ta-metric-card__label">Incorrect</span>
            </div>
            <div className="ta-metric-card">
              <span className="ta-metric-card__value tia-muted">{totals.unattempted}</span>
              <span className="ta-metric-card__label">Unattempted</span>
            </div>
            <div className="ta-metric-card">
              <span className="ta-metric-card__value">{accuracy}%</span>
              <span className="ta-metric-card__label">Accuracy</span>
            </div>
          </div>

          {/* Interval table */}
          <div className="ta-table-wrap">
            <h2 className="ta-table-title">Questions by Time Interval</h2>
            <p className="ta-table-sub muted">
              Each interval is a 30-minute block from the start of the test. A question is counted in
              the interval where its answer was saved (or where you first opened it, if unanswered).
            </p>
            <div className="ta-table-scroll">
              <table className="ta-table tia-table">
                <thead>
                  <tr>
                    <th>Time Interval</th>
                    <th>Attempted</th>
                    <th>Correct</th>
                    <th>Incorrect</th>
                    <th>Unattempted</th>
                    <th>Total</th>
                    <th>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.intervals || []).map((iv) => (
                    <tr key={iv.label}>
                      <td className="ta-table__num tia-interval">{iv.label} min</td>
                      <td className="tia-num">{iv.attempted}</td>
                      <td className="tia-num tia-pos">{iv.correct}</td>
                      <td className="tia-num tia-neg">{iv.incorrect}</td>
                      <td className="tia-num tia-muted">{iv.unattempted}</td>
                      <td className="tia-num">{iv.total}</td>
                      <td className="tia-num">
                        <span className={`tia-acc ${accClass(iv.attempted, iv.correct)}`}>
                          {accPct(iv.attempted, iv.correct)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="tia-total-row">
                    <td className="ta-table__num">Total</td>
                    <td className="tia-num">{totals.attempted}</td>
                    <td className="tia-num tia-pos">{totals.correct}</td>
                    <td className="tia-num tia-neg">{totals.incorrect}</td>
                    <td className="tia-num tia-muted">{totals.unattempted}</td>
                    <td className="tia-num">{totals.total}</td>
                    <td className="tia-num">
                      <span className="tia-acc tia-acc--total">{accuracy}%</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="ta-table-sub muted tia-note">
              Answered questions are placed by the time their answer was saved; unanswered ones by
              when they were first opened. When navigation data is unavailable, opened-but-unanswered
              questions are estimated from the time spent on them, in paper order. Questions never
              opened are only counted in the totals.
            </p>
          </div>
        </>
      )}

      <div className="ta-footer">
        <button className="btn-primary" onClick={onBack}>
          Back to Performance Analysis
        </button>
      </div>
    </div>
  );
}