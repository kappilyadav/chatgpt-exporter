/* Chat Exporter — render page for PDF (browser print → "Save as PDF") and PNG export. Fully local. */
(async function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const status = $('status');
  const params = new URLSearchParams(location.search);
  const id = params.get('job');
  const key = 'printJob:' + id;

  function fail(msg) {
    status.textContent = msg;
    status.style.color = '#ef4444';
  }

  let job;
  try {
    const r = await chrome.storage.local.get(key);
    job = r[key];
  } catch (e) { /* handled below */ }
  if (!job) return fail('This export job has expired. Go back to the chat and export again.');

  await CE.settings.load();
  const mode = job.mode === 'png' ? 'png' : 'pdf';
  let s = Object.assign({}, job.settings);
  let pngWidth = 900;
  let pngScale = 2;
  const FONT_FAMILY = ['sans', 'serif', 'mono'];

  const doc = $('doc');
  const stage = $('stage');
  stage.classList.add('screen');

  function ctx() {
    return { convo: job.convo, messages: job.messages, settings: s };
  }

  function baseName() {
    return job.filename.replace(/\.(pdf|png)$/i, '');
  }

  function renderMath(root, asMathml) {
    if (!window.katex) return;
    root.querySelectorAll('.math[data-tex]').forEach((el) => {
      try {
        window.katex.render(el.getAttribute('data-tex'), el, {
          displayMode: el.classList.contains('math-block'),
          throwOnError: false,
          output: asMathml ? 'mathml' : 'htmlAndMathml'
        });
        el.classList.add('rendered');
      } catch (e) { /* keep TeX source */ }
    });
  }

  async function waitImages(root) {
    const imgs = [...root.querySelectorAll('img')];
    await Promise.all(imgs.map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = r; setTimeout(r, 8000); }))));
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* ignore */ } }
  }

  async function render() {
    const parts = CE.htmlb.build(ctx(), { mode: mode === 'png' ? 'image' : 'print', detailsOpen: true });
    $('page-style').textContent = mode === 'png' ? '' : CE.htmlb.pageCss(s);
    $('doc-style').textContent = parts.css;
    doc.className = 'ce-body theme-' + parts.theme;
    doc.innerHTML = parts.body;
    if (mode === 'png') doc.style.width = pngWidth + 'px';
    else doc.style.width = '';
    document.title = baseName();
    renderMath(doc, mode === 'png');
    await waitImages(doc);
    document.body.style.background = mode === 'pdf' && s.pdfTheme === 'dark' ? '#16171b' : '#e8e8ee';
  }

  // ---------------------------------------------------------------- toolbar
  function ctl(label, input) {
    const l = document.createElement('label');
    l.append(label + ' ');
    l.append(input);
    $('tb-controls').append(l);
    return input;
  }
  function select(key, options, onChange) {
    const sel = document.createElement('select');
    options.forEach(([v, t]) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = t;
      sel.append(o);
    });
    sel.value = String(s[key]);
    sel.addEventListener('change', () => { s[key] = sel.value; CE.settings.set({ [key]: sel.value }); (onChange || render)(); });
    return sel;
  }
  function check(key) {
    const c = document.createElement('input');
    c.type = 'checkbox';
    c.checked = !!s[key];
    c.addEventListener('change', () => { s[key] = c.checked; CE.settings.set({ [key]: c.checked }); render(); });
    return c;
  }
  function number(key, min, max, step) {
    const n = document.createElement('input');
    n.type = 'number';
    n.min = min; n.max = max; n.step = step;
    n.value = s[key];
    n.addEventListener('change', () => {
      const v = Math.max(min, Math.min(max, Number(n.value) || CE.DEFAULTS[key]));
      n.value = v; s[key] = v; CE.settings.set({ [key]: v }); render();
    });
    return n;
  }

  ctl('Theme', select('pdfTheme', [['light', 'Light'], ['dark', 'Dark']]));
  ctl('Font', select('pdfFontFamily', [['sans', 'Sans'], ['serif', 'Serif'], ['mono', 'Mono']]));
  ctl('Size %', number('pdfFontScale', 50, 300, 5));
  if (mode === 'pdf') {
    ctl('Page', select('pdfPageSize', [['A4', 'A4'], ['Letter', 'Letter'], ['Legal', 'Legal'], ['A3', 'A3'], ['A5', 'A5']]));
    ctl('Orientation', select('pdfOrientation', [['portrait', 'Portrait'], ['landscape', 'Landscape']]));
    ctl('Margins', select('pdfMargins', [['narrow', 'Narrow'], ['normal', 'Normal'], ['wide', 'Wide']]));
    ctl('Page numbers', check('pdfPageNumbers'));
    ctl('Contents', check('pdfToc'));
    ctl('Page break per prompt', check('pdfPageBreakPerPrompt'));
  } else {
    const w = document.createElement('input');
    w.type = 'number'; w.min = 480; w.max = 2000; w.step = 20; w.value = pngWidth;
    w.addEventListener('change', () => { pngWidth = Math.max(480, Math.min(2000, Number(w.value) || 900)); render(); });
    ctl('Width px', w);
    const sc = document.createElement('select');
    [['1', '1×'], ['2', '2×'], ['3', '3×']].forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sc.append(o); });
    sc.value = String(pngScale);
    sc.addEventListener('change', () => { pngScale = Number(sc.value); });
    ctl('Scale', sc);
  }

  $('tb-title').textContent = job.convo.title || 'Preview';
  $('tb-close').addEventListener('click', async () => {
    try { await chrome.storage.local.remove(key); } catch (e) { /* ignore */ }
    window.close();
  });

  // ---------------------------------------------------------------- PNG
  // Large chats are split at message boundaries and each part is rasterised from ONLY its own markup,
  // so the cost grows linearly with the conversation instead of re-rendering the whole page per part.
  const MAX_PX = 16000; // browsers cap canvas height around 16–32k device pixels
  const tick = () => new Promise((r) => setTimeout(r, 0));
  let busy = false;

  function outerHeight(el) {
    const cs = getComputedStyle(el);
    return el.getBoundingClientRect().height + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
  }

  async function exportPng() {
    if (busy) return;
    busy = true;
    $('tb-action').disabled = true;
    try {
      const W = pngWidth;
      const css = $('doc-style').textContent;
      const bg = getComputedStyle(doc).backgroundColor || '#fff';
      const totalH = Math.ceil(doc.scrollHeight);

      // Very tall chats: 1x keeps the file size and time sane.
      let scale = pngScale;
      if (totalH > 30000 && scale > 1) scale = 1;
      const maxH = Math.floor(MAX_PX / scale);
      const budget = maxH - 80; // leave room for the container padding

      // Group top-level blocks (header, messages, footer) into parts that fit one image.
      const kids = [...doc.children];
      const parts = [];
      let cur = [];
      let curH = 0;
      kids.forEach((el) => {
        const h = outerHeight(el);
        if (cur.length && curH + h > budget) { parts.push(cur); cur = []; curH = 0; }
        cur.push(el);
        curH += h;
      });
      if (cur.length) parts.push(cur);

      const styleTag = '<style>' + css.replace(/</g, '&lt;') + '</style>';
      const rendered = []; // {blob, h}
      let imageCount = 0;

      for (let pi = 0; pi < parts.length; pi++) {
        $('tb-hint').textContent = 'Rendering part ' + (pi + 1) + ' of ' + parts.length + '…';
        await tick();

        // Measure this part exactly in the live page (same CSS), then serialise it.
        const holder = document.createElement('div');
        holder.className = doc.className;
        holder.style.cssText = 'position:absolute;left:-99999px;top:0;width:' + W + 'px;';
        parts[pi].forEach((el) => holder.append(el.cloneNode(true)));
        document.body.append(holder);
        const H = Math.ceil(holder.offsetHeight);
        holder.style.cssText = 'width:' + W + 'px;';
        const inner = new XMLSerializer().serializeToString(holder);
        holder.remove();

        const slices = Math.max(1, Math.ceil(H / maxH));
        for (let si = 0; si < slices; si++) {
          const y = si * maxH;
          const h = Math.min(maxH, H - y);
          const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + h + '"><foreignObject x="0" y="' + (-y) + '" width="' + W + '" height="' + H + '">' +
            '<div xmlns="http://www.w3.org/1999/xhtml" style="width:' + W + 'px;height:' + H + 'px;background:' + bg + '">' + styleTag + inner + '</div></foreignObject></svg>';
          const img = new Image();
          await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = () => rej(new Error('Could not rasterise part ' + (pi + 1)));
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
          });
          const c = document.createElement('canvas');
          c.width = Math.round(W * scale);
          c.height = Math.max(1, Math.round(h * scale));
          const g = c.getContext('2d');
          g.fillStyle = bg;
          g.fillRect(0, 0, c.width, c.height);
          g.scale(scale, scale);
          g.drawImage(img, 0, 0);
          const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
          if (!blob) throw new Error('Canvas export failed (image too large)');
          rendered.push(blob);
          imageCount++;
          c.width = c.height = 0; // release the canvas memory right away
        }
      }

      let out;
      let name;
      if (rendered.length === 1) {
        out = rendered[0];
        name = baseName() + '.png';
      } else {
        $('tb-hint').textContent = 'Packing ' + rendered.length + ' images…';
        await tick();
        const files = [];
        for (let i = 0; i < rendered.length; i++) {
          files.push({ name: baseName() + ' - ' + String(i + 1).padStart(2, '0') + '.png', data: new Uint8Array(await rendered[i].arrayBuffer()), compress: false });
        }
        out = await CE.zip.create(files);
        name = baseName() + ' (PNG).zip';
      }
      const url = URL.createObjectURL(out);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      $('tb-hint').textContent = (imageCount > 1 ? 'Saved ' + imageCount + ' images as ZIP' : 'Saved ' + name) + (scale !== pngScale ? ' (1× to keep it fast for a long chat)' : '');
    } finally {
      busy = false;
      $('tb-action').disabled = false;
    }
  }

  // ---------------------------------------------------------------- go
  try {
    status.hidden = true;
    $('toolbar').hidden = false;
    if (mode === 'pdf') {
      $('tb-action').textContent = 'Print / Save as PDF';
      $('tb-hint').textContent = 'Choose “Save as PDF” as the destination.';
      $('tb-action').addEventListener('click', () => window.print());
      await render();
      if (s.pdfAutoPrint !== false) setTimeout(() => window.print(), 350);
    } else {
      $('tb-action').textContent = 'Download PNG';
      $('tb-action').addEventListener('click', () => exportPng().catch((e) => { $('tb-hint').textContent = 'Failed: ' + e.message; }));
      await render();
      exportPng().catch((e) => { $('tb-hint').textContent = 'Failed: ' + e.message; });
    }
  } catch (e) {
    fail('Could not render this export: ' + e.message);
  }
  void FONT_FAMILY;
})();
