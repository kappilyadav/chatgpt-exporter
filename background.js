/* Chat Exporter — MV3 service worker: context menu, keyboard commands, downloads, print-page launcher. */
importScripts('src/core/ns.js');

const SITES = ['https://chatgpt.com/*', 'https://chat.openai.com/*', 'https://claude.ai/*', 'https://gemini.google.com/*'];

function buildMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'ce-root', title: 'Export this chat', contexts: ['page'], documentUrlPatterns: SITES });
    chrome.contextMenus.create({ id: 'ce-select', parentId: 'ce-root', title: 'Select messages…', contexts: ['page'], documentUrlPatterns: SITES });
    chrome.contextMenus.create({ id: 'ce-sep', parentId: 'ce-root', type: 'separator', contexts: ['page'], documentUrlPatterns: SITES });
    CE.FORMATS.forEach((f) => {
      chrome.contextMenus.create({ id: 'ce-fmt:' + f.id, parentId: 'ce-root', title: 'Export as ' + f.label, contexts: ['page'], documentUrlPatterns: SITES });
    });
  });
}

chrome.runtime.onInstalled.addListener(buildMenus);
chrome.runtime.onStartup.addListener(buildMenus);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || tab.id == null) return;
  if (info.menuItemId === 'ce-select') chrome.tabs.sendMessage(tab.id, { type: 'open-panel' });
  else if (String(info.menuItemId).startsWith('ce-fmt:')) chrome.tabs.sendMessage(tab.id, { type: 'export', format: String(info.menuItemId).slice(7) });
});

chrome.commands.onCommand.addListener(async (cmd) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null) return;
  const msg = cmd === 'toggle-panel' ? { type: 'toggle-panel' }
    : cmd === 'export-pdf' ? { type: 'export', format: 'pdf' }
      : { type: 'quick-export' };
  chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (!msg) return;

  if (msg.type === 'download') {
    chrome.downloads.download({ url: msg.url, filename: msg.filename, conflictAction: 'uniquify', saveAs: false }, (id) => {
      if (chrome.runtime.lastError || id == null) {
        respond({ ok: false, error: chrome.runtime.lastError && chrome.runtime.lastError.message });
        return;
      }
      const onChanged = (delta) => {
        if (delta.id !== id || !delta.state) return;
        if (delta.state.current === 'complete' || delta.state.current === 'interrupted') {
          chrome.downloads.onChanged.removeListener(onChanged);
          respond({ ok: delta.state.current === 'complete' });
        }
      };
      chrome.downloads.onChanged.addListener(onChanged);
    });
    return true;
  }

  if (msg.type === 'open-print') {
    chrome.tabs.create({ url: chrome.runtime.getURL('print/print.html?job=' + encodeURIComponent(msg.id)), active: true })
      .then(() => respond({ ok: true }))
      .catch((e) => respond({ ok: false, error: String(e && e.message || e) }));
    return true;
  }

  // Cross-origin image fetch for embedding (content scripts are bound by the page's CORS rules; the worker is not).
  if (msg.type === 'fetch-image') {
    (async () => {
      try {
        const u = new URL(msg.url);
        if (u.protocol !== 'https:') throw new Error('https only');
        const r = await fetch(u.href, { credentials: 'omit' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const type = (r.headers.get('content-type') || '').split(';')[0];
        if (!/^image\//i.test(type)) throw new Error('not an image');
        const buf = new Uint8Array(await r.arrayBuffer());
        if (buf.length > 12 * 1024 * 1024) throw new Error('too large');
        let bin = '';
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        respond({ ok: true, dataUrl: 'data:' + type + ';base64,' + btoa(bin) });
      } catch (e) {
        respond({ ok: false, error: String((e && e.message) || e) });
      }
    })();
    return true;
  }

  if (msg.type === 'open-options') {
    chrome.runtime.openOptionsPage();
    respond({ ok: true });
  }
});

// Drop stale print jobs (older than a day).
chrome.runtime.onStartup.addListener(async () => {
  const all = await chrome.storage.local.get(null);
  const stale = Object.keys(all).filter((k) => k.startsWith('printJob:') && Date.now() - (all[k].createdAt || 0) > 24 * 3600 * 1000);
  if (stale.length) chrome.storage.local.remove(stale);
});
