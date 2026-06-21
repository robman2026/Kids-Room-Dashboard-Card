# kids-room-card

A **Samsung Premium glassmorphism** custom card for Home Assistant, designed for a kids bedroom dashboard.

> 🔗 Repository: https://github.com/robman2026/Kids-Room-Dashboard-Card

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
# Every entity supports an optional custom name and mdi icon.
temp_entity: sensor.kids_temp
temp_name: Temperature
temp_icon: mdi:thermometer
humidity_entity: sensor.kids_humidity
humidity_name: Humidity
humidity_icon: mdi:water-percent

# Motion sensor (binary_sensor)
motion_entity: binary_sensor.kids_motion
motion_name: Movement
motion_icon: mdi:motion-sensor

# Window sensors (binary_sensor — on = open)
window_left_entity: binary_sensor.kids_window_left
window_left_name: Window Left
window_left_icon: mdi:window-closed-variant
window_right_entity: binary_sensor.kids_window_right
window_right_name: Window Right
window_right_icon: mdi:window-closed-variant

# Lights
light_1_entity: light.kids_lamp_1
light_1_name: Kid 1
light_1_icon: mdi:lamp
light_2_entity: light.kids_lamp_2
light_2_name: Kid 2
light_2_icon: mdi:lamp
```

> The visual editor uses Home Assistant's **native pickers** — a searchable
> entity picker, a name text field, and an mdi icon picker — for every entity.
> Entities are grouped into **collapsible categories**, and a **Layout** list
> at the top lets you **drag sections into any order**.

### Section order

The order in which the blocks render on the card is stored in `section_order`.
Drag the rows in the editor's **Layout** list, or set it directly in YAML:

```yaml
# Default order
section_order:
  - temperature
  - humidity
  - camera
  - windows
  - motion
  - lights
```

Adjacent `temperature`/`humidity` render side-by-side; adjacent `windows`/`motion`
share one panel. Omit a key to hide that section entirely.

### All configuration options

| Option | Required | Default | Description |
|---|---|---|---|
| `title` | No | `KIDS BEDROOM` | Card header title |
| `camera_entity` | ✅ Yes | — | Camera entity ID |
| `camera_name` | No | _card title_ | Label shown on the camera overlay |
| `camera_icon` | No | — | mdi icon shown beside the camera label |
| `temp_entity` | ✅ Yes | — | Temperature sensor entity ID |
| `temp_name` | No | `Temperature` | Label for the temperature tile |
| `temp_icon` | No | — | mdi icon shown beside the temperature label |
| `humidity_entity` | ✅ Yes | — | Humidity sensor entity ID |
| `humidity_name` | No | `Humidity` | Label for the humidity tile |
| `humidity_icon` | No | — | mdi icon shown beside the humidity label |
| `motion_entity` | No | — | Motion binary sensor entity ID |
| `motion_name` | No | `Movement` | Label for the motion row |
| `motion_icon` | No | 🚶 | mdi icon for the motion row |
| `window_left_entity` | No | — | Left window binary sensor entity ID |
| `window_left_name` | No | `Window Left` | Label for the left window row |
| `window_left_icon` | No | ⊞ | mdi icon for the left window row |
| `window_right_entity` | No | — | Right window binary sensor entity ID |
| `window_right_name` | No | `Window Right` | Label for the right window row |
| `window_right_icon` | No | ⊞ | mdi icon for the right window row |
| `light_1_entity` | No | — | First light entity ID |
| `light_1_name` | No | `Kid 1` | Label for first light |
| `light_1_icon` | No | 🪔 | mdi icon for first light |
| `light_2_entity` | No | — | Second light entity ID |
| `light_2_name` | No | `Kid 2` | Label for second light |
| `light_2_icon` | No | 🪔 | mdi icon for second light |
| `section_order` | No | _see below_ | Order the sections render in (drag-to-reorder in the editor) |

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
