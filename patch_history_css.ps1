$ErrorActionPreference = 'Stop'
$css = 'frontend\src\exam.css'
$utf8 = New-Object System.Text.UTF8Encoding($false)

$c = [System.IO.File]::ReadAllText((Resolve-Path $css), [System.Text.Encoding]::UTF8)
$c = $c.Replace("`r`n", "`n")

$block = @'
/* ===========================================================================
   HISTORY PAGE  (My History: pick a mock test -> pick an attempt -> analysis)
   =========================================================================== */
.history-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.history-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin-bottom: 20px;
}

.history-title {
  font-size: 26px;
  margin: 8px 0 0;
  color: #111827;
}

.history-subtitle {
  font-size: 18px;
  margin: 20px 0 12px;
  color: #111827;
}

.btn-ghost {
  background: transparent;
  border: 1px solid #d1d5db;
  color: #374151;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.btn-ghost:hover { background: #f3f4f6; border-color: #9ca3af; }

.history-test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.history-test-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s, border-color 0.15s;
  font: inherit;
  color: inherit;
}
.history-test-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
  border-color: #1b4f9c;
}

.history-test-card__title {
  font-weight: 700;
  font-size: 15px;
  color: #111827;
  line-height: 1.35;
}

.history-test-card__meta {
  display: flex;
  gap: 12px;
  font-size: 12.5px;
  color: #6b7280;
}

.history-test-card__best {
  font-size: 13.5px;
  color: #374151;
}
.history-test-card__best strong { color: #1b4f9c; }

.history-test-card__cta {
  margin-top: auto;
  font-size: 13px;
  font-weight: 600;
  color: #1b4f9c;
}

.history-attempts-head {
  margin-bottom: 16px;
}

.history-attempts-head .btn-ghost {
  margin-bottom: 10px;
}

.history-attempt-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-attempt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px 18px;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.history-attempt-row--clickable:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border-color: #1b4f9c;
}

.history-attempt-row__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.history-attempt-row__top {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.history-attempt-row__label {
  font-weight: 700;
  font-size: 15px;
  color: #111827;
}

.history-attempt-row__meta {
  font-size: 12.5px;
  color: #6b7280;
}

.history-attempt-row__score {
  font-size: 14px;
  color: #374151;
}
.history-attempt-row__score strong { color: #1b4f9c; font-size: 16px; }

.history-attempt-row__actions {
  flex-shrink: 0;
}

.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.status-badge--submitted { background: #dcfce7; color: #166534; }
.status-badge--expired   { background: #fee2e2; color: #991b1b; }
.status-badge--in_progress { background: #fef9c3; color: #854d0e; }

.history-loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-empty,
.history-error {
  background: #ffffff;
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  padding: 28px;
  text-align: center;
  margin-top: 8px;
}
.history-empty h2 { margin: 0 0 6px; color: #111827; }
.history-error p { margin: 0 0 14px; color: #b91c1c; }
.history-empty .btn-primary,
.history-error .btn-primary { margin-top: 12px; }

/* dark mode for the history page */
body.dark .history-title,
body.dark .history-subtitle,
body.dark .history-test-card__title,
body.dark .history-attempt-row__label,
body.dark .history-empty h2 { color: #f3f4f6; }

body.dark .btn-ghost {
  background: #2c2f38;
  border-color: #3a3e48;
  color: #d1d5db;
}
body.dark .btn-ghost:hover { background: #383c46; border-color: #4b5563; }

body.dark .history-test-card,
body.dark .history-attempt-row,
body.dark .history-empty,
body.dark .history-error {
  background: #1f2229;
  border-color: #2c2f38;
}
body.dark .history-test-card:hover,
body.dark .history-attempt-row--clickable:hover { border-color: #3b82f6; }

body.dark .history-test-card__best,
body.dark .history-attempt-row__score { color: #d1d5db; }
body.dark .history-test-card__best strong,
body.dark .history-attempt-row__score strong { color: #9ec1f5; }

body.dark .status-badge--submitted { background: #14532d; color: #bbf7d0; }
body.dark .status-badge--expired   { background: #7f1d1d; color: #fecaca; }
body.dark .status-badge--in_progress { background: #713f12; color: #fef08a; }

@media (max-width: 640px) {
  .history-attempt-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .history-page { padding: 16px 14px 50px; }
}
'@
$block = $block.Replace("`r`n", "`n")

$c = $c + "`n" + $block
$c = $c.Replace("`n", "`r`n")
[System.IO.File]::WriteAllText((Resolve-Path $css), $c, $utf8)
Write-Host 'exam.css history styles appended'
