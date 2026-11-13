$(document).ready(function() {
    // Version
    const url = "https://andrewjswan.github.io/pixel-clock/pixel-clock/pixel-clock-manifest.json";
    $.getJSON(url).done(function(data) {
        $("#version").text(data.version);
    });

    // Handle selecting a device
    document.querySelectorAll("input.device").forEach((radio) => {
        radio.addEventListener("change", () => {
            const button = document.querySelector('esp-web-install-button');
                const device = radio.value;
                const family = radio.id;
                button.manifest = `../pixel-clock/${device}${family ? `-${family}` : ""}-manifest.json`;
        });
    });
});
