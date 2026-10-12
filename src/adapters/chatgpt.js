/* Chat Exporter — ChatGPT adapter (chatgpt.com / chat.openai.com).
 * Primary source: the same backend API the web app uses (/backend-api/conversation/{id}),
 * which gives exact Markdown, timestamps, reasoning, citations and canvas data.
 * Fallback: scrape the rendered DOM.
 */
(function (CE) {
  'use strict';
  const U = CE.util;

  const PUA_CITE = /[\s\S]*?/g;
  const PUA_ANY = /[-]/g;

  function applyReferences(text, meta, sources) {
    if (!text) return '';
    const addSource = (s) => {
      if (!s || !s.url) return null;
      let hit = sources.find((x) => x.url === s.url);
      if (!hit) {
        hit = { n: sources.length + 1, title: s.title || s.attribution || s.url, url: s.url };
        sources.push(hit);
      }
      return hit;
    };

    const refs = Array.isArray(meta.content_references) ? meta.content_references : [];
    for (const ref of refs) {
      const matched = ref.matched_text;
      if (!matched) continue;
      let replacement = '';
      const items = []
        .concat(ref.items || [])
        .concat(ref.sources || [])
        .concat(!ref.items && ref.safe_urls ? ref.safe_urls.map((u) => ({ url: u })) : []);
      const isCitation = ['grouped_webpages', 'webpage', 'grouped_webpages_model_predicted_fallback', 'sources_footnote', 'webpage_extended'].includes(ref.type);
      if (isCitation || (items.length && ref.type !== 'hidden')) {
        const nums = [];
        for (const it of items.slice(0, 4)) {
          const s = addSource(it);
          if (s && !nums.includes(s)) nums.push(s);
        }
        if (ref.type !== 'sources_footnote') {
          replacement = nums.map((s) => '[[' + s.n + ']](' + s.url + ')').join('');
        }
      } else if (ref.alt) {
        replacement = ref.alt;
      } else if (ref.type === 'image_group' || ref.type === 'hidden' || ref.type === 'attribution') {
        replacement = '';
      }
      const idx = text.indexOf(matched);
      if (idx >= 0) text = text.slice(0, idx) + replacement + text.slice(idx + matched.length);
    }

    // legacy citation format: 【12†source】 with metadata.citations
    if (Array.isArray(meta.citations) && meta.citations.length) {
      const cs = meta.citations.filter((c) => c && c.metadata && c.metadata.url && typeof c.start_ix === 'number').sort((a, b) => b.start_ix - a.start_ix);
      for (const c of cs) {
        const s = addSource(c.metadata);
        const rep = s ? '[[' + s.n + ']](' + s.url + ')' : '';
        text = text.slice(0, c.start_ix) + rep + text.slice(c.end_ix);
      }
    }
    text = text.replace(/【[^】]*】/g, '').replace(PUA_CITE, '').replace(PUA_ANY, '');
    return text;
  }

  function parseConversation(data, settings) {
    const mapping = data.mapping || {};
    let nodeId = data.current_node;
    if (!nodeId || !mapping[nodeId]) {
      // pick the newest leaf
      const leaves = Object.values(mapping).filter((n) => !n.children || !n.children.length);
      leaves.sort((a, b) => ((a.message && a.message.create_time) || 0) - ((b.message && b.message.create_time) || 0));
      nodeId = leaves.length ? leaves[leaves.length - 1].id : null;
    }
    const path = [];
    const seen = new Set();
    while (nodeId && mapping[nodeId] && !seen.has(nodeId)) {
      seen.add(nodeId);
      path.push(mapping[nodeId]);
      nodeId = mapping[nodeId].parent;
    }
    path.reverse();

    const messages = [];
    const canvases = new Map(); // textdoc id → {name,type,content}
    let model = data.default_model_slug || null;
    let cur = null;

    const finishAssistant = () => {
      if (!cur) return;
      const text = cur.parts.join('\n\n').trim();
      const canvasMd = [];
      if (settings.includeCanvas) {
        for (const id of cur.canvasIds) {
          const cv = canvases.get(id);
          if (!cv || !cv.content) continue;
          const isCode = /^code\//.test(cv.type || '');
          const lang = isCode ? String(cv.type).split('/')[1] : '';
          canvasMd.push('**Canvas: ' + (cv.name || 'Untitled') + '**\n\n' + (isCode ? '```' + lang + '\n' + cv.content + '\n```' : cv.content));
        }
      }
      const markdown = [text].concat(canvasMd).filter(Boolean).join('\n\n');
      if (markdown || cur.thinking.length) {
        messages.push({
          id: cur.id,
          role: 'assistant',
          time: cur.time,
          markdown,
          thinking: cur.thinking.join('\n\n').trim() || (cur.recap || ''),
          sources: cur.sources,
          attachments: [],
          model: cur.model
        });
      }
      cur = null;
    };

    for (const node of path) {
      const m = node.message;
      if (!m) continue;
      const role = m.author && m.author.role;
      const meta = m.metadata || {};
      const c = m.content || {};
      const ct = c.content_type;
      if (meta.is_visually_hidden_from_conversation && role !== 'assistant') continue;
      if (role === 'system') continue;
      if (meta.model_slug) model = meta.model_slug;

      if (role === 'user') {
        if (ct === 'user_editable_context') continue;
        finishAssistant();
        const parts = Array.isArray(c.parts) ? c.parts : [];
        const texts = [];
        const attachments = [];
        for (const p of parts) {
          if (typeof p === 'string') texts.push(p);
          else if (p && p.content_type === 'image_asset_pointer') {
            texts.push(settings.includeImages ? '![Image](' + p.asset_pointer + ')' : '[Image]');
          } else if (p && p.text) texts.push(p.text);
        }
        if (ct === 'code' && c.text) texts.push(c.text);
        (meta.attachments || []).forEach((a) => {
          if (a && a.name) attachments.push({ name: a.name, type: a.mime_type, size: a.size, pointer: a.id ? 'file-service://' + a.id : null, isImage: /^image\//.test(a.mime_type || '') });
        });
        const text = texts.join('\n\n').trim();
        const imgMd = attachments.filter((a) => a.isImage && a.pointer && settings.includeImages && !text.includes(a.pointer)).map((a) => '![' + a.name + '](' + a.pointer + ')');
        const md = [text].concat(imgMd).filter(Boolean).join('\n\n');
        if (!md && !attachments.length) continue;
        messages.push({
          id: m.id,
          role: 'user',
          author: m.author && m.author.name ? m.author.name : undefined,
          time: m.create_time ? m.create_time * 1000 : null,
          markdown: md,
          attachments: attachments.filter((a) => !a.isImage).map(({ name, type, size }) => ({ name, type, size })),
          sources: []
        });
        continue;
      }

      if (role !== 'assistant' && role !== 'tool') continue;
      if (!cur) {
        cur = { id: m.id, time: m.create_time ? m.create_time * 1000 : null, parts: [], thinking: [], recap: '', sources: [], canvasIds: [], model };
      }
      cur.model = meta.model_slug || cur.model;
      const recipient = m.recipient;
      const toolName = (m.author && m.author.name) || '';

      if (ct === 'thoughts') {
        const th = Array.isArray(c.thoughts) ? c.thoughts : [];
        th.forEach((t) => {
          const body = (t.summary ? '**' + t.summary + '**\n\n' : '') + (t.content || '');
          if (body.trim()) cur.thinking.push(body.trim());
        });
        continue;
      }
      if (ct === 'reasoning_recap') {
        if (c.content) cur.recap = c.content;
        continue;
      }

      // Canvas (textdocs)
      if (recipient && /^canmore\.(create|update)_textdoc$/.test(recipient)) {
        try {
          const payload = JSON.parse(c.text || (c.parts && c.parts[0]) || '{}');
          if (recipient.endsWith('create_textdoc')) {
            const id = m.id;
            canvases.set(id, { name: payload.name, type: payload.type, content: payload.content || '' });
            cur.canvasIds.push(id);
            cur.lastCanvas = id;
          } else {
            const id = (meta.canvas && meta.canvas.textdoc_id) || cur.lastCanvas || [...canvases.keys()].pop();
            const cv = canvases.get(id);
            if (cv && Array.isArray(payload.updates)) {
              for (const u of payload.updates) {
                try { cv.content = cv.content.replace(new RegExp(u.pattern, 's'), u.multiple ? u.replacement : u.replacement); } catch (e) { /* ignore */ }
              }
              if (!cur.canvasIds.includes(id)) cur.canvasIds.push(id);
            }
          }
        } catch (e) { /* ignore malformed canvas payload */ }
        continue;
      }
      if (/^canmore/.test(toolName)) continue;

      const visible = role === 'assistant' && (!recipient || recipient === 'all');
      if (visible && (ct === 'text' || ct === 'multimodal_text')) {
        const parts = Array.isArray(c.parts) ? c.parts : [];
        const out = [];
        for (const p of parts) {
          if (typeof p === 'string') out.push(p);
          else if (p && p.content_type === 'image_asset_pointer') out.push(settings.includeImages ? '![Image](' + p.asset_pointer + ')' : '[Image]');
        }
        let txt = out.join('\n\n');
        if (!txt && c.text) txt = c.text;
        txt = applyReferences(txt, meta, cur.sources);
        if (txt.trim()) cur.parts.push(txt.trim());
        continue;
      }
      if (visible && ct === 'code' && c.text && settings.includeToolOutputs) {
        cur.parts.push('```' + (c.language && c.language !== 'unknown' ? c.language : '') + '\n' + c.text + '\n```');
        continue;
      }
      if (settings.includeToolOutputs) {
        if (role === 'assistant' && ct === 'code' && c.text) {
          cur.parts.push('**Tool call (' + (recipient || 'tool') + ')**\n\n```' + (c.language && c.language !== 'unknown' ? c.language : '') + '\n' + c.text + '\n```');
        } else if (role === 'tool' && (ct === 'execution_output' || ct === 'text') && (c.text || (c.parts && c.parts[0]))) {
          const out = c.text || c.parts.filter((p) => typeof p === 'string').join('\n');
          if (out && out.trim()) cur.parts.push('**Output' + (toolName ? ' (' + toolName + ')' : '') + '**\n\n```\n' + out.trim() + '\n```');
        }
      }
    }
    finishAssistant();

    messages.forEach((m, i) => { m.index = i; });
    return {
      platform: 'chatgpt',
      platformName: 'ChatGPT',
      assistantName: 'ChatGPT',
      id: data.conversation_id || data.id || null,
      title: data.title || 'ChatGPT conversation',
      url: data.conversation_id ? 'https://chatgpt.com/c/' + data.conversation_id : null,
      model,
      createdAt: data.create_time ? data.create_time * 1000 : null,
      updatedAt: data.update_time ? data.update_time * 1000 : null,
      source: 'api',
      messages
    };
  }

  const A = (CE.adapters.chatgpt = {
    id: 'chatgpt',
    name: 'ChatGPT',
    assistantName: 'ChatGPT',
    supportsBulk: true,
    _parse: parseConversation,
    _applyReferences: applyReferences,

    match(host) {
      return /(^|\.)(chatgpt\.com|chat\.openai\.com)$/.test(host);
    },

    conversationId() {
      const m = location.pathname.match(/\/(?:c|share(?:\/e)?)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      return m ? m[1] : null;
    },

    isShare() {
      return /\/share\//.test(location.pathname);
    },

    async _auth() {
      if (A._tok && Date.now() < A._tok.exp) return A._tok;
      const r = await fetch('/api/auth/session', { credentials: 'include' });
      if (!r.ok) throw new Error('Session request failed (' + r.status + ')');
      const j = await r.json();
      if (!j || !j.accessToken) throw new Error('Not signed in');
      A._tok = { token: j.accessToken, user: j.user || {}, exp: Date.now() + 4 * 60 * 1000 };
      return A._tok;
    },

    async _headers() {
      const { token } = await A._auth();
      const h = { Authorization: 'Bearer ' + token };
      const did = U.cookie('oai-did');
      if (did) h['oai-device-id'] = did;
      const acc = U.cookie('_account');
      if (acc && acc !== 'personal') h['ChatGPT-Account-Id'] = acc;
      return h;
    },

    async _api(path) {
      const r = await fetch(path, { headers: await A._headers(), credentials: 'include' });
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + path.split('?')[0]);
      return r.json();
    },

    async loadById(id, settings, isShare) {
      const data = await A._api(isShare ? '/backend-api/share/' + id : '/backend-api/conversation/' + id);
      if (!data.conversation_id) data.conversation_id = id;
      const convo = parseConversation(data, settings);
      try { convo.user = (await A._auth()).user; } catch (e) { /* ignore */ }
      if (settings.includeImages) await A._resolveImages(convo, id);
      return convo;
    },

    async _resolveImages(convo, convoId) {
      const re = /\((file-service:\/\/[^)\s]+|sediment:\/\/[^)\s]+)\)/g;
      const ptrs = new Set();
      convo.messages.forEach((m) => { (m.markdown || '').replace(re, (x, p) => ptrs.add(p)); });
      if (!ptrs.size) return;
      const map = new Map();
      await U.mapLimit([...ptrs], 4, async (p) => {
        try {
          let j;
          if (p.startsWith('file-service://')) {
            const fid = p.slice('file-service://'.length);
            try { j = await A._api('/backend-api/files/' + encodeURIComponent(fid) + '/download'); }
            catch (e) { j = await A._api('/backend-api/files/download/' + encodeURIComponent(fid) + '?conversation_id=' + convoId + '&inline=false'); }
          } else {
            const fid = p.slice('sediment://'.length);
            j = await A._api('/backend-api/conversation/' + convoId + '/attachment/' + encodeURIComponent(fid) + '/download');
          }
          if (j && j.download_url) map.set(p, j.download_url);
        } catch (e) { /* leave placeholder */ }
      });
      convo.messages.forEach((m) => {
        m.markdown = (m.markdown || '').replace(re, (x, p) => (map.has(p) ? '(' + map.get(p) + ')' : '(' + p + ')'));
      });
    },

    async load(settings) {
      const id = A.conversationId();
      let convo = null;
      let apiError = null;
      if (id) {
        try { convo = await A.loadById(id, settings, A.isShare()); } catch (e) { apiError = e; }
      }
      if (!convo || !convo.messages.length) {
        convo = A.scrape(settings);
        if (apiError) convo.apiError = apiError.message;
      }
      return convo;
    },

    async list() {
      const out = [];
      let offset = 0;
      for (let guard = 0; guard < 200; guard++) {
        const j = await A._api('/backend-api/conversations?offset=' + offset + '&limit=100&order=updated');
        const items = j.items || [];
        items.forEach((it) => out.push({ id: it.id, title: it.title || 'Untitled', createdAt: it.create_time ? Date.parse(it.create_time) : null, updatedAt: it.update_time ? Date.parse(it.update_time) : null }));
        offset += items.length;
        if (!items.length || offset >= (j.total || 0)) break;
      }
      return out;
    },

    scrape(settings) {
      const nodes = [...document.querySelectorAll('[data-message-author-role]')];
      const messages = [];
      nodes.forEach((el, i) => {
        const role = el.getAttribute('data-message-author-role');
        if (role !== 'user' && role !== 'assistant') return;
        let md;
        if (role === 'user') {
          const t = el.querySelector('.whitespace-pre-wrap') || el;
          md = (t.innerText || t.textContent || '').trim();
        } else {
          md = CE.html2md(el.querySelector('.markdown') || el);
        }
        if (!md) return;
        const prev = messages[messages.length - 1];
        if (role === 'assistant' && prev && prev.role === 'assistant') {
          prev.markdown += '\n\n' + md;
          return;
        }
        messages.push({ id: el.getAttribute('data-message-id') || 'm' + i, role, markdown: md, sources: [], attachments: [] });
      });
      messages.forEach((m, i) => { m.index = i; });
      let title = (document.title || '').replace(/\s*[-|]\s*ChatGPT\s*$/i, '').trim();
      if (!title || /^ChatGPT$/i.test(title)) {
        const first = messages.find((m) => m.role === 'user');
        title = first ? U.truncate(U.plainFromMarkdownLine(first.markdown), 60) : 'ChatGPT conversation';
      }
      return {
        platform: 'chatgpt', platformName: 'ChatGPT', assistantName: 'ChatGPT',
        id: A.conversationId(), title, url: location.href, model: null,
        createdAt: null, updatedAt: null, source: 'dom', messages
      };
    }
  });
})(globalThis.CE);
