/* Chat Exporter — builds the styled HTML used by the HTML, PDF (print) and PNG exporters. */
(function (CE) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const ICON_USER = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>';
  const ICON_AI = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>';

  const FONTS = {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "PingFang SC", "Hiragino Sans", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans CJK JP", sans-serif',
    serif: 'Georgia, "Times New Roman", "Noto Serif", "Songti SC", "Hiragino Mincho ProN", "Noto Serif CJK SC", serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", "Noto Sans Mono CJK SC", monospace'
  };
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

  const PAGE_SIZES = { A4: 'A4', Letter: 'letter', Legal: 'legal', A3: 'A3', A5: 'A5' };
  const MARGINS = { narrow: '10mm', normal: '18mm', wide: '28mm' };

  function css(s, mode) {
    const scale = Math.max(0.5, Math.min(3, (Number(s.pdfFontScale) || 100) / 100));
    const base = mode === 'print' ? 11 * scale + 'pt' : 15 * scale + 'px';
    const wrap = s.pdfWrapCode !== false;
    return `
.ce-body{--bg:#ffffff;--fg:#1f2328;--muted:#6b7280;--border:#e3e6ea;--user-bg:#f5f3ff;--user-bar:#8b5cf6;--ai-bar:#d1d5db;--code-bg:#f6f8fa;--link:#2563eb;--th-bg:#f3f4f6;--think-bg:#fafafa;
  background:var(--bg);color:var(--fg);font-family:${FONTS[s.pdfFontFamily] || FONTS.sans};font-size:${base};line-height:1.6;margin:0;padding:${mode === 'image' ? '32px' : '0'};box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;word-wrap:break-word;overflow-wrap:anywhere;}
.ce-body.theme-dark{--bg:#16171b;--fg:#e8e8ea;--muted:#9ca3af;--border:#33363d;--user-bg:#211d33;--user-bar:#a78bfa;--ai-bar:#3f434c;--code-bg:#0e0f12;--link:#8ab4ff;--th-bg:#23252b;--think-bg:#1c1d22;}
.ce-body *{box-sizing:border-box}
.ce-body a{color:var(--link);text-decoration:none}
.ce-body .doc-head{border-bottom:1px solid var(--border);padding-bottom:.8em;margin-bottom:1.4em}
.ce-body h1.doc-title{font-size:1.7em;line-height:1.25;margin:0 0 .35em}
.ce-body .meta{color:var(--muted);font-size:.85em}
.ce-body .meta span+span:before{content:" · ";white-space:pre}
.ce-body .toc{border:1px solid var(--border);border-radius:8px;padding:.8em 1.2em;margin:0 0 1.6em;break-inside:avoid}
.ce-body .toc h2{font-size:1em;margin:0 0 .4em}
.ce-body .toc ol{margin:0;padding-left:1.4em;font-size:.92em}
.ce-body .toc li{margin:.15em 0}
.ce-body .msg{margin:0 0 1.15em;padding:.7em 1em .8em;border-left:4px solid var(--ai-bar);border-radius:0 6px 6px 0}
.ce-body .msg.user{background:var(--user-bg);border-left-color:var(--user-bar)}
.ce-body .msg-head{display:flex;align-items:center;gap:.5em;font-weight:600;font-size:.82em;letter-spacing:.02em;text-transform:uppercase;color:var(--muted);margin-bottom:.45em}
.ce-body .msg-head svg{flex:none}
.ce-body .msg-head .time{font-weight:400;text-transform:none;letter-spacing:0;margin-left:auto;font-size:.95em}
.ce-body .msg-body>:first-child{margin-top:0}
.ce-body .msg-body>:last-child{margin-bottom:0}
.ce-body p{margin:.6em 0}
.ce-body h1,.ce-body h2,.ce-body h3,.ce-body h4,.ce-body h5,.ce-body h6{line-height:1.3;margin:1.1em 0 .4em;break-after:avoid}
.ce-body .msg-body h1{font-size:1.35em}.ce-body .msg-body h2{font-size:1.22em}.ce-body .msg-body h3{font-size:1.1em}
.ce-body ul,.ce-body ol{margin:.5em 0;padding-left:1.6em}
.ce-body li{margin:.2em 0}
.ce-body li>p{margin:.25em 0}
.ce-body code{font-family:${MONO};font-size:.88em;background:var(--code-bg);padding:.12em .35em;border-radius:4px}
.ce-body pre{background:var(--code-bg);border:1px solid var(--border);border-radius:8px;padding:.75em .95em;margin:.7em 0;overflow:auto;white-space:${wrap ? 'pre-wrap' : 'pre'};word-break:${wrap ? 'break-word' : 'normal'};line-height:1.45;position:relative}
.ce-body pre[data-lang]:before{content:attr(data-lang);display:block;font:600 .7em ${MONO};color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4em}
.ce-body pre code{background:none;padding:0;font-size:.86em;border-radius:0}
.ce-body blockquote{margin:.7em 0;padding:.1em 1em;border-left:3px solid var(--ai-bar);color:var(--muted)}
.ce-body hr{border:0;border-top:1px solid var(--border);margin:1.2em 0}
.ce-body img{max-width:100%;height:auto;border-radius:6px}
.ce-body .table-wrap{overflow:auto;margin:.7em 0}
.ce-body table{border-collapse:collapse;font-size:.93em;width:auto;max-width:100%}
.ce-body th,.ce-body td{border:1px solid var(--border);padding:.4em .65em;vertical-align:top;text-align:left}
.ce-body th{background:var(--th-bg)}
.ce-body tr{break-inside:avoid}
.ce-body .math-inline{font-family:${MONO};font-size:.92em}
.ce-body div.math-block{margin:.8em 0;text-align:center;overflow-x:auto;overflow-y:hidden}
.ce-body .math.rendered{font-family:inherit;font-size:1em}
.ce-body details.thinking{background:var(--think-bg);border:1px dashed var(--border);border-radius:8px;padding:.45em .8em;margin:.2em 0 .8em;color:var(--muted);font-size:.93em}
.ce-body details.thinking summary{cursor:pointer;font-weight:600;font-size:.88em;text-transform:uppercase;letter-spacing:.03em}
.ce-body .sources{margin-top:.9em;padding-top:.5em;border-top:1px solid var(--border);font-size:.86em;color:var(--muted)}
.ce-body .sources .label{font-weight:600;text-transform:uppercase;font-size:.85em;letter-spacing:.04em;margin-bottom:.2em}
.ce-body .sources ol{margin:.2em 0;padding-left:1.8em}
.ce-body .attachments{font-size:.88em;color:var(--muted);margin:.3em 0}
.ce-body .brand{margin-top:2em;padding-top:.6em;border-top:1px solid var(--border);color:var(--muted);font-size:.78em;text-align:center}
${mode === 'print' && s.pdfPageBreakPerPrompt ? '.ce-body .msg.user:not(.first){break-before:page}' : ''}
${mode === 'print' ? '.ce-body .msg{break-inside:auto}.ce-body .msg-head{break-after:avoid}.ce-body img{break-inside:avoid}' : ''}
`;
  }

  function pageCss(s) {
    const size = PAGE_SIZES[s.pdfPageSize] || 'A4';
    const orient = s.pdfOrientation === 'landscape' ? 'landscape' : 'portrait';
    const margin = MARGINS[s.pdfMargins] || MARGINS.normal;
    const num = s.pdfPageNumbers
      ? `@bottom-center{content:counter(page) " / " counter(pages);font:9pt ${FONTS.sans};color:${s.pdfTheme === 'dark' ? '#9ca3af' : '#6b7280'}}`
      : '';
    return `@page{size:${size} ${orient};margin:${margin};${num}}
html{background:${s.pdfTheme === 'dark' ? '#16171b' : '#ffffff'};-webkit-print-color-adjust:exact;print-color-adjust:exact}`;
  }

  /**
   * ctx: {convo, messages, settings}; opts: {mode: 'html'|'print'|'image', detailsOpen}
   * returns {css, body, title, theme}
   */
  function build(ctx, opts) {
    opts = opts || {};
    const mode = opts.mode || 'html';
    const { convo, messages, settings: s } = ctx;
    const X = CE.xc;
    const title = X.title(convo, s, true);
    const theme = mode === 'html' ? (s.pdfTheme === 'dark' ? 'dark' : 'light') : s.pdfTheme === 'dark' ? 'dark' : 'light';

    const meta = [];
    meta.push('<span>' + esc(convo.platformName || '') + '</span>');
    const d = X.dateStr(convo, s);
    if (d) meta.push('<span>' + esc(d) + '</span>');
    const ul = X.userLine(s);
    if (ul) meta.push('<span>' + esc(ul) + '</span>');
    if (convo.model) meta.push('<span>' + esc(convo.model) + '</span>');
    meta.push('<span>' + messages.length + ' ' + esc(CE.t('messages')) + '</span>');

    let toc = '';
    if (s.pdfToc && mode !== 'image') {
      const items = [];
      messages.forEach((m, i) => {
        if (m.role !== 'user') return;
        const t = CE.util.truncate(CE.util.plainFromMarkdownLine(m.markdown), 110) || '(' + CE.t('you') + ')';
        items.push('<li><a href="#m' + i + '">' + esc(t) + '</a></li>');
      });
      if (items.length) toc = '<nav class="toc"><h2>Contents</h2><ol>' + items.join('') + '</ol></nav>';
    }

    let firstUser = true;
    const msgs = messages.map((m, i) => {
      const isUser = m.role === 'user';
      const label = X.labelFor(m, convo, s);
      const time = X.msgTimeStr(m, s);
      const icon = s.showRoleIcons ? (isUser ? ICON_USER : ICON_AI) : '';
      const thinking = X.thinking(m, s);
      const sources = X.sources(m, s);
      const atts = X.attachments(m);
      const cls = 'msg ' + (isUser ? 'user' : 'assistant') + (isUser && firstUser ? ' first' : '');
      if (isUser) firstUser = false;
      const mdHtml = CE.md.toHtml(m.markdown || '', { breaks: isUser, headingOffset: 0 });
      return '<section class="' + cls + '" id="m' + i + '">' +
        '<div class="msg-head">' + icon + '<span class="who">' + esc(label) + '</span>' + (time ? '<span class="time">' + esc(time) + '</span>' : '') + '</div>' +
        (thinking ? '<details class="thinking"' + (opts.detailsOpen === false ? '' : ' open="open"') + '><summary>Thought process</summary>' + CE.md.toHtml(thinking, {}) + '</details>' : '') +
        '<div class="msg-body">' + mdHtml + '</div>' +
        (atts.length ? '<div class="attachments">' + atts.map((a) => '📎 ' + esc(a.name)).join(' &#160; ') + '</div>' : '') +
        (sources.length ? '<div class="sources"><div class="label">Sources</div><ol>' + sources.map((x) => '<li value="' + x.n + '"><a href="' + esc(CE.md.safeUrl(x.url)) + '">' + esc(x.title) + '</a></li>').join('') + '</ol></div>' : '') +
        '</section>';
    }).join('\n');

    const head = '<header class="doc-head"><h1 class="doc-title">' + esc(title) + '</h1><div class="meta">' + meta.join('') + '</div>' +
      (convo.url && /^https?:/.test(convo.url) ? '<div class="meta"><a href="' + esc(convo.url) + '">' + esc(convo.url) + '</a></div>' : '') + '</header>';
    const brand = s.branding ? '<div class="brand">Exported with Chat Exporter</div>' : '';

    return { css: css(s, mode), body: head + toc + msgs + brand, title, theme };
  }

  function document_(ctx, opts) {
    opts = opts || {};
    const p = build(ctx, opts);
    const mathScript = opts.mathCdn
      ? '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"/>' +
        '<script defer="defer" src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>' +
        '<script>document.addEventListener("DOMContentLoaded",function(){var t=0;(function w(){if(window.katex){document.querySelectorAll(".math").forEach(function(e){try{window.katex.render(e.getAttribute("data-tex"),e,{displayMode:e.classList.contains("math-block"),throwOnError:false});e.classList.add("rendered")}catch(x){}})}else if(t++<40)setTimeout(w,150)})()});</script>'
      : '';
    return '<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>' + esc(p.title) + '</title>' +
      '<style>html,body{margin:0}' + (opts.page ? pageCss(ctx.settings) : '') + '\n' + p.css + (opts.extraCss || '') + '</style>' + mathScript +
      '</head><body class="ce-body theme-' + p.theme + '">' + (opts.bodyWrap ? opts.bodyWrap(p.body) : (opts.wrapMax === false ? p.body : '<main style="max-width:860px;margin:0 auto;padding:32px 20px 60px">' + p.body + '</main>')) + '</body></html>';
  }

  CE.htmlb = { build, document: document_, pageCss, css, FONTS };
})(globalThis.CE);
