import { useEffect, useMemo, useState } from 'react';

const SCOPE_TABS = ['Overall', 'Physics', 'Chemistry', 'Mathematics'];

function formatTime(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleTimeString(); } catch (e) { return ts; }
}

function classifySubject(q) {
  const sec = String((q && q.section) || (q && q.subject) || '');
  if (/physics/i.test(sec)) return 'Physics';
  if (/chem/i.test(sec)) return 'Chemistry';
  if (/math/i.test(sec)) return 'Mathematics';
  return 'Other';
}

function shortSubject(s) {
  if (!s) return '?';
  if (s === 'Physics') return 'P';
  if (s === 'Chemistry') return 'C';
  if (s === 'Mathematics') return 'M';
  return s[0] || '?';
}

export default function QuestionJourney({ result, onBack }) {
  const attemptId = result && (result.attempt_id || result.attempt_id === 0) ? result.attempt_id : null;
  const [scope, setScope] = useState('Overall');
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    setLoading(true); setError('');
    fetch(`/api/attempts/${attemptId}/journey`)
      .then(async (r) => {
        // Read as text first so empty / non-JSON responses (e.g. a proxy 500
        // with no body) never throw the raw "Unexpected end of JSON input".
        const text = await r.text();
        let j = null;
        if (text) {
          try { j = JSON.parse(text); } catch (e) { j = null; }
        }
        if (!r.ok) throw new Error((j && j.error) || `Request failed (${r.status})`);
        if (!j) throw new Error('The journey API returned an empty response. Please try again.');
        if (j.error) throw new Error(j.error);
        return j;
      })
      .then((j) => {
        if (!cancelled) setEvents(j.events || []);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e && e.message ? e.message : e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [attemptId]);

  const byScope = useMemo(() => {
    if (!events || !Array.isArray(events)) return {};
    // events: [{id, attempt_id, from_question_id, to_question_id, viewed_at}] ordered by viewed_at asc
    // augment with question meta from result.questions
    const qById = {};
    for (const q of (result.questions || [])) qById[q.id] = q;

    const rows = events.map((e, i) => {
      const from = qById[e.from_question_id] || null;
      const to = qById[e.to_question_id] || null;
      return {
        ...e,
        idx: i + 1,
        fromPos: from ? (from.global_position || from.position || '?') : (e.from_question_id || '?'),
        toPos: to ? (to.global_position || to.position || '?') : (e.to_question_id || '?'),
        fromSubj: from ? classifySubject(from) : (to ? classifySubject(to) : 'Unknown'),
        toSubj: to ? classifySubject(to) : (from ? classifySubject(from) : 'Unknown'),
        fromBody: from ? from.body : '',
        toBody: to ? to.body : '',
      };
    });

    const scopes = { Overall: rows, Physics: [], Chemistry: [], Mathematics: [] };
    for (const r of rows) {
      const subjects = new Set([r.fromSubj, r.toSubj]);
      for (const s of subjects) {
        if (s === 'Physics' || s === 'Chemistry' || s === 'Mathematics') {
          scopes[s].push(r);
        }
      }
    }
    return { scopes, qById };
  }, [events, result]);

  const active = (byScope.scopes && (byScope.scopes[scope] || [])) || [];
  const qById = byScope.qById || {};

  // Build a visits array for the visual journey strip. We use the sequence of "to_question_id" from events
  const visits = useMemo(() => {
    if (!events || !Array.isArray(events)) return [];
    const vs = events.map((e) => ({
      questionId: e.to_question_id,
      ts: e.viewed_at ? Date.parse(e.viewed_at) : null,
      raw: e,
    }));
    // compute durations between visits (in seconds)
    for (let i = 0; i < vs.length; i++) {
      const cur = vs[i];
      const next = vs[i + 1];
      if (cur.ts && next && next.ts) cur.durationSec = Math.round((next.ts - cur.ts) / 1000);
      else cur.durationSec = null;
    }
    // last item's duration: try to use attempt end time if present
    if (vs.length) {
      const last = vs[vs.length - 1];
      const endTs = (result && (result.attempt_finished_at || result.ended_at || result.finished_at || result.ended)) ? Date.parse(result.attempt_finished_at || result.ended_at || result.finished_at || result.ended) : null;
      if (last.ts && endTs) last.durationSec = Math.round((endTs - last.ts) / 1000);
    }
    return vs;
  }, [events, result]);

  const stats = useMemo(() => {
    if (!active || active.length === 0) return { totalJumps: 0, revisits: 0, avgIntervalSec: 0 };
    let revisits = 0;
    const seen = new Set();
    const intervals = [];
    let prev = null;
    for (const e of active) {
      const to = e.to_question_id;
      if (seen.has(to)) revisits += 1;
      seen.add(e.from_question_id); seen.add(to);
      const t = e.viewed_at ? Date.parse(e.viewed_at) : null;
      if (prev != null && t != null) intervals.push((t - prev) / 1000);
      prev = t || prev;
    }
    const avg = intervals.length ? Math.round((intervals.reduce((a,b)=>a+b,0)/intervals.length)) : 0;
    return { totalJumps: active.length, revisits, avgIntervalSec: avg };
  }, [active]);

  return (
    <div className="ta-page">
      <header className="ta-header">
        <button className="btn-ghost ta-back-btn" onClick={onBack}>&#8592; Back to Analysis</button>
        <div className="ta-header__center">
          <h1 className="ta-heading">Question Journey</h1>
          <p className="ta-subheading muted">Visualise how you moved between questions during the attempt.</p>
        </div>
      </header>

      <div className="da2-tabs" role="tablist" aria-label="Show journey for">
        {SCOPE_TABS.map((k) => (
          <button key={k} role="tab" aria-selected={scope===k} className={`da2-tab${scope===k? ' da2-tab--active':''}`} onClick={()=>setScope(k)}>
            {k}
          </button>
        ))}
      </div>

      <div className="ta-table-wrap">
        <h2 className="ta-table-title">Jump Timeline</h2>
        <p className="ta-table-sub muted">Each row is a navigation event (from -> to). Use this to spot lots of back-and-forth or long intervals.</p>

        {loading ? <p className="muted">Loading journey…</p> : error ? <p className="error">{error}</p> : (
          <div>
            <div style={{display:'flex',gap:16,marginBottom:12,flexWrap:'wrap'}}>
              <div className="ta-metric-card"><div className="ta-metric-card__value">{stats.totalJumps}</div><div className="ta-metric-card__label">Total jumps</div></div>
              <div className="ta-metric-card"><div className="ta-metric-card__value">{stats.revisits}</div><div className="ta-metric-card__label">Revisits</div></div>
              <div className="ta-metric-card"><div className="ta-metric-card__value">{stats.avgIntervalSec}s</div><div className="ta-metric-card__label">Avg between jumps</div></div>
            </div>

            {/* Journey strip: show sequence of visited questions as boxes */}
            <div style={{marginBottom:16}}>
              <h3 className="ta-table-sub muted">Visual Journey</h3>
              {(!visits || visits.length === 0) ? (
                <p className="muted">No navigation events recorded for this attempt.</p>
              ) : (
                <div style={{display:'flex',gap:12,overflowX:'auto',padding:8,border:'1px solid #eee',borderRadius:8}}>
                  {visits.map((v, i) => {
                    const q = qById[v.questionId];
                    const qPos = q ? (q.global_position || q.position || q.no || q.index) : v.questionId;
                    const subj = q ? classifySubject(q) : 'Unknown';
                    const short = shortSubject(subj);
                    const dur = v.durationSec != null ? `${v.durationSec}s` : '-';
                    const title = q ? (q.body || (`Q${qPos}`)) : `Q${v.questionId}`;
                    return (
                      <div key={`${v.questionId}-${i}`} title={title} style={{minWidth:92,flex:'0 0 auto',background:'#fff',border:'1px solid #ddd',borderRadius:6,padding:8,boxShadow:'0 1px 2px rgba(0,0,0,0.03)',textAlign:'center'}}>
                        <div style={{fontSize:12,color:'#666',marginBottom:6}}>{dur}</div>
                        <div style={{fontSize:18,fontWeight:700}}>{`Q${qPos}`}</div>
                        <div style={{marginTop:8,display:'inline-block',width:28,height:28,lineHeight:'28px',borderRadius:14,background: subj==='Physics'? '#cfe8ff' : subj==='Chemistry'? '#ffe6cf' : subj==='Mathematics'? '#e6ffd9' : '#f0f0f0',color:'#222',fontWeight:700}}>{short}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="ta-table-scroll">
              <table className="ta-table">
                <thead>
                  <tr><th>#</th><th>Time</th><th>From</th><th>-></th><th>To</th><th>Subject</th></tr>
                </thead>
                <tbody>
                  {active.map((e) => (
                    <tr key={e.id} title={e.fromBody || e.toBody}>
                      <td className="ta-table__num">{e.idx}</td>
                      <td>{formatTime(e.viewed_at)}</td>
                      <td>Q{e.fromPos}{e.fromPos==='?'? ` (${e.from_question_id})`:''}</td>
                      <td style={{textAlign:'center'}}>-></td>
                      <td>Q{e.toPos}{e.toPos==='?'? ` (${e.to_question_id})`:''}</td>
                      <td>{e.toSubj || e.fromSubj}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="ta-footer"><button className="btn-primary" onClick={onBack}>Back to Performance Analysis</button></div>
    </div>
  );
}
