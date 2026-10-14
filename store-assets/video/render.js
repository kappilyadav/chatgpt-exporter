// Renders the explainer video frames by driving the REAL extension UI (harness page) with a real mouse.
// Usage: PUPPETEER_PATH=... FRAMES_DIR=... node render.js     then: node encode.js
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require(process.env.PUPPETEER_PATH || 'puppeteer-core');
const ROOT = path.resolve(__dirname, '../..');
const FRAMES = process.env.FRAMES_DIR || path.join(__dirname, '.frames');
fs.rmSync(FRAMES, { recursive: true, force: true }); fs.mkdirSync(FRAMES, { recursive: true });
const FPS = 30, W = 960, H = 540;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (/^\/c\//.test(p)) p = '/store-assets/harness/chat.html';
  const f = path.join(ROOT, p);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } const ext = path.extname(f); res.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png' }[ext] || 'application/octet-stream' }); res.end(d); });
}).listen(0);

const OVERLAY = `
<style>
#v *{box-sizing:border-box}#v{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.lay{position:absolute;inset:0;opacity:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;background:linear-gradient(135deg,#0a4fb8,#1a8cff)}
.lay h1{font-size:54px;font-weight:800;letter-spacing:-.03em;line-height:1.05}.lay p{font-size:22px;opacity:.92;margin-top:12px;font-weight:500}
.lay img.logo{width:92px;border-radius:21px;box-shadow:0 8px 24px rgba(0,0,0,.35);margin-bottom:20px}
.y{color:#ffd23f;text-shadow:0 3px 0 #052e66}
#cap{position:absolute;top:18px;left:24px;max-width:520px;padding:10px 20px;border-radius:14px;background:rgba(6,40,110,.94);color:#ffd23f;font-weight:800;font-size:28px;line-height:1.15;letter-spacing:-.01em;opacity:0;box-shadow:0 6px 24px rgba(0,0,0,.35)}
#cur{position:absolute;left:0;top:0;width:26px;height:26px;opacity:0;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
#rip{position:absolute;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;border:3px solid #6db4ff;opacity:0}
#doc{background:linear-gradient(135deg,#0a4fb8,#1a8cff)}#doc .page{position:absolute;top:92px;left:50%;margin-left:-250px;width:500px;height:460px;overflow:hidden;border-radius:12px 12px 0 0;box-shadow:0 14px 40px rgba(0,20,80,.5);background:#fff}#doc .page img{width:500px;display:block}
#priv .row{display:flex;gap:18px;margin-top:26px}#priv .c{width:250px;background:#fff;color:#1f2330;border-radius:16px;padding:24px 18px;text-align:left;box-shadow:0 10px 30px rgba(0,25,90,.35)}#priv .c b{display:block;font-size:22px;margin:8px 0 6px}#priv .c span{font-size:15px;color:#4b5568;line-height:1.4}#priv .c i{font-style:normal;font-size:34px}
#cta .btn{margin-top:26px;background:#ffd23f;color:#07306e;font-weight:800;font-size:24px;padding:14px 30px;border-radius:99px;box-shadow:0 8px 24px rgba(0,0,0,.3)}
</style>
<div id="v">
 <div class="lay" id="title"><img class="logo" src="/icons/icon128.png"><h1 class="y">ChatGPT Exporter</h1><p>Save any ChatGPT chat as PDF, Word, Markdown &amp; more</p></div>
 <div class="lay" id="doc"><div class="page"><img id="docimg" src="/store-assets/raw/export.png"></div></div>
 <div class="lay" id="priv"><h1>Private by design</h1><p>Your conversations never leave your browser</p><div class="row"><div class="c"><i>🔒</i><b>Runs locally</b><span>Chats are converted inside your browser.</span></div><div class="c"><i>🚫</i><b>No tracking</b><span>No ads, no analytics, no remote code.</span></div><div class="c"><i>⚡</i><b>Instant</b><span>Uses your logged-in session for exact exports.</span></div></div></div>
 <div class="lay" id="cta"><img class="logo" src="/icons/icon128.png"><h1>Export ChatGPT chats <span class="y">in one click</span></h1><p>PDF · Word · Markdown · HTML · Text · JSON · CSV · PNG</p><div class="btn">Free on the Chrome Web Store</div><p style="margin-top:18px;font-size:19px">chatgptexporterfree.com</p></div>
 <div id="cap"></div><svg id="cur" viewBox="0 0 24 24"><path d="M3 2l7 19 3-8 8-3z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg><div id="rip"></div>
</div>`;

(async () => {
  const port = server.address().port;
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${port}/c/6acee611-9928-83ee-a608-c139cab2da2e`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate((html) => {
    document.body.insertAdjacentHTML('beforeend', html);
    window.V = { layers: {}, cap: null, cur: { x: -50, y: -50, vis: 0, click: -9 }, docY: 0 };
    window.update = (t) => {
      const ease = (x) => x * x * (3 - 2 * x), cl = (x) => Math.max(0, Math.min(1, x));
      for (const [id, l] of Object.entries(V.layers)) { const k = ease(cl((t - l.t0) / 0.45)); document.getElementById(id).style.opacity = l.on ? k : 1 - k; document.getElementById(id).style.display = (!l.on && k >= 1) ? 'none' : 'flex'; }
      const c = document.getElementById('cap'); if (V.cap) { c.textContent = V.cap.text; c.style.opacity = V.cap.text ? ease(cl((t - V.cap.t0) / 0.35)) : 0; c.style.transform = `translateY(${(1 - ease(cl((t - V.cap.t0) / 0.35))) * -8}px)`; }
      const cu = document.getElementById('cur'); cu.style.opacity = V.cur.vis; cu.style.transform = `translate(${V.cur.x - 4}px,${V.cur.y - 2}px)`;
      const r = document.getElementById('rip'), dt = t - V.cur.click; r.style.left = V.cur.x + 'px'; r.style.top = V.cur.y + 'px'; r.style.opacity = dt >= 0 && dt < 0.45 ? 1 - dt / 0.45 : 0; r.style.transform = `scale(${0.4 + (dt / 0.45) * 1.1})`;
      document.getElementById('docimg').style.transform = `translateY(${-V.docY}px)`;
    };
  }, OVERLAY);
  // layers start hidden-but-displayed: set initial state
  await page.evaluate(() => { for (const id of ['title', 'doc', 'priv', 'cta']) document.getElementById(id).style.display = 'none'; });
  await new Promise((r) => setTimeout(r, 600)); // let /icons + export.png load

  let t = 0, n = 0, mx = -50, my = -50;
  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const rect = (sel, idx = 0) => ev((sel, idx) => { const r = document.getElementById('chat-exporter-root').shadowRoot; const e = r.querySelectorAll(sel)[idx]; if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height, l: b.x, t: b.y }; }, sel, idx);
  async function frame() {
    await ev((t) => update(t), t);
    await page.screenshot({ path: `${FRAMES}/f${String(n++).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
    t += 1 / FPS;
  }
  const advance = async (sec, per) => { const k = Math.round(sec * FPS); for (let i = 0; i < k; i++) { if (per) await per(i / Math.max(1, k - 1)); await frame(); } };
  const wait = (s) => advance(s);
  const setLayer = (id, on) => { console.log('T', t.toFixed(1), 'layer', id, on ? 'in' : 'out'); return ev((id, on, t) => { V.layers[id] = { on, t0: t }; document.getElementById(id).style.display = 'flex'; }, id, on, t); };
  const cap = (text) => { console.log('T', t.toFixed(1), 'caption', text); return ev((text, t) => { V.cap = { text, t0: t }; }, text, t); };
  const ease = (x) => x * x * (3 - 2 * x);
  async function moveTo(x, y, sec = 0.9) {
    const sx = mx, sy = my;
    await ev(() => { V.cur.vis = 1; });
    await advance(sec, async (p) => { const k = ease(p); mx = sx + (x - sx) * k; my = sy + (y - sy) * k + Math.sin(p * Math.PI) * -12; await page.mouse.move(mx, my); await ev((x, y) => { V.cur.x = x; V.cur.y = y; }, mx, my); });
  }
  const moveToEl = async (sel, idx = 0, sec = 0.9, dx = 0, dy = 0) => { const r = await rect(sel, idx); await moveTo(r.x + dx, r.y + dy, sec); return r; };
  async function click() { await ev((t) => { V.cur.click = t; }, t); await page.mouse.down(); await page.mouse.up(); await advance(0.25); }

  // ---- scene timing is driven by the voiceover clips (audio/1.mp3 ... 8.mp3)
  const AUDIO = path.join(__dirname, 'audio');
  const dur = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => parseFloat(require('child_process').execFileSync('afinfo', [`${AUDIO}/${i}.mp3`]).toString().match(/estimated duration: ([\d.]+)/)[1]));
  const LEAD = 0.25, TAIL = 0.35;
  const timeline = [];
  let sceneEnd = 0;
  const scene = async (i) => { timeline.push({ file: `${i + 1}.mp3`, start: +(t + LEAD).toFixed(3), dur: dur[i] }); sceneEnd = t + LEAD + dur[i] + TAIL; console.log('T', t.toFixed(1), 'scene', i + 1, 'audio', dur[i]); };
  const untilEnd = async () => { if (t < sceneEnd) await wait(sceneEnd - t); else console.log('  (scene ran over by', (t - sceneEnd).toFixed(2), 's)'); };
  const left = () => Math.max(0, sceneEnd - t);

  // 1: title
  await scene(0); await setLayer('title', true); await untilEnd();
  // 2: open a chat, export menu with all formats
  await scene(1); await setLayer('title', false); await cap('Open any ChatGPT conversation');
  mx = 700; my = 330; await ev(() => { V.cur.x = 700; V.cur.y = 330; V.cur.vis = 1; }); await wait(2.4);
  await cap('One click: pick a format');
  await moveToEl('.split', 1, 1.0, 54, 0);
  const caret = await rect('.split', 1); await moveTo(caret.l + caret.w - 18, caret.y, 0.3); await click();
  await wait(0.6);
  const items = [1, 3, 0, 2, 4, 5, 6, 7];
  const per = Math.max(0.3, (left() - 0.3) / items.length - 0.55);
  for (const idx of items) { await moveToEl('.menu.open button', idx, 0.55, -30, 0); await wait(per); }
  await untilEnd();
  // 3: "Eight formats. One menu."
  await scene(2); await cap('8 formats: PDF, Word, Markdown & more');
  await moveToEl('.menu.open button', 3, 0.8, -30, 0); await wait(Math.max(0, left() - 1.6));
  await moveTo(430, 250, 0.7); await click(); await untilEnd();
  // 4: select messages
  await scene(3); await cap('Pick exactly the messages you need');
  await moveToEl('.split', 0, 1.0, -20, 0); await click();
  await ev(() => new Promise((r) => { const i = setInterval(() => { const s = document.getElementById('chat-exporter-root').shadowRoot; if (s.querySelectorAll('.row').length) { clearInterval(i); r(); } }, 100); }));
  await wait(1.2);
  await moveToEl('.presets button', 2, 1.0); await click(); await wait(1.2);
  await moveToEl('.presets button', 1, 0.8); await click(); await wait(1.0);
  await moveToEl('.list .row', 3, 0.8, 40, 0); await click(); await wait(0.6); await click(); await wait(0.6);
  await moveToEl('.presets button', 0, 0.8); await click(); await untilEnd();
  // 5: settings
  await scene(4); await cap('Customise your PDF: size, theme, margins');
  const bars = await ev(() => document.getElementById('chat-exporter-root').shadowRoot.querySelectorAll('.p-bar .iconbtn').length);
  await moveToEl('.p-bar .iconbtn', bars - 1, 0.9); await click(); await wait(1.0);
  const off = await ev(() => { const r = document.getElementById('chat-exporter-root').shadowRoot; const st = r.querySelector('.settings'); const t = [...r.querySelectorAll('.cf-title')].find((e) => /PDF/i.test(e.textContent)); return t.getBoundingClientRect().top - st.getBoundingClientRect().top + st.scrollTop - 6; });
  await moveTo(mx - 90, my + 140, 0.8);
  await advance(3.0, (p) => ev((o, p) => { const st = document.getElementById('chat-exporter-root').shadowRoot.querySelector('.settings'); st.scrollTop = o * p * p * (3 - 2 * p); }, off, p));
  await wait(1.0);
  await moveToEl('.cf-row select', 6, 0.9); await wait(Math.max(0, left() - 1.6));
  await moveToEl('.p-head .iconbtn', 2, 0.8); await click(); await untilEnd();
  await ev(() => { V.cur.vis = 0; });
  // 6: exported document
  await scene(5); await setLayer('doc', true); await cap('Code, tables and math stay perfect');
  await advance(Math.max(1, left() - 0.3), (p) => ev((y) => { V.docY = y; }, 520 * p * p * (3 - 2 * p))); await untilEnd();
  // 7: privacy
  await scene(6); await setLayer('doc', false); await cap(''); await setLayer('priv', true); await untilEnd();
  // 8: call to action
  await scene(7); await setLayer('priv', false); await setLayer('cta', true); await untilEnd(); await wait(0.5);
  fs.writeFileSync(path.join(__dirname, 'timeline.json'), JSON.stringify({ fps: FPS, total: +t.toFixed(3), audio: timeline }, null, 1));
  console.log('frames', n, 'seconds', (n / FPS).toFixed(1));
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
