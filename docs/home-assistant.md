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

### Ulanzi TC001: two Home Assistant display pages

The TC001's 32×8 matrix is best used with short, scrolling text. The following
example uses the stable alias sensors `sensor.display_outdoor_temperature`,
`sensor.display_indoor_temperature`, and `sensor.display_feels_like_temperature`.
Point those aliases at the desired source entities in Home Assistant; the
display automations do not need to change when the sources change.

Add a page selector to `configuration.yaml`:

```yaml
input_select:
  tc001_display_page:
    name: TC001 display page
    options:
      - "Time + outdoor"
      - "Temperature details"
    initial: "Time + outdoor"
```

Add these automations to `automations.yaml`. Replace the button entity IDs and
ESPHome service name with the IDs shown in your Home Assistant instance.
Left selects the time and outdoor temperature page; Right selects the three
temperature page. Middle retains the firmware's existing clock/date action.

```yaml
- alias: TC001 select display page with buttons
  trigger:
    - platform: state
      entity_id: binary_sensor.pixel_clock_left_button
      to: "on"
      id: page1
    - platform: state
      entity_id: binary_sensor.pixel_clock_right_button
      to: "on"
      id: page2
  action:
    - service: input_select.select_option
      target:
        entity_id: input_select.tc001_display_page
      data:
        option: "{{ 'Time + outdoor' if trigger.id == 'page1' else 'Temperature details' }}"
  mode: restart

- alias: TC001 render selected display page
  trigger:
    - platform: homeassistant
      event: start
    - platform: time_pattern
      minutes: "/1"
    - platform: state
      entity_id:
        - input_select.tc001_display_page
        - sensor.display_outdoor_temperature
        - sensor.display_indoor_temperature
        - sensor.display_feels_like_temperature
  action:
    - choose:
        - conditions:
            - condition: state
              entity_id: input_select.tc001_display_page
              state: "Time + outdoor"
          sequence:
            - service: esphome.pixel_clock_alert_text_screen
              data:
                text: >-
                  {% set outdoor = states('sensor.display_outdoor_temperature') %}
                  {{ now().strftime('%H:%M') }}
                  {{ outdoor | float | round(0) if is_number(outdoor) else '--' }}°F
                screen_time: 90
                default_font: true
        - conditions:
            - condition: state
              entity_id: input_select.tc001_display_page
              state: "Temperature details"
          sequence:
            - service: esphome.pixel_clock_alert_text_screen
              data:
                text: >-
                  {% set indoor = states('sensor.display_indoor_temperature') %}
                  {% set outdoor = states('sensor.display_outdoor_temperature') %}
                  {% set feels = states('sensor.display_feels_like_temperature') %}
                  IN {{ indoor | float | round(0) if is_number(indoor) else '--' }}°F
                  OUT {{ outdoor | float | round(0) if is_number(outdoor) else '--' }}°F
                  FEELS {{ feels | float | round(0) if is_number(feels) else '--' }}°F
                screen_time: 90
                default_font: true
  mode: restart
```

The selected page is refreshed every minute so the clock stays current; sensor
changes rerender the selected page immediately. The longer temperature page
scrolls across the matrix.
