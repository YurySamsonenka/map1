const deg_to_rad = Math.PI / 180;

// Основная точка центра (заполнится после первого запроса)
let center_coords = null;

async function getInitialCoordinates() {
  try {
    const response = await fetch('https://enteneller.ru/moscow_car/api/sensors/get/');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const lon = parseFloat(data.find((i) => i.field === 'longitude')?.value);
    const lat = parseFloat(data.find((i) => i.field === 'latitude')?.value);

    if (!lon || !lat) throw new Error('Нет координат в ответе API');

    return [lon, lat];
  } catch (error) {
    console.error('Ошибка при первичной загрузке координат:', error);
    // fallback – Москва центр
    return [37.617644, 55.755819];
  }
}

(async () => {
  center_coords = await getInitialCoordinates();

  await ymaps3.ready;

  ymaps3.import.registerCdn('https://cdn.jsdelivr.net/npm/{package}', ['@yandex/ymaps3-default-ui-theme@0.0.7']);

  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker, YMapControls } = ymaps3;

  const { YMapRotateTiltControl } = await ymaps3.import('@yandex/ymaps3-default-ui-theme');

  // Инициализация карты по координатам из API
  const map = new YMap(document.getElementById('map'), {
    location: { center: center_coords, zoom: 17 },
    mode: 'vector',
    behaviors: ['drag', 'scrollZoom', 'dblClick', 'mouseTilt', 'mouseRotate']
  });

  map.addChild(new YMapDefaultSchemeLayer());
  map.addChild(new YMapDefaultFeaturesLayer());

  // Маркер
  const markerElement = document.createElement('div');
  markerElement.className = 'car-marker';
  const carIcon = document.createElement('img');
  carIcon.src = '49568490-4ac8-474e-b8ba-35137d30d9e2.png';
  carIcon.alt = 'car marker';
  carIcon.style.width = '41px';
  carIcon.style.height = '41px';
  markerElement.appendChild(carIcon);

  const marker = new YMapMarker({ coordinates: center_coords }, markerElement);
  map.addChild(marker);

  // Контролы
  const controls = new YMapControls({ position: 'right' });
  controls.addChild(new YMapRotateTiltControl({}));
  map.addChild(controls);

  // Камера
  map.update({
    camera: {
      tilt: 45 * deg_to_rad,
      azimuth: 30 * deg_to_rad
    }
  });

  // --- Панель управления ---
  const sidebar = document.getElementById('sidebar');
  const sidebarTrigger = document.getElementById('sidebar-trigger');
  const closeSidebar = document.getElementById('close-sidebar');
  const findCarBtn = document.getElementById('find-car-btn');

  sidebarTrigger.onclick = () => {
    sidebar.classList.add('open');
    sidebarTrigger.classList.add('hidden');
    loadDataFromServer();
  };

  closeSidebar.onclick = () => {
    sidebar.classList.remove('open');
    sidebarTrigger.classList.remove('hidden');
  };

  findCarBtn.onclick = () => {
    map.update({
      location: { center: center_coords, duration: 600 }
    });
  };

  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !sidebarTrigger.contains(e.target)) {
      sidebar.classList.remove('open');
      sidebarTrigger.classList.remove('hidden');
    }
  });

  // --- Обновление панели ---
  function updatePanelData(data) {
    const tableBody = document.querySelector('.info-table');
    tableBody.innerHTML = '';

    data.forEach((item) => {
      if (item.field !== 'longitude' && item.field !== 'latitude') {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="label">${item.name}:</td>
          <td class="value">${item.value}</td>
        `;
        tableBody.appendChild(row);
      }
    });
  }

  // --- Анимация маркера ---
  let animating = false;

  function animateMarkerTo(lon, lat) {
    const [startLon, startLat] = center_coords;
    const [endLon, endLat] = [lon, lat];
    const duration = 900;
    const startTime = performance.now();

    function step(currentTime) {
      const t = Math.min((currentTime - startTime) / duration, 1);
      // ease in-out
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      const newLon = startLon + (endLon - startLon) * ease;
      const newLat = startLat + (endLat - startLat) * ease;

      marker.update({ coordinates: [newLon, newLat] });

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        center_coords = [endLon, endLat];
        animating = false;
      }
    }

    if (!animating) {
      animating = true;
      requestAnimationFrame(step);
    }
  }

  // --- Обновление данных ---
  async function loadDataFromServer() {
    try {
      const response = await fetch('https://enteneller.ru/moscow_car/api/sensors/get/');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      const lon = parseFloat(data.find((i) => i.field === 'longitude')?.value);
      const lat = parseFloat(data.find((i) => i.field === 'latitude')?.value);

      console.log(lon, lat);

      if (lon && lat) {
        if (Math.abs(lon - center_coords[0]) > 0.000001 || Math.abs(lat - center_coords[1]) > 0.000001) {
          animateMarkerTo(lon, lat);
        }
      }

      if (sidebar.classList.contains('open')) updatePanelData(data);
    } catch (err) {
      console.error('Ошибка при обновлении:', err);
      if (sidebar.classList.contains('open')) {
        document.querySelector('.info-table').innerHTML = `
          <tr><td colspan="2" style="text-align:center;color:red;">Ошибка загрузки данных</td></tr>
        `;
      }
    }
  }

  loadDataFromServer();
  setInterval(loadDataFromServer, 1000);
})();
