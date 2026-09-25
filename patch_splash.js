// patch_splash.js - the splash screen now owns its own timing: App just keeps
// the showSplash flag and hands SplashScreen an onDone callback.
//
// Run: node patch_splash.js
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, 'frontend', 'src', 'App.jsx');
let src = fs.readFileSync(APP, 'utf8');
const before = src.length;

fs.writeFileSync(APP + '.bak_splash', src, 'utf8');

// ---- 1. drop the fixed 4800ms timer that raced the CSS exit animation ----
const startMark = '// AceIT Up cinematic splash screen';
const startAt = src.indexOf(startMark);
if (startAt < 0) throw new Error('splash comment not found');
const lineStart = src.lastIndexOf('\n', startAt) + 1;

const endMark = '}, []);';
const endAt = src.indexOf(endMark, startAt);
if (endAt < 0) throw new Error('splash effect end not found');
const blockEnd = endAt + endMark.length;

const oldBlock = src.slice(lineStart, blockEnd);
if (!oldBlock.includes('setSplash') && !oldBlock.includes('showSplash')) throw new Error('unexpected splash block');

const newBlock = [
  '  // AceIT Up cinematic splash screen. SplashScreen plays the intro and calls',
  '  // onDone once its fade-out animation has finished, so the timing lives in',
  '  // one place instead of racing a fixed timer here.',
  '  const [showSplash, setShowSplash] = useState(true);',
].join('\r\n');

src = src.slice(0, lineStart) + newBlock + src.slice(blockEnd);

// ---- 2. let the component tell App when it is done ----------------------
const renderMark = 'return <SplashScreen />;';
const renderAt = src.indexOf(renderMark);
if (renderAt < 0) throw new Error('SplashScreen render not found');
src = src.slice(0, renderAt)
  + 'return <SplashScreen onDone={() => setShowSplash(false)} />;'
  + src.slice(renderAt + renderMark.length);

// ---- 3. tidy the stray blank lines the previous patch left behind -------
src = src.replace(
  /  const \[showSplash, setShowSplash\] = useState\(true\);\r\n(\r\n)+\r\n/,
  '  const [showSplash, setShowSplash] = useState(true);\r\n\r\n'
);

fs.writeFileSync(APP, src, 'utf8');

const checks = {
  'app passes onDone': src.includes('return <SplashScreen onDone={() => setShowSplash(false)} />;'),
  'no 4800 timer': !src.includes('4800'),
  'no splashTimer': !src.includes('splashTimer'),
  'showSplash still declared': src.includes('const [showSplash, setShowSplash] = useState(true);'),
  'single showSplash render': (src.match(/<SplashScreen/g) || []).length === 1,
};

console.log('patched App.jsx:', before, '->', src.length, 'chars');
for (const [k, v] of Object.entries(checks)) console.log((v ? '  ok   ' : '  FAIL ') + k);
if (Object.values(checks).some((v) => !v)) process.exit(1);
