/**
 * All values are fetched from the API in metric and converted on the client.
 * Trade-off: switching units is instant and needs no extra request, but the
 * conversions and rounding rules below are now our responsibility.
 */

export const UNIT_SYSTEMS = {
  metric: { temperature: 'celsius', wind: 'kmh', precipitation: 'mm' },
  imperial: { temperature: 'fahrenheit', wind: 'mph', precipitation: 'inch' },
};

const CONVERTERS = {
  temperature: { celsius: (c) => c, fahrenheit: (c) => (c * 9) / 5 + 32 },
  wind: { kmh: (kmh) => kmh, mph: (kmh) => kmh / 1.609344 },
  precipitation: { mm: (mm) => mm, inch: (mm) => mm / 25.4 },
};

const STORAGE_KEY = 'weather-now:units';

/** Rounds to `decimals` places and avoids displaying "-0". */
function round(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor || 0;
}

export function formatTemperature(celsius, units) {
  return `${round(CONVERTERS.temperature[units.temperature](celsius))}°`;
}

export function formatWind(kmh, units) {
  const value = round(CONVERTERS.wind[units.wind](kmh));
  return `${value} ${units.wind === 'kmh' ? 'km/h' : 'mph'}`;
}

export function formatPrecipitation(mm, units) {
  if (units.precipitation === 'inch') {
    return `${round(CONVERTERS.precipitation.inch(mm), 2)} in`;
  }
  return `${round(mm, 1)} mm`;
}

/** Returns "metric" | "imperial" when every unit matches a system, otherwise null (mixed). */
export function getUnitSystem(units) {
  const match = Object.entries(UNIT_SYSTEMS).find(([, system]) =>
    Object.keys(system).every((dimension) => system[dimension] === units[dimension]),
  );
  return match ? match[0] : null;
}

function isValidUnits(units) {
  return (
    units !== null &&
    typeof units === 'object' &&
    Object.keys(CONVERTERS).every((dimension) =>
      Object.hasOwn(CONVERTERS[dimension], units[dimension]),
    )
  );
}

export function loadUnits() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidUnits(saved)) return saved;
  } catch {
    // Storage blocked (private mode) or corrupted value: fall back to metric.
  }
  return { ...UNIT_SYSTEMS.metric };
}

export function saveUnits(units) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
  } catch {
    // Not critical: preferences just won't persist.
  }
}
