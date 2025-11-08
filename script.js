
await ymaps3.ready;

const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = ymaps3;

const center_coords = [37.617644, 55.755819];
const deg_to_rad = Math.PI / 180;
const min_tilt_deg = 0;
const max_tilt_deg = 67;

const map = new YMap(document.getElementById("map"), {
  location: {
    center: center_coords,
    zoom: 17
  },
  mode: "vector"
});

map.addChild(new YMapDefaultSchemeLayer());
map.addChild(new YMapDefaultFeaturesLayer());

const marker = new YMapMarker({ coordinates: center_coords }, document.createTextNode("🚗"));
map.addChild(marker);

map.update({
  camera: {
    tilt: 45 * deg_to_rad,
    azimuth: 30 * deg_to_rad
  }
});

function clampTiltRad(target_tilt_rad) {
  const min_rad = min_tilt_deg * deg_to_rad;
  const max_rad = max_tilt_deg * deg_to_rad;
  return Math.min(Math.max(target_tilt_rad, min_rad), max_rad);
}

function updateCamera(delta_tilt_deg, delta_azimuth_deg) {
  const current_tilt = map.tilt;
  const current_azimuth = map.azimuth;
  const next_tilt = clampTiltRad(current_tilt + delta_tilt_deg * deg_to_rad);
  const next_azimuth = current_azimuth + delta_azimuth_deg * deg_to_rad;

  map.update({
    camera: {
      tilt: next_tilt,
      azimuth: next_azimuth,
      duration: 200
    }
  });
}

document.getElementById("tiltUp").onclick = () => updateCamera(-5, 0);
document.getElementById("tiltDown").onclick = () => updateCamera(5, 0);
document.getElementById("rotateLeft").onclick = () => updateCamera(0, -10);
document.getElementById("rotateRight").onclick = () => updateCamera(0, 10);
document.getElementById("reset").onclick = () => {
  map.update({
    location: { center: center_coords, zoom: 17 },
    camera: {
      tilt: 45 * deg_to_rad,
      azimuth: 30 * deg_to_rad,
      duration: 200
    }
  });
};
