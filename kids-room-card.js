/**
 * kids-room-card
 * A Samsung Premium glassmorphism-style custom card for Home Assistant
 * Repository: https://github.com/robman2026/kids-room-card
 * Version: 1.0.0
 */

class KidsRoomCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._cameraRefreshTimer = null;
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
    if (!config.camera_entity) throw new Error('camera_entity is required');
    if (!config.temp_entity) throw new Error('temp_entity is required');
    if (!config.humidity_entity) throw new Error('humidity_entity is required');
    this._config = {
      title: 'KIDS BEDROOM',
      light_1_name: 'Kid 1',
      light_2_name: 'Kid 2',
      camera_refresh_interval: 5000,
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 7;
  }

  _getState(entity_id) {
    if (!this._hass || !entity_id) return null;
    return this._hass.states[entity_id] || null;
  }

  _getValue(entity_id, attribute = null) {
    const state = this._getState(entity_id);
    if (!state) return 'N/A';
    if (attribute) return state.attributes[attribute] ?? 'N/A';
    return state.state;
  }

  _isOn(entity_id) {
    const state = this._getState(entity_id);
    return state ? state.state === 'on' : false;
  }

  _toggle(entity_id) {
    if (!this._hass || !entity_id) return;
    this._hass.callService('homeassistant', 'toggle', { entity_id });
  }

  _getTemp() {
    const val = this._getValue(this._config.temp_entity);
    return val === 'N/A' ? '--' : parseFloat(val).toFixed(1);
  }

  _getHumidity() {
    const val = this._getValue(this._config.humidity_entity);
    return val === 'N/A' ? '--' : parseFloat(val).toFixed(0);
  }

  _getTempUnit() {
    const state = this._getState(this._config.temp_entity);
    return state?.attributes?.unit_of_measurement || '°C';
  }

  _getMotionState() {
    return this._isOn(this._config.motion_entity);
  }

  _getWindowState(entity_id) {
    const val = this._getValue(entity_id);
    if (val === 'N/A') return { label: 'N/A', open: false };
    const open = val === 'on';
    return { label: open ? 'Open' : 'Closed', open };
  }

  _getLastChanged(entity_id) {
    const state = this._getState(entity_id);
    if (!state) return '';
    const changed = new Date(state.last_changed);
    const now = new Date();
    const diffMs = now - changed;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  }

  _getCameraUrl() {
    if (!this._hass || !this._config.camera_entity) return '';
    return `/api/camera_proxy_stream/${this._config.camera_entity}?token=${this._hass.auth?.data?.access_token || ''}`;
  }

  _openCameraMoreInfo() {
    if (!this._config.camera_entity) return;
    // Fire the native HA more-info event.
    // composed:true is required so the event pierces Shadow DOM and reaches the HA root listener.
    const event = new Event('hass-more-info', {
      bubbles: true,
      composed: true,
    });
    event.detail = { entityId: this._config.camera_entity };
    this.dispatchEvent(event);
  }

  _getHumidityAngle(hum) {
    const h = parseFloat(hum);
    if (isNaN(h)) return 0;
    return Math.min(Math.max(h, 0), 100) * 1.8 - 90;
  }

  _getTempColor(temp) {
    const t = parseFloat(temp);
    if (isNaN(t)) return '#60a5fa';
    if (t < 16) return '#60a5fa';
    if (t < 20) return '#34d399';
    if (t < 24) return '#a78bfa';
    if (t < 28) return '#fb923c';
    return '#f87171';
  }

  _render() {
    if (!this._config) return;

    const temp = this._getTemp();
    const hum = this._getHumidity();
    const tempUnit = this._getTempUnit();
    const tempColor = this._getTempColor(temp);
    const motionDetected = this._getMotionState();
    const winLeft = this._getWindowState(this._config.window_left_entity);
    const winRight = this._getWindowState(this._config.window_right_entity);
    const light1On = this._isOn(this._config.light_1_entity);
    const light2On = this._isOn(this._config.light_2_entity);
    const humAngle = this._getHumidityAngle(hum);

    // Build humidity arc path
    const humPercent = isNaN(parseFloat(hum)) ? 0 : Math.min(Math.max(parseFloat(hum), 0), 100);
    const humDash = (humPercent / 100) * 251.2;

    const cameraUrl = this._getCameraUrl();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        .card {
          background: linear-gradient(145deg, #1a1f35 0%, #0f1628 50%, #141929 100%);
          border-radius: 20px;
          border: 1px solid rgba(99, 179, 237, 0.15);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04),
            0 8px 32px rgba(0,0,0,0.6),
            0 0 60px rgba(99,179,237,0.05);
          overflow: hidden;
          padding: 0;
          position: relative;
        }

        /* Subtle glow overlay */
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
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px 10px;
          position: relative;
          z-index: 1;
        }

        .title-block {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .brand {
          font-size: 10px;
          letter-spacing: 2px;
          color: rgba(255,255,255,0.35);
          font-weight: 400;
          text-transform: uppercase;
        }

        .title {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .status-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 8px rgba(52,211,153,0.8);
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(52,211,153,0.8); }
          50% { opacity: 0.6; box-shadow: 0 0 14px rgba(52,211,153,0.4); }
        }

        /* Temp + Humidity Row */
        .sensors-row {
          display: flex;
          gap: 12px;
          padding: 0 16px 12px;
          position: relative;
          z-index: 1;
        }

        .sensor-tile {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 14px 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          backdrop-filter: blur(10px);
          transition: border-color 0.3s;
        }

        .sensor-tile:hover {
          border-color: rgba(99,179,237,0.3);
        }

        /* Circular gauge for temp */
        .gauge-wrap {
          position: relative;
          width: 52px;
          height: 52px;
          flex-shrink: 0;
        }

        .gauge-wrap svg {
          transform: rotate(-90deg);
        }

        .gauge-center {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .gauge-val {
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }

        .gauge-unit {
          font-size: 7px;
          color: rgba(255,255,255,0.5);
        }

        .sensor-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sensor-value {
          font-size: 22px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1;
        }

        .sensor-value span {
          font-size: 13px;
          font-weight: 400;
          color: rgba(255,255,255,0.6);
        }

        .sensor-label {
          font-size: 10px;
          letter-spacing: 1.5px;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
        }

        /* Camera */
        .camera-wrap {
          margin: 0 16px 12px;
          border-radius: 14px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255,255,255,0.08);
          background: #0a0e1a;
          z-index: 1;
        }

        .camera-wrap img,
        .camera-wrap video {
          width: 100%;
          display: block;
          object-fit: cover;
          max-height: 220px;
        }

        .camera-overlay {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.6));
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .camera-label {
          font-size: 10px;
          letter-spacing: 1px;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
        }

        .camera-live-badge {
          font-size: 9px;
          letter-spacing: 1px;
          color: #f87171;
          border: 1px solid rgba(248,113,113,0.4);
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .camera-right-badges {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .camera-fullscreen-btn {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: rgba(255,255,255,0.75);
          transition: background 0.2s, color 0.2s;
          flex-shrink: 0;
        }

        .camera-fullscreen-btn:hover {
          background: rgba(99,179,237,0.25);
          border-color: rgba(99,179,237,0.45);
          color: #fff;
        }

        .camera-fullscreen-btn:active {
          transform: scale(0.92);
        }

        .camera-wrap {
          cursor: pointer;
        }

        /* Sensors list */
        .sensors-list {
          margin: 0 16px 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          overflow: hidden;
          z-index: 1;
          position: relative;
        }

        .sensor-row {
          display: flex;
          align-items: center;
          padding: 11px 14px;
          gap: 10px;
          transition: background 0.2s;
        }

        .sensor-row:not(:last-child) {
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .sensor-row:hover {
          background: rgba(255,255,255,0.03);
        }

        .sensor-icon {
          width: 32px; height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          flex-shrink: 0;
        }

        .sensor-icon.green {
          background: rgba(52,211,153,0.12);
          box-shadow: 0 0 10px rgba(52,211,153,0.1);
        }

        .sensor-icon.red {
          background: rgba(248,113,113,0.12);
          box-shadow: 0 0 10px rgba(248,113,113,0.1);
        }

        .sensor-icon.amber {
          background: rgba(251,191,36,0.12);
          box-shadow: 0 0 10px rgba(251,191,36,0.1);
        }

        .sensor-icon.blue {
          background: rgba(99,179,237,0.1);
        }

        .sensor-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .sensor-name {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.85);
        }

        .sensor-time {
          font-size: 10px;
          color: rgba(255,255,255,0.3);
        }

        .sensor-state {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
        }

        .sensor-state.open {
          color: #fbbf24;
        }

        .sensor-state.closed {
          color: rgba(255,255,255,0.4);
        }

        .sensor-state.detected {
          color: #f87171;
          animation: motion-pulse 1.5s ease-in-out infinite;
        }

        .sensor-state.clear {
          color: #34d399;
        }

        @keyframes motion-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Motion icon pulse when active */
        .motion-active .sensor-icon {
          animation: icon-pulse 1.5s ease-in-out infinite;
        }

        @keyframes icon-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(248,113,113,0.1); }
          50% { box-shadow: 0 0 18px rgba(248,113,113,0.4); }
        }

        /* Lights row */
        .lights-row {
          display: flex;
          gap: 12px;
          padding: 0 16px 16px;
          position: relative;
          z-index: 1;
        }

        .light-btn {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 14px 10px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          transition: all 0.25s ease;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        .light-btn.on {
          background: rgba(251,191,36,0.1);
          border-color: rgba(251,191,36,0.35);
          box-shadow: 0 0 20px rgba(251,191,36,0.1);
        }

        .light-btn:hover {
          transform: translateY(-1px);
        }

        .light-btn:active {
          transform: scale(0.97);
        }

        .light-icon {
          font-size: 22px;
          transition: filter 0.3s;
        }

        .light-btn.on .light-icon {
          filter: drop-shadow(0 0 6px rgba(251,191,36,0.7));
        }

        .light-name {
          font-size: 11px;
          letter-spacing: 1px;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
        }

        .light-btn.on .light-name {
          color: rgba(251,191,36,0.9);
        }

        .light-status {
          font-size: 10px;
          color: rgba(255,255,255,0.25);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .light-btn.on .light-status {
          color: rgba(251,191,36,0.5);
        }

        /* Bottom glow line */
        .glow-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,179,237,0.3), rgba(168,85,247,0.3), transparent);
          margin: 0 16px 0;
        }

        /* Error / unavailable state */
        .unavailable {
          color: rgba(255,255,255,0.2);
          font-size: 11px;
        }
      </style>

      <ha-card>
        <div class="card">

          <!-- Header -->
          <div class="header">
            <div class="title-block">
              <div class="brand">Samsung</div>
              <div class="title">${this._config.title}</div>
            </div>
            <div class="status-dot"></div>
          </div>

          <!-- Temp + Humidity -->
          <div class="sensors-row">

            <!-- Temperature -->
            <div class="sensor-tile">
              <div class="gauge-wrap">
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="20"
                    fill="none"
                    stroke="rgba(255,255,255,0.07)"
                    stroke-width="3.5"/>
                  <circle cx="26" cy="26" r="20"
                    fill="none"
                    stroke="${tempColor}"
                    stroke-width="3.5"
                    stroke-linecap="round"
                    stroke-dasharray="125.6"
                    stroke-dashoffset="${this._getTempDashOffset(temp)}"
                    style="filter: drop-shadow(0 0 4px ${tempColor}); transition: stroke-dashoffset 0.6s ease, stroke 0.6s ease;"/>
                </svg>
                <div class="gauge-center">
                  <div class="gauge-val">${temp}</div>
                  <div class="gauge-unit">${tempUnit}</div>
                </div>
              </div>
              <div class="sensor-info">
                <div class="sensor-value" style="color:${tempColor}">${temp}<span>${tempUnit}</span></div>
                <div class="sensor-label">Temperature</div>
              </div>
            </div>

            <!-- Humidity -->
            <div class="sensor-tile">
              <div class="gauge-wrap">
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="20"
                    fill="none"
                    stroke="rgba(255,255,255,0.07)"
                    stroke-width="3.5"/>
                  <circle cx="26" cy="26" r="20"
                    fill="none"
                    stroke="#60a5fa"
                    stroke-width="3.5"
                    stroke-linecap="round"
                    stroke-dasharray="125.6"
                    stroke-dashoffset="${125.6 - humDash}"
                    style="filter: drop-shadow(0 0 4px #60a5fa); transition: stroke-dashoffset 0.6s ease;"/>
                </svg>
                <div class="gauge-center">
                  <div class="gauge-val">${hum}</div>
                  <div class="gauge-unit">%</div>
                </div>
              </div>
              <div class="sensor-info">
                <div class="sensor-value" style="color:#60a5fa">${hum}<span>%</span></div>
                <div class="sensor-label">Humidity</div>
              </div>
            </div>

          </div>

          <!-- Camera -->
          <div class="camera-wrap" id="camera-wrap">
            <img
              src="${cameraUrl}"
              alt="Kids Bedroom Camera"
              onerror="this.style.display='none'"
              onload="this.style.display='block'"
            />
            <div class="camera-overlay">
              <div class="camera-label">${this._config.title}</div>
              <div class="camera-right-badges">
                <div class="camera-live-badge">● Live</div>
                <div class="camera-fullscreen-btn" id="camera-fullscreen-btn" title="Open in fullscreen">
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

          <div class="glow-line"></div>

          <!-- Sensors List -->
          <div class="sensors-list" style="margin-top:12px">

            <!-- Window Left -->
            <div class="sensor-row">
              <div class="sensor-icon ${winLeft.open ? 'amber' : 'blue'}">⊞</div>
              <div class="sensor-text">
                <div class="sensor-name">Window Left</div>
                <div class="sensor-time">${this._getLastChanged(this._config.window_left_entity)}</div>
              </div>
              <div class="sensor-state ${winLeft.open ? 'open' : 'closed'}">${winLeft.label}</div>
            </div>

            <!-- Window Right -->
            <div class="sensor-row">
              <div class="sensor-icon ${winRight.open ? 'amber' : 'blue'}">⊞</div>
              <div class="sensor-text">
                <div class="sensor-name">Window Right</div>
                <div class="sensor-time">${this._getLastChanged(this._config.window_right_entity)}</div>
              </div>
              <div class="sensor-state ${winRight.open ? 'open' : 'closed'}">${winRight.label}</div>
            </div>

            <!-- Motion -->
            <div class="sensor-row ${motionDetected ? 'motion-active' : ''}">
              <div class="sensor-icon ${motionDetected ? 'red' : 'green'}">
                ${motionDetected ? '🚶' : '🚶'}
              </div>
              <div class="sensor-text">
                <div class="sensor-name">Movement</div>
                <div class="sensor-time">${this._getLastChanged(this._config.motion_entity)}</div>
              </div>
              <div class="sensor-state ${motionDetected ? 'detected' : 'clear'}">${motionDetected ? 'Detected' : 'Clear'}</div>
            </div>

          </div>

          <!-- Light Controls -->
          <div class="lights-row">

            <div class="light-btn ${light2On ? 'on' : ''}" id="light2">
              <div class="light-icon">🪔</div>
              <div class="light-name">${this._config.light_2_name}</div>
              <div class="light-status">${light2On ? 'ON' : 'OFF'}</div>
            </div>

            <div class="light-btn ${light1On ? 'on' : ''}" id="light1">
              <div class="light-icon">🪔</div>
              <div class="light-name">${this._config.light_1_name}</div>
              <div class="light-status">${light1On ? 'ON' : 'OFF'}</div>
            </div>

          </div>

        </div>
      </ha-card>
    `;

    // Bind light toggle events after render
    this.shadowRoot.getElementById('light1')?.addEventListener('click', () => {
      this._toggle(this._config.light_1_entity);
    });
    this.shadowRoot.getElementById('light2')?.addEventListener('click', () => {
      this._toggle(this._config.light_2_entity);
    });

    // Camera: click image area opens more-info, fullscreen button also opens more-info
    this.shadowRoot.getElementById('camera-wrap')?.addEventListener('click', (e) => {
      // Only fire if the click was NOT on the fullscreen button itself (avoid double-fire)
      if (!e.target.closest('#camera-fullscreen-btn')) {
        this._openCameraMoreInfo();
      }
    });
    this.shadowRoot.getElementById('camera-fullscreen-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._openCameraMoreInfo();
    });
  }

  _getTempDashOffset(temp) {
    const t = parseFloat(temp);
    if (isNaN(t)) return 125.6;
    // Map 0°C–40°C to 0–100% of circle
    const pct = Math.min(Math.max((t - 0) / 40, 0), 1);
    return 125.6 - pct * 125.6;
  }

  connectedCallback() {
    // Camera img already handles live stream via HA proxy
  }

  disconnectedCallback() {
    if (this._cameraRefreshTimer) clearInterval(this._cameraRefreshTimer);
  }
}

customElements.define('kids-room-card', KidsRoomCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'kids-room-card',
  name: 'Kids Room Card',
  description: 'Samsung Premium glassmorphism card for a kids bedroom — temp, humidity, camera, windows, motion and lights.',
  preview: true,
  documentationURL: 'https://github.com/robman2026/kids-room-card',
});
