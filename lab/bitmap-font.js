export function parseHeaderFont(source) {
  const values = source.match(/0x[0-9a-f]{2}/ig) || [];
  if (values.length < 768) throw new Error('Bitmap font data is incomplete.');
  return Uint8Array.from(values.slice(0, 768), value => Number.parseInt(value.slice(2), 16));
}

export async function loadBitmapFont(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Bitmap font request returned ${response.status}.`);
  return parseHeaderFont(await response.text());
}

export function createBitmapFontRenderer({ context, font }) {
  function glyphIndex(character) {
    const code = character.codePointAt(0);
    return code >= 0x20 && code <= 0x7e ? code - 0x20 : null;
  }

  function measureText(value, scale = 1, gap = 1) {
    const characters = [...value];
    if (!characters.length) return 0;
    return characters.reduce((width, character, index) => {
      const characterWidth = character === ' ' ? 6 : 8;
      return width + characterWidth * scale + (index < characters.length - 1 ? gap * scale : 0);
    }, 0);
  }

  function drawGlyph(character, x, y, scale, color) {
    const index = glyphIndex(character);
    if (index === null) return;
    context.fillStyle = color;
    if (font?.kind === 'arcade') {
      context.imageSmoothingEnabled = false;
      context.drawImage(font.atlas, index * 8, 0, 8, 8, x, y, 8 * scale, 8 * scale);
      return;
    }
    const offset = index * 8;
    for (let row = 0; row < 8; row += 1) {
      const bits = font[offset + row] || 0;
      for (let column = 0; column < 8; column += 1) {
        if (bits & (128 >> column)) context.fillRect(x + column * scale, y + row * scale, scale, scale);
      }
    }
  }

  function drawText(value, x, y, { scale = 1, color = '#ffffff', align = 'left', gap = 1, shadow = null, shadowOffset = scale } = {}) {
    const width = measureText(value, scale, gap);
    let cursor = align === 'center' ? Math.round(x - width / 2) : align === 'right' ? Math.round(x - width) : Math.round(x);
    if (shadow && font?.kind !== 'arcade') {
      for (const character of value) {
        drawGlyph(character, cursor + shadowOffset, y + shadowOffset, scale, shadow);
        cursor += (character === ' ' ? 6 : 8) * scale + gap * scale;
      }
      cursor = align === 'center' ? Math.round(x - width / 2) : align === 'right' ? Math.round(x - width) : Math.round(x);
    }
    for (const character of value) {
      drawGlyph(character, cursor, y, scale, color);
      cursor += (character === ' ' ? 6 : 8) * scale + gap * scale;
    }
    return width;
  }

  function drawBlock(value, x, y, options = {}) {
    const { lineGap = 2, ...textOptions } = options;
    const lines = String(value).split('\n');
    lines.forEach((line, index) => drawText(line, x, y + index * (8 + lineGap) * (textOptions.scale || 1), textOptions));
    return lines.length * (8 + lineGap) * (textOptions.scale || 1) - lineGap * (textOptions.scale || 1);
  }

  return { drawGlyph, drawText, drawBlock, measureText };
}
