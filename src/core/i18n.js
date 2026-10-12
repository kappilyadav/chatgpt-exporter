/* Chat Exporter — tiny i18n layer. English is the source; unknown keys fall back to English. */
(function (CE) {
  'use strict';

  const en = {
    selectMessages: 'Select Messages',
    select: 'Select',
    export: 'Export',
    exportAs: 'Export as',
    all: 'All',
    allDefault: 'All (default)',
    questions: 'Questions',
    answers: 'Answers',
    none: 'None',
    invert: 'Invert',
    cancel: 'Cancel',
    copy: 'Copy',
    settings: 'Settings',
    expand: 'Expand',
    back: 'Back',
    refresh: 'Refresh',
    retry: 'Retry',
    loading: 'Loading conversation…',
    loadingHistory: 'Loading full history…',
    tip: 'Tip: Shift+click selects a range of messages.',
    you: 'You',
    exportedN: 'Exported {n} messages as {fmt}',
    copiedN: 'Copied {n} messages as {fmt}',
    nothingSelected: 'Select at least one message first.',
    noConversation: 'No conversation found on this page.',
    failed: 'Export failed: {msg}',
    pdfHint: 'Opening the print preview — choose “Save as PDF”.',
    exportAll: 'Export all chats…',
    bulkTitle: 'Export multiple chats',
    searchChats: 'Search chats',
    selectAll: 'Select all',
    exportZip: 'Export ZIP',
    progress: 'Exporting {i} / {n}…',
    bulkDone: 'Exported {n} chats to a ZIP file',
    bulkUnsupported: 'Bulk export is not available for this site yet. Open a chat and use Export.',
    chatsFound: '{n} chats',
    copyAs: 'Copy as {fmt}',
    quickExport: 'Quick export',
    openPanel: 'Select messages…',
    unsupportedSite: 'Open ChatGPT, Claude or Gemini to export a conversation.',
    selectedOf: '{a}/{b}',
    messages: 'messages'
  };

  const tr = {
    es: { selectMessages: 'Seleccionar mensajes', select: 'Seleccionar', export: 'Exportar', all: 'Todos', allDefault: 'Todos (por defecto)', questions: 'Preguntas', answers: 'Respuestas', none: 'Ninguno', invert: 'Invertir', cancel: 'Cancelar', copy: 'Copiar', settings: 'Ajustes', expand: 'Expandir', back: 'Atrás', refresh: 'Actualizar', retry: 'Reintentar', loading: 'Cargando conversación…', tip: 'Consejo: Mayús+clic selecciona un rango.', you: 'Tú', exportedN: '{n} mensajes exportados como {fmt}', copiedN: '{n} mensajes copiados', nothingSelected: 'Selecciona al menos un mensaje.', failed: 'Error al exportar: {msg}', exportAll: 'Exportar todos los chats…', quickExport: 'Exportación rápida', openPanel: 'Seleccionar mensajes…' },
    fr: { selectMessages: 'Sélectionner les messages', select: 'Sélectionner', export: 'Exporter', all: 'Tous', allDefault: 'Tous (par défaut)', questions: 'Questions', answers: 'Réponses', none: 'Aucun', invert: 'Inverser', cancel: 'Annuler', copy: 'Copier', settings: 'Paramètres', expand: 'Développer', back: 'Retour', refresh: 'Actualiser', retry: 'Réessayer', loading: 'Chargement de la conversation…', tip: 'Astuce : Maj+clic sélectionne une plage.', you: 'Vous', exportedN: '{n} messages exportés en {fmt}', copiedN: '{n} messages copiés', nothingSelected: 'Sélectionnez au moins un message.', failed: 'Échec de l’export : {msg}', exportAll: 'Exporter toutes les conversations…', quickExport: 'Export rapide', openPanel: 'Sélectionner les messages…' },
    de: { selectMessages: 'Nachrichten auswählen', select: 'Auswählen', export: 'Exportieren', all: 'Alle', allDefault: 'Alle (Standard)', questions: 'Fragen', answers: 'Antworten', none: 'Keine', invert: 'Umkehren', cancel: 'Abbrechen', copy: 'Kopieren', settings: 'Einstellungen', expand: 'Erweitern', back: 'Zurück', refresh: 'Aktualisieren', retry: 'Erneut versuchen', loading: 'Unterhaltung wird geladen…', tip: 'Tipp: Umschalt+Klick wählt einen Bereich.', you: 'Du', exportedN: '{n} Nachrichten als {fmt} exportiert', copiedN: '{n} Nachrichten kopiert', nothingSelected: 'Bitte mindestens eine Nachricht auswählen.', failed: 'Export fehlgeschlagen: {msg}', exportAll: 'Alle Chats exportieren…', quickExport: 'Schnellexport', openPanel: 'Nachrichten auswählen…' },
    pt: { selectMessages: 'Selecionar mensagens', select: 'Selecionar', export: 'Exportar', all: 'Todas', allDefault: 'Todas (padrão)', questions: 'Perguntas', answers: 'Respostas', none: 'Nenhuma', invert: 'Inverter', cancel: 'Cancelar', copy: 'Copiar', settings: 'Configurações', expand: 'Expandir', back: 'Voltar', refresh: 'Atualizar', retry: 'Tentar novamente', loading: 'Carregando conversa…', tip: 'Dica: Shift+clique seleciona um intervalo.', you: 'Você', exportedN: '{n} mensagens exportadas como {fmt}', copiedN: '{n} mensagens copiadas', nothingSelected: 'Selecione pelo menos uma mensagem.', failed: 'Falha ao exportar: {msg}', exportAll: 'Exportar todas as conversas…', quickExport: 'Exportação rápida', openPanel: 'Selecionar mensagens…' },
    hi: { selectMessages: 'संदेश चुनें', select: 'चुनें', export: 'निर्यात', all: 'सभी', allDefault: 'सभी (डिफ़ॉल्ट)', questions: 'प्रश्न', answers: 'उत्तर', none: 'कोई नहीं', invert: 'उलटें', cancel: 'रद्द करें', copy: 'कॉपी', settings: 'सेटिंग्स', expand: 'विस्तार', back: 'वापस', refresh: 'रीफ़्रेश', retry: 'पुनः प्रयास', loading: 'बातचीत लोड हो रही है…', tip: 'सुझाव: Shift+क्लिक से रेंज चुनें।', you: 'आप', exportedN: '{n} संदेश {fmt} में निर्यात किए गए', copiedN: '{n} संदेश कॉपी किए गए', nothingSelected: 'कम से कम एक संदेश चुनें।', failed: 'निर्यात विफल: {msg}', exportAll: 'सभी चैट निर्यात करें…', quickExport: 'त्वरित निर्यात', openPanel: 'संदेश चुनें…' },
    zh: { selectMessages: '选择消息', select: '选择', export: '导出', all: '全部', allDefault: '全部（默认）', questions: '提问', answers: '回答', none: '无', invert: '反选', cancel: '取消', copy: '复制', settings: '设置', expand: '展开', back: '返回', refresh: '刷新', retry: '重试', loading: '正在加载对话…', tip: '提示：按住 Shift 点击可选择范围。', you: '你', exportedN: '已将 {n} 条消息导出为 {fmt}', copiedN: '已复制 {n} 条消息', nothingSelected: '请至少选择一条消息。', failed: '导出失败：{msg}', exportAll: '导出所有对话…', quickExport: '快速导出', openPanel: '选择消息…' },
    ja: { selectMessages: 'メッセージを選択', select: '選択', export: 'エクスポート', all: 'すべて', allDefault: 'すべて（既定）', questions: '質問', answers: '回答', none: 'なし', invert: '反転', cancel: 'キャンセル', copy: 'コピー', settings: '設定', expand: '展開', back: '戻る', refresh: '更新', retry: '再試行', loading: '会話を読み込み中…', tip: 'ヒント: Shift+クリックで範囲選択。', you: 'あなた', exportedN: '{n} 件のメッセージを {fmt} で出力しました', copiedN: '{n} 件のメッセージをコピーしました', nothingSelected: 'メッセージを 1 件以上選択してください。', failed: 'エクスポート失敗: {msg}', exportAll: 'すべてのチャットをエクスポート…', quickExport: 'クイックエクスポート', openPanel: 'メッセージを選択…' }
  };

  let lang = 'en';

  CE.i18n = {
    available: ['en', ...Object.keys(tr)],
    set(code) {
      if (!code || code === 'auto') {
        const nav = (typeof navigator !== 'undefined' && (navigator.language || '')) || 'en';
        code = nav.toLowerCase().split('-')[0];
      }
      lang = tr[code] ? code : 'en';
      return lang;
    },
    get() { return lang; }
  };

  CE.t = function (key, vars) {
    let s = (tr[lang] && tr[lang][key]) || en[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    return s;
  };
})(globalThis.CE);
