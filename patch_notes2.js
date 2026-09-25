// patch_notes2.js - swaps the old NotesPage + NoteEditor in App.jsx for the
// redesigned versions from part_notes_page.jsx / part_note_editor.jsx
// (nts-* design from the demo image, plus editor prompt chips).
//
// Run: node patch_notes2.js
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, 'frontend', 'src', 'App.jsx');

const toCrlf = (text) => text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
const readPart = (file) => toCrlf(
  fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '\n')
);

let src = fs.readFileSync(APP, 'utf8');
const before = src.length;

// --- 1. the NotesPage block (banner comment -> NOTE EDITOR banner) --------
const notesMark = '// NOTES PAGE - every learning note the student has written, plus a starter for';
const notesAt = src.indexOf(notesMark);
if (notesAt < 0) throw new Error('NOTES PAGE banner not found');
const notesDivider = src.lastIndexOf('// ------', notesAt);
if (notesDivider < 0) throw new Error('NOTES PAGE divider not found');
const notesStart = src.lastIndexOf('\n', notesDivider) + 1;

const editorBanner = toCrlf(
  '// ---------------------------------------------------------------------------\n' +
  '// NOTE EDITOR - write (or update) the learning note for one test, with\n' +
  '// one-click prompt chips that seed the usual sections of a good note.\n' +
  '// ---------------------------------------------------------------------------\n'
);
const editorAt = src.indexOf('// NOTE EDITOR - write (or update) the learning note for one test.');
if (editorAt < 0) throw new Error('NOTE EDITOR banner not found');
if (editorAt <= notesStart) throw new Error('unexpected component order');

// --- 2. the end of the NoteEditor block (start of the App component) ------
const appMark = '// App - realistic JEE Main mock-test interface.';
const appAt = src.indexOf(appMark, editorAt);
if (appAt < 0) throw new Error('App banner not found');

fs.writeFileSync(APP + '.bak_notes_v1', src, 'utf8');

const replacement = readPart('part_notes_page.jsx') + '\r\n' + editorBanner + readPart('part_note_editor.jsx') + '\r\n';
src = src.slice(0, notesStart) + replacement + src.slice(appAt);

fs.writeFileSync(APP, src, 'utf8');

const checks = {
  'NotesPage redesigned': src.includes('function NotesPage({ notes, loading, error, onBack, onEdit, onDelete, tests, onNew })'),
  'nts write card': src.includes('Write a note for another test'),
  'nts perks': src.includes('Track your mistakes') && src.includes('Be a better you'),
  'nts empty state': src.includes('Start writing your learnings after each mock test!'),
  'pro tip strip': src.includes('how you{'),
  'editor prompt chips': src.includes('const NTS_PROMPTS'),
  'editor word count': src.includes('characters'),
  'old notes header gone': !src.includes('className="notes-header"'),
  'old note-card gone': !src.includes('className="note-card"'),
  'old editor gone': !src.includes('className="note-editor-page"'),
  'analysis notes tab untouched': src.includes('ta2-note'),
};

console.log('patched App.jsx:', before, '->', src.length, 'chars');
for (const [k, v] of Object.entries(checks)) console.log((v ? '  ok   ' : '  FAIL ') + k);
if (Object.values(checks).some((v) => !v)) process.exit(1);
