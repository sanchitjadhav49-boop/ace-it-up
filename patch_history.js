// patch_history.js - swaps the old HistoryPage for the new split-view one
// (part_history_page.jsx) and hands it the extra props it needs.
//
// Run: node patch_history.js
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, 'frontend', 'src', 'App.jsx');

const toCrlf = (text) => text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
const readPart = (file) => toCrlf(
  fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '\n')
);

let src = fs.readFileSync(APP, 'utf8');
const before = src.length;

// --- 1. replace the HistoryPage component --------------------------------
const start = src.indexOf('function HistoryPage({');
if (start < 0) throw new Error('HistoryPage not found');

const homeMark = '// ---------------------------------------------------------------------------\r\n// HOME screen building blocks';
const homeIdx = src.indexOf(homeMark);
if (homeIdx < 0) throw new Error('HOME section divider not found');
if (homeIdx < start) throw new Error('unexpected order');

src = src.slice(0, start) + readPart('part_history_page.jsx') + '\r\n' + src.slice(homeIdx);

// --- 2. extra props on the call site -------------------------------------
const userIdMark = '        userId={userId}\r\n        onOpenNote={(testId, title) => openNoteForTest({ id: testId, title: title }, \'history\')}';
if (!src.includes(userIdMark)) throw new Error('HistoryPage call site not found');

const extraProps = [
  '        userId={userId}',
  '        tests={tests}',
  '        user={user}',
  '        darkMode={darkMode}',
  '        onToggleDark={() => setDarkMode((v) => !v)}',
  '        showProfileMenu={showProfileMenu}',
  '        setShowProfileMenu={setShowProfileMenu}',
  '        onHome={() => { setResultData(null); setResultError(\'\'); setPhase(\'start\'); }}',
  '        onNotes={openNotes}',
  '        onLogout={handleLogout}',
  '        onOpenNote={(testId, title) => openNoteForTest({ id: testId, title: title }, \'history\')}',
].join('\r\n');

src = src.replace(userIdMark, extraProps);

fs.writeFileSync(APP, src, 'utf8');
console.log('patched App.jsx:', before, '->', src.length, 'chars');
console.log('split view  :', src.includes('hsh-split'));
console.log('picker      :', src.includes('hsh-pickgrid'));
console.log('extra props :', src.includes('onToggleDark={() => setDarkMode((v) => !v)}'));
console.log('old shell   :', src.includes('className="history-page"') ? 'STILL PRESENT' : 'gone');
