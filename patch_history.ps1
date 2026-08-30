$ErrorActionPreference = 'Stop'
$app = 'frontend\src\App.jsx'
$utf8 = New-Object System.Text.UTF8Encoding($false)

$c = [System.IO.File]::ReadAllText((Resolve-Path $app), [System.Text.Encoding]::UTF8)
$c = $c.Replace("`r`n", "`n")

function Norm($s) { return $s.Replace("`r`n", "`n") }
function AssertContains($hay, $needle, $msg) {
  if (-not $hay.Contains($needle)) { throw $msg }
}

# ---- A) state: replace showHistory with historyView + historyError ----
$aOld = '  const [showHistory, setShowHistory] = useState(false);'
$aNew = Norm(@'
  const [historyView, setHistoryView] = useState({ testId: null }); // null = test picker
  const [historyError, setHistoryError] = useState('');
'@)
AssertContains $c $aOld 'A: showHistory state anchor not found'
$c = $c.Replace($aOld, $aNew)

# ---- B) resultError state next to resultData ----
$bOld = Norm(@'
  const [resultData, setResultData] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);
'@)
$bNew = Norm(@'
  const [resultData, setResultData] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState('');
'@)
AssertContains $c $bOld 'B: result state anchor not found'
$c = $c.Replace($bOld, $bNew)

# ---- C) openHistory: navigate to the history phase ----
$cOld = Norm(@'
  async function openHistory() {
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const data = await api(`/api/users/${userId}/attempts`);
      setHistoryData(data.attempts);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }
'@)
$cNew = Norm(@'
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
'@)
AssertContains $c $cOld 'C: openHistory anchor not found'
$c = $c.Replace($cOld, $cNew)

# ---- D) openResult: surface errors ----
$dOld = Norm(@'
    } catch (err) {
      console.error(err);
    } finally {
      setResultLoading(false);
    }
'@)
$dNew = Norm(@'
    } catch (err) {
      setResultError(err.message || 'Could not load analysis');
    } finally {
      setResultLoading(false);
    }
'@)
AssertContains $c $dOld 'D: openResult catch anchor not found'
$c = $c.Replace($dOld, $dNew)

# ---- E) remove the old inline history block (replaced by the history page) ----
$startMarker = '            {showHistory && ('
$endMarker = "            )}`n          </main>"
$si = $c.IndexOf($startMarker)
$ei = $c.IndexOf($endMarker, $si)
if ($si -lt 0 -or $ei -lt 0) { throw 'E: inline history block not found' }
$c = $c.Remove($si, $ei + $endMarker.Length - $si).Insert($si, '          </main>')

# ---- F) add the history phase render before the instructions phase ----
$fAnchor = '  // ============================ INSTRUCTIONS =============================='
$fNew = Norm(@'
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
        onBack={() => setPhase('start')}
        onSelectTest={(testId) => setHistoryView({ testId })}
        onBackToTestsList={() => setResultData(null)}
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
'@)
AssertContains $c $fAnchor 'F: instructions anchor not found'
$c = $c.Replace($fAnchor, $fNew)

# ---- G) Analysis component: accept backLabel ----
$gOld = 'function Analysis({ result, onRetake }) {'
$gNew = 'function Analysis({ result, onRetake, backLabel }) {'
AssertContains $c $gOld 'G: Analysis signature anchor not found'
$c = $c.Replace($gOld, $gNew)

$gOld2 = '<button className="btn-primary" onClick={onRetake}>Take Another Test</button>'
$gNew2 = '<button className="btn-primary" onClick={onRetake}>{backLabel || ''Take Another Test''}</button>'
AssertContains $c $gOld2 'G2: Analysis action button anchor not found'
$c = $c.Replace($gOld2, $gNew2)

# ---- H) insert HistoryPage component before TestCard ----
$hAnchor = Norm(@'
// ---------------------------------------------------------------------------
// TestCard - one published test on the start screen, with resume detection.
// ---------------------------------------------------------------------------
'@)
$hNew = Norm(@'
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
    return <Analysis result={result} onRetake={onBackToTestsList} backLabel="Back to History" />;
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
'@)
AssertContains $c $hAnchor 'H: TestCard anchor not found'
$c = $c.Replace($hAnchor, $hNew)

$c = $c.Replace("`n", "`r`n")
[System.IO.File]::WriteAllText((Resolve-Path $app), $c, $utf8)
Write-Host 'App.jsx history patch applied OK'
