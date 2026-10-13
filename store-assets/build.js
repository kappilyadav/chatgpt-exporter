// Generates the Chrome Web Store images (HTML -> PNG via headless Chrome). Run: node store-assets/build.js
const fs = require('fs'), path = require('path'), cp = require('child_process');
globalThis.CE = { ui: {} };
require('../src/ui/styles.js');
const CSS = CE.ui.css.replace(':host{all:initial}', ''), ICON = CE.ui.brandIcon;
const out = __dirname + '/out', tmp = __dirname + '/.tmp';
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(tmp, { recursive: true });

const svg = (d) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = { user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'), bot: svg('<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 14h.01M15 14h.01"/>'), x: svg('<path d="M6 6l12 12M18 6L6 18"/>'), gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>') };

const base = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;overflow:hidden}${CSS}
.ce .dock,.ce .panel,.ce .menu{position:absolute}.ce .panel{display:flex}.ce .menu{display:block}`;

// ---- fake chat page
const chat = (dark, withPanel) => `
<div class="page ${dark ? 'dk' : ''}">
 <aside><div class="ni"></div><div class="ni w"></div><div class="ni"></div><div class="ni w2"></div><div class="ni"></div><div class="ni w"></div><div class="ni w2"></div></aside>
 <main><div class="thread">
  <div class="u">Explain how a hash map handles collisions, with a short Python example.</div>
  <div class="a"><p>A hash map stores values in <b>buckets</b>. When two keys land in the same bucket you have a collision, handled mainly in two ways:</p>
   <ul><li><b>Chaining</b> – each bucket holds a small list of entries.</li><li><b>Open addressing</b> – probe for the next free slot.</li></ul>
   <pre><code>class HashMap:
    def __init__(self, size=8):
        self.buckets = [[] for _ in range(size)]

    def put(self, key, value):
        bucket = self.buckets[hash(key) % len(self.buckets)]
        for pair in bucket:
            if pair[0] == key:
                pair[1] = value
                return
        bucket.append([key, value])</code></pre></div>
  <div class="u">Great. Now compare the time complexity of both approaches.</div>
  <div class="a"><p>With a good hash function both are <b>O(1)</b> on average. Chaining degrades to O(n) when one bucket grows long; open addressing degrades as the load factor approaches 1.</p>
   <table><tr><th>Approach</th><th>Average</th><th>Worst</th></tr><tr><td>Chaining</td><td>O(1)</td><td>O(n)</td></tr><tr><td>Open addressing</td><td>O(1)</td><td>O(n)</td></tr></table></div>
 </div></main>
</div>
<style>.page{position:absolute;inset:0;display:flex;background:#fff;color:#0d0d0d}.page.dk{background:#212121;color:#ececec}
.page aside{width:230px;background:#f9f9f9;padding:18px 12px;display:flex;flex-direction:column;gap:10px}.dk aside{background:#171717}
.ni{height:14px;border-radius:7px;background:#e6e6e6;width:85%}.ni.w{width:65%}.ni.w2{width:75%}.dk .ni{background:#2f2f2f}
.page main{flex:1;display:flex;justify-content:center;padding:34px 0 0;overflow:hidden}.thread{width:640px;display:flex;flex-direction:column;gap:20px;font-size:15px;line-height:1.6}
.u{align-self:flex-end;background:#f4f4f4;padding:10px 16px;border-radius:20px;max-width:75%}.dk .u{background:#303030}
.a ul{margin:8px 0 8px 22px}.a p{margin:0 0 6px}pre{background:#0d0d0d;color:#e6e6e6;border-radius:10px;padding:14px 16px;font:12.5px/1.55 ui-monospace,Menlo,monospace;margin-top:8px}
table{border-collapse:collapse;margin-top:8px;font-size:14px}th,td{border:1px solid #ddd;padding:6px 14px;text-align:left}.dk th,.dk td{border-color:#444}</style>`;

const dock = (extra = '') => `<div class="ce"><div class="dock" style="right:22px;bottom:70px"><button class="toggle"><img src="${ICON}"></button>
 <div class="split"><button class="main">Select</button><button class="caret">▾</button></div>
 <div class="split primary"><button class="main">Export</button><button class="caret" style="color:#fff">▾</button></div></div>${extra}</div>`;

const exportMenu = `<div class="menu" style="right:22px;bottom:70px;transform:translateY(-86px);min-width:200px">
 <div class="hdr">Export as</div>${['Markdown ✓', 'PDF', 'HTML', 'Word (.docx)', 'Text', 'JSON', 'CSV', 'Image (PNG)'].map(f => `<button>${f.replace(' ✓', '')}${f.includes('✓') ? '<span class="check">✓</span>' : ''}</button>`).join('')}
 <div class="sep"></div><button>Copy as Markdown</button><button>Copy rich text (Docs / Notion)</button></div>`;

const rows = [['u', 'Explain how a hash map handles collisions, with a short…', 1], ['a', 'A hash map stores values in buckets. When two keys land in…', 1], ['u', 'Great. Now compare the time complexity of both…', 1], ['a', 'With a good hash function both are O(1) on average. Chaining…', 1], ['u', 'Show me how to resize the table when it gets full.', 0], ['a', 'Resizing means allocating a larger bucket array and re-hashing…', 0]];
const panel = `<div class="panel" style="width:372px;right:0;top:0;bottom:0"><div class="p-head"><span class="ico">${I.gear}</span><h2>Select Messages</h2><button class="iconbtn">${I.x}</button></div>
 <div class="p-tip">Click to tick messages · Shift+click for a range</div>
 <div class="presets"><button>All</button><button>Questions</button><button>Answers</button><button>None</button></div>
 <div class="list">${rows.map(r => `<div class="row ${r[0] == 'u' ? 'user' : ''} ${r[2] ? '' : 'off'}"><input type="checkbox" ${r[2] ? 'checked' : ''}><span class="ri">${r[0] == 'u' ? I.user : I.bot}</span><span class="txt">${r[1]}</span></div>`).join('')}</div>
 <div class="p-bar"><span class="count">4/6</span><span class="grow"></span><label><input type="checkbox"> Expand</label></div>
 <div class="p-foot"><button class="btn cancel">Cancel</button><select class="fmt"><option>PDF</option></select><button class="btn primary">Export</button></div></div>`;

// ---- marketing frame
const GRAD = 'linear-gradient(135deg,#0a4fb8 0%,#1a8cff 100%)';
const frame = (title, sub, inner, w = 1280, h = 800) => `<!doctype html><meta charset=utf-8><style>${base}
html,body{width:${w}px;height:${h}px}body{background:${GRAD};position:relative;color:#fff}
.head{position:absolute;left:0;right:0;top:34px;text-align:center}.head h1{font-size:44px;font-weight:800;letter-spacing:-.02em}.head p{font-size:21px;opacity:.88;margin-top:8px}
.win{position:absolute;left:90px;right:90px;top:158px;bottom:0;border-radius:16px 16px 0 0;overflow:hidden;box-shadow:0 20px 60px rgba(0,20,80,.5);background:#fff}
.bar{height:36px;background:#e8eaed;display:flex;align-items:center;gap:7px;padding:0 14px}.bar i{width:11px;height:11px;border-radius:50%;background:#c4c7cc}.bar span{margin-left:14px;background:#fff;border-radius:12px;padding:3px 16px;font-size:12px;color:#555}
.vp{position:absolute;top:36px;left:0;right:0;bottom:0}</style>
<div class="head"><h1>${title}</h1><p>${sub}</p></div>
<div class="win"><div class="bar"><i></i><i></i><i></i><span>chatgpt.com/c/hash-map-collisions</span></div><div class="vp">${inner}</div></div>`;

const fmtCards = [['Markdown', '.md', '#0a6cd6'], ['PDF', '.pdf', '#e5484d'], ['Word', '.docx', '#2b6cd9'], ['HTML', '.html', '#e8590c'], ['Text', '.txt', '#5f6b7a'], ['JSON', '.json', '#c69026'], ['CSV', '.csv', '#2f9e44'], ['PNG', '.png', '#8e44cf']];
const grid = `<div style="position:absolute;inset:0;background:#f4f6fb;display:grid;grid-template-columns:repeat(4,1fr);gap:22px;padding:44px 52px;align-content:start">${fmtCards.map(c => `<div style="background:#fff;border-radius:16px;padding:26px 20px;box-shadow:0 3px 14px rgba(20,40,90,.1);text-align:center;color:#1f2330"><div style="width:62px;height:76px;margin:0 auto 14px;border-radius:8px;background:${c[2]};color:#fff;font-weight:800;font-size:15px;display:grid;place-items:center">${c[1]}</div><div style="font-weight:700;font-size:19px">${c[0]}</div></div>`).join('')}
<div style="grid-column:1/-1;text-align:center;color:#4b5568;font-size:18px;margin-top:8px">Code blocks · tables · math (LaTeX) · images · citations · reasoning · Canvas</div></div>`;

const docPrev = (dark) => `<div style="position:absolute;inset:0;background:#e9ecf2;display:flex;gap:34px;padding:34px 60px;justify-content:center;color:#1f2330">
 ${[['Light', '#fff', '#1f2330', '#f1f3f7'], ['Dark', '#1e2128', '#eceef3', '#2a2d36']].map(t => `<div style="width:440px;height:560px;border-radius:6px;background:${t[1]};color:${t[2]};box-shadow:0 8px 30px rgba(0,0,0,.2);padding:34px 36px;font-size:13px;line-height:1.6;position:relative"><div style="font-size:22px;font-weight:800">Hash map collisions</div><div style="opacity:.6;font-size:11px;margin:4px 0 16px">ChatGPT · 2026-10-13 14:20</div><div style="font-weight:700;margin-bottom:4px">You</div><p style="margin-bottom:12px">Explain how a hash map handles collisions…</p><div style="font-weight:700;margin-bottom:4px">ChatGPT</div><p style="margin-bottom:10px">A hash map stores values in <b>buckets</b>. Collisions are handled by chaining or open addressing.</p><pre style="background:${t[3]};color:${t[2]};border-radius:8px;padding:10px;font-size:11px;white-space:pre">def put(self, key, value):\n    bucket = self.buckets[\n        hash(key) % len(self.buckets)]\n    bucket.append([key, value])</pre><div style="position:absolute;bottom:12px;left:0;right:0;text-align:center;font-size:10px;opacity:.5">1</div></div>`).join('')}</div>`;

const privacy = `<div style="position:absolute;inset:0;background:#f4f6fb;display:flex;align-items:center;justify-content:center;gap:26px;color:#1f2330;padding:0 60px">
 ${[['🔒', 'Runs locally', 'Conversations are converted in your browser. Nothing is sent to our servers.'], ['👁', 'No tracking', 'No analytics, no ads, no remote code.'], ['⚡', 'Instant', 'Uses your logged-in session, so exports are exact and fast.']].map(c => `<div style="flex:1;background:#fff;border-radius:18px;padding:34px 26px;box-shadow:0 3px 14px rgba(20,40,90,.1)"><div style="font-size:42px">${c[0]}</div><div style="font-weight:800;font-size:23px;margin:12px 0 8px">${c[1]}</div><div style="font-size:16px;color:#4b5568;line-height:1.5">${c[2]}</div></div>`).join('')}</div>`;

const shots = {
  '1-export-menu': frame('Export any ChatGPT chat in one click', 'PDF, Markdown, Word, HTML, Text, JSON, CSV or PNG', chat(false) + dock(exportMenu)),
  '2-select-messages': frame('Pick exactly the messages you need', 'Tick messages, shift-click ranges, or filter questions and answers', chat(true) + dock() + `<div class="ce">${panel}</div>`),
  '3-formats': frame('8 formats, nothing left behind', 'Code, tables, math, images, sources and thought process are kept', grid),
  '4-pdf-themes': frame('Beautiful PDFs, light or dark', 'Page size, fonts, margins, table of contents and page numbers', docPrev()),
  '5-private': frame('Private by design', 'Your conversations never leave your browser', privacy)
};
const tile = (w, h, big) => `<!doctype html><meta charset=utf-8><style>${base}html,body{width:${w}px;height:${h}px}body{background:${GRAD};color:#fff;display:flex;align-items:center;${big ? 'justify-content:center;gap:50px' : 'flex-direction:column;justify-content:center;gap:14px;text-align:center'}}
img.i{width:${big ? 190 : 96}px;border-radius:${big ? 42 : 22}px;box-shadow:0 10px 30px rgba(0,20,80,.4)}h1{font-size:${big ? 66 : 34}px;font-weight:800;letter-spacing:-.02em;line-height:1.08}p{font-size:${big ? 26 : 16.5}px;opacity:.9;margin-top:${big ? 12 : 0}px}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.chips span{background:rgba(255,255,255,.18);padding:6px 14px;border-radius:99px;font-weight:700;font-size:17px}</style>
${big ? `<img class=i src="${ICON}"><div><h1>ChatGPT Exporter</h1><p>Save any ChatGPT chat as PDF, Markdown, Word &amp; more</p><div class=chips>${['PDF', 'Markdown', 'Word', 'HTML', 'JSON', 'CSV', 'PNG'].map(x => `<span>${x}</span>`).join('')}</div></div>` : `<img class=i src="${ICON}"><div><h1>ChatGPT Exporter</h1><p>Export chats to PDF, Markdown, Word &amp; more</p></div>`}`;

const jobs = [...Object.entries(shots).map(([n, h]) => [n, h, 1280, 800]), ['promo-small-440x280', tile(440, 280, false), 440, 280], ['promo-marquee-1400x560', tile(1400, 560, true), 1400, 560]];
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
for (const [n, html, w, h] of jobs) {
  const f = `${tmp}/${n}.html`; fs.writeFileSync(f, html);
  const png = `${out}/${n}.png`;
  cp.execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${w},${h}`, '--force-device-scale-factor=1', `--screenshot=${png}`, 'file://' + f], { stdio: 'ignore' });
  cp.execFileSync('python3', ['-c', `from PIL import Image;im=Image.open("${png}").convert("RGB");im=im.crop((0,0,${w},${h}));im.save("${png}")`]);
  console.log(n, w + 'x' + h);
}
