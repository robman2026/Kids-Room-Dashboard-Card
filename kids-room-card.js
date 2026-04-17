/**
 * kids-room-card
 * A custom Home Assistant card for a kids bedroom dashboard.
 * Repository: https://github.com/robman2026/Kids-Room-Dashboard-Card
 * Version: 1.1.0
 */

class KidsRoomCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._cameraRefreshInterval = null;
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
      light_1_name: 'Kid 1',
      light_2_name: 'Kid 2',
      ...config,
    };
    // Full render only on config change
    this._render();
  }

  // ── hass setter: NEVER re-renders DOM — only updates values ──────────────
  set hass(hass) {
    this._hass = hass;
    this._updateStates();
    this._setupCameraStream();
  }

  getCardSize() { return 7; }

  // ── Helpers ───────────────────────────────────────────────────────────────
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

  _relativeTime(entityId) {
    const s = this._getState(entityId);
    if (!s) return '';
    const diff = Math.floor((Date.now() - new Date(s.last_changed)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  _tempColor(t) {
    const v = parseFloat(t);
    if (isNaN(v)) return '#60a5fa';
    if (v < 16) return '#60a5fa';
    if (v < 20) return '#34d399';
    if (v < 24) return '#a78bfa';
    if (v < 28) return '#fb923c';
    return '#f87171';
  }

  _tempDashOffset(temp) {
    const t = parseFloat(temp);
    if (isNaN(t)) return 125.6;
    return 125.6 - Math.min(Math.max(t / 40, 0), 1) * 125.6;
  }

  // ── Camera (exact same pattern as working garage card) ───────────────────
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

    // Attach wrapper click → more-info (only once per element lifetime)
    const wrapper = this.shadowRoot.getElementById('camera-wrap');
    if (wrapper && !wrapper._listenerAttached) {
      wrapper._listenerAttached = true;
      wrapper.addEventListener('click', (e) => {
        if (e.target !== wrapper && e.target.closest && e.target.closest('ha-camera-stream')) return;
        this.dispatchEvent(new CustomEvent('hass-more-info', {
          bubbles: true,
          composed: true,
          detail: { entityId: this._config.camera_entity },
        }));
      });
    }
  }

  _refreshCamera() {
    const stream = this.shadowRoot.getElementById('kids-camera-stream');
    if (stream && this._hass && this._config.camera_entity) {
      stream.hass = this._hass;
      stream.stateObj = this._hass.states[this._config.camera_entity] || null;
    }
  }

  startCameraRefresh() {
    this.stopCameraRefresh();
    if (this._config && this._config.camera_entity) {
      this._cameraRefreshInterval = setInterval(() => this._refreshCamera(), 30000);
    }
  }

  stopCameraRefresh() {
    if (this._cameraRefreshInterval) {
      clearInterval(this._cameraRefreshInterval);
      this._cameraRefreshInterval = null;
    }
  }

  connectedCallback() {
    if (this._config && this._hass) {
      this.startCameraRefresh();
      this._setupCameraStream();
    }
  }

  disconnectedCallback() {
    this.stopCameraRefresh();
  }

  // ── updateStates: patches DOM values WITHOUT touching innerHTML ───────────
  _updateStates() {
    if (!this._hass || !this._config || !this.shadowRoot.querySelector('.card')) return;
    const root = this.shadowRoot;

    // Temperature
    const tempRaw = this._getValue(this._config.temp_entity);
    const temp = tempRaw === 'N/A' ? '--' : parseFloat(tempRaw).toFixed(1);
    const tempUnit = this._getState(this._config.temp_entity)?.attributes?.unit_of_measurement || '°C';
    const tempColor = this._tempColor(temp);

    const tempValEl = root.getElementById('temp-val');
    if (tempValEl) { tempValEl.textContent = temp; tempValEl.style.color = tempColor; }
    const tempUnitEl = root.getElementById('temp-unit');
    if (tempUnitEl) tempUnitEl.textContent = tempUnit;
    const tempValBig = root.getElementById('temp-val-big');
    if (tempValBig) { tempValBig.style.color = tempColor; }
    const tempUnitBig = root.getElementById('temp-unit-big');
    if (tempUnitBig) tempUnitBig.textContent = tempUnit;

    const tempArc = root.getElementById('temp-arc');
    if (tempArc) {
      tempArc.setAttribute('stroke', tempColor);
      tempArc.setAttribute('stroke-dashoffset', this._tempDashOffset(temp));
      tempArc.style.filter = `drop-shadow(0 0 4px ${tempColor})`;
    }
    const tempGaugeVal = root.getElementById('temp-gauge-val');
    if (tempGaugeVal) tempGaugeVal.textContent = temp;
    const tempGaugeUnit = root.getElementById('temp-gauge-unit');
    if (tempGaugeUnit) tempGaugeUnit.textContent = tempUnit;

    // Humidity
    const humRaw = this._getValue(this._config.humidity_entity);
    const hum = humRaw === 'N/A' ? '--' : parseFloat(humRaw).toFixed(0);
    const humPercent = isNaN(parseFloat(hum)) ? 0 : Math.min(Math.max(parseFloat(hum), 0), 100);
    const humDash = (humPercent / 100) * 125.6;

    const humValEl = root.getElementById('hum-val');
    if (humValEl) humValEl.textContent = hum;
    const humArc = root.getElementById('hum-arc');
    if (humArc) humArc.setAttribute('stroke-dashoffset', 125.6 - humDash);
    const humGaugeVal = root.getElementById('hum-gauge-val');
    if (humGaugeVal) humGaugeVal.textContent = hum;

    // Windows
    const winLeftVal = this._getValue(this._config.window_left_entity);
    const winLeftOpen = winLeftVal === 'on';
    const wlState = root.getElementById('wl-state');
    const wlIcon = root.getElementById('wl-icon');
    const wlTime = root.getElementById('wl-time');
    if (wlState) { wlState.textContent = winLeftOpen ? 'Open' : 'Closed'; wlState.className = `sensor-state ${winLeftOpen ? 'open' : 'closed'}`; }
    if (wlIcon) wlIcon.className = `sensor-icon ${winLeftOpen ? 'amber' : 'blue'}`;
    if (wlTime) wlTime.textContent = this._relativeTime(this._config.window_left_entity);

    const winRightVal = this._getValue(this._config.window_right_entity);
    const winRightOpen = winRightVal === 'on';
    const wrState = root.getElementById('wr-state');
    const wrIcon = root.getElementById('wr-icon');
    const wrTime = root.getElementById('wr-time');
    if (wrState) { wrState.textContent = winRightOpen ? 'Open' : 'Closed'; wrState.className = `sensor-state ${winRightOpen ? 'open' : 'closed'}`; }
    if (wrIcon) wrIcon.className = `sensor-icon ${winRightOpen ? 'amber' : 'blue'}`;
    if (wrTime) wrTime.textContent = this._relativeTime(this._config.window_right_entity);

    // Motion
    const motionOn = this._isOn(this._config.motion_entity);
    const motionRow = root.getElementById('motion-row');
    const motionIcon = root.getElementById('motion-icon');
    const motionState = root.getElementById('motion-state');
    const motionTime = root.getElementById('motion-time');
    if (motionRow) motionRow.className = `sensor-row${motionOn ? ' motion-active' : ''}`;
    if (motionIcon) motionIcon.className = `sensor-icon ${motionOn ? 'red' : 'green'}`;
    if (motionState) { motionState.textContent = motionOn ? 'Detected' : 'Clear'; motionState.className = `sensor-state ${motionOn ? 'detected' : 'clear'}`; }
    if (motionTime) motionTime.textContent = this._relativeTime(this._config.motion_entity);

    // Lights
    const l1On = this._isOn(this._config.light_1_entity);
    const l2On = this._isOn(this._config.light_2_entity);
    const btn1 = root.getElementById('light1');
    const btn2 = root.getElementById('light2');
    const st1 = root.getElementById('light1-status');
    const st2 = root.getElementById('light2-status');
    if (btn1) btn1.className = `light-btn${l1On ? ' on' : ''}`;
    if (btn2) btn2.className = `light-btn${l2On ? ' on' : ''}`;
    if (st1) st1.textContent = l1On ? 'ON' : 'OFF';
    if (st2) st2.textContent = l2On ? 'ON' : 'OFF';
  }

  // ── Full render (only on setConfig) ──────────────────────────────────────
  _render() {
    if (!this._config) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }

        .card {
          background: linear-gradient(145deg, #1a1f35 0%, #0f1628 50%, #141929 100%);
          border-radius: 20px;
          border: 1px solid rgba(99,179,237,0.15);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.6), 0 0 60px rgba(99,179,237,0.05);
          overflow: hidden;
          padding: 0;
          position: relative;
        }
        .card::before {
          content: '';
          position: absolute;
          top: -60px; left: -60px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(99,179,237,0.08) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* Header */
        .header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px 10px; position: relative; z-index: 1;
        }
        .title {
          font-size: 18px; font-weight: 700; color: #ffffff;
          letter-spacing: 1.5px; text-transform: uppercase;
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
        .sensors-row {
          display: flex; gap: 12px; padding: 0 16px 12px;
          position: relative; z-index: 1;
        }
        .sensor-tile {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 14px 12px;
          display: flex; align-items: center; gap: 12px;
          backdrop-filter: blur(10px);
        }
        .gauge-wrap { position: relative; width: 52px; height: 52px; flex-shrink: 0; }
        .gauge-wrap svg { transform: rotate(-90deg); }
        .gauge-center {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          display: flex; flex-direction: column; align-items: center;
        }
        .gauge-val-sm { font-size: 11px; font-weight: 700; color: #fff; line-height: 1; }
        .gauge-unit-sm { font-size: 7px; color: rgba(255,255,255,0.5); }
        .sensor-info { display: flex; flex-direction: column; gap: 2px; }
        .sensor-value { font-size: 22px; font-weight: 700; line-height: 1; }
        .sensor-value span { font-size: 13px; font-weight: 400; color: rgba(255,255,255,0.6); }
        .sensor-label { font-size: 10px; letter-spacing: 1.5px; color: rgba(255,255,255,0.35); text-transform: uppercase; }

        /* Camera */
        .camera-section { display: none; margin: 0 16px 12px; position: relative; z-index: 1; }
        .camera-wrap {
          border-radius: 14px; overflow: hidden;
          position: relative; border: 1px solid rgba(255,255,255,0.08);
          background: #0a0e1a; cursor: pointer;
        }
        ha-camera-stream { width: 100%; display: block; max-height: 220px; object-fit: cover; }
        .camera-overlay {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.6));
          padding: 8px 12px;
          display: flex; justify-content: space-between; align-items: flex-end;
        }
        .camera-label { font-size: 10px; letter-spacing: 1px; color: rgba(255,255,255,0.5); text-transform: uppercase; }
        .camera-right-badges { display: flex; align-items: center; gap: 6px; }
        .camera-live-badge {
          font-size: 9px; letter-spacing: 1px; color: #f87171;
          border: 1px solid rgba(248,113,113,0.4);
          padding: 2px 6px; border-radius: 4px;
          text-transform: uppercase; font-weight: 600;
        }
        .camera-fullscreen-btn {
          width: 26px; height: 26px; border-radius: 6px;
          background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: rgba(255,255,255,0.75);
          transition: background 0.2s, color 0.2s; flex-shrink: 0;
        }
        .camera-fullscreen-btn:hover { background: rgba(99,179,237,0.25); border-color: rgba(99,179,237,0.45); color: #fff; }
        .camera-fullscreen-btn:active { transform: scale(0.92); }

        /* Glow line */
        .glow-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,179,237,0.3), rgba(168,85,247,0.3), transparent);
          margin: 0 16px;
        }

        /* Sensors list */
        .sensors-list {
          margin: 12px 16px 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; overflow: hidden;
          position: relative; z-index: 1;
        }
        .sensor-row {
          display: flex; align-items: center; padding: 11px 14px; gap: 10px;
          transition: background 0.2s;
        }
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
        .sensor-state { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); }
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
        .lights-row { display: flex; gap: 12px; padding: 0 16px 16px; position: relative; z-index: 1; }
        .light-btn {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 14px 10px; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          transition: all 0.25s ease; user-select: none;
        }
        .light-btn.on {
          background: rgba(251,191,36,0.1);
          border-color: rgba(251,191,36,0.35);
          box-shadow: 0 0 20px rgba(251,191,36,0.1);
        }
        .light-btn:hover { transform: translateY(-1px); }
        .light-btn:active { transform: scale(0.97); }
        .light-icon { font-size: 22px; transition: filter 0.3s; }
        .light-btn.on .light-icon { filter: drop-shadow(0 0 6px rgba(251,191,36,0.7)); }
        .light-name { font-size: 11px; letter-spacing: 1px; color: rgba(255,255,255,0.5); text-transform: uppercase; }
        .light-btn.on .light-name { color: rgba(251,191,36,0.9); }
        .light-status { font-size: 10px; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.5px; }
        .light-btn.on .light-status { color: rgba(251,191,36,0.5); }
      </style>

      <ha-card>
        <div class="card">

          <!-- Header -->
          <div class="header">
            <div class="title">${this._config.title}</div>
            <div class="status-dot"></div>
          </div>

          <!-- Temp + Humidity -->
          <div class="sensors-row">
            <div class="sensor-tile">
              <div class="gauge-wrap">
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="3.5"/>
                  <circle id="temp-arc" cx="26" cy="26" r="20" fill="none"
                    stroke="#a78bfa" stroke-width="3.5" stroke-linecap="round"
                    stroke-dasharray="125.6" stroke-dashoffset="62.8"/>
                </svg>
                <div class="gauge-center">
                  <div class="gauge-val-sm" id="temp-gauge-val">--</div>
                  <div class="gauge-unit-sm" id="temp-gauge-unit">°C</div>
                </div>
              </div>
              <div class="sensor-info">
                <div class="sensor-value" id="temp-val-big" style="color:#a78bfa">--<span id="temp-unit-big">°C</span></div>
                <div class="sensor-label">Temperature</div>
              </div>
            </div>

            <div class="sensor-tile">
              <div class="gauge-wrap">
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="3.5"/>
                  <circle id="hum-arc" cx="26" cy="26" r="20" fill="none"
                    stroke="#60a5fa" stroke-width="3.5" stroke-linecap="round"
                    stroke-dasharray="125.6" stroke-dashoffset="62.8"
                    style="filter:drop-shadow(0 0 4px #60a5fa);"/>
                </svg>
                <div class="gauge-center">
                  <div class="gauge-val-sm" id="hum-gauge-val">--</div>
                  <div class="gauge-unit-sm">%</div>
                </div>
              </div>
              <div class="sensor-info">
                <div class="sensor-value" style="color:#60a5fa"><span id="hum-val">--</span><span>%</span></div>
                <div class="sensor-label">Humidity</div>
              </div>
            </div>
          </div>

          <!-- Camera — ha-camera-stream, same pattern as garage card -->
          <div class="camera-section" id="camera-section">
            <div class="camera-wrap" id="camera-wrap">
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
                      <polyline points="15 3 21 3 21 9"/>
                      <polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/>
                      <line x1="3" y1="21" x2="10" y2="14"/>
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
              <div class="light-name">${this._config.light_2_name}</div>
              <div class="light-status" id="light2-status">OFF</div>
            </div>
            <div class="light-btn" id="light1">
              <div class="light-icon">🪔</div>
              <div class="light-name">${this._config.light_1_name}</div>
              <div class="light-status" id="light1-status">OFF</div>
            </div>
          </div>

        </div>
      </ha-card>
    `;

    // Event listeners — bound once per render
    this.shadowRoot.getElementById('light1')?.addEventListener('click', () => this._toggle(this._config.light_1_entity));
    this.shadowRoot.getElementById('light2')?.addEventListener('click', () => this._toggle(this._config.light_2_entity));
    this.shadowRoot.getElementById('camera-fullscreen-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('hass-more-info', {
        bubbles: true, composed: true,
        detail: { entityId: this._config.camera_entity },
      }));
    });

    // Initial state update + camera setup after first render
    this._updateStates();
    this._setupCameraStream();
    this.startCameraRefresh();
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
  '%c KIDS-ROOM-CARD %c v1.1.0 ',
  'color: white; background: #6366f1; font-weight: bold; padding: 2px 4px; border-radius: 3px 0 0 3px;',
  'color: #6366f1; background: #1e293b; font-weight: bold; padding: 2px 4px; border-radius: 0 3px 3px 0;'
);
