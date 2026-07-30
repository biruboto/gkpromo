const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_SOURCE_EDGE = 1024;
const RASTER_IMAGE_TYPE = /^image\/(?:avif|bmp|gif|jpe?g|png|vnd\.microsoft\.icon|webp|x-icon)$/i;
const RASTER_IMAGE_NAME = /\.(?:avif|bmp|gif|ico|jpe?g|png|webp)$/i;
const BAYER_MATRICES = {
  bayer2: [[0, 2], [3, 1]],
  bayer4: [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
};
const DIFFUSION_KERNELS = {
  floyd: [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]],
  atkinson: [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]]
};

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The image file could not be read.'));
    reader.readAsDataURL(blob);
  });
}

function decodeImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected source is not a readable raster image.'));
    image.src = source;
  });
}

function normalizeSource(image) {
  const scale = Math.min(1, MAX_SOURCE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}

function parseHexColor(color) {
  const normalized = color.replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(normalized)) return normalized.split('').map(value => Number.parseInt(value + value, 16));
  if (/^[0-9a-f]{6}$/i.test(normalized)) return [0, 2, 4].map(index => Number.parseInt(normalized.slice(index, index + 2), 16));
  return [255, 255, 255];
}

export function createMonochromeMask(pixels, width, height, settings) {
  const luminance = new Float32Array(width * height);
  const visible = new Uint8Array(width * height);
  const contrast = clamp(settings.contrast, 50, 200) / 100;
  for (let index = 0; index < luminance.length; index += 1) {
    const pixelIndex = index * 4;
    visible[index] = pixels[pixelIndex + 3] >= 32 ? 1 : 0;
    const value = pixels[pixelIndex] * .2126 + pixels[pixelIndex + 1] * .7152 + pixels[pixelIndex + 2] * .0722;
    luminance[index] = clamp((value - 128) * contrast + 128, 0, 255);
  }

  const mask = new Uint8Array(luminance.length);
  const threshold = clamp(settings.threshold, 0, 255);
  const amount = clamp(settings.ditherAmount, 0, 100) / 100;
  const matrix = BAYER_MATRICES[settings.dither];
  const kernel = DIFFUSION_KERNELS[settings.dither];

  if (matrix) {
    const size = matrix.length;
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!visible[index]) continue;
      const offset = ((matrix[y % size][x % size] + .5) / (size * size) - .5) * 255 * amount;
      mask[index] = luminance[index] < threshold + offset ? 1 : 0;
    }
  } else if (kernel) {
    const working = new Float32Array(luminance);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!visible[index]) continue;
      const quantized = working[index] >= threshold ? 255 : 0;
      mask[index] = quantized ? 0 : 1;
      const error = (working[index] - quantized) * amount;
      kernel.forEach(([offsetX, offsetY, weight]) => {
        const nextX = x + offsetX, nextY = y + offsetY;
        if (nextX < 0 || nextX >= width || nextY >= height) return;
        const nextIndex = nextY * width + nextX;
        if (visible[nextIndex]) working[nextIndex] += error * weight;
      });
    }
  } else {
    for (let index = 0; index < mask.length; index += 1) if (visible[index]) mask[index] = luminance[index] < threshold ? 1 : 0;
  }

  if (settings.invert) {
    for (let index = 0; index < mask.length; index += 1) if (visible[index]) mask[index] = mask[index] ? 0 : 1;
  }
  return mask;
}

export function cropMaskToInk(sourceMask, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (!sourceMask[y * width + x]) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left || bottom < top) return { mask: new Uint8Array(0), width: 0, height: 0 };
  const croppedWidth = right - left + 1, croppedHeight = bottom - top + 1;
  const croppedMask = new Uint8Array(croppedWidth * croppedHeight);
  for (let y = 0; y < croppedHeight; y += 1) {
    const sourceStart = (top + y) * width + left;
    croppedMask.set(sourceMask.subarray(sourceStart, sourceStart + croppedWidth), y * croppedWidth);
  }
  return { mask: croppedMask, width: croppedWidth, height: croppedHeight };
}

export function calculateOtsuThreshold(pixels, contrastPercent = 100) {
  const histogram = new Uint32Array(256);
  const contrast = clamp(contrastPercent, 50, 200) / 100;
  let total = 0, sum = 0;
  for (let pixelIndex = 0; pixelIndex < pixels.length; pixelIndex += 4) {
    if (pixels[pixelIndex + 3] < 32) continue;
    const luminance = pixels[pixelIndex] * .2126 + pixels[pixelIndex + 1] * .7152 + pixels[pixelIndex + 2] * .0722;
    const value = Math.round(clamp((luminance - 128) * contrast + 128, 0, 255));
    histogram[value] += 1; total += 1; sum += value;
  }
  if (!total) return 128;

  let backgroundWeight = 0, backgroundSum = 0, maximumVariance = -1, bestStart = 0, bestEnd = 0;
  for (let threshold = 0; threshold < 256; threshold += 1) {
    backgroundWeight += histogram[threshold];
    if (!backgroundWeight) continue;
    const foregroundWeight = total - backgroundWeight;
    if (!foregroundWeight) break;
    backgroundSum += threshold * histogram[threshold];
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (sum - backgroundSum) / foregroundWeight;
    const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;
    if (variance > maximumVariance) {
      maximumVariance = variance; bestStart = threshold; bestEnd = threshold;
    } else if (variance === maximumVariance) bestEnd = threshold;
  }
  return maximumVariance < 0 ? Math.round(sum / total) : Math.round((bestStart + bestEnd) / 2);
}

export function createMonochromeImageBlock({ getSettings, onChange = () => {} }) {
  const downsampleCanvas = document.createElement('canvas');
  const downsampleContext = downsampleCanvas.getContext('2d', { willReadFrequently: true });
  const tintedCanvases = new Map();
  let sourceImage = null;
  let sourceDataUrl = '';
  let sourceName = '';
  let mask = null;
  let maskWidth = 0;
  let maskHeight = 0;
  let suggestedThreshold = 128;
  let revision = 0;

  function process() {
    tintedCanvases.clear();
    mask = null; maskWidth = 0; maskHeight = 0;
    if (!sourceImage) { revision += 1; onChange(); return; }

    const settings = getSettings();
    const resolution = clamp(Math.round(settings.resolution), 8, 160);
    const scale = resolution / Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight);
    maskWidth = Math.max(1, Math.round(sourceImage.naturalWidth * scale));
    maskHeight = Math.max(1, Math.round(sourceImage.naturalHeight * scale));
    downsampleCanvas.width = maskWidth; downsampleCanvas.height = maskHeight;
    downsampleContext.clearRect(0, 0, maskWidth, maskHeight);
    downsampleContext.imageSmoothingEnabled = true;
    downsampleContext.imageSmoothingQuality = 'high';
    downsampleContext.drawImage(sourceImage, 0, 0, maskWidth, maskHeight);

    const pixels = downsampleContext.getImageData(0, 0, maskWidth, maskHeight).data;
    suggestedThreshold = calculateOtsuThreshold(pixels, settings.contrast);
    const cropped = cropMaskToInk(createMonochromeMask(pixels, maskWidth, maskHeight, settings), maskWidth, maskHeight);
    mask = cropped.mask; maskWidth = cropped.width; maskHeight = cropped.height;
    revision += 1;
    onChange();
  }

  async function setSource(dataUrl, name, normalize = true) {
    const decoded = await decodeImage(dataUrl);
    const normalizedSource = normalize ? normalizeSource(decoded) : dataUrl;
    sourceImage = normalize ? await decodeImage(normalizedSource) : decoded;
    sourceDataUrl = normalizedSource;
    sourceName = name || 'image';
    process();
  }

  async function loadBlob(blob, name) {
    if (!RASTER_IMAGE_TYPE.test(blob.type) && !RASTER_IMAGE_NAME.test(name)) throw new Error('Use a PNG, JPEG, WebP, GIF, BMP, ICO, or AVIF image.');
    if (blob.size > MAX_SOURCE_BYTES) throw new Error('Images must be 20 MB or smaller.');
    await setSource(await readBlobAsDataUrl(blob), name, true);
  }

  async function loadFile(file) {
    await loadBlob(file, file.name);
  }

  async function loadBundledSource(value, name) {
    const response = await fetch(value, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`The bundled image returned HTTP ${response.status}.`);
    await loadBlob(await response.blob(), name);
  }

  async function loadUrl(value) {
    let url;
    try { url = new URL(value); } catch { throw new Error('Enter a complete image URL.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Image URLs must use HTTP or HTTPS.');
    let response;
    try { response = await fetch(url.href, { mode: 'cors', credentials: 'omit' }); }
    catch { throw new Error('The image could not be downloaded. The source server may block cross-origin requests.'); }
    if (!response.ok) throw new Error(`The image server returned HTTP ${response.status}.`);
    const blob = await response.blob();
    await loadBlob(blob, url.pathname.split('/').filter(Boolean).at(-1) || url.hostname);
  }

  function clear() {
    sourceImage = null; sourceDataUrl = ''; sourceName = ''; process();
  }

  function getBitmap(color) {
    if (!mask?.length || !maskWidth || !maskHeight) return null;
    const key = `${revision}:${color}`;
    if (tintedCanvases.has(key)) return tintedCanvases.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = maskWidth; canvas.height = maskHeight;
    const context = canvas.getContext('2d');
    const imageData = context.createImageData(maskWidth, maskHeight);
    const [red, green, blue] = parseHexColor(color);
    for (let index = 0; index < mask.length; index += 1) {
      if (!mask[index]) continue;
      const pixelIndex = index * 4;
      imageData.data[pixelIndex] = red; imageData.data[pixelIndex + 1] = green; imageData.data[pixelIndex + 2] = blue; imageData.data[pixelIndex + 3] = 255;
    }
    context.putImageData(imageData, 0, 0);
    tintedCanvases.set(key, canvas);
    return canvas;
  }

  function getSourceState() {
    return { dataUrl: sourceDataUrl, name: sourceName };
  }

  return {
    clear,
    getBitmap,
    getDimensions: () => mask?.length ? { width: maskWidth, height: maskHeight } : null,
    getSourceState,
    getSuggestedThreshold: () => suggestedThreshold,
    hasImage: () => Boolean(sourceImage),
    loadBundledSource,
    loadFile,
    loadProjectSource: (dataUrl, name) => setSource(dataUrl, name, false),
    loadUrl,
    process
  };
}
