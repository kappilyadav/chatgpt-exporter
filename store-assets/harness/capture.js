// Renders the REAL extension UI (content scripts + stylesheet) on a mock chat page at high DPI.
// Run: node store-assets/harness/capture.js   (needs `npm i puppeteer-core` somewhere on NODE_PATH, and Google Chrome)
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require(process.env.PUPPETEER_PATH || 'puppeteer-core');
const ROOT = path.resolve(__dirname, '../..'), OUT = path.resolve(__dirname, '../raw');
fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (/^\/c\//.test(p)) p = '/store-assets/harness/chat.html';
  const f = path.join(ROOT, p);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); res.end(d); });
}).listen(0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const port = server.address().port;
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 700, deviceScaleFactor: 3 });
  await page.goto(`http://localhost:${port}/c/6acee611-9928-83ee-a608-c139cab2da2e`, { waitUntil: 'load' });
  await sleep(1500);
  const sr = () => page.evaluateHandle(() => document.getElementById('chat-exporter-root').shadowRoot);
  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const shot = async (name, sel, pad = 0) => {
    const r = await ev((sel) => { const el = document.getElementById('chat-exporter-root').shadowRoot.querySelector(sel); const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }, sel);
    await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.width + pad * 2, height: r.height + pad * 2 } });
    console.log(name, Math.round(r.width) + 'x' + Math.round(r.height));
  };
  await page.screenshot({ path: `${OUT}/scene-dock.png` });
  // export menu
  await ev(() => document.getElementById('chat-exporter-root').shadowRoot.querySelectorAll('.split')[1].querySelector('.caret').click());
  await sleep(400);
  await page.screenshot({ path: `${OUT}/scene-menu.png` });
  console.log(await ev(() => JSON.stringify(document.getElementById('chat-exporter-root').shadowRoot.querySelector('.menu.open').getBoundingClientRect())));
  // (an element-clip screenshot resizes the viewport, which closes the menu, so crop the full-page shot instead)
  const mr = await ev(() => { const b = document.getElementById('chat-exporter-root').shadowRoot.querySelector('.menu.open').getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; });
  require('child_process').execFileSync('python3', ['-c', `from PIL import Image;im=Image.open("${OUT}/scene-menu.png");x,y,w,h=[v*3 for v in ${JSON.stringify(mr)}];im.crop((round(x),round(y),round(x+w),round(y+h))).save("${OUT}/menu.png")`]);
  await page.mouse.click(10, 10); await sleep(300);
  // select panel (answers preset)
  await ev(() => document.getElementById('chat-exporter-root').shadowRoot.querySelectorAll('.split')[0].querySelector('.main').click());
  await sleep(2500);
  await ev(() => { const r = document.getElementById('chat-exporter-root').shadowRoot; [...r.querySelectorAll('.presets button')][2].click(); });
  await sleep(500);
  await page.screenshot({ path: `${OUT}/scene-select.png` });
  await shot('select', '.panel');
  // settings
  await ev(() => { const r = document.getElementById('chat-exporter-root').shadowRoot; const b = r.querySelectorAll('.p-bar .iconbtn'); b[b.length - 1].click(); });
  await sleep(600);
  await shot('settings-top', '.panel');
  await ev(() => { const r = document.getElementById('chat-exporter-root').shadowRoot; const st = r.querySelector('.settings'); const t = [...r.querySelectorAll('.cf-title')].find((e) => /PDF/i.test(e.textContent)); st.scrollTop = t.getBoundingClientRect().top - st.getBoundingClientRect().top + st.scrollTop - 6; });
  await sleep(400);
  await page.screenshot({ path: `${OUT}/scene-settings.png` });
  await shot('settings-pdf', '.panel');
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
