class KidsRoomDashboardCard extends HTMLElement {
  setConfig(config) {
    if (!config) throw new Error("No config set");
    this._config = config;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _getState(entity) {
    if (!entity || !this._hass) return null;
    return this._hass.states[entity] || null;
  }

  _formatTime(stateObj) {
    if (!stateObj) return "—";
    return new Date(stateObj.last_changed).toLocaleString();
  }

  _callService(domain, service, data) {
    this._hass.callService(domain, service, data);
  }

  _render() {
    if (!this.shadowRoot || !this._config || !this._hass) return;

    const {
      title = "Kids Room",
      camera_entity,
      temp_entity,
      hum_entity,
      kid1_switch,
      kid2_switch,
      occupancy_sensor,   // motion / presence
      window_left,
      window_right
    } = this._config;

    const temp = this._getState(temp_entity);
    const hum = this._getState(hum_entity);
    const kid1 = this._getState(kid1_switch);
    const kid2 = this._getState(kid2_switch);
    const occ = this._getState(occupancy_sensor);
    const winL = this._getState(window_left);
    const winR = this._getState(window_right);

    const allSecure =
      (occ?.state !== "on") &&
      (winL?.state !== "on") &&
      (winR?.state !== "on");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: "Segoe UI", Roboto, sans-serif;
        }

        ha-card {
          padding: 16px;
          border-radius: 12px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .title {
          font-size: 1.2rem;
          font-weight: 600;
        }

        .metrics {
          text-align: right;
          font-size: 0.9rem;
          color: #444;
        }

        .status-row {
          margin-bottom: 12px;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 6px;
          color: ${allSecure ? "#4caf50" : "#f44336"};
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${allSecure ? "#4caf50" : "#f44336"};
        }

        .camera {
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          margin-bottom: 12px;
        }

        .camera img {
          width: 100%;
          display: block;
        }

        .timestamp {
          position: absolute;
          bottom: 6px;
          right: 10px;
          background: rgba(0,0,0,0.4);
          color: #fff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.75rem;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }

        .pill {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 8px;
          text-align: center;
          font-size: 0.85rem;
          cursor: default;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pill.clickable {
          cursor: pointer;
        }

        .pill.on {
          background: #e0f7fa;
          color: #00796b;
        }

        .pill.window-ok {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .pill.window-alert {
          background: #ffebee;
          color: #c62828;
        }

        .pill-title {
          font-weight: 600;
        }

        .pill-sub {
          font-size: 0.75rem;
          opacity: 0.8;
        }

        .pill-icon {
          font-size: 1.1rem;
        }

        .occupancy-on {
          animation: pulse 1.4s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(76,175,80,0.6); }
          70% { box-shadow: 0 0 0 10px rgba(76,175,80,0); }
          100% { box-shadow: 0 0 0 0 rgba(76,175,80,0); }
        }

        .timeline {
          border-top: 1px solid rgba(0,0,0,0.06);
          padding-top: 8px;
          font-size: 0.8rem;
        }

        .timeline-title {
          font-weight: 600;
          margin-bottom: 4px;
        }

        .timeline-item {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;
        }

        .timeline-icon {
          font-size: 0.9rem;
        }

        .timeline-text {
          opacity: 0.85;
        }
      </style>

      <ha-card>
        <div class="header">
          <div class="title">${title}</div>
          <div class="metrics">
            🌡 ${temp?.state ?? "—"}°C<br>
            💧 ${hum?.state ?? "—"}%
          </div>
        </div>

        <div class="status-row">
          <div class="status-dot"></div>
          <div>${allSecure ? "All secure — no alerts" : "Attention — activity or open window"}</div>
        </div>

        <div class="camera">
          <img src="/api/camera_proxy/${camera_entity}">
          <div class="timestamp">${new Date().toLocaleString()}</div>
        </div>

        <div class="grid">
          <div class="pill clickable ${kid1?.state === "on" ? "on" : ""}" data-entity="${kid1_switch}">
            <div class="pill-icon">🧒</div>
            <div class="pill-title">Kid 1</div>
            <div class="pill-sub">${kid1?.state === "on" ? "ON" : "OFF"}</div>
          </div>

          <div class="pill clickable ${kid2?.state === "on" ? "on" : ""}" data-entity="${kid2_switch}">
            <div class="pill-icon">🧒</div>
            <div class="pill-title">Kid 2</div>
            <div class="pill-sub">${kid2?.state === "on" ? "ON" : "OFF"}</div>
          </div>

          <div class="pill ${occ?.state === "on" ? "on occupancy-on" : ""}">
            <div class="pill-icon">🚶</div>
            <div class="pill-title">Occupancy</div>
            <div class="pill-sub">${occ?.state === "on" ? "Movement detected" : "No motion"}</div>
          </div>

          <div class="pill ${winL?.state === "on" ? "window-alert" : "window-ok"}">
            <div class="pill-icon">🪟</div>
            <div class="pill-title">Window Left</div>
            <div class="pill-sub">${winL?.state === "on" ? "OPEN" : "CLOSED"}</div>
          </div>

          <div class="pill ${winR?.state === "on" ? "window-alert" : "window-ok"}">
            <div class="pill-icon">🪟</div>
            <div class="pill-title">Window Right</div>
            <div class="pill-sub">${winR?.state === "on" ? "OPEN" : "CLOSED"}</div>
          </div>
        </div>

        <div class="timeline">
          <div class="timeline-title">Recent activity</div>
          <div class="timeline-item">
            <div class="timeline-icon">🚶</div>
            <div class="timeline-text">
              Motion — ${this._formatTime(occ)}
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-icon">🪟</div>
            <div class="timeline-text">
              Window Left — ${this._formatTime(winL)}
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-icon">🪟</div>
            <div class="timeline-text">
              Window Right — ${this._formatTime(winR)}
            </div>
          </div>
        </div>
      </ha-card>
    `;

    // clickable switches
    this.shadowRoot.querySelectorAll(".pill.clickable").forEach((el) => {
      const entity = el.getAttribute("data-entity");
      if (!entity) return;
      el.addEventListener("click", () => {
        this._callService("switch", "toggle", { entity_id: entity });
      });
    });
  }

  getCardSize() {
    return 4;
  }
}

customElements.define("kids-room-dashboard-card", KidsRoomDashboardCard);
