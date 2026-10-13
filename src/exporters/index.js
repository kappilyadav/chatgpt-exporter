/* Chat Exporter — export pipeline: adapter selection, conversation loading, selection presets, export dispatch. */
(function (CE) {
  'use strict';
  const U = CE.util;

  CE.pickAdapter = function () {
    if (CE.forceAdapter && CE.adapters[CE.forceAdapter]) return CE.adapters[CE.forceAdapter];
    const host = (typeof location !== 'undefined' && location.hostname) || '';
    return Object.values(CE.adapters).find((a) => a.match && a.match(host)) || null;
  };

  /** Load the current conversation using the active adapter. */
  CE.loadConversation = async function (hooks) {
    const adapter = CE.pickAdapter();
    if (!adapter) throw new Error(CE.t('noConversation'));
    const s = CE.settings.get();
    const convo = await adapter.load(s, hooks || {});
    if (!convo || !convo.messages || !convo.messages.length) throw new Error(CE.t('noConversation'));
    convo.assistantName = convo.assistantName || adapter.assistantName;
    return convo;
  };

  CE.presetIndexes = function (convo, preset) {
    const out = [];
    convo.messages.forEach((m, i) => {
      if (preset === 'questions' && m.role !== 'user') return;
      if (preset === 'answers' && m.role !== 'assistant') return;
      if (preset === 'none') return;
      out.push(i);
    });
    return out;
  };

  CE.formatInfo = (id) => CE.FORMATS.find((f) => f.id === id) || CE.FORMATS[0];

  /**
   * Run one export.
   * @param {{convo, indexes:number[], format:string, copy?:boolean}} o
   */
  CE.runExport = async function (o) {
    // Downloads use quota (copy to clipboard never does). Whole chat = "full", part of a chat = "single".
    if (o.copy) return runExportInner(o);
    const total = o.convo.messages.length;
    const kind = new Set(o.indexes).size >= total ? 'full' : 'single';
    const q = await CE.account.consume(kind, 1);
    if (!q.ok) throw new CE.LimitError(q);
    try {
      return await runExportInner(o);
    } catch (e) {
      await CE.account.refund(kind, 1); // a failed export should not cost the user an export
      throw e;
    }
  };

  async function runExportInner(o) {
    const s = CE.settings.get();
    const fmt = CE.formatInfo(o.format);
    const ex = CE.exporters[fmt.id];
    if (!ex) throw new Error('Unknown format: ' + o.format);
    const idx = [...new Set(o.indexes)].sort((a, b) => a - b);
    const msgs = idx.map((i) => o.convo.messages[i]).filter(Boolean);
    if (!msgs.length) throw new Error(CE.t('nothingSelected'));

    const prepared = msgs.map((m) => Object.assign({}, m));
    const wantsEmbedded = ['pdf', 'html', 'docx', 'png'].includes(fmt.id) && s.embedImages && s.includeImages;
    if (wantsEmbedded) {
      await Promise.all(prepared.map(async (m) => {
        if (m.markdown && m.markdown.includes('![')) m.markdown = await CE.assets.inlineImages(m.markdown);
      }));
    }

    const ctx = { convo: o.convo, messages: prepared, settings: s };
    const res = await ex.build(ctx);
    if (res.opened) return { opened: true, count: msgs.length, filename: res.filename, format: fmt };

    if (o.copy) {
      if (fmt.id === 'html') {
        const p = CE.htmlb.build(ctx, { mode: 'html' });
        const text = prepared.map((m) => CE.xc.labelFor(m, o.convo, s) + ':\n' + CE.md.toText(m.markdown || '')).join('\n\n');
        await U.copyText(text, '<h1>' + CE.md.esc(p.title) + '</h1>' + p.body.replace(/^<header[\s\S]*?<\/header>/, ''));
      } else {
        await U.copyText(res.text);
      }
      return { copied: true, count: msgs.length, format: fmt };
    }

    const blob = res.blob || new Blob([res.text], { type: res.mime || fmt.mime });
    await U.saveBlob(blob, res.filename, s.downloadSubfolder);
    return { filename: res.filename, count: msgs.length, format: fmt };
  }

  CE.humanError = (e) => String((e && e.message) || e || 'Unknown error');
})(globalThis.CE);
