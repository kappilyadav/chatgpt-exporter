// Composes the Web Store screenshots from REAL captures of the extension running on chatgpt.com (store-assets/raw/*.jpg, not committed).
// Run: node store-assets/compose.js   (needs Google Chrome)
const fs = require('fs'), cp = require('child_process');
const dir = __dirname, out = dir + '/out', tmp = dir + '/.tmp';
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(tmp, { recursive: true });
const raw = (n) => 'file://' + dir + '/raw/' + n;
const GRAD = 'linear-gradient(135deg,#0a4fb8 0%,#1a8cff 100%)';
const page = (title, sub, body) => `<!doctype html><meta charset=utf-8><style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:1280px;height:800px;overflow:hidden}
body{background:${GRAD};color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;position:relative}
.head{position:absolute;left:0;right:0;top:28px;text-align:center}.head h1{font-size:62px;font-weight:800;letter-spacing:-.03em;line-height:1.05}.head p{font-size:26px;font-weight:500;opacity:.93;margin-top:10px}
.shot{position:absolute;overflow:hidden;border-radius:14px;box-shadow:0 18px 50px rgba(0,25,90,.55);background:#000}
.shot img{position:absolute;display:block}
.pill{position:absolute;background:#fff;color:#0a4fb8;font-weight:800;font-size:24px;padding:12px 22px;border-radius:99px;box-shadow:0 8px 24px rgba(0,25,90,.35)}
ul.f{position:absolute;list-style:none;font-size:31px;font-weight:700;line-height:1.3}ul.f li{margin:15px 0}ul.f b{color:#bfe0ff}
</style><div class=head><h1>${title}</h1><p>${sub}</p></div>${body}`;
// crop(img, x,y,w,h, left,top, scale)
const crop = (n, x, y, w, h, l, t, s = 1, extra = '') => `<div class=shot style="left:${l}px;top:${t}px;width:${w * s}px;height:${h * s}px;${extra}"><img src="${raw(n)}" style="width:${1568 * s}px;left:${-x * s}px;top:${-y * s}px"></div>`;

const shots = {
  '1-export-menu': page('Export any ChatGPT chat in one click', 'PDF, Word, Markdown, HTML, Text, JSON, CSV or PNG',
    crop('menu.jpg', 400, 40, 1168, 706, 56, 150, 0.92)),
  '2-select-messages': page('Pick exactly the messages you need', 'Questions only, answers only, or tick your own',
    crop('select.jpg', 400, 0, 1168, 746, 56, 150, 0.87)),
  '3-pdf-settings': page('Customise your PDF', 'Page size, margins, theme, fonts, page numbers and more',
    `<ul class=f style="left:90px;top:230px;width:620px"><li><b>✓</b> A4, Letter or Legal</li><li><b>✓</b> Light or dark theme</li><li><b>✓</b> Margins and font size</li><li><b>✓</b> Page numbers</li><li><b>✓</b> Table of contents</li><li><b>✓</b> Page break per prompt</li></ul>`
    + crop('settings-pdf.jpg', 1212, 66, 356, 676, 760, 150, 0.96)),
  '4-formats': page('8 formats, nothing left behind', 'Code, tables, math, images and sources are kept',
    crop('menu.jpg', 1384, 170, 164, 450, 800, 165, 1.35)
    + `<ul class=f style="left:90px;top:210px;width:620px;font-size:34px"><li><b>PDF</b> · <b>Word</b> · <b>Markdown</b></li><li><b>HTML</b> · <b>Text</b> · <b>PNG</b></li><li><b>JSON</b> · <b>CSV</b></li><li style="font-size:26px;font-weight:600;opacity:.92;margin-top:30px">Or copy as rich text straight into Google Docs, Word or Notion</li></ul>`)
};
const privacy = page('Private by design', 'Your conversations never leave your browser',
  `<div style="position:absolute;left:70px;right:70px;top:200px;display:flex;gap:28px">${[['🔒', 'Runs locally', 'Chats are converted inside your browser. Nothing is sent to our servers.'], ['🚫', 'No tracking', 'No ads, no analytics and no remote code.'], ['⚡', 'Instant', 'Uses your logged-in session, so exports are exact and fast.']].map(c => `<div style="flex:1;background:#fff;color:#1f2330;border-radius:20px;padding:40px 30px;box-shadow:0 12px 36px rgba(0,25,90,.35)"><div style="font-size:54px">${c[0]}</div><div style="font-weight:800;font-size:30px;margin:14px 0 10px">${c[1]}</div><div style="font-size:21px;color:#4b5568;line-height:1.45">${c[2]}</div></div>`).join('')}</div>`);
shots['6-private'] = privacy;
if (fs.existsSync(dir + '/raw/export.png')) {
  shots['5-export-result'] = page('Clean, ready-to-share documents', 'Code, tables and math come out perfectly formatted',
    `<div class=shot style="left:290px;top:150px;width:700px;height:650px;border-radius:14px 14px 0 0;background:#fff"><img src="${raw('export.png')}" style="width:700px;left:0;top:0"></div>`);
}
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
for (const [n, html] of Object.entries(shots)) {
  const f = `${tmp}/${n}.html`; fs.writeFileSync(f, html);
  const png = `${out}/${n}.png`;
  cp.execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1280,800', '--force-device-scale-factor=1', '--allow-file-access-from-files', `--screenshot=${png}`, 'file://' + f], { stdio: 'ignore' });
  cp.execFileSync('python3', ['-c', `from PIL import Image;im=Image.open("${png}").convert("RGB").crop((0,0,1280,800));im.save("${png}")`]);
  console.log(n);
}
