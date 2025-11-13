const deg_to_rad = Math.PI / 180;

let center_coords = null;
let currentStatus = null;
let calendar = null;
let selectedDate = null;
let routeLine = null;
let isRouteVisible = false;
let currentRouteColor = '#4A90E2';

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

function getMarkerImage(status) {
  if (status === 'warning') {
    return 'yellow.png';
  } else {
    if (status === 'error') {
      return 'red.png';
    } else {
      return '49568490-4ac8-474e-b8ba-35137d30d9e2.png';
    }
  }
}

async function fetchAPI(endpoint) {
  try {
    const response = await fetch(`https://enteneller.ru/moscow_car/api/${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Ошибка при запросе к ${endpoint}:`, error);
    throw error;
  }
}

async function getInitialCoordinates() {
  try {
    const data = await fetchAPI('sensors/get/');
    const lon = parseFloat(data.find((i) => i.field === 'longitude')?.value);
    const lat = parseFloat(data.find((i) => i.field === 'latitude')?.value);

    if (!lon || !lat) throw new Error('Нет координат в ответе API');

    return [lon, lat];
  } catch (error) {
    console.error('Ошибка при первичной загрузке координат:', error);
    return [37.617644, 55.755819];
  }
}

function getTodayISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function initCalendar(initialDate = null) {
  if (typeof VanillaCalendar !== 'undefined') {
    const dateToUse = initialDate || getTodayISO();
    const dateObj = new Date(dateToUse);

    const options = {
      settings: {
        lang: 'ru',
        iso8601: true,
        range: {
          min: '2020-01-01',
          max: '2026-12-31'
        },
        selection: {
          day: 'single'
        },
        selected: {
          dates: [dateToUse],
          month: dateObj.getMonth(),
          year: dateObj.getFullYear()
        },
        visibility: {
          theme: 'light'
        }
      },
      actions: {
        clickDay(e, self) {
          if (self.selectedDates && self.selectedDates.length > 0) {
            selectedDate = self.selectedDates[0];
            console.log('Выбрана дата:', selectedDate);

            const dateBtnText = document.getElementById('date-btn-text');
            dateBtnText.textContent = formatDate(selectedDate);

            self.settings.selected.dates = [selectedDate];
            self.update();

            const calendarModal = document.getElementById('calendar-modal');
            calendarModal.classList.remove('show');

            const dateSelectBtn = document.getElementById('date-select-btn');
            dateSelectBtn.classList.remove('active');

            if (isRouteVisible) {
              loadRouteForDate(selectedDate);
            }
          }
        }
      }
    };

    if (calendar) {
      calendar.destroy();
    }

    calendar = new VanillaCalendar('#calendar', options);
    calendar.init();

    if (!selectedDate) {
      selectedDate = dateToUse;
      const dateBtnText = document.getElementById('date-btn-text');
      if (dateBtnText) {
        dateBtnText.textContent = formatDate(dateToUse);
      }
    }
  } else {
    setTimeout(() => initCalendar(initialDate), 100);
  }
}

function positionModal(modalId, buttonElement) {
  const modal = document.getElementById(modalId);
  const modalContent = modal.querySelector(
    `${modalId === 'calendar-modal' ? '.calendar-modal-content' : '.color-modal-content'}`
  );

  if (!modal || !modalContent || !buttonElement) return;

  const isMobile = window.innerWidth <= 768 || window.innerHeight <= 768;

  if (isMobile) {
    modalContent.style.left = '';
    modalContent.style.bottom = '';
  } else {
    const btnRect = buttonElement.getBoundingClientRect();

    setTimeout(() => {
      const modalWidth = modalContent.offsetWidth;
      const btnCenterX = btnRect.left + btnRect.width / 2;
      let left = btnCenterX - modalWidth / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - modalWidth - 8));
      modalContent.style.left = `${left}px`;

      const bottom = window.innerHeight - btnRect.top + 12;
      modalContent.style.bottom = `${bottom}px`;
    }, 0);
  }
}

(async () => {
  center_coords = await getInitialCoordinates();

  await ymaps3.ready;

  ymaps3.import.registerCdn('https://cdn.jsdelivr.net/npm/{package}', ['@yandex/ymaps3-default-ui-theme@0.0.7']);

  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker, YMapControls, YMapFeature } = ymaps3;

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
  const dateSelectBtn = document.getElementById('date-select-btn');
  const toggleRouteBtn = document.getElementById('toggle-route-btn');
  const calendarModal = document.getElementById('calendar-modal');
  const resizeHandle = document.getElementById('resize-handle');
  const resetDateBtn = document.getElementById('reset-date-btn');
  const colorRouteBtn = document.getElementById('color-route-btn');
  const colorModal = document.getElementById('color-modal');
  const colorOptions = document.querySelectorAll('.color-option');
  const routeColorCircle = document.querySelector('.route-color-circle');

  const savedHeight = getCookie('sidebarHeight');
  if (savedHeight) {
    const height = parseInt(savedHeight, 10);
    const minHeight = 300;
    const maxHeight = window.innerHeight * 0.9;

    if (height >= minHeight && height <= maxHeight) {
      sidebar.style.height = `${height}px`;
    }
  }

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

  function updateRouteLine(coordinates) {
    if (routeLine) {
      map.removeChild(routeLine);
      routeLine = null;
    }

    if (coordinates && coordinates.length >= 2) {
      const convertedCoordinates = coordinates.map((coord) => [coord[1], coord[0]]);

      routeLine = new YMapFeature({
        geometry: {
          type: 'LineString',
          coordinates: convertedCoordinates
        },
        style: {
          stroke: [
            {
              color: currentRouteColor,
              width: 6
            }
          ]
        }
      });

      map.addChild(routeLine);
      console.log('Линия маршрута отрисована:', convertedCoordinates.length, 'точек');
    }
  }

  function hideRouteLine() {
    if (routeLine) {
      map.removeChild(routeLine);
      routeLine = null;
      console.log('Линия маршрута скрыта');
    }
  }

  async function loadRouteForDate(date) {
    try {
      console.log('Загрузка маршрута для даты:', date);
      const coordinates = await fetchAPI('map/get_points/');
      console.log('Получены координаты:', coordinates.length, 'точек');

      updateRouteLine(coordinates);

      if (coordinates && coordinates.length > 0) {
        const lastPoint = coordinates[coordinates.length - 1];
        map.update({
          location: {
            center: [lastPoint[1], lastPoint[0]],
            duration: 600
          }
        });
      }
    } catch (error) {
      console.error('Ошибка при загрузке маршрута:', error);
    }
  }

  function openSidebar() {
    sidebar.classList.add('open');
    sidebarTrigger.classList.add('hidden');
    markerCircle.classList.add('active');
    loadDataFromServer();

    if (!calendar) {
      initCalendar();
    }
  }

  function closeSidebarFunc() {
    sidebar.classList.remove('open');
    sidebarTrigger.classList.remove('hidden');
    markerCircle.classList.remove('active');
    calendarModal.classList.remove('show');
    dateSelectBtn.classList.remove('active');
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

  dateSelectBtn.onclick = () => {
    const calendarModal = document.getElementById('calendar-modal');
    const isVisible = calendarModal.classList.contains('show');
    if (!isVisible) {
      calendarModal.classList.add('show');
      dateSelectBtn.classList.add('active');
      positionModal('calendar-modal', dateSelectBtn);
    } else {
      calendarModal.classList.remove('show');
      dateSelectBtn.classList.remove('active');
    }
  };

  toggleRouteBtn.onclick = () => {
    isRouteVisible = !isRouteVisible;

    if (isRouteVisible) {
      toggleRouteBtn.classList.add('active');
      colorRouteBtn.style.display = 'flex';

      if (selectedDate) {
        loadRouteForDate(selectedDate);
      }
    } else {
      toggleRouteBtn.classList.remove('active');
      colorRouteBtn.style.display = 'none';

      hideRouteLine();
    }
  };

  colorRouteBtn.onclick = () => {
    const isVisible = colorModal.classList.contains('show');
    if (!isVisible) {
      colorModal.classList.add('show');
      colorRouteBtn.classList.add('active');
      positionModal('color-modal', colorRouteBtn);
    } else {
      colorModal.classList.remove('show');
      colorRouteBtn.classList.remove('active');
    }
  };

  colorOptions.forEach((option) => {
    option.addEventListener('click', (e) => {
      const selectedColor = e.target.dataset.color;

      currentRouteColor = selectedColor;

      routeColorCircle.style.background = selectedColor;

      if (isRouteVisible && selectedDate) {
        loadRouteForDate(selectedDate);
      }

      colorModal.classList.remove('show');
      colorRouteBtn.classList.remove('active');

      colorOptions.forEach((opt) => opt.classList.remove('selected'));
      e.target.classList.add('selected');
    });
  });

  resetDateBtn.addEventListener('click', () => {
    const todayISO = getTodayISO();

    console.log('Сброс на дату:', todayISO);

    selectedDate = todayISO;

    initCalendar(todayISO);

    const dateBtnText = document.getElementById('date-btn-text');
    if (dateBtnText) {
      dateBtnText.textContent = formatDate(todayISO);
    }

    if (isRouteVisible) {
      loadRouteForDate(todayISO);
    }

    console.log('Дата успешно сброшена на текущий день');
  });

  calendarModal.addEventListener('click', (e) => {
    if (e.target === calendarModal) {
      calendarModal.classList.remove('show');
      dateSelectBtn.classList.remove('active');
    }
  });

  colorModal.addEventListener('click', (e) => {
    if (e.target === colorModal) {
      colorModal.classList.remove('show');
      colorRouteBtn.classList.remove('active');
    }
  });

  window.addEventListener('resize', () => {
    const calendarModal = document.getElementById('calendar-modal');
    const dateSelectBtn = document.getElementById('date-select-btn');
    const colorModal = document.getElementById('color-modal');
    const colorRouteBtn = document.getElementById('color-route-btn');

    if (calendarModal.classList.contains('show')) {
      positionModal('calendar-modal', dateSelectBtn);
    }
    if (colorModal.classList.contains('show')) {
      positionModal('color-modal', colorRouteBtn);
    }
  });

  function updateMarkerStatus(status) {
    if (status === currentStatus) return;

    currentStatus = status;

    carIcon.src = getMarkerImage(status);

    markerCircle.classList.remove('status-ok', 'status-warning', 'status-error');

    if (status === 'warning') {
      markerCircle.classList.add('status-warning');
    } else {
      if (status === 'error') {
        markerCircle.classList.add('status-error');
      } else {
        markerCircle.classList.add('status-ok');
      }
    }

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
      const data = await fetchAPI('sensors/get/');

      const lon = parseFloat(data.find((i) => i.field === 'longitude')?.value);
      const lat = parseFloat(data.find((i) => i.field === 'latitude')?.value);
      const statusItem = data.find((i) => i.field === 'status');
      const status = statusItem ? statusItem.value : 'ok';

      console.log('Coordinates:', lon, lat);
      console.log('Status:', status);

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
