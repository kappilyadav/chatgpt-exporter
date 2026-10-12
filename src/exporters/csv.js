/* Chat Exporter — CSV exporter (UTF-8 with BOM so Excel opens it correctly). */
(function (CE) {
  'use strict';
  const X = CE.xc;
  const U = CE.util;

  CE.exporters.csv = {
    id: 'csv',
    async build(ctx) {
      const { convo, messages, settings: s } = ctx;
      const d = s.csvDelimiter || ',';
      const head = ['#', 'role', 'author', 'timestamp', 'content', 'thought_process', 'sources', 'attachments'];
      const rows = [head];
      messages.forEach((m, i) => {
        rows.push([
          i + 1,
          m.role,
          X.labelFor(m, convo, s),
          m.time ? new Date(m.time).toISOString() : '',
          m.markdown || '',
          X.thinking(m, s),
          X.sources(m, s).map((x) => x.title + ' <' + x.url + '>').join('\n'),
          X.attachments(m).map((a) => a.name).join('\n')
        ]);
      });
      const text = '﻿' + rows.map((r) => r.map((c) => U.csvEscape(c, d)).join(d)).join('\r\n') + '\r\n';
      return { text, mime: 'text/csv;charset=utf-8', filename: X.filename(convo, s, 'csv') };
    }
  };
})(globalThis.CE);
