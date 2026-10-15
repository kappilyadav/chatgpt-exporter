/* Chat Exporter — "Export multiple chats" dialog (ChatGPT): picks chats, builds one ZIP. */
(function (CE) {
  'use strict';
  const U = CE.util;
  const t = (...a) => CE.t(...a);

  const BULK_FORMATS = ['markdown', 'html', 'docx', 'text', 'json', 'csv'];
  const EXT = { markdown: 'md', html: 'html', docx: 'docx', text: 'txt', json: 'json', csv: 'csv' };

  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    kids.flat().forEach((c) => { if (c != null) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return e;
  }

  const B = (CE.ui.bulk = {
    state: { items: [], selected: new Set(), filter: '', running: false, cancel: false },
    el: null,

    build() {
      if (B.el) return;
      const P = CE.ui.panel;
      B.fmt = h('select', { class: 'fmt', style: 'flex:none' });
      BULK_FORMATS.forEach((id) => B.fmt.append(h('option', { value: id }, CE.formatInfo(id).label)));
      B.fmt.value = BULK_FORMATS.includes(CE.settings.get().format) ? CE.settings.get().format : 'markdown';
      B.search = h('input', { type: 'search', placeholder: t('searchChats'), oninput: () => { B.state.filter = B.search.value.toLowerCase(); B.renderList(); } });
      B.all = h('input', { type: 'checkbox', onchange: () => B.toggleAll(B.all.checked) });
      B.list = h('div', { class: 'm-list' });
      B.msg = h('span', { class: 'msg' });
      B.bar = h('i');
      B.progress = h('div', { class: 'progress' }, B.bar);
      B.go = h('button', { class: 'btn primary', style: 'flex:none', onclick: () => B.run() }, t('exportZip'));
      B.cancelBtn = h('button', { class: 'btn cancel', onclick: () => B.close() }, t('cancel'));
      B.scrim = h('div', { class: 'scrim', onclick: (e) => { if (e.target === B.scrim && !B.state.running) B.close(); } },
        h('div', { class: 'modal' },
          h('div', { class: 'm-head' }, h('h3', null, t('bulkTitle'))),
          h('div', { class: 'm-tools' }, B.all, B.search, B.fmt),
          B.list,
          B.progress,
          h('div', { class: 'm-foot' }, B.msg, B.cancelBtn, B.go)));
      P.wrap.appendChild(B.scrim);
      B.el = B.scrim;
    },

    async open() {
      const adapter = CE.pickAdapter();
      const P = CE.ui.panel;
      if (!adapter || !adapter.supportsBulk) { P.toast(t('bulkUnsupported'), 'err'); return; }
      B.build();
      B.state.items = [];
      B.state.selected = new Set();
      B.msg.textContent = t('loading');
      B.list.textContent = '';
      B.scrim.classList.add('open');
      try {
        B.state.items = await adapter.list();
        B.state.selected = new Set(B.state.items.map((x) => x.id));
        B.msg.textContent = t('chatsFound', { n: B.state.items.length });
      } catch (e) {
        B.msg.textContent = t('failed', { msg: CE.humanError(e) });
      }
      B.renderList();
    },

    close() {
      if (B.state.running) { B.state.cancel = true; return; }
      B.scrim.classList.remove('open');
    },

    visible() {
      const f = B.state.filter;
      return f ? B.state.items.filter((x) => (x.title || '').toLowerCase().includes(f)) : B.state.items;
    },

    toggleAll(on) {
      B.visible().forEach((x) => { if (on) B.state.selected.add(x.id); else B.state.selected.delete(x.id); });
      B.renderList();
    },

    renderList() {
      B.list.textContent = '';
      const vis = B.visible();
      const frag = document.createDocumentFragment();
      vis.forEach((it) => {
        const cb = h('input', { type: 'checkbox' });
        cb.checked = B.state.selected.has(it.id);
        const row = h('div', { class: 'm-row' }, cb,
          h('span', { class: 't' }, it.title),
          h('span', { class: 'd' }, it.updatedAt ? U.formatDate(it.updatedAt, 'YYYY-MM-DD') : ''));
        row.addEventListener('click', (e) => {
          if (e.target !== cb) cb.checked = !cb.checked;
          if (cb.checked) B.state.selected.add(it.id); else B.state.selected.delete(it.id);
          B.updateMaster();
        });
        frag.append(row);
      });
      B.list.append(frag);
      B.updateMaster();
    },

    updateMaster() {
      const vis = B.visible();
      const n = vis.filter((x) => B.state.selected.has(x.id)).length;
      B.all.checked = vis.length > 0 && n === vis.length;
      B.all.indeterminate = n > 0 && n < vis.length;
      B.go.disabled = B.state.running || B.state.selected.size === 0;
    },

    async run() {
      const adapter = CE.pickAdapter();
      const P = CE.ui.panel;
      const s = CE.settings.get();
      const format = B.fmt.value;
      const ex = CE.exporters[format];
      const ids = B.state.items.filter((x) => B.state.selected.has(x.id));
      if (!ids.length) return;
      // Every chat in the ZIP is a whole chat, so it uses one "full" export.
      const q = await CE.account.consume('full', ids.length);
      if (!q.ok) {
        const left = Math.max(0, q.limit - q.used);
        B.msg.textContent = t('bulkFreeLeft', { left, n: ids.length });
        P.toast(CE.account.limitMessage(q), 'err', { label: t('seePlans'), onClick: () => CE.account.openSite('plans') });
        return;
      }
      let used = 0;
      B.state.running = true;
      B.state.cancel = false;
      B.go.disabled = true;
      B.progress.classList.add('on');
      B.cancelBtn.textContent = t('cancel');
      const files = [];
      const errors = [];
      try {
        for (let i = 0; i < ids.length; i++) {
          if (B.state.cancel) break;
          const it = ids[i];
          B.msg.textContent = t('progress', { i: i + 1, n: ids.length }) + ' ' + U.truncate(it.title, 40);
          B.bar.style.width = Math.round((i / ids.length) * 100) + '%';
          try {
            const convo = await adapter.loadById(it.id, s);
            convo.assistantName = convo.assistantName || adapter.assistantName;
            if (!convo.messages.length) continue;
            const ctx = { convo, messages: convo.messages, settings: s };
            if (s.embedImages && s.includeImages && (format === 'html' || format === 'docx')) {
              ctx.messages = await Promise.all(convo.messages.map(async (m) => (m.markdown && m.markdown.includes('![') ? Object.assign({}, m, { markdown: await CE.assets.inlineImages(m.markdown) }) : m)));
            }
            const res = await ex.build(ctx);
            let data;
            if (res.blob) data = new Uint8Array(await res.blob.arrayBuffer());
            else data = res.text;
            const stamp = U.formatDate(convo.updatedAt || convo.createdAt, 'YYYY-MM-DD');
            const base = U.sanitizeFilename((stamp ? stamp + ' ' : '') + convo.title, 'chat');
            files.push({ name: base + '.' + EXT[format], data, compress: format !== 'docx' });
            used++;
          } catch (e) {
            errors.push(it.title + ': ' + CE.humanError(e));
          }
          await U.sleep(250); // be gentle with the site's API
        }
        if (files.length) {
          if (errors.length) files.push({ name: '_errors.txt', data: errors.join('\n') });
          const blob = await CE.zip.create(files);
          const name = U.sanitizeFilename(((s.filenamePrefix || '') + adapter.name + ' chats ' + U.formatDate(Date.now(), 'YYYY-MM-DD')), 'chats') + '.zip';
          await U.saveBlob(blob, name, s.downloadSubfolder);
          B.bar.style.width = '100%';
          B.msg.textContent = t('bulkDone', { n: files.length - (errors.length ? 1 : 0) });
          P.toast(t('bulkDone', { n: files.length - (errors.length ? 1 : 0) }));
        } else {
          B.msg.textContent = errors[0] || t('noConversation');
        }
      } catch (e) {
        B.msg.textContent = t('failed', { msg: CE.humanError(e) });
      } finally {
        if (used < ids.length) await CE.account.refund('full', ids.length - used); // skipped, failed or cancelled chats
        B.state.running = false;
        B.go.disabled = false;
        B.progress.classList.remove('on');
      }
    }
  });
})(globalThis.CE);
