ymaps3.ready.then(() => {
  ymaps3.import.registerCdn(
    'https://cdn.jsdelivr.net/npm/{package}',
    ['@yandex/ymaps3-default-ui-theme@0.0.7']
  );
});

await ymaps3.ready;

const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker, YMapControls } = ymaps3;

// Импортируем UI-тему с контролами
const { YMapRotateTiltControl } = await ymaps3.import('@yandex/ymaps3-default-ui-theme');

const center_coords = [37.617644, 55.755819];
const deg_to_rad = Math.PI / 180;

const map = new YMap(document.getElementById("map"), {
  location: {
    center: center_coords,
    zoom: 17
  },
  mode: "vector",
  behaviors: ['drag', 'scrollZoom', 'dblClick', 'mouseTilt', 'mouseRotate']
});

map.addChild(new YMapDefaultSchemeLayer());
map.addChild(new YMapDefaultFeaturesLayer());

const marker = new YMapMarker({ coordinates: center_coords }, document.createTextNode("🚗"));
map.addChild(marker);

// Добавляем только стандартный контрол вращения/наклона на карту
map.addChild(
  new YMapControls({ position: 'right' }, [
    new YMapRotateTiltControl({})
  ])
);

map.update({
  camera: {
    tilt: 45 * deg_to_rad,
    azimuth: 30 * deg_to_rad
  }
});

// ===== Управление боковой панелью =====
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
