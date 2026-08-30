'use strict';
const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'frontend', 'src', 'App.jsx');
let text = fs.readFileSync(appPath, 'utf8');
const NL = '\r\n'; // repo files use CRLF

function replaceOnce(hay, needle, replacement, label) {
  if (!hay.includes(needle)) {
    throw new Error('ANCHOR NOT FOUND: ' + label);
  }
  const count = hay.split(needle).length - 1;
  if (count !== 1) {
    throw new Error('ANCHOR NOT UNIQUE (' + count + 'x): ' + label);
  }
  return hay.replace(needle, replacement);
}

// 1. Import TimeAnalysis after SplashScreen import
if (!text.includes("import TimeAnalysis from './TimeAnalysis.jsx';")) {
  text = replaceOnce(
    text,
    "import SplashScreen from './SplashScreen.jsx';",
    "import SplashScreen from './SplashScreen.jsx';" + NL + "import TimeAnalysis from './TimeAnalysis.jsx';",
    'import anchor'
  );
  console.log('OK: added import');
} else {
  console.log('SKIP: import already present');
}

// 2. showTimeAnalysis state after showSummary state
if (!text.includes('const [showTimeAnalysis, setShowTimeAnalysis] = useState(false);')) {
  text = replaceOnce(
    text,
    '  const [showSummary, setShowSummary] = useState(false);',
    '  const [showSummary, setShowSummary] = useState(false);' + NL +
      '  const [showTimeAnalysis, setShowTimeAnalysis] = useState(false);',
    'showSummary state anchor'
  );
  console.log('OK: added showTimeAnalysis state');
} else {
  console.log('SKIP: state already present');
}

// 3. Early-return TimeAnalysis page before the showSummary block
if (!text.includes('if (showTimeAnalysis)')) {
  const block =
    '  if (showTimeAnalysis) {' + NL +
    '    return (' + NL +
    '      <TimeAnalysis result={result} onBack={() => setShowTimeAnalysis(false)} />' + NL +
    '    );' + NL +
    '  }' + NL +
    NL;
  text = replaceOnce(
    text,
    '  if (showSummary) {' + NL + '    return (' + NL + '      <ScoreSummary',
    block + '  if (showSummary) {' + NL + '    return (' + NL + '      <ScoreSummary',
    'showSummary block anchor'
  );
  console.log('OK: added TimeAnalysis render block');
} else {
  console.log('SKIP: render block already present');
}

// 4. Time Analysis button after the Let's Do Analysis button
if (!text.includes('btn-time-analysis')) {
  const btn =
    '          Let&apos;s Do Analysis' + NL +
    '        </button>' + NL +
    '        <button className="btn-time-analysis" onClick={() => setShowTimeAnalysis(true)}>' + NL +
    '          Time Analysis' + NL +
    '        </button>';
  text = replaceOnce(
    text,
    '          Let&apos;s Do Analysis' + NL + '        </button>',
    btn,
    "Let's Do Analysis button anchor"
  );
  console.log('OK: added Time Analysis button');
} else {
  console.log('SKIP: button already present');
}

fs.writeFileSync(appPath, text, 'utf8');
console.log('WROTE App.jsx, new length:', text.length);
