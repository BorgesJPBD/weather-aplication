/**
 * The only module that knows the Open-Meteo URLs and response shapes.
 * Everything else works with the normalized objects returned here.
 */

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function getJson(url, signal) {
  let response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error; // cancelled on purpose, not a failure
    throw new ApiError('Network request failed');
  }

  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, response.status);
  }
  return response.json();
}

/** Resolves to the best match for `query`, or null when nothing is found. */
export async function searchLocation(query, { signal } = {}) {
  const params = new URLSearchParams({ name: query, count: 1, language: 'en', format: 'json' });
  const data = await getJson(`${GEOCODING_URL}?${params}`, signal);
  const [place] = data.results ?? [];
  if (!place) return null;

  return {
    name: place.name,
    country: place.country ?? '',
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

export async function fetchForecast({ latitude, longitude }, { signal } = {}) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,weather_code',
    hourly: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: 7,
  });
  const data = await getJson(`${FORECAST_URL}?${params}`, signal);
  return normalizeForecast(data);
}

/** Converts Open-Meteo's parallel arrays into arrays of objects. */
function normalizeForecast({ current, hourly, daily }) {
  return {
    current: {
      time: current.time,
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      precipitation: current.precipitation,
      windSpeed: current.wind_speed_10m,
      weatherCode: current.weather_code,
    },
    daily: daily.time.map((date, i) => ({
      date,
      weatherCode: daily.weather_code[i],
      max: daily.temperature_2m_max[i],
      min: daily.temperature_2m_min[i],
    })),
    hourly: hourly.time.map((time, i) => ({
      time,
      temperature: hourly.temperature_2m[i],
      weatherCode: hourly.weather_code[i],
    })),
  };
}
