'use strict';
// Second half of patch_fix_500.js: the two anchors live in blocks whose lines
// are separated by blank lines ("\n\n"), so match with whitespace-tolerant
// regexes instead of literal strings.

const fs = require('fs');
const path = require('path');

function readNormalised(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const bom = raw.charCodeAt(0) === 0xfeff;
  const body = bom ? raw.slice(1) : raw;
  const eol = body.includes('\r\n') ? '\r\n' : '\n';
  return { bom, eol, text: body.replace(/\r\n/g, '\n') };
}

function writeBack(file, { bom, eol, text }) {
  fs.writeFileSync(file, (bom ? '\uFEFF' : '') + text.replace(/\n/g, eol), 'utf8');
}

function patch(file, label, regex, replacement, alreadyRegex) {
  const state = readNormalised(file);
  if (alreadyRegex && alreadyRegex.test(state.text)) {
    console.log('SKIP  ' + file + ' :: ' + label + ' (already applied)');
    return;
  }
  const m = state.text.match(regex);
  if (!m) {
    console.log('SKIP  ' + file + ' :: ' + label + ' (anchor not found)');
    return;
  }
  const occurred = state.text.split(m[0]).length - 1;
  if (occurred !== 1) throw new Error('anchor not unique in ' + file + ': ' + label + ' (' + occurred + ')');
  state.text = state.text.replace(m[0], replacement);
  writeBack(file, state);
  console.log('PATCH ' + file + ' :: ' + label);
}

const root = __dirname;

// --- app.js: pool error listener + process guards --------------------------
const poolRe = /const pool = new Pool\(\{\n\n[^\n]*connectionString[^\n]*\n\n\}\);/;

const poolNew = `const pool = new Pool({

  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',

});

// A single idle-client error (network blip, DB restart) is emitted as an
// 'error' event on the pool; with no listener that crashes node and every
// later request dies with "Request failed (500)".
pool.on('error', (err) => {

  console.error('[pg pool error]', (err && err.message) || err);

});

// Same idea process-wide: log loudly and keep serving instead of exiting.
process.on('unhandledRejection', (err) => {

  console.error('[unhandledRejection]', (err && err.stack) || err);

});

process.on('uncaughtException', (err) => {

  console.error('[uncaughtException]', (err && err.stack) || err);

});`;

patch(path.join(root, 'app.js'), 'pool error listener + process guards', poolRe, poolNew, /pool\.on\('error'/);

// --- frontend/src/App.jsx: readable failure message -------------------------
const apiRe = /const body = await res\.json\(\)\.catch\(\(\) => \(\{\}\)\);\n\n\s*if \(!res\.ok\) \{\n\n\s*const err = new Error\(body\.error \|\| `Request failed \(\$\{res\.status\}\)`\);\n\n\s*err\.status = res\.status;\n\n\s*throw err;\n\n\s*\}/;

const apiNew = `const body = await res.json().catch(() => ({}));

  if (!res.ok) {

    // No JSON body means we never reached the API (the Vite dev proxy or the
    // hosting layer answered instead) - say that, because a bare
    // "Request failed (500)" is impossible to debug.
    const message = body.error || (res.status >= 500
      ? 'Cannot reach the Ace It Up API. Make sure the backend is running on port 3000 (start-app.bat), then reload.'
      : \`Request failed (\${res.status})\`);

    const err = new Error(message);

    err.status = res.status;

    throw err;

  }`;

patch(path.join(root, 'frontend', 'src', 'App.jsx'), 'clearer API failure message', apiRe, apiNew, /Cannot reach the Ace It Up API/);
