// patch_home.js - rewires frontend/src/App.jsx to the new home screen design.
//
//  1. start screen JSX      -> part_home_screen.jsx
//  2. TestCard + icon set   -> part_test_card.jsx
//  3. home sort/filter state added next to searchQuery
//  4. filteredTests memo    -> search + difficulty filter + sort
//
// Run: node patch_home.js
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, 'frontend', 'src', 'App.jsx');

const toCrlf = (text) => text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
const readPart = (file) => {
  const raw = fs.readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\n+$/, '\n');
  return toCrlf(raw);
};

let src = fs.readFileSync(APP, 'utf8');
const before = src.length;

// --- 1. start screen ------------------------------------------------------
const START_MARK = '  // ============================= START SCREEN ==============================';
const HISTORY_MARK = '  // ============================== HISTORY =================================';

const sIdx = src.indexOf(START_MARK);
const hIdx = src.indexOf(HISTORY_MARK);
if (sIdx < 0 || hIdx < 0 || hIdx < sIdx) throw new Error('start-screen markers not found');
src = src.slice(0, sIdx) + readPart('part_home_screen.jsx') + '\r\n' + src.slice(hIdx);

// --- 2. TestCard (+ helpers) ---------------------------------------------
const tcIdx = src.indexOf('function TestCard({ test, userId, onStart }) {');
const anaIdx = src.indexOf('// Analysis - detailed performance breakdown');
if (tcIdx < 0 || anaIdx < 0 || anaIdx < tcIdx) throw new Error('TestCard markers not found');
const blockIdx = src.lastIndexOf('// ---', anaIdx);
if (blockIdx < 0) throw new Error('analysis divider not found');
src = src.slice(0, tcIdx) + readPart('part_test_card.jsx') + src.slice(blockIdx);

// --- 3. sort / filter state ----------------------------------------------
const SQ_LINE = "  const [searchQuery, setSearchQuery] = useState('');";
const sqIdx = src.indexOf(SQ_LINE);
if (sqIdx < 0) throw new Error('searchQuery state not found');
const sqEnd = sqIdx + SQ_LINE.length;
const stateBlock = toCrlf(
  "\r\n  const [hpSort, setHpSort] = useState('default');   // default | easy | hard | az" +
  "\r\n  const [hpLevel, setHpLevel] = useState('all');     // all | easy | moderate | difficult" +
  "\r\n  const [hpSortOpen, setHpSortOpen] = useState(false);"
);
src = src.slice(0, sqEnd) + stateBlock + src.slice(sqEnd);

// --- 4. filteredTests memo ------------------------------------------------
const MEMO_START = '  const filteredTests = useMemo(() => {';
const memoIdx = src.indexOf(MEMO_START);
if (memoIdx < 0) throw new Error('filteredTests memo not found');
const memoEndMark = '}, [tests, searchQuery]);';
const memoEndIdx = src.indexOf(memoEndMark, memoIdx);
if (memoEndIdx < 0) throw new Error('filteredTests memo end not found');
const memoEnd = memoEndIdx + memoEndMark.length;

const newMemo = toCrlf(
  "  const filteredTests = useMemo(() => {\r\n" +
  "\r\n" +
  "    const q = searchQuery.trim().toLowerCase();\r\n" +
  "\r\n" +
  "    const availableTests = tests\r\n" +
  "\r\n" +
  "      .filter((t) => t.title !== HIDDEN_HOME_TEST_TITLE)\r\n" +
  "\r\n" +
  "      .map((t, index) => ({ ...t, title: `Mock Test ${index + 1}` }));\r\n" +
  "\r\n" +
  "\r\n" +
  "\r\n" +
  "    const searched = !q\r\n" +
  "\r\n" +
  "      ? availableTests\r\n" +
  "\r\n" +
  "      : availableTests.filter((t) =>\r\n" +
  "\r\n" +
  "          (t.title || '').toLowerCase().includes(q) ||\r\n" +
  "\r\n" +
  "          (t.description || '').toLowerCase().includes(q)\r\n" +
  "\r\n" +
  "        );\r\n" +
  "\r\n" +
  "\r\n" +
  "\r\n" +
  "    const levelled = hpLevel === 'all'\r\n" +
  "\r\n" +
  "      ? searched\r\n" +
  "\r\n" +
  "      : searched.filter((t) => testLevel(t) === hpLevel);\r\n" +
  "\r\n" +
  "\r\n" +
  "\r\n" +
  "    const sorted = levelled.slice();\r\n" +
  "\r\n" +
  "    if (hpSort === 'easy') {\r\n" +
  "\r\n" +
  "      sorted.sort((a, b) => HP_LEVEL_RANK[testLevel(a)] - HP_LEVEL_RANK[testLevel(b)]);\r\n" +
  "\r\n" +
  "    } else if (hpSort === 'hard') {\r\n" +
  "\r\n" +
  "      sorted.sort((a, b) => HP_LEVEL_RANK[testLevel(b)] - HP_LEVEL_RANK[testLevel(a)]);\r\n" +
  "\r\n" +
  "    } else if (hpSort === 'az') {\r\n" +
  "\r\n" +
  "      sorted.sort((a, b) => String(a.title).localeCompare(String(b.title)));\r\n" +
  "\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    return sorted;\r\n" +
  "\r\n" +
  "  }, [tests, searchQuery, hpLevel, hpSort]);"
);
src = src.slice(0, memoIdx) + newMemo + src.slice(memoEnd);

fs.writeFileSync(APP, src, 'utf8');
console.log('patched App.jsx:', before, '->', src.length, 'chars');
console.log('start screen:', src.includes('className="hp-root"'));
console.log('test card   :', src.includes('hp-card__cta'));
