/**
 * encoder.js
 * Packs triage results + GPS + timestamp into a dense, URL-safe string
 * suitable for a low-density QR code, SMS, or ham-radio voice/text relay.
 *
 * Format (pipe-delimited, fixed field order — no keys, to save bytes):
 *   WT1|<categoryCode>|<latE5>|<lonE5>|<epochMin>|<confidencePct>|<findingsCode>
 *
 * Example: WT1|R|1738503|7848670|28471033|91|BURN2
 *
 * - WT1            protocol tag + version, lets a receiver validate the format
 * - categoryCode    single char: I=Immediate(Red) D=Delayed(Yellow) M=Minor(Green) X=Expectant(Black)
 * - latE5 / lonE5   lat/lon * 1e5, truncated to int (removes decimal point + sign handled by leading '-')
 * - epochMin        minutes since Unix epoch (not seconds) — halves digit count, 1-minute resolution is enough
 * - confidencePct   integer 0-100
 * - findingsCode    short alnum code from the clinical code table below
 */

const START_CATEGORY_CODE = {
  IMMEDIATE: 'I',
  DELAYED: 'D',
  MINOR: 'M',
  EXPECTANT: 'X'
};

const CATEGORY_FROM_CODE = Object.fromEntries(
  Object.entries(START_CATEGORY_CODE).map(([k, v]) => [v, k])
);

// Compact alnum codes for common field-triage findings, kept short so the
// packed string — and therefore the QR code — stays as low-density as
// possible. Extend as needed; unrecognized findings fall back to 'UNK'.
export const FINDINGS_CODE_TABLE = {
  BURN1: 'First-degree burn',
  BURN2: 'Second-degree burn',
  BURN3: 'Third-degree burn',
  FRACT: 'Suspected fracture',
  LACER: 'Laceration / open wound',
  HEMOR: 'Active hemorrhage',
  CRUSH: 'Crush injury',
  RESP: 'Respiratory distress',
  UNRES: 'Unresponsive / altered consciousness',
  AMBUL: 'Ambulatory, minor visible injury',
  UNK: 'Unclassified finding'
};

/**
 * Packs a triage result into the dense WT1 payload string.
 * @param {Object} triage - { category, confidence, findingsCode }
 * @param {Object} coords - { lat, lon } (optional)
 * @param {number} [timestampMs] - defaults to Date.now()
 */
export function packPayload(triage, coords, timestampMs = Date.now()) {
  const categoryCode = START_CATEGORY_CODE[triage.category] || 'D';
  const findingsCode = FINDINGS_CODE_TABLE[triage.findingsCode] ? triage.findingsCode : 'UNK';
  const confidencePct = Math.round(clamp(triage.confidence * 100, 0, 100));
  const epochMin = Math.floor(timestampMs / 60000);

  const latE5 = coords ? Math.round(coords.lat * 1e5) : '';
  const lonE5 = coords ? Math.round(coords.lon * 1e5) : '';

  return ['WT1', categoryCode, latE5, lonE5, epochMin, confidencePct, findingsCode].join('|');
}

/**
 * Reverses packPayload — used by the receiving/relief-side app or for
 * self-verification before rendering the QR code.
 */
export function unpackPayload(payload) {
  const parts = payload.split('|');
  if (parts.length !== 7 || parts[0] !== 'WT1') {
    throw new Error('Unrecognized WhisperTriage payload format.');
  }

  const [, categoryCode, latE5, lonE5, epochMin, confidencePct, findingsCode] = parts;

  return {
    category: CATEGORY_FROM_CODE[categoryCode] || 'DELAYED',
    coords:
      latE5 !== '' && lonE5 !== ''
        ? { lat: Number(latE5) / 1e5, lon: Number(lonE5) / 1e5 }
        : null,
    timestamp: Number(epochMin) * 60000,
    confidence: Number(confidencePct) / 100,
    findingsCode,
    findingsLabel: FINDINGS_CODE_TABLE[findingsCode] || 'Unclassified finding'
  };
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

export { START_CATEGORY_CODE };
