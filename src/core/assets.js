/* Chat Exporter — image helpers (inline remote images as data: URLs so exports are self-contained). */
(function (CE) {
  'use strict';
  const U = CE.util;
  const IMG_RE = /!\[([^\]]*)\]\((<[^>]+>|[^)\s]+)(?:\s+"[^"]*")?\)/g;
  const MAX_BYTES = 12 * 1024 * 1024;

  async function toDataUrl(url, credentials) {
    if (/^data:/i.test(url)) return url;
    try {
      const r = await fetch(url, { credentials: credentials || 'include' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const blob = await r.blob();
      if (blob.size > MAX_BYTES) throw new Error('too large');
      if (!/^image\//i.test(blob.type)) throw new Error('not an image');
      return await U.blobToDataUrl(blob);
    } catch (direct) {
      // Cross-origin CDN images (signed URLs): let the background worker fetch them.
      if (/^https:/i.test(url) && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const r = await chrome.runtime.sendMessage({ type: 'fetch-image', url });
        if (r && r.ok && r.dataUrl) return r.dataUrl;
      }
      throw direct;
    }
  }

  /** Replace every ![alt](url) in the markdown with an inline data URL (when it can be fetched). */
  async function inlineImages(md, opts) {
    opts = opts || {};
    const urls = new Set();
    md.replace(IMG_RE, (m, alt, u) => {
      u = u.replace(/^<|>$/g, '');
      if (!/^data:/i.test(u) && /^(https?:|blob:|\/)/i.test(u)) urls.add(u);
      return m;
    });
    if (!urls.size) return md;
    const map = new Map();
    await U.mapLimit([...urls], 4, async (u) => {
      try {
        map.set(u, await toDataUrl(u));
      } catch (e) { /* keep remote URL */ }
    });
    return md.replace(IMG_RE, (m, alt, u) => {
      const clean = u.replace(/^<|>$/g, '');
      return map.has(clean) ? '![' + alt + '](' + map.get(clean) + ')' : m;
    });
  }

  function imageSize(dataUrl) {
    return new Promise((resolve) => {
      const fallback = { w: 400, h: 300 };
      if (typeof Image === 'undefined') return resolve(fallback);
      const img = new Image();
      const timer = setTimeout(() => resolve(fallback), 4000);
      img.onload = () => { clearTimeout(timer); resolve({ w: img.naturalWidth || fallback.w, h: img.naturalHeight || fallback.h }); };
      img.onerror = () => { clearTimeout(timer); resolve(fallback); };
      img.src = dataUrl;
    });
  }

  /** Re-encode any browser-decodable image (webp, svg, avif…) as PNG. */
  function toPng(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => reject(new Error('decode timeout')), 8000);
      img.onload = () => {
        clearTimeout(timer);
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || 400;
          c.height = img.naturalHeight || 300;
          c.getContext('2d').drawImage(img, 0, 0);
          resolve(c.toDataURL('image/png'));
        } catch (e) { reject(e); }
      };
      img.onerror = () => { clearTimeout(timer); reject(new Error('decode failed')); };
      img.src = dataUrl;
    });
  }

  CE.assets = { toDataUrl, inlineImages, imageSize, toPng, IMG_RE };
})(globalThis.CE);
