// Builds the Web Store promo tiles (440x280 and 1400x560) from the real UI renders in store-assets/raw (see harness/capture.js).
// Run: node store-assets/promo.js
const fs = require('fs'), cp = require('child_process');
const dir = __dirname, out = dir + '/out', tmp = dir + '/.tmp';
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(tmp, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const raw = (n) => 'file://' + dir + '/raw/' + n;
const dims = {};
for (const f of ['menu.png', 'select.png', 'settings-pdf.png']) { const b = fs.readFileSync(dir + '/raw/' + f); dims[f] = [b.readUInt32BE(16) / 3, b.readUInt32BE(20) / 3]; }
const el = (n, l, t, s, h) => { const [w, hh] = dims[n]; return `<div class=shot style="left:${l}px;top:${t}px;width:${w * s}px;height:${Math.min(h, hh * s)}px"><img src="${raw(n)}" style="width:${w * s}px;display:block"></div>`; };
const page = (w, h, k, body) => `<!doctype html><meta charset=utf-8><style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;overflow:hidden}
body{background:#0b63c9;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;position:relative}
.y{color:#ffd23f;font-weight:800;letter-spacing:-.01em;text-shadow:0 ${3 * k}px 0 #052e66}
.shot{position:absolute;overflow:hidden;border-radius:${12 * k}px ${12 * k}px 0 0;box-shadow:0 0 0 ${2.5 * k}px rgba(255,255,255,.92),0 ${10 * k}px ${28 * k}px rgba(0,20,70,.5);background:#000}
.logo{position:absolute;border-radius:${22 * k}%;box-shadow:0 ${4 * k}px ${14 * k}px rgba(0,0,0,.35)}
</style>${body}`;
const list = (items, fs_, l, t, lh = 1.12) => `<div class="y" style="position:absolute;left:${l}px;top:${t}px;font-size:${fs_}px;line-height:${lh}">${items.map((i) => `<div>${i}</div>`).join('')}</div>`;
const L = ['PDF', 'Word', 'Markdown', 'HTML', 'Text', 'CSV · JSON'];
const tiles = {
  'promo-small-440x280': [440, 280, 1, page(440, 280, 0.5,
    `<img class=logo src="${raw('icon128.png')}" style="left:16px;top:14px;width:50px"><div class=y style="position:absolute;left:76px;top:22px;font-size:30px;line-height:1">ChatGPT Exporter</div>`
    + list(['PDF', 'Word', 'Markdown', 'HTML', 'Text', 'CSV'], 29, 18, 74, 1.1)
    + el('menu.png', 228, 74, 0.6, 260) + el('select.png', 345, 74, 0.55, 260))],
  'promo-marquee-1400x560': [1400, 560, 1, page(1400, 560, 1.6,
    `<img class=logo src="${raw('icon128.png')}" style="left:60px;top:36px;width:104px"><div class=y style="position:absolute;left:186px;top:58px;font-size:66px;line-height:1">ChatGPT Exporter</div>`
    + list(L, 52, 66, 176, 1.1)
    + el('menu.png', 640, 180, 1.0, 380) + el('select.png', 860, 180, 1.0, 380) + el('settings-pdf.png', 1260, 180, 1.0, 380))]
};
for (const [n, [w, h, , html]] of Object.entries(tiles)) {
  const f = `${tmp}/${n}.html`; fs.writeFileSync(f, html);
  const png = `${out}/${n}.png`;
  cp.execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${w},${h}`, '--force-device-scale-factor=3', '--allow-file-access-from-files', `--screenshot=${png}`, 'file://' + f], { stdio: 'ignore' });
  cp.execFileSync('python3', ['-c', `from PIL import Image;im=Image.open("${png}").convert("RGB").crop((0,0,${w * 3},${h * 3})).resize((${w},${h}),Image.LANCZOS);im.save("${png}",optimize=True)`]);
  console.log(n);
}
