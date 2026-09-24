'use strict';
// Repairs the "Something went wrong / Request failed (500)" failure:
//  1. app.js  - never let the API die silently, always answer with JSON.
//     * pool 'error' listener (an idle pg client error used to kill node)
//     * process-level unhandledRejection / uncaughtException logging
//     * GET /api/health so launchers can wait for the API to be ready
//     * JSON error-handler middleware (Express' default HTML 500 body made the
//       frontend show the useless "Request failed (500)")
//  2. frontend/src/App.jsx - api() now explains a non-JSON/proxy failure
//  3. start-app.ps1 - start the API first, wait for /api/health, then the FE.

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

function patch(file, edits) {
  const state = readNormalised(file);
  for (const [label, from, to] of edits) {
    const first = state.text.indexOf(from);
    if (first === -1) {
      console.log('SKIP  ' + file + ' :: ' + label + ' (anchor not found -> already applied?)');
      continue;
    }
    if (state.text.indexOf(from, first + 1) !== -1) {
      throw new Error('anchor not unique in ' + file + ': ' + label);
    }
    state.text = state.text.slice(0, first) + to + state.text.slice(first + from.length);
    console.log('PATCH ' + file + ' :: ' + label);
  }
  writeBack(file, state);
}

const root = __dirname;

// ---------------------------------------------------------------------------
// 1. app.js
// ---------------------------------------------------------------------------
const POOL_ANCHOR = `const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});`;

const POOL_PATCH = `const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});

// A single idle-client error (network blip, DB restart) emits 'error' on the
// pool; with no listener that is an unhandled 'error' event and node exits,
// which is what turns the whole app into "Request failed (500)".
pool.on('error', (err) => {
  console.error('[pg pool error]', (err && err.message) || err);
});

// Same idea at the process level: log and keep serving instead of dying.
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', (err && err.stack) || err);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', (err && err.stack) || err);
});`;

const ROUTES_TAIL = `app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});`;

const ROUTES_TAIL_PATCH = `// Liveness probe: launchers wait on this before opening the frontend, and the
// frontend can tell "API is down" apart from "API returned an error".
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'up', uptime_seconds: Math.round(process.uptime()) });
  } catch (err) {
    res.status(503).json({ ok: false, db: 'down', error: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

// Express' default error handler answers with an HTML stack trace, which the
// frontend turns into the opaque "Request failed (500)". Always send JSON.
app.use((err, req, res, next) => {
  const status = (err && err.status) || 500;
  console.error('[api error]', req.method, req.originalUrl, (err && err.stack) || err);
  if (res.headersSent) return next(err);
  res.status(status).json({ error: (err && err.message) || 'internal server error' });
});`;

patch(path.join(root, 'app.js'), [
  ['pool error listener + process guards', POOL_ANCHOR, POOL_PATCH],
  ['health route + JSON error handler', ROUTES_TAIL, ROUTES_TAIL_PATCH],
]);

// ---------------------------------------------------------------------------
// 2. frontend/src/App.jsx - readable failure message
// ---------------------------------------------------------------------------
const API_ANCHOR_OLD = `  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || \`Request failed (\${res.status})\`);
    err.status = res.status;
    throw err;
  }`;

const API_ANCHOR_NEW = `  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // No JSON body means we never reached the API (Vite proxy / hosting layer
    // answered instead) - say so, because "Request failed (500)" on its own is
    // impossible to debug.
    const message = body.error || (res.status >= 500
      ? 'Cannot reach the Ace It Up API. Make sure the backend is running on port 3000 (start-app.bat), then reload.'
      : \`Request failed (\${res.status})\`);
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }`;

patch(path.join(root, 'frontend', 'src', 'App.jsx'), [
  ['clearer API failure message', API_ANCHOR_OLD, API_ANCHOR_NEW],
]);

// ---------------------------------------------------------------------------
// 3. start-app.ps1 - API first, wait for health, then frontend
// ---------------------------------------------------------------------------
const LAUNCHER = `# Starts the Ace It Up API and the Vite frontend, in that order.
# The frontend proxies /tests, /attempts and /api to http://localhost:3000, so
# the API MUST be listening before the app is opened - otherwise every call
# comes back as "Request failed (500)".
$root  = Split-Path -Parent $MyInvocation.MyCommand.Path
$node  = Join-Path $root 'node-v22.23.2-win-x64'
$log   = Join-Path $root 'api.log'

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 700

$env:Path = $node + ';' + $env:Path

$api = Start-Process powershell -ArgumentList '-NoExit', '-Command', \`
  "cd '$root'; \`$env:Path = '$node;' + \`$env:Path; node app.js *>> '$log'" -PassThru

Write-Host 'Waiting for the API on http://localhost:3000 ...'
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $r = Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch { }
}

if ($ready) {
  Write-Host 'API is up.' -ForegroundColor Green
} else {
  Write-Host 'API did not come up in 20s - last log lines:' -ForegroundColor Red
  if (Test-Path $log) { Get-Content $log -Tail 20 }
  Write-Host 'Fix the API error above, then run this script again.'
  exit 1
}

Start-Process powershell -ArgumentList '-NoExit', '-Command', \`
  "cd '$root\\frontend'; \`$env:Path = '$node;' + \`$env:Path; node ..\\node-v22.23.2-win-x64\\node_modules\\npm\\bin\\npm-cli.js run dev"

Write-Host 'Frontend starting on http://localhost:5174' -ForegroundColor Green
`;

fs.writeFileSync(path.join(root, 'start-app.ps1'), LAUNCHER.replace(/\n/g, '\r\n'), 'utf8');
console.log('WROTE start-app.ps1');
