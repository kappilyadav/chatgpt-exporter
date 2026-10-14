// Builds the YouTube thumbnail (1280x720 PNG) from the real UI render in ../raw. Run: node store-assets/youtube/thumbnail.js
const fs = require('fs'), cp = require('child_process'), path = require('path');
const raw = (n) => 'file://' + path.resolve(__dirname, '../raw/' + n);
const dim = (n) => { const b = fs.readFileSync(path.resolve(__dirname, '../raw/' + n)); return [b.readUInt32BE(16) / 3, b.readUInt32BE(20) / 3]; };
const [mw] = dim('menu.png'), [sw] = dim('select.png');
const html = `<!doctype html><meta charset=utf-8><style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:1280px;height:720px;overflow:hidden}
body{background:linear-gradient(135deg,#0a4fb8,#1a8cff);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;position:relative}
.y{color:#ffd23f;font-weight:900;letter-spacing:-.025em;text-shadow:0 6px 0 #052e66,0 10px 24px rgba(0,0,0,.35)}
.big{position:absolute;left:56px;top:140px;font-size:122px;line-height:.98}
.pill{position:absolute;left:56px;top:44px;background:#fff;color:#0a4fb8;font-weight:800;font-size:30px;padding:10px 26px;border-radius:99px;box-shadow:0 8px 22px rgba(0,25,90,.35)}
.logo{position:absolute;left:56px;bottom:30px;width:92px;border-radius:21px;box-shadow:0 8px 22px rgba(0,0,0,.4)}
.brand{position:absolute;left:166px;bottom:54px;color:#fff;font-weight:800;font-size:44px;letter-spacing:-.02em;text-shadow:0 3px 10px rgba(0,0,0,.35)}
.shot{position:absolute;overflow:hidden;border-radius:18px;box-shadow:0 0 0 5px #fff,0 18px 50px rgba(0,20,70,.55);background:#000}
.shot img{display:block}
.fmt{position:absolute;display:flex;gap:12px;left:56px;top:516px}
.fmt span{background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.55);color:#fff;font-weight:800;font-size:30px;padding:8px 20px;border-radius:12px}
</style>
<div class=pill>FREE CHROME EXTENSION</div>
<div class="big y">Save<br>ChatGPT<br>chats</div>
<div class=fmt><span>PDF</span><span>Word</span><span>Markdown</span></div>
<img class=logo src="${raw('icon128.png')}"><div class=brand>ChatGPT Exporter</div>
<div class=shot style="left:890px;top:50px;width:${mw * 1.7}px;height:670px;border-radius:18px 18px 0 0"><img src="${raw('menu.png')}" style="width:${mw * 1.7}px"></div>
`;
const f = path.join(__dirname, '.thumb.html'); fs.writeFileSync(f, html);
const out = path.join(__dirname, 'thumbnail-1280x720.png');
cp.execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--hide-scrollbars', '--window-size=1280,720', '--force-device-scale-factor=2', '--allow-file-access-from-files', `--screenshot=${out}`, 'file://' + f], { stdio: 'ignore' });
cp.execFileSync('python3', ['-c', `from PIL import Image;im=Image.open("${out}").convert("RGB").crop((0,0,2560,1440)).resize((1280,720),Image.LANCZOS);im.save("${out}",optimize=True)`]);
fs.unlinkSync(f); console.log(out, Math.round(fs.statSync(out).size / 1024) + ' KB');
