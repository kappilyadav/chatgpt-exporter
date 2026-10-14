// Composes the Web Store screenshots (1280x800) from high-DPI renders of the REAL extension UI.
// 1) node store-assets/harness/capture.js   -> store-assets/raw/*.png (3x renders of the real content scripts)
// 2) node store-assets/compose.js           -> store-assets/out/*.png (rendered at 2x, downsampled with Lanczos)
const fs = require('fs'), cp = require('child_process');
const dir = __dirname, out = dir + '/out', tmp = dir + '/.tmp';
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(tmp, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const raw = (n) => 'file://' + dir + '/raw/' + n;
const dims = {}; // natural CSS size (px / 3) of each raw png
for (const f of fs.readdirSync(dir + '/raw').filter((x) => x.endsWith('.png'))) {
  const b = fs.readFileSync(dir + '/raw/' + f); dims[f] = [b.readUInt32BE(16) / 3, b.readUInt32BE(20) / 3];
}
// export document render (real HTML export) at 3x
cp.execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--window-size=700,1100', '--force-device-scale-factor=3', '--virtual-time-budget=5000', `--screenshot=${dir}/raw/export.png`, 'file://' + dir + '/raw/export.html'], { stdio: 'ignore' });
dims['export.png'] = [700, 1100];

const SOLID = '#0b63c9', YEL = '#ffd23f';
const GRAD = 'linear-gradient(135deg,#0a4fb8 0%,#1a8cff 100%)';
const base = (bg) => `<!doctype html><meta charset=utf-8><style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:1280px;height:800px;overflow:hidden}
body{background:${bg};color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;position:relative}
.head{position:absolute;left:0;right:0;top:28px;text-align:center}.head h1{font-size:62px;font-weight:800;letter-spacing:-.03em;line-height:1.05}.head p{font-size:26px;font-weight:500;opacity:.93;margin-top:10px}
.y{color:${YEL};font-weight:800;letter-spacing:-.01em;text-shadow:0 3px 0 #052e66}
.bul{position:absolute;left:50px;top:36px;font-size:50px;line-height:1.2;width:1190px}
.shot{position:absolute;overflow:hidden;border-radius:14px 14px 0 0;box-shadow:0 0 0 3px rgba(255,255,255,.92),0 16px 40px rgba(0,20,70,.5);background:#000}
.shot.full{border-radius:14px}.shot img{display:block}
.logo{position:absolute;left:60px;top:40px;width:104px;border-radius:24px;box-shadow:0 6px 18px rgba(0,0,0,.35)}
.t{position:absolute;left:186px;top:58px;font-size:56px;line-height:1}.list{position:absolute;left:60px;top:180px;font-size:66px;line-height:1.12}
ul.f{position:absolute;list-style:none;font-size:31px;font-weight:700;line-height:1.3}ul.f li{margin:15px 0}ul.f b{color:#bfe0ff}
</style>`;
// el(name, left, top, scale, maxHeight?)  - whole raw render shown at `scale` x its CSS size, clipped to maxHeight
const el = (n, l, t, s, h, cls = '') => { const [w, hh] = dims[n]; return `<div class="shot ${cls}" style="left:${l}px;top:${t}px;width:${w * s}px;height:${Math.min(h || 9999, hh * s)}px"><img src="${raw(n)}" style="width:${w * s}px"></div>`; };
const page = (title, sub, body, bg = GRAD) => base(bg) + `<div class=head><h1>${title}</h1><p>${sub}</p></div>${body}`;
const browser = (inner) => `<div style="position:absolute;left:90px;right:90px;top:196px;bottom:0;border-radius:14px 14px 0 0;overflow:hidden;box-shadow:0 20px 60px rgba(0,20,80,.5);background:#fff"><div style="height:36px;background:#e8eaed;display:flex;align-items:center;gap:7px;padding:0 14px"><i style="width:11px;height:11px;border-radius:50%;background:#c4c7cc"></i><i style="width:11px;height:11px;border-radius:50%;background:#c4c7cc"></i><i style="width:11px;height:11px;border-radius:50%;background:#c4c7cc"></i><span style="margin-left:14px;background:#fff;border-radius:12px;padding:3px 16px;font-size:12px;color:#555">chatgpt.com/c/hash-map-collisions</span></div><div style="position:absolute;top:36px;left:0;right:0;bottom:0;overflow:hidden"><img src="${raw(inner)}" style="width:1100px;display:block"></div></div>`;

const shots = {
  'hero-1-features': base(SOLID) + `<div class="bul y"><div>- Export to PDF, Word, Markdown, HTML ...</div><div>- Export only the messages you need</div><div>- Customise your PDF and file names</div><div>- Keeps code, tables, math and images</div></div>`
    + el('menu.png', 60, 322, 1.3, 520) + el('select.png', 330, 322, 1.15, 520) + el('settings-pdf.png', 790, 322, 1.15, 520),
  'hero-2-formats': base(SOLID) + `<img class=logo src="${raw('icon128.png')}"><div class="t y">ChatGPT Exporter</div><div class="list y"><div>PDF</div><div>Word</div><div>Markdown</div><div>HTML</div><div>Text</div><div>CSV · JSON</div></div>`
    + el('menu.png', 570, 190, 1.5, 700) + el('select.png', 860, 190, 1.1, 700),
  '1-export-menu': page('Export any ChatGPT chat in one click', 'PDF, Word, Markdown, HTML, Text, JSON, CSV or PNG', browser('scene-menu.png')),
  '2-select-messages': page('Pick exactly the messages you need', 'Questions only, answers only, or tick your own', browser('scene-select.png')),
  '3-pdf-settings': page('Customise your PDF', 'Page size, margins, theme, fonts, page numbers and more',
    `<ul class=f style="left:90px;top:230px;width:620px"><li><b>✓</b> A4, Letter or Legal</li><li><b>✓</b> Light or dark theme</li><li><b>✓</b> Margins and font size</li><li><b>✓</b> Page numbers</li><li><b>✓</b> Table of contents</li><li><b>✓</b> Page break per prompt</li></ul>` + el('settings-pdf.png', 740, 160, 1.12, 640)),
  '4-formats': page('8 formats, nothing left behind', 'Code, tables, math, images and sources are kept',
    `<ul class=f style="left:90px;top:210px;width:620px;font-size:34px"><li><b>PDF</b> · <b>Word</b> · <b>Markdown</b></li><li><b>HTML</b> · <b>Text</b> · <b>PNG</b></li><li><b>JSON</b> · <b>CSV</b></li><li style="font-size:26px;font-weight:600;opacity:.92;margin-top:30px">Or copy as rich text straight into Google Docs, Word or Notion</li></ul>` + el('menu.png', 800, 160, 1.4, 640)),
  '5-export-result': page('Clean, ready-to-share documents', 'Code, tables and math come out perfectly formatted',
    `<div class=shot style="left:290px;top:150px;width:700px;height:650px;background:#fff"><img src="${raw('export.png')}" style="width:700px"></div>`),
  '6-private': page('Private by design', 'Your conversations never leave your browser',
    `<div style="position:absolute;left:70px;right:70px;top:200px;display:flex;gap:28px">${[['🔒', 'Runs locally', 'Chats are converted inside your browser. Nothing is sent to our servers.'], ['🚫', 'No tracking', 'No ads, no analytics and no remote code.'], ['⚡', 'Instant', 'Uses your logged-in session, so exports are exact and fast.']].map((c) => `<div style="flex:1;background:#fff;color:#1f2330;border-radius:20px;padding:40px 30px;box-shadow:0 12px 36px rgba(0,25,90,.35)"><div style="font-size:54px">${c[0]}</div><div style="font-weight:800;font-size:30px;margin:14px 0 10px">${c[1]}</div><div style="font-size:21px;color:#4b5568;line-height:1.45">${c[2]}</div></div>`).join('')}</div>`)
};
fs.copyFileSync(dir + '/../icons/icon128.png', dir + '/raw/icon128.png');
for (const [n, html] of Object.entries(shots)) {
  const f = `${tmp}/${n}.html`; fs.writeFileSync(f, html);
  const png = `${out}/${n}.png`;
  cp.execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1280,800', '--force-device-scale-factor=2', '--allow-file-access-from-files', `--screenshot=${png}`, 'file://' + f], { stdio: 'ignore' });
  cp.execFileSync('python3', ['-c', `from PIL import Image;im=Image.open("${png}").convert("RGB").crop((0,0,2560,1600)).resize((1280,800),Image.LANCZOS);im.save("${png}",optimize=True)`]);
  console.log(n);
}
