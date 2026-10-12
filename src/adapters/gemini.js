/* Chat Exporter — Gemini adapter (gemini.google.com).
 * Gemini has no simple JSON endpoint, so the rendered conversation is read from the DOM.
 * Older turns are lazily rendered, so we scroll to the top first to load the full history.
 */
(function (CE) {
  'use strict';
  const U = CE.util;

  const TURN_SEL = 'user-query, model-response';

  function scroller() {
    return document.querySelector('infinite-scroller') || document.querySelector('#chat-history') || document.querySelector('[data-test-id="chat-history-container"]') || document.scrollingElement;
  }

  async function loadFullHistory(onProgress) {
    const sc = scroller();
    if (!sc) return;
    let last = -1;
    let stable = 0;
    const start = sc.scrollTop;
    for (let i = 0; i < 80 && stable < 3; i++) {
      sc.scrollTop = 0;
      sc.dispatchEvent(new Event('scroll'));
      await U.sleep(450);
      const n = document.querySelectorAll(TURN_SEL).length;
      if (onProgress) onProgress(n);
      if (n === last) stable++;
      else { stable = 0; last = n; }
    }
    // restore (approximately) to the latest messages
    sc.scrollTop = sc.scrollHeight;
    void start;
  }

  async function expandThoughts() {
    const btns = [...document.querySelectorAll('model-thoughts button, .thoughts-header button, button[data-test-id="thoughts-header-button"]')];
    let clicked = 0;
    btns.forEach((b) => {
      const expanded = b.getAttribute('aria-expanded');
      if (expanded === 'false') { b.click(); clicked++; }
    });
    if (clicked) await U.sleep(250);
  }

  function userText(el) {
    const lines = el.querySelectorAll('.query-text-line, .query-text p');
    if (lines.length) return [...lines].map((l) => l.innerText || l.textContent).join('\n').trim();
    const t = el.querySelector('.query-text, user-query-content') || el;
    return (t.innerText || t.textContent || '').trim();
  }

  function modelParts(el) {
    let thinking = '';
    const th = el.querySelector('model-thoughts, .thoughts-container, .thoughts-content');
    if (th) thinking = CE.html2md(th.querySelector('.thoughts-content, .markdown') || th).trim();
    const content = el.querySelector('message-content .markdown, message-content, .model-response-text, .markdown') || el;
    let md;
    if (th && th.contains(content)) md = '';
    else md = CE.html2md(content);
    const images = [...el.querySelectorAll('generated-image img, .generated-images img, single-image img')].map((i) => i.currentSrc || i.src).filter(Boolean);
    return { md, thinking, images };
  }

  const A = (CE.adapters.gemini = {
    id: 'gemini',
    name: 'Gemini',
    assistantName: 'Gemini',
    supportsBulk: false,

    match(host) {
      return /(^|\.)gemini\.google\.com$/.test(host);
    },

    conversationId() {
      const m = location.pathname.match(/\/app\/([0-9a-f]{8,})/i) || location.pathname.match(/\/gem\/[^/]+\/([0-9a-f]{8,})/i);
      return m ? m[1] : null;
    },

    async load(settings, hooks) {
      hooks = hooks || {};
      if (settings.autoLoadFullHistory) await loadFullHistory(hooks.onProgress);
      if (settings.includeThoughts) await expandThoughts();
      return A.scrape(settings);
    },

    async list() {
      throw new Error(CE.t('bulkUnsupported'));
    },

    scrape(settings) {
      const turns = [...document.querySelectorAll(TURN_SEL)];
      const messages = [];
      turns.forEach((el, i) => {
        if (el.tagName.toLowerCase() === 'user-query') {
          const text = userText(el);
          const imgs = settings.includeImages
            ? [...el.querySelectorAll('img')].filter((im) => (im.naturalWidth || 100) > 32).map((im) => '![Uploaded image](' + (im.currentSrc || im.src) + ')')
            : [];
          const md = [imgs.join('\n\n'), text].filter(Boolean).join('\n\n');
          if (md) messages.push({ id: 'u' + i, role: 'user', markdown: md, sources: [], attachments: [] });
        } else {
          const { md, thinking, images } = modelParts(el);
          const imgMd = settings.includeImages ? images.map((u) => '![Generated image](' + u + ')') : [];
          const full = [md, imgMd.join('\n\n')].filter(Boolean).join('\n\n');
          if (full || thinking) messages.push({ id: 'a' + i, role: 'assistant', markdown: full, thinking, sources: [], attachments: [] });
        }
      });
      messages.forEach((m, i) => { m.index = i; });

      let title = '';
      const sel = document.querySelector('[data-test-id="conversation"].selected .conversation-title, .conversation.selected .conversation-title, conversations-list .selected .conversation-title');
      if (sel) title = sel.textContent.trim();
      if (!title) {
        const t = (document.title || '').replace(/\s*[-|–]\s*Google Gemini\s*$/i, '').trim();
        if (t && !/^(Google )?Gemini$/i.test(t)) title = t;
      }
      if (!title) {
        const first = messages.find((m) => m.role === 'user');
        title = first ? U.truncate(U.plainFromMarkdownLine(first.markdown), 60) : 'Gemini conversation';
      }
      return {
        platform: 'gemini', platformName: 'Gemini', assistantName: 'Gemini',
        id: A.conversationId(), title, url: location.href, model: null,
        createdAt: null, updatedAt: null, source: 'dom', messages
      };
    }
  });
})(globalThis.CE);
