import { createStore } from './store.js';
import { searchLocation, fetchForecast } from './api.js';
import { loadUnits, saveUnits, getUnitSystem, UNIT_SYSTEMS } from './units.js';
import { initDropdown } from './dropdown.js';
import { render, els } from './render.js';

// Until geolocation is added (extra #1), the app opens on the design's city.
const DEFAULT_LOCATION = { name: 'Berlin', country: 'Germany', latitude: 52.52, longitude: 13.41 };

const store = createStore({
  status: 'loading', // 'loading' | 'ready' | 'not-found' | 'error'
  location: null,
  forecast: null,
  selectedDate: null,
  units: loadUnits(),
});

store.subscribe(render);
render(store.getState());

/* --------------------------------------------------------------------------
   Data loading
   -------------------------------------------------------------------------- */

let controller = null;
let lastLoader = null;

/**
 * `getLocation` is a function so the same flow serves the default city,
 * a text search and (later) geolocation or favourites.
 * Starting a new load aborts the previous one, so a slow earlier response
 * can never overwrite a newer search (race condition).
 */
async function loadWeather(getLocation) {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  lastLoader = getLocation;

  store.setState({ status: 'loading' });

  try {
    const location = await getLocation(signal);
    if (!location) {
      store.setState({ status: 'not-found' });
      return;
    }

    const forecast = await fetchForecast(location, { signal });
    store.setState({
      status: 'ready',
      location,
      forecast,
      selectedDate: forecast.daily[0].date,
    });
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error(error);
    store.setState({ status: 'error' });
  }
}

loadWeather(async () => DEFAULT_LOCATION);

/* --------------------------------------------------------------------------
   Search
   -------------------------------------------------------------------------- */

els.searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = els.searchInput.value.trim();

  if (!query) {
    els.searchInput.focus();
    return;
  }

  loadWeather((signal) => searchLocation(query, { signal }));
});

els.retryButton.addEventListener('click', () => {
  if (lastLoader) loadWeather(lastLoader);
});

/* --------------------------------------------------------------------------
   Units
   -------------------------------------------------------------------------- */

initDropdown(els.unitsDropdown);

function updateUnits(units) {
  saveUnits(units);
  store.setState({ units });
}

// Radio names match the unit keys: temperature | wind | precipitation
els.unitsPanel.addEventListener('change', (event) => {
  const { name, value } = event.target;
  updateUnits({ ...store.getState().units, [name]: value });
});

els.systemToggle.addEventListener('click', () => {
  const next = getUnitSystem(store.getState().units) === 'imperial' ? 'metric' : 'imperial';
  updateUnits({ ...UNIT_SYSTEMS[next] });
});

/* --------------------------------------------------------------------------
   Day selector (hourly forecast)
   -------------------------------------------------------------------------- */

const dayDropdown = initDropdown(els.dayDropdown, {
  onOpen: (panel) => panel.querySelector('[aria-pressed="true"]')?.focus(),
});

els.dayPanel.addEventListener('click', (event) => {
  const option = event.target.closest('[data-date]');
  if (!option) return;
  store.setState({ selectedDate: option.dataset.date });
  dayDropdown.close({ returnFocus: true });
});

/* --------------------------------------------------------------------------
   Icon fallback: if an icon file is missing, show an emoji instead of a
   broken image. `error` doesn't bubble, so we listen in the capture phase.
   -------------------------------------------------------------------------- */

document.addEventListener(
  'error',
  (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.dataset.fallback) return;

    const span = document.createElement('span');
    span.className = `${img.className} weather-icon--emoji`;
    span.setAttribute('role', 'img');
    span.setAttribute('aria-label', img.alt);
    span.textContent = img.dataset.fallback;
    img.replaceWith(span);
  },
  true,
);
