/* Chat Exporter — toolbar popup. Talks to the content script of the active tab. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let tabId = null;

  const t = (...a) => CE.t(...a);
  const fmt = $('format');
  const markdown = () => CE.FORMATS.find((f) => f.id === 'markdown');

  function paintStatic() {
    CE.i18n.apply();
    fmt.textContent = '';
    CE.FORMATS.forEach((f) => {
      const o = document.createElement('option');
      o.value = f.id;
      o.textContent = f.label;
      fmt.appendChild(o);
    });
    $('copy').textContent = t('copyAs', { fmt: markdown().label });
  }

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
      const name = a.plan === 'year' ? t('planYear') : a.plan === 'month' ? t('planMonth') : t('planProName');
      text.textContent = t('planPro', { plan: name });
      cta.textContent = t('accountHeading');
      cta.onclick = () => { CE.account.openSite('account'); window.close(); };
    } else {
      const left = (k) => Math.max(0, a.limits[k] - a.usage[k]);
      text.textContent = t('planFreeLeft', { full: left('full'), single: left('single') });
      cta.textContent = t('upgrade');
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
      $('site').textContent = t(info.conversationId ? 'conversationDetected' : 'openAConversation', { name: info.name });
      if (!info.bulk) $('bulk').style.display = 'none';
    } else {
      $('inactive').hidden = false;
      $('site').textContent = t('worksOn');
    }
  }

  $('select').addEventListener('click', async () => { await send({ type: 'open-panel' }); window.close(); });
  $('quick').addEventListener('click', async () => {
    $('msg').textContent = t('exporting');
    const r = await send({ type: 'export', format: fmt.value });
    $('msg').textContent = r && r.ok ? t('doneSeePage') : (r && r.error) || t('failedShort');
    if (r && r.ok) setTimeout(() => window.close(), 700);
  });
  $('copy').addEventListener('click', async () => {
    const r = await send({ type: 'export', format: 'markdown', copy: true });
    $('msg').textContent = r && r.ok ? t('copiedClipboard') : (r && r.error) || t('failedShort');
  });
  $('bulk').addEventListener('click', async () => { await send({ type: 'bulk' }); window.close(); });
  $('settings').addEventListener('click', () => { chrome.runtime.openOptionsPage(); window.close(); });
  $('shortcuts').addEventListener('click', () => { chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }); window.close(); });

  (async () => {
    await CE.i18n.load();
    paintStatic();
    try {
      const r = await chrome.storage.sync.get('settings');
      fmt.value = (r.settings && r.settings.format) || CE.DEFAULTS.format;
    } catch (e) { /* keep the first option */ }
    init();
  })();
})();
