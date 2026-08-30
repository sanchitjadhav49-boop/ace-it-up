const fs = require('fs');

const file = 'frontend/src/App.jsx';
let s = fs.readFileSync(file, 'utf8');
const CRLF = '\r\n';
const orig = s;

function replaceOnce(from, to, label) {
  const count = s.split(from).length - 1;
  if (count !== 1) throw new Error('EXPECTED 1 occurrence of ' + label + ', got ' + count);
  s = s.replace(from, to);
  console.log('OK:', label);
}

// 1) import
replaceOnce(
  "import TimeAnalysis from './TimeAnalysis.jsx';" + CRLF,
  "import TimeAnalysis from './TimeAnalysis.jsx';" + CRLF +
    "import ErrorDistribution from './ErrorDistribution.jsx';" + CRLF,
  'import ErrorDistribution'
);

// 2) third nav tab (insert after the Time Analysis button)
const thirdTab =
  '      <button' + CRLF +
  '        role="tab"' + CRLF +
  '        className={`ta-nav__tab${view === \'error\' ? \' ta-nav__tab--active\' : \'\'}`}' + CRLF +
  '        onClick={() => { setShowSummary(false); setView(\'error\'); }}' + CRLF +
  '      >' + CRLF +
  '        Error Distribution' + CRLF +
  '      </button>' + CRLF;
replaceOnce(
  '>' + CRLF + '        Time Analysis' + CRLF + '      </button>' + CRLF + '    </div>' + CRLF + '  );',
  '>' + CRLF + '        Time Analysis' + CRLF + '      </button>' + CRLF + thirdTab + '    </div>' + CRLF + '  );',
  'third nav tab'
);

// 3) error view branch (insert after the time view branch)
const timeBlock =
  "  if (view === 'time') {" + CRLF +
  '    return (' + CRLF +
  '      <>' + CRLF +
  '        {navTabs}' + CRLF +
  '        <TimeAnalysis result={result} onBack={() => setView(\'performance\')} />' + CRLF +
  '      </>' + CRLF +
  '    );' + CRLF +
  '  }' + CRLF;
const errorBlock =
  "  if (view === 'error') {" + CRLF +
  '    return (' + CRLF +
  '      <>' + CRLF +
  '        {navTabs}' + CRLF +
  '        <ErrorDistribution result={result} onBack={() => setView(\'performance\')} />' + CRLF +
  '      </>' + CRLF +
  '    );' + CRLF +
  '  }' + CRLF;
replaceOnce(timeBlock, timeBlock + errorBlock, 'error view branch');

// 4) view state comment
replaceOnce(
  "const [view, setView] = useState('performance'); // 'performance' | 'time'",
  "const [view, setView] = useState('performance'); // 'performance' | 'time' | 'error'",
  'view state comment'
);

if (s === orig) throw new Error('no change written');
fs.writeFileSync(file, s, 'utf8');
console.log('WROTE', file, '(', orig.length, '->', s.length, 'bytes )');
