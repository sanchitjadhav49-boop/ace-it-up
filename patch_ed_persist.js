const fs = require('fs');

// ---- 1) App.jsx: lift tags state into Analysis ----
let app = fs.readFileSync('frontend/src/App.jsx', 'utf8');
const appEol = app.includes('\r\n') ? '\r\n' : '\n';

function rep(str, from, to, label) {
  const count = str.split(from).length - 1;
  if (count !== 1) throw new Error('EXPECTED 1 occurrence of ' + label + ', got ' + count);
  return str.replace(from, to);
}

// add state
app = rep(
  app,
  "const [view, setView] = useState('performance'); // 'performance' | 'time' | 'error'" + appEol,
  "const [view, setView] = useState('performance'); // 'performance' | 'time' | 'error'" + appEol +
    "  const [errorTags, setErrorTags] = useState({}); // student error-tagging (survives tab switches)" + appEol,
  'errorTags state'
);

// pass props to ErrorDistribution
app = rep(
  app,
  "<ErrorDistribution result={result} onBack={() => setView('performance')} />",
  "<ErrorDistribution result={result} tags={errorTags} onTagsChange={setErrorTags} onBack={() => setView('performance')} />",
  'ErrorDistribution props'
);

fs.writeFileSync('frontend/src/App.jsx', app, 'utf8');
console.log('OK: App.jsx');

// ---- 2) ErrorDistribution.jsx: use props instead of local state ----
let ed = fs.readFileSync('frontend/src/ErrorDistribution.jsx', 'utf8');
const edEol = ed.includes('\r\n') ? '\r\n' : '\n';

ed = rep(
  ed,
  "export default function ErrorDistribution({ result, onBack }) {",
  "export default function ErrorDistribution({ result, onBack, tags, onTagsChange }) {",
  'component signature'
);

ed = rep(
  ed,
  "  const [tags, setTags] = useState({});    // question index -> option key" + edEol,
  "  // tags (question index -> option key) and setter are owned by Analysis so" + edEol +
    "  // selections survive switching between the Performance/Time/Error tabs." + edEol,
  'local tags state removal'
);

ed = rep(
  ed,
  "  const setTag = (qi, key) => setTags((prev) => ({ ...prev, [qi]: key }));",
  "  const setTag = (qi, key) => onTagsChange((prev) => ({ ...prev, [qi]: key }));",
  'setTag uses onTagsChange'
);

fs.writeFileSync('frontend/src/ErrorDistribution.jsx', ed, 'utf8');
console.log('OK: ErrorDistribution.jsx');
