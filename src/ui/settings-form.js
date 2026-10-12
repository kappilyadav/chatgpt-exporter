/* Chat Exporter — renders CE.SETTINGS_SCHEMA as a form (used by the side panel and the options page). */
(function (CE) {
  'use strict';

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /**
   * @param {HTMLElement} container
   * @param {object} values   current settings
   * @param {(key:string, value:any)=>void} onChange
   */
  function render(container, values, onChange) {
    container.textContent = '';
    CE.SETTINGS_SCHEMA.forEach((section) => {
      const sec = el('section', 'cf-section');
      sec.appendChild(el('h3', 'cf-title', section.title));
      section.fields.forEach((f) => {
        const row = el('label', 'cf-row cf-' + f.type);
        const lab = el('span', 'cf-label', f.label);
        let input;
        if (f.type === 'bool') {
          input = el('input');
          input.type = 'checkbox';
          input.checked = !!values[f.key];
          input.addEventListener('change', () => onChange(f.key, input.checked));
          row.appendChild(input);
          row.appendChild(lab);
        } else if (f.type === 'select') {
          input = el('select');
          f.options.forEach(([v, t]) => {
            const o = el('option', '', t);
            o.value = v;
            input.appendChild(o);
          });
          input.value = String(values[f.key]);
          input.addEventListener('change', () => onChange(f.key, input.value));
          row.appendChild(lab);
          row.appendChild(input);
        } else if (f.type === 'number') {
          input = el('input');
          input.type = 'number';
          if (f.min != null) input.min = f.min;
          if (f.max != null) input.max = f.max;
          if (f.step != null) input.step = f.step;
          input.value = values[f.key];
          input.addEventListener('change', () => {
            let n = Number(input.value);
            if (!isFinite(n)) n = CE.DEFAULTS[f.key];
            if (f.min != null) n = Math.max(f.min, n);
            if (f.max != null) n = Math.min(f.max, n);
            input.value = n;
            onChange(f.key, n);
          });
          row.appendChild(lab);
          row.appendChild(input);
        } else {
          input = el('input');
          input.type = 'text';
          input.value = values[f.key] == null ? '' : values[f.key];
          input.spellcheck = false;
          input.addEventListener('change', () => onChange(f.key, input.value));
          row.appendChild(lab);
          row.appendChild(input);
        }
        sec.appendChild(row);
      });
      container.appendChild(sec);
    });
  }

  CE.ui.settingsForm = { render };
})(globalThis.CE);
