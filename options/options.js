(async function () {
  'use strict';
  const form = document.getElementById('form');
  const saved = document.getElementById('saved');
  let timer;

  const t = (...a) => CE.t(...a);

  function flash() {
    saved.textContent = t('saved');
    clearTimeout(timer);
    timer = setTimeout(() => { saved.textContent = ''; }, 1500);
  }

  async function draw() {
    const s = await CE.settings.load();
    CE.ui.settingsForm.render(form, s, async (k, v) => {
      await CE.settings.set({ [k]: v });
      flash();
    });
  }

  document.getElementById('reset').addEventListener('click', async () => {
    await CE.settings.reset();
    await draw();
    flash();
  });
  document.getElementById('shortcuts').addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  // ---- account
  const status = document.getElementById('account-status');
  const actions = document.getElementById('account-actions');
  const act = (label, fn, primary) => {
    const b = document.createElement('button');
    b.className = 'btn' + (primary ? ' primary' : '');
    b.textContent = label;
    b.addEventListener('click', fn);
    actions.append(b);
  };

  async function drawAccount() {
    actions.textContent = '';
    const a = await CE.account.get(true);
    if (!a) { status.textContent = t('accountLoadFail'); return; }
    if (a.signedIn) {
      const plan = a.pro ? t('planProUnlimited', { plan: a.plan === 'year' ? t('planYear') : a.plan === 'month' ? t('planMonth') : t('planProName') }) : t('planFreeShort');
      status.textContent = t('connectedAs', { email: a.email, plan });
      if (a.pro) act(t('manageBilling'), () => CE.account.openSite('account'));
      else act(t('upgrade'), () => CE.account.openSite('plans'), true);
      act(t('disconnect'), async () => { await CE.account.disconnect(); drawAccount(); });
    } else {
      const left = (k) => Math.max(0, a.limits[k] - a.usage[k]);
      status.textContent = t('freeLeftConnect', { full: left('full'), single: left('single') });
      act(t('connectAccount'), () => CE.account.openSite('connect'), true);
      act(t('seePlans'), () => CE.account.openSite('plans'));
    }
  }

  document.getElementById('token-go').addEventListener('click', async () => {
    const msg = document.getElementById('token-msg');
    msg.textContent = t('connecting');
    const r = await CE.account.connect(document.getElementById('token').value);
    msg.textContent = r && r.ok ? t('connected') : (r && r.error) || t('connectFail');
    if (r && r.ok) { document.getElementById('token').value = ''; drawAccount(); }
  });

  // Language changes (from the picker here, or another window) repaint the whole page.
  let shownLang = null;
  function repaint() {
    shownLang = CE.i18n.get();
    CE.i18n.apply();
    drawAccount();
    draw();
  }
  CE.settings.onChange(() => { if (CE.i18n.get() !== shownLang) repaint(); });

  await CE.settings.load();
  CE.i18n.apply();
  shownLang = CE.i18n.get();
  drawAccount();
  await draw();
})();
