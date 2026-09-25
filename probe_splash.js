// probe_splash.js - headless Chrome + DevTools Protocol probe for the splash
// screen: is it in the DOM, is it animating, what are the computed styles?
//
// Run: node probe_splash.js [url] [extra chrome flags...]
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const URL = process.argv[2] || 'http://localhost:5174/';
const EXTRA = process.argv.slice(3);
const PROFILE = path.join(__dirname, '.chrome-probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let chrome;

async function main() {
  if (fs.existsSync(PROFILE)) fs.rmSync(PROFILE, { recursive: true, force: true });

  chrome = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--mute-audio',
    '--window-size=1366,860',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    URL,
    ...EXTRA,
  ], { stdio: 'ignore' });

  let pageWs = null;
  for (let i = 0; i < 60 && !pageWs; i++) {
    await sleep(300);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) pageWs = page.webSocketDebuggerUrl;
    } catch (e) { /* not up yet */ }
  }
  if (!pageWs) throw new Error('devtools page target not reachable');

  const ws = new WebSocket(pageWs);
  const pending = new Map();
  let nextId = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  ws.addEventListener('message', (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data.toString()); } catch (e) { return; }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });

  await send('Runtime.enable');
  const emulated = process.env.EMULATE_MOTION || 'no-preference';
  await send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: emulated }] });
  await send('Page.navigate', { url: URL });
  console.log('emulating prefers-reduced-motion:', emulated);
  await send('Page.enable');

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + JSON.stringify(r.exceptionDetails.exception || {}));
    return r.result.value;
  };

  for (let i = 0; i < 40; i++) {
    const ready = await evaluate('!!document.querySelector("#root") && document.querySelector("#root").childElementCount > 0');
    if (ready) break;
    await sleep(150);
  }

  const info = await evaluate(`(async () => {
    const out = {
      url: location.href,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      samples: [],
    };

    const t0 = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        const el = document.querySelector('.splash-screen');
        const cs = (n) => (n ? getComputedStyle(n) : null);
        const sample = { t: Math.round(performance.now() - t0), splashInDom: !!el };
        if (el) {
          const s = cs(el);
          sample.opacity = s.opacity;
          sample.animation = s.animationName;
          sample.transform = s.transform;
          sample.classList = el.className;
          const sym = cs(document.querySelector('.splash-symbol'));
          const title = cs(document.querySelector('.splash-title'));
          const tag = cs(document.querySelector('.splash-tagline'));
          const bar = cs(document.querySelector('.splash-progress__bar'));
          sample.symbol = sym ? sym.opacity : null;
          sample.title = title ? title.opacity : null;
          sample.tag = tag ? tag.opacity : null;
          sample.bar = bar ? bar.width : null;
          sample.anims = document.getAnimations()
            .filter((a) => a.playState !== 'finished')
            .map((a) => (a.animationName || '?') + '|' + a.playState);
        }
        out.samples.push(sample);
        if (performance.now() - t0 > 6200) resolve(); else setTimeout(tick, 400);
      };
      tick();
    });
    return out;
  })()`);

  console.log('URL            :', info.url);
  console.log('reduced motion :', info.reducedMotion, EXTRA.length ? '(flags: ' + EXTRA.join(' ') + ')' : '');
  for (const s of info.samples) {
    console.log(
      `  t=${String(s.t).padStart(4)}ms splash=${s.splashInDom ? 'yes' : 'no '}` +
      (s.splashInDom
        ? ` opacity=${s.opacity} anim=${s.animation} transform=${s.transform} | symbol=${s.symbol} title=${s.title} tag=${s.tag} bar=${s.bar} | [${s.classList}]`
        : '')
    );
    if (s.anims && s.anims.length) console.log('        running:', s.anims.join(', '));
  }

  ws.close();
  chrome.kill();
}

main().catch((err) => {
  console.error('PROBE ERROR:', err.message);
  if (chrome) chrome.kill();
  process.exit(1);
});
