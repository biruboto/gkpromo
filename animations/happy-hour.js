import { createBitmapFontRenderer } from '../lab/bitmap-font.js';

const FRAME_DURATION = 0.16;
const SIDE_SCALE = 4;
const SIDE_SLIDE_START = 1.2;
const SIDE_SLIDE_DURATION = 4;
const FRAME_FILES = ['01.png', '02.png', '03.png', '04.png', '05.png'];
const COLORS = { lilac: '#d9c9ff', amber: '#ffc857', ink: '#130719' };
const LOGO_COLOR_BANDS = { '24,29,48': 0, '69,47,77': 1, '153,61,104': 2, '218,68,112': 3, '251,63,99': 4, '0,0,0': 0, '102,102,102': 1, '153,153,153': 2, '204,204,204': 3, '255,255,255': 4 };
const LOGO_REFLECTION_LEVELS = [.6, .8, 1, 1.15];
const STACKED_LOGO_SHIP_WIDTH = 12;
const STACKED_LOGO_CENTER_X = 172;
const STACKED_LOGO_Y = 32;
const STACKED_LOGO_COLOR = '#3f8fa3';
const CLASSIC_ARCADE_SCALE = 4;
const CLASSIC_ARCADE_GAP = 4;
const LOGO_GLYPH_STAGGER = .04;
const LOGO_GLYPH_JUMP_DURATION = .48;
const LOGO_GLYPH_LAYOUT = [
  { x: 0, y: 0, width: 12, height: 14 },
  ...Array.from({ length: 6 }, (_, index) => ({ x: 13 + index * 9, y: 0, width: 8, height: 7 })),
  ...Array.from({ length: 7 }, (_, index) => ({ x: 13 + index * 9, y: 7, width: 8, height: 7 }))
];
const LOGO_SETTLED_TIME = (LOGO_GLYPH_LAYOUT.length - 1) * LOGO_GLYPH_STAGGER + LOGO_GLYPH_JUMP_DURATION;
const SIDE_LAND_TIME = SIDE_SLIDE_START + SIDE_SLIDE_DURATION;
const TITLE_FLY_START = 2;
const TITLE_FLY_DURATION = 1.4;
const TITLE_SCALE = 4;
const TITLE_STROKE_WIDTH = 1;
const FOOTER_SCALE = 2;
const TEXT_BLOCK_OFFSET_Y = -88;
const DISCOUNT_COPY_START_GAP = 12;
const DISCOUNT_COPY_LINE_GAP = 2;
const DISCOUNT_COPY_STAGGER = LOGO_GLYPH_STAGGER;
const DISCOUNT_COPY = [
  '',
  '$1 Off Well Liquor & Drafts',
  '',
  '$6 Beer of the Week',
  '',
  '$7 Tall Boy + Card Combo'
];
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
    loadImage('./assets/images/gklogostacked.png'),
    loadImage('./assets/images/classicarcade.png')
  ]);
  let titleFontRenderer = null;
  let footerFontRenderer = null;
  let titleFont = null;
  let footerFont = null;
  let background = null;
  let frames = [];
  let sideAssets = null;
  let stackedLogo = null;
  let classicArcadePixels = null;
  let logoGlyphs = [];
  const titleGlyphCache = new Map();

  function createLogoGlyphs(image) {
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = image.naturalWidth;
    sourceCanvas.height = image.naturalHeight;
    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
    sourceContext.drawImage(image, 0, 0);
    const source = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
    return LOGO_GLYPH_LAYOUT.map(layout => {
      const glyphCanvas = document.createElement('canvas');
      glyphCanvas.width = layout.width;
      glyphCanvas.height = layout.height;
      const glyphContext = glyphCanvas.getContext('2d');
      const pixels = new Uint8ClampedArray(layout.width * layout.height * 4);
      const ink = new Uint8Array(layout.width * layout.height);
      for (let y = 0; y < layout.height; y += 1) for (let x = 0; x < layout.width; x += 1) {
        const sourceIndex = ((layout.y + y) * sourceCanvas.width + layout.x + x) * 4;
        const targetIndex = (y * layout.width + x) * 4;
        pixels[targetIndex] = source[sourceIndex];
        pixels[targetIndex + 1] = source[sourceIndex + 1];
        pixels[targetIndex + 2] = source[sourceIndex + 2];
        ink[y * layout.width + x] = source[sourceIndex + 3] && (source[sourceIndex] || source[sourceIndex + 1] || source[sourceIndex + 2]) ? 1 : 0;
      }
      for (let y = 0; y < layout.height; y += 1) for (let x = 0; x < layout.width; x += 1) {
        const targetIndex = (y * layout.width + x) * 4;
        let hasInk = ink[y * layout.width + x];
        for (let offsetY = -1; offsetY <= 1 && !hasInk; offsetY += 1) for (let offsetX = -1; offsetX <= 1 && !hasInk; offsetX += 1) {
          const neighborX = x + offsetX, neighborY = y + offsetY;
          if (neighborX >= 0 && neighborX < layout.width && neighborY >= 0 && neighborY < layout.height) hasInk = ink[neighborY * layout.width + neighborX];
        }
        pixels[targetIndex + 3] = hasInk ? 255 : 0;
      }
      const imageData = new ImageData(new Uint8ClampedArray(pixels), layout.width, layout.height);
      glyphContext.putImageData(imageData, 0, 0);
      return { ...layout, canvas: glyphCanvas, context: glyphContext, source: pixels, output: imageData };
    });
  }

  function createClassicArcadePixels(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const canvasContext = canvas.getContext('2d', { willReadFrequently: true });
    canvasContext.drawImage(image, 0, 0);
    const pixels = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
    const color = COLORS.lilac.slice(1).match(/\w\w/g).map(value => Number.parseInt(value, 16));
    for (let index = 0; index < pixels.data.length; index += 4) {
      if (!pixels.data[index + 3]) continue;
      pixels.data[index] = color[0]; pixels.data[index + 1] = color[1]; pixels.data[index + 2] = color[2];
    }
    canvasContext.putImageData(pixels, 0, 0);
    return canvas;
  }

  const ready = imageRequest.then(images => {
    background = images[0];
    frames = images.slice(1, 6).map(removeWhiteBackground);
    sideAssets = { left: images[6], left2: images[7], right: images[8], right2: images[9] };
    stackedLogo = images[10];
    classicArcadePixels = createClassicArcadePixels(images[11]);
    logoGlyphs = createLogoGlyphs(stackedLogo);
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
    if (!logoGlyphs.length) return;
    const reflection = logoReflectionColors(STACKED_LOGO_COLOR);
    const phase = Math.floor(elapsed * 4) % reflection.length;
    const shadow = COLORS.ink.slice(1).match(/\w\w/g).map(value => Number.parseInt(value, 16));
    const scale = 4;
    const logoX = Math.round(STACKED_LOGO_CENTER_X - stackedLogo.naturalWidth * scale / 2);
    logoGlyphs.forEach((glyph, index) => {
      const progress = Math.max(0, Math.min(1, (elapsed - index * LOGO_GLYPH_STAGGER) / LOGO_GLYPH_JUMP_DURATION));
      if (!progress) return;
      const launchOffset = (1 - progress) * 11 - Math.sin(progress * Math.PI) * 6;
      const pixels = glyph.output.data;
      for (let pixel = 0; pixel < pixels.length; pixel += 4) {
        if (!pixels[pixel + 3]) continue;
        const sourceColor = `${glyph.source[pixel]},${glyph.source[pixel + 1]},${glyph.source[pixel + 2]}`;
        const band = LOGO_COLOR_BANDS[sourceColor] ?? 3;
        const color = glyph.x < STACKED_LOGO_SHIP_WIDTH && band !== 0 ? [255, 255, 255] : band === 0 ? shadow : reflection[(band - 1 + phase) % reflection.length];
        pixels[pixel] = color[0]; pixels[pixel + 1] = color[1]; pixels[pixel + 2] = color[2];
      }
      glyph.context.putImageData(glyph.output, 0, 0);
      target.drawImage(glyph.canvas, logoX + glyph.x * scale, STACKED_LOGO_Y + glyph.y * scale + Math.round(launchOffset * scale), glyph.width * scale, glyph.height * scale);
    });
  }

  function drawClassicArcadeTag(target, elapsed) {
    if (!classicArcadePixels || !stackedLogo) return;
    const progress = Math.max(0, Math.min(1, (elapsed - LOGO_SETTLED_TIME) / LOGO_GLYPH_JUMP_DURATION));
    if (!progress) return;
    const easedEntry = 1 - (1 - progress) ** 3;
    const launchOffset = (1 - easedEntry) * 11 - Math.sin(easedEntry * Math.PI) * 6;
    const width = classicArcadePixels.width * CLASSIC_ARCADE_SCALE;
    const x = Math.round(STACKED_LOGO_CENTER_X - width / 2);
    const y = STACKED_LOGO_Y + stackedLogo.naturalHeight * CLASSIC_ARCADE_SCALE + CLASSIC_ARCADE_GAP + Math.round(launchOffset * CLASSIC_ARCADE_SCALE);
    target.save();
    target.globalAlpha = easedEntry;
    target.drawImage(classicArcadePixels, x, y, width, classicArcadePixels.height * CLASSIC_ARCADE_SCALE);
    target.restore();
  }

  function drawDiscountCopy(target, renderer, elapsed) {
    const titleY = height - 120 + TEXT_BLOCK_OFFSET_Y;
    const startY = titleY + TITLE_SCALE * 8 + DISCOUNT_COPY_START_GAP;
    const lineHeight = (8 + DISCOUNT_COPY_LINE_GAP) * FOOTER_SCALE;
    DISCOUNT_COPY.forEach((line, index) => {
      const progress = Math.max(0, Math.min(1, (elapsed - SIDE_LAND_TIME - index * DISCOUNT_COPY_STAGGER) / LOGO_GLYPH_JUMP_DURATION));
      if (!progress) return;
      const easedEntry = 1 - (1 - progress) ** 3;
      const launchOffset = (1 - easedEntry) * 11 - Math.sin(easedEntry * Math.PI) * 6;
      target.save();
      target.globalAlpha = easedEntry;
      target.translate(0, Math.round(launchOffset * FOOTER_SCALE));
      renderer.drawText(line, width / 2, startY + index * lineHeight, {
        scale: FOOTER_SCALE,
        color: line[0] === '(' ? COLORS.lilac : COLORS.amber,
        align: 'center',
        stroke: COLORS.ink,
        strokeWidth: 1
      });
      target.restore();
    });
  }

  function titleGlyph(character, color) {
    let cached = titleGlyphCache.get(character);
    if (!cached) {
      const canvas = document.createElement('canvas');
      canvas.width = (8 + TITLE_STROKE_WIDTH * 2) * TITLE_SCALE;
      canvas.height = (8 + TITLE_STROKE_WIDTH * 2) * TITLE_SCALE;
      const glyphContext = canvas.getContext('2d');
      glyphContext.imageSmoothingEnabled = false;
      cached = { canvas, context: glyphContext, renderer: createBitmapFontRenderer({ context: glyphContext, font: titleFont }) };
      titleGlyphCache.set(character, cached);
    }
    cached.context.clearRect(0, 0, cached.canvas.width, cached.canvas.height);
    const padding = TITLE_STROKE_WIDTH * TITLE_SCALE;
    cached.renderer.drawText(character, padding, padding, { scale: TITLE_SCALE, color, align: 'left', stroke: COLORS.ink, strokeWidth: TITLE_STROKE_WIDTH });
    return cached.canvas;
  }

  function drawDynamicTitle(target, elapsed, color) {
    if (!titleFontRenderer) return;
    const value = 'HAPPY HOUR M-F 5-7';
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
          y: height - 120 + TEXT_BLOCK_OFFSET_Y + Math.sin(orbit) * 10,
          angle: 0,
          scale: drawScale
        });
      }
      cursor += advance;
    }
    letters.sort((left, right) => left.depth - right.depth);
    letters.forEach(letter => {
      const glyph = titleGlyph(letter.character, color);
      const contentSize = 8 * TITLE_SCALE * letter.scale;
      const imageSize = glyph.width * letter.scale;
      target.save();
      target.translate(letter.x + contentSize / 2, letter.y + contentSize / 2);
      target.rotate(letter.angle);
      target.drawImage(glyph, -imageSize / 2, -imageSize / 2, imageSize, imageSize);
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
    drawAnimatedStackedLogo(target, elapsed);
    drawClassicArcadeTag(target, elapsed);
    drawDynamicTitle(target, elapsed, COLORS.amber);
    if (footerFontRenderer) drawDiscountCopy(target, footerFontRenderer, elapsed);
    const fadeProgress = Math.max(0, Math.min(1, elapsed - (duration - 1)));
    if (fadeProgress > 0) {
      target.fillStyle = `rgba(0, 0, 0, ${fadeProgress})`;
      target.fillRect(0, 0, width, height);
    }
  }

  return { ready, render };
}
