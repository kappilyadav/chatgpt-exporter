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

  await draw();
})();
