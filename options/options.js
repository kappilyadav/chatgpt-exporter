(async function () {
  'use strict';
  const form = document.getElementById('form');
  const saved = document.getElementById('saved');
  let timer;

  function flash() {
    saved.textContent = 'Saved ✓';
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
    if (!a) { status.textContent = 'Could not load your account right now.'; return; }
    if (a.signedIn) {
      const plan = a.pro ? (a.plan === 'year' ? 'Year Plan' : a.plan === 'month' ? 'Month Plan' : 'Pro') + ' · unlimited exports' : 'Free plan';
      status.textContent = 'Connected as ' + a.email + ' · ' + plan;
      if (a.pro) act('Manage billing', () => CE.account.openSite('account'));
      else act('Upgrade', () => CE.account.openSite('plans'), true);
      act('Disconnect', async () => { await CE.account.disconnect(); drawAccount(); });
    } else {
      const left = (k) => Math.max(0, a.limits[k] - a.usage[k]);
      status.textContent = 'Free plan · ' + left('full') + ' full and ' + left('single') + ' partial exports left this month. Connect your account if you have upgraded.';
      act('Connect account', () => CE.account.openSite('connect'), true);
      act('See plans', () => CE.account.openSite('plans'));
    }
  }

  document.getElementById('token-go').addEventListener('click', async () => {
    const msg = document.getElementById('token-msg');
    msg.textContent = 'Connecting…';
    const r = await CE.account.connect(document.getElementById('token').value);
    msg.textContent = r && r.ok ? 'Connected.' : (r && r.error) || 'Could not connect.';
    if (r && r.ok) { document.getElementById('token').value = ''; drawAccount(); }
  });

  drawAccount();
  await draw();
})();
