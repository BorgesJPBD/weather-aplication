import { getWeatherInfo } from './weather-codes.js';
import { formatTemperature, formatWind, formatPrecipitation, getUnitSystem } from './units.js';
import {
  formatLongDate,
  formatLongWeekday,
  formatShortWeekday,
  formatHour,
  toDateKey,
  toHourKey,
} from './dates.js';

const $ = (selector) => document.querySelector(selector);

export const els = {
  announcer: $('#announcer'),
  appContent: $('#app-content'),
  errorState: $('#error-state'),
  retryButton: $('#retry-button'),
  searchForm: $('#search-form'),
  searchInput: $('#search-input'),
  searchProgress: $('#search-progress'),
  noResults: $('#no-results'),
  dashboard: $('#dashboard'),
  today: $('#today'),
  todayLoading: $('#today-loading'),
  todayContent: $('#today-content'),
  todayLocation: $('#today-location'),
  todayDate: $('#today-date'),
  todayIcon: $('#today-icon'),
  todayTemp: $('#today-temp'),
  metrics: {
    feelsLike: $('[data-metric="feelsLike"]'),
    humidity: $('[data-metric="humidity"]'),
    wind: $('[data-metric="wind"]'),
    precipitation: $('[data-metric="precipitation"]'),
  },
  dailyList: $('#daily-list'),
  hourlyList: $('#hourly-list'),
  dayDropdown: $('#day-dropdown'),
  dayTrigger: $('#day-trigger'),
  dayLabel: $('#day-label'),
  dayPanel: $('#day-panel'),
  unitsDropdown: $('#units-dropdown'),
  unitsPanel: $('#units-panel'),
  systemToggle: $('#system-toggle'),
  templates: {
    daily: $('#daily-card-template'),
    hourly: $('#hourly-item-template'),
    dayOption: $('#day-option-template'),
  },
};

// Remember what was last rendered so we only rebuild what actually changed.
let renderedForecast = null;
let renderedDate = null;
let lastAnnouncement = '';

const cloneTemplate = (template) => template.content.firstElementChild.cloneNode(true);

function createWeatherIcon(code, className) {
  const { src, label, emoji } = getWeatherInfo(code);
  const img = document.createElement('img');
  img.className = `weather-icon ${className}`;
  img.src = src;
  img.alt = label;
  img.decoding = 'async';
  img.dataset.fallback = emoji; // used by the image error handler in main.js
  return img;
}

function announce(message) {
  if (message === lastAnnouncement) return;
  lastAnnouncement = message;
  els.announcer.textContent = message;
}

/* -------------------------------------------------------------------------- */

export function render(state) {
  const { status, forecast, location, units } = state;

  els.errorState.hidden = status !== 'error';
  els.appContent.hidden = status === 'error';
  els.noResults.hidden = status !== 'not-found';
  els.dashboard.hidden = status === 'not-found';
  els.dashboard.setAttribute('aria-busy', String(status === 'loading'));
  // Show the small "Search in progress" panel when old data stays on screen.
  els.searchProgress.hidden = !(status === 'loading' && forecast);

  renderUnitsMenu(units);

  switch (status) {
    case 'loading': announce('Loading weather data'); break;
    case 'not-found': announce('No search result found'); break;
    case 'error': announce('Something went wrong. Please try again.'); break;
    case 'ready': announce(`Showing weather for ${formatLocation(location)}`); break;
  }

  if (!forecast) {
    renderSkeleton();
    return;
  }

  renderToday(state);
  renderMetrics(forecast.current, units);
  renderDaily(forecast.daily, units);
  renderDaySelector(state);
  renderHourly(state);
}

/* -------------------------------------------------------------------------- */

function formatLocation(location) {
  return [location?.name, location?.country].filter(Boolean).join(', ');
}

function renderUnitsMenu(units) {
  for (const [name, value] of Object.entries(units)) {
    const input = els.unitsPanel.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  }
  els.systemToggle.textContent =
    getUnitSystem(units) === 'imperial' ? 'Switch to Metric' : 'Switch to Imperial';
}

function renderSkeleton() {
  els.today.classList.add('today--loading');
  els.todayLoading.hidden = false;
  els.todayContent.hidden = true;

  Object.values(els.metrics).forEach((dd) => { dd.textContent = '—'; });

  const placeholders = (count, className) =>
    Array.from({ length: count }, () => {
      const li = document.createElement('li');
      li.className = className;
      li.setAttribute('aria-hidden', 'true');
      return li;
    });

  els.dailyList.replaceChildren(...placeholders(7, 'daily-card daily-card--skeleton'));
  els.hourlyList.replaceChildren(...placeholders(8, 'hourly-item hourly-item--skeleton'));

  els.dayLabel.textContent = '–';
  els.dayTrigger.disabled = true;
  renderedForecast = null;
  renderedDate = null;
}

function renderToday({ location, forecast, units }) {
  const { current } = forecast;

  els.today.classList.remove('today--loading');
  els.todayLoading.hidden = true;
  els.todayContent.hidden = false;

  els.todayLocation.textContent = formatLocation(location);
  els.todayDate.textContent = formatLongDate(current.time);
  els.todayTemp.textContent = formatTemperature(current.temperature, units);

  if (forecast !== renderedForecast) {
    els.todayIcon.replaceChildren(createWeatherIcon(current.weatherCode, 'today__icon'));
  }
}

function renderMetrics(current, units) {
  els.metrics.feelsLike.textContent = formatTemperature(current.feelsLike, units);
  els.metrics.humidity.textContent = `${current.humidity}%`;
  els.metrics.wind.textContent = formatWind(current.windSpeed, units);
  els.metrics.precipitation.textContent = formatPrecipitation(current.precipitation, units);
}

function renderDaily(days, units) {
  const cards = days.map((day) => {
    const card = cloneTemplate(els.templates.daily);
    card.querySelector('.daily-card__day').textContent = formatShortWeekday(day.date);
    card.querySelector('.daily-card__icon-slot')
      .replaceWith(createWeatherIcon(day.weatherCode, 'daily-card__icon'));
    card.querySelector('.daily-card__max').textContent = formatTemperature(day.max, units);
    card.querySelector('.daily-card__min').textContent = formatTemperature(day.min, units);
    return card;
  });
  els.dailyList.replaceChildren(...cards);
}

function renderDaySelector({ forecast, selectedDate }) {
  // Only rebuild the options for a new forecast: rebuilding on every render
  // would destroy the button that currently has keyboard focus.
  if (forecast !== renderedForecast) {
    const options = forecast.daily.map(({ date }) => {
      const item = cloneTemplate(els.templates.dayOption);
      const button = item.querySelector('button');
      button.dataset.date = date;
      button.textContent = formatLongWeekday(date);
      return item;
    });
    els.dayPanel.replaceChildren(...options);
  }

  els.dayPanel.querySelectorAll('[data-date]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.date === selectedDate));
  });

  els.dayTrigger.disabled = false;
  els.dayLabel.textContent = formatLongWeekday(selectedDate);
}

function renderHourly({ forecast, selectedDate, units }) {
  const isToday = selectedDate === forecast.daily[0].date;
  const currentHour = toHourKey(forecast.current.time);

  const hours = forecast.hourly.filter(
    ({ time }) => toDateKey(time) === selectedDate && (!isToday || toHourKey(time) >= currentHour),
  );

  const items = hours.map((hour) => {
    const item = cloneTemplate(els.templates.hourly);
    item.querySelector('.hourly-item__icon-slot')
      .replaceWith(createWeatherIcon(hour.weatherCode, 'hourly-item__icon'));
    item.querySelector('.hourly-item__time').textContent = formatHour(hour.time);
    item.querySelector('.hourly-item__temp').textContent = formatTemperature(hour.temperature, units);
    return item;
  });
  els.hourlyList.replaceChildren(...items);

  if (selectedDate !== renderedDate || forecast !== renderedForecast) {
    els.hourlyList.scrollTop = 0;
  }

  renderedDate = selectedDate;
  renderedForecast = forecast; // set last: other render steps compare against it
}
