/* Chat Exporter — i18n layer. English is the source; a missing key falls back to English.
 * Translations live in _locales/<code>/messages.json (the format Chrome needs for the manifest and the Web Store)
 * and are bundled into src/core/locales.js by scripts/build_locales.py so content scripts can use any language. */
(function (CE) {
  'use strict';

  const RTL = ['ar', 'he'];
  // Name of each language in that language (used by the language picker and never translated).
  const NAMES = {
    ar: 'العربية', bg: 'български', ca: 'català', cs: 'čeština', da: 'dansk', de: 'Deutsch', el: 'Ελληνικά', en: 'English',
    es: 'español', fi: 'suomi', fr: 'français', he: 'עברית', hi: 'हिन्दी', hr: 'hrvatski', hu: 'magyar', id: 'Indonesia',
    it: 'italiano', ja: '日本語', ko: '한국어', nl: 'Nederlands', no: 'norsk', pl: 'polski', pt_BR: 'português (Brasil)',
    pt_PT: 'português (Portugal)', ro: 'română', ru: 'русский', sk: 'slovenčina', sl: 'slovenščina', sv: 'svenska',
    th: 'ไทย', tr: 'Türkçe', uk: 'українська', vi: 'Tiếng Việt', zh_CN: '中文（中国）', zh_TW: '中文（台灣）'
  };
  // Older settings and other browsers' codes -> the codes used in _locales.
  const ALIAS = { pt: 'pt_BR', zh: 'zh_CN', nb: 'no', nn: 'no', iw: 'he', in: 'id' };

  const locales = () => CE.LOCALES || {};
  let lang = 'en';

  /** 'zh-TW', 'pt_PT', 'nb-NO', 'zh-Hant' ... -> a code we ship, or null. */
  function normalize(tag) {
    if (!tag) return null;
    const parts = String(tag).split(/[-_]/);
    const base = parts[0].toLowerCase();
    const region = (parts.slice(1).find((p) => /^[A-Za-z]{2}$/.test(p)) || '').toUpperCase();
    const hant = parts.slice(1).some((p) => /^hant$/i.test(p));
    const L = locales();
    if (region && L[base + '_' + region]) return base + '_' + region;
    if (base === 'zh') return hant || ['TW', 'HK', 'MO'].includes(region) ? 'zh_TW' : 'zh_CN';
    if (base === 'pt') return region && region !== 'BR' ? 'pt_PT' : 'pt_BR';
    if (ALIAS[base] && L[ALIAS[base]]) return ALIAS[base];
    return L[base] ? base : null;
  }

  function browserLang() {
    try {
      if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) return chrome.i18n.getUILanguage();
    } catch (e) { /* fall through */ }
    return (typeof navigator !== 'undefined' && navigator.language) || 'en';
  }

  function has(key) {
    const L = locales();
    return !!((L[lang] && L[lang][key] != null) || (L.en && L.en[key] != null));
  }

  CE.i18n = {
    names: NAMES,
    normalize,
    has,
    /** Supported language codes (English first, then alphabetical by code). */
    available() {
      return Object.keys(locales()).sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a < b ? -1 : 1));
    },
    /** [code, native name] pairs for the language picker. */
    options() {
      return CE.i18n.available().map((c) => [c, NAMES[c] || c]);
    },
    set(code) {
      lang = (!code || code === 'auto' ? normalize(browserLang()) : normalize(code)) || 'en';
      return lang;
    },
    get() { return lang; },
    /** Value for the HTML lang attribute. */
    htmlLang() { return lang.replace('_', '-'); },
    dir() { return RTL.includes(lang.split('_')[0]) ? 'rtl' : 'ltr'; },
    /** Set lang + dir on an element (the page root, or the in-page UI wrapper). */
    applyDir(el) {
      if (!el) return;
      el.setAttribute('lang', CE.i18n.htmlLang());
      el.setAttribute('dir', CE.i18n.dir());
    },
    /** Pick the language from the saved settings (for pages and the worker that do not load settings.js). */
    async load() {
      let code = 'auto';
      try {
        const r = await chrome.storage.sync.get('settings');
        if (r && r.settings && r.settings.language) code = r.settings.language;
      } catch (e) {
        try {
          const r = await chrome.storage.local.get('settings');
          if (r && r.settings && r.settings.language) code = r.settings.language;
        } catch (e2) { /* keep auto */ }
      }
      return CE.i18n.set(code);
    },
    /** Translate static HTML: data-i18n (text), data-i18n-placeholder / -title / -aria-label (attributes). */
    apply(root) {
      root = root || document;
      if (root === document) CE.i18n.applyDir(document.documentElement);
      root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = CE.t(el.getAttribute('data-i18n')); });
      ['placeholder', 'title', 'aria-label'].forEach((a) => {
        root.querySelectorAll('[data-i18n-' + a + ']').forEach((el) => { el.setAttribute(a, CE.t(el.getAttribute('data-i18n-' + a))); });
      });
      const title = document.querySelector('title[data-i18n]');
      if (title) document.title = CE.t(title.getAttribute('data-i18n'));
    }
  };

  CE.t = function (key, vars) {
    const L = locales();
    let s = (L[lang] && L[lang][key]);
    if (s == null) s = L.en && L.en[key];
    if (s == null) s = key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    return s;
  };

  /** Translate when a key exists, otherwise keep the fallback text (used for the settings schema). */
  CE.tx = function (key, fallback) {
    return has(key) ? CE.t(key) : fallback;
  };
})(globalThis.CE);
