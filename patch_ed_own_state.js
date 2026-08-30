'use strict';
// Removes the lifted errorTags state from Analysis in App.jsx (reverts the
// tags/onTagsChange props wiring); ErrorDistribution now owns its state and
// persists via the API. Additive code in App.jsx is untouched otherwise.
const fs = require('fs');

const file = 'frontend/src/App.jsx';
let s = fs.readFileSync(file, 'utf8');
const EOL = s.includes('\r\n') ? '\r\n' : '\n';
const orig = s;

function rep(from, to, label) {
  const count = s.split(from).length - 1;
  if (count !== 1) throw new Error('EXPECTED 1 occurrence of ' + label + ', got ' + count);
  s = s.replace(from, to);
  console.log('OK:', label);
}

// 1) drop the lifted state line
rep(
  "  const [errorTags, setErrorTags] = useState({}); // student error-tagging (survives tab switches)" + EOL,
  '',
  'remove errorTags state'
);

// 2) restore plain props on <ErrorDistribution>
rep(
  "<ErrorDistribution result={result} tags={errorTags} onTagsChange={setErrorTags} onBack={() => setView('performance')} />",
  "<ErrorDistribution result={result} onBack={() => setView('performance')} />",
  'restore ErrorDistribution props'
);

if (s === orig) throw new Error('no change written');
fs.writeFileSync(file, s, 'utf8');
console.log('WROTE', file, '(', orig.length, '->', s.length, 'bytes )');
