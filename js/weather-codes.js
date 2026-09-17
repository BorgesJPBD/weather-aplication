/**
 * Maps Open-Meteo WMO weather codes to the challenge's icon set.
 * Code reference: https://open-meteo.com/en/docs (section "WMO Weather interpretation codes")
 */

const ICON_DIR = './assets/images/';

const CONDITIONS = {
  sunny: { file: 'icon-sunny.webp', label: 'Clear sky', emoji: '☀️' },
  partlyCloudy: { file: 'icon-partly-cloudy.webp', label: 'Partly cloudy', emoji: '⛅' },
  overcast: { file: 'icon-overcast.webp', label: 'Overcast', emoji: '☁️' },
  fog: { file: 'icon-fog.webp', label: 'Fog', emoji: '🌫️' },
  drizzle: { file: 'icon-drizzle.webp', label: 'Drizzle', emoji: '🌦️' },
  rain: { file: 'icon-rain.webp', label: 'Rain', emoji: '🌧️' },
  snow: { file: 'icon-snow.webp', label: 'Snow', emoji: '🌨️' },
  storm: { file: 'icon-storm.webp', label: 'Thunderstorm', emoji: '⛈️' },
};

const CODE_GROUPS = [
  [[0], 'sunny'],
  [[1, 2], 'partlyCloudy'],
  [[3], 'overcast'],
  [[45, 48], 'fog'],
  [[51, 53, 55, 56, 57], 'drizzle'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'rain'],
  [[71, 73, 75, 77, 85, 86], 'snow'],
  [[95, 96, 99], 'storm'],
];

const CODE_TO_CONDITION = new Map(
  CODE_GROUPS.flatMap(([codes, key]) => codes.map((code) => [code, key])),
);

/** Unknown or missing codes fall back to "overcast" instead of breaking the UI. */
export function getWeatherInfo(code) {
  const key = CODE_TO_CONDITION.get(code) ?? 'overcast';
  const { file, label, emoji } = CONDITIONS[key];
  return { key, label, emoji, src: ICON_DIR + file };
}
