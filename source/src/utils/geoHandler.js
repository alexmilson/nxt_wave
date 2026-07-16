/**
 * geoHandler.js
 * Thin wrapper around the browser's native Geolocation API.
 * No network calls — coordinates come directly from the device.
 */

/**
 * Resolves the device's current GPS coordinates.
 * @param {Object} [options]
 * @param {number} [options.timeout=8000] ms before giving up
 * @returns {Promise<{lat: number, lon: number, accuracy: number, timestamp: number}>}
 */
export function getCurrentPosition(options = {}) {
  const { timeout = 8000, enableHighAccuracy = true, maximumAge = 0 } = options;

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported on this device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp
        });
      },
      (err) => {
        reject(new Error(mapGeoError(err)));
      },
      { timeout, enableHighAccuracy, maximumAge }
    );
  });
}

function mapGeoError(err) {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Location permission denied. Enable location access to tag this report with GPS coordinates.';
    case err.POSITION_UNAVAILABLE:
      return 'Location unavailable. Continuing without GPS coordinates.';
    case err.TIMEOUT:
      return 'Location request timed out. Continuing without GPS coordinates.';
    default:
      return 'Unknown location error. Continuing without GPS coordinates.';
  }
}

/**
 * Formats coordinates to a fixed precision suitable for compact encoding.
 * 5 decimal places is ~1.1m precision, sufficient for field triage.
 */
export function formatCoords(lat, lon, precision = 5) {
  return {
    lat: Number(lat.toFixed(precision)),
    lon: Number(lon.toFixed(precision))
  };
}
