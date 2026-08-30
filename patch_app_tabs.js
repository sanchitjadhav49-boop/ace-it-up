'use strict';
const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'frontend', 'src', 'App.jsx');
let text = fs.readFileSync(appPath, 'utf8');
const NL = '\r\n';
const log = [];
let changed = 0;

function assertOnce(needle, label) {
  const count = text.split(needle).length - 1;
  if (count !== 1) throw new Error('ANCHOR count ' + count + ' for: ' + label);
}

// ---------------------------------------------------------------
// A. Remove the inline timeAnalysis useMemo at the top of Analysis()
// ---------------------------------------------------------------
const memoStart = 'function Analysis({ result, onRetake, onBackHome, backLabel }) {' + NL +
  '    // --- Time Analysis: time spent grouped by subject, difficulty, result ---' + NL +
  '  const timeAnalysis = useMemo(() => {';
if (text.includes(memoStart)) {
  const re = new RegExp(
    'function Analysis\\(\\(?\\{ result, onRetake, onBackHome, backLabel \\}\\)? \\) \\{\\r\\n' +
    '    \\/\\/ --- Time Analysis: time spent grouped by subject, difficulty, result ---\\r\\n' +
    '  const timeAnalysis = useMemo\\(\\(\\) => \\{[\\s\\S]*?\\}, \\[result\\.questions\\]\\);\\r\\n'
  );
  const before = text;
  text = text.replace(re, 'function Analysis({ result, onRetake, onBackHome, backLabel }) {' + NL);
  if (text !== before) { log.push('A. removed inline timeAnalysis useMemo'); changed++; }
} else {
  log.push('A. memo anchor not found - already removed?');
}

// ---------------------------------------------------------------
// B. Replace showTimeAnalysis state with view state
// ---------------------------------------------------------------
const oldState = '  const [showSummary, setShowSummary] = useState(false);' + NL +
  '  const [showTimeAnalysis, setShowTimeAnalysis] = useState(false);';
const newState = '  const [showSummary, setShowSummary] = useState(false);' + NL +
  "  const [view, setView] = useState('performance'); // 'performance' | 'time'";
assertOnce(oldState, 'state block');
text = text.replace(oldState, newState);
log.push('B. state -> view'); changed++;

// ---------------------------------------------------------------
// C. Replace early-return blocks with navTabs + updated returns
// ---------------------------------------------------------------
const oldBlocks =
  '  if (showTimeAnalysis) {' + NL +
  '    return (' + NL +
  '      <TimeAnalysis result={result} onBack={() => setShowTimeAnalysis(false)} />' + NL +
  '    );' + NL +
  '  }' + NL +
  NL +
  '  if (showSummary) {' + NL +
  '    return (' + NL +
  '      <ScoreSummary' + NL +
  '        result={result}' + NL +
  '        onBack={() => setShowSummary(false)}' + NL +
  '        onBackHome={onBackHome}' + NL +
  '      />' + NL +
  '    );' + NL +
  '  }';

const newBlocks =
  "  const navTabs = (" + NL +
  '    <div className="ta-nav" role="tablist">' + NL +
  '      <button' + NL +
  '        role="tab"' + NL +
  "        className={`ta-nav__tab${view === 'performance' ? ' ta-nav__tab--active' : ''}`}" + NL +
  "        onClick={() => { setShowSummary(false); setView('performance'); }}" + NL +
  '      >' + NL +
  '        Performance Analysis' + NL +
  '      </button>' + NL +
  '      <button' + NL +
  '        role="tab"' + NL +
  "        className={`ta-nav__tab${view === 'time' ? ' ta-nav__tab--active' : ''}`}" + NL +
  "        onClick={() => { setShowSummary(false); setView('time'); }}" + NL +
  '      >' + NL +
  '        Time Analysis' + NL +
  '      </button>' + NL +
  '    </div>' + NL +
  '  );' + NL +
  NL +
  '  if (showSummary) {' + NL +
  '    return (' + NL +
  '      <>' + NL +
  '        {navTabs}' + NL +
  '        <ScoreSummary' + NL +
  '          result={result}' + NL +
  '          onBack={() => setShowSummary(false)}' + NL +
  '          onBackHome={onBackHome}' + NL +
  '        />' + NL +
  '      </>' + NL +
  '    );' + NL +
  '  }' + NL +
  NL +
  "  if (view === 'time') {" + NL +
  '    return (' + NL +
  '      <>' + NL +
  '        {navTabs}' + NL +
  "        <TimeAnalysis result={result} onBack={() => setView('performance')} />" + NL +
  '      </>' + NL +
  '    );' + NL +
  '  }';

assertOnce(oldBlocks, 'early-return blocks');
text = text.replace(oldBlocks, newBlocks);
log.push('C. early-return blocks -> navTabs + returns'); changed++;

// ---------------------------------------------------------------
// D. Render navTabs at the top of the main Analysis return
// ---------------------------------------------------------------
const topAnchor = NL + '    <div className="analysis-page">' + NL + '      <header className="analysis-header">';
assertOnce(topAnchor, 'analysis-page top');
text = text.replace(topAnchor, NL + '    <div className="analysis-page">' + NL + '      {navTabs}' + NL + '      <header className="analysis-header">');
log.push('D. navTabs at top of Analysis page'); changed++;

// ---------------------------------------------------------------
// E. Remove inline Time Analysis section from Analysis header
// ---------------------------------------------------------------
const sectionRe = /(<h1>Test Score Summary<\/h1>\r\n)\s*<section style=\{\{ marginTop: 24 \}\}>[\s\S]*?<\/section>\r\n(\s*<p className="muted">\{result\.title\})/;
if (sectionRe.test(text)) {
  text = text.replace(sectionRe, '$1$2');
  log.push('E. removed inline Time Analysis section'); changed++;
} else {
  throw new Error('inline section regex did not match');
}

// ---------------------------------------------------------------
// F. Remove the standalone "Time Analysis" button
// ---------------------------------------------------------------
const btnBlock =
  '          Let&apos;s Do Analysis' + NL +
  '        </button>' + NL +
  '        <button className="btn-time-analysis" onClick={() => setShowTimeAnalysis(true)}>' + NL +
  '          Time Analysis' + NL +
  '        </button>';
if (text.includes(btnBlock)) {
  text = text.replace(btnBlock,
    '          Let&apos;s Do Analysis' + NL + '        </button>');
  log.push('F. removed standalone Time Analysis button'); changed++;
} else {
  log.push('F. button already absent');
}

// Sanity: no stale references
['showTimeAnalysis', 'setShowTimeAnalysis', 'timeAnalysis.'].forEach((ref) => {
  if (text.includes(ref)) {
    throw new Error('STALE REFERENCE remains: ' + ref);
  }
});
log.push('Sanity: no stale showTimeAnalysis/timeAnalysis references');

fs.writeFileSync(appPath, text, 'utf8');
console.log(log.join('\n'));
console.log('WROTE App.jsx, new length:', text.length, '| changes applied:', changed);
