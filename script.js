const deg_to_rad = Math.PI / 180;

let center_coords = null;
let currentStatus = 'ok'; // Текущий статус для отслеживания изменений

function setCookie(name, value, days = 365) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + date.toUTCString();
  document.cookie = name + '=' + value + ';' + expires + ';path=/';
}

function getCookie(name) {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Функция для получения пути к картинке в зависимости от статуса
function getMarkerImage(status) {
  if (status === 'warning') {
    return 'yellow.png';
  } else {
    if (status === 'error') {
      return 'red.png';
    } else {
      // 'ok' или null
      return '49568490-4ac8-474e-b8ba-35137d30d9e2.png';
    }
  }
}

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
    behaviors: ['drag', 'scrollZoom', 'dblClick', 'mouseTilt', 'mouseRotate', 'pinchRotate', 'pinchZoom', 'panTilt']
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

  // Создаем элементы для пульсации (две волны)
  const pulseWave1 = document.createElement('div');
  pulseWave1.className = 'pulse-wave';

  const pulseWave2 = document.createElement('div');
  pulseWave2.className = 'pulse-wave-2';

  markerElement.appendChild(pulseWave1);
  markerElement.appendChild(pulseWave2);
  markerElement.appendChild(markerCircle);
  markerElement.appendChild(carIcon);

  const sidebar = document.getElementById('sidebar');
  const sidebarTrigger = document.getElementById('sidebar-trigger');
  const closeSidebar = document.getElementById('close-sidebar');
  const findCarBtn = document.getElementById('find-car-btn');
  const resizeHandle = document.getElementById('resize-handle');

  const savedHeight = getCookie('sidebarHeight');
  if (savedHeight) {
    const height = parseInt(savedHeight, 10);
    const minHeight = 300;
    const maxHeight = window.innerHeight * 0.9;

    if (height >= minHeight && height <= maxHeight) {
      sidebar.style.height = `${height}px`;
    }
  }

  // Функционал изменения размера
  let isResizing = false;
  let startY = 0;
  let startHeight = 0;

  function startResize(e) {
    isResizing = true;
    sidebar.classList.add('resizing');

    startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    startHeight = sidebar.offsetHeight;

    e.preventDefault();
  }

  function doResize(e) {
    if (!isResizing) return;

    const currentY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    const deltaY = currentY - startY;
    const newHeight = startHeight + deltaY;

    const minHeight = 300;
    const maxHeight = window.innerHeight * 0.9;

    if (newHeight >= minHeight && newHeight <= maxHeight) {
      sidebar.style.height = `${newHeight}px`;
    }
  }

  function stopResize() {
    if (isResizing) {
      isResizing = false;
      sidebar.classList.remove('resizing');

      const currentHeight = sidebar.offsetHeight;
      setCookie('sidebarHeight', currentHeight);
    }
  }

  resizeHandle.addEventListener('mousedown', startResize);
  document.addEventListener('mousemove', doResize);
  document.addEventListener('mouseup', stopResize);

  resizeHandle.addEventListener('touchstart', startResize, { passive: false });
  document.addEventListener('touchmove', doResize, { passive: false });
  document.addEventListener('touchend', stopResize);

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

  // Функция обновления статуса маркера
  function updateMarkerStatus(status) {
    if (status === currentStatus) return; // Не обновляем, если статус не изменился

    currentStatus = status;

    // Обновляем изображение маркера
    carIcon.src = getMarkerImage(status);

    // Удаляем все классы статусов
    markerCircle.classList.remove('status-ok', 'status-warning', 'status-error');

    // Добавляем нужный класс в зависимости от статуса
    if (status === 'warning') {
      markerCircle.classList.add('status-warning');
    } else {
      if (status === 'error') {
        markerCircle.classList.add('status-error');
      } else {
        // 'ok' или null
        markerCircle.classList.add('status-ok');
      }
    }

    // Управляем пульсацией (только для error)
    if (status === 'error') {
      pulseWave1.classList.add('active');
      pulseWave2.classList.add('active');
    } else {
      pulseWave1.classList.remove('active');
      pulseWave2.classList.remove('active');
    }
  }

  function updatePanelData(data) {
    const tableBody = document.querySelector('.info-table');
    tableBody.innerHTML = '';

    data.forEach((item) => {
      // Исключаем поля longitude, latitude и status из таблицы
      if (item.field !== 'longitude' && item.field !== 'latitude' && item.field !== 'status') {
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
      const statusItem = data.find((i) => i.field === 'status');
      const status = statusItem ? statusItem.value : null;

      console.log('Coordinates:', lon, lat);
      console.log('Status:', status);

      // Обновляем статус маркера
      updateMarkerStatus(status);

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
