/* Chat Exporter — persistent settings (chrome.storage.sync with local fallback). */
(function (CE) {
  'use strict';

  const hasChrome = () => typeof chrome !== 'undefined' && chrome.storage && (chrome.storage.sync || chrome.storage.local);
  const area = () => (chrome.storage.sync && !CE.__forceLocalStorage ? chrome.storage.sync : chrome.storage.local);

  const listeners = new Set();

  const S = (CE.settings = {
    cache: null,

    async load() {
      let stored = {};
      if (hasChrome()) {
        try {
          const r = await area().get('settings');
          stored = r.settings || {};
        } catch (e) {
          try {
            const r = await chrome.storage.local.get('settings');
            stored = r.settings || {};
          } catch (e2) { /* ignore */ }
        }
      }
      S.cache = Object.assign({}, CE.DEFAULTS, stored);
      CE.i18n.set(S.cache.language);
      return S.cache;
    },

    get() {
      return S.cache || Object.assign({}, CE.DEFAULTS);
    },

    async set(patch) {
      S.cache = Object.assign({}, S.get(), patch);
      if ('language' in patch) CE.i18n.set(S.cache.language);
      if (hasChrome()) {
        try {
          await area().set({ settings: S.cache });
        } catch (e) {
          try { await chrome.storage.local.set({ settings: S.cache }); } catch (e2) { /* ignore */ }
        }
      }
      listeners.forEach((fn) => { try { fn(S.cache, patch); } catch (e) { /* ignore */ } });
      return S.cache;
    },

    async reset() {
      return S.set(Object.assign({}, CE.DEFAULTS));
    },

    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  });

  if (hasChrome() && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.settings && changes.settings.newValue) {
        S.cache = Object.assign({}, CE.DEFAULTS, changes.settings.newValue);
        CE.i18n.set(S.cache.language);
        listeners.forEach((fn) => { try { fn(S.cache, null); } catch (e) { /* ignore */ } });
      }
    });
  }
})(globalThis.CE);
