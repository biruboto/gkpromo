export function calculateSectionLayout(order, sectionHeights, { top, bottom, gap, flexibleSection = 'body', minimumFlexibleHeight = 0 }) {
  const heights = { ...sectionHeights };
  const orderedSections = order.filter(section => heights[section] > 0 || section === flexibleSection);
  const totalGaps = Math.max(0, orderedSections.length - 1) * gap;
  const fixedHeight = orderedSections.reduce((total, section) => total + (section === flexibleSection ? 0 : heights[section]), 0);
  heights[flexibleSection] = Math.max(minimumFlexibleHeight, bottom - top - totalGaps - fixedHeight);
  const positions = {};
  let sectionY = top;
  orderedSections.forEach(section => {
    positions[section] = sectionY;
    sectionY += heights[section] + gap;
  });
  return { heights, positions, orderedSections, contentBottom: sectionY - gap };
}

export function calculateLandscapeSafeArea(width, height) {
  const safeWidth = Math.min(width, Math.round(height * 1.5));
  return { x: Math.round((width - safeWidth) / 2), width: safeWidth };
}

export function calculateLandscapeLayout({ width, height, sectionOrder, detailHeight, ctaHeight, footerHeight, hasImage, imageHeight = 0 }) {
  const marginY = 24, gap = 8, columnGap = 16, logoWidth = 272;
  const safeArea = calculateLandscapeSafeArea(width, height); const safeRight = safeArea.x + safeArea.width;
  const logo = { x: safeArea.x, y: marginY, width: logoWidth, height: 88 };
  const headerX = safeArea.x + logoWidth + columnGap;
  const headerWidth = safeRight - headerX;
  const topOrder = sectionOrder.filter(section => section === 'header' || section === 'detail');
  const topHeights = { header: 80, detail: detailHeight };
  const topRects = {};
  let topY = marginY;
  topOrder.forEach(section => {
    if (!topHeights[section]) return;
    topRects[section] = { x: headerX, y: topY, width: headerWidth, height: topHeights[section] };
    topY += topHeights[section] + gap;
  });
  const topBottom = Math.max(marginY + logo.height, topY - gap);
  const footer = { x: safeArea.x, y: height - marginY - footerHeight, width: safeArea.width, height: footerHeight };
  const contentY = topBottom + gap * 2;
  const contentBottom = footer.y - gap;
  const contentHeight = Math.max(96, contentBottom - contentY);
  const hasCta = ctaHeight > 0;
  const imageOrderIndex = sectionOrder.indexOf('image');
  const ctaOrderIndex = sectionOrder.indexOf('cta');
  const slotsSwapped = hasImage && hasCta && imageOrderIndex >= 0 && ctaOrderIndex >= 0 && imageOrderIndex < ctaOrderIndex;
  const mediaSection = hasImage && hasCta ? slotsSwapped ? 'cta' : 'image' : hasImage ? 'image' : null;
  const actionSection = hasImage && hasCta ? slotsSwapped ? 'image' : 'cta' : hasCta ? 'cta' : null;
  const mainX = mediaSection ? headerX : safeArea.x;
  const mainWidth = safeRight - mainX;
  const maximumActionHeight = Math.max(0, contentHeight - 96 - gap);
  const requestedActionHeight = actionSection === 'image' ? imageHeight : actionSection === 'cta' ? ctaHeight : 0;
  const actionHeight = Math.min(requestedActionHeight, maximumActionHeight);
  const mainOrder = sectionOrder.filter(section => section === 'body' || section === actionSection);
  const bodyHeight = Math.max(96, contentHeight - (actionHeight ? actionHeight + gap : 0));
  const mainHeights = { body: bodyHeight };
  if (actionSection) mainHeights[actionSection] = actionHeight;
  const mainRects = {};
  let mainY = contentY;
  mainOrder.forEach(section => {
    if (!mainHeights[section] && section !== 'body') return;
    mainRects[section] = { x: mainX, y: mainY, width: mainWidth, height: mainHeights[section], slot: section === actionSection ? 'action' : 'body' };
    mainY += mainHeights[section] + gap;
  });
  const mediaRect = { x: safeArea.x, y: contentY, width: logoWidth, height: contentHeight, slot: 'media' };
  return {
    logo,
    image: hasImage ? mediaSection === 'image' ? mediaRect : mainRects.image : null,
    header: topRects.header,
    detail: topRects.detail,
    body: mainRects.body,
    cta: hasCta ? mediaSection === 'cta' ? mediaRect : mainRects.cta : null,
    footer,
    slotsSwapped
  };
}

export function createPromoRenderer({
  context: ctx, canvas, exportContext: exportCtx, width: initialWidth, height: initialHeight, exportScale: initialExportScale,
  controls, colors, logoImages, legacyGlyphs, gameBackgrounds, imageBlock, crtPipeline, contentVisibility, scrollModes,
  textAlignments, textVerticalAlignments, getBodyBorderStyle, getFonts, getTextScale: textScale, getSectionOrder, getOutputFormat, onOverflowChange, onMissingGlyphsChange, animationState, leaderTabToken
}) {
  let W = initialWidth, H = initialHeight, EXPORT_SCALE = initialExportScale;
  const LAYOUT_TOP_Y = 24, SECTION_GAP = 8;
  const TEXT_FIELD_X = 24;
  const LOGO_FIELD_HEIGHT = 88, HEADER_FIELD_HEIGHT = 80, DETAIL_FIELD_HEIGHT = 48, MIN_BODY_FIELD_HEIGHT = 96, CTA_FIELD_HEIGHT = 64;
  const MAX_IMAGE_FIELD_HEIGHT = 240;
  const CTA_VERTICAL_OFFSET = 8;
  const FOOTER_FIELD_HEIGHT = 76;
  const FOOTER_VERTICAL_OFFSET = 8;
  const PORTRAIT_FOOTER_TEXT_WIDTH = 414;
  const HOURS_SCALE = 2;
  const HOURS_ADDRESS_GAP = 4;
  const TICKER_SPEED = 28, REVEAL_PAUSE = .7, MOTION_SPEED = 1;
  const SPIN_PERIOD = 6.4, SPIN_STAGGER = .12, SPIN_DURATION = .72;
  const SHADOW_ALPHA = 1;
  const glyphCache = new Map();
  const glyphBoundsCache = new Map();
  const legacyGlyphCache = new Map();
  const legacyGlyphBoundsCache = new Map();
  const reflectedGlyphCache = new Map();
  let bodyFont = null, headerFont = null, detailFont = null, ctaFont = null, footerFont = null, hoursFont = null;
  let textAnimationDisabled = false;
  const logoPixels = document.createElement('canvas');
  const classicPixels = document.createElement('canvas');
  const STACKED_LOGO_SHIP_WIDTH = 12;
  const LOGO_COLOR_BANDS = { '24,29,48': 0, '69,47,77': 1, '153,61,104': 2, '218,68,112': 3, '251,63,99': 4, '0,0,0': 0, '102,102,102': 1, '153,153,153': 2, '204,204,204': 3, '255,255,255': 4 };
  const LOGO_REFLECTION_LEVELS = [.8, 1, 1.32, 1.6];
  let activeHighlightColor = '#ffffff', activeStrokeColor = '#000000', activeShadowColor = '#dd4455', activeBackgroundColor = '#000000';
  let missingArcadeGlyphs = new Map();
  function superscriptScale(scale) { return Math.max(1, Math.round(scale / 2)); }
  function isArcadeFont(font) { return font?.kind === 'arcade'; }
  function glyphIndexFor(character) {
    const codepoint = character.codePointAt(0);
    // Header fonts are ordered directly from printable ASCII space through tilde.
    return codepoint >= 0x20 && codepoint <= 0x7e ? codepoint - 0x20 : 0x1f;
  }
  function arcadePixelPresent(font, glyphIndex, row, column) {
    if (!isArcadeFont(font) || glyphIndex < 0 || glyphIndex >= font.slotCount) return false;
    return font.pixels[(row * font.atlas.width + glyphIndex * 8 + column) * 4 + 3] >= 32;
  }
  function fontPixelPresent(font, glyphIndex, row, column) {
    if (isArcadeFont(font)) return arcadePixelPresent(font, glyphIndex, row, column);
    return Boolean((font?.[glyphIndex * 8 + row] || 0) & (128 >> column));
  }
  function recordMissingArcadeGlyph(font, fontKey, character) {
    if (!isArcadeFont(font)) return;
    if (!missingArcadeGlyphs.has(fontKey)) missingArcadeGlyphs.set(fontKey, new Set());
    missingArcadeGlyphs.get(fontKey).add(character);
  }
  function glyph(character, color, font = bodyFont, fontKey = 'body', mode = 'face') {
    const glyphIndex = glyphIndexFor(character);
    const key = `${fontKey}:${font?.id || 'default'}:${glyphIndex}:${color}:${mode}`;
    if (glyphCache.has(key)) return glyphCache.get(key);
    const image = document.createElement('canvas'); image.width = image.height = 8;
    const imageCtx = image.getContext('2d'); imageCtx.imageSmoothingEnabled = false;
    if (isArcadeFont(font) && mode === 'face' && glyphIndex < font.slotCount) imageCtx.drawImage(font.atlas, glyphIndex * 8, 0, 8, 8, 0, 0, 8, 8);
    else {
      imageCtx.fillStyle = color;
      for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) if (fontPixelPresent(font, glyphIndex, row, column)) imageCtx.fillRect(column, row, 1, 1);
    }
    glyphCache.set(key, image); return image;
  }
  function glyphBounds(character, font = bodyFont, fontKey = 'body') {
    if (isArcadeFont(font) && (character.codePointAt(0) < 0x20 || character.codePointAt(0) > 0x7e)) {
      recordMissingArcadeGlyph(font, fontKey, character); return null;
    }
    const glyphIndex = glyphIndexFor(character);
    const key = `${fontKey}:${font?.id || 'default'}:${glyphIndex}`;
    if (glyphBoundsCache.has(key)) {
      const cached = glyphBoundsCache.get(key);
      if (!cached) recordMissingArcadeGlyph(font, fontKey, character);
      return cached;
    }
    let left = 8, right = -1, top = 8, bottom = -1;
    for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) {
      if (fontPixelPresent(font, glyphIndex, row, column)) { left = Math.min(left, column); right = Math.max(right, column); top = Math.min(top, row); bottom = Math.max(bottom, row); }
    }
    const bounds = right < 0 ? null : { left, width: right - left + 1, top, bottom };
    if (!bounds) recordMissingArcadeGlyph(font, fontKey, character);
    glyphBoundsCache.set(key, bounds); return bounds;
  }
  function legacyGlyph(glyphData, color) {
    const key = `${glyphData.id}:${color}:${glyphData.image ? activeBackgroundColor : ''}`;
    if (legacyGlyphCache.has(key)) return legacyGlyphCache.get(key);
    if (glyphData.imageElement) {
      const image = imageGlyph(glyphData, color);
      legacyGlyphCache.set(key, image); return image;
    }
    const image = document.createElement('canvas'); image.width = image.height = 8;
    const imageCtx = image.getContext('2d'); imageCtx.fillStyle = color;
    for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) if (glyphData.bitmap[row] & (128 >> column)) imageCtx.fillRect(column, row, 1, 1);
    legacyGlyphCache.set(key, image); return image;
  }
  function imageGlyph(glyphData, color, phase = null) {
    const image = document.createElement('canvas'); image.width = image.height = 8;
    const imageCtx = image.getContext('2d'); imageCtx.drawImage(glyphData.imageElement, 0, 0, 8, 8);
    const pixels = imageCtx.getImageData(0, 0, 8, 8);
    const textRgb = color.slice(1).match(/\w\w/g).map(value => Number.parseInt(value, 16));
    const detailRgb = activeBackgroundColor.slice(1).match(/\w\w/g).map(value => Number.parseInt(value, 16));
    const transparentRgb = glyphData.transparentColor?.slice(1).match(/\w\w/g)?.map(value => Number.parseInt(value, 16));
    const reflection = phase === null ? null : logoReflectionColors(color);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const isTransparent = pixels.data[index + 3] < 32 || transparentRgb?.every((value, channel) => pixels.data[index + channel] === value);
      if (isTransparent) { pixels.data[index + 3] = 0; continue; }
      const isDetail = pixels.data[index] < 128 && pixels.data[index + 1] < 128 && pixels.data[index + 2] < 128;
      const rgb = isDetail ? detailRgb : reflection ? reflection[(index / 4 / 8 + phase) % reflection.length] : textRgb;
      pixels.data[index] = rgb[0]; pixels.data[index + 1] = rgb[1]; pixels.data[index + 2] = rgb[2];
    }
    imageCtx.putImageData(pixels, 0, 0); return image;
  }
  const BODY_BORDER_GLYPHS = {
    topLeft: 'petscii-upper-70', topRight: 'petscii-upper-6e', bottomLeft: 'petscii-upper-6d', bottomRight: 'petscii-upper-7d',
    roundedTopLeft: 'petscii-upper-55', roundedTopRight: 'petscii-upper-49', roundedBottomLeft: 'petscii-upper-4a', roundedBottomRight: 'petscii-upper-4b',
    top: 'petscii-upper-43', bottom: 'petscii-upper-43', left: 'petscii-upper-42', right: 'petscii-upper-42'
  };
  function drawBorderGlyph(glyphId, x, y, color, scale = 1) {
    const glyphData = legacyGlyphs.get(glyphId);
    if (!glyphData) return false;
    ctx.drawImage(legacyGlyph(glyphData, color), x, y, 8 * scale, 8 * scale);
    return true;
  }
  function drawBodyBorder(style, x, y, width, height, color, scale) {
    if (style === 'none') return;
    const tile = 8 * scale, right = x + width - tile, bottom = y + height - tile;
    for (let edgeX = x + tile; edgeX < right; edgeX += tile) {
      drawBorderGlyph(BODY_BORDER_GLYPHS.top, edgeX, y, color, scale);
      drawBorderGlyph(BODY_BORDER_GLYPHS.bottom, edgeX, bottom, color, scale);
    }
    for (let edgeY = y + tile; edgeY < bottom; edgeY += tile) {
      drawBorderGlyph(BODY_BORDER_GLYPHS.left, x, edgeY, color, scale);
      drawBorderGlyph(BODY_BORDER_GLYPHS.right, right, edgeY, color, scale);
    }
    if (style === 'rounded') {
      drawBorderGlyph(BODY_BORDER_GLYPHS.roundedTopLeft, x, y, color, scale); drawBorderGlyph(BODY_BORDER_GLYPHS.roundedTopRight, right, y, color, scale);
      drawBorderGlyph(BODY_BORDER_GLYPHS.roundedBottomLeft, x, bottom, color, scale); drawBorderGlyph(BODY_BORDER_GLYPHS.roundedBottomRight, right, bottom, color, scale);
      return;
    }
    drawBorderGlyph(BODY_BORDER_GLYPHS.topLeft, x, y, color, scale); drawBorderGlyph(BODY_BORDER_GLYPHS.topRight, right, y, color, scale);
    drawBorderGlyph(BODY_BORDER_GLYPHS.bottomLeft, x, bottom, color, scale); drawBorderGlyph(BODY_BORDER_GLYPHS.bottomRight, right, bottom, color, scale);
  }
  function reflectedGlyph(glyphLayout, color, font = bodyFont, fontKey = 'body', phase = 0) {
    const glyphId = glyphLayout.type === 'legacy' ? glyphLayout.glyphData.id : glyphIndexFor(glyphLayout.character);
    const key = `${glyphLayout.type}:${fontKey}:${glyphId}:${color}:${phase}:${glyphLayout.glyphData?.image ? activeBackgroundColor : ''}`;
    if (reflectedGlyphCache.has(key)) return reflectedGlyphCache.get(key);
    if (glyphLayout.type === 'legacy' && glyphLayout.glyphData.imageElement) {
      const image = imageGlyph(glyphLayout.glyphData, color, phase);
      reflectedGlyphCache.set(key, image); return image;
    }
    const image = document.createElement('canvas'); image.width = image.height = 8;
    const imageCtx = image.getContext('2d'); const reflection = logoReflectionColors(color);
    for (let row = 0; row < 8; row++) {
      const bitmap = glyphLayout.type === 'legacy' ? glyphLayout.glyphData.bitmap[row] : font?.[glyphId * 8 + row] || 0;
      const [red, green, blue] = reflection[(row + phase) % reflection.length];
      imageCtx.fillStyle = `rgb(${red} ${green} ${blue})`;
      for (let column = 0; column < 8; column++) if (bitmap & (128 >> column)) imageCtx.fillRect(column, row, 1, 1);
    }
    reflectedGlyphCache.set(key, image); return image;
  }
  function legacyGlyphBounds(glyphData) {
    if (legacyGlyphBoundsCache.has(glyphData.id)) return legacyGlyphBoundsCache.get(glyphData.id);
    let left = 8, right = -1, top = 8, bottom = -1;
    for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) {
      if (glyphData.bitmap[row] & (128 >> column)) { left = Math.min(left, column); right = Math.max(right, column); top = Math.min(top, row); bottom = Math.max(bottom, row); }
    }
    const bounds = right < 0 ? null : { left, width: right - left + 1, top, bottom };
    legacyGlyphBoundsCache.set(glyphData.id, bounds); return bounds;
  }
  function tokenize(value) {
    const tokens = []; const expression = /\[\[(\/?effect(?::[a-z-]+)?|[a-z0-9-]+)\]\]/ig;
    const effectStack = []; let effects = []; let position = 0; let match;
    const addText = text => { for (const character of text) tokens.push({ type: 'font', character, effects }); };
    while ((match = expression.exec(value))) {
      addText(value.slice(position, match.index));
      const marker = match[1].toLowerCase();
      if (marker === '/effect') effects = effectStack.pop() || [];
      else if (marker.startsWith('effect')) { effectStack.push(effects); effects = [...effects, marker.split(':')[1] || 'none']; }
      else {
        const glyphData = legacyGlyphs.get(marker);
        if (glyphData) tokens.push({ type: 'legacy', glyphData, effects });
        else if (marker === 'leader-tab') {}
        else addText(match[0]);
      }
      position = expression.lastIndex;
    }
    addText(value.slice(position));
    return tokens;
  }
  const BODY_TEXT_SPACING = { letterGap: 2, spaceWidth: 6 };
  const HEADER_TEXT_SPACING = { letterGap: 1, spaceWidth: 6 };
  function textLayout(value, scale = 1, font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING) {
    scale = Math.max(1, Math.round(scale));
    const tokens = tokenize(value);
    const boundsForToken = token => token.character === ' ' ? null : token.type === 'legacy' ? legacyGlyphBounds(token.glyphData) : glyphBounds(token.character, font, fontKey);
    const referenceBoundsForScript = index => {
      const isScript = token => token?.effects.includes('superscript') || token?.effects.includes('subscript');
      let runStart = index, runEnd = index;
      while (isScript(tokens[runStart - 1])) runStart -= 1;
      while (isScript(tokens[runEnd + 1])) runEnd += 1;
      for (let candidateIndex = runStart - 1; candidateIndex >= 0; candidateIndex--) {
        const bounds = boundsForToken(tokens[candidateIndex]);
        if (bounds) return bounds;
      }
      for (let candidateIndex = runEnd + 1; candidateIndex < tokens.length; candidateIndex++) {
        const bounds = boundsForToken(tokens[candidateIndex]);
        if (bounds) return bounds;
      }
      return null;
    };
    const glyphs = []; let cursor = 0, previousWasGlyph = false, underlineRun = 0, wasUnderlined = false;
    for (const [tokenIndex, token] of tokens.entries()) {
      const isUnderlined = token.effects.includes('underline');
      const isSuperscript = token.effects.includes('superscript');
      const isSubscript = token.effects.includes('subscript');
      const glyphScale = isSuperscript || isSubscript ? superscriptScale(scale) : scale;
      if (isUnderlined && !wasUnderlined) underlineRun += 1;
      wasUnderlined = isUnderlined;
      const character = token.character;
      if (character === ' ') { cursor += spacing.spaceWidth * glyphScale; previousWasGlyph = false; continue; }
      const bounds = boundsForToken(token);
      if (!bounds) { cursor += spacing.spaceWidth * glyphScale; previousWasGlyph = false; continue; }
      if (previousWasGlyph) cursor += spacing.letterGap * glyphScale;
      const referenceBounds = isSuperscript || isSubscript ? referenceBoundsForScript(tokenIndex) || bounds : bounds;
      const yOffset = isSuperscript ? referenceBounds.top * scale - bounds.top * glyphScale : isSubscript ? (referenceBounds.bottom + 1) * scale - (bounds.bottom + 1) * glyphScale : 0;
      glyphs.push({ ...token, bounds, scale: glyphScale, yOffset, underlineRun: isUnderlined ? underlineRun : 0, x: cursor - bounds.left * glyphScale });
      cursor += bounds.width * glyphScale; previousWasGlyph = true;
    }
    return { glyphs, width: cursor };
  }
  function textWidth(value, scale = 1, font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING) { return textLayout(value, scale, font, fontKey, spacing).width; }
  function text(value, x, y, color, scale = 1, align = 'left', font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING, forceShadow = false, shadowColor = activeShadowColor) {
    scale = Math.max(1, Math.round(scale));
    const layout = textLayout(value, scale, font, fontKey, spacing); const start = Math.round(x - (align === 'center' ? layout.width / 2 : align === 'right' ? layout.width : 0));
    const underlineSegments = [];
    layout.glyphs.forEach((glyphLayout, glyphIndex) => {
      if (!textAnimationDisabled && glyphLayout.effects.includes('blink') && Math.floor(animationState.time * 2) % 2) return;
      const glyphScale = glyphLayout.scale;
      const sweepStart = (animationState.time * 72) % (layout.width + 8 * scale) - 8 * scale;
      const isSwept = !textAnimationDisabled && glyphLayout.effects.includes('sweep') && glyphLayout.x + glyphLayout.bounds.width * glyphScale >= sweepStart && glyphLayout.x <= sweepStart + 8 * scale;
      const glyphColor = isSwept || !textAnimationDisabled && glyphLayout.effects.includes('flash') && Math.floor(animationState.time * 2) % 2 ? activeHighlightColor : glyphLayout.effects.includes('highlight') ? activeHighlightColor : color;
      const waveOffset = !textAnimationDisabled && glyphLayout.effects.includes('wave') ? Math.round(Math.sin(animationState.time * 8 - glyphIndex * .85) * 2) * glyphScale : 0;
      const glyphY = y + glyphLayout.yOffset + waveOffset;
      const spinElapsed = ((animationState.time - glyphIndex * SPIN_STAGGER) % SPIN_PERIOD + SPIN_PERIOD) % SPIN_PERIOD;
      const isSpinning = !textAnimationDisabled && glyphLayout.effects.includes('spin') && spinElapsed < SPIN_DURATION;
      const spinAngle = isSpinning ? spinElapsed / SPIN_DURATION * Math.PI * 2 : 0;
      const spinRatio = isSpinning ? .1 + .9 * Math.abs(Math.cos(spinAngle)) : 1;
      const spinReversed = isSpinning && Math.cos(spinAngle) < 0;
      const drawGlyphImage = (glyphImage, drawX, drawY) => {
        const glyphWidth = 8 * glyphScale, spinWidth = Math.max(1, Math.round(glyphWidth * spinRatio));
        const spinX = Math.round(drawX + (glyphWidth - spinWidth) / 2);
        if (!spinReversed) { ctx.drawImage(glyphImage, spinX, drawY, spinWidth, 8 * glyphScale); return; }
        ctx.save(); ctx.translate(spinX + spinWidth, drawY); ctx.scale(-1, 1);
        ctx.drawImage(glyphImage, 0, 0, spinWidth, 8 * glyphScale); ctx.restore();
      };
      const sourceColorFont = glyphLayout.type === 'font' && isArcadeFont(font);
      const image = !textAnimationDisabled && glyphLayout.effects.includes('reflect') && !sourceColorFont ? reflectedGlyph(glyphLayout, glyphColor, font, fontKey, Math.floor(animationState.time * 4) % LOGO_REFLECTION_LEVELS.length) : glyphLayout.type === 'legacy' ? legacyGlyph(glyphLayout.glyphData, glyphColor) : glyph(glyphLayout.character, glyphColor, font, fontKey);
      const strokeImage = glyphLayout.effects.includes('stroke') ? glyphLayout.type === 'legacy' ? legacyGlyph(glyphLayout.glyphData, activeStrokeColor) : glyph(glyphLayout.character, activeStrokeColor, font, fontKey, 'silhouette') : null;
      if (strokeImage) {
        const strokeThickness = scale;
        for (const offsetY of [-1, 0, 1]) for (const offsetX of [-1, 0, 1]) {
          if (offsetX || offsetY) drawGlyphImage(strokeImage, start + glyphLayout.x + offsetX * strokeThickness, glyphY + offsetY * strokeThickness);
        }
      }
      if (forceShadow || glyphLayout.effects.includes('shadow')) {
        const shadowImage = glyphLayout.type === 'legacy' ? legacyGlyph(glyphLayout.glyphData, shadowColor) : glyph(glyphLayout.character, shadowColor, font, fontKey, 'silhouette');
        ctx.save(); ctx.globalAlpha *= SHADOW_ALPHA;
        drawGlyphImage(shadowImage, start + glyphLayout.x + glyphScale, glyphY + glyphScale);
        ctx.restore();
      }
      drawGlyphImage(image, start + glyphLayout.x, glyphY);
      if (glyphLayout.underlineRun) {
        const segment = underlineSegments.at(-1);
        const glyphStart = Math.round(start + glyphLayout.x);
        const glyphEnd = glyphStart + glyphLayout.bounds.width * glyphScale;
        if (segment?.run === glyphLayout.underlineRun && segment.y === glyphY && segment.thickness === glyphScale) segment.end = glyphEnd;
        else underlineSegments.push({ run: glyphLayout.underlineRun, color: sourceColorFont ? color : glyphColor, start: glyphStart, end: glyphEnd, y: glyphY, thickness: glyphScale });
      }
    });
    underlineSegments.forEach(segment => {
      ctx.fillStyle = segment.color;
      ctx.fillRect(segment.start, segment.y + 9 * segment.thickness, segment.end - segment.start, segment.thickness);
    });
  }
  function styledText(_style, value, x, y, color, shadowColor, scale = 1, align = 'left', font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING) {
    text(value, x, y, color, scale, align, font, fontKey, spacing, false, shadowColor);
  }
  function leaderText(value, x, width, y, color, shadowColor, scale = 1, font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING) {
    const parts = leaderLineParts(value);
    if (!parts) { styledText('body', value, x, y, color, shadowColor, scale, 'left', font, fontKey, spacing); return; }
    const rightX = x + width;
    styledText('body', parts.left, x, y, color, shadowColor, scale, 'left', font, fontKey, spacing);
    styledText('body', parts.right, rightX, y, color, shadowColor, scale, 'right', font, fontKey, spacing);
    const periodWidth = textWidth('.', scale, font, fontKey, spacing); let count = 0;
    while (textWidth(`${parts.left}${'.'.repeat(count + 1)}${parts.right}`, scale, font, fontKey, spacing) <= width) count += 1;
    if (count) {
      const dotStart = textWidth(`${parts.left}.`, scale, font, fontKey, spacing) - periodWidth;
      styledText('body', '.'.repeat(count), x + dotStart, y, color, shadowColor, scale, 'left', font, fontKey, spacing);
    }
  }
  function singleLineValue(value) { return value.replace(/\s*\r?\n\s*/g, ' '); }
  function scrollingText(value, x, width, y, color, shadowColor, scale, font, fontKey, spacing, mode) {
    const line = singleLineValue(value); const lineWidth = textWidth(line, scale, font, fontKey, spacing); const clipHeight = 12 * scale;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y - scale, width, clipHeight); ctx.clip();
    if (textAnimationDisabled) { styledText('body', line, x, y, color, shadowColor, scale, 'left', font, fontKey, spacing); ctx.restore(); return; }
    if (mode === 'ticker') {
      const tickerLine = line.endsWith(' ') ? line : `${line} `; const loopWidth = textWidth(tickerLine, scale, font, fontKey, spacing); const offset = Math.floor(animationState.time * TICKER_SPEED) % loopWidth;
      for (let drawX = x - offset; drawX < x + width; drawX += loopWidth) styledText('body', tickerLine, drawX, y, color, shadowColor, scale, 'left', font, fontKey, spacing);
    } else {
      const overflow = Math.max(0, lineWidth - width);
      if (!overflow) styledText('body', line, x, y, color, shadowColor, scale, 'left', font, fontKey, spacing);
      else {
        const travelDuration = Math.max(1.1, overflow / TICKER_SPEED); const cycle = REVEAL_PAUSE * 2 + travelDuration * 2; let phase = animationState.time % cycle; let offset;
        if (phase < REVEAL_PAUSE) offset = 0;
        else if ((phase -= REVEAL_PAUSE) < travelDuration) offset = overflow * phase / travelDuration;
        else if ((phase -= travelDuration) < REVEAL_PAUSE) offset = overflow;
        else offset = overflow * (1 - (phase - REVEAL_PAUSE) / travelDuration);
        styledText('body', line, x - Math.round(offset), y, color, shadowColor, scale, 'left', font, fontKey, spacing);
      }
    }
    ctx.restore();
  }
  function wrap(value, maximumWidth, scale = 1, font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING) {
    const lines = []; let line = '';
    value.trim().replace(/\s+/g, ' ').split(' ').forEach(word => { const next = line ? `${line} ${word}` : word; if (textWidth(next, scale, font, fontKey, spacing) > maximumWidth && line) { lines.push(line); line = word; } else line = next; });
    if (line) lines.push(line); return normalizeEffectsAcrossLines(lines);
  }
  function wrapPreservingSpaces(value, maximumWidth, scale = 1, font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING) {
    const lines = []; let line = '';
    (value.match(/ +|[^ ]+/g) || []).forEach(token => {
      const next = line + token;
      if (line && textWidth(next, scale, font, fontKey, spacing) > maximumWidth) { lines.push(line); line = token; }
      else line = next;
    });
    if (line) lines.push(line); return lines;
  }
  function leaderLineParts(value) {
    const index = value.indexOf(leaderTabToken);
    if (index < 0 || value.indexOf(leaderTabToken, index + leaderTabToken.length) >= 0) return null;
    const left = value.slice(0, index); const effectExpression = /\[\[(\/?effect(?::[a-z-]+)?)\]\]/ig; const activeEffects = []; let match;
    while ((match = effectExpression.exec(left))) {
      const marker = match[1].toLowerCase();
      if (marker === '/effect') activeEffects.pop(); else activeEffects.push(marker.split(':')[1] || 'none');
    }
    return { left, right: `${activeEffects.map(effect => `[[effect:${effect}]]`).join('')}${value.slice(index + leaderTabToken.length)}` };
  }
  function leaderLineFits(value, maximumWidth, scale, font, fontKey, spacing) {
    const parts = leaderLineParts(value);
    return parts && textWidth(parts.left, scale, font, fontKey, spacing) + textWidth(parts.right, scale, font, fontKey, spacing) <= maximumWidth;
  }
  function normalizeEffectsAcrossLines(lines) {
    const activeEffects = []; const expression = /\[\[(\/?effect(?::[a-z-]+)?)\]\]/ig;
    return lines.map(line => {
      let output = activeEffects.map(effect => `[[effect:${effect}]]`).join(''); let position = 0; let match;
      while ((match = expression.exec(line))) {
        output += line.slice(position, match.index) + match[0];
        const marker = match[1].toLowerCase();
        if (marker === '/effect') activeEffects.pop();
        else activeEffects.push(marker.split(':')[1] || 'none');
        position = expression.lastIndex;
      }
      output += line.slice(position);
      return output + activeEffects.map(() => '[[/effect]]').reverse().join('');
    });
  }
  function wrapWithLineBreaks(value, maximumWidth, scale = 1, font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING, maximumLines = 4, preserveSpaces = false) {
    const lines = [];
    value.replace(/\r\n?/g, '\n').split('\n').forEach(paragraph => {
      if (!paragraph.trim()) { lines.push(''); return; }
      if (leaderLineFits(paragraph, maximumWidth, scale, font, fontKey, spacing)) lines.push(paragraph);
      else {
        const leader = leaderLineParts(paragraph);
        if (leader) lines.push(...wrapPreservingSpaces(leader.left, maximumWidth, scale, font, fontKey, spacing), ...wrapPreservingSpaces(leader.right, maximumWidth, scale, font, fontKey, spacing));
        else lines.push(...(preserveSpaces ? wrapPreservingSpaces(paragraph, maximumWidth, scale, font, fontKey, spacing) : wrap(paragraph, maximumWidth, scale, font, fontKey, spacing)));
      }
    });
    return normalizeEffectsAcrossLines(lines).slice(0, maximumLines);
  }
  function drawImageCentered(image, y, scale = 4, centerX = W / 2) {
    if (!image.complete || !image.naturalWidth) return;
    const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
    ctx.drawImage(image, Math.round(centerX - width / 2), y, width, height);
  }
  function logoReflectionColors(color) {
    const value = color.slice(1); const rgb = [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16)];
    return LOGO_REFLECTION_LEVELS.map(level => rgb.map(channel => level <= 1 ? Math.round(channel * level) : Math.round(channel + (255 - channel) * (level - 1))));
  }
  function drawAnimatedLogo(y, palette, time, scale = 4, centerX = W / 2, image = logoImages.pixel) {
    if (!image.complete || !image.naturalWidth) return;
    logoPixels.width = image.naturalWidth; logoPixels.height = image.naturalHeight;
    const logoCtx = logoPixels.getContext('2d', { willReadFrequently: true }); logoCtx.drawImage(image, 0, 0);
    const imageData = logoCtx.getImageData(0, 0, logoPixels.width, logoPixels.height);
    const reflection = logoReflectionColors(palette.accent);
    const phase = Math.floor(time * 4) % reflection.length;
    const shadow = palette.shadow.match(/\w\w/g).map(value => Number.parseInt(value, 16));
    for (let index = 0; index < imageData.data.length; index += 4) {
      if (!imageData.data[index + 3]) continue;
      const pixel = index / 4; const x = pixel % logoPixels.width;
      const sourceColor = `${imageData.data[index]},${imageData.data[index + 1]},${imageData.data[index + 2]}`;
      const band = LOGO_COLOR_BANDS[sourceColor] ?? 3;
      const color = image === logoImages.stacked && x < STACKED_LOGO_SHIP_WIDTH && band !== 0 ? [255, 255, 255] : image === logoImages.pixel && x >= 55 && x <= 63 ? reflection[3] : band === 0 ? shadow : reflection[(band - 1 + phase) % reflection.length];
      imageData.data[index] = color[0]; imageData.data[index + 1] = color[1]; imageData.data[index + 2] = color[2];
    }
    logoCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(logoPixels, Math.round(centerX - logoPixels.width * scale / 2), y, logoPixels.width * scale, logoPixels.height * scale);
  }
  function drawClassicArcade(y, palette, scale = 4, centerX = W / 2) {
    const image = logoImages.classic;
    if (!image.complete || !image.naturalWidth) return;
    classicPixels.width = image.naturalWidth; classicPixels.height = image.naturalHeight;
    const classicCtx = classicPixels.getContext('2d', { willReadFrequently: true }); classicCtx.drawImage(image, 0, 0);
    const imageData = classicCtx.getImageData(0, 0, classicPixels.width, classicPixels.height);
    const color = logoReflectionColors(palette.accent)[3];
    for (let index = 0; index < imageData.data.length; index += 4) {
      if (!imageData.data[index + 3]) continue;
      imageData.data[index] = color[0]; imageData.data[index + 1] = color[1]; imageData.data[index + 2] = color[2];
    }
    classicCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(classicPixels, Math.round(centerX - classicPixels.width * scale / 2), y, classicPixels.width * scale, classicPixels.height * scale);
  }
  function drawTextBoundaries(rectangles, palette) {
    ctx.save(); ctx.strokeStyle = palette.muted; ctx.globalAlpha = .8; ctx.lineWidth = 1;
    rectangles.filter(({ width, height }) => width > 1 && height > 1).forEach(({ x, y, width, height }) => ctx.strokeRect(Math.round(x) + .5, Math.round(y) + .5, Math.round(width) - 1, Math.round(height) - 1));
    ctx.restore();
  }
  function alignmentPoint(x, width, alignment) { return alignment === 'right' ? x + width : alignment === 'center' ? x + width / 2 : x; }
  function alignedStart(x, width, itemWidth, alignment) { return alignment === 'right' ? x + width - itemWidth : alignment === 'center' ? Math.round(x + (width - itemWidth) / 2) : x; }
  function verticallyAlignedStart(y, height, itemHeight, alignment) { return alignment === 'bottom' ? y + height - itemHeight : alignment === 'center' ? Math.round(y + (height - itemHeight) / 2) : y; }
  let previousOverflowKey = '', previousMissingGlyphsKey = '';
  function render(now, { exportFrame = false, staticText = false } = {}) {
    ({ body: bodyFont, header: headerFont, detail: detailFont, cta: ctaFont, footer: footerFont, hours: hoursFont } = getFonts());
    missingArcadeGlyphs = new Map();
    textAnimationDisabled = staticText;
    const palette = colors[controls.theme.value]; activeHighlightColor = palette.highlight; activeStrokeColor = palette.shadow; activeShadowColor = palette.shadow; activeBackgroundColor = palette.background; const time = now / 1000 * MOTION_SPEED; animationState.time = time;
    const format = getOutputFormat(); const isLandscape = format.id === 'landscape'; const sectionOrder = getSectionOrder();
    ctx.fillStyle = palette.background; ctx.fillRect(0, 0, W, H);
    gameBackgrounds.draw(palette, time);

    const imageBitmap = imageBlock.getBitmap(palette[controls.imageColor.value]);
    const portraitTextWidth = W - 48;
    const landscapeSafeArea = calculateLandscapeSafeArea(W, H);
    const headerFieldWidth = isLandscape ? landscapeSafeArea.width - 272 - 16 : portraitTextWidth;
    const landscapeMainWidth = imageBitmap ? headerFieldWidth : landscapeSafeArea.width;
    const landscapeSlotsSwapped = isLandscape && Boolean(imageBitmap) && contentVisibility.cta && controls.cta.value.trim()
      && sectionOrder.indexOf('image') < sectionOrder.indexOf('cta');
    const overflow = new Set();
    const boundedLines = (value, maximumWidth, scale, font, fontKey, spacing, maximumLines, preserveSpaces = false) => {
      const allLines = wrapWithLineBreaks(value, maximumWidth, scale, font, fontKey, spacing, Number.MAX_SAFE_INTEGER, preserveSpaces);
      if (allLines.length > maximumLines || allLines.some(line => !leaderLineParts(line) && textWidth(line, scale, font, fontKey, spacing) > maximumWidth)) overflow.add(fontKey);
      return allLines.slice(0, maximumLines);
    };

    const titleScale = textScale('headerScale'); const titleLineHeight = titleScale * 10;
    const maxHeaderLines = Math.max(1, Math.floor(HEADER_FIELD_HEIGHT / titleLineHeight));
    const headerLines = boundedLines(controls.headline.value, headerFieldWidth, titleScale, headerFont, 'header', HEADER_TEXT_SPACING, maxHeaderLines);
    const headerAlignment = textAlignments.header;

    const showDetail = contentVisibility.detail && controls.detail.value.trim();
    const detailScale = textScale('detailScale'); const detailLineHeight = detailScale * 12;
    const maxDetailLines = Math.max(1, Math.floor(DETAIL_FIELD_HEIGHT / detailLineHeight));
    const detailLines = showDetail ? scrollModes.detail === 'off' ? boundedLines(controls.detail.value, headerFieldWidth, detailScale, detailFont, 'detail', BODY_TEXT_SPACING, maxDetailLines) : [singleLineValue(controls.detail.value)] : [];
    const detailAlignment = textAlignments.detail;
    const detailFieldHeight = showDetail ? Math.min(DETAIL_FIELD_HEIGHT, detailLines.length * detailLineHeight + 8) : 0;

    const ctaScale = textScale('ctaScale'); const ctaPadding = 12 * ctaScale;
    const buttonMaxWidth = isLandscape ? landscapeSlotsSwapped ? 272 : landscapeMainWidth : W - 64;
    const maximumCtaLines = isLandscape && landscapeSlotsSwapped ? 5 : 2;
    const allCtaLines = contentVisibility.cta && controls.cta.value.trim() ? wrapWithLineBreaks(controls.cta.value, buttonMaxWidth - ctaPadding * 2, ctaScale, ctaFont, 'cta', BODY_TEXT_SPACING, Number.MAX_SAFE_INTEGER, true).filter(line => line.trim()) : [];
    if (allCtaLines.length > maximumCtaLines || allCtaLines.some(line => textWidth(line, ctaScale, ctaFont, 'cta') > buttonMaxWidth - ctaPadding * 2)) overflow.add('cta');
    const ctaLines = allCtaLines.slice(0, maximumCtaLines); const showCta = ctaLines.length > 0;
    const ctaGlyphHeight = ctaScale * 8; const ctaLineHeight = ctaScale * 10;
    const buttonHeight = showCta ? ctaGlyphHeight + (ctaLines.length - 1) * ctaLineHeight + 20 : 0;
    const ctaFieldHeight = showCta ? Math.max(CTA_FIELD_HEIGHT, buttonHeight + CTA_VERTICAL_OFFSET * 2) : 0;

    const footerScale = textScale('footerScale'); const footerLineHeight = footerScale * 12; const hoursLineHeight = HOURS_SCALE * 12;
    const hoursScrolling = scrollModes.hours !== 'off'; const footerTextWidth = isLandscape ? landscapeSafeArea.width : PORTRAIT_FOOTER_TEXT_WIDTH;
    const allHoursLines = contentVisibility.hours && controls.hours.value.trim() ? hoursScrolling ? [singleLineValue(controls.hours.value)] : wrapWithLineBreaks(controls.hours.value, footerTextWidth, HOURS_SCALE, hoursFont, 'hours', BODY_TEXT_SPACING, Number.MAX_SAFE_INTEGER) : [];
    if (!hoursScrolling && allHoursLines.length > 1) overflow.add('hours');
    const hoursLines = allHoursLines.slice(0, 1);
    const allFooterLines = wrapWithLineBreaks(controls.footer.value, footerTextWidth, footerScale, footerFont, 'footer', BODY_TEXT_SPACING, Number.MAX_SAFE_INTEGER);
    if (allFooterLines.length > 2 || allFooterLines.some(line => textWidth(line, footerScale, footerFont, 'footer') > footerTextWidth)) overflow.add('footer');
    const footerLines = allFooterLines.slice(0, 2);
    const hoursGap = hoursLines.length && footerLines.length ? HOURS_ADDRESS_GAP : 0;
    const footerHeight = hoursLines.length * hoursLineHeight + hoursGap + footerLines.length * footerLineHeight;
    const footerFieldHeight = Math.max(FOOTER_FIELD_HEIGHT, footerHeight);

    let imageWidth = 0, imageHeight = 0, rectangles;
    if (isLandscape) {
      const imageSlotWidth = landscapeSlotsSwapped ? headerFieldWidth : 272;
      const desiredImageWidth = imageBitmap ? Math.round(imageSlotWidth * Number(controls.imageScale.value) / 100) : 0;
      const desiredImageHeight = imageBitmap ? Math.max(1, Math.round(desiredImageWidth * imageBitmap.height / imageBitmap.width)) : 0;
      rectangles = calculateLandscapeLayout({ width: W, height: H, sectionOrder, detailHeight: detailFieldHeight, ctaHeight: ctaFieldHeight, footerHeight: footerFieldHeight, hasImage: Boolean(imageBitmap), imageHeight: desiredImageHeight });
      if (imageBitmap && rectangles.image) {
        const desiredWidth = Math.round(rectangles.image.width * Number(controls.imageScale.value) / 100);
        const desiredHeight = Math.max(1, Math.round(desiredWidth * imageBitmap.height / imageBitmap.width));
        imageHeight = Math.min(desiredHeight, rectangles.image.height);
        imageWidth = Math.max(1, Math.round(imageHeight * imageBitmap.width / imageBitmap.height));
      }
    } else {
      if (imageBitmap) {
        const desiredWidth = Math.round(portraitTextWidth * Number(controls.imageScale.value) / 100);
        const desiredHeight = Math.max(1, Math.round(desiredWidth * imageBitmap.height / imageBitmap.width));
        const fixedWithoutImage = LOGO_FIELD_HEIGHT + HEADER_FIELD_HEIGHT + detailFieldHeight + ctaFieldHeight + footerFieldHeight;
        const visibleSectionCount = 5 + (detailFieldHeight ? 1 : 0) + (ctaFieldHeight ? 1 : 0);
        const maximumHeight = Math.max(24, H - 27 - LAYOUT_TOP_Y - fixedWithoutImage - MIN_BODY_FIELD_HEIGHT - (visibleSectionCount - 1) * SECTION_GAP);
        imageHeight = Math.min(desiredHeight, MAX_IMAGE_FIELD_HEIGHT, maximumHeight);
        imageWidth = Math.max(1, Math.round(imageHeight * imageBitmap.width / imageBitmap.height));
      }
      const portraitLayout = calculateSectionLayout(sectionOrder, { logo: LOGO_FIELD_HEIGHT, image: imageHeight, header: HEADER_FIELD_HEIGHT, detail: detailFieldHeight, body: 0, cta: ctaFieldHeight, footer: footerFieldHeight }, { top: LAYOUT_TOP_Y, bottom: H - 27, gap: SECTION_GAP, minimumFlexibleHeight: MIN_BODY_FIELD_HEIGHT });
      rectangles = {
        logo: { x: 0, y: portraitLayout.positions.logo, width: W, height: LOGO_FIELD_HEIGHT },
        image: imageBitmap ? { x: TEXT_FIELD_X, y: portraitLayout.positions.image, width: portraitTextWidth, height: imageHeight } : null,
        header: { x: TEXT_FIELD_X, y: portraitLayout.positions.header, width: portraitTextWidth, height: HEADER_FIELD_HEIGHT },
        detail: showDetail ? { x: TEXT_FIELD_X, y: portraitLayout.positions.detail, width: portraitTextWidth, height: detailFieldHeight } : null,
        body: { x: TEXT_FIELD_X, y: portraitLayout.positions.body, width: portraitTextWidth, height: portraitLayout.heights.body },
        cta: showCta ? { x: 32, y: portraitLayout.positions.cta, width: W - 64, height: ctaFieldHeight } : null,
        footer: { x: TEXT_FIELD_X, y: portraitLayout.positions.footer, width: portraitTextWidth, height: footerFieldHeight }
      };
    }

    const boundaries = []; const logoCenterX = rectangles.logo.x + rectangles.logo.width / 2; const stackedLogo = isLandscape && controls.logo.value === 'pixel'; const logoScale = stackedLogo ? 4 : isLandscape ? 2 : 4; const logoY = rectangles.logo.y + (isLandscape ? 10 : 0);
    if (controls.logo.value === 'pixel') drawAnimatedLogo(logoY, palette, time, logoScale, logoCenterX, stackedLogo ? logoImages.stacked : logoImages.pixel);
    else drawImageCentered(logoImages[controls.logo.value], logoY, logoScale, logoCenterX);
    if (controls.classic.checked) drawClassicArcade(rectangles.logo.y + (stackedLogo ? 70 : isLandscape ? 54 : 50), palette, 4, logoCenterX);

    if (imageBitmap && rectangles.image) {
      const imageX = alignedStart(rectangles.image.x, rectangles.image.width, imageWidth, controls.imageAlign.value);
      const imageY = isLandscape ? rectangles.image.y + Math.round((rectangles.image.height - imageHeight) / 2) : rectangles.image.y;
      ctx.save(); ctx.globalAlpha = Number(controls.imageOpacity.value) / 100; ctx.imageSmoothingEnabled = false;
      ctx.drawImage(imageBitmap, imageX, imageY, imageWidth, imageHeight); ctx.restore();
      boundaries.push({ x: imageX, y: imageY, width: imageWidth, height: imageHeight });
    }

    const titleY = verticallyAlignedStart(rectangles.header.y, rectangles.header.height, headerLines.length * titleLineHeight, textVerticalAlignments.header);
    headerLines.forEach((line, index) => styledText('headline', line, alignmentPoint(rectangles.header.x, rectangles.header.width, headerAlignment), titleY + index * titleLineHeight, palette.text, palette.shadow, titleScale, headerAlignment, headerFont, 'header', HEADER_TEXT_SPACING));
    boundaries.push(rectangles.header);

    if (showDetail && rectangles.detail) {
      const detailY = verticallyAlignedStart(rectangles.detail.y, rectangles.detail.height, detailLines.length * detailLineHeight, textVerticalAlignments.detail);
      detailLines.forEach((line, index) => {
        const lineY = detailY + index * detailLineHeight;
        if (scrollModes.detail === 'off') styledText('body', line, alignmentPoint(rectangles.detail.x, rectangles.detail.width, detailAlignment), lineY, palette.accent, palette.shadow, detailScale, detailAlignment, detailFont, 'detail');
        else scrollingText(line, rectangles.detail.x, rectangles.detail.width, lineY, palette.accent, palette.shadow, detailScale, detailFont, 'detail', BODY_TEXT_SPACING, scrollModes.detail);
      });
      boundaries.push(rectangles.detail);
    }

    const bodyRect = { x: rectangles.body.x + 8, y: rectangles.body.y, width: rectangles.body.width - 12, height: rectangles.body.height };
    const bodyScale = textScale('bodyScale'); const bodyLineHeight = bodyScale * 12; const maxBodyLines = Math.max(1, Math.floor(bodyRect.height / bodyLineHeight));
    const bodyLines = boundedLines(controls.body.value, bodyRect.width, bodyScale, bodyFont, 'body', BODY_TEXT_SPACING, maxBodyLines, true);
    const bodyAlignment = textAlignments.body; const bodyY = verticallyAlignedStart(bodyRect.y, bodyRect.height, bodyLines.length * bodyLineHeight, textVerticalAlignments.body);
    const bodyLineWidths = bodyLines.map(line => leaderLineParts(line) ? bodyRect.width : textWidth(line, bodyScale, bodyFont, 'body', BODY_TEXT_SPACING));
    if (getBodyBorderStyle() !== 'none' && bodyLines.length) {
      const bodyLineStarts = bodyLineWidths.map(width => alignedStart(bodyRect.x, bodyRect.width, width, bodyAlignment));
      const contentLeft = Math.min(...bodyLineStarts), contentRight = Math.max(...bodyLineStarts.map((start, index) => start + bodyLineWidths[index]));
      const contentBottom = bodyY + (bodyLines.length - 1) * bodyLineHeight + bodyScale * 10;
      const borderTile = 8 * bodyScale, borderPadding = borderTile;
      const borderX = Math.floor((contentLeft - borderPadding) / borderTile) * borderTile, borderY = Math.floor((bodyY - borderPadding) / borderTile) * borderTile;
      const borderRight = Math.ceil((contentRight + borderPadding) / borderTile) * borderTile, borderBottom = Math.ceil((contentBottom + borderPadding) / borderTile) * borderTile;
      drawBodyBorder(getBodyBorderStyle(), borderX, borderY, borderRight - borderX, borderBottom - borderY, palette.accent, bodyScale);
    }
    bodyLines.forEach((line, index) => {
      const lineY = bodyY + index * bodyLineHeight;
      if (leaderLineParts(line)) leaderText(line, bodyRect.x, bodyRect.width, lineY, palette.text, palette.shadow, bodyScale, bodyFont, 'body', BODY_TEXT_SPACING);
      else styledText('body', line, alignmentPoint(bodyRect.x, bodyRect.width, bodyAlignment), lineY, palette.text, palette.shadow, bodyScale, bodyAlignment);
    });
    boundaries.push(bodyRect);

    if (showCta && rectangles.cta) {
      const buttonWidth = Math.min(rectangles.cta.width, Math.max(...ctaLines.map(line => textWidth(line, ctaScale, ctaFont, 'cta'))) + ctaPadding * 2);
      const ctaY = verticallyAlignedStart(rectangles.cta.y + CTA_VERTICAL_OFFSET, rectangles.cta.height - CTA_VERTICAL_OFFSET * 2, buttonHeight, textVerticalAlignments.cta);
      const ctaX = alignedStart(rectangles.cta.x, rectangles.cta.width, buttonWidth, textAlignments.cta);
      ctx.fillStyle = palette.accent; ctx.fillRect(ctaX, ctaY, buttonWidth, buttonHeight);
      const ctaTextY = ctaY + Math.round((buttonHeight - (ctaGlyphHeight + (ctaLines.length - 1) * ctaLineHeight)) / 2);
      ctaLines.forEach((line, index) => styledText('body', line, ctaX + buttonWidth / 2, ctaTextY + index * ctaLineHeight, palette.background, palette.shadow, ctaScale, 'center', ctaFont, 'cta'));
      boundaries.push(rectangles.cta);
    }

    const footerY = verticallyAlignedStart(rectangles.footer.y, rectangles.footer.height, footerHeight, textVerticalAlignments.footer) + FOOTER_VERTICAL_OFFSET;
    const footerViewportWidth = Math.min(footerTextWidth, rectangles.footer.width); const footerViewportX = alignedStart(rectangles.footer.x, rectangles.footer.width, footerViewportWidth, 'center'); const footerTextCenter = rectangles.footer.x + rectangles.footer.width / 2;
    hoursLines.forEach((line, index) => {
      const lineY = footerY + index * hoursLineHeight;
      if (hoursScrolling) scrollingText(line, footerViewportX, footerViewportWidth, lineY, palette.text, palette.shadow, HOURS_SCALE, hoursFont, 'hours', BODY_TEXT_SPACING, scrollModes.hours);
      else styledText('body', line, footerTextCenter, lineY, palette.text, palette.shadow, HOURS_SCALE, 'center', hoursFont, 'hours');
    });
    footerLines.forEach((line, index) => styledText('body', line, footerTextCenter, footerY + hoursLines.length * hoursLineHeight + hoursGap + index * footerLineHeight, palette.accent, palette.shadow, footerScale, 'center', footerFont, 'footer'));
    boundaries.push({ x: footerViewportX, y: rectangles.footer.y, width: footerViewportWidth, height: rectangles.footer.height });

    const outputWidth = exportFrame ? W * EXPORT_SCALE : W;
    const outputHeight = exportFrame ? H * EXPORT_SCALE : H;
    const finalFrame = crtPipeline.render({ outputWidth, outputHeight });
    if (exportFrame) exportCtx.drawImage(finalFrame, 0, 0, outputWidth, outputHeight);
    if (finalFrame !== canvas) ctx.drawImage(finalFrame, 0, 0, W, H);
    if (controls.boundaries.checked) drawTextBoundaries(boundaries, palette);
    const overflowSections = [...overflow].sort(); const overflowKey = overflowSections.join(',');
    if (overflowKey !== previousOverflowKey) { previousOverflowKey = overflowKey; onOverflowChange?.(overflowSections); }
    const missingGlyphs = [...missingArcadeGlyphs].map(([section, characters]) => ({ section, characters: [...characters].sort() }));
    const missingGlyphsKey = JSON.stringify(missingGlyphs);
    if (missingGlyphsKey !== previousMissingGlyphsKey) { previousMissingGlyphsKey = missingGlyphsKey; onMissingGlyphsChange?.(missingGlyphs); }
    return { overflowSections, missingGlyphs };
  }
  function resize(format) {
    W = format.logicalWidth; H = format.logicalHeight; EXPORT_SCALE = format.exportScale;
    canvas.width = W; canvas.height = H; ctx.imageSmoothingEnabled = false;
    exportCtx.canvas.width = format.exportWidth; exportCtx.canvas.height = format.exportHeight; exportCtx.imageSmoothingEnabled = false;
    gameBackgrounds.resize(W, H);
    crtPipeline.resize({ sourceWidth: W, sourceHeight: H, outputWidth: W, outputHeight: H });
  }
  function clearFontCaches() { glyphCache.clear(); glyphBoundsCache.clear(); }
  function drawLegacyGlyphPreview(canvasElement, glyphData, color) {
    const tileCtx = canvasElement.getContext('2d'); tileCtx.clearRect(0, 0, 16, 16); tileCtx.imageSmoothingEnabled = false;
    tileCtx.drawImage(legacyGlyph(glyphData, color), 0, 0, 16, 16);
  }
  return { clearFontCaches, drawLegacyGlyphPreview, render, resize };
}
