import { createBitmapFontRenderer } from '../lab/bitmap-font.js';

const FRAME_DURATION = 0.16;
const SIDE_SCALE = 4;
const SIDE_SLIDE_START = 1.2;
const SIDE_SLIDE_DURATION = 4;
const FRAME_FILES = ['01.png', '02.png', '03.png', '04.png', '05.png'];
const COLORS = { pink: '#ff73d1', lilac: '#d9c9ff', blue: '#79e7ff', ink: '#130719' };
const LOGO_COLOR_BANDS = { '24,29,48': 0, '69,47,77': 1, '153,61,104': 2, '218,68,112': 3, '251,63,99': 4, '0,0,0': 0, '102,102,102': 1, '153,153,153': 2, '204,204,204': 3, '255,255,255': 4 };
const LOGO_REFLECTION_LEVELS = [.6, .8, 1, 1.15];
const STACKED_LOGO_SHIP_WIDTH = 12;
const STACKED_LOGO_CENTER_X = 168;
const STACKED_LOGO_Y = 28;
const STACKED_LOGO_COLOR = '#3f8fa3';
const LOGO_SCAN_DURATION = 2;
const SIDE_LAND_TIME = SIDE_SLIDE_START + SIDE_SLIDE_DURATION;
const TITLE_FLY_START = 2;
const TITLE_FLY_DURATION = 1.4;
const TITLE_POP_DURATION = 0.36;
const TITLE_SCALE = 8;
const FOOTER_SCALE = 4;
const HAPPY_HOUR_ASSETS = './assets/images/happy-hour/';

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = setTimeout(() => reject(new Error(`Image request timed out for ${url}.`)), 8000);
    image.onload = () => { clearTimeout(timeout); resolve(image); };
    image.onerror = () => { clearTimeout(timeout); reject(new Error(`Image request failed for ${url}.`)); };
    image.src = String(url);
  });
}

function removeWhiteBackground(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    if (pixels.data[index] > 238 && pixels.data[index + 1] > 238 && pixels.data[index + 2] > 238) pixels.data[index + 3] = 0;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

function drawCenteredAsset(context, image, width, height, scale = 1) {
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, Math.floor((width - drawWidth) / 2), Math.floor((height - drawHeight) / 2), drawWidth, drawHeight);
}

export function createHappyHour({ context, width, height, duration, fonts }) {
  const imageRequest = Promise.all([
    loadImage(`${HAPPY_HOUR_ASSETS}background.png`),
    ...FRAME_FILES.map(file => loadImage(`${HAPPY_HOUR_ASSETS}${file}`)),
    loadImage(`${HAPPY_HOUR_ASSETS}left.png`),
    loadImage(`${HAPPY_HOUR_ASSETS}left2.png`),
    loadImage(`${HAPPY_HOUR_ASSETS}right.png`),
    loadImage(`${HAPPY_HOUR_ASSETS}right2.png`),
    loadImage('./assets/images/gklogostacked.png')
  ]);
  let titleFontRenderer = null;
  let footerFontRenderer = null;
  let titleFont = null;
  let footerFont = null;
  let background = null;
  let frames = [];
  let sideAssets = null;
  let stackedLogo = null;
  const logoCanvas = document.createElement('canvas');
  const titleGlyphCache = new Map();

  const ready = imageRequest.then(images => {
    background = images[0];
    frames = images.slice(1, 6).map(removeWhiteBackground);
    sideAssets = { left: images[6], left2: images[7], right: images[8], right2: images[9] };
    stackedLogo = images[10];
  });

  function syncFontRenderers() {
    if (fonts.title && fonts.title !== titleFont) {
      titleFont = fonts.title;
      titleFontRenderer = createBitmapFontRenderer({ context, font: titleFont });
      titleGlyphCache.clear();
    }
    if (fonts.footer && fonts.footer !== footerFont) {
      footerFont = fonts.footer;
      footerFontRenderer = createBitmapFontRenderer({ context, font: footerFont });
    }
  }

  function logoReflectionColors(color) {
    const value = color.slice(1);
    const rgb = [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16)];
    return LOGO_REFLECTION_LEVELS.map(level => rgb.map(channel => level <= 1 ? Math.round(channel * level) : Math.round(channel + (255 - channel) * (level - 1))));
  }

  function drawAnimatedStackedLogo(target, elapsed) {
    if (!stackedLogo?.complete || !stackedLogo.naturalWidth) return;
    logoCanvas.width = stackedLogo.naturalWidth;
    logoCanvas.height = stackedLogo.naturalHeight;
    const logoContext = logoCanvas.getContext('2d', { willReadFrequently: true });
    logoContext.drawImage(stackedLogo, 0, 0);
    const pixels = logoContext.getImageData(0, 0, logoCanvas.width, logoCanvas.height);
    const reflection = logoReflectionColors(STACKED_LOGO_COLOR);
    const phase = Math.floor(elapsed * 4) % reflection.length;
    const shadow = COLORS.ink.slice(1).match(/\w\w/g).map(value => Number.parseInt(value, 16));
    for (let index = 0; index < pixels.data.length; index += 4) {
      if (!pixels.data[index + 3]) continue;
      const pixel = index / 4;
      const x = pixel % logoCanvas.width;
      const sourceColor = `${pixels.data[index]},${pixels.data[index + 1]},${pixels.data[index + 2]}`;
      const band = LOGO_COLOR_BANDS[sourceColor] ?? 3;
      const color = x < STACKED_LOGO_SHIP_WIDTH && band !== 0 ? [255, 255, 255] : band === 0 ? shadow : reflection[(band - 1 + phase) % reflection.length];
      pixels.data[index] = color[0]; pixels.data[index + 1] = color[1]; pixels.data[index + 2] = color[2];
    }
    logoContext.putImageData(pixels, 0, 0);
    const scale = 4;
    const width = logoCanvas.width * scale;
    const x = Math.round(STACKED_LOGO_CENTER_X - width / 2);
    const y = STACKED_LOGO_Y;
    const scanProgress = Math.max(0, Math.min(1, elapsed / LOGO_SCAN_DURATION));
    const revealedWidth = Math.round(width * scanProgress);
    target.save();
    target.beginPath();
    target.rect(x, y, revealedWidth, logoCanvas.height * scale);
    target.clip();
    target.drawImage(logoCanvas, x, y, width, logoCanvas.height * scale);
    target.restore();
    if (scanProgress < 1) {
      target.fillStyle = COLORS.blue;
      target.fillRect(x + revealedWidth, y, 2, logoCanvas.height * scale);
    }
  }

  function drawWaveText(renderer, value, centerX, y, scale, elapsed, revealProgress, color) {
    const visibleCharacters = Math.ceil(value.length * revealProgress);
    const totalWidth = renderer.measureText(value, scale, 1);
    let cursor = Math.round(centerX - totalWidth / 2);
    for (let index = 0; index < visibleCharacters; index += 1) {
      const character = value[index];
      const waveY = y + Math.round(Math.sin(elapsed * 4 + index * 0.8) * 6);
      renderer.drawText(character, cursor, waveY, { scale, color, align: 'left', shadow: COLORS.ink, shadowOffset: 2 });
      cursor += (character === ' ' ? 6 : 8) * scale + scale;
    }
  }

  function titleGlyph(character, color) {
    let cached = titleGlyphCache.get(character);
    if (!cached) {
      const canvas = document.createElement('canvas');
      canvas.width = 8 * TITLE_SCALE;
      canvas.height = 8 * TITLE_SCALE;
      const glyphContext = canvas.getContext('2d');
      glyphContext.imageSmoothingEnabled = false;
      cached = { canvas, context: glyphContext, renderer: createBitmapFontRenderer({ context: glyphContext, font: titleFont }) };
      titleGlyphCache.set(character, cached);
    }
    cached.context.clearRect(0, 0, cached.canvas.width, cached.canvas.height);
    cached.renderer.drawText(character, 0, 0, { scale: TITLE_SCALE, color, align: 'left' });
    return cached.canvas;
  }

  function drawDynamicTitle(target, elapsed, color) {
    if (!titleFontRenderer) return;
    const value = 'HAPPY HOUR';
    const scale = TITLE_SCALE;
    const totalWidth = titleFontRenderer.measureText(value, scale, 1);
    let cursor = Math.round(width / 2 - totalWidth / 2);
    const letters = [];
    for (let index = 0; index < value.length; index += 1) {
      const character = value[index];
      const advance = (character === ' ' ? 6 : 8) * scale + scale;
      const entryProgress = Math.max(0, Math.min(1, (elapsed - TITLE_FLY_START - index * 0.07) / TITLE_FLY_DURATION));
      if (entryProgress > 0 && character !== ' ') {
        const easedEntry = 1 - (1 - entryProgress) ** 3;
        const orbit = elapsed * 1.4 + index * 0.8;
        const depth = 0.5 + Math.sin(orbit) * 0.5;
        const drawScale = 0.92 + depth * 0.16;
        const direction = index % 2 === 0 ? -1 : 1;
        letters.push({
          character,
          depth,
          x: cursor + direction * (1 - easedEntry) * (width + 40) + Math.cos(orbit) * 14,
          y: height - 120 + Math.sin(orbit) * 10,
          angle: 0,
          scale: drawScale
        });
      }
      cursor += advance;
    }
    letters.sort((left, right) => left.depth - right.depth);
    letters.forEach(letter => {
      const glyph = titleGlyph(letter.character, color);
      const size = glyph.width * letter.scale;
      target.save();
      target.translate(letter.x + size / 2, letter.y + size / 2);
      target.rotate(letter.angle);
      target.drawImage(glyph, -size / 2, -size / 2, size, size);
      target.restore();
    });
  }

  function render(target, elapsed) {
    target.fillStyle = '#080310';
    target.fillRect(0, 0, width, height);
    if (background) drawCenteredAsset(target, background, width, height, 4);

    const frame = frames[Math.floor(elapsed / FRAME_DURATION) % frames.length];
    if (frame) drawCenteredAsset(target, frame, width, height, 4);

    if (sideAssets) {
      const progress = Math.max(0, Math.min(1, (elapsed - SIDE_SLIDE_START) / SIDE_SLIDE_DURATION));
      const easedProgress = 1 - (1 - progress) ** 3;
      const leftWidth = sideAssets.left.width * SIDE_SCALE;
      const rightWidth = sideAssets.right.width * SIDE_SCALE;
      const leftX = Math.round(-leftWidth + leftWidth * easedProgress);
      const rightX = Math.round(width - rightWidth * easedProgress);
      const leftImage = progress >= 1 ? sideAssets.left2 : sideAssets.left;
      const rightImage = progress >= 1 ? sideAssets.right2 : sideAssets.right;
      target.drawImage(leftImage, leftX, height - leftImage.height * SIDE_SCALE, leftImage.width * SIDE_SCALE, leftImage.height * SIDE_SCALE);
      target.drawImage(rightImage, rightX, height - rightImage.height * SIDE_SCALE, rightImage.width * SIDE_SCALE, rightImage.height * SIDE_SCALE);
    }

    syncFontRenderers();
    const flash = Math.floor(elapsed * 5) % 2 === 0;
    drawAnimatedStackedLogo(target, elapsed);
    drawDynamicTitle(target, elapsed, flash ? COLORS.lilac : COLORS.pink);
    if (footerFontRenderer) {
      const footerProgress = Math.max(0, Math.min(1, (elapsed - SIDE_LAND_TIME) / TITLE_POP_DURATION));
      drawWaveText(footerFontRenderer, 'WEEKDAYS 5-7', width / 2, height - 44, FOOTER_SCALE, elapsed, footerProgress, COLORS.blue);
    }
    const fadeProgress = Math.max(0, Math.min(1, elapsed - (duration - 1)));
    if (fadeProgress > 0) {
      target.fillStyle = `rgba(0, 0, 0, ${fadeProgress})`;
      target.fillRect(0, 0, width, height);
    }
  }

  return { ready, render };
}
