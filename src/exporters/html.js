/* Chat Exporter — standalone HTML exporter (single self-contained file). */
(function (CE) {
  'use strict';
  const X = CE.xc;

  CE.exporters.html = {
    id: 'html',
    async build(ctx) {
      const { convo, settings: s } = ctx;
      const html = CE.htmlb.document(ctx, { mode: 'html', mathCdn: true, detailsOpen: false });
      return { text: html, mime: 'text/html;charset=utf-8', filename: X.filename(convo, s, 'html') };
    }
  };
})(globalThis.CE);
