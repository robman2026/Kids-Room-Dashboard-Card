/**
 * kids-room-card
 * A custom Home Assistant card for a kids bedroom dashboard.
 * Repository: https://github.com/robman2026/Kids-Room-Dashboard-Card
 * Version: 1.4.1
 */

// ── Visual Editor ─────────────────────────────────────────────────────────────
class KidsRoomCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
  }

  set hass(hass) {
    this._hass = hass;
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  _entities(domain) {
    if (!this._hass) return [];
    return Object.keys(this._hass.states)
      .filter(e => domain ? e.startsWith(domain + '.') : true)
      .sort();
  }

  _changed(key, value) {
    this._config = { ...this._config, [key]: value === '' ? undefined : value };
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config } }));
  }

  _entitySelect(key, label, domain) {
    const val = this._config[key] || '';
    // domain can be 'light,switch' — support multiple comma-separated domains
    const domains = domain ? domain.split(',') : [];
    const options = this._entities(null)
      .filter(e => domains.length === 0 || domains.some(d => e.startsWith(d + '.')))
      .map(e => `<option value="${e}" ${e === val ? 'selected' : ''}>${e}</option>`)
      .join('');
    return `
      <div class="field">
        <label>${label}</label>
        <select data-key="${key}">
          <option value="">— not set —</option>
          ${options}
        </select>
      </div>`;
  }

  _textField(key, label, placeholder = '') {
    const val = this._config[key] !== undefined ? this._config[key] : '';
    return `
      <div class="field">
        <label>${label}</label>
        <input type="text" data-key="${key}" value="${val}" placeholder="${placeholder}" />
      </div>`;
  }

  _numberField(key, label, min, max, placeholder = '') {
    const val = this._config[key] !== undefined ? this._config[key] : '';
    return `
      <div class="field">
        <label>${label}</label>
        <input type="number" data-key="${key}" value="${val}" min="${min}" max="${max}" placeholder="${placeholder}" />
      </div>`;
  }

  _section(title) {
    return `<div class="section-title">${title}</div>`;
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
        .field { display: flex; flex-direction: column; gap: 4px; }
        label { font-size: 12px; color: var(--secondary-text-color, #727272); font-weight: 500; }
        select, input {
          padding: 8px 10px; border-radius: 6px;
          border: 1px solid var(--divider-color, rgba(0,0,0,0.2));
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
          font-size: 13px; width: 100%; box-sizing: border-box;
        }
        select { cursor: pointer; }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      </style>
      <div class="editor">

        ${this._section('General')}
        ${this._textField('title', 'Card Title', 'KIDS BEDROOM')}

        ${this._section('Temperature')}
        ${this._entitySelect('temp_entity', 'Temperature Sensor', 'sensor')}
        <div class="row2">
          ${this._numberField('temp_min', 'Min °C', -30, 100, '0')}
          ${this._numberField('temp_max', 'Max °C', -30, 100, '50')}
        </div>

        ${this._section('Humidity')}
        ${this._entitySelect('humidity_entity', 'Humidity Sensor', 'sensor')}
        <div class="row2">
          ${this._numberField('hum_min', 'Min %', 0, 100, '0')}
          ${this._numberField('hum_max', 'Max %', 0, 100, '100')}
        </div>

        ${this._section('Camera')}
        ${this._entitySelect('camera_entity', 'Camera Entity', 'camera')}

        ${this._section('Windows')}
        ${this._entitySelect('window_left_entity', 'Window Left Sensor', 'binary_sensor')}
        ${this._entitySelect('window_right_entity', 'Window Right Sensor', 'binary_sensor')}

        ${this._section('Motion')}
        ${this._entitySelect('motion_entity', 'Motion Sensor', 'binary_sensor')}

        ${this._section('Light — Kid 1')}
        ${this._entitySelect('light_1_entity', 'Light / Switch Entity', 'light,switch')}
        ${this._textField('light_1_name', 'Display Name', 'Kid 1')}

        ${this._section('Light — Kid 2')}
        ${this._entitySelect('light_2_entity', 'Light / Switch Entity', 'light,switch')}
        ${this._textField('light_2_name', 'Display Name', 'Kid 2')}

      </div>
    `;

    this.shadowRoot.querySelectorAll('select').forEach(el => {
      el.addEventListener('change', e => this._changed(e.target.dataset.key, e.target.value));
    });
    this.shadowRoot.querySelectorAll('input').forEach(el => {
      el.addEventListener('change', e => {
        const v = e.target.type === 'number' ? (e.target.value === '' ? undefined : parseFloat(e.target.value)) : e.target.value;
        this._changed(e.target.dataset.key, v);
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
      temp_entity: 'sensor.kids_temp',
      humidity_entity: 'sensor.kids_humidity',
      temp_min: 0,
      temp_max: 50,
      hum_min: 0,
      hum_max: 100,
      motion_entity: 'binary_sensor.kids_motion',
      window_left_entity: 'binary_sensor.kids_window_left',
      window_right_entity: 'binary_sensor.kids_window_right',
      light_1_entity: 'light.kids_lamp_1',
      light_1_name: 'Kid 1',
      light_2_entity: 'light.kids_lamp_2',
      light_2_name: 'Kid 2',
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
        .light-icon { font-size: 30px; flex-shrink: 0; transition: filter 0.3s; line-height: 1; }
        .light-btn.on .light-icon { filter: drop-shadow(0 0 6px rgba(251,191,36,0.7)); }
        .light-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .light-name { font-size: 11px; letter-spacing: 1px; color: rgba(255,255,255,0.5); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .light-btn.on .light-name { color: rgba(251,191,36,0.9); }
        .light-status { font-size: 10px; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.5px; }
        .light-btn.on .light-status { color: rgba(251,191,36,0.5); }
      </style>

      <ha-card>
        <div class="card">

          <!-- Header -->
          <div class="header">
            <div class="title">${this._config.title}</div>
            <div class="header-datetime">
              <div class="header-date" id="header-date">--.--.----</div>
              <div class="header-time" id="header-time">--:--:--</div>
            </div>
            <div class="status-dot"></div>
          </div>

          <!-- Temp + Humidity -->
          <div class="sensors-row">

            <!-- Temperature -->
            <div class="sensor-tile">
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
                <div class="sensor-label">Temperature</div>
              </div>
            </div>

            <!-- Humidity -->
            <div class="sensor-tile">
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
                <div class="sensor-label">Humidity</div>
              </div>
            </div>

          </div>

          <!-- Camera — exact garage card pattern -->
          <div class="camera-section" id="camera-section" style="display:none">
            <div class="camera-wrapper" id="camera-wrapper">
              <ha-camera-stream
                id="kids-camera-stream"
                allow-exoplayer
                muted
                playsinline
              ></ha-camera-stream>
              <div class="camera-overlay">
                <div class="camera-label">${this._config.title}</div>
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
          </div>

          <div class="glow-line"></div>

          <!-- Sensors list -->
          <div class="sensors-list">
            <div class="sensor-row" id="wl-row">
              <div class="sensor-icon blue" id="wl-icon">⊞</div>
              <div class="sensor-text">
                <div class="sensor-name">Window Left</div>
                <div class="sensor-time" id="wl-time"></div>
              </div>
              <div class="sensor-state closed" id="wl-state">Closed</div>
            </div>
            <div class="sensor-row" id="wr-row">
              <div class="sensor-icon blue" id="wr-icon">⊞</div>
              <div class="sensor-text">
                <div class="sensor-name">Window Right</div>
                <div class="sensor-time" id="wr-time"></div>
              </div>
              <div class="sensor-state closed" id="wr-state">Closed</div>
            </div>
            <div class="sensor-row" id="motion-row">
              <div class="sensor-icon green" id="motion-icon">🚶</div>
              <div class="sensor-text">
                <div class="sensor-name">Movement</div>
                <div class="sensor-time" id="motion-time"></div>
              </div>
              <div class="sensor-state clear" id="motion-state">Clear</div>
            </div>
          </div>

          <!-- Lights -->
          <div class="lights-row">
            <div class="light-btn" id="light2">
              <div class="light-icon">🪔</div>
              <div class="light-text">
                <div class="light-name">${this._config.light_2_name}</div>
                <div class="light-status" id="light2-status">OFF</div>
              </div>
            </div>
            <div class="light-btn" id="light1">
              <div class="light-icon">🪔</div>
              <div class="light-text">
                <div class="light-name">${this._config.light_1_name}</div>
                <div class="light-status" id="light1-status">OFF</div>
              </div>
            </div>
          </div>

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

    // Sensor rows: tap = more-info
    const sensorBindings = [
      ['wl-row',     () => this._moreInfo(this._config.window_left_entity)],
      ['wr-row',     () => this._moreInfo(this._config.window_right_entity)],
      ['motion-row', () => this._moreInfo(this._config.motion_entity)],
    ];
    sensorBindings.forEach(([id, fn]) => this.shadowRoot.getElementById(id)?.addEventListener('click', fn));

    // Sensor tiles: tap = more-info
    const tileDivs = this.shadowRoot.querySelectorAll('.sensor-tile');
    const tileEntities = [this._config.temp_entity, this._config.humidity_entity];
    tileDivs.forEach((tile, i) => {
      if (tileEntities[i]) tile.addEventListener('click', () => this._moreInfo(tileEntities[i]));
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
  '%c KIDS-ROOM-CARD %c v1.4.1 ',
  'color: white; background: #6366f1; font-weight: bold; padding: 2px 4px; border-radius: 3px 0 0 3px;',
  'color: #6366f1; background: #1e293b; font-weight: bold; padding: 2px 4px; border-radius: 0 3px 3px 0;'
);
