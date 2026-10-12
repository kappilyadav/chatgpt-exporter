/* Chat Exporter — PDF + PNG exporters.
 * Both hand the (already filtered) conversation to the extension's own render page (print/print.html),
 * which lays it out with KaTeX and either opens the browser print dialog ("Save as PDF") or rasterises it to PNG.
 * Nothing leaves the browser.
 */
(function (CE) {
  'use strict';
  const X = CE.xc;
  const U = CE.util;

  async function openJob(ctx, mode) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime) throw new Error('Extension context unavailable');
    const id = U.uid();
    const job = {
      id,
      mode,
      createdAt: Date.now(),
      convo: X.slim(ctx.convo),
      messages: ctx.messages,
      settings: ctx.settings,
      filename: X.filename(ctx.convo, ctx.settings, mode === 'png' ? 'png' : 'pdf')
    };
    await chrome.storage.local.set({ ['printJob:' + id]: job });
    const r = await chrome.runtime.sendMessage({ type: 'open-print', id });
    if (r && r.error) throw new Error(r.error);
    return { opened: true, filename: job.filename };
  }

  CE.exporters.pdf = { id: 'pdf', build: (ctx) => openJob(ctx, 'pdf') };
  CE.exporters.png = { id: 'png', build: (ctx) => openJob(ctx, 'png') };
})(globalThis.CE);
