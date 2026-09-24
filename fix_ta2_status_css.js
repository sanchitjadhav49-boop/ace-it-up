const fs = require('fs');
const p = 'frontend/src/exam.css';
const css = fs.readFileSync(p, 'utf8');
const line = '.ta2-status--unattempted .ta2-status__icon';
if (css.includes(line)) {
  fs.writeFileSync('check_ta2_classes.out.txt', 'unattempted rule already present\n', 'utf8');
} else {
  const anchor = '.ta2-status--marked .ta2-status__icon';
  const i = css.indexOf(anchor);
  if (i < 0) throw new Error('anchor not found');
  const add = '\r\n' + line + ' { background: var(--ta2-grey-soft); color: var(--ta2-grey); }\r\n';
  fs.writeFileSync(p, css.slice(0, i) + add + css.slice(i), 'utf8');
  fs.writeFileSync('check_ta2_classes.out.txt', 'added unattempted status icon rule\n', 'utf8');
}
