/* Chat Exporter — content-script bootstrap: mounts the UI and answers popup / background messages. */
(function (CE) {
  'use strict';
  if (CE.__booted) return;
  CE.__booted = true;

  async function boot() {
    await CE.settings.load();
    if (!CE.pickAdapter()) return;
    CE.ui.panel.init();

    // SPA navigation: all three sites change URL without reloading.
    let last = location.href;
    setInterval(() => {
      if (location.href !== last) {
        last = location.href;
        CE.ui.panel.onNavigate();
      }
    }, 700);

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg, sender, respond) => {
        const P = CE.ui.panel;
        (async () => {
          try {
            switch (msg && msg.type) {
              case 'ping': {
                const a = CE.pickAdapter();
                respond({ ok: true, platform: a ? a.id : null, name: a ? a.name : null, conversationId: a && a.conversationId ? a.conversationId() : null, bulk: !!(a && a.supportsBulk) });
                break;
              }
              case 'open-panel':
                await P.open(msg.preset);
                respond({ ok: true });
                break;
              case 'toggle-panel':
                P.toggle();
                respond({ ok: true });
                break;
              case 'bulk':
                CE.ui.bulk.open();
                respond({ ok: true });
                break;
              case 'export':
              case 'quick-export': {
                const fmt = msg.format || CE.settings.get().format;
                await P.exportNow(fmt, !!msg.copy);
                respond({ ok: true });
                break;
              }
              default:
                respond({ ok: false });
            }
          } catch (e) {
            respond({ ok: false, error: CE.humanError(e) });
          }
        })();
        return true;
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(globalThis.CE);
