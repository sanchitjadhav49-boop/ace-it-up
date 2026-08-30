'use strict';
// Remove the topmost "Physics | Chemistry | Mathematics" section-tabs strip
// (the one showing answered/total counts). The subject+type quick-jump strip
// stays at the top.
const fs = require('fs');

function patchFile(path, pairs) {
  const raw = fs.readFileSync(path, 'utf8');
  const crlf = raw.includes('\r\n');
  const src = raw.replace(/\r\n/g, '\n');
  for (const [oldStr, newStr] of pairs) {
    const n = src.split(oldStr).length - 1;
    if (n !== 1) throw new Error(`${path}: pattern found ${n} times (expected 1): ${oldStr.split('\n')[0].slice(0, 70)}`);
  }
  let out = src;
  for (const [oldStr, newStr] of pairs) out = out.replace(oldStr, newStr);
  fs.writeFileSync(path, crlf ? out.replace(/\n/g, '\r\n') : out, 'utf8');
  console.log('patched', path);
}

// 1) Drop the section-tabs nav (header strip with answered/total counts).
const oldNav = [
  '      <nav className="section-tabs" aria-label="Sections">',
  '        {test.sections.map((s, si) => {',
  '          const st = sectionStats(si);',
  '          return (',
  '            <button',
  '              key={s.id}',
  '              className={`section-tab${si === question.sectionIndex ? \' section-tab--active\' : \'\'}`}',
  '              style={{ \'--subject-color\': SUBJECT_COLORS[s.name] }}',
  '              onClick={() => goToSection(si)}',
  '            >',
  '              <span className="section-tab__name">{s.name}</span>',
  '              <span className="section-tab__count">',
  '                {st.answered}/{st.total}',
  '                {st.marked > 0 ? ` (${st.marked} marked)` : \'\'}',
  '              </span>',
  '            </button>',
  '          );',
  '        })}',
  '      </nav>',
  '',
  '      <nav className="quick-jump" aria-label="Jump to section and question type">',
].join('\n');
const newNav = '      <nav className="quick-jump" aria-label="Jump to section and question type">';

// 2) sectionStats is now unused - remove it.
const oldStats = [
  '  const sectionStats = (sectionIndex) => {',
  '    const qs = allQuestions.filter((q) => q.sectionIndex === sectionIndex);',
  '    return {',
  '      total: qs.length,',
  '      answered: qs.filter((q) => hasAnswer(q)).length,',
  '      marked: qs.filter((q) => answerFor(q) && answerFor(q).status === \'marked_for_review\').length,',
  '    };',
  '  };',
  '',
  '',
].join('\n');
const newStats = '';

// 3) goToSection is only used by the removed tabs - remove it too.
const oldGoToSection = [
  '  const goToSection = (sectionIndex) => {',
  '    const first = allQuestions.findIndex((q) => q.sectionIndex === sectionIndex);',
  '    if (first >= 0) goTo(first);',
  '    setShowPalette(false);',
  '  };',
  '',
  '',
].join('\n');
const newGoToSection = '';

patchFile('frontend/src/App.jsx', [
  [oldNav, newNav],
  [oldStats, newStats],
  [oldGoToSection, newGoToSection],
]);

// 4) Remove the now-dead section-tabs CSS.
const cssPath = 'frontend/src/exam.css';
const rawCss = fs.readFileSync(cssPath, 'utf8');
const crlf = rawCss.includes('\r\n');
const css = rawCss.replace(/\r\n/g, '\n');
const start = css.indexOf('/* =========================== SECTION TABS ============================ */');
const end = css.indexOf('/* ============================== LAYOUT =============================== */');
if (start < 0 || end < 0 || end <= start) throw new Error('section-tabs CSS block not found');
const outCss = css.slice(0, start) + css.slice(end);
fs.writeFileSync(cssPath, crlf ? outCss.replace(/\n/g, '\r\n') : outCss, 'utf8');
console.log('removed section-tabs CSS from', cssPath);
