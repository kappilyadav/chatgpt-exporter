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

    // ---- original background music (procedural, royalty-free): pad + bass + plucked arp + soft drums, C-Am-F-G at 104 bpm
    async function buildMusic(total, dur) {
      const ctx = new OfflineAudioContext(2, total, SR);
      const bpm = 104, beat = 60 / bpm, bar = beat * 4, mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
      const master = ctx.createGain(), lp = ctx.createBiquadFilter(), comp = ctx.createDynamicsCompressor();
      lp.type = 'lowpass'; lp.frequency.value = 7000; comp.threshold.value = -24; comp.ratio.value = 3;
      master.connect(lp); lp.connect(comp); comp.connect(ctx.destination);
      const dl = ctx.createDelay(1), fb = ctx.createGain(), dlp = ctx.createBiquadFilter(), send = ctx.createGain();
      dl.delayTime.value = beat * 0.75; fb.gain.value = 0.35; dlp.type = 'lowpass'; dlp.frequency.value = 3000; send.gain.value = 0.45;
      send.connect(dl); dl.connect(dlp); dlp.connect(fb); fb.connect(dl); dlp.connect(master);
      const nb = ctx.createBuffer(1, SR, SR), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const env = (g, t, peak, a, d) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
      const noise = (t, type, freq, peak, d, dest) => { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nb; f.type = type; f.frequency.value = freq; s.connect(f); f.connect(g); g.connect(dest); env(g, t, peak, 0.002, d); s.start(t); s.stop(t + d + 0.05); };
      const chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], roots = [36, 33, 29, 31], pattern = [0, 1, 2, 1, 0, 2, 1, 2];
      for (let b = 0, n = Math.ceil(dur / bar) + 1; b < n; b++) {
        const t0 = b * bar, ch = chords[b % 4], root = roots[b % 4];
        for (const note of ch) for (const det of [-7, 7]) {
          const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
          o.type = 'sawtooth'; o.frequency.value = mtof(note); o.detune.value = det; f.type = 'lowpass'; f.frequency.value = 900;
          o.connect(f); f.connect(g); g.connect(master);
          g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.02, t0 + 0.4); g.gain.setValueAtTime(0.02, t0 + bar - 0.35); g.gain.linearRampToValueAtTime(0, t0 + bar + 0.3);
          o.start(t0); o.stop(t0 + bar + 0.35);
        }
        for (let i = 0; i < 8; i++) {
          const t = t0 + i * beat / 2;
          const a = ctx.createOscillator(), ag = ctx.createGain(); a.type = 'triangle'; a.frequency.value = mtof(ch[pattern[i]] + 24);
          a.connect(ag); ag.connect(master); ag.connect(send); env(ag, t, b < 1 ? 0.05 : 0.09, 0.004, 0.32); a.start(t); a.stop(t + 0.4);
          if (b >= 1) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = mtof(root + (i % 4 === 3 ? 12 : 0)); o.connect(g); g.connect(master); env(g, t, 0.2, 0.01, 0.3); o.start(t); o.stop(t + 0.4); }
          if (b >= 2) {
            if (i % 4 === 0) { const k = ctx.createOscillator(), g = ctx.createGain(); k.type = 'sine'; k.frequency.setValueAtTime(140, t); k.frequency.exponentialRampToValueAtTime(45, t + 0.12); k.connect(g); g.connect(master); env(g, t, 0.55, 0.003, 0.2); k.start(t); k.stop(t + 0.3); }
            if (i % 2 === 1) noise(t, 'highpass', 7500, 0.05, 0.05, master);
            if (i === 2 || i === 6) noise(t, 'bandpass', 1800, 0.1, 0.14, master);
          }
        }
      }
      return ctx.startRendering();
    }
    const music = await buildMusic(total, files.length / FPS);
    const ML = music.getChannelData(0), MR = music.getChannelData(1);
    let sum = 0, cnt = 0; for (let i = 0; i < ML.length; i += 7) { sum += ML[i] * ML[i]; cnt++; }
    const MUSIC_RMS = 0.04, DUCK = 0.65;                       // about -28 dBFS, dipping ~3.7 dB under speech
    const norm = MUSIC_RMS / Math.sqrt(sum / cnt);
    const L = mix.getChannelData(0), R = mix.getChannelData(1), speech = timeline.audio.map((a) => [a.start, a.start + a.dur]);
    let env = 1; const k = 1 - Math.exp(-1 / (SR * 0.18)), fadeOut = 2.8, fadeIn = 1.2, endT = total / SR;
    for (let i = 0; i < total; i++) {
      const t = i / SR, talking = speech.some(([a, b]) => t >= a - 0.1 && t <= b + 0.1);
      env += ((talking ? DUCK : 1) - env) * k;
      const fade = Math.min(1, t / fadeIn, (endT - t) / fadeOut);
      const g = norm * env * Math.max(0, fade);
      L[i] = Math.max(-1, Math.min(1, L[i] + ML[i] * g)); R[i] = Math.max(-1, Math.min(1, R[i] + MR[i] * g));
    }
    const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { throw e; } });
    aenc.configure({ codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: 2, bitrate: 128000 });
    const CH = 4800;
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
