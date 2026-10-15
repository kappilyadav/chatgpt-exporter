/* Chat Exporter — in-page UI: SELECT / EXPORT dock, "Select Messages" side panel, settings view, toasts. */
(function (CE) {
  'use strict';
  const U = CE.util;
  const t = (...a) => CE.t(...a);

  const ICONS = {
    sidebar: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.2 18.2c1.3-2 3.2-3 5.8-3s4.5 1 5.8 3"/></svg>',
    ai: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>',
    caret: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
    gear: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5h0a1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>',
    zip: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
    chevR: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    chevL: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>'
  };

  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) e.setAttribute(k, '');
        else e.setAttribute(k, v);
      }
    }
    kids.flat().forEach((c) => { if (c != null) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return e;
  }

  const P = (CE.ui.panel = {
    host: null,
    root: null,
    $: {},
    state: {
      convo: null,
      loading: false,
      error: null,
      selected: new Set(),
      preset: 'all',
      expand: false,
      view: 'select', // select | settings
      lastIdx: null,
      exporting: false,
      progress: ''
    },
    _urlKey: '',

    // ------------------------------------------------------------------ init
    init() {
      if (P.host) return;
      const s = CE.settings.get();
      P.state.preset = s.rememberSelection && s.selectionPreset ? s.selectionPreset : 'all';

      P.host = document.createElement('div');
      P.host.id = 'chat-exporter-root';
      P.host.style.cssText = 'all:initial;position:fixed;z-index:2147483000;top:0;left:0;width:0;height:0;';
      P.root = P.host.attachShadow({ mode: 'open' });
      P.root.appendChild(h('style', null, CE.ui.css));
      P.wrap = h('div', { class: 'ce' });
      P.root.appendChild(P.wrap);
      (document.body || document.documentElement).appendChild(P.host);

      P.buildDock();
      P.buildPanel();
      P.buildMenus();
      P.toasts = h('div', { class: 'toasts' });
      P.wrap.appendChild(P.toasts);

      document.addEventListener('pointerdown', (e) => {
        if (!e.composedPath().includes(P.host)) P.closeMenus();
      }, true);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && P.$.panel.classList.contains('open')) { P.closeMenus(); P.close(); }
      });
      window.addEventListener('resize', () => P.closeMenus());

      let shownLang = CE.i18n.get();
      CE.settings.onChange(() => {
        P.applySettings();
        // A language change must also redraw the settings form, which is only built when opened.
        if (CE.i18n.get() !== shownLang) {
          shownLang = CE.i18n.get();
          if (P.state.view === 'settings') P.setView('settings');
        }
        P.render();
      });
      P.applySettings();
      P.render();
      P.watchMount();
    },

    /**
     * ChatGPT is a single-page app that can rebuild <body> after we mount (hydration, route changes).
     * That silently deletes our host element, so the buttons appear for a moment and vanish.
     * Put the host back whenever it is detached.
     */
    ensureMounted() {
      if (!P.host || P.host.isConnected) return;
      try { (document.body || document.documentElement).appendChild(P.host); } catch (e) { /* page not ready yet */ }
    },

    watchMount() {
      if (P._mountWatch || typeof MutationObserver === 'undefined') return;
      P._mountWatch = new MutationObserver(() => P.ensureMounted());
      P._mountWatch.observe(document.documentElement, { childList: true });
      if (document.body) P._mountWatch.observe(document.body, { childList: true });
    },

    detectTheme() {
      const s = CE.settings.get();
      if (s.theme === 'dark' || s.theme === 'light') return s.theme;
      const de = document.documentElement;
      const cls = de.className || '';
      if (/\bdark\b/.test(cls)) return 'dark';
      if (/\blight\b/.test(cls)) return 'light';
      const mode = de.getAttribute('data-mode') || de.getAttribute('data-theme') || (document.body && document.body.getAttribute('data-theme'));
      if (mode === 'dark') return 'dark';
      if (mode === 'light') return 'light';
      if (document.body && /dark-theme|dark-mode/.test(document.body.className || '')) return 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    },

    applySettings() {
      const s = CE.settings.get();
      P.wrap.classList.toggle('light', P.detectTheme() === 'light');
      P.$.dock.style.display = s.showLauncher ? '' : 'none';
      P.$.dock.classList.toggle('collapsed', !!s.launcherCollapsed);
    },

    // ------------------------------------------------------------------ dock
    buildDock() {
      const $ = P.$;
      $.selMain = h('button', { class: 'main', onclick: () => P.open() });
      $.selCaret = h('button', { class: 'caret', html: ICONS.caret, title: t('select'), onclick: (e) => P.toggleMenu('preset', e.currentTarget.parentElement) });
      $.expMain = h('button', { class: 'main', onclick: () => P.exportNow(CE.settings.get().format) });
      $.expCaret = h('button', { class: 'caret', html: ICONS.caret, title: t('exportAs'), onclick: (e) => P.toggleMenu('export', e.currentTarget.parentElement) });
      $.toggle = h('button', {
        class: 'toggle',
        onclick: () => CE.settings.set({ launcherCollapsed: !CE.settings.get().launcherCollapsed })
      });
      $.toggle.append(h('img', { src: CE.ui.brandIcon, alt: 'ChatGPT Exporter', draggable: 'false' }));
      $.selSplit = h('div', { class: 'split' }, $.selMain, $.selCaret);
      $.expSplit = h('div', { class: 'split sec' }, $.expMain, $.expCaret);
      $.dock = h('div', { class: 'dock' }, $.toggle, $.selSplit, $.expSplit);
      P.wrap.appendChild($.dock);
    },

    // ------------------------------------------------------------------ panel
    buildPanel() {
      const $ = P.$;
      $.title = h('h2');
      $.hIcon = h('span', { class: 'ico', html: ICONS.sidebar });
      $.backBtn = h('button', { class: 'iconbtn back', html: ICONS.back, onclick: () => P.setView('select') });
      $.refreshBtn = h('button', { class: 'iconbtn', html: ICONS.refresh, onclick: () => P.refresh(true) });
      $.closeBtn = h('button', { class: 'iconbtn', html: ICONS.close, onclick: () => P.close() });
      $.head = h('div', { class: 'p-head' }, $.hIcon, $.backBtn, $.title, $.refreshBtn, $.closeBtn);
      $.tip = h('div', { class: 'p-tip' });

      $.presets = h('div', { class: 'presets' });
      ['all', 'questions', 'answers', 'none'].forEach((p) => {
        $['pre_' + p] = h('button', { onclick: () => P.setPreset(p) });
        $.presets.append($['pre_' + p]);
      });
      $.invert = h('button', { class: 'wide', onclick: () => P.invert() });
      $.presets.append($.invert);

      $.list = h('div', { class: 'list' });
      $.master = h('input', { type: 'checkbox', onchange: () => { P.setPreset($.master.checked ? 'all' : 'none', true); } });
      $.count = h('span', { class: 'count' });
      $.expand = h('input', { type: 'checkbox', onchange: () => { P.state.expand = $.expand.checked; $.list.classList.toggle('expanded', P.state.expand); } });
      $.expandLbl = h('label', null, $.expand, h('span'));
      $.copyBtn = h('button', { class: 'iconbtn', html: ICONS.copy, onclick: () => P.exportNow(P.copyFormat(), true) });
      $.bulkBtn = h('button', { class: 'iconbtn', html: ICONS.zip, onclick: () => CE.ui.bulk && CE.ui.bulk.open() });
      $.gearBtn = h('button', { class: 'iconbtn', html: ICONS.gear, onclick: () => P.setView('settings') });
      $.bar = h('div', { class: 'p-bar' }, $.master, $.count, $.expandLbl, h('span', { class: 'grow' }), $.copyBtn, $.bulkBtn, $.gearBtn);

      $.cancel = h('button', { class: 'btn cancel', onclick: () => P.close() });
      $.fmt = h('select', {
        class: 'fmt',
        onchange: () => { CE.settings.set({ format: $.fmt.value }); }
      });
      CE.FORMATS.forEach((f) => $.fmt.append(h('option', { value: f.id }, f.label)));
      $.exportBtn = h('button', { class: 'btn primary', onclick: () => P.exportSelected() });
      $.foot = h('div', { class: 'p-foot' }, $.cancel, $.fmt, $.exportBtn);

      $.settings = h('div', { class: 'settings' });
      $.panel = h('aside', { class: 'panel' }, $.head, $.tip, $.presets, $.list, $.bar, $.foot, $.settings);
      P.wrap.appendChild($.panel);
    },

    buildMenus() {
      P.menu = h('div', { class: 'menu' });
      P.wrap.appendChild(P.menu);
    },

    closeMenus() {
      if (P.menu) P.menu.classList.remove('open');
      P._menuFor = null;
    },

    toggleMenu(kind, anchor) {
      if (P._menuFor === kind && P.menu.classList.contains('open')) return P.closeMenus();
      const s = CE.settings.get();
      P.menu.textContent = '';
      if (kind === 'preset') {
        ['all', 'questions', 'answers', 'none'].forEach((p) => {
          const label = p === 'all' ? t('allDefault') : t(p);
          P.menu.append(h('button', { onclick: () => { P.closeMenus(); P.open(p); } }, label, p === P.state.preset ? h('span', { class: 'check' }, '✓') : null));
        });
        P.menu.append(h('div', { class: 'sep' }), h('button', { onclick: () => { P.closeMenus(); P.setView('settings'); P.openPanelOnly(); } }, t('settings')));
        if (CE.ui.bulk) P.menu.append(h('button', { onclick: () => { P.closeMenus(); CE.ui.bulk.open(); } }, t('exportAll')));
      } else {
        CE.FORMATS.forEach((f) => {
          P.menu.append(h('button', { onclick: () => { P.closeMenus(); P.exportNow(f.id); } }, f.label, f.id === s.format ? h('span', { class: 'check' }, '✓') : null));
        });
        P.menu.append(h('div', { class: 'sep' }));
        CE.FORMATS.filter((f) => f.copy).forEach((f) => {
          P.menu.append(h('button', { onclick: () => { P.closeMenus(); P.exportNow(f.id, true); } }, t('copyAs', { fmt: f.id === 'html' ? t('richText') : f.label })));
        });
      }
      P.menu.classList.add('open');
      const r = anchor.getBoundingClientRect();
      const mh = P.menu.offsetHeight;
      const mw = P.menu.offsetWidth;
      P.menu.style.left = Math.max(8, Math.min(window.innerWidth - mw - 8, r.right - mw)) + 'px';
      let top = r.top - mh - 6;
      if (top < 8) top = Math.min(window.innerHeight - mh - 8, r.bottom + 6);
      P.menu.style.top = top + 'px';
      P._menuFor = kind;
    },

    // ------------------------------------------------------------------ state
    copyFormat() {
      const f = CE.formatInfo(CE.settings.get().format);
      return f.copy ? f.id : 'markdown';
    },

    setView(v) {
      P.state.view = v;
      if (v === 'settings') {
        CE.ui.settingsForm.render(P.$.settings, CE.settings.get(), (k, val) => {
          CE.settings.set({ [k]: val });
        });
      }
      P.render();
    },

    openPanelOnly() {
      P.$.panel.classList.add('open');
      P.applySettings();
    },

    async open(preset) {
      P.applySettings();
      if (preset) {
        P.state.preset = preset;
        if (preset !== 'none' && CE.settings.get().rememberSelection) CE.settings.set({ selectionPreset: preset });
      }
      P.state.view = 'select';
      P.$.panel.classList.add('open');
      P.render();
      await P.refresh(false, preset || P.state.preset);
    },

    close() {
      P.$.panel.classList.remove('open');
    },

    toggle() {
      if (P.$.panel.classList.contains('open')) P.close();
      else P.open();
    },

    async refresh(force, preset) {
      const key = location.href;
      if (P.state.loading) return;
      if (!force && P.state.convo && P._urlKey === key && !P._dirty) {
        P.applyPreset(preset || P.state.preset);
        P.render();
        return;
      }
      P.state.loading = true;
      P.state.error = null;
      P.state.progress = '';
      P.render();
      try {
        const convo = await CE.loadConversation({
          onProgress: (n) => { P.state.progress = t('loadingHistory') + ' (' + n + ')'; P.renderState(); }
        });
        P.state.convo = convo;
        P._urlKey = key;
        P._dirty = false;
        P.applyPreset(preset || P.state.preset);
      } catch (e) {
        P.state.convo = null;
        P.state.error = CE.humanError(e);
      } finally {
        P.state.loading = false;
        P.render();
      }
    },

    applyPreset(preset) {
      const c = P.state.convo;
      P.state.preset = preset;
      P.state.selected = new Set(c ? CE.presetIndexes(c, preset) : []);
      P.state.lastIdx = null;
    },

    setPreset(p, fromMaster) {
      if (P.state.convo) P.applyPreset(p);
      else P.state.preset = p;
      if (!fromMaster && p !== 'none' && CE.settings.get().rememberSelection) CE.settings.set({ selectionPreset: p });
      P.render();
    },

    invert() {
      const c = P.state.convo;
      if (!c) return;
      const next = new Set();
      c.messages.forEach((m, i) => { if (!P.state.selected.has(i)) next.add(i); });
      P.state.selected = next;
      P.state.preset = '';
      P.render();
    },

    onNavigate() {
      P._dirty = true;
      P.state.convo = null;
      if (P.$.panel && P.$.panel.classList.contains('open') && P.state.view === 'select') P.refresh(true);
    },

    // ------------------------------------------------------------------ render
    render() {
      const $ = P.$;
      const s = CE.settings.get();
      const st = P.state;
      CE.i18n.applyDir(P.wrap);
      $.toggle.title = 'ChatGPT Exporter: ' + t('toggleTitle');
      $.selMain.textContent = t('select');
      $.expMain.textContent = t('export');
      $.title.textContent = st.view === 'settings' ? t('settings') : t('selectMessages');
      $.hIcon.style.display = st.view === 'settings' ? 'none' : '';
      $.backBtn.style.display = st.view === 'settings' ? '' : 'none';
      $.refreshBtn.style.display = st.view === 'settings' ? 'none' : '';
      $.tip.textContent = t('tip');
      $.pre_all.textContent = t('all');
      $.pre_questions.textContent = t('questions');
      $.pre_answers.textContent = t('answers');
      $.pre_none.textContent = t('none');
      $.invert.textContent = t('invert');
      ['all', 'questions', 'answers', 'none'].forEach((p) => $['pre_' + p].classList.toggle('on', st.preset === p));
      $.cancel.textContent = t('cancel');
      $.exportBtn.textContent = t('export');
      $.expandLbl.lastChild.textContent = t('expand');
      $.copyBtn.title = t('copy');
      $.bulkBtn.title = t('exportAll');
      $.bulkBtn.style.display = CE.pickAdapter() && CE.pickAdapter().supportsBulk ? '' : 'none';
      $.gearBtn.title = t('settings');
      $.fmt.value = s.format;
      $.toggle.setAttribute('aria-expanded', String(!s.launcherCollapsed));

      const settingsView = st.view === 'settings';
      $.settings.style.display = settingsView ? '' : 'none';
      [$.tip, $.presets, $.list, $.bar, $.foot].forEach((e) => { e.style.display = settingsView ? 'none' : ''; });
      if (settingsView) return;

      P.renderState();
    },

    renderState() {
      const $ = P.$;
      const st = P.state;
      $.list.textContent = '';
      $.list.classList.toggle('expanded', st.expand);
      $.expand.checked = st.expand;

      if (st.loading) {
        $.list.append(h('div', { class: 'state' }, h('div', { class: 'spin' }), h('div', null, st.progress || t('loading'))));
        $.count.textContent = '';
        P.setBusy(true);
        return;
      }
      if (st.error) {
        $.list.append(h('div', { class: 'state' }, h('div', null, st.error), h('button', { class: 'btn', onclick: () => P.refresh(true) }, t('retry'))));
        $.count.textContent = '0/0';
        P.setBusy(true);
        return;
      }
      const c = st.convo;
      if (!c) {
        $.count.textContent = '';
        P.setBusy(true);
        return;
      }
      const frag = document.createDocumentFragment();
      c.messages.forEach((m, i) => {
        const on = st.selected.has(i);
        const cb = h('input', { type: 'checkbox' });
        cb.checked = on;
        const row = h('div', { class: 'row ' + m.role + (on ? '' : ' off'), 'data-i': i, title: U.truncate(U.plainFromMarkdownLine(m.markdown), 400) },
          cb,
          h('span', { class: 'ri', html: m.role === 'user' ? ICONS.user : ICONS.ai }),
          h('span', { class: 'txt' }, U.truncate(U.plainFromMarkdownLine(m.markdown) || '…', st.expand ? 900 : 160)));
        row.addEventListener('click', (e) => P.toggleRow(i, e.shiftKey));
        frag.append(row);
      });
      $.list.append(frag);
      const total = c.messages.length;
      const n = st.selected.size;
      $.count.textContent = t('selectedOf', { a: n, b: total });
      $.master.checked = n === total && total > 0;
      $.master.indeterminate = n > 0 && n < total;
      P.setBusy(false);
    },

    setBusy(disabled) {
      const $ = P.$;
      $.exportBtn.disabled = disabled || P.state.exporting;
      $.copyBtn.disabled = disabled || P.state.exporting;
      $.exportBtn.textContent = P.state.exporting ? '…' : t('export');
    },

    toggleRow(i, shift) {
      const st = P.state;
      const next = !st.selected.has(i);
      if (shift && st.lastIdx != null) {
        const [a, b] = [Math.min(st.lastIdx, i), Math.max(st.lastIdx, i)];
        for (let k = a; k <= b; k++) { if (next) st.selected.add(k); else st.selected.delete(k); }
      } else if (next) st.selected.add(i);
      else st.selected.delete(i);
      st.lastIdx = i;
      st.preset = '';
      // cheap in-place update
      const rows = P.$.list.querySelectorAll('.row');
      rows.forEach((r) => {
        const idx = +r.getAttribute('data-i');
        const on = st.selected.has(idx);
        r.classList.toggle('off', !on);
        r.querySelector('input').checked = on;
      });
      const total = st.convo.messages.length;
      P.$.count.textContent = t('selectedOf', { a: st.selected.size, b: total });
      P.$.master.checked = st.selected.size === total;
      P.$.master.indeterminate = st.selected.size > 0 && st.selected.size < total;
      ['all', 'questions', 'answers', 'none'].forEach((p) => P.$['pre_' + p].classList.remove('on'));
    },

    // ------------------------------------------------------------------ export
    toast(msg, kind, action) {
      const el = h('div', { class: 'toast' + (kind === 'err' ? ' err' : '') }, msg);
      if (action) {
        const btn = h('button', { class: 'toast-act', type: 'button' }, action.label);
        btn.addEventListener('click', () => { action.onClick(); el.remove(); });
        el.append(btn);
      }
      P.toasts.append(el);
      setTimeout(() => el.remove(), action ? 12000 : kind === 'err' ? 7000 : 3600);
    },

    /** Free-plan limit reached: say so plainly and offer the upgrade. */
    limitToast(e) {
      P.toast(e.message, 'err', { label: t('seePlans'), onClick: () => CE.account.openSite('plans') });
    },

    /** Export using the panel selection when the panel is showing a conversation. */
    async exportSelected() {
      const st = P.state;
      if (!st.convo) return;
      await P.doExport(st.convo, [...st.selected], CE.settings.get().format, false, true);
    },

    /** Export from the dock (no panel needed) using the remembered preset. */
    async exportNow(format, copy) {
      const st = P.state;
      try {
        const s = CE.settings.get();
        const panelOpen = P.$.panel.classList.contains('open') && st.view === 'select';
        if (panelOpen && st.convo && !st.loading) {
          return await P.doExport(st.convo, [...st.selected], format, !!copy, false);
        }
        P.toast(t('loading'));
        const convo = await CE.loadConversation({});
        let preset = s.rememberSelection ? s.selectionPreset : 'all';
        if (!preset || preset === 'none') preset = 'all';
        await P.doExport(convo, CE.presetIndexes(convo, preset), format, !!copy, false);
      } catch (e) {
        if (e instanceof CE.LimitError) P.limitToast(e);
        else P.toast(t('failed', { msg: CE.humanError(e) }), 'err');
      }
    },

    async doExport(convo, indexes, format, copy, fromPanel) {
      const st = P.state;
      if (!indexes.length) { P.toast(t('nothingSelected'), 'err'); return; }
      st.exporting = true;
      P.setBusy(false);
      try {
        const r = await CE.runExport({ convo, indexes, format, copy });
        const s = CE.settings.get();
        if (s.showToasts) {
          if (r.opened) P.toast(t('pdfHint'));
          else if (r.copied) P.toast(t('copiedN', { n: r.count, fmt: r.format.label }));
          else P.toast(t('exportedN', { n: r.count, fmt: r.format.label }) + ' — ' + r.filename);
        }
        if (fromPanel && s.closePanelAfterExport) P.close();
      } catch (e) {
        if (e instanceof CE.LimitError) P.limitToast(e);
        else P.toast(t('failed', { msg: CE.humanError(e) }), 'err');
      } finally {
        st.exporting = false;
        P.setBusy(!st.convo);
      }
    }
  });
})(globalThis.CE);
