/* Chat Exporter — minimal ZIP writer (deflate via CompressionStream, store fallback). */
(function (CE) {
  'use strict';

  const TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(u8) {
    let c = 0xffffffff;
    for (let i = 0; i < u8.length; i++) c = TABLE[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  async function deflateRaw(u8) {
    const cs = new CompressionStream('deflate-raw');
    const w = cs.writable.getWriter();
    w.write(u8);
    w.close();
    return new Uint8Array(await new Response(cs.readable).arrayBuffer());
  }

  function dosDateTime(d) {
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time: time & 0xffff, date: date & 0xffff };
  }

  /** files: [{name, data: Uint8Array|string, compress?: boolean}] → Blob */
  async function create(files, mime) {
    const enc = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;
    const { time, date } = dosDateTime(new Date());
    const used = new Set();

    for (const f of files) {
      let name = f.name.replace(/^\/+/, '');
      if (used.has(name)) {
        const dot = name.lastIndexOf('.');
        let n = 2;
        let cand;
        do { cand = dot > 0 ? name.slice(0, dot) + ' (' + n + ')' + name.slice(dot) : name + ' (' + n + ')'; n++; } while (used.has(cand));
        name = cand;
      }
      used.add(name);
      const nameBytes = enc.encode(name);
      const raw = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      let comp = raw;
      let method = 0;
      if (raw.length > 100 && f.compress !== false && typeof CompressionStream !== 'undefined') {
        try {
          const d = await deflateRaw(raw);
          if (d.length < raw.length) { comp = d; method = 8; }
        } catch (e) { /* store */ }
      }
      const crc = crc32(raw);

      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, method, true);
      lh.setUint16(10, time, true);
      lh.setUint16(12, date, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, comp.length, true);
      lh.setUint32(22, raw.length, true);
      lh.setUint16(26, nameBytes.length, true);
      lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), nameBytes, comp);

      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true);
      ch.setUint16(4, 20, true);
      ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, method, true);
      ch.setUint16(12, time, true);
      ch.setUint16(14, date, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, comp.length, true);
      ch.setUint32(24, raw.length, true);
      ch.setUint16(28, nameBytes.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nameBytes);

      offset += 30 + nameBytes.length + comp.length;
    }

    const centralSize = central.reduce((n, a) => n + a.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, used.size, true);
    end.setUint16(10, used.size, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: mime || 'application/zip' });
  }

  CE.zip = { create, crc32 };
})(globalThis.CE);
