'use strict';
const mock1 = require('./seed_full_test');
const papers = require('./seed_previous_year_papers').loadPapers();
const bank = [];
for (const sec of mock1.SECTIONS) for (const q of sec.mcq) bank.push({ type: 'mcq', diff: q[3] });
for (const sec of mock1.SECTIONS) for (const q of sec.num) bank.push({ type: 'numerical', diff: q[2] });
for (const p of papers) for (const sec of p.sections) {
  for (const q of sec.mcq) bank.push({ type: 'mcq', diff: q[3] });
  for (const q of sec.num) bank.push({ type: 'numerical', diff: q[2] });
}
console.log('total', bank.length);
for (const d of ['easy', 'moderate', 'difficult']) {
  const mcq = bank.filter(q => q.diff === d && q.type === 'mcq').length;
  const num = bank.filter(q => q.diff === d && q.type === 'numerical').length;
  console.log(d, 'mcq:', mcq, 'num:', num, 'total:', mcq + num);
}
