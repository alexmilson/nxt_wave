/**
 * visionHeuristics.js
 * Analyzes a captured photo entirely via <canvas> pixel math — no
 * downloaded model, no WASM runtime, no network fetch of any kind.
 *
 * This replaces an earlier approach that loaded a quantized ONNX
 * vision model over the network via @xenova/transformers. That
 * approach depends on the Hugging Face CDN being reachable and on
 * onnxruntime-web's WASM backend initializing correctly, both of
 * which proved unreliable on GitHub Pages (a static host with no
 * control over CORS or cross-origin-isolation headers). Pixel
 * heuristics have no such dependency: they run synchronously, in any
 * browser, with zero possibility of a load failure.
 *
 * HONEST SCOPE NOTE: this is a coarse visual heuristic, not a trained
 * classifier and not a diagnosis. It flags color/texture signals
 * (true red hues distinct from ordinary skin warmth, dark/charred
 * tone, irregular hue texture) that commonly correlate with burns,
 * inflammation, or open wounds, and always defers to the operator's
 * manual severity selection, which is authoritative — see
 * triageEngine.js.
 *
 * Classification uses HSV (hue/saturation/value), not raw RGB
 * comparisons — this matters because ordinary skin across the full
 * range of skin tones is R>G>B in raw RGB (a mid-orange hue, roughly
 * 15-40°), so a naive "is red the dominant channel" check flags any
 * skin as an injury. Restricting to hues near true red (0±12°) at
 * meaningful saturation avoids that false positive.
 */

const LABELS = {
  CHARRED: 'Dark/charred tissue signal',
  BURN: 'True-red hue detected — possible burn, inflammation, or bleeding',
  IRREGULAR: 'Irregular hue texture — possible open wound',
  UNIFORM: 'Low variance — no strong injury signal'
};

// Tunable thresholds, isolated here for clarity.
const CHAR_VALUE_MAX = 0.22; // value (brightness) below this = charred/near-black
const RED_HUE_SPAN = 12; // degrees either side of 0/360 counted as "true red"
const RED_SAT_MIN = 0.35; // minimum saturation to count as true red (excludes washed-out pink)
const RED_VALUE_MIN = 0.15; // excludes pixels already counted as charred
const CHROMA_SAT_MIN = 0.15; // minimum saturation for a pixel to contribute to hue-variance sampling
const CHROMA_VALUE_MIN = 0.1;

/**
 * Runs the heuristic pass over a canvas already sized to a standard
 * analysis resolution (see imageCompressor.js).
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {Array<{label: string, score: number}>} sorted descending by score
 */
export function analyzeImage(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);

  const totalPixels = width * height;
  let redCount = 0;
  let charCount = 0;
  let hueSum = 0;
  let hueSumSq = 0;
  let hueSamples = 0;

  for (let i = 0; i < data.length; i += 4) {
    const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);

    if (v < CHAR_VALUE_MAX) {
      charCount++;
    }

    if ((h < RED_HUE_SPAN || h > 360 - RED_HUE_SPAN) && s > RED_SAT_MIN && v > RED_VALUE_MIN) {
      redCount++;
    }

    if (s > CHROMA_SAT_MIN && v > CHROMA_VALUE_MIN) {
      hueSum += h;
      hueSumSq += h * h;
      hueSamples++;
    }
  }

  const redRatio = redCount / totalPixels;
  const charRatio = charCount / totalPixels;

  let hueVarianceNorm = 0;
  if (hueSamples > 8) {
    const mean = hueSum / hueSamples;
    const variance = hueSumSq / hueSamples - mean * mean;
    // Hue is 0-360; normalize the std dev against a reasonable
    // real-world ceiling (~60°) so the score sits roughly in [0, 1].
    hueVarianceNorm = clamp(Math.sqrt(Math.max(variance, 0)) / 60, 0, 1);
  }

  const scores = {
    [LABELS.CHARRED]: clamp(charRatio * 3.2, 0, 1),
    [LABELS.BURN]: clamp(redRatio * 2.2 + hueVarianceNorm * 0.1, 0, 1),
    [LABELS.IRREGULAR]: clamp(hueVarianceNorm * 0.85 + redRatio * 0.2, 0, 1),
    [LABELS.UNIFORM]: clamp(1 - Math.max(redRatio * 2.2, charRatio * 3.2, hueVarianceNorm), 0, 1)
  };

  return Object.entries(scores)
    .map(([label, score]) => ({ label, score }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Converts 0-255 RGB to [hue 0-360, saturation 0-1, value 0-1].
 */
function rgbToHsv(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const chroma = max - min;

  let hue = 0;
  if (chroma > 0) {
    if (max === rn) {
      hue = ((gn - bn) / chroma) % 6;
    } else if (max === gn) {
      hue = (bn - rn) / chroma + 2;
    } else {
      hue = (rn - gn) / chroma + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const saturation = max === 0 ? 0 : chroma / max;
  const value = max;

  return [hue, saturation, value];
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

export { LABELS as HEURISTIC_LABELS };
