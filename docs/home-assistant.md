## Integration in Home Assistant

To control your display, it has to be integrated in Home Assistant. Then it provides several services, all prefixed with the configured `devicename` e.g. `pixel_clock`.

### Services

All communication with Home Assistant use the homeasistant-api. The services can be provided by default or also defined additionally in the YAML. To define the additional services, you need the ID of the ehmtx-component e.g. `id(rgb8x32)`.

### Use in Home Assistant automations

#### Icon names as trigger ID

The easiest way to use Pixel Clock as a status display is to use the icon names as trigger ID. In my example, I have an icon named `wind` when the `sensor.wind_speed` has a new state, this automation sends the new data to the screen with the icon named `wind` and so on.

!!! example "Icon names as trigger ID"

    ``` { .yaml .copy }
    alias: Pixel Clock - Icons
    trigger:
      - platform: numeric_state
        entity_id: sensor.wind_speed
        id: wind
      - platform: state
        entity_id: sensor.outside_temperature
        id: temp
      - platform: state
        entity_id: sensor.cover_device
        id: cover
    action:
      - service: esphome.pixel_clock_icon_screen
        data:
          icon_name: '{{trigger.id}}' (1)
          text: >-
            {{trigger.to_state.state}}{{trigger.to_state.attributes.unit_of_measurement}}
    mode: queued
    max: 10
    ```
1. See the list of all possible [icons](icons.md)

#### Specific icons per state

Sample automation to show the weather with local temperature

!!! example annotate "Weather with icon per condition"

    ``` { .yaml .copy .annotate }
    alias: Pixel Clock - Weather
    trigger:
      - platform: state
        entity_id: weather.current
    action:
      - service: esphome.pixel_clock_del_screen
        data:
          icon_name: weather_* (1)
          mode: 5 (2)
      - service: esphome.pixel_clock_icon_screen
        data:
          icon_name: weather_{{ trigger.to_state.state }}
          text: >-
            {{ states("sensor.outside_temperature") }}°C
    ```
1. See the list of all possible [icons](icons.md)
2. See the list of all possible [modes](esphomatrix.md#screens-and-modes) and their values

Sample automation for the trashcan type

!!! example annotate "Garbage display"

    ``` { .yaml .copy .annotate }
    alias: Pixel Clock - Garbage Display
    trigger:
      - platform: time
        at:
          - "06:30"
          - "08:30"
          - "10:30"
          - "15:00"
          - "17:00"
          - "19:00"
    condition:
      - condition: numeric_state
        entity_id: sensor.trash_trigger
        below: "3"
    action:
      - service: esphome.ulanzi_del_screen
        data:
          icon_name: trash_* (1)
          mode: 5 (2)
      - service: esphome.ulanzi_icon_screen
        data:
          icon_name: >-
            trash_{{ states("sensor.trash_details") | replace("Organic", "brown") | replace("Paper","blue") | replace("Residual waste", "grey") | replace("Yellow bin","yellow") }}
          text: >-
            {{ states("sensor.trash_details") }}
        lifetime: 120
    ```
1. See the list of all possible [icons](icons.md)
2. See the list of all possible [modes](esphomatrix.md#screens-and-modes) and their values

#### Tips

!!! tip "Display sensor precision after Home Assistant 2023.3"

    See [templating](https://www.home-assistant.io/docs/configuration/templating/#states) for possibilities to optimize the output e.g. `{{ states(sensor.solarpower, rounded=True) }} kWh`

!!! tip "Time zone"

    See [Add timezone support to GetTimeResponse for automatic timezone synchronization](https://github.com/esphome/esphome/pull/10661)

### Ulanzi TC001: Home Assistant display pages

The TC001's 32×8 matrix works best with short, colored, scrolling text. A Home
Assistant [package](https://www.home-assistant.io/docs/configuration/packages/) can
drive it with four pages, stepped with the left and right buttons:

| Page | Shows |
|---|---|
| Time + outdoor | `HH:MM` and the feels-like temperature, refreshed every minute |
| Temperature details | Indoor, outdoor, and feels-like, alternating with an `I/O/FL` label |
| Today forecast | Scrolling: `TODAY Sunny 46/37 0.00in` |
| Next 3 days | Scrolling: `MON Sunny 54/36 0.00in   TUE Partly cloudy 56/44 0.25in   WED …` |

Pages other than the time page return to it after 30 seconds (60 seconds for Next 3
days, whose text takes about 38 seconds to scroll through once). The middle button keeps
the firmware's own clock/date action.

The reference implementation is two files in the `homeassistant-config` repository.
Deleting them (and restarting Home Assistant) removes the integration:

- `packages/tc001.yaml`: the `input_select.tc001_display_page` page selector,
  `script.tc001_show_text` (the only call to the device),
  `script.tc001_render_page`, and the button, render, and return-home automations
- `custom_templates/tc001.jinja`: the text for each page

It reads shared entities from `packages/displays.yaml` in the same repository:
`sensor.display_outdoor_temperature`, `sensor.display_indoor_temperature`,
`sensor.display_feels_like_temperature`, and `sensor.display_daily_forecast`. Point
the `input_text.display_*_source` helpers at the real sensors; the TC001 pages don't
change when the sources change.

To adapt it to another clock:

1. Enable packages in `configuration.yaml`:

    ```yaml
    homeassistant:
      packages: !include_dir_named packages
    ```

2. In `packages/tc001.yaml`, set the action name in `script.tc001_show_text` (e.g.
   `esphome.pixel_clock_en_alert_text_screen`) and the button entities in the button
   automation to the IDs shown in your Home Assistant instance.
3. Keep `multicolor_text: true` in the firmware (the default in
   `packages/pixel_clock.yaml`). The page text uses `#RRGGBB` markers to color each
   temperature on the shared blue → green → red scale from
   `custom_templates/displays.jinja`.
4. Don't also create a UI helper named `tc001_display_page`; it would clash with the
   one the package defines.
