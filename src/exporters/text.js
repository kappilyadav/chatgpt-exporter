/* Chat Exporter — plain-text exporter. */
(function (CE) {
  'use strict';
  const X = CE.xc;

  CE.exporters.text = {
    id: 'text',
    async build(ctx) {
      const { convo, messages, settings: s } = ctx;
      const title = X.title(convo, s, true);
      const bar = '='.repeat(Math.max(20, Math.min(70, title.length)));
      const out = [bar, title, bar];
      const meta = ['Platform: ' + convo.platformName + (convo.model ? ' (' + convo.model + ')' : '')];
      const d = X.dateStr(convo, s);
      if (d) meta.push('Date: ' + d);
      const ul = X.userLine(s);
      if (ul) meta.push('User: ' + ul);
      if (convo.url && /^https?:/.test(convo.url)) meta.push('URL: ' + convo.url);
      out.push(meta.join('\n'), '');

      messages.forEach((m) => {
        const time = X.msgTimeStr(m, s);
        out.push('[' + X.labelFor(m, convo, s) + ']' + (time ? ' ' + time : ''));
        const th = X.thinking(m, s);
        if (th) out.push('(Thought process)\n' + CE.md.toText(th).split('\n').map((l) => '  ' + l).join('\n'));
        if (m.markdown) out.push(m.role === 'user' ? plainUser(m.markdown) : CE.md.toText(m.markdown, {}));
        const atts = X.attachments(m);
        if (atts.length) out.push('Attachments: ' + atts.map((a) => a.name).join(', '));
        const src = X.sources(m, s);
        if (src.length) out.push('Sources:\n' + src.map((x) => '  [' + x.n + '] ' + x.title + ' - ' + x.url).join('\n'));
        out.push('', '-'.repeat(40), '');
      });
      if (s.branding) out.push('Exported with Chat Exporter');
      return { text: out.join('\n').replace(/\n{4,}/g, '\n\n\n').trimEnd() + '\n', mime: 'text/plain;charset=utf-8', filename: X.filename(convo, s, 'txt') };
    }
  };

  // User prompts are already plain text; only drop code-fence markers.
  function plainUser(md) {
    return md.replace(/^```[^\n]*\n([\s\S]*?)\n```$/gm, (m, c) => c.split('\n').map((l) => '    ' + l).join('\n'));
  }
})(globalThis.CE);
