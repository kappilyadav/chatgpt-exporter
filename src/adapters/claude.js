/* Chat Exporter — Claude adapter (claude.ai).
 * Primary: claude.ai internal JSON API (same one the web app uses).  Fallback: DOM scraping.
 */
(function (CE) {
  'use strict';
  const U = CE.util;
  const ROOT_UUID = '00000000-0000-4000-8000-000000000000';

  function parseConversation(data, settings) {
    const all = data.chat_messages || [];
    const byId = new Map(all.map((m) => [m.uuid, m]));
    let chain = [];
    const leaf = data.current_leaf_message_uuid;
    if (leaf && byId.has(leaf)) {
      let cur = byId.get(leaf);
      const seen = new Set();
      while (cur && !seen.has(cur.uuid)) {
        seen.add(cur.uuid);
        chain.push(cur);
        cur = cur.parent_message_uuid && cur.parent_message_uuid !== ROOT_UUID ? byId.get(cur.parent_message_uuid) : null;
      }
      chain.reverse();
    } else {
      chain = all.slice().sort((a, b) => (a.index || 0) - (b.index || 0));
    }

    const artifacts = new Map(); // id → {title,type,language,content}
    const messages = [];

    for (const m of chain) {
      const role = m.sender === 'human' ? 'user' : 'assistant';
      const blocks = Array.isArray(m.content) && m.content.length ? m.content : null;
      const textParts = [];
      const thinking = [];
      const sources = [];
      const touched = [];
      const addSource = (s) => {
        if (!s || !s.url) return;
        if (!sources.some((x) => x.url === s.url)) sources.push({ n: sources.length + 1, title: s.title || s.url, url: s.url });
      };

      if (blocks) {
        for (const b of blocks) {
          if (!b) continue;
          if (b.type === 'text') {
            if (b.text) textParts.push(b.text);
            (b.citations || []).forEach((c) => addSource({ url: c.url || (c.metadata && c.metadata.url), title: c.title || (c.metadata && c.metadata.title) }));
          } else if (b.type === 'thinking') {
            if (b.thinking) thinking.push(b.thinking.trim());
          } else if (b.type === 'tool_use') {
            const inp = b.input || {};
            if (b.name === 'artifacts') {
              const id = inp.id || 'artifact';
              const cur = artifacts.get(id) || { title: inp.title, type: inp.type, language: inp.language, content: '' };
              if (inp.title) cur.title = inp.title;
              if (inp.type) cur.type = inp.type;
              if (inp.language) cur.language = inp.language;
              if (inp.command === 'create' || inp.command === 'rewrite') cur.content = inp.content || '';
              else if (inp.command === 'update' && typeof inp.old_str === 'string') cur.content = cur.content.replace(inp.old_str, inp.new_str || '');
              artifacts.set(id, cur);
              if (!touched.includes(id)) touched.push(id);
            } else if (b.name === 'web_search' && inp.query) {
              if (settings.includeToolOutputs) textParts.push('*Web search: ' + inp.query + '*');
            } else if (settings.includeToolOutputs && b.name) {
              const code = inp.code || inp.command || JSON.stringify(inp, null, 2);
              textParts.push('**Tool call: ' + b.name + '**\n\n```\n' + code + '\n```');
            }
          } else if (b.type === 'tool_result') {
            const items = Array.isArray(b.content) ? b.content : [];
            items.forEach((it) => {
              if (it && it.type === 'knowledge') addSource({ url: it.url, title: it.title });
              else if (settings.includeToolOutputs && it && it.type === 'text' && it.text && b.name !== 'artifacts') {
                textParts.push('**Tool result' + (b.name ? ': ' + b.name : '') + '**\n\n```\n' + it.text.trim() + '\n```');
              }
            });
          }
        }
      }
      if (!textParts.length && m.text && !blocks) textParts.push(m.text);
      if (!textParts.length && m.text && blocks && !blocks.some((b) => b && b.type === 'text')) textParts.push(m.text);

      let markdown = textParts.join('\n\n').trim();
      if (settings.includeCanvas) {
        const cv = touched.map((id) => artifacts.get(id)).filter((a) => a && a.content);
        cv.forEach((a) => {
          const lang = a.language || (/html/.test(a.type || '') ? 'html' : /svg/.test(a.type || '') ? 'svg' : /mermaid/.test(a.type || '') ? 'mermaid' : /markdown/.test(a.type || '') ? '' : (a.type || '').replace(/^application\/vnd\.ant\./, ''));
          const isMd = /markdown/.test(a.type || '');
          markdown += '\n\n**Artifact: ' + (a.title || 'Untitled') + '**\n\n' + (isMd ? a.content : '```' + (lang || '') + '\n' + a.content + '\n```');
        });
      }

      const attachments = [];
      (m.attachments || []).forEach((a) => {
        if (a && a.file_name) attachments.push({ name: a.file_name, type: a.file_type, size: a.file_size });
      });
      const imgs = [];
      (m.files_v2 || m.files || []).forEach((f) => {
        if (!f) return;
        const isImg = f.file_kind === 'image' || /^image\//.test(f.file_type || '');
        const url = f.preview_url || f.thumbnail_url;
        if (isImg && url && settings.includeImages) imgs.push('![' + (f.file_name || 'image') + '](' + (url.startsWith('http') ? url : 'https://claude.ai' + url) + ')');
        else if (f.file_name) attachments.push({ name: f.file_name, type: f.file_kind || f.file_type });
      });
      if (imgs.length) markdown = (imgs.join('\n\n') + '\n\n' + markdown).trim();

      if (!markdown && !thinking.length && !attachments.length) continue;
      messages.push({
        id: m.uuid,
        role,
        time: m.created_at ? Date.parse(m.created_at) : null,
        markdown,
        thinking: thinking.join('\n\n'),
        sources,
        attachments,
        model: m.model || undefined
      });
    }
    messages.forEach((m, i) => { m.index = i; });

    return {
      platform: 'claude',
      platformName: 'Claude',
      assistantName: 'Claude',
      id: data.uuid,
      title: data.name || 'Claude conversation',
      url: data.uuid ? 'https://claude.ai/chat/' + data.uuid : null,
      model: data.model || null,
      createdAt: data.created_at ? Date.parse(data.created_at) : null,
      updatedAt: data.updated_at ? Date.parse(data.updated_at) : null,
      source: 'api',
      messages
    };
  }

  const A = (CE.adapters.claude = {
    id: 'claude',
    name: 'Claude',
    assistantName: 'Claude',
    supportsBulk: true,
    _parse: parseConversation,

    match(host) {
      return /(^|\.)claude\.ai$/.test(host);
    },

    conversationId() {
      const m = location.pathname.match(/\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      return m ? m[1] : null;
    },

    async _api(path) {
      const r = await fetch(path, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + path.split('?')[0]);
      return r.json();
    },

    async _org() {
      if (A._orgId) return A._orgId;
      const c = U.cookie('lastActiveOrg');
      if (/^[0-9a-f-]{36}$/i.test(c)) { A._orgId = c; return c; }
      const orgs = await A._api('/api/organizations');
      const pick = orgs.find((o) => (o.capabilities || []).includes('chat')) || orgs[0];
      if (!pick) throw new Error('No Claude organization found');
      A._orgId = pick.uuid;
      return A._orgId;
    },

    async loadById(id, settings) {
      const org = await A._org();
      const data = await A._api('/api/organizations/' + org + '/chat_conversations/' + id + '?tree=True&rendering_mode=messages&render_all_tools=true');
      return parseConversation(data, settings);
    },

    async load(settings) {
      const id = A.conversationId();
      let convo = null;
      let apiError = null;
      if (id) {
        try { convo = await A.loadById(id, settings); } catch (e) { apiError = e; }
      }
      if (!convo || !convo.messages.length) {
        convo = A.scrape(settings);
        if (apiError) convo.apiError = apiError.message;
      }
      return convo;
    },

    async list() {
      const org = await A._org();
      const arr = await A._api('/api/organizations/' + org + '/chat_conversations');
      return (arr || []).map((c) => ({ id: c.uuid, title: c.name || 'Untitled', createdAt: Date.parse(c.created_at) || null, updatedAt: Date.parse(c.updated_at) || null }))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    },

    scrape(settings) {
      const sel = '[data-testid="user-message"], .font-claude-response, .font-claude-message, [data-is-streaming]';
      let els = [...document.querySelectorAll(sel)];
      els = els.filter((el) => !els.some((o) => o !== el && o.contains(el)));
      const messages = [];
      els.forEach((el, i) => {
        const isUser = el.matches('[data-testid="user-message"]');
        const md = isUser ? (el.innerText || el.textContent || '').trim() : CE.html2md(el);
        if (!md) return;
        messages.push({ id: 'm' + i, role: isUser ? 'user' : 'assistant', markdown: md, sources: [], attachments: [] });
      });
      messages.forEach((m, i) => { m.index = i; });
      let title = (document.title || '').replace(/\s*[-|]\s*Claude\s*$/i, '').trim();
      if (!title || /^Claude$/i.test(title)) {
        const first = messages.find((m) => m.role === 'user');
        title = first ? U.truncate(U.plainFromMarkdownLine(first.markdown), 60) : 'Claude conversation';
      }
      return {
        platform: 'claude', platformName: 'Claude', assistantName: 'Claude',
        id: A.conversationId(), title, url: location.href, model: null,
        createdAt: null, updatedAt: null, source: 'dom', messages
      };
    }
  });
})(globalThis.CE);
