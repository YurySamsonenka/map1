const deg_to_rad = Math.PI / 180;

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
    return [37.617644, 55.755819];
  }
}

(async () => {
  center_coords = await getInitialCoordinates();

  await ymaps3.ready;

  ymaps3.import.registerCdn('https://cdn.jsdelivr.net/npm/{package}', ['@yandex/ymaps3-default-ui-theme@0.0.7']);

  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker, YMapControls } = ymaps3;

  const { YMapRotateTiltControl } = await ymaps3.import('@yandex/ymaps3-default-ui-theme');

  const map = new YMap(document.getElementById('map'), {
    location: { center: center_coords, zoom: 17 },
    mode: 'vector',
    behaviors: ['drag', 'scrollZoom', 'dblClick', 'mouseTilt', 'mouseRotate']
  });

  map.addChild(new YMapDefaultSchemeLayer());
  map.addChild(new YMapDefaultFeaturesLayer());

  const markerElement = document.createElement('div');
  markerElement.className = 'car-marker';

  const markerCircle = document.createElement('div');
  markerCircle.className = 'marker-circle';

  const carIcon = document.createElement('img');
  carIcon.src = '49568490-4ac8-474e-b8ba-35137d30d9e2.png';
  carIcon.alt = 'car marker';
  carIcon.className = 'car-icon';

  markerElement.appendChild(markerCircle);
  markerElement.appendChild(carIcon);

  const sidebar = document.getElementById('sidebar');
  const sidebarTrigger = document.getElementById('sidebar-trigger');
  const closeSidebar = document.getElementById('close-sidebar');
  const findCarBtn = document.getElementById('find-car-btn');

  function openSidebar() {
    sidebar.classList.add('open');
    sidebarTrigger.classList.add('hidden');
    markerCircle.classList.add('active');
    loadDataFromServer();
  }

  function closeSidebarFunc() {
    sidebar.classList.remove('open');
    sidebarTrigger.classList.remove('hidden');
    markerCircle.classList.remove('active');
  }

  markerElement.addEventListener('click', (e) => {
    e.stopPropagation();
    if (sidebar.classList.contains('open')) {
      closeSidebarFunc();
    } else {
      openSidebar();
    }
  });

  const marker = new YMapMarker({ coordinates: center_coords }, markerElement);
  map.addChild(marker);

  const controls = new YMapControls({ position: 'right' });
  controls.addChild(new YMapRotateTiltControl({}));
  map.addChild(controls);

  map.update({
    camera: {
      tilt: 45 * deg_to_rad,
      azimuth: 30 * deg_to_rad
    }
  });

  sidebarTrigger.onclick = () => {
    openSidebar();
  };

  closeSidebar.onclick = () => {
    closeSidebarFunc();
  };

  findCarBtn.onclick = () => {
    map.update({
      location: { center: center_coords, duration: 600 }
    });
  };

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

  let animating = false;

  function animateMarkerTo(lon, lat) {
    const [startLon, startLat] = center_coords;
    const [endLon, endLat] = [lon, lat];
    const duration = 900;
    const startTime = performance.now();

    function step(currentTime) {
      const t = Math.min((currentTime - startTime) / duration, 1);
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
