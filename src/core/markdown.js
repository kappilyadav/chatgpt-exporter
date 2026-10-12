/* Chat Exporter — small Markdown engine.
 *  CE.md.parse(md, {breaks})  → block AST
 *  CE.md.toHtml(md, {breaks}) → XHTML-safe HTML string (math kept as <span class="math">)
 *  CE.md.toText(md)           → readable plain text
 */
(function (CE) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const RE_FENCE = /^(\s{0,3})(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/;
  const RE_HR = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
  const RE_HEADING = /^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
  const RE_LIST = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
  const RE_TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
  const RE_QUOTE = /^\s{0,3}>/;

  const indentOf = (l) => /^\s*/.exec(l.replace(/\t/g, '    '))[0].length;

  function splitRow(line) {
    let s = line.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
    const cells = [];
    let cur = '';
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '\\' && s[i + 1] === '|') { cur += '|'; i++; }
      else if (s[i] === '|') { cells.push(cur.trim()); cur = ''; }
      else cur += s[i];
    }
    cells.push(cur.trim());
    return cells;
  }

  function startsBlock(line, next) {
    if (RE_FENCE.test(line) || RE_HR.test(line) || RE_HEADING.test(line) || RE_QUOTE.test(line)) return true;
    if (/^\s*\$\$/.test(line) || /^\s*\\\[/.test(line)) return true;
    const lm = RE_LIST.exec(line);
    if (lm && (!/\d/.test(lm[2]) || /^1[.)]$/.test(lm[2]))) return true;
    if (line.includes('|') && next != null && RE_TABLE_SEP.test(next) && next.includes('-')) return true;
    return false;
  }

  function parseBlocks(lines) {
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      let m;

      // fenced code
      if ((m = RE_FENCE.exec(line))) {
        const indent = m[1].length;
        const fence = m[2];
        const ch = fence[0];
        const lang = m[3];
        const body = [];
        i++;
        while (i < lines.length) {
          const cm = /^\s{0,3}(`{3,}|~{3,})\s*$/.exec(lines[i]);
          if (cm && cm[1][0] === ch && cm[1].length >= fence.length) { i++; break; }
          body.push(indent ? lines[i].replace(new RegExp('^ {0,' + indent + '}'), '') : lines[i]);
          i++;
        }
        out.push({ t: 'code', lang, text: body.join('\n') });
        continue;
      }

      // display math
      if (/^\s*\$\$\s*$/.test(line) || /^\s*\\\[\s*$/.test(line)) {
        const close = /^\s*\$\$/.test(line) ? /^\s*\$\$\s*$/ : /^\s*\\\]\s*$/;
        const body = [];
        i++;
        while (i < lines.length && !close.test(lines[i])) { body.push(lines[i]); i++; }
        i++;
        out.push({ t: 'math', tex: body.join('\n').trim() });
        continue;
      }
      if ((m = /^\s*\$\$(.+?)\$\$\s*$/.exec(line)) || (m = /^\s*\\\[(.+?)\\\]\s*$/.exec(line))) {
        out.push({ t: 'math', tex: m[1].trim() });
        i++;
        continue;
      }

      if (RE_HR.test(line)) { out.push({ t: 'hr' }); i++; continue; }

      if ((m = RE_HEADING.exec(line))) {
        out.push({ t: 'heading', level: m[1].length, text: m[2] });
        i++;
        continue;
      }

      if (RE_QUOTE.test(line)) {
        const q = [];
        while (i < lines.length && lines[i].trim() && (RE_QUOTE.test(lines[i]) || (q.length && !startsBlock(lines[i], lines[i + 1])))) {
          q.push(lines[i].replace(/^\s{0,3}>\s?/, ''));
          i++;
        }
        out.push({ t: 'quote', blocks: parseBlocks(q) });
        continue;
      }

      // table
      if (line.includes('|') && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('-')) {
        const head = splitRow(line);
        const aligns = splitRow(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? 'center' : /^-+:$/.test(c) ? 'right' : /^:-+$/.test(c) ? 'left' : ''));
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].trim() && lines[i].includes('|') && !RE_FENCE.test(lines[i])) {
          rows.push(splitRow(lines[i]));
          i++;
        }
        out.push({ t: 'table', head, aligns, rows });
        continue;
      }

      // list
      if ((m = RE_LIST.exec(line))) {
        const res = parseList(lines, i);
        out.push(res.node);
        i = res.next;
        continue;
      }

      // paragraph (with setext heading support)
      const p = [line];
      i++;
      let setext = 0;
      while (i < lines.length && lines[i].trim()) {
        if (/^\s{0,3}=+\s*$/.test(lines[i])) { setext = 1; i++; break; }
        if (/^\s{0,3}-+\s*$/.test(lines[i]) && p.length === 1) { setext = 2; i++; break; }
        if (startsBlock(lines[i], lines[i + 1])) break;
        p.push(lines[i]);
        i++;
      }
      if (setext) out.push({ t: 'heading', level: setext, text: p.join(' ') });
      else out.push({ t: 'para', text: p.join('\n') });
    }
    return out;
  }

  function parseList(lines, start) {
    const first = RE_LIST.exec(lines[start]);
    const baseIndent = first[1].replace(/\t/g, '    ').length;
    const ordered = /\d/.test(first[2]);
    const startNum = ordered ? parseInt(first[2], 10) : 1;
    const items = [];
    let tight = true;
    let i = start;
    while (i < lines.length) {
      const lm = RE_LIST.exec(lines[i]);
      if (!lm) break;
      const ind = lm[1].replace(/\t/g, '    ').length;
      if (ind >= baseIndent + 2 || ind < baseIndent - 1) break;
      if (/\d/.test(lm[2]) !== ordered) break;
      const contentCol = ind + lm[2].length + 1;
      const itemLines = [lm[3]];
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (!l.trim()) {
          let j = i + 1;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length) {
            const nind = indentOf(lines[j]);
            const sib = RE_LIST.exec(lines[j]);
            if (nind >= baseIndent + 2) { itemLines.push(''); i++; continue; }
            if (sib && nind >= baseIndent - 1 && nind < baseIndent + 2 && /\d/.test(sib[2]) === ordered) { tight = false; }
          }
          break;
        }
        const nind = indentOf(l);
        if (nind >= baseIndent + 2) {
          itemLines.push(l.replace(/\t/g, '    ').slice(Math.min(contentCol, nind)));
          i++;
          continue;
        }
        const sib = RE_LIST.exec(l);
        if (sib) break; // sibling or parent-level list item
        if (startsBlock(l, lines[i + 1])) break;
        if (itemLines[itemLines.length - 1] === '') break;
        itemLines.push(l.trim()); // lazy continuation
        i++;
      }
      let task = null;
      const tm = /^\[([ xX])\]\s+/.exec(itemLines[0]);
      if (tm) { task = tm[1] !== ' '; itemLines[0] = itemLines[0].slice(tm[0].length); }
      if (itemLines.includes('')) tight = false;
      items.push({ task, blocks: parseBlocks(itemLines) });
    }
    return { node: { t: 'list', ordered, start: startNum, tight, items }, next: i };
  }

  // ---------------------------------------------------------------- inline
  const RE_MATH_INLINE = /^\$(?!\s)((?:\\.|[^$\\\n])+?)(?<!\s)\$(?!\d)/;
  const RE_AUTOLINK = /^https?:\/\/[^\s<>()\[\]]+[^\s<>()\[\]'".,;:!?]/;

  function matchBracket(s, i, open, close) {
    let depth = 0;
    for (let j = i; j < s.length; j++) {
      const c = s[j];
      if (c === '\\') { j++; continue; }
      if (c === open) depth++;
      else if (c === close) { depth--; if (depth === 0) return j; }
    }
    return -1;
  }

  function parseLinkTail(s, i) {
    // s[i] === '('
    if (s[i] !== '(') return null;
    let j = i + 1;
    let url = '';
    if (s[j] === '<') {
      const e = s.indexOf('>', j);
      if (e < 0) return null;
      url = s.slice(j + 1, e);
      j = e + 1;
    } else {
      let depth = 0;
      while (j < s.length) {
        const c = s[j];
        if (c === '\\' && j + 1 < s.length) { url += s[j + 1]; j += 2; continue; }
        if (c === '(') depth++;
        if (c === ')') { if (depth === 0) break; depth--; }
        if (/\s/.test(c) && depth === 0) break;
        url += c;
        j++;
      }
    }
    let title = '';
    while (/\s/.test(s[j] || '')) j++;
    if (s[j] === '"' || s[j] === "'") {
      const e = s.indexOf(s[j], j + 1);
      if (e > 0) { title = s.slice(j + 1, e); j = e + 1; }
    }
    while (/\s/.test(s[j] || '')) j++;
    if (s[j] !== ')') return null;
    return { url, title, end: j + 1 };
  }

  function parseInline(s, opts) {
    opts = opts || {};
    const nodes = [];
    let buf = '';
    let i = 0;
    const flush = () => { if (buf) { nodes.push({ t: 'text', v: buf }); buf = ''; } };
    while (i < s.length) {
      const c = s[i];
      const rest = s.slice(i);

      if (c === '\\' && i + 1 < s.length) {
        const n = s[i + 1];
        if (n === '(') {
          const e = s.indexOf('\\)', i + 2);
          if (e > 0) { flush(); nodes.push({ t: 'math', tex: s.slice(i + 2, e).trim(), display: false }); i = e + 2; continue; }
        }
        if (n === '[') {
          const e = s.indexOf('\\]', i + 2);
          if (e > 0) { flush(); nodes.push({ t: 'math', tex: s.slice(i + 2, e).trim(), display: true }); i = e + 2; continue; }
        }
        if (/[\\`*_{}\[\]()#+\-.!|$<>~]/.test(n)) { buf += n; i += 2; continue; }
        if (n === '\n') { flush(); nodes.push({ t: 'br' }); i += 2; continue; }
      }
      if (c === '`') {
        const run = /^`+/.exec(rest)[0];
        const close = s.indexOf(run, i + run.length);
        if (close > 0 && s[close + run.length] !== '`') {
          flush();
          let code = s.slice(i + run.length, close).replace(/\n/g, ' ');
          if (/^ .* $/.test(code) && code.trim()) code = code.slice(1, -1);
          nodes.push({ t: 'code', v: code });
          i = close + run.length;
          continue;
        }
        buf += run;
        i += run.length;
        continue;
      }
      if (c === '$') {
        const mm = RE_MATH_INLINE.exec(rest);
        if (mm) { flush(); nodes.push({ t: 'math', tex: mm[1].trim(), display: false }); i += mm[0].length; continue; }
      }
      if (c === '!' && s[i + 1] === '[') {
        const e = matchBracket(s, i + 1, '[', ']');
        if (e > 0) {
          const tail = parseLinkTail(s, e + 1);
          if (tail) { flush(); nodes.push({ t: 'image', alt: s.slice(i + 2, e), src: tail.url, title: tail.title }); i = tail.end; continue; }
        }
      }
      if (c === '[') {
        const e = matchBracket(s, i, '[', ']');
        if (e > 0) {
          const tail = parseLinkTail(s, e + 1);
          if (tail) { flush(); nodes.push({ t: 'link', href: tail.url, title: tail.title, c: parseInline(s.slice(i + 1, e), opts) }); i = tail.end; continue; }
        }
      }
      if ((c === '*' || c === '_') && s[i + 1] === c) {
        const e = s.indexOf(c + c, i + 2);
        if (e > i + 2 && !/\s/.test(s[i + 2]) && !/\s/.test(s[e - 1])) {
          flush();
          nodes.push({ t: 'strong', c: parseInline(s.slice(i + 2, e), opts) });
          i = e + 2;
          continue;
        }
      }
      if (c === '~' && s[i + 1] === '~') {
        const e = s.indexOf('~~', i + 2);
        if (e > i + 2) { flush(); nodes.push({ t: 'del', c: parseInline(s.slice(i + 2, e), opts) }); i = e + 2; continue; }
      }
      if (c === '*' || c === '_') {
        const prev = s[i - 1] || ' ';
        const okOpen = c === '*' || !/[A-Za-z0-9]/.test(prev);
        if (okOpen && s[i + 1] && !/\s/.test(s[i + 1])) {
          let e = i + 1;
          while ((e = s.indexOf(c, e)) > 0) {
            if (s[e + 1] === c) { e += 2; continue; }
            if (/\s/.test(s[e - 1])) { e++; continue; }
            if (c === '_' && /[A-Za-z0-9]/.test(s[e + 1] || '')) { e++; continue; }
            break;
          }
          if (e > i + 1) {
            flush();
            nodes.push({ t: 'em', c: parseInline(s.slice(i + 1, e), opts) });
            i = e + 1;
            continue;
          }
        }
      }
      if (c === 'h' && /^https?:\/\//.test(rest) && !/[A-Za-z0-9]/.test(s[i - 1] || ' ')) {
        const am = RE_AUTOLINK.exec(rest);
        if (am) { flush(); nodes.push({ t: 'link', href: am[0], title: '', c: [{ t: 'text', v: am[0] }] }); i += am[0].length; continue; }
      }
      if (c === '<') {
        const bm = /^<br\s*\/?>/i.exec(rest);
        if (bm) { flush(); nodes.push({ t: 'br' }); i += bm[0].length; continue; }
      }
      if (c === '\n') {
        const hard = / $/.test(buf) && / {2}$/.test(buf);
        buf = buf.replace(/ +$/, '');
        flush();
        if (opts.breaks || hard) nodes.push({ t: 'br' });
        else nodes.push({ t: 'text', v: ' ' });
        i++;
        continue;
      }
      buf += c;
      i++;
    }
    flush();
    return nodes;
  }

  // ---------------------------------------------------------------- HTML
  function safeUrl(u, isImage) {
    u = String(u || '').trim();
    if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(u)) return u;
    if (/^data:image\//i.test(u) || /^blob:/i.test(u)) return u;
    if (isImage && /^(file-service|sediment|chatgpt-asset):/i.test(u)) return '';
    return /^[\w-]+\.[\w.-]+/.test(u) ? 'https://' + u : '';
  }

  function inlineHtml(nodes) {
    return nodes.map((n) => {
      switch (n.t) {
        case 'text': return esc(n.v);
        case 'br': return '<br/>';
        case 'code': return '<code>' + esc(n.v) + '</code>';
        case 'strong': return '<strong>' + inlineHtml(n.c) + '</strong>';
        case 'em': return '<em>' + inlineHtml(n.c) + '</em>';
        case 'del': return '<del>' + inlineHtml(n.c) + '</del>';
        case 'math': return '<span class="math ' + (n.display ? 'math-block' : 'math-inline') + '" data-tex="' + esc(n.tex) + '">' + esc((n.display ? '\\[' : '\\(') + n.tex + (n.display ? '\\]' : '\\)')) + '</span>';
        case 'link': {
          const u = safeUrl(n.href);
          return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + inlineHtml(n.c) + '</a>' : inlineHtml(n.c);
        }
        case 'image': {
          const u = safeUrl(n.src, true);
          return u ? '<img src="' + esc(u) + '" alt="' + esc(n.alt) + '"/>' : '<span class="img-missing">[' + esc(n.alt || 'image') + ']</span>';
        }
        default: return '';
      }
    }).join('');
  }

  function blocksHtml(blocks, opts, tight) {
    return blocks.map((b, idx) => {
      switch (b.t) {
        case 'heading': {
          const lv = Math.min(6, b.level + (opts.headingOffset || 0));
          return '<h' + lv + '>' + inlineHtml(parseInline(b.text, opts)) + '</h' + lv + '>';
        }
        case 'para': {
          const inner = inlineHtml(parseInline(b.text, opts));
          return tight && idx === 0 ? inner : '<p>' + inner + '</p>';
        }
        case 'code':
          return '<pre' + (b.lang ? ' data-lang="' + esc(b.lang) + '"' : '') + '><code' + (b.lang ? ' class="language-' + esc(b.lang) + '"' : '') + '>' + esc(b.text) + '</code></pre>';
        case 'math':
          return '<div class="math math-block" data-tex="' + esc(b.tex) + '">' + esc('\\[' + b.tex + '\\]') + '</div>';
        case 'hr': return '<hr/>';
        case 'quote': return '<blockquote>' + blocksHtml(b.blocks, opts) + '</blockquote>';
        case 'list': {
          const tag = b.ordered ? 'ol' : 'ul';
          const startAttr = b.ordered && b.start !== 1 ? ' start="' + b.start + '"' : '';
          const items = b.items.map((it) => {
            const box = it.task === null ? '' : '<input type="checkbox" disabled="disabled"' + (it.task ? ' checked="checked"' : '') + '/> ';
            return '<li>' + box + blocksHtml(it.blocks, opts, b.tight) + '</li>';
          }).join('');
          return '<' + tag + startAttr + '>' + items + '</' + tag + '>';
        }
        case 'table': {
          const cell = (t, tag, a) => '<' + tag + (a ? ' style="text-align:' + a + '"' : '') + '>' + inlineHtml(parseInline(t, opts)) + '</' + tag + '>';
          return '<div class="table-wrap"><table><thead><tr>' + b.head.map((h, i) => cell(h, 'th', b.aligns[i])).join('') + '</tr></thead><tbody>' +
            b.rows.map((r) => '<tr>' + b.head.map((_, i) => cell(r[i] || '', 'td', b.aligns[i])).join('') + '</tr>').join('') + '</tbody></table></div>';
        }
        default: return '';
      }
    }).join('\n');
  }

  // ---------------------------------------------------------------- text
  function inlineText(nodes) {
    return nodes.map((n) => {
      switch (n.t) {
        case 'text': return n.v;
        case 'br': return '\n';
        case 'code': return n.v;
        case 'strong': case 'em': case 'del': return inlineText(n.c);
        case 'math': return n.display ? '$$' + n.tex + '$$' : '$' + n.tex + '$';
        case 'link': {
          const t = inlineText(n.c);
          if (/^\[\d+\]$/.test(t) || !n.href) return t + (n.href && /^\[\d+\]$/.test(t) ? '' : '');
          return t === n.href ? t : t + ' (' + n.href + ')';
        }
        case 'image': return '[Image' + (n.alt ? ': ' + n.alt : '') + ']' + (/^data:/.test(n.src) ? '' : ' (' + n.src + ')');
        default: return '';
      }
    }).join('');
  }

  function blocksText(blocks, opts, indent) {
    indent = indent || '';
    const out = [];
    blocks.forEach((b) => {
      switch (b.t) {
        case 'heading': out.push(indent + inlineText(parseInline(b.text, opts)).toUpperCase().replace(/^$/, '')); break;
        case 'para': out.push(inlineText(parseInline(b.text, opts)).split('\n').map((l) => indent + l).join('\n')); break;
        case 'code': out.push(b.text.split('\n').map((l) => indent + '    ' + l).join('\n')); break;
        case 'math': out.push(indent + '$$' + b.tex + '$$'); break;
        case 'hr': out.push(indent + '----------------------------------------'); break;
        case 'quote': out.push(blocksText(b.blocks, opts, indent + '> ')); break;
        case 'list':
          out.push(b.items.map((it, n) => {
            const marker = (b.ordered ? (b.start + n) + '. ' : '- ') + (it.task === null ? '' : it.task ? '[x] ' : '[ ] ');
            const body = blocksText(it.blocks, opts, '').split('\n');
            return body.map((l, k) => (k === 0 ? indent + marker + l : l ? indent + ' '.repeat(marker.length) + l : l)).join('\n');
          }).join(b.tight ? '\n' : '\n\n'));
          break;
        case 'table': {
          const rows = [b.head, ...b.rows].map((r) => r.map((c) => inlineText(parseInline(c, opts))));
          const w = b.head.map((_, i) => Math.max(...rows.map((r) => (r[i] || '').length)));
          const line = (r) => indent + r.map((c, i) => (c || '').padEnd(w[i])).join(' | ').trimEnd();
          out.push([line(rows[0]), indent + w.map((x) => '-'.repeat(x)).join('-+-'), ...rows.slice(1).map(line)].join('\n'));
          break;
        }
        default: break;
      }
    });
    // tight lists: items are joined by single newline by the caller using out.join
    return out.join('\n\n');
  }

  CE.md = {
    parse(md, opts) {
      return parseBlocks(String(md || '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n'));
    },
    parseInline,
    inlineHtml,
    blocksHtml,
    toHtml(md, opts) {
      opts = opts || {};
      return blocksHtml(CE.md.parse(md), opts);
    },
    toText(md, opts) {
      opts = opts || {};
      return blocksText(CE.md.parse(md), opts).replace(/\n{3,}/g, '\n\n').trim();
    },
    safeUrl,
    esc
  };
})(globalThis.CE);
