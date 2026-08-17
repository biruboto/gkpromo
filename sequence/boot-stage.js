const COLORS = {
  background: '#0c0a20',
  dim: '#4848d0',
  text: '#ccccff',
  secondary: '#88ffee',
  status: '#ffdd44',
  accent: '#00ddff'
};
const W = 180, H = 225, SCALE = 3;
const GLYPH_SIZE = 8, GLYPH_ADVANCE = 9, TEXT_LEADING = 4;
const OS_COPY = 'GKOS v1.59', COPYRIGHT_COPY = '(C)1987';
const TEXT_X = 18, TOP_TEXT_X = 76, OS_LINE_Y = 19, COPYRIGHT_LINE_Y = OS_LINE_Y + GLYPH_SIZE + TEXT_LEADING, UNDERLINE_Y = COPYRIGHT_LINE_Y + GLYPH_SIZE + 2, LOADING_LINE_Y = UNDERLINE_Y + GLYPH_SIZE + 4, READOUT_LINE_Y = LOADING_LINE_Y + GLYPH_SIZE + TEXT_LEADING;
const BORDER_DURATION = .325;
const OS_LINE_START = .45;
const OS_LINE_DURATION = .28;
const COPYRIGHT_START = OS_LINE_START + OS_LINE_DURATION;
const UNDERLINE_START = COPYRIGHT_START + OS_LINE_DURATION;
const UNDERLINE_DURATION = .15;
const LOADING_START = UNDERLINE_START + UNDERLINE_DURATION + .18;
const MEMORY_READ_START = LOADING_START + .34;
const MEMORY_READ_DURATION = .2;
const MEMORY_COUNT_DURATION = .78;
const MEMORY_COUNT_START = MEMORY_READ_START + MEMORY_READ_DURATION;
const OK_BLINK_START = MEMORY_COUNT_START + MEMORY_COUNT_DURATION;
const OK_BLINK_COUNT = 3;
const OK_BLINK_INTERVAL = .32 / OK_BLINK_COUNT;
const OK_BLINK_END = OK_BLINK_START + OK_BLINK_INTERVAL * 2 * OK_BLINK_COUNT;
const SPINNER_FRAMES = ['I', '/', '-', '\\'];
const MEMORY_VALUE_RIGHT = W - 37;
const MEMORY_FIELD_START = MEMORY_VALUE_RIGHT - (GLYPH_ADVANCE * 3 - 1);
const MEMORY_FIELD_CHARACTERS = 5;
const MEMORY_FIELD_RIGHT = MEMORY_FIELD_START + (MEMORY_FIELD_CHARACTERS * GLYPH_ADVANCE - 1);
const PERIPHERAL_START = OK_BLINK_END + .24;
const PERIPHERAL_SCAN_START = PERIPHERAL_START + .32;
const PERIPHERAL_SCAN_DURATION = 1.25;
const PERIPHERAL_LINE_Y = READOUT_LINE_Y + (GLYPH_SIZE + TEXT_LEADING) * 2;
const PERIPHERAL_FOUND_Y = PERIPHERAL_LINE_Y + GLYPH_SIZE + TEXT_LEADING;
const FOUND_START = PERIPHERAL_SCAN_START + PERIPHERAL_SCAN_DURATION;
const FOUND_BLINK_START = FOUND_START + .2;
const FOUND_BLINK_COUNT = 3;
const FOUND_BLINK_INTERVAL = .32 / FOUND_BLINK_COUNT;
const FOUND_BLINK_END = FOUND_BLINK_START + FOUND_BLINK_INTERVAL * 2 * FOUND_BLINK_COUNT;
const SHIP_START = FOUND_BLINK_END + .24;
const SHIP_SCAN_START = SHIP_START + .32;
const SHIP_SCAN_DURATION = 1.25;
const SHIP_LINE_Y = PERIPHERAL_FOUND_Y + GLYPH_SIZE + TEXT_LEADING;
const SHIP_ID_START = SHIP_SCAN_START + SHIP_SCAN_DURATION + .24;
const SHIP_ID_LINE_Y = SHIP_LINE_Y + (GLYPH_SIZE + TEXT_LEADING) * 2;
const SHIP_NAME_LINE_Y = SHIP_ID_LINE_Y + GLYPH_SIZE + TEXT_LEADING;
const INTERFACE_START = SHIP_ID_START + .52;
const TRANSITION_START = INTERFACE_START;
const INTERFACE_LINE_Y = SHIP_NAME_LINE_Y + GLYPH_SIZE + TEXT_LEADING;
const TRANSITION_DURATION = 2.1;
const UNDERLINE_WIDTH = Math.max(OS_COPY.length, COPYRIGHT_COPY.length) * GLYPH_ADVANCE - 1;
const HUD_FRAME = { left: 6, top: 43, right: W - 6, bottom: 171 };

function clamp(value) { return Math.max(0, Math.min(1, value)); }

export function createBootStage({ width, height, getFont, getOsFont = getFont, getCopyrightFont = getFont, backgroundCanvas }) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); context.imageSmoothingEnabled = false;
  context.scale(SCALE, SCALE);
  const gkBoxed = new Image(); gkBoxed.src = './assets/images/gkboxed.png';

  function glyphIndex(character) {
    const code = character.codePointAt(0);
    return code >= 0x20 && code <= 0x7e ? code - 0x20 : 0;
  }
  function bitmapLine(value, x, y, scale, color, align = 'left', reveal = value.length, font = getFont()) {
    if (!font) return;
    const visible = [...value].slice(0, reveal); const textWidth = Math.max(0, visible.length * GLYPH_ADVANCE - 1) * scale;
    let cursor = align === 'center' ? Math.round(x - textWidth / 2) : align === 'right' ? x - textWidth : x;
    context.fillStyle = color;
    visible.forEach(character => {
      const glyph = glyphIndex(character) * 8;
      for (let row = 0; row < GLYPH_SIZE; row += 1) for (let column = 0; column < GLYPH_SIZE; column += 1) if ((font[glyph + row] || 0) & (128 >> column)) context.fillRect(cursor + column * scale, y + row * scale, scale, scale);
      cursor += GLYPH_ADVANCE * scale;
    });
  }
  function drawFrame(progress, transitionProgress) {
    const scaleProgress = clamp(transitionProgress); const perimeterProgress = clamp((scaleProgress ? 1 : progress) / BORDER_DURATION) * 4;
    const left = 6, top = Math.round(6 + (HUD_FRAME.top - 6) * scaleProgress), right = W - 6, bottom = Math.round((H - 6) + (HUD_FRAME.bottom - (H - 6)) * scaleProgress);
    const drawSegment = (fromX, fromY, toX, toY, amount) => {
      if (amount <= 0) return;
      context.beginPath(); context.moveTo(fromX, fromY); context.lineTo(fromX + (toX - fromX) * amount, fromY + (toY - fromY) * amount); context.stroke();
    };
    context.strokeStyle = COLORS.dim; context.lineWidth = 1;
    drawSegment(left, top, right, top, Math.min(1, perimeterProgress));
    drawSegment(right, top, right, bottom, Math.min(1, perimeterProgress - 1));
    drawSegment(right, bottom, left, bottom, Math.min(1, perimeterProgress - 2));
    drawSegment(left, bottom, left, top, Math.min(1, perimeterProgress - 3));
  }
  function transitionProgressFor(elapsed) { return clamp((elapsed - TRANSITION_START) / TRANSITION_DURATION); }
  function transitionAlpha(progress, order) { return progress ? 1 - clamp((progress - order * .08) / .2) : 1; }
  function withAlpha(alpha, draw) { context.save(); context.globalAlpha = alpha; draw(); context.restore(); }
  function clearFrame() {
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }
  function render({ elapsed, transitionProgress = transitionProgressFor(elapsed) }) {
    clearFrame(); context.globalAlpha = 1;
    if (backgroundCanvas) { context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.drawImage(backgroundCanvas, 0, 0); context.restore(); }
    drawFrame(elapsed, transitionProgress);
    if (elapsed >= BORDER_DURATION && gkBoxed.complete && gkBoxed.naturalWidth) withAlpha(transitionAlpha(transitionProgress, 0), () => { context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.drawImage(gkBoxed, TEXT_X * SCALE, (OS_LINE_Y - 1) * SCALE); context.restore(); });

    const osProgress = clamp((elapsed - OS_LINE_START) / OS_LINE_DURATION);
    const copyrightProgress = clamp((elapsed - COPYRIGHT_START) / OS_LINE_DURATION);
    if (osProgress) withAlpha(transitionAlpha(transitionProgress, 0), () => bitmapLine(OS_COPY, TOP_TEXT_X, OS_LINE_Y, 1, COLORS.text, 'left', Math.ceil(OS_COPY.length * osProgress), getOsFont()));
    if (copyrightProgress) withAlpha(transitionAlpha(transitionProgress, 1), () => bitmapLine(COPYRIGHT_COPY, TOP_TEXT_X, COPYRIGHT_LINE_Y, 1, COLORS.dim, 'left', Math.ceil(COPYRIGHT_COPY.length * copyrightProgress), getCopyrightFont()));

    const underlineProgress = clamp((elapsed - UNDERLINE_START) / UNDERLINE_DURATION);
    if (underlineProgress) withAlpha(transitionAlpha(transitionProgress, 1), () => { context.fillStyle = COLORS.dim; context.fillRect(TOP_TEXT_X, UNDERLINE_Y, Math.round(UNDERLINE_WIDTH * underlineProgress), 1); });

    const loadingProgress = clamp((elapsed - LOADING_START) / .2);
    if (loadingProgress && elapsed < INTERFACE_START) {
      const spinner = SPINNER_FRAMES[Math.floor((elapsed - LOADING_START) * 8) % SPINNER_FRAMES.length];
      withAlpha(transitionAlpha(transitionProgress, 2), () => bitmapLine(`LOADING ${spinner}`, TEXT_X, LOADING_LINE_Y, 1, COLORS.secondary, 'left', Math.ceil(`LOADING ${spinner}`.length * loadingProgress)));
    }

    const memoryProgress = clamp((elapsed - MEMORY_READ_START) / MEMORY_READ_DURATION);
    const memoryCountProgress = clamp((elapsed - MEMORY_COUNT_START) / MEMORY_COUNT_DURATION);
    if (memoryProgress) {
      withAlpha(transitionAlpha(transitionProgress, 3), () => {
        bitmapLine('MEMCHK', TEXT_X, READOUT_LINE_Y, 1, COLORS.secondary, 'left', Math.ceil('MEMCHK'.length * memoryProgress));
        if (memoryCountProgress < 1) {
          if (!memoryCountProgress) return;
          const kilobytes = Math.min(64, Math.floor(memoryCountProgress * 64 / 4) * 4);
          bitmapLine(`${kilobytes}K`, MEMORY_VALUE_RIGHT, READOUT_LINE_Y, 1, COLORS.status, 'right');
        } else {
          bitmapLine('64K', MEMORY_VALUE_RIGHT, READOUT_LINE_Y, 1, COLORS.status, 'right');
          const okBlinking = elapsed < OK_BLINK_END;
          if (!okBlinking || Math.floor((elapsed - OK_BLINK_START) / OK_BLINK_INTERVAL) % 2 === 0) bitmapLine('OK', W - 18, READOUT_LINE_Y, 1, COLORS.secondary, 'right');
        }
      });
    }
    const peripheralProgress = clamp((elapsed - PERIPHERAL_START) / .2);
    if (peripheralProgress) {
      withAlpha(transitionAlpha(transitionProgress, 4), () => bitmapLine('PRPHRL DTCT', TEXT_X, PERIPHERAL_LINE_Y, 1, COLORS.secondary, 'left', Math.ceil('PRPHRL DTCT'.length * peripheralProgress)));
      const scanProgress = clamp((elapsed - PERIPHERAL_SCAN_START) / PERIPHERAL_SCAN_DURATION);
      if (scanProgress) withAlpha(transitionAlpha(transitionProgress, 4), () => bitmapLine('#'.repeat(Math.ceil(MEMORY_FIELD_CHARACTERS * scanProgress)), MEMORY_FIELD_START, PERIPHERAL_LINE_Y, 1, COLORS.status));
      if (scanProgress >= 1) {
        withAlpha(transitionAlpha(transitionProgress, 5), () => {
          const foundProgress = clamp((elapsed - FOUND_START) / .2);
          bitmapLine('CAN BUS', TEXT_X, PERIPHERAL_FOUND_Y, 1, COLORS.secondary, 'left', Math.ceil('CAN BUS'.length * foundProgress));
          const foundBlinking = elapsed < FOUND_BLINK_END;
          if (elapsed >= FOUND_BLINK_START && (!foundBlinking || Math.floor((elapsed - FOUND_BLINK_START) / FOUND_BLINK_INTERVAL) % 2 === 0)) bitmapLine('FOUND', MEMORY_FIELD_RIGHT, PERIPHERAL_FOUND_Y, 1, COLORS.status, 'right');
        });
      }
    }
    const shipProgress = clamp((elapsed - SHIP_START) / .2);
    if (shipProgress) {
      withAlpha(transitionAlpha(transitionProgress, 6), () => {
        bitmapLine('SHIP CONN', TEXT_X, SHIP_LINE_Y, 1, COLORS.secondary, 'left', Math.ceil('SHIP CONN'.length * shipProgress));
        const scanProgress = clamp((elapsed - SHIP_SCAN_START) / SHIP_SCAN_DURATION);
        if (scanProgress) bitmapLine('#'.repeat(Math.ceil(MEMORY_FIELD_CHARACTERS * scanProgress)), MEMORY_FIELD_START, SHIP_LINE_Y, 1, COLORS.status);
      });
    }
    const shipIdProgress = clamp((elapsed - SHIP_ID_START) / .2);
    const shipNameProgress = clamp((elapsed - (SHIP_ID_START + .2)) / .2);
    if (shipIdProgress) withAlpha(transitionAlpha(transitionProgress, 7), () => bitmapLine('GK-99', TEXT_X, SHIP_ID_LINE_Y, 1, COLORS.secondary, 'left', Math.ceil('GK-99'.length * shipIdProgress)));
    if (shipNameProgress) withAlpha(transitionAlpha(transitionProgress, 8), () => bitmapLine('"WARDEN"', TEXT_X, SHIP_NAME_LINE_Y, 1, COLORS.secondary, 'left', Math.ceil('"WARDEN"'.length * shipNameProgress)));
    const interfaceProgress = clamp((elapsed - INTERFACE_START) / .2);
    if (interfaceProgress) {
      const spinner = SPINNER_FRAMES[Math.floor((elapsed - INTERFACE_START) * 8) % SPINNER_FRAMES.length];
      withAlpha(transitionAlpha(transitionProgress, 9), () => bitmapLine(`INTLZ ${spinner}`, TEXT_X, INTERFACE_LINE_Y, 1, COLORS.secondary, 'left', Math.ceil(`INTLZ ${spinner}`.length * interfaceProgress)));
    }
    context.globalAlpha = 1;
  }

  return { canvas, render, transitionProgress: transitionProgressFor };
}
