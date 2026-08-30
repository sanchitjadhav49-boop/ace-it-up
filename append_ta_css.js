'use strict';
const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'frontend', 'src', 'exam.css');
const existing = fs.readFileSync(cssPath, 'utf8');

if (existing.includes('.ta-page')) {
  console.log('CSS already present, skipping.');
  process.exit(0);
}

const addition = `

/* ============================================================================
   Time Analysis page  (.ta-*)
   ============================================================================ */

.ta-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px 64px;
}

.ta-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 28px;
}
.ta-back-btn { flex-shrink: 0; margin-top: 4px; }
.ta-header__center { flex: 1; }
.ta-heading { margin: 0 0 4px; font-size: 1.7rem; color: #143a7a; }
body.dark .ta-heading { color: #93c5fd; }
.ta-subheading { margin: 0; font-size: 0.9rem; }

.ta-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 28px;
}
.ta-metric-card {
  flex: 1 1 160px;
  background: #ffffff;
  border: 1px solid #d1d9e6;
  border-radius: 10px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
body.dark .ta-metric-card { background: #1e2535; border-color: #334155; }
.ta-metric-card--warn { border-color: #f59e0b; background: #fffbeb; }
body.dark .ta-metric-card--warn { background: #2d2310; border-color: #d97706; }
.ta-metric-card__value {
  font-size: 1.3rem;
  font-weight: 800;
  color: #1b4f9c;
  line-height: 1.1;
}
body.dark .ta-metric-card__value { color: #93c5fd; }
.ta-metric-card__label { font-size: 0.75rem; color: #6b7686; line-height: 1.2; }

.ta-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.ta-card {
  background: #ffffff;
  border: 1px solid #d1d9e6;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
body.dark .ta-card { background: #1e2535; border-color: #334155; }
.ta-card__header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.ta-card__title { margin: 0; font-size: 1rem; font-weight: 700; color: #1b3a5c; }
body.dark .ta-card__title { color: #e2e8f0; }

.ta-card__rows { display: flex; flex-direction: column; gap: 14px; }
.ta-bar-row { display: flex; flex-direction: column; gap: 4px; }
.ta-bar-row__meta { display: flex; align-items: center; gap: 6px; }
.ta-bar-row__label { font-weight: 700; font-size: 0.88rem; min-width: 80px; }
.ta-bar-row__time { font-size: 0.85rem; color: #1b4f9c; font-weight: 600; margin-left: auto; }
body.dark .ta-bar-row__time { color: #93c5fd; }
.ta-bar-row__share { font-size: 0.78rem; color: #6b7686; min-width: 34px; text-align: right; }
.ta-bar-track { height: 10px; background: #e9edf2; border-radius: 6px; overflow: hidden; }
body.dark .ta-bar-track { background: #334155; }
.ta-bar-fill { height: 100%; border-radius: 6px; transition: width 0.5s ease; min-width: 2px; }
.ta-bar-row__sub { margin-top: 1px; }
.ta-bar-row__count { font-size: 0.72rem; color: #6b7686; }

.ta-insight-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 28px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
body.dark .ta-insight-box { background: #1e293b; border-color: #3b82f6; }
.ta-insight-box__heading {
  font-weight: 800;
  color: #1b4f9c;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
  padding-top: 2px;
}
body.dark .ta-insight-box__heading { color: #93c5fd; }
.ta-insight-box__text { font-size: 0.88rem; color: #374151; line-height: 1.6; }
body.dark .ta-insight-box__text { color: #cbd5e1; }

.ta-table-wrap {
  background: #ffffff;
  border: 1px solid #d1d9e6;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 28px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
body.dark .ta-table-wrap { background: #1e2535; border-color: #334155; }
.ta-table-title { margin: 0 0 4px; font-size: 1rem; font-weight: 700; color: #1b3a5c; }
body.dark .ta-table-title { color: #e2e8f0; }
.ta-table-sub { margin: 0 0 14px; }
.ta-table-scroll { overflow-x: auto; }
.ta-table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
.ta-table th {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 2px solid #d1d9e6;
  color: #475569;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
body.dark .ta-table th { border-color: #334155; color: #94a3b8; }
.ta-table__row { border-bottom: 1px solid #e9edf2; cursor: default; }
body.dark .ta-table__row { border-color: #2d3748; }
.ta-table__row:hover { background: #f0f4ff; }
body.dark .ta-table__row:hover { background: #1b2a3f; }
.ta-table td { padding: 8px 10px; vertical-align: middle; }
.ta-table__num { color: #6b7686; width: 32px; }
.ta-table__type { color: #6b7686; font-size: 0.78rem; }
.ta-table__time { white-space: nowrap; }

.ta-subject-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 600;
  white-space: nowrap;
}
.ta-diff-pill { font-size: 0.78rem; font-weight: 700; text-transform: capitalize; }
.ta-result-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
}
.ta-result--correct   { background: #d1fae5; color: #065f46; }
.ta-result--incorrect { background: #fee2e2; color: #991b1b; }
.ta-result--unattempted { background: #f1f5f9; color: #475569; }
body.dark .ta-result--correct     { background: #064e3b; color: #6ee7b7; }
body.dark .ta-result--incorrect   { background: #7f1d1d; color: #fca5a5; }
body.dark .ta-result--unattempted { background: #1e293b; color: #94a3b8; }

.ta-marks--pos  { color: #16a34a; font-weight: 700; }
.ta-marks--neg  { color: #dc2626; font-weight: 700; }
.ta-marks--zero { color: #6b7686; }

.ta-footer { display: flex; justify-content: center; padding-top: 8px; }

.btn-time-analysis {
  padding: 10px 22px;
  border: 2px solid #1b4f9c;
  border-radius: 4px;
  background: transparent;
  color: #1b4f9c;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.btn-time-analysis:hover { background: #1b4f9c; color: #fff; }
body.dark .btn-time-analysis { border-color: #93c5fd; color: #93c5fd; }
body.dark .btn-time-analysis:hover { background: #1d4ed8; color: #fff; }
`;

fs.writeFileSync(cssPath, existing + addition, 'utf8');
console.log('Done. New size:', (existing + addition).length, 'chars');
