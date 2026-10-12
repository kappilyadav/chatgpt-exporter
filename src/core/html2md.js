/* Chat Exporter — DOM → Markdown converter.
 * Handles headings, lists, tables, fenced code (with language), KaTeX / data-math formulas,
 * links, images, quotes and <details>. Used for DOM scraping (Gemini, and fallbacks for ChatGPT / Claude).
 */
(function (CE) {
  'use strict';

  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'BUTTON', 'SVG', 'CANVAS', 'AUDIO', 'VIDEO', 'IFRAME', 'SELECT', 'TEXTAREA', 'OBJECT', 'EMBED', 'LINK', 'META']);
  const BLOCK = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DETAILS', 'DIALOG', 'DIV', 'DL', 'DT', 'DD', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HGROUP', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'SUMMARY', 'TABLE', 'UL', 'CODE-BLOCK', 'MESSAGE-CONTENT', 'RESPONSE-ELEMENT']);

  function html2md(root, opts) {
    opts = opts || {};
    const base = opts.baseUrl || (typeof location !== 'undefined' ? location.href : 'https://example.com/');

    const abs = (u) => {
      if (!u) return '';
      if (/^(data:|blob:|#|mailto:)/i.test(u)) return u;
      try { return new URL(u, base).href; } catch (e) { return u; }
    };

    const hasClass = (el, c) => el.classList && el.classList.contains(c);

    function hidden(el) {
      if (el.hasAttribute && el.hasAttribute('hidden')) return true;
      if (el.getAttribute && el.getAttribute('aria-hidden') === 'true' && !el.querySelector('.katex-mathml, annotation')) return true;
      return hasClass(el, 'sr-only') || hasClass(el, 'cdk-visually-hidden') || hasClass(el, 'visually-hidden');
    }

    function escapeText(s) {
      return s
        .replace(/\\(?=[\\`*_{}[\]()#+\-.!|<>~])/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\*(?=\S)|(?<=\S)\*/g, '\\*')
        .replace(/(^|[\s(])_(?=\S)|(?<=\S)_(?=$|[\s).,!?:;])/g, (m, a) => (a !== undefined && a !== '' ? a : '') + '\\_')
        .replace(/<(?=[a-zA-Z/!])/g, '\\<')
        .replace(/^(\s*)([#>])/gm, '$1\\$2')
        .replace(/^(\s*)([-+])(\s)/gm, '$1\\$2$3')
        .replace(/^(\s*)(\d+)([.)])(\s)/gm, '$1$2\\$3$4');
    }

    function texOf(el) {
      const ann = el.querySelector && el.querySelector('annotation[encoding="application/x-tex"]');
      if (ann) return ann.textContent.trim();
      const dm = el.getAttribute && (el.getAttribute('data-math') || el.getAttribute('data-tex'));
      if (dm) return dm.trim();
      return null;
    }

    function codeText(node) {
      let out = '';
      for (const c of node.childNodes) {
        if (c.nodeType === 3) out += c.nodeValue;
        else if (c.nodeType === 1) {
          if (SKIP.has(c.tagName) || c.tagName === 'svg') continue;
          if (c.tagName === 'BR') out += '\n';
          else if (hasClass(c, 'cm-line') && out && !out.endsWith('\n')) out += '\n' + codeText(c);
          else out += codeText(c);
        }
      }
      return out;
    }

    function codeLang(pre) {
      const code = pre.querySelector('code') || pre;
      const cls = (code.className || '') + ' ' + (pre.className || '') + ' ' + (pre.getAttribute('data-language') || '');
      let m = /(?:^|\s)(?:language|lang|highlight-source|hljs)[-_:]([\w+#.-]+)/i.exec(cls);
      if (m && m[1] && !/^(plaintext|text|nohighlight)$/i.test(m[1])) return m[1].toLowerCase();
      if (code.getAttribute && code.getAttribute('data-language')) return code.getAttribute('data-language');
      // header label next to the <pre> (ChatGPT / Gemini / Claude code-block chrome)
      const wrap = pre.closest ? pre.closest('code-block, .code-block, [class*="code-block"]') : null;
      const scopes = [wrap, pre.parentElement, pre.parentElement && pre.parentElement.parentElement].filter(Boolean);
      for (const sc of scopes) {
        const cands = sc.querySelectorAll('.code-block-decoration span, [class*="language"], [class*="lang"], [class*="header"] span, [class*="header"] div');
        for (const c of cands) {
          if (pre.contains(c) && c !== pre) { /* inside pre: allow only direct label */ }
          const t = (c.textContent || '').trim();
          if (/^[A-Za-z][\w+#.-]{0,20}$/.test(t) && !/^(copy|code|download|edit|run)$/i.test(t)) return t.toLowerCase();
        }
      }
      return '';
    }

    function fence(text, lang) {
      text = text.replace(/\n+$/, '');
      let n = 3;
      const runs = text.match(/`+/g);
      if (runs) n = Math.max(n, ...runs.map((r) => r.length + 1));
      const f = '`'.repeat(n);
      return f + (lang || '') + '\n' + text + '\n' + f;
    }

    function inlineCode(text) {
      text = text.replace(/\n/g, ' ');
      if (!text.includes('`')) return '`' + text + '`';
      const runs = text.match(/`+/g).map((r) => r.length);
      const n = Math.max(...runs) + 1;
      const f = '`'.repeat(n);
      return f + ' ' + text + ' ' + f;
    }

    function wrapMark(mark, inner) {
      if (!inner.trim()) return inner;
      const lead = inner.match(/^\s*/)[0];
      const trail = inner.match(/\s*$/)[0];
      return lead + mark + inner.trim() + mark + trail;
    }

    function inline(node, ctx) {
      if (node.nodeType === 3) {
        const v = ctx.pre ? node.nodeValue : node.nodeValue.replace(/\s+/g, ' ');
        return escapeText(v);
      }
      if (node.nodeType !== 1) return '';
      const tag = node.tagName.toUpperCase();
      if (SKIP.has(tag) || tag === 'svg' || hidden(node)) return '';

      // math
      if (hasClass(node, 'katex-display') || hasClass(node, 'math-block')) {
        const t = texOf(node);
        if (t != null) return '\n\n$$\n' + t + '\n$$\n\n';
      }
      if (hasClass(node, 'katex') || hasClass(node, 'math-inline') || node.hasAttribute('data-math')) {
        const t = texOf(node);
        if (t != null) {
          const disp = node.closest && node.closest('.katex-display, .math-block');
          return disp ? '\n\n$$\n' + t + '\n$$\n\n' : '$' + t + '$';
        }
      }
      if (tag === 'MATH') return node.getAttribute('alttext') ? '$' + node.getAttribute('alttext') + '$' : node.textContent;

      switch (tag) {
        case 'BR':
          return ctx.table ? '<br>' : '  \n';
        case 'STRONG':
        case 'B':
          return wrapMark('**', inlineChildren(node, ctx));
        case 'EM':
        case 'I':
          return wrapMark('*', inlineChildren(node, ctx));
        case 'DEL':
        case 'S':
        case 'STRIKE':
          return wrapMark('~~', inlineChildren(node, ctx));
        case 'CODE':
          return inlineCode(codeText(node));
        case 'KBD':
          return inlineCode(node.textContent);
        case 'SUP':
          return '<sup>' + node.textContent + '</sup>';
        case 'SUB':
          return '<sub>' + node.textContent + '</sub>';
        case 'A': {
          const href = node.getAttribute('href');
          const inner = inlineChildren(node, ctx).trim();
          if (!href || /^javascript:/i.test(href)) return inner;
          if (!inner) return '';
          return '[' + inner + '](' + abs(href).replace(/\)/g, '%29').replace(/\s/g, '%20') + ')';
        }
        case 'IMG': {
          const src = node.currentSrc || node.getAttribute('src') || '';
          if (!src) return '';
          const w = parseInt(node.getAttribute('width') || node.naturalWidth || '100', 10);
          if (w && w < 24 && !node.getAttribute('alt')) return '';
          return '![' + (node.getAttribute('alt') || '').replace(/[\]\n]/g, ' ') + '](' + abs(src) + ')';
        }
        case 'INPUT':
          return '';
        default:
          break;
      }
      if (BLOCK.has(tag)) return '\n\n' + blockOf(node, ctx) + '\n\n';
      return inlineChildren(node, ctx);
    }

    function inlineChildren(el, ctx) {
      let out = '';
      for (const c of el.childNodes) out += inline(c, ctx);
      return out;
    }

    function cellText(cell) {
      const parts = childBlocks(cell, { table: true }).map((b) => b.s);
      return parts.join('<br>').replace(/\s*\n\s*/g, '<br>').replace(/(<br>){3,}/g, '<br><br>').replace(/\|/g, '\\|').trim();
    }

    function table(el) {
      const rows = [...el.querySelectorAll('tr')].filter((tr) => tr.closest('table') === el);
      if (!rows.length) return '';
      const grid = rows.map((tr) => [...tr.children].filter((c) => /^(TD|TH)$/.test(c.tagName)));
      const cols = Math.max(...grid.map((r) => r.length));
      if (!cols) return '';
      const text = grid.map((r) => {
        const cells = r.map((c) => cellText(c) || ' ');
        while (cells.length < cols) cells.push(' ');
        return cells;
      });
      const align = (grid[0] || []).map((c) => {
        const a = (c.getAttribute('align') || (c.style && c.style.textAlign) || '').toLowerCase();
        return a === 'center' ? ':---:' : a === 'right' ? '---:' : a === 'left' ? ':---' : '---';
      });
      while (align.length < cols) align.push('---');
      const line = (cells) => '| ' + cells.join(' | ') + ' |';
      return [line(text[0]), line(align), ...text.slice(1).map(line)].join('\n');
    }

    function list(el, ctx) {
      const ordered = el.tagName === 'OL';
      let n = ordered ? parseInt(el.getAttribute('start') || '1', 10) : 0;
      const items = [];
      let loose = false;
      for (const li of el.children) {
        if (li.tagName !== 'LI') {
          // stray content directly inside the list
          const s = convertChildren(li, ctx);
          if (s) items.push({ text: s, raw: true });
          continue;
        }
        const parts = childBlocks(li, ctx);
        let first = true;
        let body = '';
        let task = '';
        const cb = li.querySelector(':scope > input[type=checkbox], :scope > p > input[type=checkbox]');
        if (cb) task = cb.checked ? '[x] ' : '[ ] ';
        parts.forEach((p) => {
          if (!p.s) return;
          if (first) { body = p.s; first = false; return; }
          if (p.list) body += '\n' + p.s;
          else { body += '\n\n' + p.s; loose = true; }
        });
        items.push({ text: task + body, raw: false });
      }
      const out = items.map((it) => {
        if (it.raw) return it.text;
        const marker = ordered ? n++ + '. ' : '- ';
        const pad = ' '.repeat(marker.length);
        const lines = it.text.split('\n');
        return marker + lines.map((l, i) => (i === 0 ? l : l ? pad + l : l)).join('\n');
      });
      return out.join(loose ? '\n\n' : '\n');
    }

    // A "code wrapper" is a block holding exactly one <pre> plus only chrome (language label, copy button).
    function codeWrapperPre(el) {
      const pres = el.querySelectorAll('pre');
      if (pres.length !== 1) return null;
      const pre = pres[0];
      let rest = '';
      (function walk(n) {
        for (const ch of n.childNodes) {
          if (ch === pre) continue;
          if (ch.nodeType === 3) rest += ch.nodeValue;
          else if (ch.nodeType === 1 && !SKIP.has(ch.tagName.toUpperCase()) && ch.tagName.toLowerCase() !== 'svg') walk(ch);
        }
      })(el);
      rest = rest.replace(/\s+/g, ' ').trim();
      return !rest || /^[A-Za-z][\w+#.-]{0,20}$/.test(rest) ? pre : null;
    }

    // returns [{s, list}] blocks for the element's children
    function childBlocks(el, ctx) {
      const out = [];
      let buf = '';
      const flush = () => {
        const t = buf.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '');
        if (t) out.push({ s: t, list: false });
        buf = '';
      };
      for (const c of el.childNodes) {
        if (c.nodeType === 3) {
          buf += inline(c, ctx);
          continue;
        }
        if (c.nodeType !== 1) continue;
        const tag = c.tagName.toUpperCase();
        if (SKIP.has(tag) || tag === 'svg' || hidden(c)) continue;
        const isMathBlock = hasClass(c, 'katex-display') || hasClass(c, 'math-block');
        if (BLOCK.has(tag) || isMathBlock) {
          flush();
          const wrapped = tag !== 'PRE' && !isMathBlock ? codeWrapperPre(c) : null;
          const b = wrapped ? blockOf(wrapped, ctx) : isMathBlock ? inline(c, ctx).trim() : blockOf(c, ctx);
          if (b) out.push({ s: b, list: tag === 'UL' || tag === 'OL' });
        } else {
          buf += inline(c, ctx);
        }
      }
      flush();
      return out;
    }

    function convertChildren(el, ctx) {
      return childBlocks(el, ctx).map((b) => b.s).join('\n\n');
    }

    function blockOf(el, ctx) {
      const tag = el.tagName.toUpperCase();
      if (SKIP.has(tag) || hidden(el)) return '';
      const h = /^H([1-6])$/.exec(tag);
      if (h) {
        const t = inlineChildren(el, ctx).replace(/\s+/g, ' ').trim();
        return t ? '#'.repeat(+h[1]) + ' ' + t : '';
      }
      switch (tag) {
        case 'P':
        case 'FIGCAPTION':
        case 'SUMMARY': {
          const t = inlineChildren(el, ctx);
          const s = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
          return tag === 'SUMMARY' && s ? '**' + s + '**' : s;
        }
        case 'HR':
          return '---';
        case 'PRE': {
          const code = el.querySelector('code') || el;
          return fence(codeText(code), codeLang(el));
        }
        case 'UL':
        case 'OL':
          return list(el, ctx);
        case 'BLOCKQUOTE': {
          const inner = convertChildren(el, ctx);
          return inner.split('\n').map((l) => (l ? '> ' + l : '>')).join('\n');
        }
        case 'TABLE':
          return table(el);
        case 'LI':
          return convertChildren(el, ctx);
        case 'DETAILS':
          return convertChildren(el, ctx);
        default:
          return convertChildren(el, ctx);
      }
    }


    let md;
    if (root.nodeType === 1 && root.tagName === 'PRE') md = blockOf(root, {});
    else md = convertChildren(root, {});
    return md.replace(/\n{3,}/g, '\n\n').trim();
  }

  CE.html2md = html2md;
})(globalThis.CE);
