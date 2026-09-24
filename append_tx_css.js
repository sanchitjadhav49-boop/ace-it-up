// append_tx_css.js - appends the redesigned Time Analysis frame styles
// (tx_time_css.part) to frontend/src/exam.css exactly once.
'use strict';

const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'frontend', 'src', 'exam.css');
const partPath = path.join(__dirname, 'tx_time_css.part');

const MARKER = 'TIME ANALYSIS - redesigned frame';
const css = fs.readFileSync(cssPath, 'utf8');
const part = fs.readFileSync(partPath, 'utf8');

if (css.includes(MARKER)) {
  console.log('Marker already present - replacing the existing block.');

  const start = css.indexOf('/* ====');
  const markerIndex = css.indexOf(MARKER);
  // Walk back to the start of the comment that contains the marker.
  let blockStart = css.lastIndexOf('/* ====', markerIndex);
  if (blockStart === -1) blockStart = markerIndex;
  const next = css.indexOf('/* ====', markerIndex + MARKER.length);
  const blockEnd = next === -1 ? css.length : next;
  const cleaned = css.slice(0, blockStart) + css.slice(blockEnd);
  fs.writeFileSync(cssPath, cleaned.trimEnd() + '\n' + part.trimStart());
  console.log(`Replaced block (start ${blockStart}, end ${blockEnd}).`);
  void start;
} else {
  fs.writeFileSync(cssPath, css.trimEnd() + '\n' + part.trimStart());
  console.log('Appended tx_* Time Analysis styles to exam.css.');
}
