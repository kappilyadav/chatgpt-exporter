/* Chat Exporter — Markdown exporter. */
(function (CE) {
  'use strict';
  const X = CE.xc;

  const yamlStr = (v) => '"' + String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ') + '"';

  function quote(text) {
    return text.split('\n').map((l) => (l ? '> ' + l : '>')).join('\n');
  }

  CE.exporters.markdown = {
    id: 'markdown',
    async build(ctx) {
      const { convo, messages, settings: s } = ctx;
      const out = [];
      const date = X.dateStr(convo, s);

      if (s.mdFrontMatter) {
        const fm = ['---', 'title: ' + yamlStr(convo.title), 'platform: ' + yamlStr(convo.platformName)];
        if (convo.model) fm.push('model: ' + yamlStr(convo.model));
        if (date) fm.push('date: ' + yamlStr(date));
        if (convo.url) fm.push('source: ' + yamlStr(convo.url));
        fm.push('messages: ' + messages.length, 'exported: ' + yamlStr(new Date().toISOString()), '---', '');
        out.push(fm.join('\n'));
      }

      out.push('# ' + X.title(convo, s, true).replace(/\n/g, ' '));
      const meta = [];
      meta.push('**Platform:** ' + convo.platformName + (convo.model ? ' (' + convo.model + ')' : ''));
      if (date) meta.push('**Date:** ' + date);
      const ul = X.userLine(s);
      if (ul) meta.push('**User:** ' + ul);
      if (convo.url && /^https?:/.test(convo.url)) meta.push('**Source:** ' + convo.url);
      out.push(meta.join('  \n'));
      out.push('---');

      messages.forEach((m) => {
        const isUser = m.role === 'user';
        const icon = s.showRoleIcons ? (isUser ? '🧑 ' : '🤖 ') : '';
        const time = X.msgTimeStr(m, s);
        const parts = ['## ' + icon + X.labelFor(m, convo, s)];
        if (time) parts.push('*' + time + '*');

        const th = X.thinking(m, s);
        if (th) {
          if (s.mdThinkingStyle === 'details') parts.push('<details>\n<summary>Thought process</summary>\n\n' + th + '\n\n</details>');
          else parts.push(quote('**Thought process**\n\n' + th));
        }
        if (m.markdown) parts.push(m.markdown);

        const atts = X.attachments(m);
        if (atts.length) parts.push(atts.map((a) => '📎 *' + a.name + '*').join('  \n'));

        const src = X.sources(m, s);
        if (src.length) parts.push('**Sources**\n\n' + src.map((x) => x.n + '. [' + x.title.replace(/[\[\]]/g, '') + '](' + x.url + ')').join('\n'));

        out.push(parts.join('\n\n'));
        out.push('---');
      });

      if (s.branding) out.push('*Exported with Chat Exporter*');
      const text = out.join('\n\n').replace(/\n{3,}/g, '\n\n').replace(/(?:\n---\s*)+$/, '').trimEnd() + '\n';
      return { text, mime: 'text/markdown;charset=utf-8', filename: X.filename(convo, s, 'md') };
    }
  };
})(globalThis.CE);
