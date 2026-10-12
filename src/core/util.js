/* Chat Exporter — shared helpers. */
(function (CE) {
  'use strict';
  const U = CE.util;

  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  U.escapeHtml = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  U.pad = (n, l = 2) => String(n).padStart(l, '0');

  U.sanitizeFilename = (s, fallback = 'chat') => {
    s = String(s == null ? '' : s)
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\.+/, '')
      .slice(0, 120)
      .trim();
    return s || fallback;
  };

  U.sanitizeFolder = (s) =>
    String(s || '')
      .split(/[\\/]+/)
      .map((p) => p.replace(/[:*?"<>|\u0000-\u001f]/g, '').trim())
      .filter((p) => p && p !== '.' && p !== '..')
      .join('/');

  U.formatDate = (ms, fmt) => {
    if (ms == null || isNaN(ms)) return '';
    const d = new Date(ms);
    fmt = fmt || 'YYYY-MM-DD HH:mm';
    if (fmt === 'locale') return d.toLocaleString();
    if (fmt === 'iso') return d.toISOString();
    const p = U.pad;
    const map = {
      YYYY: d.getFullYear(),
      MM: p(d.getMonth() + 1),
      DD: p(d.getDate()),
      HH: p(d.getHours()),
      mm: p(d.getMinutes()),
      ss: p(d.getSeconds())
    };
    return fmt.replace(/YYYY|MM|DD|HH|mm|ss/g, (t) => map[t]);
  };

  U.uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  U.truncate = (s, n) => {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  };

  U.debounce = (fn, ms) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };

  U.toBytes = (s) => new TextEncoder().encode(s);

  U.blobToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });

  U.dataUrlToBytes = (url) => {
    const m = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(url);
    if (!m) throw new Error('Not a data URL');
    const mime = m[1] || 'application/octet-stream';
    if (m[2]) {
      const bin = atob(m[3]);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return { mime, bytes: out };
    }
    return { mime, bytes: U.toBytes(decodeURIComponent(m[3])) };
  };

  U.plainFromMarkdownLine = (md) =>
    String(md || '')
      .replace(/```[\s\S]*?```/g, ' [code] ')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '[image]')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`#>~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  /** Copy plain text (and optionally rich HTML) to the clipboard. */
  U.copyText = async (text, html) => {
    try {
      if (html && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([text], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' })
          })
        ]);
        return;
      }
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      if (!ok) throw e;
    }
  };

  /** Save a Blob. Uses chrome.downloads (for sub-folders) when asked, falls back to <a download>. */
  U.saveBlob = async (blob, filename, subfolder) => {
    const url = URL.createObjectURL(blob);
    const revoke = () => setTimeout(() => URL.revokeObjectURL(url), 60000);
    const folder = U.sanitizeFolder(subfolder);
    if (folder && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const r = await chrome.runtime.sendMessage({ type: 'download', url, filename: folder + '/' + filename });
        if (r && r.ok) {
          revoke();
          return;
        }
      } catch (e) {
        /* fall through to anchor download */
      }
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    (document.body || document.documentElement).appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
    revoke();
  };

  U.csvEscape = (v, delim) => {
    const s = v == null ? '' : String(v);
    const d = delim || ',';
    return new RegExp('["\\n\\r' + (d === '\t' ? '\\t' : d.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')) + ']').test(s)
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };

  U.cookie = (name) => {
    try {
      const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) {
      return '';
    }
  };

  /** Run async fn over items with limited concurrency, preserving order. */
  U.mapLimit = async (items, limit, fn) => {
    const out = new Array(items.length);
    let i = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    });
    await Promise.all(workers);
    return out;
  };
})(globalThis.CE);
