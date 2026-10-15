#!/usr/bin/env node
/* Translation tests.
 *   1. Static: every locale has every key, placeholders survive, language detection maps browser codes correctly.
 *   2. Real Chrome: loads the unpacked extension and checks the popup, settings page, PDF preview page, the in-page
 *      panel (on a mocked chatgpt.com), the right-click menu built by the worker, and the manifest name.
 *
 * Run:  node scripts/test-i18n.js            (needs `npm i puppeteer-core` on NODE_PATH or PUPPETEER_PATH, and Google Chrome)
 *       node scripts/test-i18n.js --static   (part 1 only; no browser needed)
 *       SHOTS=/some/dir node scripts/test-i18n.js   also writes screenshots (en, de, ar, ja, ru, th)
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const LOCALE_DIR = path.join(ROOT, '_locales');
const CODES = fs.readdirSync(path.join(ROOT, 'scripts/i18n')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
const MSG = {};
CODES.forEach((c) => {
  const j = JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, c, 'messages.json'), 'utf8'));
  MSG[c] = Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v.message]));
});
const EN = MSG.en;
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? vars[k] : m));
const T = (c, k, vars) => fill(MSG[c][k], vars);
const RTL = new Set(['ar', 'he']);

let failures = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { failures++; console.log('  FAIL ' + msg); } }
const eq = (a, b, msg) => ok(a === b, msg + '\n       got:      ' + JSON.stringify(a) + '\n       expected: ' + JSON.stringify(b));

// ------------------------------------------------------------------ 1. static
async function staticTests() {
  console.log('\n[1] static checks, ' + CODES.length + ' locales');
  const ctx = vm.createContext({});
  ctx.globalThis = ctx;
  ['ns.js', 'locales.js', 'i18n.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/core', f), 'utf8'), ctx, { filename: f }));
  const CE = ctx.CE;
  const runtimeKeys = Object.keys(EN).filter((k) => !/^(ext|cmd)[A-Z]/.test(k));

  [['nb', 'no'], ['iw', 'he']].forEach(([a, b]) => eq(fs.readFileSync(path.join(LOCALE_DIR, a, 'messages.json'), 'utf8'), fs.readFileSync(path.join(LOCALE_DIR, b, 'messages.json'), 'utf8'), '_locales/' + a + ' is a copy of _locales/' + b));
  ok(CE.i18n.available().length === CODES.length, 'bundle has all locales: ' + CE.i18n.available().length + ' vs ' + CODES.length);
  const identical = [];
  CODES.forEach((c) => {
    eq(CE.i18n.set(c), c, 'set(' + c + ')');
    eq(CE.i18n.dir(), RTL.has(c) ? 'rtl' : 'ltr', 'dir for ' + c);
    let same = 0;
    runtimeKeys.forEach((k) => {
      const v = CE.t(k);
      ok(v, c + '.' + k + ' resolves');
      eq(v, MSG[c][k], c + '.' + k + ' bundle matches _locales');
      if (c !== 'en' && v === EN[k]) same++;
    });
    const out = CE.t('exportedN', { n: 7, fmt: 'PDF' });
    ok(out.includes('7') && out.includes('PDF'), c + ' placeholders substituted: ' + out);
    if (c !== 'en') identical.push([c, same]);
  });
  const worst = identical.sort((a, b) => b[1] - a[1]).slice(0, 5).map((x) => x.join(':')).join(' ');
  console.log('  keys identical to English (most first): ' + worst + '  of ' + runtimeKeys.length);
  identical.forEach(([c, n]) => ok(n <= runtimeKeys.length * 0.3, c + ' looks untranslated (' + n + ' keys equal English)'));

  const map = {
    'zh-TW': 'zh_TW', 'zh-HK': 'zh_TW', 'zh-Hant': 'zh_TW', 'zh-CN': 'zh_CN', zh: 'zh_CN', 'zh-Hans-CN': 'zh_CN', 'pt-PT': 'pt_PT', 'pt-BR': 'pt_BR', pt: 'pt_BR',
    'nb-NO': 'no', nn: 'no', no: 'no', iw: 'he', he: 'he', in: 'id', id: 'id', 'es-419': 'es', 'es-MX': 'es', 'en-GB': 'en', 'de-AT': 'de', 'fr-CA': 'fr',
    ar: 'ar', 'ar-EG': 'ar', hi: 'hi', 'ko-KR': 'ko', 'ja-JP': 'ja', 'sr': null, 'fil': null, xx: null, '': null
  };
  Object.entries(map).forEach(([tag, want]) => eq(CE.i18n.normalize(tag), want, 'normalize(' + tag + ')'));

  CE.i18n.set('auto');
  ok(CE.i18n.get() === 'en', 'auto without a browser language falls back to English');
  CE.i18n.set('pt'); eq(CE.i18n.get(), 'pt_BR', 'old saved setting "pt" maps to pt_BR');
  CE.i18n.set('zh'); eq(CE.i18n.get(), 'zh_CN', 'old saved setting "zh" maps to zh_CN');
  CE.i18n.set('bogus'); eq(CE.i18n.get(), 'en', 'unknown language falls back to English');
  eq(CE.tx('no_such_key', 'fallback text'), 'fallback text', 'tx() falls back for unknown keys');

  // Exported files carry translated headings (Markdown and Text builders run unchanged in a sandbox).
  const sb = vm.createContext({ console, URL, navigator: { language: 'en' }, document: {}, location: { href: 'https://chatgpt.com/c/1' } });
  sb.globalThis = sb;
  ['core/ns.js', 'core/locales.js', 'core/i18n.js', 'core/util.js', 'core/markdown.js', 'exporters/common.js', 'exporters/markdown.js', 'exporters/text.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), sb, { filename: f }));
  const X = sb.CE;
  const convo = { title: 'Hash tables', platformName: 'ChatGPT', assistantName: 'ChatGPT', createdAt: 0, url: 'https://chatgpt.com/c/1' };
  const msgs = [{ role: 'user', markdown: 'Hi' }, { role: 'assistant', markdown: 'Hello', thinking: 'hmm', sources: [{ n: 1, title: 'Wiki', url: 'https://x.org' }], attachments: [{ name: 'a.txt' }] }];
  const settings = Object.assign({}, X.DEFAULTS, { branding: true, includeThoughts: true, includeSources: true });
  for (const c of CODES) {
    X.i18n.set(c);
    const md = (await X.exporters.markdown.build({ convo, messages: msgs, settings })).text;
    ok(md.includes(T(c, 'docThoughtProcess')) && md.includes(T(c, 'docSources')) && md.includes(T(c, 'docExportedWith')) && md.includes(T(c, 'you')), 'markdown export is translated for ' + c);
    const tx = (await X.exporters.text.build({ convo, messages: msgs, settings })).text;
    ok(tx.includes(T(c, 'docThoughtProcess')) && tx.includes(T(c, 'docAttachments')) && tx.includes(T(c, 'docSources')) && tx.includes(T(c, 'docExportedWith')), 'text export is translated for ' + c);
  }
  console.log('  ' + checks + ' checks so far');
}

// ------------------------------------------------------------------ 2. Chrome
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const expectedMenuTitles = (c) => {
  const fm = { markdown: 'Markdown', pdf: 'PDF', html: 'HTML', docx: 'Word (.docx)', text: T(c, 'fmtText'), json: 'JSON', csv: 'CSV', png: T(c, 'fmtPng') };
  return [T(c, 'ctxExportChat'), T(c, 'openPanel'), undefined, ...Object.values(fm).map((f) => T(c, 'ctxExportAs', { fmt: f }))];
};

async function chromeTests() {
  const puppeteer = require(process.env.PUPPETEER_PATH || 'puppeteer-core');
  const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const SHOTS = process.env.SHOTS;
  const SHOT_LOCALES = new Set(['en', 'de', 'ar', 'ja', 'ru', 'th']);
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

  const launch = (extraArgs) => puppeteer.launch({
    executablePath: CHROME, headless: true, pipe: true, enableExtensions: [ROOT],
    args: ['--hide-scrollbars', '--no-first-run', ...(extraArgs || [])]
  });

  console.log('\n[2] real Chrome with the unpacked extension');
  const browser = await launch();
  const swTarget = await browser.waitForTarget((t) => t.type() === 'service_worker' && /background\.js$/.test(t.url()), { timeout: 15000 });
  const id = new URL(swTarget.url()).host;
  const worker = await swTarget.worker();
  console.log('  extension id ' + id + ', Chrome ' + (await browser.version()));

  const pageErrors = [];
  const watch = (page, label) => {
    page.on('pageerror', (e) => pageErrors.push(label + ': ' + e.message));
    // the mocked chatgpt.com answers its API calls with 403 on purpose
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) pageErrors.push(label + ' console: ' + m.text()); });
  };
  // chrome.storage.sync allows 120 writes a minute, and this test changes the language a lot: stay under the quota.
  const writes = [];
  const setLang = async (l) => {
    while (writes.filter((t) => Date.now() - t < 60000).length >= 100) await sleep(1000);
    writes.push(Date.now());
    return worker.evaluate((v) => chrome.storage.sync.set({ settings: v ? { language: v } : {} }), l);
  };
  const ext = (p) => 'chrome-extension://' + id + '/' + p;

  // A page that is both a popup-size window and checks for clipped text.
  const clipped = (page) => page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('button, a, p, h1, h2, h3, summary, label, span, select, .cf-label, .btn').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return;
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') bad.push((el.id || el.className || el.tagName) + ': ' + (el.textContent || '').trim().slice(0, 40));
    });
    if (document.documentElement.scrollWidth > window.innerWidth + 1) bad.push('page scrolls horizontally');
    return bad;
  });

  // ---------- manifest + service worker
  {
    const page = await browser.newPage(); watch(page, 'manifest');
    await page.goto(ext('popup/popup.html'));
    const m = await page.evaluate(() => chrome.runtime.getManifest());
    eq(m.name, EN.extName, 'manifest name resolves from _locales (en)');
    eq(m.description, EN.extDescription, 'manifest description resolves');
    eq(m.action.default_title, EN.extActionTitle, 'action title resolves');
    eq(m.commands['quick-export'].description, EN.cmdQuickExport, 'command description resolves');
    ok(!JSON.stringify(m).includes('__MSG_'), 'no unresolved __MSG_ placeholders');
    eq(m.default_locale, 'en', 'default_locale');
    await page.close();
  }

  // ---------- popup, every locale
  console.log('  popup + settings + preview, ' + CODES.length + ' locales');
  const popup = await browser.newPage(); watch(popup, 'popup');
  await popup.setViewport({ width: 360, height: 520, deviceScaleFactor: 2 });
  for (const c of CODES) {
    await setLang(c);
    await popup.goto(ext('popup/popup.html'));
    await popup.waitForFunction(() => !document.getElementById('inactive').hidden && document.getElementById('plan-text').textContent);
    await popup.evaluate(() => { document.getElementById('active').hidden = false; });
    const g = await popup.evaluate(() => {
      const $ = (i) => document.getElementById(i);
      return {
        lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title,
        select: $('select').textContent, quick: $('quick').textContent, copy: $('copy').textContent, bulk: $('bulk').textContent,
        settings: $('settings').textContent, shortcuts: $('shortcuts').textContent, site: $('site').textContent,
        inactive: document.querySelector('#inactive p').textContent, plan: $('plan-text').textContent, cta: $('plan-cta').textContent,
        fmtAria: $('format').getAttribute('aria-label'), fmtOptions: [...$('format').options].map((o) => o.textContent)
      };
    });
    const label = 'popup/' + c + ' ';
    eq(g.dir, RTL.has(c) ? 'rtl' : 'ltr', label + 'dir');
    eq(g.lang, c.replace('_', '-'), label + 'lang');
    eq(g.title, 'ChatGPT Exporter', label + 'title (brand name)');
    eq(g.select, T(c, 'openPanel'), label + 'select button');
    eq(g.quick, T(c, 'quickExport'), label + 'quick export');
    eq(g.copy, T(c, 'copyAs', { fmt: 'Markdown' }), label + 'copy');
    eq(g.bulk, T(c, 'exportAll'), label + 'export all');
    eq(g.settings, T(c, 'settings'), label + 'settings');
    eq(g.shortcuts, T(c, 'keyboardShortcuts'), label + 'shortcuts');
    eq(g.site, T(c, 'worksOn'), label + 'site line');
    eq(g.inactive, T(c, 'popupInactive'), label + 'inactive text');
    eq(g.plan, T(c, 'planFreeLeft', { full: 5, single: 7 }), label + 'plan text');
    eq(g.cta, T(c, 'upgrade'), label + 'upgrade button');
    eq(g.fmtAria, T(c, 'formatLabel'), label + 'format aria-label');
    eq(g.fmtOptions[4], T(c, 'fmtText'), label + 'format option "Text"');
    eq(g.fmtOptions[7], T(c, 'fmtPng'), label + 'format option "PNG"');
    const cl = await clipped(popup);
    ok(cl.length === 0, label + 'text is clipped: ' + cl.join(' | '));
    if (SHOTS && SHOT_LOCALES.has(c)) await popup.screenshot({ path: path.join(SHOTS, 'popup-' + c + '.png') });
  }
  await popup.close();

  // ---------- options page, every locale
  const opt = await browser.newPage(); watch(opt, 'options');
  await opt.setViewport({ width: 1000, height: 900, deviceScaleFactor: 1 });
  for (const c of CODES) {
    await setLang(c);
    await opt.goto(ext('options/options.html'));
    await opt.waitForFunction((t) => document.querySelector('.cf-title') && document.getElementById('account-status').textContent !== t, {}, T(c, 'checking'));
    const g = await opt.evaluate(() => {
      const $ = (i) => document.getElementById(i);
      const sel = document.querySelector('#form select');
      const row = (k) => [...document.querySelectorAll('.cf-row')].map((r) => r.textContent.trim());
      return {
        lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title,
        intro: document.querySelector('header p').textContent, acct: $('account-h').textContent, status: $('account-status').textContent,
        reset: $('reset').textContent, shortcuts: $('shortcuts').textContent, token: document.querySelector('.acct-token summary').textContent,
        titles: [...document.querySelectorAll('.cf-title')].map((e) => e.textContent), labels: row(),
        langOptions: [...sel.options].map((o) => [o.value, o.textContent]), selected: sel.value,
        actions: [...document.querySelectorAll('#account-actions .btn')].map((b) => b.textContent)
      };
    });
    const label = 'options/' + c + ' ';
    eq(g.dir, RTL.has(c) ? 'rtl' : 'ltr', label + 'dir');
    eq(g.title, T(c, 'optionsTitle'), label + 'title');
    eq(g.intro, T(c, 'optionsIntro'), label + 'intro');
    eq(g.acct, T(c, 'accountHeading'), label + 'account heading');
    eq(g.status, T(c, 'freeLeftConnect', { full: 5, single: 7 }), label + 'account status');
    eq(g.actions.join('|'), [T(c, 'connectAccount'), T(c, 'seePlans')].join('|'), label + 'account buttons');
    eq(g.reset, T(c, 'resetDefaults'), label + 'reset');
    eq(g.shortcuts, T(c, 'keyboardShortcutsEllipsis'), label + 'shortcuts');
    eq(g.token, T(c, 'connectWithToken'), label + 'token summary');
    eq(g.titles[0], T(c, 'sec_general'), label + 'first section');
    eq(g.titles[2], T(c, 'sec_files'), label + 'files section');
    ok(g.labels[0].startsWith(T(c, 'f_language')), label + 'first field is the language picker');
    ok(g.labels.some((l) => l.startsWith(T(c, 'f_pdfAutoPrint'))), label + 'last field translated');
    ok(g.labels.some((l) => l.includes(T(c, 'f_filenameTemplate'))), label + 'file name template label (keeps {placeholders})');
    eq(g.langOptions.length, CODES.length + 1, label + 'language picker lists auto + ' + CODES.length + ' languages');
    eq(g.langOptions[0][1], T(c, 'autoBrowser'), label + 'auto option');
    eq(g.selected, c, label + 'picker shows the active language');
    eq((g.langOptions.find((o) => o[0] === 'zh_TW') || [])[1], '中文（台灣）', label + 'native name of zh_TW');
    const cl = await clipped(opt);
    ok(cl.length === 0, label + 'text is clipped: ' + cl.join(' | '));
    if (SHOTS && SHOT_LOCALES.has(c)) await opt.screenshot({ path: path.join(SHOTS, 'options-' + c + '.png') });
  }

  // ---------- live language switch through the picker
  await setLang('en');
  await opt.goto(ext('options/options.html'));
  await opt.waitForSelector('#form select');
  await opt.select('#form select', 'ja');
  await opt.waitForFunction((t) => document.getElementById('reset').textContent === t, { timeout: 5000 }, T('ja', 'resetDefaults')).catch(() => {});
  eq(await opt.$eval('#reset', (e) => e.textContent), T('ja', 'resetDefaults'), 'picker: page repaints in Japanese immediately');
  eq(await opt.$eval('.cf-title', (e) => e.textContent), T('ja', 'sec_general'), 'picker: settings form repainted');
  eq((await worker.evaluate(() => chrome.storage.sync.get('settings'))).settings.language, 'ja', 'picker: choice saved to storage');
  await opt.select('#form select', 'ar');
  await opt.waitForFunction(() => document.documentElement.dir === 'rtl', { timeout: 5000 }).catch(() => {});
  eq(await opt.evaluate(() => document.documentElement.dir), 'rtl', 'picker: Arabic flips the page to right-to-left');
  await opt.select('#form select', 'auto');
  await opt.waitForFunction(() => document.documentElement.dir === 'ltr', { timeout: 5000 }).catch(() => {});
  eq(await opt.evaluate(() => document.documentElement.lang), 'en-US'.slice(0, 2) === 'en' ? 'en' : 'en', 'picker: Auto follows the browser language (English here)');
  await opt.close();

  // ---------- PDF/PNG preview page
  const pv = await browser.newPage(); watch(pv, 'print');
  await pv.setViewport({ width: 1300, height: 900 });
  const job = await worker.evaluate(() => {
    const s = Object.assign({}, CE.DEFAULTS, { pdfToc: true, branding: true, pdfAutoPrint: false, includeThoughts: true, includeSources: true });
    return {
      id: 't1', mode: 'pdf', createdAt: Date.now(), filename: 'test.pdf', settings: s,
      convo: { title: 'Hash tables', platformName: 'ChatGPT', assistantName: 'ChatGPT', model: 'gpt', createdAt: Date.now(), url: 'https://chatgpt.com/c/1' },
      messages: [
        { role: 'user', markdown: 'Explain hash tables' },
        { role: 'assistant', markdown: 'A hash table maps keys to values.', thinking: 'Think about buckets.', sources: [{ n: 1, title: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Hash_table' }] }
      ]
    };
  });
  await worker.evaluate((j) => chrome.storage.local.set({ 'printJob:t1': j }), job);
  for (const c of CODES) {
    await setLang(c);
    await pv.goto(ext('print/print.html?job=t1'));
    await pv.waitForFunction(() => !document.getElementById('toolbar').hidden && document.querySelector('.ce-body .msg'), { timeout: 10000 });
    const g = await pv.evaluate(() => ({
      lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title,
      action: document.getElementById('tb-action').textContent, hint: document.getElementById('tb-hint').textContent, close: document.getElementById('tb-close').textContent,
      controls: [...document.querySelectorAll('#tb-controls label')].map((l) => l.textContent.trim()),
      toc: (document.querySelector('nav.toc h2') || {}).textContent, thought: (document.querySelector('details.thinking summary') || {}).textContent,
      sources: (document.querySelector('.sources .label') || {}).textContent, brand: (document.querySelector('.brand') || {}).textContent,
      who: [...document.querySelectorAll('.msg-head .who')].map((e) => e.textContent), meta: document.querySelector('.doc-head .meta').textContent,
      bodyDir: document.querySelector('.msg-body').getAttribute('dir')
    }));
    const label = 'print/' + c + ' ';
    eq(g.dir, RTL.has(c) ? 'rtl' : 'ltr', label + 'dir');
    eq(g.title, 'test', label + 'title is the file name, which Chrome suggests when saving the PDF');
    eq(g.action, T(c, 'pvPrintSave'), label + 'print button');
    eq(g.hint, T(c, 'pvChooseSave'), label + 'hint');
    eq(g.close, T(c, 'close'), label + 'close');
    ok(g.controls[0].startsWith(T(c, 'f_pdfTheme')), label + 'toolbar "Theme" label: ' + g.controls[0]);
    ok(g.controls.some((x) => x.startsWith(T(c, 'f_pdfPageSize'))), label + 'toolbar "Page size" label');
    eq(g.toc, T(c, 'docContents'), label + 'table of contents heading');
    eq(g.thought, T(c, 'docThoughtProcess'), label + 'thought process heading');
    eq(g.sources, T(c, 'docSources'), label + 'sources heading');
    eq(g.brand, T(c, 'docExportedWith'), label + 'branding footer');
    eq(g.who[0], T(c, 'you'), label + 'user label');
    ok(g.meta.includes(T(c, 'messages')), label + 'meta line has the translated word for "messages"');
    eq(g.bodyDir, 'auto', label + 'message body is dir=auto');
    if (SHOTS && SHOT_LOCALES.has(c)) await pv.screenshot({ path: path.join(SHOTS, 'print-' + c + '.png') });
  }
  await pv.close();

  // ---------- worker: right-click menu + error messages
  console.log('  worker menus + messages');
  for (const c of ['en', 'de', 'fr', 'ja', 'ar', 'zh_TW', 'pt_PT', 'hi']) {
    await setLang(c);
    await sleep(600); // the worker rebuilds the real menu when the language changes; let that finish first
    const titles = await worker.evaluate(async () => {
      const out = [];
      const create = chrome.contextMenus.create, removeAll = chrome.contextMenus.removeAll;
      chrome.contextMenus.create = (o) => { out.push(o.title); return 1; };
      chrome.contextMenus.removeAll = (cb) => cb();
      try { await buildMenus(); } finally { chrome.contextMenus.create = create; chrome.contextMenus.removeAll = removeAll; }
      return out;
    });
    eq(JSON.stringify(titles), JSON.stringify(expectedMenuTitles(c)), 'menu/' + c + ' titles');
    const bad = await worker.evaluate(() => connect('not-a-token'));
    eq(bad.error, T(c, 'tokenInvalidFormat'), 'worker/' + c + ' bad token message');
  }

  // ---------- content script on a mocked chatgpt.com
  console.log('  in-page panel on a mocked chatgpt.com, ' + CODES.length + ' locales');
  const cs = await browser.newPage(); watch(cs, 'content');
  await cs.setViewport({ width: 1200, height: 800 });
  await cs.setRequestInterception(true);
  cs.on('request', (req) => {
    const u = req.url();
    if (!/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(u)) return req.abort();
    if (/\/c\//.test(u) && req.resourceType() === 'document') return req.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body style="background:#222"><main>mock</main></body></html>' });
    return req.respond({ status: 403, contentType: 'application/json', body: '{}' });
  });
  const shadow = (fn, ...a) => cs.evaluate((src, ...args) => {
    const root = document.getElementById('chat-exporter-root').shadowRoot;
    return new Function('root', 'args', 'return ' + src)(root, args);
  }, '(' + fn.toString() + ')(root, ...args)', ...a);
  for (const c of CODES) {
    await setLang(c);
    await cs.goto('https://chatgpt.com/c/00000000-0000-0000-0000-000000000000', { waitUntil: 'load' });
    await cs.waitForFunction(() => { const r = document.getElementById('chat-exporter-root'); return r && r.shadowRoot.querySelector('.dock .main'); }, { timeout: 10000 });
    const label = 'panel/' + c + ' ';
    const dock = await shadow((root) => ({ mains: [...root.querySelectorAll('.dock .main')].map((e) => e.textContent), dir: root.querySelector('.ce').getAttribute('dir'), lang: root.querySelector('.ce').getAttribute('lang') }));
    eq(dock.mains.join('|'), [T(c, 'select'), T(c, 'export')].join('|'), label + 'dock buttons');
    eq(dock.dir, RTL.has(c) ? 'rtl' : 'ltr', label + 'dir on the UI root');
    await shadow((root) => root.querySelector('.dock .main').click());
    await cs.waitForFunction(() => document.getElementById('chat-exporter-root').shadowRoot.querySelector('.panel.open .state button'), { timeout: 10000 });
    const p = await shadow((root) => ({
      title: root.querySelector('.panel h2').textContent, tip: root.querySelector('.p-tip').textContent,
      presets: [...root.querySelectorAll('.presets button')].map((b) => b.textContent),
      cancel: root.querySelector('.p-foot .cancel').textContent, exportBtn: root.querySelector('.p-foot .primary').textContent,
      state: root.querySelector('.state div').textContent, retry: root.querySelector('.state button').textContent,
      expand: root.querySelector('.p-bar label').textContent, gear: root.querySelector('.p-bar .iconbtn:last-child').title
    }));
    eq(p.title, T(c, 'selectMessages'), label + 'panel title');
    eq(p.tip, T(c, 'tip'), label + 'tip');
    eq(p.presets.join('|'), [T(c, 'all'), T(c, 'questions'), T(c, 'answers'), T(c, 'none'), T(c, 'invert')].join('|'), label + 'presets');
    eq(p.cancel, T(c, 'cancel'), label + 'cancel');
    eq(p.exportBtn, T(c, 'export'), label + 'export button');
    ok([T(c, 'noConversation'), T(c, 'sessionFailed', { status: 403 })].includes(p.state), label + 'error message from the page adapter is translated: ' + p.state);
    eq(p.retry, T(c, 'retry'), label + 'retry');
    eq(p.expand, T(c, 'expand'), label + 'expand');
    eq(p.gear, T(c, 'settings'), label + 'settings tooltip');
    if (SHOTS && SHOT_LOCALES.has(c)) await cs.screenshot({ path: path.join(SHOTS, 'panel-' + c + '.png') });
    // settings view inside the panel
    await shadow((root) => root.querySelector('.p-bar .iconbtn:last-child').click());
    const s = await shadow((root) => ({
      title: root.querySelector('.panel h2').textContent, first: root.querySelector('.cf-title').textContent,
      labels: [...root.querySelectorAll('.cf-label')].slice(0, 3).map((e) => e.textContent), count: root.querySelector('.settings select').options.length
    }));
    eq(s.title, T(c, 'settings'), label + 'settings view title');
    eq(s.first, T(c, 'sec_general'), label + 'settings first section');
    eq(s.labels[0], T(c, 'f_language'), label + 'settings first label');
    eq(s.count, CODES.length + 1, label + 'language picker has all languages');
    if (SHOTS && SHOT_LOCALES.has(c)) await cs.screenshot({ path: path.join(SHOTS, 'panel-settings-' + c + '.png') });
    const cl = await cs.evaluate(() => {
      const root = document.getElementById('chat-exporter-root').shadowRoot, bad = [];
      root.querySelectorAll('button, label, span, h2, h3, .cf-label').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') bad.push((el.className || el.tagName) + ': ' + el.textContent.trim().slice(0, 40));
      });
      return bad;
    });
    ok(cl.length === 0, label + 'text is clipped in the panel: ' + cl.join(' | '));
  }
  // switching language from inside the panel's own settings form, without reloading
  await setLang('en');
  await cs.goto('https://chatgpt.com/c/00000000-0000-0000-0000-000000000000', { waitUntil: 'load' });
  await cs.waitForFunction(() => document.getElementById('chat-exporter-root'));
  await shadow((root) => root.querySelector('.dock .main').click());
  await cs.waitForFunction(() => document.getElementById('chat-exporter-root').shadowRoot.querySelector('.panel.open .p-bar .iconbtn'));
  await shadow((root) => root.querySelector('.p-bar .iconbtn:last-child').click());
  await shadow((root) => { const s = root.querySelector('.settings select'); s.value = 'he'; s.dispatchEvent(new Event('change')); });
  await sleep(500);
  const live = await shadow((root) => ({ title: root.querySelector('.panel h2').textContent, first: root.querySelector('.cf-title').textContent, dir: root.querySelector('.ce').getAttribute('dir'), dock: root.querySelector('.dock .main').textContent }));
  eq(live.title, T('he', 'settings'), 'panel live switch: title becomes Hebrew');
  eq(live.first, T('he', 'sec_general'), 'panel live switch: settings form redrawn in Hebrew');
  eq(live.dir, 'rtl', 'panel live switch: UI flips to right-to-left');
  eq(live.dock, T('he', 'select'), 'panel live switch: dock button updated');
  await cs.close();
  await setLang('');

  ok(pageErrors.length === 0, 'no console errors or exceptions on any page:\n    ' + pageErrors.slice(0, 10).join('\n    '));
  await browser.close();

  // ---------- browser UI language: "Auto" follows it, and the store name/description come from the right locale
  console.log('  browser UI language');
  for (const [flag, c] of [['de', 'de'], ['ja', 'ja'], ['pt-PT', 'pt_PT'], ['zh-TW', 'zh_TW'], ['ar', 'ar'], ['nb', 'no'], ['he', 'he'], ['iw', 'he']]) {
    const b = await launch(['--lang=' + flag, '-AppleLanguages', '(' + flag + ')']);
    try {
      const t = await b.waitForTarget((x) => x.type() === 'service_worker' && /background\.js$/.test(x.url()), { timeout: 15000 });
      const eid = new URL(t.url()).host;
      const page = await b.newPage();
      await page.goto('chrome-extension://' + eid + '/popup/popup.html');
      await page.waitForFunction(() => !document.getElementById('inactive').hidden);
      const r = await page.evaluate(() => ({ ui: chrome.i18n.getUILanguage(), name: chrome.runtime.getManifest().name, select: document.getElementById('select').textContent, lang: document.documentElement.lang }));
      console.log('    --lang=' + flag + ' -> UI language ' + r.ui + ', popup lang ' + r.lang + ', name "' + r.name + '"');
      const uiOk = CE_normalize(r.ui) === c;
      if (!uiOk) { console.log('    (Chrome ignored the language flag on this system; skipping assertions for ' + flag + ')'); }
      else {
        eq(r.name, T(c, 'extName'), 'ui ' + flag + ': manifest name is localized');
        eq(r.select, T(c, 'openPanel'), 'ui ' + flag + ': popup follows the browser language when set to Auto');
      }
      await page.close();
    } finally { await b.close(); }
  }
}

function CE_normalize(tag) {
  const ctx = vm.createContext({}); ctx.globalThis = ctx;
  ['locales.js', 'i18n.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/core', f), 'utf8'), ctx));
  return ctx.CE.i18n.normalize(tag);
}

(async () => {
  await staticTests();
  if (!process.argv.includes('--static')) await chromeTests();
  console.log('\n' + (failures ? failures + ' FAILED' : 'ALL PASSED') + ' (' + checks + ' checks)');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
