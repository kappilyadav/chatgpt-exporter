/* Chat Exporter — MV3 service worker: context menu, keyboard commands, downloads, print-page launcher. */
importScripts('src/core/ns.js', 'src/core/locales.js', 'src/core/i18n.js');

const SITE = CE.SITE_URL;
const LIMITS = CE.LIMITS;
const STALE_MS = 6 * 3600 * 1000; // re-check the plan at most every 6 hours
const GRACE_MS = 7 * 24 * 3600 * 1000; // keep honouring a Pro plan this long while offline

const SITES = ['https://chatgpt.com/*', 'https://chat.openai.com/*'];

async function buildMenus() {
  await CE.i18n.load(); // menu titles follow the language chosen in Settings
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'ce-root', title: CE.t('ctxExportChat'), contexts: ['page'], documentUrlPatterns: SITES });
    chrome.contextMenus.create({ id: 'ce-select', parentId: 'ce-root', title: CE.t('openPanel'), contexts: ['page'], documentUrlPatterns: SITES });
    chrome.contextMenus.create({ id: 'ce-sep', parentId: 'ce-root', type: 'separator', contexts: ['page'], documentUrlPatterns: SITES });
    CE.FORMATS.forEach((f) => {
      chrome.contextMenus.create({ id: 'ce-fmt:' + f.id, parentId: 'ce-root', title: CE.t('ctxExportAs', { fmt: f.label }), contexts: ['page'], documentUrlPatterns: SITES });
    });
  });
}

// ---------------------------------------------------------------- account and quota
// Everything lives here, in one worker, so several tabs cannot race each other past the limit.
const monthKey = () => new Date().toISOString().slice(0, 7);
let queue = Promise.resolve();
const serial = (fn) => (queue = queue.then(fn, fn));

const getAccount = async () => (await chrome.storage.local.get('account')).account || null;
const isPro = (a) => !!(a && a.pro && Date.now() - (a.verifiedAt || 0) < GRACE_MS);

async function getUsage() {
  const u = (await chrome.storage.local.get('usage')).usage;
  return u && u.month === monthKey() ? u : { month: monthKey(), full: 0, single: 0 };
}

async function fetchStatus(token) {
  const r = await fetch(SITE + '/api/extension/status', { headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 401) return { invalid: true };
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return { status: await r.json() };
}

function accountFrom(token, st) {
  return {
    token, email: st.email, pro: !!st.pro, plan: st.plan, status: st.status,
    currentPeriodEnd: st.currentPeriodEnd, cancelAtPeriodEnd: !!st.cancelAtPeriodEnd,
    checkedAt: Date.now(), verifiedAt: Date.now()
  };
}

/** Refresh the cached plan when it is stale. Offline or server errors keep the cached copy. */
async function refreshAccount(force) {
  const acc = await getAccount();
  if (!acc || !acc.token) return null;
  if (!force && Date.now() - (acc.checkedAt || 0) < STALE_MS) return acc;
  try {
    const r = await fetchStatus(acc.token);
    if (r.invalid) { await chrome.storage.local.remove('account'); return null; }
    const next = accountFrom(acc.token, r.status);
    await chrome.storage.local.set({ account: next });
    return next;
  } catch (e) {
    return acc;
  }
}

async function snapshot(force) {
  const acc = await refreshAccount(force);
  const u = await getUsage();
  return {
    signedIn: !!acc, email: acc && acc.email, pro: isPro(acc), plan: acc && acc.plan, status: acc && acc.status,
    cancelAtPeriodEnd: !!(acc && acc.cancelAtPeriodEnd), currentPeriodEnd: acc && acc.currentPeriodEnd,
    usage: { full: u.full, single: u.single }, limits: LIMITS
  };
}

async function connect(token) {
  token = String(token || '').trim();
  await CE.i18n.load();
  if (!/^cgx_[A-Za-z0-9_-]{20,90}$/.test(token)) return { ok: false, error: CE.t('tokenInvalidFormat') };
  try {
    const r = await fetchStatus(token);
    if (r.invalid) return { ok: false, error: CE.t('tokenExpired') };
    await chrome.storage.local.set({ account: accountFrom(token, r.status) });
    return { ok: true, pro: !!r.status.pro, email: r.status.email };
  } catch (e) {
    return { ok: false, error: CE.t('serverUnreachable') };
  }
}

const consume = (kind, n) => serial(async () => {
  if (!LIMITS[kind]) return { ok: true };
  const acc = await refreshAccount(false);
  if (isPro(acc)) return { ok: true, pro: true };
  const u = await getUsage();
  if (u[kind] + n > LIMITS[kind]) return { ok: false, reason: 'limit', kind, used: u[kind], limit: LIMITS[kind], signedIn: !!acc };
  u[kind] += n;
  await chrome.storage.local.set({ usage: u });
  return { ok: true, used: u[kind], limit: LIMITS[kind] };
});

const refund = (kind, n) => serial(async () => {
  const u = await getUsage();
  u[kind] = Math.max(0, u[kind] - n);
  await chrome.storage.local.set({ usage: u });
  return { ok: true };
});

// The website hands the extension a token after sign-in (needs externally_connectable in the manifest).
chrome.runtime.onMessageExternal.addListener((msg, sender, respond) => {
  if (!msg || msg.type !== 'CGX_CONNECT' || sender.origin !== SITE) return;
  connect(msg.token).then(respond);
  return true;
});

chrome.runtime.onInstalled.addListener(buildMenus);
chrome.runtime.onStartup.addListener(buildMenus);
// Rebuild the right-click menu when the interface language changes.
chrome.storage.onChanged.addListener((changes) => {
  const next = changes.settings && changes.settings.newValue && changes.settings.newValue.language;
  const prev = changes.settings && changes.settings.oldValue && changes.settings.oldValue.language;
  if (changes.settings && next !== prev) buildMenus();
});

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

  if (msg.type === 'account-get') { snapshot(!!msg.force).then(respond); return true; }
  if (msg.type === 'account-connect') { connect(msg.token).then(respond); return true; }
  if (msg.type === 'account-disconnect') { chrome.storage.local.remove('account').then(() => respond({ ok: true })); return true; }
  if (msg.type === 'quota-consume') { consume(msg.kind, Math.max(1, msg.count | 0)).then(respond); return true; }
  if (msg.type === 'quota-refund') { refund(msg.kind, Math.max(1, msg.count | 0)).then(respond); return true; }
  if (msg.type === 'open-site') {
    const path = msg.page === 'connect' ? '/account/connect?src=extension' : msg.page === 'account' ? '/account' : '/?src=extension#free';
    chrome.tabs.create({ url: SITE + path, active: true }).then(() => respond({ ok: true }));
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
