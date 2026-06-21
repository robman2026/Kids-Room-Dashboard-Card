/**
 * kids-room-card
 * A custom Home Assistant card for a kids bedroom dashboard.
 * Repository: https://github.com/robman2026/Kids-Room-Dashboard-Card
 * Version: 1.7.0
 */

// Section metadata shared by the editor (Layout reorder list + category
// panels) and the card renderer. `key` is what gets stored in
// `section_order`; `label`/`icon` drive the editor UI.
const KRC_SECTIONS = [
  { key: 'temperature', label: 'Temperature', icon: 'mdi:thermometer' },
  { key: 'humidity',    label: 'Humidity',    icon: 'mdi:water-percent' },
  { key: 'camera',      label: 'Camera',      icon: 'mdi:cctv' },
  { key: 'windows',     label: 'Windows',     icon: 'mdi:window-closed-variant' },
  { key: 'motion',      label: 'Motion',      icon: 'mdi:motion-sensor' },
  { key: 'lights',      label: 'Lights',      icon: 'mdi:lightbulb' },
];
const KRC_DEFAULT_ORDER = KRC_SECTIONS.map(s => s.key);

// Resolve the effective section order: any keys saved in section_order
// first (filtered to known sections), then any remaining defaults so a
// section is never silently lost when the config is partial.
function krcOrderedKeys(cfg) {
  const all = KRC_DEFAULT_ORDER;
  const ord = Array.isArray(cfg && cfg.section_order)
    ? cfg.section_order.filter(k => all.includes(k))
    : [];
  return [...ord, ...all.filter(k => !ord.includes(k))];
}

// ha-entity-picker / ha-icon-picker load with the picker bundle, but
// ha-textfield often is not registered until a form-based editor loads.
// Pulling in the built-in Entities card editor defines it; we fall back to
// a native <input> in the editor if this ever fails.
async function krcEnsureComponents() {
  if (customElements.get('ha-textfield')) return;
  try {
    const helpers = await window.loadCardHelpers?.();
    const el = helpers && helpers.createCardElement
      ? helpers.createCardElement({ type: 'entities', entities: [] })
      : null;
    const ctor = el && el.constructor;
    if (ctor && ctor.getConfigElement) await ctor.getConfigElement();
  } catch (e) {
    /* fallback to native inputs */
  }
}

// ── Visual Editor ─────────────────────────────────────────────────────────────
class KidsRoomCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._rendered = false;
  }

  set hass(hass) {
    this._hass = hass;
    // Keep the native HA pickers fed with the latest hass so they can
    // resolve entities/states without forcing a full re-render.
    if (this.shadowRoot) {
      this.shadowRoot
        .querySelectorAll('ha-entity-picker, ha-icon-picker')
        .forEach(el => { el.hass = hass; });
    }
  }

  async setConfig(config) {
    this._config = { ...config };
    // Render once. Subsequent setConfig calls come from our own
    // config-changed events — re-rendering then would steal focus from
    // whichever HA picker the user is editing.
    if (this._rendered || this._rendering) return;
    this._rendering = true;
    await krcEnsureComponents();
    this._render();
    this._rendering = false;
  }

  _changed(key, value) {
    const v = value === '' || value === undefined || value === null ? undefined : value;
    this._config = { ...this._config, [key]: v };
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config } }));
  }

  // Native HA searchable entity picker. `domain` may be comma-separated
  // (e.g. 'light,switch') to restrict the dropdown to multiple domains.
  _entityPicker(key, label, domain) {
    const domains = domain ? domain.split(',') : [];
    return `<ha-entity-picker data-key="${key}" data-label="${label}" data-domains="${domains.join(',')}"></ha-entity-picker>`;
  }

  // Text field for names/titles. Uses the native ha-textfield when it is
  // registered, otherwise a styled <input> so the field is never missing.
  _textField(key, label, placeholder = '') {
    if (customElements.get('ha-textfield')) {
      return `<ha-textfield data-key="${key}" data-label="${label}" data-placeholder="${placeholder}"></ha-textfield>`;
    }
    return `<label class="nfield"><span>${label}</span>
      <input class="ninput" type="text" data-key="${key}" data-kind="text" placeholder="${placeholder}" /></label>`;
  }

  // Native HA icon picker (mdi:* icons with search + preview).
  _iconPicker(key, label) {
    return `<ha-icon-picker data-key="${key}" data-label="${label}"></ha-icon-picker>`;
  }

  // Groups the three native pickers (entity / name / icon) for one entity.
  _entityGroup(prefix, entityLabel, domain) {
    return `
      <div class="entity-group">
        ${this._entityPicker(prefix + '_entity', entityLabel, domain)}
        ${this._textField(prefix + '_name', 'Name')}
        ${this._iconPicker(prefix + '_icon', 'Icon')}
      </div>`;
  }

  _numberField(key, label, min, max, placeholder = '') {
    if (customElements.get('ha-textfield')) {
      return `<ha-textfield data-key="${key}" data-label="${label}" data-type="number" data-min="${min}" data-max="${max}" data-placeholder="${placeholder}"></ha-textfield>`;
    }
    return `<label class="nfield"><span>${label}</span>
      <input class="ninput" type="number" data-key="${key}" data-kind="number" min="${min}" max="${max}" placeholder="${placeholder}" /></label>`;
  }

  _section(title) {
    return `<div class="section-title">${title}</div>`;
  }

  // The fields shown inside one collapsible category panel.
  _categoryBody(key) {
    switch (key) {
      case 'temperature':
        return `${this._entityGroup('temp', 'Temperature Sensor', 'sensor')}
          <div class="row2">
            ${this._numberField('temp_min', 'Min °C', -30, 100, '0')}
            ${this._numberField('temp_max', 'Max °C', -30, 100, '50')}
          </div>`;
      case 'humidity':
        return `${this._entityGroup('humidity', 'Humidity Sensor', 'sensor')}
          <div class="row2">
            ${this._numberField('hum_min', 'Min %', 0, 100, '0')}
            ${this._numberField('hum_max', 'Max %', 0, 100, '100')}
          </div>`;
      case 'camera':
        return this._entityGroup('camera', 'Camera Entity', 'camera');
      case 'windows':
        return `${this._entityGroup('window_left', 'Window Left Sensor', 'binary_sensor')}
          ${this._entityGroup('window_right', 'Window Right Sensor', 'binary_sensor')}`;
      case 'motion':
        return this._entityGroup('motion', 'Motion Sensor', 'binary_sensor');
      case 'lights':
        return `${this._entityGroup('light_1', 'Kid 1 — Light / Switch', 'light,switch')}
          ${this._entityGroup('light_2', 'Kid 2 — Light / Switch', 'light,switch')}`;
      default:
        return '';
    }
  }

  // A category is expanded by default when it already has an entity set,
  // so configured rooms open ready to edit and empty ones stay tidy.
  _categoryConfigured(key) {
    const c = this._config;
    switch (key) {
      case 'temperature': return !!c.temp_entity;
      case 'humidity':    return !!c.humidity_entity;
      case 'camera':      return !!c.camera_entity;
      case 'windows':     return !!(c.window_left_entity || c.window_right_entity);
      case 'motion':      return !!c.motion_entity;
      case 'lights':      return !!(c.light_1_entity || c.light_2_entity);
      default:            return false;
    }
  }

  // Draggable rows for the Layout reorder list, in current order.
  _layoutRows() {
    return krcOrderedKeys(this._config).map((key, i) => {
      const meta = KRC_SECTIONS.find(s => s.key === key);
      return `
        <div class="layout-row" draggable="true" data-idx="${i}" data-section="${key}">
          <ha-icon class="drag-handle" icon="mdi:drag-vertical"></ha-icon>
          <ha-icon class="layout-section-icon" icon="${meta.icon}"></ha-icon>
          <span class="layout-section-label">${meta.label}</span>
        </div>`;
    }).join('');
  }

  // Collapsible category panels, in the fixed default order (the Layout
  // list — not these panels — controls how the card itself is ordered).
  _categories() {
    return KRC_SECTIONS.map(meta => {
      const open = this._categoryConfigured(meta.key);
      return `
        <div class="category${open ? '' : ' collapsed'}" data-section="${meta.key}">
          <div class="cat-header" data-section="${meta.key}">
            <ha-icon class="cat-icon" icon="${meta.icon}"></ha-icon>
            <span class="cat-title">${meta.label}</span>
            <ha-icon class="cat-chevron" icon="mdi:chevron-down"></ha-icon>
          </div>
          <div class="cat-body">${this._categoryBody(meta.key)}</div>
        </div>`;
    }).join('');
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .editor { padding: 16px; display: flex; flex-direction: column; gap: 8px; font-family: var(--paper-font-body1_-_font-family, 'Segoe UI', sans-serif); }
        .section-title {
          font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; color: var(--primary-color, #03a9f4);
          padding: 10px 0 4px; border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.12));
          margin-top: 6px;
        }
        label { font-size: 12px; color: var(--secondary-text-color, #727272); font-weight: 500; }
        ha-entity-picker, ha-icon-picker, ha-textfield { display: block; width: 100%; }
        .entity-group { display: flex; flex-direction: column; gap: 8px; }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        /* Native field fallback (when ha-textfield is unavailable) */
        .nfield { display: flex; flex-direction: column; gap: 4px; }
        .ninput {
          padding: 10px 12px; border-radius: 6px;
          border: 1px solid var(--divider-color, rgba(0,0,0,0.2));
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
          font-size: 14px; width: 100%; box-sizing: border-box;
        }
        /* Toggle */
        .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; }
        .toggle-label { font-size: 13px; color: var(--primary-text-color, rgba(0,0,0,0.85)); }
        .toggle-wrap { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
        .toggle-wrap input { display: none; }
        .toggle-slider { position: absolute; inset: 0; background: rgba(0,0,0,0.15); border-radius: 11px; cursor: pointer; transition: background .2s; }
        .toggle-slider::before { content: ''; position: absolute; left: 3px; top: 3px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
        .toggle-wrap input:checked + .toggle-slider { background: var(--primary-color, #6366f1); }
        .toggle-wrap input:checked + .toggle-slider::before { transform: translateX(18px); }
        /* Range slider */
        .range-row { display: flex; flex-direction: column; gap: 6px; }
        .range-header { display: flex; align-items: center; justify-content: space-between; }
        .range-val { font-size: 12px; font-weight: 600; color: var(--primary-color, #6366f1); font-family: monospace; min-width: 36px; text-align: right; }
        .range-input {
          -webkit-appearance: none; width: 100%; height: 4px; border-radius: 2px; outline: none; cursor: pointer;
          background: linear-gradient(to right, var(--primary-color, #6366f1) 0%, var(--primary-color, #6366f1) var(--rp, 50%), rgba(0,0,0,0.12) var(--rp, 50%), rgba(0,0,0,0.12) 100%);
          border: none;
        }
        .range-input::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,.4), 0 1px 3px rgba(0,0,0,.3); cursor: pointer; }
        .range-input::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; border: none; background: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,.4); cursor: pointer; }
        .hint { font-size: 11px; color: var(--secondary-text-color, rgba(0,0,0,0.5)); line-height: 1.5; margin: 0; }
        .frosted-fields { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }

        /* Layout reorder list */
        .layout-list { display: flex; flex-direction: column; gap: 6px; padding-top: 4px; }
        .layout-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 8px; cursor: grab;
          background: var(--secondary-background-color, rgba(0,0,0,0.04));
          border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
          transition: border-color .15s, opacity .15s;
        }
        .layout-row:active { cursor: grabbing; }
        .layout-row.dragging { opacity: 0.4; }
        .layout-row.drag-over { border-color: var(--primary-color, #03a9f4); border-style: dashed; }
        .layout-row .drag-handle { color: var(--secondary-text-color, #888); --mdc-icon-size: 20px; }
        .layout-row .layout-section-icon { color: var(--primary-color, #03a9f4); --mdc-icon-size: 20px; }
        .layout-section-label { font-size: 13px; font-weight: 500; color: var(--primary-text-color, #212121); }

        /* Collapsible category panels */
        .category {
          border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
          border-radius: 10px; overflow: hidden; margin-bottom: 2px;
          background: var(--card-background-color, transparent);
        }
        .cat-header {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 12px; cursor: pointer; user-select: none;
        }
        .cat-header .cat-icon { color: var(--primary-color, #03a9f4); --mdc-icon-size: 20px; }
        .cat-title { flex: 1; font-size: 14px; font-weight: 600; color: var(--primary-text-color, #212121); }
        .cat-chevron { color: var(--secondary-text-color, #888); transition: transform .2s; --mdc-icon-size: 22px; }
        .category.collapsed .cat-chevron { transform: rotate(-90deg); }
        .cat-body { padding: 0 12px 12px; display: flex; flex-direction: column; gap: 8px; }
        .category.collapsed .cat-body { display: none; }
      </style>
      <div class="editor">

        ${this._section('General')}
        ${this._textField('title', 'Card Title', 'KIDS BEDROOM')}

        ${this._section('🎨 Appearance')}
        <div class="toggle-row">
          <span class="toggle-label">✨ Just HA Design</span>
          <label class="toggle-wrap">
            <input type="checkbox" id="jha-toggle" ${this._config.jha ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="toggle-row">
          <span class="toggle-label">Frosted Glass Mode</span>
          <label class="toggle-wrap">
            <input type="checkbox" id="fg-toggle" ${this._config.frosted_glass ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="frosted-fields" id="frosted-fields" style="display:${this._config.frosted_glass ? 'flex' : 'none'}">
          <p class="hint">The card and all inner tiles use a translucent blur effect. Works best with a dynamic wallpaper behind Home Assistant.</p>
          <div class="range-row">
            <div class="range-header">
              <label>Glass Opacity</label>
              <span class="range-val" id="opacity-val">${(this._config.frosted_opacity || 0.52).toFixed(2)}</span>
            </div>
            <input type="range" class="range-input" id="opacity-range"
              min="0.1" max="0.9" step="0.01"
              value="${this._config.frosted_opacity || 0.52}"
              style="--rp:${Math.round(((this._config.frosted_opacity || 0.52) - 0.1) / 0.8 * 100)}%" />
          </div>
          <div class="range-row">
            <div class="range-header">
              <label>Blur Strength</label>
              <span class="range-val" id="blur-val">${(this._config.frosted_blur || 22)}px</span>
            </div>
            <input type="range" class="range-input" id="blur-range"
              min="4" max="40" step="1"
              value="${this._config.frosted_blur || 22}"
              style="--rp:${Math.round(((this._config.frosted_blur || 22) - 4) / 36 * 100)}%" />
          </div>
        </div>

        ${this._section('🔀 Layout — drag to reorder sections')}
        <div class="layout-list" id="layout-list">${this._layoutRows()}</div>

        ${this._section('🗂️ Sections')}
        ${this._categories()}

      </div>
    `;

    // Frosted glass toggle
    const fgToggle = this.shadowRoot.getElementById('fg-toggle');
    const fgFields = this.shadowRoot.getElementById('frosted-fields');
    if (fgToggle) {
      fgToggle.addEventListener('change', e => {
        this._changed('frosted_glass', e.target.checked);
        if (fgFields) fgFields.style.display = e.target.checked ? 'flex' : 'none';
      });
    }

    const jhaToggle = this.shadowRoot.getElementById('jha-toggle');
    if (jhaToggle) {
      jhaToggle.addEventListener('change', e => this._changed('jha', e.target.checked));
    }

    // Opacity range
    const opRange = this.shadowRoot.getElementById('opacity-range');
    const opVal   = this.shadowRoot.getElementById('opacity-val');
    if (opRange) {
      opRange.addEventListener('input', e => {
        const v = parseFloat(e.target.value);
        const pct = Math.round((v - 0.1) / 0.8 * 100);
        e.target.style.setProperty('--rp', pct + '%');
        if (opVal) opVal.textContent = v.toFixed(2);
        this._changed('frosted_opacity', v);
      });
    }

    // Blur range
    const blRange = this.shadowRoot.getElementById('blur-range');
    const blVal   = this.shadowRoot.getElementById('blur-val');
    if (blRange) {
      blRange.addEventListener('input', e => {
        const v = parseInt(e.target.value);
        const pct = Math.round((v - 4) / 36 * 100);
        e.target.style.setProperty('--rp', pct + '%');
        if (blVal) blVal.textContent = v + 'px';
        this._changed('frosted_blur', v);
      });
    }

    // Collapsible category headers
    this.shadowRoot.querySelectorAll('.cat-header').forEach(h => {
      h.addEventListener('click', () => {
        const cat = h.closest('.category');
        if (cat) cat.classList.toggle('collapsed');
      });
    });

    this._wireLayout();
    this._wireFields();

    this._rendered = true;
  }

  // Index-based drag-and-drop reorder of the Layout list. On drop we splice
  // the dragged section to its new position, save section_order, and rebuild
  // just this list (leaving the entity panels — and their focus — intact).
  _wireLayout() {
    const list = this.shadowRoot.getElementById('layout-list');
    if (!list) return;
    list.querySelectorAll('.layout-row').forEach(row => {
      row.addEventListener('dragstart', e => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', row.dataset.idx);
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        row.classList.add('drag-over');
      });
      row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
      row.addEventListener('drop', e => {
        e.preventDefault();
        row.classList.remove('drag-over');
        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const to = parseInt(row.dataset.idx, 10);
        if (isNaN(from) || isNaN(to) || from === to) return;
        const next = krcOrderedKeys(this._config);
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        this._changed('section_order', next);
        list.innerHTML = this._layoutRows();
        this._wireLayout();
      });
    });
  }

  // Wire up the native HA pickers and text fields after a render.
  _wireFields() {
    // Native HA entity pickers
    this.shadowRoot.querySelectorAll('ha-entity-picker').forEach(el => {
      el.hass = this._hass;
      el.label = el.dataset.label || '';
      el.allowCustomEntity = true;
      const domains = (el.dataset.domains || '').split(',').filter(Boolean);
      if (domains.length) el.includeDomains = domains;
      el.value = this._config[el.dataset.key] || '';
      el.addEventListener('value-changed', e => {
        e.stopPropagation();
        this._changed(el.dataset.key, e.detail.value);
      });
    });

    // Native HA icon pickers
    this.shadowRoot.querySelectorAll('ha-icon-picker').forEach(el => {
      el.hass = this._hass;
      el.label = el.dataset.label || '';
      el.value = this._config[el.dataset.key] || '';
      el.addEventListener('value-changed', e => {
        e.stopPropagation();
        this._changed(el.dataset.key, e.detail.value);
      });
    });

    // Native HA text fields (titles, names, numeric min/max)
    this.shadowRoot.querySelectorAll('ha-textfield').forEach(el => {
      const isNum = el.dataset.type === 'number';
      el.label = el.dataset.label || '';
      if (el.dataset.placeholder) el.placeholder = el.dataset.placeholder;
      if (isNum) {
        el.type = 'number';
        if (el.dataset.min !== undefined) el.min = el.dataset.min;
        if (el.dataset.max !== undefined) el.max = el.dataset.max;
      }
      const cur = this._config[el.dataset.key];
      el.value = cur !== undefined && cur !== null ? String(cur) : '';
      el.addEventListener('input', e => {
        let v = e.target.value;
        if (isNum) v = v === '' ? undefined : parseFloat(v);
        this._changed(el.dataset.key, v);
      });
    });

    // Native <input> fallback fields
    this.shadowRoot.querySelectorAll('.ninput').forEach(el => {
      const isNum = el.dataset.kind === 'number';
      const cur = this._config[el.dataset.key];
      el.value = cur !== undefined && cur !== null ? String(cur) : '';
      el.addEventListener('input', e => {
        let v = e.target.value;
        if (isNum) v = v === '' ? undefined : parseFloat(v);
        this._changed(el.dataset.key, v);
      });
    });
  }
}

customElements.define('kids-room-card-editor', KidsRoomCardEditor);


// ── Main Card ─────────────────────────────────────────────────────────────────
class KidsRoomCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._cameraRefreshInterval = null;
    this._clockInterval = null;
  }

  static getConfigElement() {
    return document.createElement('kids-room-card-editor');
  }

  static getStubConfig() {
    return {
      title: 'KIDS BEDROOM',
      camera_entity: 'camera.kids_bedroom',
      camera_name: '',
      camera_icon: '',
      temp_entity: 'sensor.kids_temp',
      temp_name: 'Temperature',
      temp_icon: 'mdi:thermometer',
      humidity_entity: 'sensor.kids_humidity',
      humidity_name: 'Humidity',
      humidity_icon: 'mdi:water-percent',
      temp_min: 0,
      temp_max: 50,
      hum_min: 0,
      hum_max: 100,
      motion_entity: 'binary_sensor.kids_motion',
      motion_name: 'Movement',
      motion_icon: 'mdi:motion-sensor',
      window_left_entity: 'binary_sensor.kids_window_left',
      window_left_name: 'Window Left',
      window_left_icon: 'mdi:window-closed-variant',
      window_right_entity: 'binary_sensor.kids_window_right',
      window_right_name: 'Window Right',
      window_right_icon: 'mdi:window-closed-variant',
      light_1_entity: 'light.kids_lamp_1',
      light_1_name: 'Kid 1',
      light_1_icon: 'mdi:lamp',
      light_2_entity: 'light.kids_lamp_2',
      light_2_name: 'Kid 2',
      light_2_icon: 'mdi:lamp',
      frosted_glass: false,
      frosted_opacity: 0.52,
      frosted_blur: 22,
      section_order: [...KRC_DEFAULT_ORDER],
    };
  }

  setConfig(config) {
    if (!config.temp_entity) throw new Error('temp_entity is required');
    if (!config.humidity_entity) throw new Error('humidity_entity is required');
    this._config = {
      title: 'KIDS BEDROOM',
      temp_min: 0,
      temp_max: 50,
      hum_min: 0,
      hum_max: 100,
      light_1_name: 'Kid 1',
      light_2_name: 'Kid 2',
      frosted_glass: false,
      frosted_opacity: 0.52,
      frosted_blur: 22,
      ...config,
    };
    this._render();
  }

  // hass setter: NEVER re-renders DOM — only patches values
  set hass(hass) {
    this._hass = hass;
    this._updateStates();
    this._setupCameraStream();
  }

  getCardSize() { return 7; }

  // ── Helpers ────────────────────────────────────────────────────────────────
  _getState(entityId) {
    if (!this._hass || !entityId) return null;
    return this._hass.states[entityId] || null;
  }

  _getValue(entityId) {
    const s = this._getState(entityId);
    return s ? s.state : 'N/A';
  }

  _isOn(entityId) {
    const s = this._getState(entityId);
    return s ? s.state === 'on' : false;
  }

  _toggle(entityId) {
    if (this._hass && entityId)
      this._hass.callService('homeassistant', 'toggle', { entity_id: entityId });
  }

  _moreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      bubbles: true, composed: true,
      detail: { entityId },
    }));
  }

  // Renders a configured mdi icon via HA's <ha-icon>, falling back to the
  // original emoji glyph when no icon is set in the config.
  _iconHtml(iconVal, fallbackEmoji, size) {
    if (iconVal) return `<ha-icon icon="${iconVal}" style="--mdc-icon-size:${size};"></ha-icon>`;
    return fallbackEmoji;
  }

  _relativeTime(entityId) {
    const s = this._getState(entityId);
    if (!s) return '';
    const diff = Math.floor((Date.now() - new Date(s.last_changed)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  // Interpolated severity color — stops are ABSOLUTE °C values (not percentages)
  // 0→#2391FF (blue), 19→#14FF6A (green), 27→#F8FF42 (yellow), 35→#FF3502 (red)
  _severityColor(value) {
    const stops = [
      { pos: 0,  r: 0x23, g: 0x91, b: 0xFF },
      { pos: 19, r: 0x14, g: 0xFF, b: 0x6A },
      { pos: 27, r: 0xF8, g: 0xFF, b: 0x42 },
      { pos: 35, r: 0xFF, g: 0x35, b: 0x02 },
      { pos: 50, r: 0xFF, g: 0x35, b: 0x02 },
    ];
    const clamped = Math.max(stops[0].pos, Math.min(stops[stops.length - 1].pos, value));
    let lo = stops[0], hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (clamped >= stops[i].pos && clamped <= stops[i + 1].pos) {
        lo = stops[i]; hi = stops[i + 1]; break;
      }
    }
    const f = (clamped - lo.pos) / (hi.pos - lo.pos || 1);
    const r = Math.round(lo.r + f * (hi.r - lo.r));
    const g = Math.round(lo.g + f * (hi.g - lo.g));
    const b = Math.round(lo.b + f * (hi.b - lo.b));
    return `rgb(${r},${g},${b})`;
  }

  _arcDashOffset(value, min, max) {
    const circumference = 125.6;
    const pct = Math.min(Math.max((value - min) / (max - min || 1), 0), 1);
    return circumference - pct * circumference;
  }

  // ── Camera — exact garage card pattern ────────────────────────────────────
  _setupCameraStream() {
    const camSection = this.shadowRoot.getElementById('camera-section');
    if (!camSection || !this._config.camera_entity || !this._hass) return;
    camSection.style.display = '';

    const stream = this.shadowRoot.getElementById('kids-camera-stream');
    if (stream) {
      const stateObj = this._hass.states[this._config.camera_entity] || null;
      if (stream._lastStateObj !== stateObj) {
        stream._lastStateObj = stateObj;
        stream.hass = this._hass;
        stream.stateObj = stateObj;
        if (typeof stream.requestUpdate === 'function') stream.requestUpdate();
      }
    }

    const wrapper = this.shadowRoot.getElementById('camera-wrapper');
    if (wrapper && !wrapper._listenerAttached) {
      wrapper._listenerAttached = true;
      wrapper.addEventListener('click', (e) => {
        if (e.target !== wrapper && e.target.closest && e.target.closest('ha-camera-stream')) return;
        this.dispatchEvent(new CustomEvent('hass-more-info', {
          bubbles: true, composed: true,
          detail: { entityId: this._config.camera_entity },
        }));
      });
    }
  }

  refreshCamera() {
    const stream = this.shadowRoot.getElementById('kids-camera-stream');
    if (stream && this._hass && this._config.camera_entity) {
      stream.hass = this._hass;
      stream.stateObj = this._hass.states[this._config.camera_entity] || null;
    }
  }

  startCameraRefresh() {
    this.stopCameraRefresh();
    if (this._config && this._config.camera_entity) {
      this._cameraRefreshInterval = setInterval(() => this.refreshCamera(), 30000);
    }
  }

  stopCameraRefresh() {
    if (this._cameraRefreshInterval) {
      clearInterval(this._cameraRefreshInterval);
      this._cameraRefreshInterval = null;
    }
  }

  _getCETDateTime() {
    // CET = UTC+1, CEST = UTC+2 — use Intl to handle DST automatically
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const get = t => parts.find(p => p.type === t)?.value ?? '00';
    return {
      date: `${get('day')} ${get('month')} ${get('year')}`,
      time: `${get('hour')}:${get('minute')}:${get('second')}`,
    };
  }

  _startClock() {
    this._stopClock();
    const tick = () => {
      const dt = this._getCETDateTime();
      const dateEl = this.shadowRoot.getElementById('header-date');
      const timeEl = this.shadowRoot.getElementById('header-time');
      if (dateEl) dateEl.textContent = dt.date;
      if (timeEl) timeEl.textContent = dt.time;
    };
    tick();
    this._clockInterval = setInterval(tick, 1000);
  }

  _stopClock() {
    if (this._clockInterval) { clearInterval(this._clockInterval); this._clockInterval = null; }
  }

  connectedCallback() {
    if (this._config && this._hass) {
      this.startCameraRefresh();
      this._setupCameraStream();
    }
    this._startClock();
  }

  disconnectedCallback() {
    this.stopCameraRefresh();
    this._stopClock();
  }

  // ── updateStates: patches DOM without touching innerHTML ───────────────────
  _updateStates() {
    if (!this._hass || !this._config || !this.shadowRoot.querySelector('.card')) return;
    const root = this.shadowRoot;
    const cfg = this._config;

    // ── Temperature ──────────────────────────────────────────────────────────
    const tempRaw = this._getValue(cfg.temp_entity);
    const tempNum = parseFloat(tempRaw);
    const tempStr = isNaN(tempNum) ? '--' : tempNum.toFixed(1);
    const tempUnit = this._getState(cfg.temp_entity)?.attributes?.unit_of_measurement || '°C';
    const tempMin = parseFloat(cfg.temp_min ?? 0);
    const tempMax = parseFloat(cfg.temp_max ?? 50);
    const tempColor = isNaN(tempNum) ? '#2391FF' : this._severityColor(tempNum);
    const tempOffset = isNaN(tempNum) ? 125.6 : this._arcDashOffset(tempNum, tempMin, tempMax);

    const tempArc = root.getElementById('temp-arc');
    if (tempArc) {
      tempArc.setAttribute('stroke', tempColor);
      tempArc.setAttribute('stroke-dashoffset', tempOffset);
      tempArc.style.filter = `drop-shadow(0 0 4px ${tempColor})`;
    }
    // Gauge center — small text inside circle
    const tgv = root.getElementById('temp-gauge-val');
    if (tgv) tgv.textContent = tempStr;
    const tgu = root.getElementById('temp-gauge-unit');
    if (tgu) tgu.textContent = tempUnit;

    // Big value beside gauge
    const tvn = root.getElementById('temp-val-num');
    if (tvn) { tvn.textContent = tempStr; tvn.style.color = tempColor; }
    const tvu = root.getElementById('temp-val-unit');
    if (tvu) { tvu.textContent = tempUnit; tvu.style.color = tempColor; }

    // ── Humidity ─────────────────────────────────────────────────────────────
    const humRaw = this._getValue(cfg.humidity_entity);
    const humNum = parseFloat(humRaw);
    const humStr = isNaN(humNum) ? '--' : humNum.toFixed(0);
    const humMin = parseFloat(cfg.hum_min ?? 0);
    const humMax = parseFloat(cfg.hum_max ?? 100);
    const humOffset = isNaN(humNum) ? 125.6 : this._arcDashOffset(humNum, humMin, humMax);

    const humArc = root.getElementById('hum-arc');
    if (humArc) humArc.setAttribute('stroke-dashoffset', humOffset);
    const hgv = root.getElementById('hum-gauge-val');
    if (hgv) hgv.textContent = humStr;
    const hvn = root.getElementById('hum-val-num');
    if (hvn) hvn.textContent = humStr;

    // ── Windows ───────────────────────────────────────────────────────────────
    const setWindow = (iconId, timeId, stateId, entityId) => {
      const open = this._getValue(entityId) === 'on';
      const ic = root.getElementById(iconId);
      const ti = root.getElementById(timeId);
      const st = root.getElementById(stateId);
      if (ic) ic.className = `sensor-icon ${open ? 'amber' : 'blue'}`;
      if (ti) ti.textContent = this._relativeTime(entityId);
      if (st) { st.textContent = open ? 'Open' : 'Closed'; st.className = `sensor-state ${open ? 'open' : 'closed'}`; }
    };
    setWindow('wl-icon', 'wl-time', 'wl-state', cfg.window_left_entity);
    setWindow('wr-icon', 'wr-time', 'wr-state', cfg.window_right_entity);

    // ── Motion ────────────────────────────────────────────────────────────────
    const motionOn = this._isOn(cfg.motion_entity);
    const mr = root.getElementById('motion-row');
    const mi = root.getElementById('motion-icon');
    const ms = root.getElementById('motion-state');
    const mt = root.getElementById('motion-time');
    if (mr) mr.className = `sensor-row${motionOn ? ' motion-active' : ''}`;
    if (mi) mi.className = `sensor-icon ${motionOn ? 'red' : 'green'}`;
    if (ms) { ms.textContent = motionOn ? 'Detected' : 'Clear'; ms.className = `sensor-state ${motionOn ? 'detected' : 'clear'}`; }
    if (mt) mt.textContent = this._relativeTime(cfg.motion_entity);

    // ── Lights ────────────────────────────────────────────────────────────────
    [1, 2].forEach(n => {
      const on = this._isOn(cfg[`light_${n}_entity`]);
      const btn = root.getElementById(`light${n}`);
      const st = root.getElementById(`light${n}-status`);
      if (btn) btn.className = `light-btn${on ? ' on' : ''}`;
      if (st) st.textContent = on ? 'ON' : 'OFF';
    });
  }

  // ── Section builders ───────────────────────────────────────────────────────
  // Each section returns { kind, html }. Consecutive sections of the same
  // "tile"/"list" kind are wrapped together so temp+humidity sit side-by-side
  // and windows+motion share one panel, matching the original layout — while
  // still honouring any custom order from section_order.
  _sectionParts() {
    const c = this._config;
    return {
      temperature: { kind: 'tile', html: `
        <div class="sensor-tile" data-entity="${c.temp_entity || ''}">
          <div class="gauge-wrap">
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="3.5"/>
              <circle id="temp-arc" cx="26" cy="26" r="20" fill="none"
                stroke="#2391FF" stroke-width="3.5" stroke-linecap="round"
                stroke-dasharray="125.6" stroke-dashoffset="62.8"/>
            </svg>
            <div class="gauge-center">
              <div class="gauge-val-sm" id="temp-gauge-val">--</div>
              <div class="gauge-unit-sm" id="temp-gauge-unit">°C</div>
            </div>
          </div>
          <div class="sensor-info">
            <div class="sensor-value">
              <span id="temp-val-num" style="color:#2391FF">--</span><span class="sensor-unit" id="temp-val-unit" style="color:#2391FF">°C</span>
            </div>
            <div class="sensor-label">${c.temp_icon ? this._iconHtml(c.temp_icon, '', '11px') + ' ' : ''}${c.temp_name || 'Temperature'}</div>
          </div>
        </div>` },

      humidity: { kind: 'tile', html: `
        <div class="sensor-tile" data-entity="${c.humidity_entity || ''}">
          <div class="gauge-wrap">
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="3.5"/>
              <circle id="hum-arc" cx="26" cy="26" r="20" fill="none"
                stroke="#60a5fa" stroke-width="3.5" stroke-linecap="round"
                stroke-dasharray="125.6" stroke-dashoffset="62.8"
                style="filter:drop-shadow(0 0 4px #60a5fa)"/>
            </svg>
            <div class="gauge-center">
              <div class="gauge-val-sm" id="hum-gauge-val">--</div>
              <div class="gauge-unit-sm">%</div>
            </div>
          </div>
          <div class="sensor-info">
            <div class="sensor-value" style="color:#60a5fa">
              <span id="hum-val-num">--</span><span class="sensor-unit">%</span>
            </div>
            <div class="sensor-label">${c.humidity_icon ? this._iconHtml(c.humidity_icon, '', '11px') + ' ' : ''}${c.humidity_name || 'Humidity'}</div>
          </div>
        </div>` },

      camera: { kind: 'camera', html: `
        <div class="camera-section" id="camera-section" style="display:none">
          <div class="camera-wrapper" id="camera-wrapper">
            <ha-camera-stream
              id="kids-camera-stream"
              allow-exoplayer
              muted
              playsinline
            ></ha-camera-stream>
            <div class="camera-overlay">
              <div class="camera-label">${c.camera_icon ? this._iconHtml(c.camera_icon, '', '11px') + ' ' : ''}${c.camera_name || c.title}</div>
              <div class="camera-right-badges">
                <div class="camera-live-badge">● Live</div>
                <div class="camera-fullscreen-btn" id="camera-fullscreen-btn" title="Open fullscreen">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>` },

      windows: { kind: 'list', html: `
        <div class="sensor-row" id="wl-row" data-entity="${c.window_left_entity || ''}">
          <div class="sensor-icon blue" id="wl-icon">${this._iconHtml(c.window_left_icon, '⊞', '18px')}</div>
          <div class="sensor-text">
            <div class="sensor-name">${c.window_left_name || 'Window Left'}</div>
            <div class="sensor-time" id="wl-time"></div>
          </div>
          <div class="sensor-state closed" id="wl-state">Closed</div>
        </div>
        <div class="sensor-row" id="wr-row" data-entity="${c.window_right_entity || ''}">
          <div class="sensor-icon blue" id="wr-icon">${this._iconHtml(c.window_right_icon, '⊞', '18px')}</div>
          <div class="sensor-text">
            <div class="sensor-name">${c.window_right_name || 'Window Right'}</div>
            <div class="sensor-time" id="wr-time"></div>
          </div>
          <div class="sensor-state closed" id="wr-state">Closed</div>
        </div>` },

      motion: { kind: 'list', html: `
        <div class="sensor-row" id="motion-row" data-entity="${c.motion_entity || ''}">
          <div class="sensor-icon green" id="motion-icon">${this._iconHtml(c.motion_icon, '🚶', '18px')}</div>
          <div class="sensor-text">
            <div class="sensor-name">${c.motion_name || 'Movement'}</div>
            <div class="sensor-time" id="motion-time"></div>
          </div>
          <div class="sensor-state clear" id="motion-state">Clear</div>
        </div>` },

      lights: { kind: 'lights', html: `
        <div class="light-btn" id="light2">
          <div class="light-icon">${this._iconHtml(c.light_2_icon, '🪔', '30px')}</div>
          <div class="light-text">
            <div class="light-name">${c.light_2_name}</div>
            <div class="light-status" id="light2-status">OFF</div>
          </div>
        </div>
        <div class="light-btn" id="light1">
          <div class="light-icon">${this._iconHtml(c.light_1_icon, '🪔', '30px')}</div>
          <div class="light-text">
            <div class="light-name">${c.light_1_name}</div>
            <div class="light-status" id="light1-status">OFF</div>
          </div>
        </div>` },
    };
  }

  _buildSections() {
    const parts = this._sectionParts();
    const groups = [];
    krcOrderedKeys(this._config).forEach(key => {
      const d = parts[key];
      if (!d) return;
      const last = groups[groups.length - 1];
      if (last && last.kind === d.kind && (d.kind === 'tile' || d.kind === 'list')) {
        last.items.push(d.html);
      } else {
        groups.push({ kind: d.kind, items: [d.html] });
      }
    });
    return groups.map((g, i) => {
      const sep = i > 0 ? '<div class="glow-line"></div>' : '';
      const inner = g.items.join('');
      if (g.kind === 'tile')   return `${sep}<div class="sensors-row">${inner}</div>`;
      if (g.kind === 'list')   return `${sep}<div class="sensors-list">${inner}</div>`;
      if (g.kind === 'lights') return `${sep}<div class="lights-row">${inner}</div>`;
      return `${sep}${inner}`; // camera (already wrapped)
    }).join('');
  }

  // ── Full render — called ONLY from setConfig ───────────────────────────────
  _render() {
    if (!this._config) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }

        .card {
          background: linear-gradient(145deg, #1a1f35 0%, #0f1628 50%, #141929 100%);
          border-radius: 13px;
          border: 1px solid rgba(99,179,237,0.15);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.6), 0 0 60px rgba(99,179,237,0.05);
          overflow: hidden; padding: 0; position: relative;
        }
        .card::before {
          content: ''; position: absolute; top: -60px; left: -60px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(99,179,237,0.08) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        /* Header */
        .header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px 10px; position: relative; z-index: 1;
        }
        .title { font-size: 18px; font-weight: 700; color: #fff; letter-spacing: 1.5px; text-transform: uppercase; }
        .header-datetime {
          display: flex; flex-direction: column; align-items: flex-end; gap: 1px;
        }
        .header-date {
          font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.75);
          letter-spacing: 0.5px; font-family: 'Segoe UI', monospace;
        }
        .header-time {
          font-size: 11px; font-weight: 400; color: rgba(255,255,255,0.4);
          letter-spacing: 1px; font-family: 'Segoe UI', monospace;
        }
        .status-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #34d399; box-shadow: 0 0 8px rgba(52,211,153,0.8);
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%,100% { opacity:1; box-shadow:0 0 8px rgba(52,211,153,0.8); }
          50% { opacity:0.6; box-shadow:0 0 14px rgba(52,211,153,0.4); }
        }

        /* Sensor tiles */
        .sensors-row { display: flex; gap: 12px; padding: 0 16px 12px; position: relative; z-index: 1; }
        .sensor-tile {
          flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 12px; display: flex; align-items: center; gap: 10px;
          min-width: 0; cursor: pointer;
        }
        .gauge-wrap { position: relative; width: 52px; height: 52px; flex-shrink: 0; }
        .gauge-wrap svg { transform: rotate(-90deg); }
        .gauge-center {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
          display: flex; flex-direction: column; align-items: center; pointer-events: none;
        }
        .gauge-val-sm { font-size: 10px; font-weight: 700; color: #fff; line-height: 1; }
        .gauge-unit-sm { font-size: 6px; color: rgba(255,255,255,0.5); }
        .sensor-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .sensor-value {
          font-size: 20px; font-weight: 700; line-height: 1.1;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sensor-unit { font-size: 12px; font-weight: 400; }
        .sensor-label { font-size: 9px; letter-spacing: 1.5px; color: rgba(255,255,255,0.35); text-transform: uppercase; margin-top: 2px; }

        /* Camera */
        .camera-section { margin: 0 16px 12px; position: relative; z-index: 1; overflow: hidden; }
        .camera-wrapper {
          border-radius: 14px; overflow: hidden; position: relative;
          border: 1px solid rgba(255,255,255,0.08); background: #0a0e1a; cursor: pointer;
        }
        ha-camera-stream { width: 100%; display: block; max-height: 300px; object-fit: cover; --video-border-radius: 0; }
        .camera-overlay {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.6));
          padding: 8px 12px; display: flex; justify-content: space-between; align-items: flex-end;
        }
        .camera-label { font-size: 10px; letter-spacing: 1px; color: rgba(255,255,255,0.5); text-transform: uppercase; }
        .camera-right-badges { display: flex; align-items: center; gap: 6px; }
        .camera-live-badge {
          font-size: 9px; letter-spacing: 1px; color: #f87171;
          border: 1px solid rgba(248,113,113,0.4); padding: 2px 6px; border-radius: 4px;
          text-transform: uppercase; font-weight: 600;
        }
        .camera-fullscreen-btn {
          width: 26px; height: 26px; border-radius: 6px;
          background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: rgba(255,255,255,0.75); transition: background 0.2s; flex-shrink: 0;
        }
        .camera-fullscreen-btn:hover { background: rgba(99,179,237,0.25); color: #fff; }
        .camera-fullscreen-btn:active { transform: scale(0.92); }

        /* Glow line */
        .glow-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,179,237,0.3), rgba(168,85,247,0.3), transparent);
          margin: 0 16px;
        }

        /* Sensors list */
        .sensors-list {
          margin: 12px 16px 12px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07); border-radius: 14px;
          overflow: hidden; position: relative; z-index: 1;
        }
        .sensor-row { display: flex; align-items: center; padding: 11px 14px; gap: 10px; cursor: pointer; }
        .sensor-row:not(:last-child) { border-bottom: 1px solid rgba(255,255,255,0.05); }
        .sensor-icon {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; flex-shrink: 0;
        }
        .sensor-icon.green { background: rgba(52,211,153,0.12); box-shadow: 0 0 10px rgba(52,211,153,0.1); }
        .sensor-icon.red { background: rgba(248,113,113,0.12); box-shadow: 0 0 10px rgba(248,113,113,0.1); }
        .sensor-icon.amber { background: rgba(251,191,36,0.12); box-shadow: 0 0 10px rgba(251,191,36,0.1); }
        .sensor-icon.blue { background: rgba(99,179,237,0.1); }
        .sensor-icon ha-icon { display: flex; }
        .sensor-icon.green ha-icon { color: #34d399; }
        .sensor-icon.red ha-icon { color: #f87171; }
        .sensor-icon.amber ha-icon { color: #fbbf24; }
        .sensor-icon.blue ha-icon { color: #63b3ed; }
        .sensor-label ha-icon { --mdc-icon-size: 11px; vertical-align: -1px; }
        .camera-label ha-icon { --mdc-icon-size: 11px; vertical-align: -1px; }
        .sensor-text { flex: 1; display: flex; flex-direction: column; gap: 1px; }
        .sensor-name { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.85); }
        .sensor-time { font-size: 10px; color: rgba(255,255,255,0.3); }
        .sensor-state { font-size: 13px; font-weight: 600; }
        .sensor-state.open { color: #fbbf24; }
        .sensor-state.closed { color: rgba(255,255,255,0.4); }
        .sensor-state.detected { color: #f87171; animation: motion-pulse 1.5s ease-in-out infinite; }
        .sensor-state.clear { color: #34d399; }
        @keyframes motion-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .motion-active .sensor-icon { animation: icon-pulse 1.5s ease-in-out infinite; }
        @keyframes icon-pulse {
          0%,100% { box-shadow:0 0 10px rgba(248,113,113,0.1); }
          50% { box-shadow:0 0 18px rgba(248,113,113,0.4); }
        }

        /* Lights */
        .lights-row { display: flex; gap: 10px; padding: 0 16px 16px; position: relative; z-index: 1; }
        .light-btn {
          flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 10px 12px; cursor: pointer;
          display: flex; flex-direction: row; align-items: center; gap: 10px;
          transition: all 0.25s ease; user-select: none; min-width: 0;
        }
        .light-btn.on { background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.35); box-shadow: 0 0 16px rgba(251,191,36,0.1); }
        .light-btn:hover { transform: translateY(-1px); }
        .light-btn:active { transform: scale(0.97); }
        .light-icon { font-size: 30px; flex-shrink: 0; transition: filter 0.3s; line-height: 1; display: flex; align-items: center; }
        .light-icon ha-icon { color: rgba(255,255,255,0.55); }
        .light-btn.on .light-icon { filter: drop-shadow(0 0 6px rgba(251,191,36,0.7)); }
        .light-btn.on .light-icon ha-icon { color: #fbbf24; }
        .light-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .light-name { font-size: 11px; letter-spacing: 1px; color: rgba(255,255,255,0.5); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .light-btn.on .light-name { color: rgba(251,191,36,0.9); }
        .light-status { font-size: 10px; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.5px; }
        .light-btn.on .light-status { color: rgba(251,191,36,0.5); }

        /* ── Frosted Glass (activated by .frosted on .card) ── */
        .card.frosted {
          background: var(--krc-fg-bg, rgba(8,14,30,0.52)) !important;
          backdrop-filter: blur(var(--krc-fg-blur, 22px)) saturate(180%) !important;
          -webkit-backdrop-filter: blur(var(--krc-fg-blur, 22px)) saturate(180%) !important;
          border: 1px solid rgba(255,255,255,0.09) !important;
          box-shadow: 0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07) !important;
        }
        .card.frosted::before { display: none !important; }
        /* Sensor tiles (temp / humidity) */
        .card.frosted .sensor-tile {
          background: rgba(255,255,255,0.05) !important;
          backdrop-filter: blur(var(--krc-fg-blur, 22px)) !important;
          -webkit-backdrop-filter: blur(var(--krc-fg-blur, 22px)) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        /* Sensors list */
        .card.frosted .sensors-list {
          background: rgba(255,255,255,0.04) !important;
          backdrop-filter: blur(var(--krc-fg-blur, 22px)) !important;
          -webkit-backdrop-filter: blur(var(--krc-fg-blur, 22px)) !important;
          border-color: rgba(255,255,255,0.09) !important;
        }
        /* Light buttons */
        .card.frosted .light-btn {
          background: rgba(255,255,255,0.05) !important;
          backdrop-filter: blur(var(--krc-fg-blur, 22px)) !important;
          -webkit-backdrop-filter: blur(var(--krc-fg-blur, 22px)) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .card.frosted .light-btn.on {
          background: rgba(251,191,36,0.1) !important;
          border-color: rgba(251,191,36,0.28) !important;
        }
        /* Camera wrapper */
        .card.frosted .camera-wrapper {
          background: rgba(5,10,22,0.55) !important;
          backdrop-filter: blur(var(--krc-fg-blur, 22px)) !important;
          -webkit-backdrop-filter: blur(var(--krc-fg-blur, 22px)) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }

        /* ── Just HA Dashboard design adoption ──────────────────────────────
           Gated on --user-* tokens (defined only by the Just HA theme, e.g. on
           the Heimdall dashboard). Falls back to the card's original look on
           every other dashboard/theme. */
        .card-jha {
          background: var(--user-glow-amber, radial-gradient(120% 130% at 50% -10%, rgba(224,162,78,.30) 0%, rgba(160,104,43,.10) 38%, rgba(20,20,23,0) 72%)), var(--user-ink-750, #141417) !important;
          border: 1px solid var(--user-line, rgba(255,255,255,.09)) !important;
          border-radius: var(--user-radius-lg, 20px) !important;
        }
      </style>

      <ha-card>
        <div class="card${this._config.frosted_glass ? ' frosted' : ''}${this._config.jha ? ' card-jha' : ''}">

          <!-- Header -->
          <div class="header">
            <div class="title">${this._config.title}</div>
            <div class="header-datetime">
              <div class="header-date" id="header-date">--.--.----</div>
              <div class="header-time" id="header-time">--:--:--</div>
            </div>
            <div class="status-dot"></div>
          </div>

          ${this._buildSections()}

        </div>
      </ha-card>
    `;

    // Event listeners — bound once per render
    // Lights: short tap = toggle, long press (500ms) = more-info
    [1, 2].forEach(n => {
      const btn = this.shadowRoot.getElementById('light' + n);
      if (!btn) return;
      let pressTimer = null;
      btn.addEventListener('pointerdown', () => {
        pressTimer = setTimeout(() => {
          pressTimer = null;
          this._moreInfo(this._config['light_' + n + '_entity']);
        }, 500);
      });
      btn.addEventListener('pointerup', () => {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; this._toggle(this._config['light_' + n + '_entity']); }
      });
      btn.addEventListener('pointerleave', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });
    });

    // Sensor tiles & rows: tap = more-info. Bound off each element's own
    // data-entity so reordering sections can't desync the click targets.
    this.shadowRoot.querySelectorAll('.sensor-tile[data-entity], .sensor-row[data-entity]').forEach(el => {
      const entityId = el.dataset.entity;
      if (entityId) el.addEventListener('click', () => this._moreInfo(entityId));
    });

    // Camera fullscreen button
    this.shadowRoot.getElementById('camera-fullscreen-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._moreInfo(this._config.camera_entity);
    });

    // Initial patch + camera setup after render
    this._updateStates();
    this._setupCameraStream();
    this.startCameraRefresh();
    this._startClock();
    this._applyFrostedVars();
  }

  _applyFrostedVars() {
    const cfg = this._config;
    this.style.removeProperty('--krc-fg-bg');
    this.style.removeProperty('--krc-fg-blur');
    if (cfg && cfg.frosted_glass) {
      const opacity = Math.min(0.9, Math.max(0.1, parseFloat(cfg.frosted_opacity) || 0.52));
      const blur    = Math.min(40,  Math.max(4,   parseFloat(cfg.frosted_blur)    || 22));
      this.style.setProperty('--krc-fg-bg',  'rgba(8,14,30,' + opacity + ')');
      this.style.setProperty('--krc-fg-blur', blur + 'px');
    }
  }
}

customElements.define('kids-room-card', KidsRoomCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'kids-room-card',
  name: 'Kids Room Card',
  description: 'Custom card for a kids bedroom — temp, humidity, camera, windows, motion and lights.',
  preview: true,
  documentationURL: 'https://github.com/robman2026/Kids-Room-Dashboard-Card',
});

console.info(
  '%c KIDS-ROOM-CARD %c v1.7.0 ',
  'color: white; background: #6366f1; font-weight: bold; padding: 2px 4px; border-radius: 3px 0 0 3px;',
  'color: #6366f1; background: #1e293b; font-weight: bold; padding: 2px 4px; border-radius: 0 3px 3px 0;'
);
