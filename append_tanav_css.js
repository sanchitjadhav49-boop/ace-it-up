'use strict';
const fs = require('fs');

const cssPath = 'frontend/src/exam.css';
let css = fs.readFileSync(cssPath, 'utf8');

if (css.includes('.ta-nav')) {
  console.log('.ta-nav CSS already present');
  process.exit(0);
}

const addition = `

/* ============================================================================
   Analysis <-> Time Analysis top navigation tabs  (.ta-nav)
   ============================================================================ */

.ta-nav {
  display: flex;
  gap: 4px;
  max-width: 960px;
  margin: 0 auto 18px;
  padding: 4px;
  background: #ffffff;
  border: 1px solid #d1d9e6;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  width: fit-content;
}
body.dark .ta-nav { background: #1f2229; border-color: #2c2f38; }

.ta-nav__tab {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #475569;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.ta-nav__tab:hover { background: #f1f5f9; }
.ta-nav__tab--active {
  background: #1b4f9c;
  color: #ffffff;
}
body.dark .ta-nav__tab { color: #d1d5db; }
body.dark .ta-nav__tab:hover { background: #2c2f38; }
body.dark .ta-nav__tab--active { background: #1b4f9c; color: #ffffff; }

@media (max-width: 640px) {
  .ta-nav { max-width: 100%; margin-bottom: 12px; }
  .ta-nav__tab { flex: 1; padding: 8px 10px; font-size: 0.8rem; }
}
`;

fs.writeFileSync(cssPath, css + addition, 'utf8');
console.log('Appended .ta-nav CSS. New length:', (css + addition).length);
