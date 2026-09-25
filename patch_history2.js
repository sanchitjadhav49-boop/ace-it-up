// patch_history2.js - swaps the "My History" section of App.jsx for the
// redesign in part_history_page.jsx:
//   left pane  = mock test cards (+ search / status chips)
//   right pane = every attempt made on the selected mock test
//
// Run: node patch_history2.js
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, 'frontend', 'src', 'App.jsx');

const toCrlf = (text) => text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
const readPart = (file) => toCrlf(
  fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '\n')
);

let src = fs.readFileSync(APP, 'utf8');
const before = src.length;

// --- 1. locate the history section (starts at its banner comment) ----------
const banner = src.indexOf('// MY HISTORY - split view redesign');
if (banner < 0) throw new Error('MY HISTORY banner not found');
const bannerLine = src.lastIndexOf('// ====', banner);
if (bannerLine < 0) throw new Error('MY HISTORY banner divider not found');
const start = src.lastIndexOf('\n', bannerLine) + 1;

// --- 2. locate the end (the HOME section divider) --------------------------
const home = src.indexOf('// HOME screen building blocks', start);
if (home < 0) throw new Error('HOME section divider not found');
const homeLine = src.lastIndexOf('// ------', home);
if (homeLine < 0) throw new Error('HOME section divider line not found');
const end = src.lastIndexOf('\n', homeLine) + 1;

if (end <= start) throw new Error('unexpected section order');

// keep a safety copy of the previous file
fs.writeFileSync(APP + '.bak_history_tests', src, 'utf8');

src = src.slice(0, start) + readPart('part_history_page.jsx') + src.slice(end);

fs.writeFileSync(APP, src, 'utf8');

const section = src.slice(start, start + src.slice(start).indexOf('// HOME screen building blocks'));
const checks = {
  'left pane (tests)': section.includes('hsh-pane--tests'),
  'right pane (attempts)': section.includes('hsh-pane--attempts'),
  'test card component': section.includes('function HshTestCard'),
  'attempt numbering': section.includes('Attempt ${position}'),
  'attempt list sorted': section.includes('hshAgoTime(a.started_at) - hshAgoTime(b.started_at)'),
  'no old hero block': !section.includes('hsh-hero'),
  'no old filter banner': !section.includes('hsh-filtered'),
  'no clipboard art': !section.includes('HshClipboardArt'),
  'HshAttemptCard kept': section.includes('function HshAttemptCard'),
  'props unchanged': src.includes('tests={tests}') && src.includes('onOpenNote={(testId, title) =>'),
};

console.log('patched App.jsx:', before, '->', src.length, 'chars');
for (const [k, v] of Object.entries(checks)) console.log((v ? '  ok   ' : '  FAIL ') + k);
if (Object.values(checks).some((v) => !v)) process.exit(1);
