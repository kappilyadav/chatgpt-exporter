/* Chat Exporter — Word (.docx) exporter. Hand-written OOXML, zipped with CE.zip. No servers involved. */
(function (CE) {
  'use strict';
  const X = CE.xc;
  const U = CE.util;

  const xesc = (s) => String(s == null ? '' : s)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const PAGE = { A4: [11906, 16838], Letter: [12240, 15840], Legal: [12240, 20160], A3: [16838, 23811], A5: [8391, 11906] };
  const MARGIN = { narrow: 567, normal: 1021, wide: 1588 };
  const EMU_PER_PX = 9525;
  const MAX_IMG_EMU = 5486400; // 6 inches

  async function build(ctx) {
    const { convo, messages, settings: s } = ctx;
    const rels = [];
    let relCounter = 10;
    const media = [];
    const imgMap = new Map();
    const linkMap = new Map();
    let drawingId = 1;

    const addRel = (type, target, external) => {
      const id = 'rId' + relCounter++;
      rels.push({ id, type, target, external });
      return id;
    };

    // ---- prepare images
    const srcs = new Set();
    messages.forEach((m) => (m.markdown || '').replace(CE.assets.IMG_RE, (x, a, u) => { srcs.add(u.replace(/^<|>$/g, '')); return x; }));
    for (const src of srcs) {
      if (!/^data:image\//i.test(src)) continue;
      try {
        let url = src;
        let { mime, bytes } = U.dataUrlToBytes(url);
        if (!/^image\/(png|jpe?g|gif|bmp)$/i.test(mime)) {
          url = await CE.assets.toPng(url);
          ({ mime, bytes } = U.dataUrlToBytes(url));
        }
        const size = await CE.assets.imageSize(url);
        const ext = /jpe?g/i.test(mime) ? 'jpeg' : /gif/i.test(mime) ? 'gif' : /bmp/i.test(mime) ? 'bmp' : 'png';
        const name = 'image' + (media.length + 1) + '.' + ext;
        media.push({ name: 'word/media/' + name, bytes, ext });
        const rid = addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', 'media/' + name, false);
        let cx = size.w * EMU_PER_PX;
        let cy = size.h * EMU_PER_PX;
        if (cx > MAX_IMG_EMU) { cy = Math.round((cy * MAX_IMG_EMU) / cx); cx = MAX_IMG_EMU; }
        imgMap.set(src, { rid, cx: Math.round(cx), cy: Math.round(cy) });
      } catch (e) { /* leave as text */ }
    }

    // ---- run helpers
    const rPr = (f) => {
      f = f || {};
      let x = '';
      if (f.link) x += '<w:rStyle w:val="Hyperlink"/>';
      if (f.code) x += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas" w:eastAsia="Consolas"/>';
      if (f.b) x += '<w:b/>';
      if (f.i) x += '<w:i/>';
      if (f.strike) x += '<w:strike/>';
      if (f.color) x += '<w:color w:val="' + f.color + '"/>';
      if (f.size) x += '<w:sz w:val="' + f.size + '"/><w:szCs w:val="' + f.size + '"/>';
      if (f.code && !f.block) x += '<w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/>';
      return x ? '<w:rPr>' + x + '</w:rPr>' : '';
    };

    const run = (text, f) => {
      const segs = String(text).split('\n');
      return segs.map((seg, i) => {
        const parts = seg.split('\t');
        const inner = parts.map((p, k) => (k ? '<w:tab/>' : '') + (p ? '<w:t xml:space="preserve">' + xesc(p) + '</w:t>' : '')).join('');
        return (i ? '<w:r><w:br/></w:r>' : '') + (inner ? '<w:r>' + rPr(f) + inner + '</w:r>' : '');
      }).join('');
    };

    const drawing = (im, alt) => {
      const id = drawingId++;
      return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + im.cx + '" cy="' + im.cy + '"/>' +
        '<wp:docPr id="' + id + '" name="Image ' + id + '" descr="' + xesc(alt || '') + '"/>' +
        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
        '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + id + '" name="Image ' + id + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
        '<pic:blipFill><a:blip r:embed="' + im.rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
        '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + im.cx + '" cy="' + im.cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>' +
        '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
    };

    const runsOf = (nodes, f) => nodes.map((n) => {
      switch (n.t) {
        case 'text': return run(n.v, f);
        case 'br': return '<w:r><w:br/></w:r>';
        case 'code': return run(n.v, Object.assign({}, f, { code: true }));
        case 'strong': return runsOf(n.c, Object.assign({}, f, { b: true }));
        case 'em': return runsOf(n.c, Object.assign({}, f, { i: true }));
        case 'del': return runsOf(n.c, Object.assign({}, f, { strike: true }));
        case 'math': return run((n.display ? '$$' : '$') + n.tex + (n.display ? '$$' : '$'), Object.assign({}, f, { code: true, i: true }));
        case 'link': {
          const u = CE.md.safeUrl(n.href);
          if (!u || /^(data|blob):/i.test(u)) return runsOf(n.c, f);
          let rid = linkMap.get(u);
          if (!rid) { rid = addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink', u, true); linkMap.set(u, rid); }
          return '<w:hyperlink r:id="' + rid + '" w:history="1">' + runsOf(n.c, Object.assign({}, f, { link: true })) + '</w:hyperlink>';
        }
        case 'image': {
          const im = imgMap.get(n.src);
          if (im) return drawing(im, n.alt);
          return run('[' + (n.alt || 'image') + ']' + (/^https?:/.test(n.src) ? ' (' + n.src + ')' : ''), f);
        }
        default: return '';
      }
    }).join('');

    const para = (inner, o) => {
      o = o || {};
      let pr = '';
      if (o.style) pr += '<w:pStyle w:val="' + o.style + '"/>';
      if (o.keepNext) pr += '<w:keepNext/>';
      if (o.pageBreakBefore) pr += '<w:pageBreakBefore/>';
      if (o.bar) pr += '<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="' + o.bar + '"/></w:pBdr>';
      if (o.shd) pr += '<w:shd w:val="clear" w:color="auto" w:fill="' + o.shd + '"/>';
      if (o.before != null || o.after != null) pr += '<w:spacing' + (o.before != null ? ' w:before="' + o.before + '"' : '') + (o.after != null ? ' w:after="' + o.after + '"' : '') + '/>';
      if (o.left != null) pr += '<w:ind w:left="' + o.left + '"' + (o.hanging ? ' w:hanging="' + o.hanging + '"' : '') + '/>';
      return '<w:p>' + (pr ? '<w:pPr>' + pr + '</w:pPr>' : '') + inner + '</w:p>';
    };

    // ---- block rendering
    function blocksXml(blocks, st) {
      st = st || { left: 0, f: {}, bar: null };
      const out = [];
      blocks.forEach((b) => {
        switch (b.t) {
          case 'heading':
            out.push(para(runsOf(CE.md.parseInline(b.text), Object.assign({}, st.f)), { style: 'Heading' + Math.min(6, b.level + 1), left: st.left || null, keepNext: true }));
            break;
          case 'para':
            out.push(para(runsOf(CE.md.parseInline(b.text, { breaks: !!st.breaks }), st.f), { left: st.left || null, bar: st.bar, after: 120 }));
            break;
          case 'code': {
            const lines = b.text.split('\n');
            lines.forEach((ln, i) => {
              out.push(para(run(ln || ' ', { code: true, block: true, size: 19 }), { style: 'Code', left: (st.left || 0) + 120, after: i === lines.length - 1 ? 160 : 0 }));
            });
            break;
          }
          case 'math':
            out.push(para(run('$$ ' + b.tex + ' $$', { code: true, i: true, block: true, size: 20 }), { left: st.left || null, after: 120 }));
            break;
          case 'hr':
            out.push('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D1D5DB"/></w:pBdr></w:pPr></w:p>');
            break;
          case 'quote':
            out.push(blocksXml(b.blocks, { left: (st.left || 0) + 360, f: Object.assign({}, st.f, { color: '6B7280', i: true }), bar: 'D1D5DB', breaks: st.breaks }));
            break;
          case 'list': {
            const level = st.level || 0;
            b.items.forEach((it, n) => {
              const marker = b.ordered ? b.start + n + '.' : ['•', '◦', '▪'][level % 3];
              const left = 360 + level * 360 + (st.left || 0);
              let first = true;
              (it.blocks.length ? it.blocks : [{ t: 'para', text: '' }]).forEach((blk) => {
                if (blk.t === 'para' && first) {
                  const box = it.task === null ? '' : (it.task ? '☑ ' : '☐ ');
                  out.push(para(run(marker + '\t', st.f) + run(box, st.f) + runsOf(CE.md.parseInline(blk.text, { breaks: !!st.breaks }), st.f), { left: left + 360, hanging: 360, after: 60 }));
                } else if (blk.t === 'list') {
                  if (first) out.push(para(run(marker + '\t', st.f), { left: left + 360, hanging: 360, after: 0 }));
                  out.push(blocksXml([blk], { left: st.left || 0, f: st.f, level: level + 1, bar: st.bar, breaks: st.breaks }));
                } else {
                  if (first) out.push(para(run(marker + '\t', st.f), { left: left + 360, hanging: 360, after: 0 }));
                  out.push(blocksXml([blk], { left: left + 360, f: st.f, bar: st.bar, breaks: st.breaks }));
                }
                first = false;
              });
            });
            break;
          }
          case 'table': {
            const cols = Math.max(1, b.head.length);
            const total = (PAGE[s.pdfPageSize] || PAGE.A4)[s.pdfOrientation === 'landscape' ? 1 : 0] - 2 * (MARGIN[s.pdfMargins] || MARGIN.normal) - (st.left || 0);
            const w = Math.floor(total / cols);
            const cell = (txt, head, al) => {
              const jc = al === 'center' ? '<w:jc w:val="center"/>' : al === 'right' ? '<w:jc w:val="right"/>' : '';
              return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (head ? '<w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/>' : '') + '</w:tcPr>' +
                '<w:p><w:pPr><w:spacing w:before="40" w:after="40"/>' + jc + '</w:pPr>' + runsOf(CE.md.parseInline(txt || ''), Object.assign({}, st.f, head ? { b: true } : {})) + '</w:p></w:tc>';
            };
            const bd = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((k) => '<w:' + k + ' w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>').join('');
            out.push('<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>' + (st.left ? '<w:tblInd w:w="' + st.left + '" w:type="dxa"/>' : '') + '<w:tblBorders>' + bd + '</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr>' +
              '<w:tblGrid>' + Array.from({ length: cols }, () => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>' +
              '<w:tr><w:trPr><w:tblHeader/></w:trPr>' + b.head.map((h, i) => cell(h, true, b.aligns[i])).join('') + '</w:tr>' +
              b.rows.map((r) => '<w:tr>' + b.head.map((_, i) => cell(r[i], false, b.aligns[i])).join('') + '</w:tr>').join('') + '</w:tbl>');
            out.push(para('', { after: 80 }));
            break;
          }
          default: break;
        }
      });
      return out.join('');
    }

    // ---- document body
    const body = [];
    const title = X.title(convo, s, true);
    body.push(para(run(title), { style: 'Title' }));
    const meta = [convo.platformName + (convo.model ? ' (' + convo.model + ')' : '')];
    const d = X.dateStr(convo, s);
    if (d) meta.push(d);
    const ul = X.userLine(s);
    if (ul) meta.push(ul);
    meta.push(messages.length + ' ' + CE.t('messages'));
    body.push(para(run(meta.join('  ·  '), { color: '6B7280', size: 18 }), { after: 240 }));
    if (convo.url && /^https?:/.test(convo.url)) {
      body.push(para(runsOf([{ t: 'link', href: convo.url, c: [{ t: 'text', v: convo.url }] }], { size: 18 }), { after: 240 }));
    }

    let firstUser = true;
    messages.forEach((m) => {
      const isUser = m.role === 'user';
      const label = X.labelFor(m, convo, s);
      const time = X.msgTimeStr(m, s);
      const pb = isUser && s.pdfPageBreakPerPrompt && !firstUser;
      if (isUser) firstUser = false;
      body.push(para(run(label, { b: true, color: isUser ? '6D28D9' : '374151', size: 20 }) + (time ? run('   ' + time, { color: '9CA3AF', size: 16 }) : ''),
        { keepNext: true, before: 200, after: 60, pageBreakBefore: pb }));
      const th = X.thinking(m, s);
      if (th) {
        body.push(para(run('Thought process', { b: true, i: true, color: '6B7280', size: 18 }), { keepNext: true, after: 40, bar: 'D1D5DB', left: 200 }));
        body.push(blocksXml(CE.md.parse(th), { left: 200, f: { i: true, color: '6B7280' }, bar: 'D1D5DB' }));
      }
      body.push(blocksXml(CE.md.parse(m.markdown || ''), { left: 0, f: {}, bar: isUser ? '8B5CF6' : null, breaks: isUser }));
      const atts = X.attachments(m);
      if (atts.length) body.push(para(run('📎 ' + atts.map((a) => a.name).join(', '), { color: '6B7280', size: 18 }), { after: 100 }));
      const src = X.sources(m, s);
      if (src.length) {
        body.push(para(run('Sources', { b: true, color: '6B7280', size: 18 }), { keepNext: true, after: 40 }));
        src.forEach((x) => {
          body.push(para(run('[' + x.n + '] ', { color: '6B7280', size: 18 }) + runsOf([{ t: 'link', href: x.url, c: [{ t: 'text', v: x.title }] }], { size: 18 }), { left: 360, hanging: 360, after: 20 }));
        });
      }
    });
    if (s.branding) body.push(para(run('Exported with Chat Exporter', { color: '9CA3AF', size: 16 }), { before: 400 }));

    const [pw, ph] = PAGE[s.pdfPageSize] || PAGE.A4;
    const land = s.pdfOrientation === 'landscape';
    const mg = MARGIN[s.pdfMargins] || MARGIN.normal;
    const footerRid = s.pdfPageNumbers ? addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer', 'footer1.xml', false) : null;
    const sect = '<w:sectPr>' + (footerRid ? '<w:footerReference w:type="default" r:id="' + footerRid + '"/>' : '') +
      '<w:pgSz w:w="' + (land ? ph : pw) + '" w:h="' + (land ? pw : ph) + '"' + (land ? ' w:orient="landscape"' : '') + '/>' +
      '<w:pgMar w:top="' + mg + '" w:right="' + mg + '" w:bottom="' + mg + '" w:left="' + mg + '" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>';

    const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
    const documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + NS + '><w:body>' + body.join('') + sect + '</w:body></w:document>';

    const scale = Math.max(50, Math.min(300, Number(s.pdfFontScale) || 100)) / 100;
    const base = Math.round(22 * scale);
    const fontName = s.pdfFontFamily === 'serif' ? 'Georgia' : s.pdfFontFamily === 'mono' ? 'Consolas' : 'Calibri';
    const hs = (n, sz, color) => '<w:style w:type="paragraph" w:styleId="Heading' + n + '"><w:name w:val="heading ' + n + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="' + (n - 1) + '"/></w:pPr><w:rPr><w:b/><w:color w:val="' + color + '"/><w:sz w:val="' + Math.round(sz * scale) + '"/></w:rPr></w:style>';
    const stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="' + fontName + '" w:hAnsi="' + fontName + '" w:eastAsia="Microsoft YaHei" w:cs="' + fontName + '"/><w:sz w:val="' + base + '"/><w:szCs w:val="' + base + '"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="' + Math.round(40 * scale) + '"/></w:rPr></w:style>' +
      hs(1, 36, '111827') + hs(2, 32, '111827') + hs(3, 28, '1F2937') + hs(4, 26, '1F2937') + hs(5, 24, '374151') + hs(6, 22, '374151') +
      '<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas" w:eastAsia="Consolas"/><w:sz w:val="19"/></w:rPr></w:style>' +
      '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="2563EB"/><w:u w:val="single"/></w:rPr></w:style>' +
      '</w:styles>';

    const footerXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:color w:val="6B7280"/><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:color w:val="6B7280"/><w:sz w:val="18"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:color w:val="6B7280"/><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:color w:val="6B7280"/><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:color w:val="6B7280"/><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>';

    const exts = [...new Set(media.map((m) => m.ext))];
    const mimeFor = { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp' };
    const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      exts.map((e) => '<Default Extension="' + e + '" ContentType="' + mimeFor[e] + '"/>').join('') +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      (footerRid ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : '') +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';

    const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>';

    const docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      rels.map((r) => '<Relationship Id="' + r.id + '" Type="' + r.type + '" Target="' + xesc(r.target) + '"' + (r.external ? ' TargetMode="External"' : '') + '/>').join('') + '</Relationships>';

    const nowIso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:title>' + xesc(title) + '</dc:title><dc:creator>' + xesc(s.userName || 'Chat Exporter') + '</dc:creator>' +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + nowIso + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + nowIso + '</dcterms:modified></cp:coreProperties>';

    const files = [
      { name: '[Content_Types].xml', data: contentTypes },
      { name: '_rels/.rels', data: rootRels },
      { name: 'word/document.xml', data: documentXml },
      { name: 'word/_rels/document.xml.rels', data: docRels },
      { name: 'word/styles.xml', data: stylesXml },
      { name: 'docProps/core.xml', data: core }
    ];
    if (footerRid) files.push({ name: 'word/footer1.xml', data: footerXml });
    media.forEach((m) => files.push({ name: m.name, data: m.bytes, compress: false }));

    const blob = await CE.zip.create(files, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    return { blob, filename: X.filename(convo, s, 'docx') };
  }

  CE.exporters.docx = { id: 'docx', build };
})(globalThis.CE);
