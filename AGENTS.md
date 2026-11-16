# Notes for coding agents

This is the user's **fork** of [andrewjswan/pixel-clock](https://github.com/andrewjswan/pixel-clock),
ESPHome firmware (EspHoMaTriXv2) for the Ulanzi TC001 pixel clock. Almost everything
here is upstream's; keep the fork's changes small so upstream merges stay easy.

## What's the user's vs. upstream's

- **User-maintained:** `docs/home-assistant.md`, section "Ulanzi TC001: Home Assistant
  display pages". It documents the Home Assistant side, which lives in the
  `homeassistant-config` repo (`packages/tc001.yaml`, `custom_templates/tc001.jinja`).
  Keep it in sync with those files.
- **Everything else is upstream's** (firmware packages, other docs, CI, README).
  Don't restyle or reorganize it; change it only for a deliberate fix, and say so.

## How the firmware is built (important)

- **The user's TC001 runs upstream's prebuilt firmware.** It was flashed with the web
  installer, which downloads binaries from `andrewjswan.github.io` (see
  `docs/js/installer.js`), built from upstream's repo. Nothing in this fork is on the
  device, e.g. commit `1089ea4` (removing the firmware's right-button screen skip) is
  not deployed.
- `pixel_clock.yaml`, `pixel_clock_en.yaml`, and `pixel_clock_ru.yaml` also pull their
  `packages/` **from upstream's GitHub `main`**, not from this checkout.
- A firmware change here only reaches the device if the user flashes a config that
  uses this fork's packages (point `packages: remote_package: url:` at the fork, or use
  local `!include`s as `tests/*.yaml` does) with ESPHome. Raise that with the user
  before making firmware changes.
- `multicolor_text: true` (in `packages/pixel_clock.yaml`) is required by the Home
  Assistant pages, which color text with `#RRGGBB` markers.

## Validating

- Firmware config, using this checkout's local packages:
  `esphome config tests/arduino-pixel-clock.yaml`
- Firmware config as the device would build it (upstream packages; needs network):
  `esphome config pixel_clock_en.yaml`
- Docs are an MkDocs site (`.mkdocs.yml`); keep Markdown valid for it (nested code
  blocks inside lists are indented four spaces).

## Environment notes

- Devices are flashed by the user; agents normally can't reach them.
- Related repos: `homeassistant-config` (drives the TC001 pages), `esphome-examples`
  (the other display, an ESP32 LVGL screen).
