/**
 * imageCompressor.js
 * Downscales captured frames to standard model input dimensions using
 * an off-screen <canvas>. Pure client-side, no server round-trip.
 */

const DEFAULT_SIZE = 224; // standard vision-transformer input

/**
 * Resizes a base64/data-URL image (or an HTMLImageElement/Blob) to a
 * square canvas of `size` x `size`, returning both a compressed JPEG
 * data URL (for on-screen preview/storage) and the raw canvas element
 * (for direct model consumption).
 *
 * @param {string|Blob} source - data URL, object URL, or Blob
 * @param {number} size - target width/height in pixels
 * @param {number} quality - JPEG quality 0-1 for the preview export
 */
export async function resizeImage(source, size = DEFAULT_SIZE, quality = 0.72) {
  const img = await loadImage(source);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // Center-crop to a square before scaling, so we don't squash the subject.
  const srcSize = Math.min(img.width, img.height);
  const sx = (img.width - srcSize) / 2;
  const sy = (img.height - srcSize) / 2;

  ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const approxBytes = Math.ceil((dataUrl.length * 3) / 4);

  return { canvas, dataUrl, width: size, height: size, approxBytes };
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode captured image.'));

    if (typeof source === 'string') {
      img.src = source;
    } else if (source instanceof Blob) {
      img.src = URL.createObjectURL(source);
    } else {
      reject(new Error('Unsupported image source type.'));
    }
  });
}

/**
 * Converts a canvas to a normalized Float32Array in CHW layout
 * ([0,1] scaled, ImageNet-mean/std normalized) for models that expect
 * raw tensor input rather than an image element directly.
 */
export function canvasToTensorData(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);

  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  const float32 = new Float32Array(3 * width * height);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;

    float32[i] = (r - mean[0]) / std[0];
    float32[width * height + i] = (g - mean[1]) / std[1];
    float32[2 * width * height + i] = (b - mean[2]) / std[2];
  }

  return { data: float32, dims: [1, 3, height, width] };
}
