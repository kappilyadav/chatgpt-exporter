/* Chat Exporter — helpers shared by all exporters. */
(function (CE) {
  'use strict';
  const U = CE.util;

  CE.xc = {
    labels(convo, s) {
      return {
        user: (s.userLabel || '').trim() || CE.t('you'),
        assistant: (s.assistantLabel || '').trim() || convo.assistantName || 'Assistant'
      };
    },

    labelFor(msg, convo, s) {
      const L = CE.xc.labels(convo, s);
      if (msg.role === 'user') return msg.author && msg.author !== 'user' ? msg.author : L.user;
      return L.assistant;
    },

    docTime(convo, s) {
      let ms;
      if (s.dateSource === 'export') ms = Date.now();
      else if (s.dateSource === 'updated') ms = convo.updatedAt || convo.createdAt;
      else ms = convo.createdAt || convo.updatedAt;
      return ms || Date.now();
    },

    dateStr(convo, s) {
      return s.showDate ? U.formatDate(CE.xc.docTime(convo, s), s.dateFormat) : '';
    },

    msgTimeStr(m, s) {
      return s.includeTimestamps && m.time ? U.formatDate(m.time, s.dateFormat === 'YYYY-MM-DD' ? 'YYYY-MM-DD HH:mm' : s.dateFormat) : '';
    },

    userLine(s) {
      return [s.userName, s.userEmail ? '<' + s.userEmail + '>' : ''].filter(Boolean).join(' ');
    },

    title(convo, s, forPdf) {
      return (forPdf && s.pdfTitle && s.pdfTitle.trim()) || convo.title || 'Conversation';
    },

    filename(convo, s, ext, extra) {
      const t = (s.filenameTemplate || '{title}').trim() || '{title}';
      const ms = CE.xc.docTime(convo, s);
      const d = new Date(ms);
      const map = {
        title: convo.title || 'chat',
        date: U.formatDate(ms, 'YYYY-MM-DD'),
        time: U.pad(d.getHours()) + '-' + U.pad(d.getMinutes()),
        platform: convo.platformName || convo.platform || '',
        model: convo.model || '',
        id: convo.id || ''
      };
      let name = t.replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
      name = (s.filenamePrefix || '') + name;
      return U.sanitizeFilename(name, 'chat') + (extra || '') + '.' + ext;
    },

    /** Thought process text for a message (respects settings). */
    thinking(m, s) {
      return s.includeThoughts && m.thinking ? m.thinking : '';
    },

    sources(m, s) {
      return s.includeSources && m.sources && m.sources.length ? m.sources : [];
    },

    attachments(m) {
      return m.attachments && m.attachments.length ? m.attachments : [];
    },

    /** Only the fields that should survive JSON serialisation / storage. */
    slim(convo) {
      const { messages, ...rest } = convo;
      return rest;
    }
  };
})(globalThis.CE);
