// Encodes rendered frames + voiceover into an H.264/AAC MP4 using headless Chrome's WebCodecs + mp4-muxer (no ffmpeg needed).
// Usage: PUPPETEER_PATH=... MUXER_PATH=.../mp4-muxer/build/mp4-muxer.js FRAMES_DIR=... node encode.js [out.mp4]
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require(process.env.PUPPETEER_PATH || 'puppeteer-core');
const FRAMES = process.env.FRAMES_DIR || path.join(__dirname, '.frames');
const OUT = process.argv[2] || path.join(__dirname, 'chatgpt-exporter-explainer.mp4');
const files = fs.readdirSync(FRAMES).filter((f) => f.endsWith('.jpg')).sort();
const timeline = JSON.parse(fs.readFileSync(path.join(__dirname, 'timeline.json'), 'utf8'));
const server = http.createServer((req, res) => {
  if (req.method === 'POST') { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => { fs.writeFileSync(OUT, Buffer.concat(c)); res.end('ok'); }); return; }
  if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<html></html>'); }
  if (req.url === '/muxer.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(fs.readFileSync(process.env.MUXER_PATH)); }
  if (req.url.startsWith('/audio/')) { res.writeHead(200, { 'content-type': 'audio/mpeg' }); return res.end(fs.readFileSync(path.join(__dirname, 'audio', path.basename(req.url)))); }
  const f = path.join(FRAMES, path.basename(req.url)); if (fs.existsSync(f)) { res.writeHead(200, { 'content-type': 'image/jpeg' }); return res.end(fs.readFileSync(f)); }
  res.writeHead(404); res.end();
}).listen(0);
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', protocolTimeout: 0 });
  const page = await browser.newPage(); page.setDefaultTimeout(0);
  await page.goto(`http://localhost:${server.address().port}/`);
  await page.addScriptTag({ url: '/muxer.js' });
  const bytes = await page.evaluate(async (files, timeline) => {
    const W = 1920, H = 1080, FPS = 30, SR = 48000;
    const aacOk = (await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: 2, bitrate: 128000 })).supported;
    if (!aacOk) throw new Error('AAC encoding not supported');
    const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H }, audio: { codec: 'aac', numberOfChannels: 2, sampleRate: SR }, fastStart: 'in-memory' });
    // ---- audio: decode each clip, place it on the timeline, render to one stereo buffer
    const total = Math.ceil((files.length / FPS) * SR);
    const off = new OfflineAudioContext(2, total, SR);
    for (const a of timeline.audio) {
      const buf = await off.decodeAudioData(await (await fetch('/audio/' + a.file)).arrayBuffer());
      const src = off.createBufferSource(); src.buffer = buf; src.connect(off.destination); src.start(a.start);
    }
    const mix = await off.startRendering();
    const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { throw e; } });
    aenc.configure({ codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: 2, bitrate: 128000 });
    const L = mix.getChannelData(0), R = mix.getChannelData(1), CH = 4800;
    for (let i = 0; i < total; i += CH) {
      const n = Math.min(CH, total - i), data = new Float32Array(n * 2);
      data.set(L.subarray(i, i + n), 0); data.set(R.subarray(i, i + n), n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(i * 1e6 / SR), data });
      aenc.encode(ad); ad.close();
    }
    await aenc.flush();
    // ---- video
    const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { throw e; } });
    enc.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: 3_500_000, bitrateMode: 'constant', framerate: FPS });
    const cv = new OffscreenCanvas(W, H), ctx = cv.getContext('2d');
    for (let i = 0; i < files.length; i++) {
      const bmp = await createImageBitmap(await (await fetch('/' + files[i])).blob());
      ctx.drawImage(bmp, 0, 0, W, H); bmp.close();
      const vf = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      enc.encode(vf, { keyFrame: i % 60 === 0 }); vf.close();
      while (enc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 5));
    }
    await enc.flush(); muxer.finalize();
    const out = muxer.target.buffer;
    await fetch('/upload', { method: 'POST', body: out });
    return out.byteLength;
  }, files, timeline);
  console.log('wrote', OUT, Math.round(bytes / 1024) + ' KB', files.length + ' frames, ' + timeline.audio.length + ' audio clips');
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
