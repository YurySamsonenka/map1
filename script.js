ymaps3.ready.then(() => {
  ymaps3.import.registerCdn(
    'https://cdn.jsdelivr.net/npm/{package}',
    ['@yandex/ymaps3-default-ui-theme@0.0.7']
  );
});

await ymaps3.ready;

const {
  YMap,
  YMapDefaultSchemeLayer,
  YMapDefaultFeaturesLayer,
  YMapMarker,
  YMapControls,
  YMapControlButton
} = ymaps3;

const { YMapRotateTiltControl } = await ymaps3.import('@yandex/ymaps3-default-ui-theme');

const center_coords = [37.617644, 55.755819];
const deg_to_rad = Math.PI / 180;

const map = new YMap(document.getElementById("map"), {
  location: { center: center_coords, zoom: 17 },
  mode: "vector",
  behaviors: ["drag", "scrollZoom", "dblClick", "mouseTilt", "mouseRotate"]
});

map.addChild(new YMapDefaultSchemeLayer());
map.addChild(new YMapDefaultFeaturesLayer());

const marker = new YMapMarker({ coordinates: center_coords }, document.createTextNode("🚗"));
map.addChild(marker);

const svg = document.createElement("div");
svg.classList.add('block')
svg.innerHTML = `
  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.385 12.42l16.01-7.614a.6.6 0 0 1 .8.8l-7.616 16.009a.6.6 0 0 1-1.11-.068l-2.005-6.012-6.01-2.003a.6.6 0 0 1-.069-1.111z" fill="currentColor"></path></svg>
`;

const focusButton = new YMapControlButton({
  title: "Центрировать",
  element: svg,
  onClick: () => {
    map.update({
      location: { center: center_coords, duration: 600 }
    });
  }
});

const controls = new YMapControls({ position: "right" });
controls.addChild(focusButton);
controls.addChild(new YMapRotateTiltControl({}));
map.addChild(controls);

map.update({
  camera: {
    tilt: 45 * deg_to_rad,
    azimuth: 30 * deg_to_rad
  }
});

const sidebar = document.getElementById("sidebar");
const sidebarTrigger = document.getElementById("sidebar-trigger");
const closeSidebar = document.getElementById("close-sidebar");

sidebarTrigger.onclick = () => {
  sidebar.classList.add("open");
  sidebarTrigger.classList.add("hidden");
  loadDataFromServer();
};

closeSidebar.onclick = () => {
  sidebar.classList.remove("open");
  sidebarTrigger.classList.remove("hidden");
};

document.addEventListener("click", (e) => {
  if (
    sidebar.classList.contains("open") &&
    !sidebar.contains(e.target) &&
    !sidebarTrigger.contains(e.target)
  ) {
    sidebar.classList.remove("open");
    sidebarTrigger.classList.remove("hidden");
  }
});

function updatePanelData(name, number) {
  document.getElementById("name-value").textContent = name;
  document.getElementById("number-value").textContent = number;
}

function loadDataFromServer() {
  setTimeout(() => {
    updatePanelData("Объект 1", "12345");
  }, 500);
}
