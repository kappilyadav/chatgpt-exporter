/* Chat Exporter — JSON exporter. */
(function (CE) {
  'use strict';
  const X = CE.xc;

  CE.exporters.json = {
    id: 'json',
    async build(ctx) {
      const { convo, messages, settings: s } = ctx;
      const iso = (ms) => (ms ? new Date(ms).toISOString() : null);
      const doc = {
        title: convo.title,
        platform: convo.platform,
        id: convo.id || null,
        url: convo.url || null,
        model: convo.model || null,
        createdAt: iso(convo.createdAt),
        updatedAt: iso(convo.updatedAt),
        exportedAt: new Date().toISOString(),
        exporter: { name: 'Chat Exporter', version: CE.VERSION },
        user: (s.userName || s.userEmail) ? { name: s.userName || null, email: s.userEmail || null } : undefined,
        messageCount: messages.length,
        messages: messages.map((m, i) => {
          const o = {
            index: i,
            id: m.id,
            role: m.role,
            author: X.labelFor(m, convo, s),
            time: iso(m.time),
            content: m.markdown || ''
          };
          const th = X.thinking(m, s);
          if (th) o.thinking = th;
          const src = X.sources(m, s);
          if (src.length) o.sources = src.map((x) => ({ n: x.n, title: x.title, url: x.url }));
          const at = X.attachments(m);
          if (at.length) o.attachments = at;
          if (m.model) o.model = m.model;
          return o;
        })
      };
      const text = JSON.stringify(doc, null, s.jsonPretty === false ? 0 : 2) + '\n';
      return { text, mime: 'application/json;charset=utf-8', filename: X.filename(convo, s, 'json') };
    }
  };
})(globalThis.CE);
