/* Chat Exporter — namespace, formats, default settings and settings schema. */
(function (g) {
  'use strict';
  const CE = (g.CE = g.CE || {});
  if (CE.__nsLoaded) return;
  CE.__nsLoaded = true;

  CE.VERSION = '1.2.0';

  // Accounts and plans: the website owns sign-up, checkout and billing.
  CE.SITE_URL = 'https://chatgptexporterfree.com';
  // Free-plan monthly quota. "full" = every message of a chat; "single" = a chosen part of a chat.
  CE.LIMITS = { full: 5, single: 7 };
  CE.adapters = CE.adapters || {};
  CE.exporters = CE.exporters || {};
  CE.ui = CE.ui || {};
  CE.util = CE.util || {};

  // Order = order shown in the Export menus.
  CE.FORMATS = [
    { id: 'markdown', label: 'Markdown', ext: 'md', mime: 'text/markdown', copy: true },
    { id: 'pdf', label: 'PDF', ext: 'pdf', mime: 'application/pdf', copy: false },
    { id: 'html', label: 'HTML', ext: 'html', mime: 'text/html', copy: true },
    { id: 'docx', label: 'Word (.docx)', ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', copy: false },
    { id: 'text', get label() { return CE.t ? CE.t('fmtText') : 'Text'; }, ext: 'txt', mime: 'text/plain', copy: true },
    { id: 'json', label: 'JSON', ext: 'json', mime: 'application/json', copy: true },
    { id: 'csv', label: 'CSV', ext: 'csv', mime: 'text/csv', copy: true },
    { id: 'png', get label() { return CE.t ? CE.t('fmtPng') : 'Image (PNG)'; }, ext: 'png', mime: 'image/png', copy: false }
  ];

  CE.DEFAULTS = {
    // general
    language: 'auto',
    theme: 'auto',
    showLauncher: true,
    launcherCollapsed: false,
    format: 'markdown',
    selectionPreset: 'all', // all | questions | answers | none
    rememberSelection: true,
    closePanelAfterExport: false,
    showToasts: true,

    // content
    includeThoughts: true,
    includeSources: true,
    includeTimestamps: false,
    includeToolOutputs: false,
    includeImages: true,
    embedImages: true,
    includeCanvas: true,
    userLabel: '',
    assistantLabel: '',
    userName: '',
    userEmail: '',
    showDate: true,
    dateSource: 'created', // created | updated | export
    dateFormat: 'YYYY-MM-DD HH:mm',
    showRoleIcons: true,
    branding: false,

    // files
    filenameTemplate: '{title}',
    filenamePrefix: '',
    downloadSubfolder: '',

    // markdown
    mdFrontMatter: false,
    mdThinkingStyle: 'blockquote', // blockquote | details

    // json / csv
    jsonPretty: true,
    csvDelimiter: ',',

    // pdf / html / image
    pdfPageSize: 'A4',
    pdfOrientation: 'portrait',
    pdfTheme: 'light',
    pdfPageNumbers: true,
    pdfMargins: 'normal',
    pdfFontScale: 100,
    pdfFontFamily: 'sans',
    pdfToc: false,
    pdfTitle: '',
    pdfPageBreakPerPrompt: false,
    pdfWrapCode: true,
    pdfAutoPrint: true
  };

  const yesNo = [['true', 'Yes'], ['false', 'No']];
  void yesNo;

  // Declarative schema used by the in-panel settings view and the options page.
  CE.SETTINGS_SCHEMA = [
    {
      id: 'general', title: 'General', fields: [
        { key: 'language', type: 'select', label: 'Interface language', options: [['auto', 'Auto (browser)']] /* the language list is added by settings-form.js */ },
        { key: 'theme', type: 'select', label: 'Panel theme', options: [['auto', 'Auto'], ['dark', 'Dark'], ['light', 'Light']] },
        { key: 'showLauncher', type: 'bool', label: 'Show Select / Export buttons on the chat page' },
        { key: 'rememberSelection', type: 'bool', label: 'Remember my selection preset (All / Questions / Answers)' },
        { key: 'closePanelAfterExport', type: 'bool', label: 'Close the side panel after export' },
        { key: 'showToasts', type: 'bool', label: 'Show a confirmation after export' }
      ]
    },
    {
      id: 'content', title: 'Content', fields: [
        { key: 'includeThoughts', type: 'bool', label: 'Include thought process / reasoning' },
        { key: 'includeSources', type: 'bool', label: 'Include web-search sources & citations' },
        { key: 'includeCanvas', type: 'bool', label: 'Include Canvas / Artifacts' },
        { key: 'includeImages', type: 'bool', label: 'Include images' },
        { key: 'embedImages', type: 'bool', label: 'Embed images inside the file (PDF, HTML, Word, PNG)' },
        { key: 'includeToolOutputs', type: 'bool', label: 'Include tool calls & code-interpreter output' },
        { key: 'includeTimestamps', type: 'bool', label: 'Show a timestamp for every message' },
        { key: 'showRoleIcons', type: 'bool', label: 'Show role icons / emoji' },
        { key: 'userName', type: 'text', label: 'Your name (shown in the export header)' },
        { key: 'userEmail', type: 'text', label: 'Your email (shown in the export header)' },
        { key: 'userLabel', type: 'text', label: 'Label for your messages (default: You)' },
        { key: 'assistantLabel', type: 'text', label: 'Label for AI messages (default: platform name)' },
        { key: 'showDate', type: 'bool', label: 'Show the conversation date' },
        { key: 'dateSource', type: 'select', label: 'Date source', options: [['created', 'Created'], ['updated', 'Last modified'], ['export', 'Export time']] },
        { key: 'dateFormat', type: 'select', label: 'Date format', options: [['YYYY-MM-DD HH:mm', '2026-10-12 19:45'], ['YYYY-MM-DD', '2026-10-12'], ['DD/MM/YYYY HH:mm', '12/10/2026 19:45'], ['MM/DD/YYYY HH:mm', '10/12/2026 19:45'], ['locale', 'Browser locale'], ['iso', 'ISO 8601']] },
        { key: 'branding', type: 'bool', label: 'Add “Exported with Chat Exporter” footer' }
      ]
    },
    {
      id: 'files', title: 'Files', fields: [
        { key: 'filenameTemplate', type: 'text', label: 'File name template — {title} {date} {time} {platform} {model} {id}' },
        { key: 'filenamePrefix', type: 'text', label: 'File name prefix' },
        { key: 'downloadSubfolder', type: 'text', label: 'Download sub-folder (inside your Downloads folder)' }
      ]
    },
    {
      id: 'markdown', title: 'Markdown', fields: [
        { key: 'mdFrontMatter', type: 'bool', label: 'Add YAML front matter' },
        { key: 'mdThinkingStyle', type: 'select', label: 'Thought process style', options: [['blockquote', 'Block quote'], ['details', 'Collapsible <details>']] }
      ]
    },
    {
      id: 'dataformats', title: 'JSON & CSV', fields: [
        { key: 'jsonPretty', type: 'bool', label: 'Pretty-print JSON' },
        { key: 'csvDelimiter', type: 'select', label: 'CSV delimiter', options: [[',', 'Comma ,'], [';', 'Semicolon ;'], ['\t', 'Tab']] }
      ]
    },
    {
      id: 'pdf', title: 'PDF / HTML / Image', fields: [
        { key: 'pdfTitle', type: 'text', label: 'Content title (blank = chat title)' },
        { key: 'pdfPageSize', type: 'select', label: 'Page size', options: [['A4', 'A4'], ['Letter', 'Letter'], ['Legal', 'Legal'], ['A3', 'A3'], ['A5', 'A5']] },
        { key: 'pdfOrientation', type: 'select', label: 'Orientation', options: [['portrait', 'Portrait'], ['landscape', 'Landscape']] },
        { key: 'pdfTheme', type: 'select', label: 'Theme', options: [['light', 'Light'], ['dark', 'Dark']] },
        { key: 'pdfMargins', type: 'select', label: 'Margins', options: [['narrow', 'Narrow'], ['normal', 'Normal'], ['wide', 'Wide']] },
        { key: 'pdfFontScale', type: 'number', label: 'Font size (% of default)', min: 50, max: 300, step: 5 },
        { key: 'pdfFontFamily', type: 'select', label: 'Font family', options: [['sans', 'Sans-serif'], ['serif', 'Serif'], ['mono', 'Monospace']] },
        { key: 'pdfPageNumbers', type: 'bool', label: 'Page numbers' },
        { key: 'pdfToc', type: 'bool', label: 'Table of contents' },
        { key: 'pdfPageBreakPerPrompt', type: 'bool', label: 'Start every prompt on a new page' },
        { key: 'pdfWrapCode', type: 'bool', label: 'Wrap long code lines' },
        { key: 'pdfAutoPrint', type: 'bool', label: 'Open the print dialog automatically' }
      ]
    }
  ];
})(globalThis);
