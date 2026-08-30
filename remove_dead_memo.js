'use strict';
const fs = require('fs');

const appPath = 'frontend/src/App.jsx';
let text = fs.readFileSync(appPath, 'utf8');

// Remove the dead inline timeAnalysis useMemo block:
//   "    // --- Time Analysis: time spent grouped by subject, difficulty, result ---"
//   through "  }, [result.questions]);" (inclusive)
const startMark = '    // --- Time Analysis: time spent grouped by subject, difficulty, result ---';
const endMark = '  }, [result.questions]);';

const si = text.indexOf(startMark);
if (si < 0) {
  console.log('start mark not found - already removed?');
  process.exit(0);
}
const ei = text.indexOf(endMark, si);
if (ei < 0) {
  console.error('end mark not found after start');
  process.exit(1);
}
const block = text.slice(si, ei + endMark.length);
console.log('Removing block:\n' + block.split('\r\n').slice(0, 6).join('\n') + '\n...');
text = text.slice(0, si) + text.slice(ei + endMark.length);

// Clean up the now-empty line (the "\n" that followed the memo and preceded
// the state lines): the block ended with "...];\r\n" and the next line is the
// state line. Removing the block leaves "function Analysis(...) {\r\n\r\n" if a
// blank line followed; collapse double blank line.
text = text.replace('function Analysis({ result, onRetake, onBackHome, backLabel }) {\r\n\r\n\r\n',
                    'function Analysis({ result, onRetake, onBackHome, backLabel }) {\r\n');

fs.writeFileSync(appPath, text, 'utf8');
console.log('Removed. New length:', text.length);
console.log('timeAnalysis still present:', text.includes('const timeAnalysis'));
