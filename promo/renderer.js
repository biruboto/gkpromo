export function createPromoRenderer({
  context: ctx, canvas, exportContext: exportCtx, width: W, height: H, exportScale: EXPORT_SCALE,
  controls, colors, logoImages, legacyGlyphs, gameBackgrounds, crtPipeline, contentVisibility, scrollModes,
  textAlignments, textVerticalAlignments, getBodyBorderStyle, getFonts, getTextScale: textScale, animationState, leaderTabToken
}) {
  const HEADER_LOGO_Y = 24, CLASSIC_ARCADE_Y = 74;
  const COPY_TOP_Y = 120, TEXT_FIELD_X = 24, TEXT_FIELD_WIDTH = W - 48;
  const BODY_FIELD_X = TEXT_FIELD_X + 8, BODY_FIELD_WIDTH = TEXT_FIELD_WIDTH - 12;
  const HEADER_FIELD_HEIGHT = 80, DETAIL_FIELD_HEIGHT = 48, BODY_FIELD_HEIGHT = 192, CTA_FIELD_HEIGHT = 64;
  const MAX_BODY_LINES_WITH_CTA = 10;
  const CTA_VERTICAL_OFFSET = 8;
  const EMPTY_DETAIL_BODY_GAP = 24;
  const FOOTER_FIELD_Y = 572, FOOTER_FIELD_HEIGHT = 76;
  const FOOTER_VERTICAL_OFFSET = 8;
  const FOOTER_TEXT_WIDTH = 414;
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
  const logoPixels = document.createElement('canvas');
  const classicPixels = document.createElement('canvas');
  const LOGO_COLOR_BANDS = { '24,29,48': 0, '69,47,77': 1, '153,61,104': 2, '218,68,112': 3, '251,63,99': 4 };
  const LOGO_REFLECTION_LEVELS = [.8, 1, 1.32, 1.6];
  let activeHighlightColor = '#ffffff', activeStrokeColor = '#000000', activeShadowColor = '#dd4455';
  function superscriptScale(scale) { return Math.max(1, Math.round(scale / 2)); }
  function glyphIndexFor(character) {
    const codepoint = character.codePointAt(0);
    // Header fonts are ordered directly from printable ASCII space through tilde.
    return codepoint >= 0x20 && codepoint <= 0x7e ? codepoint - 0x20 : 0x1f;
  }
  function glyph(character, color, font = bodyFont, fontKey = 'body') {
    const glyphIndex = glyphIndexFor(character);
    const key = `${fontKey}:${glyphIndex}:${color}`;
    if (glyphCache.has(key)) return glyphCache.get(key);
    const image = document.createElement('canvas'); image.width = image.height = 8;
    const imageCtx = image.getContext('2d'); imageCtx.fillStyle = color;
    for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) if ((font?.[glyphIndex * 8 + row] || 0) & (128 >> column)) imageCtx.fillRect(column, row, 1, 1);
    glyphCache.set(key, image); return image;
  }
  function glyphBounds(character, font = bodyFont, fontKey = 'body') {
    const glyphIndex = glyphIndexFor(character);
    const key = `${fontKey}:${glyphIndex}`;
    if (glyphBoundsCache.has(key)) return glyphBoundsCache.get(key);
    let left = 8, right = -1, top = 8, bottom = -1;
    for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) {
      if ((font?.[glyphIndex * 8 + row] || 0) & (128 >> column)) { left = Math.min(left, column); right = Math.max(right, column); top = Math.min(top, row); bottom = Math.max(bottom, row); }
    }
    const bounds = right < 0 ? null : { left, width: right - left + 1, top, bottom };
    glyphBoundsCache.set(key, bounds); return bounds;
  }
  function legacyGlyph(glyphData, color) {
    const key = `${glyphData.id}:${color}`;
    if (legacyGlyphCache.has(key)) return legacyGlyphCache.get(key);
    const image = document.createElement('canvas'); image.width = image.height = 8;
    const imageCtx = image.getContext('2d'); imageCtx.fillStyle = color;
    for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) if (glyphData.bitmap[row] & (128 >> column)) imageCtx.fillRect(column, row, 1, 1);
    legacyGlyphCache.set(key, image); return image;
  }
  const BODY_BORDER_GLYPHS = {
    topLeft: 'petscii-upper-70', topRight: 'petscii-upper-6e', bottomLeft: 'petscii-upper-6d', bottomRight: 'petscii-upper-7d',
    roundedTopLeft: 'petscii-upper-55', roundedTopRight: 'petscii-upper-49', roundedBottomLeft: 'petscii-upper-4a', roundedBottomRight: 'petscii-upper-4b',
    top: 'petscii-upper-43', bottom: 'petscii-upper-43', left: 'petscii-upper-42', right: 'petscii-upper-42'
  };
  function drawBorderGlyph(glyphId, x, y, color) {
    const glyphData = legacyGlyphs.get(glyphId);
    if (!glyphData) return false;
    ctx.drawImage(legacyGlyph(glyphData, color), x, y, 8, 8);
    return true;
  }
  function drawBodyBorder(style, x, y, width, height, color) {
    if (style === 'none') return;
    const right = x + width - 8, bottom = y + height - 8;
    for (let edgeX = x + 8; edgeX < right; edgeX += 8) {
      drawBorderGlyph(BODY_BORDER_GLYPHS.top, edgeX, y, color);
      drawBorderGlyph(BODY_BORDER_GLYPHS.bottom, edgeX, bottom, color);
    }
    for (let edgeY = y + 8; edgeY < bottom; edgeY += 8) {
      drawBorderGlyph(BODY_BORDER_GLYPHS.left, x, edgeY, color);
      drawBorderGlyph(BODY_BORDER_GLYPHS.right, right, edgeY, color);
    }
    if (style === 'rounded') {
      drawBorderGlyph(BODY_BORDER_GLYPHS.roundedTopLeft, x, y, color); drawBorderGlyph(BODY_BORDER_GLYPHS.roundedTopRight, right, y, color);
      drawBorderGlyph(BODY_BORDER_GLYPHS.roundedBottomLeft, x, bottom, color); drawBorderGlyph(BODY_BORDER_GLYPHS.roundedBottomRight, right, bottom, color);
      return;
    }
    drawBorderGlyph(BODY_BORDER_GLYPHS.topLeft, x, y, color); drawBorderGlyph(BODY_BORDER_GLYPHS.topRight, right, y, color);
    drawBorderGlyph(BODY_BORDER_GLYPHS.bottomLeft, x, bottom, color); drawBorderGlyph(BODY_BORDER_GLYPHS.bottomRight, right, bottom, color);
  }
  function reflectedGlyph(glyphLayout, color, font = bodyFont, fontKey = 'body', phase = 0) {
    const glyphId = glyphLayout.type === 'legacy' ? glyphLayout.glyphData.id : glyphIndexFor(glyphLayout.character);
    const key = `${glyphLayout.type}:${fontKey}:${glyphId}:${color}:${phase}`;
    if (reflectedGlyphCache.has(key)) return reflectedGlyphCache.get(key);
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
      if (glyphLayout.effects.includes('blink') && Math.floor(animationState.time * 2) % 2) return;
      const glyphScale = glyphLayout.scale;
      const sweepStart = (animationState.time * 72) % (layout.width + 8 * scale) - 8 * scale;
      const isSwept = glyphLayout.effects.includes('sweep') && glyphLayout.x + glyphLayout.bounds.width * glyphScale >= sweepStart && glyphLayout.x <= sweepStart + 8 * scale;
      const glyphColor = isSwept || glyphLayout.effects.includes('flash') && Math.floor(animationState.time * 2) % 2 ? activeHighlightColor : glyphLayout.effects.includes('highlight') ? activeHighlightColor : color;
      const waveOffset = glyphLayout.effects.includes('wave') ? Math.round(Math.sin(animationState.time * 8 - glyphIndex * .85) * 2) * glyphScale : 0;
      const glyphY = y + glyphLayout.yOffset + waveOffset;
      const spinElapsed = ((animationState.time - glyphIndex * SPIN_STAGGER) % SPIN_PERIOD + SPIN_PERIOD) % SPIN_PERIOD;
      const isSpinning = glyphLayout.effects.includes('spin') && spinElapsed < SPIN_DURATION;
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
      const image = glyphLayout.effects.includes('reflect') ? reflectedGlyph(glyphLayout, glyphColor, font, fontKey, Math.floor(animationState.time * 4) % LOGO_REFLECTION_LEVELS.length) : glyphLayout.type === 'legacy' ? legacyGlyph(glyphLayout.glyphData, glyphColor) : glyph(glyphLayout.character, glyphColor, font, fontKey);
      const strokeImage = glyphLayout.effects.includes('stroke') ? glyphLayout.type === 'legacy' ? legacyGlyph(glyphLayout.glyphData, activeStrokeColor) : glyph(glyphLayout.character, activeStrokeColor, font, fontKey) : null;
      if (strokeImage) {
        const strokeThickness = scale;
        for (const offsetY of [-1, 0, 1]) for (const offsetX of [-1, 0, 1]) {
          if (offsetX || offsetY) drawGlyphImage(strokeImage, start + glyphLayout.x + offsetX * strokeThickness, glyphY + offsetY * strokeThickness);
        }
      }
      if (forceShadow || glyphLayout.effects.includes('shadow')) {
        const shadowImage = glyphLayout.type === 'legacy' ? legacyGlyph(glyphLayout.glyphData, shadowColor) : glyph(glyphLayout.character, shadowColor, font, fontKey);
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
        else underlineSegments.push({ run: glyphLayout.underlineRun, color: glyphColor, start: glyphStart, end: glyphEnd, y: glyphY, thickness: glyphScale });
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
    if (line) lines.push(line); return normalizeEffectsAcrossLines(lines).slice(0, 4);
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
  function drawImageCentered(image, y, scale = 4) {
    if (!image.complete || !image.naturalWidth) return;
    const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
    ctx.drawImage(image, Math.round((W - width) / 2), y, width, height);
  }
  function logoReflectionColors(color) {
    const value = color.slice(1); const rgb = [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16)];
    return LOGO_REFLECTION_LEVELS.map(level => rgb.map(channel => level <= 1 ? Math.round(channel * level) : Math.round(channel + (255 - channel) * (level - 1))));
  }
  function drawAnimatedLogo(y, palette, time, scale = 4) {
    const image = logoImages.pixel;
    if (!image.complete || !image.naturalWidth) return;
    logoPixels.width = image.naturalWidth; logoPixels.height = image.naturalHeight;
    const logoCtx = logoPixels.getContext('2d'); logoCtx.drawImage(image, 0, 0);
    const imageData = logoCtx.getImageData(0, 0, logoPixels.width, logoPixels.height);
    const reflection = logoReflectionColors(palette.accent);
    const phase = Math.floor(time * 4) % reflection.length;
    const shadow = palette.shadow.match(/\w\w/g).map(value => Number.parseInt(value, 16));
    for (let index = 0; index < imageData.data.length; index += 4) {
      if (!imageData.data[index + 3]) continue;
      const pixel = index / 4; const x = pixel % logoPixels.width;
      const sourceColor = `${imageData.data[index]},${imageData.data[index + 1]},${imageData.data[index + 2]}`;
      const band = LOGO_COLOR_BANDS[sourceColor] ?? 3;
      const color = x >= 55 && x <= 63 ? reflection[3] : band === 0 ? shadow : reflection[(band - 1 + phase) % reflection.length];
      imageData.data[index] = color[0]; imageData.data[index + 1] = color[1]; imageData.data[index + 2] = color[2];
    }
    logoCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(logoPixels, Math.round((W - logoPixels.width * scale) / 2), y, logoPixels.width * scale, logoPixels.height * scale);
  }
  function drawClassicArcade(y, palette, scale = 4) {
    const image = logoImages.classic;
    if (!image.complete || !image.naturalWidth) return;
    classicPixels.width = image.naturalWidth; classicPixels.height = image.naturalHeight;
    const classicCtx = classicPixels.getContext('2d'); classicCtx.drawImage(image, 0, 0);
    const imageData = classicCtx.getImageData(0, 0, classicPixels.width, classicPixels.height);
    const color = logoReflectionColors(palette.accent)[3];
    for (let index = 0; index < imageData.data.length; index += 4) {
      if (!imageData.data[index + 3]) continue;
      imageData.data[index] = color[0]; imageData.data[index + 1] = color[1]; imageData.data[index + 2] = color[2];
    }
    classicCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(classicPixels, Math.round((W - classicPixels.width * scale) / 2), y, classicPixels.width * scale, classicPixels.height * scale);
  }
  function drawTextBoundaries(rectangles, palette) {
    ctx.save(); ctx.strokeStyle = palette.muted; ctx.globalAlpha = .8; ctx.lineWidth = 1;
    rectangles.filter(({ width, height }) => width > 1 && height > 1).forEach(({ x, y, width, height }) => ctx.strokeRect(Math.round(x) + .5, Math.round(y) + .5, Math.round(width) - 1, Math.round(height) - 1));
    ctx.restore();
  }
  function alignmentPoint(x, width, alignment) { return alignment === 'right' ? x + width : alignment === 'center' ? x + width / 2 : x; }
  function alignedStart(x, width, itemWidth, alignment) { return alignment === 'right' ? x + width - itemWidth : alignment === 'center' ? Math.round(x + (width - itemWidth) / 2) : x; }
  function verticallyAlignedStart(y, height, itemHeight, alignment) { return alignment === 'bottom' ? y + height - itemHeight : alignment === 'center' ? Math.round(y + (height - itemHeight) / 2) : y; }
  function render(now) {
    ({ body: bodyFont, header: headerFont, detail: detailFont, cta: ctaFont, footer: footerFont, hours: hoursFont } = getFonts());
    const palette = colors[controls.theme.value]; activeHighlightColor = palette.highlight; activeStrokeColor = palette.shadow; activeShadowColor = palette.shadow; const time = now / 1000 * MOTION_SPEED; animationState.time = time;
    ctx.fillStyle = palette.background; ctx.fillRect(0, 0, W, H);
    gameBackgrounds.draw(palette, time);
    if (controls.logo.value === 'pixel') drawAnimatedLogo(HEADER_LOGO_Y, palette, time);
    else drawImageCentered(logoImages[controls.logo.value], HEADER_LOGO_Y);
    if (controls.classic.checked) drawClassicArcade(CLASSIC_ARCADE_Y, palette);
    const titleScale = textScale('headerScale');
    const headerFieldY = COPY_TOP_Y;
    const titleLineHeight = titleScale * 10;
    const maxHeaderLines = Math.max(1, Math.floor(HEADER_FIELD_HEIGHT / titleLineHeight));
    const lines = wrapWithLineBreaks(controls.headline.value, TEXT_FIELD_WIDTH, titleScale, headerFont, 'header', HEADER_TEXT_SPACING, maxHeaderLines);
    const headerAlignment = textAlignments.header;
    const titleY = verticallyAlignedStart(headerFieldY, HEADER_FIELD_HEIGHT, lines.length * titleLineHeight, textVerticalAlignments.header);
    lines.forEach((line, index) => styledText('headline', line, alignmentPoint(TEXT_FIELD_X, TEXT_FIELD_WIDTH, headerAlignment), titleY + index * titleLineHeight, palette.text, palette.shadow, titleScale, headerAlignment, headerFont, 'header', HEADER_TEXT_SPACING));
    const boundaries = [{ x: TEXT_FIELD_X, y: headerFieldY, width: TEXT_FIELD_WIDTH, height: HEADER_FIELD_HEIGHT }];
    const detailFieldY = headerFieldY + HEADER_FIELD_HEIGHT + 4;
    const showDetail = contentVisibility.detail && controls.detail.value.trim();
    const detailScale = textScale('detailScale'); const detailLineHeight = detailScale * 12;
    const maxDetailLines = Math.max(1, Math.floor(DETAIL_FIELD_HEIGHT / detailLineHeight));
    const detailLines = showDetail ? scrollModes.detail === 'off' ? wrapWithLineBreaks(controls.detail.value, TEXT_FIELD_WIDTH, detailScale, detailFont, 'detail', BODY_TEXT_SPACING, maxDetailLines) : [singleLineValue(controls.detail.value)] : [];
    const detailAlignment = textAlignments.detail;
    const detailFieldHeight = showDetail ? Math.min(DETAIL_FIELD_HEIGHT, detailLines.length * detailLineHeight + 8) : 0;
    const detailY = verticallyAlignedStart(detailFieldY, detailFieldHeight, detailLines.length * detailLineHeight, textVerticalAlignments.detail);
    detailLines.forEach((line, index) => {
      const lineY = detailY + index * detailLineHeight;
      if (scrollModes.detail === 'off') styledText('body', line, alignmentPoint(TEXT_FIELD_X, TEXT_FIELD_WIDTH, detailAlignment), lineY, palette.accent, palette.shadow, detailScale, detailAlignment, detailFont, 'detail');
      else scrollingText(line, TEXT_FIELD_X, TEXT_FIELD_WIDTH, lineY, palette.accent, palette.shadow, detailScale, detailFont, 'detail', BODY_TEXT_SPACING, scrollModes.detail);
    });
    const cta = controls.cta.value;
    const showCta = contentVisibility.cta && cta.trim();
    const bodyFieldY = detailFieldY + detailFieldHeight + (showDetail ? 8 : EMPTY_DETAIL_BODY_GAP);
    const bodyScale = textScale('bodyScale'); const bodyLineHeight = bodyScale * 12;
    const maxBodyLines = showCta ? MAX_BODY_LINES_WITH_CTA : Math.max(1, Math.floor((FOOTER_FIELD_Y - bodyFieldY) / bodyLineHeight));
    const bodyLines = wrapWithLineBreaks(controls.body.value, BODY_FIELD_WIDTH, bodyScale, bodyFont, 'body', BODY_TEXT_SPACING, maxBodyLines, true);
    const bodyFieldHeight = showCta ? Math.max(BODY_FIELD_HEIGHT, bodyLines.length * bodyLineHeight) : FOOTER_FIELD_Y - bodyFieldY;
    const bodyAlignment = textAlignments.body;
    const bodyY = verticallyAlignedStart(bodyFieldY, bodyFieldHeight, bodyLines.length * bodyLineHeight, textVerticalAlignments.body);
    const bodyLineWidths = bodyLines.map(line => leaderLineParts(line) ? BODY_FIELD_WIDTH : textWidth(line, bodyScale, bodyFont, 'body', BODY_TEXT_SPACING));
    if (getBodyBorderStyle() !== 'none' && bodyLines.length) {
      const bodyLineStarts = bodyLineWidths.map(width => alignedStart(BODY_FIELD_X, BODY_FIELD_WIDTH, width, bodyAlignment));
      const contentLeft = Math.min(...bodyLineStarts), contentRight = Math.max(...bodyLineStarts.map((start, index) => start + bodyLineWidths[index]));
      const contentBottom = bodyY + (bodyLines.length - 1) * bodyLineHeight + bodyScale * 10;
      const borderX = Math.floor((contentLeft - 16) / 8) * 8, borderY = Math.floor((bodyY - 16) / 8) * 8;
      const borderRight = Math.ceil((contentRight + 16) / 8) * 8, borderBottom = Math.ceil((contentBottom + 16) / 8) * 8;
      drawBodyBorder(getBodyBorderStyle(), borderX, borderY, borderRight - borderX, borderBottom - borderY, palette.accent);
    }
    bodyLines.forEach((line, index) => {
      const lineY = bodyY + index * bodyLineHeight;
      if (leaderLineParts(line)) leaderText(line, BODY_FIELD_X, BODY_FIELD_WIDTH, lineY, palette.text, palette.shadow, bodyScale, bodyFont, 'body', BODY_TEXT_SPACING);
      else styledText('body', line, alignmentPoint(BODY_FIELD_X, BODY_FIELD_WIDTH, bodyAlignment), lineY, palette.text, palette.shadow, bodyScale, bodyAlignment);
    });
    if (showDetail) boundaries.push({ x: TEXT_FIELD_X, y: detailFieldY, width: TEXT_FIELD_WIDTH, height: detailFieldHeight });
    boundaries.push({ x: BODY_FIELD_X, y: bodyFieldY, width: BODY_FIELD_WIDTH, height: bodyFieldHeight });
    if (showCta) {
      const ctaScale = textScale('ctaScale'); const buttonMaxWidth = W - 64; const ctaPadding = 12 * ctaScale;
      const ctaLines = wrapWithLineBreaks(cta, buttonMaxWidth - ctaPadding * 2, ctaScale, ctaFont, 'cta', BODY_TEXT_SPACING, 3, true).filter(line => line.trim()).slice(0, 2);
      const buttonWidth = Math.min(buttonMaxWidth, Math.max(...ctaLines.map(line => textWidth(line, ctaScale, ctaFont, 'cta'))) + ctaPadding * 2);
      const ctaGlyphHeight = ctaScale * 8; const ctaLineHeight = ctaScale * 10;
      const buttonHeight = ctaGlyphHeight + (ctaLines.length - 1) * ctaLineHeight + 20;
      const ctaFieldY = bodyFieldY + bodyFieldHeight + 12; const ctaFieldHeight = Math.max(CTA_FIELD_HEIGHT, buttonHeight); const ctaY = verticallyAlignedStart(ctaFieldY, ctaFieldHeight, buttonHeight, textVerticalAlignments.cta) + CTA_VERTICAL_OFFSET;
      const ctaX = alignedStart(32, W - 64, buttonWidth, textAlignments.cta);
      ctx.fillStyle = palette.accent; ctx.fillRect(ctaX, ctaY, buttonWidth, buttonHeight);
      const ctaTextY = ctaY + Math.round((buttonHeight - (ctaGlyphHeight + (ctaLines.length - 1) * ctaLineHeight)) / 2);
      ctaLines.forEach((line, index) => styledText('body', line, ctaX + buttonWidth / 2, ctaTextY + index * ctaLineHeight, palette.background, palette.shadow, ctaScale, 'center', ctaFont, 'cta'));
      boundaries.push({ x: 32, y: ctaFieldY, width: W - 64, height: ctaFieldHeight });
    }
    const footerScale = textScale('footerScale'); const footerLineHeight = footerScale * 12; const hoursLineHeight = HOURS_SCALE * 12;
    const hoursScrolling = scrollModes.hours !== 'off'; const hoursLines = contentVisibility.hours && controls.hours.value.trim() ? hoursScrolling ? [singleLineValue(controls.hours.value)] : wrapWithLineBreaks(controls.hours.value, FOOTER_TEXT_WIDTH, HOURS_SCALE, hoursFont, 'hours', BODY_TEXT_SPACING, 1) : [];
    const footerLines = wrapWithLineBreaks(controls.footer.value, FOOTER_TEXT_WIDTH, footerScale, footerFont, 'footer', BODY_TEXT_SPACING, 2); const hoursGap = hoursLines.length && footerLines.length ? HOURS_ADDRESS_GAP : 0; const footerHeight = hoursLines.length * hoursLineHeight + hoursGap + footerLines.length * footerLineHeight; const footerY = verticallyAlignedStart(FOOTER_FIELD_Y, FOOTER_FIELD_HEIGHT, footerHeight, textVerticalAlignments.footer) + FOOTER_VERTICAL_OFFSET;
    const footerViewportX = alignedStart(TEXT_FIELD_X, TEXT_FIELD_WIDTH, FOOTER_TEXT_WIDTH, 'center'); const footerTextCenter = TEXT_FIELD_X + TEXT_FIELD_WIDTH / 2;
    hoursLines.forEach((line, index) => {
      const lineY = footerY + index * hoursLineHeight;
      if (hoursScrolling) scrollingText(line, footerViewportX, FOOTER_TEXT_WIDTH, lineY, palette.text, palette.shadow, HOURS_SCALE, hoursFont, 'hours', BODY_TEXT_SPACING, scrollModes.hours);
      else styledText('body', line, footerTextCenter, lineY, palette.text, palette.shadow, HOURS_SCALE, 'center', hoursFont, 'hours');
    });
    footerLines.forEach((line, index) => styledText('body', line, footerTextCenter, footerY + hoursLines.length * hoursLineHeight + hoursGap + index * footerLineHeight, palette.accent, palette.shadow, footerScale, 'center', footerFont, 'footer'));
    boundaries.push({ x: TEXT_FIELD_X, y: FOOTER_FIELD_Y, width: TEXT_FIELD_WIDTH, height: FOOTER_FIELD_HEIGHT });
    const finalFrame = crtPipeline.render();
    if (finalFrame !== canvas) ctx.drawImage(finalFrame, 0, 0, W, H);
    exportCtx.drawImage(finalFrame, 0, 0, W * EXPORT_SCALE, H * EXPORT_SCALE);
    if (controls.boundaries.checked) drawTextBoundaries(boundaries, palette);
  }
  function clearFontCaches() { glyphCache.clear(); glyphBoundsCache.clear(); }
  function drawLegacyGlyphPreview(canvasElement, glyphData, color) {
    const tileCtx = canvasElement.getContext('2d'); tileCtx.clearRect(0, 0, 16, 16); tileCtx.imageSmoothingEnabled = false;
    tileCtx.drawImage(legacyGlyph(glyphData, color), 0, 0, 16, 16);
  }
  return { clearFontCaches, drawLegacyGlyphPreview, render };
}
