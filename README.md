# kids-room-card

A **Samsung Premium glassmorphism** custom card for Home Assistant, designed for a kids bedroom dashboard.

> 🔗 Repository: [github.com/robman2026/kids-room-card](https://github.com/robman2026/kids-room-card)

---

## Features

- 🌡️ **Temperature gauge** — circular arc with colour-coded temperature range
- 💧 **Humidity gauge** — circular arc showing humidity percentage
- 📷 **Live camera stream** — full-width feed via HA camera proxy
- 🪟 **Window sensors** — left & right, with last-changed timestamp
- 🚶 **Motion sensor** — green (clear) / red + pulse animation (detected)
- 💡 **Light toggles** — Kid 1 & Kid 2 lamps with on/off glow effect
- 🎨 **Samsung Premium dark glassmorphism** — matching your existing card style

---

## Installation

### Via HACS (recommended)

1. Open HACS → Frontend → ⋮ → Custom repositories
2. Add `https://github.com/robman2026/kids-room-card` with category **Lovelace**
3. Install **Kids Room Card**
4. Clear browser cache and reload

### Manual

1. Download `kids-room-card.js` from this repository
2. Copy it to `config/www/kids-room-card.js`
3. In Home Assistant → Settings → Dashboards → Resources, add:
   ```
   URL:  /local/kids-room-card.js
   Type: JavaScript module
   ```
4. Reload the browser

---

## Configuration

Add the card to your dashboard YAML:

```yaml
type: custom:kids-room-card

# Card title (shown in header)
title: KIDS BEDROOM

# Camera
camera_entity: camera.kids_bedroom

# Temperature & Humidity (two separate entities)
temp_entity: sensor.kids_temp
humidity_entity: sensor.kids_humidity

# Motion sensor (binary_sensor)
motion_entity: binary_sensor.kids_motion

# Window sensors (binary_sensor — on = open)
window_left_entity: binary_sensor.kids_window_left
window_right_entity: binary_sensor.kids_window_right

# Lights
light_1_entity: light.kids_lamp_1
light_1_name: Kid 1
light_2_entity: light.kids_lamp_2
light_2_name: Kid 2
```

### All configuration options

| Option | Required | Default | Description |
|---|---|---|---|
| `title` | No | `KIDS BEDROOM` | Card header title |
| `camera_entity` | ✅ Yes | — | Camera entity ID |
| `temp_entity` | ✅ Yes | — | Temperature sensor entity ID |
| `humidity_entity` | ✅ Yes | — | Humidity sensor entity ID |
| `motion_entity` | No | — | Motion binary sensor entity ID |
| `window_left_entity` | No | — | Left window binary sensor entity ID |
| `window_right_entity` | No | — | Right window binary sensor entity ID |
| `light_1_entity` | No | — | First light entity ID |
| `light_1_name` | No | `Kid 1` | Label for first light |
| `light_2_entity` | No | — | Second light entity ID |
| `light_2_name` | No | `Kid 2` | Label for second light |

---

## Temperature Colour Scale

| Range | Colour |
|---|---|
| < 16°C | 🔵 Blue |
| 16–20°C | 🟢 Green |
| 20–24°C | 🟣 Purple |
| 24–28°C | 🟠 Orange |
| > 28°C | 🔴 Red |

---

## Notes

- The camera feed uses HA's built-in `/api/camera_proxy_stream/` — no extra setup needed.
- Window sensors follow the HA binary_sensor convention: `on` = open, `off` = closed.
- Lights are toggled via `homeassistant.toggle` — they work with any light entity.
- The card auto-updates whenever your HA state changes — no polling required.

---

## Compatibility

- Home Assistant 2024.1+
- Works with all HA themes (card has its own dark glassmorphism style)
- Mobile & desktop friendly

---

## License

MIT — [robman2026](https://github.com/robman2026)
