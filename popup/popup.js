/* Chat Exporter — toolbar popup. Talks to the content script of the active tab. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let tabId = null;

  const fmt = $('format');
  CE.FORMATS.forEach((f) => {
    const o = document.createElement('option');
    o.value = f.id;
    o.textContent = f.label;
    fmt.appendChild(o);
  });

  chrome.storage.sync.get('settings').then((r) => {
    const s = r.settings || {};
    fmt.value = s.format || CE.DEFAULTS.format;
  }).catch(() => {});

  fmt.addEventListener('change', async () => {
    try {
      const r = await chrome.storage.sync.get('settings');
      await chrome.storage.sync.set({ settings: Object.assign({}, CE.DEFAULTS, r.settings || {}, { format: fmt.value }) });
    } catch (e) { /* ignore */ }
  });

  function send(msg) {
    return chrome.tabs.sendMessage(tabId, msg).catch((e) => ({ ok: false, error: String(e && e.message || e) }));
  }

  async function showPlan() {
    const a = await CE.account.get();
    if (!a) return; // worker unreachable: stay quiet rather than show wrong numbers
    const text = $('plan-text');
    const cta = $('plan-cta');
    if (a.pro) {
      const name = a.plan === 'year' ? 'Year Plan' : a.plan === 'month' ? 'Month Plan' : 'Pro';
      text.textContent = 'Pro · ' + name + ' · unlimited exports';
      cta.textContent = 'Account';
      cta.onclick = () => { CE.account.openSite('account'); window.close(); };
    } else {
      const left = (k) => Math.max(0, a.limits[k] - a.usage[k]);
      text.textContent = 'Free · ' + left('full') + ' full and ' + left('single') + ' partial exports left this month';
      cta.textContent = 'Upgrade';
      cta.onclick = () => { CE.account.openSite('plans'); window.close(); };
    }
    $('plan').hidden = false;
  }

  async function init() {
    showPlan();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab && tab.id;
    let info = null;
    if (tabId != null) info = await send({ type: 'ping' });
    if (info && info.ok) {
      $('active').hidden = false;
      $('site').textContent = info.name + (info.conversationId ? ' conversation detected' : ' — open a conversation');
      if (!info.bulk) $('bulk').style.display = 'none';
    } else {
      $('inactive').hidden = false;
      $('site').textContent = 'Works on chatgpt.com';
    }
  }

  $('select').addEventListener('click', async () => { await send({ type: 'open-panel' }); window.close(); });
  $('quick').addEventListener('click', async () => {
    $('msg').textContent = 'Exporting…';
    const r = await send({ type: 'export', format: fmt.value });
    $('msg').textContent = r && r.ok ? 'Done — see the page for details.' : (r && r.error) || 'Failed';
    if (r && r.ok) setTimeout(() => window.close(), 700);
  });
  $('copy').addEventListener('click', async () => {
    const r = await send({ type: 'export', format: 'markdown', copy: true });
    $('msg').textContent = r && r.ok ? 'Copied to clipboard.' : (r && r.error) || 'Failed';
  });
  $('bulk').addEventListener('click', async () => { await send({ type: 'bulk' }); window.close(); });
  $('settings').addEventListener('click', () => { chrome.runtime.openOptionsPage(); window.close(); });
  $('shortcuts').addEventListener('click', () => { chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }); window.close(); });

  init();
})();
