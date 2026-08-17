import * as THREE from 'three';

const W = 180, H = 225, SCALE = 3;
const SHIP_VIEWPORT = { x: 6, y: 43, width: 168, height: 128 };
const SHIP_CONTENT_VIEWPORT = { x: 9, y: 46, width: 162, height: 122 };
const FLIGHT_VIEWPORT = { x: 7, y: 28, width: 166, height: 82 };
const PILOT_PANEL = { x: 7, y: 111, width: 166, height: 68 };
const FLIGHT_TITLE_CARDS = [["PORTLAND'S PREMIER", 'RETRO ARCADE!!'], ['80+ VIDEO GAMES &', '40+ PINBALL TABLES!'], ['TWO FULL BARS WITH', '20 TAPS & FOOD'], ['EVENTS &', 'TOURNAMENTS']];
const FLIGHT_TITLE_LINE_GAP = 5, FLIGHT_TITLE_WAVE_AMPLITUDE = 2, FLIGHT_TITLE_START_X = W + 1, FLIGHT_TITLE_EXIT_X = -9, FLIGHT_TITLE_ENTRANCE_DELAY = .3, FLIGHT_TITLE_EXIT_START = 3, FLIGHT_TITLE_EXIT_DURATION = .64, FLIGHT_TITLE_EXIT_STAGGER = .018;
const FLIGHT_TITLE_EXIT_CLEAR_PROGRESS = .67;
const flightTitleExitWindow = card => Math.max(...card.map((line, index) => index * .1 + ([...line].length - 1) * FLIGHT_TITLE_EXIT_STAGGER + FLIGHT_TITLE_EXIT_DURATION));
const flightTitleClearWindow = card => Math.max(...card.map((line, index) => index * .1 + ([...line].length - 1) * FLIGHT_TITLE_EXIT_STAGGER + FLIGHT_TITLE_EXIT_DURATION * FLIGHT_TITLE_EXIT_CLEAR_PROGRESS));
const FLIGHT_TITLE_CARD_ADVANCES = FLIGHT_TITLE_CARDS.map(card => FLIGHT_TITLE_EXIT_START + flightTitleClearWindow(card) - FLIGHT_TITLE_ENTRANCE_DELAY);
const FLIGHT_TITLE_CARD_STARTS = FLIGHT_TITLE_CARD_ADVANCES.reduce((starts, advance) => [...starts, starts.at(-1) + advance], [0]).slice(0, -1);
const FLIGHT_OUTRO_START = FLIGHT_TITLE_CARD_STARTS.at(-1) + FLIGHT_TITLE_EXIT_START + flightTitleClearWindow(FLIGHT_TITLE_CARDS.at(-1)), FLIGHT_SHIP_ENTRY_DURATION = .42, FLIGHT_SHIP_ENTRY_DISTANCE = 18, FLIGHT_SHIP_EXIT_DURATION = 1.05, FLIGHT_SHIP_EXIT_DISTANCE = 18, FLIGHT_REST_FADE_DURATION = .72;
const FLIGHT_SITE_COPY = 'groundkontrol.com', FLIGHT_SITE_FINAL_Y = Math.round(H / 2 - 4), FLIGHT_SITE_HORIZON_Y = FLIGHT_SITE_FINAL_Y + 11, FLIGHT_SITE_START = FLIGHT_OUTRO_START + FLIGHT_SHIP_EXIT_DURATION + FLIGHT_REST_FADE_DURATION, FLIGHT_SITE_LETTER_STAGGER = .04, FLIGHT_SITE_JUMP_DURATION = .48, FLIGHT_SITE_HOLD_DURATION = 3, FLIGHT_FINAL_FADE_DURATION = .8, FLIGHT_FINAL_BLACK_HOLD = .5;
const FLIGHT_SITE_FADE_START = FLIGHT_SITE_START + (FLIGHT_SITE_COPY.length - 1) * FLIGHT_SITE_LETTER_STAGGER + FLIGHT_SITE_JUMP_DURATION + FLIGHT_SITE_HOLD_DURATION;
const FLIGHT_TITLE_Y = PILOT_PANEL.y + PILOT_PANEL.height + Math.round((H - PILOT_PANEL.y - PILOT_PANEL.height - (8 * FLIGHT_TITLE_CARDS[0].length + FLIGHT_TITLE_LINE_GAP)) / 2);
const TECH_SOURCE_GLYPH_SIZE = 4, TECH_GLYPH_SIZE = 4, TECH_GLYPH_GAP = 1;
const COMPUTER_GLYPH_SIZE = 4, COMPUTER_GLYPH_GAP = 1;
const SYSTEM_STATUS_RIGHT = 104, SYSTEM_BAR_X = 116, SYSTEM_BAR_WIDTH = 50, SYSTEM_ROWS_Y = 178;
const READY_SPIN_DURATION = 1, READY_ZOOM_DURATION = .55, READY_SPIN_TURNS = 3;
const HUD_TILES = { topLeft: 0x51, horizontal: 0x52, topRight: 0x45, leftVertical: 0x7c, rightVertical: 0x7c, bottomLeft: 0x5a, bottomRight: 0x43 };
const COLORS = { space: '#0c0a20', shadow: '#020208', wire: '#00ddff', frame: '#4848d0', primary: '#ccccff', secondary: '#88ffee', status: '#ffdd44', dim: '#ff4488', idle: '#707080', fill: '#00ddff', outline: '#7070ff', callout: '#ff4488' };
const SPINNER_FRAMES = ['|', '/', '-', '\\'];
const BOOT_STAGES = [{ name: 'void', duration: 1.4 }, { name: 'signal', duration: 2.4 }, { name: 'acquire', duration: 2.1 }, { name: 'systems', duration: 4 * 4 }, { name: 'ready', duration: 4 }];
const BOOT_DURATION = BOOT_STAGES.reduce((total, stage) => total + stage.duration, 0);
const HUD_HANDOFF_ELAPSED = BOOT_STAGES.slice(0, 3).reduce((total, stage) => total + stage.duration, 0) - .05;
const HUD_STAGE_START_ELAPSED = HUD_HANDOFF_ELAPSED + .05;
const HANDOFF_REVEAL_STAGGER = .08, HANDOFF_REVEAL_DURATION = .2, HANDOFF_ROW_REVEAL_DURATION = .12, HANDOFF_ROW_TRAIL_DELAY = .08, HANDOFF_REVEAL_ORDER_COUNT = 10;
const HANDOFF_SHIP_HOLD_START = .48, HANDOFF_SHIP_SETTLE_DURATION = .18;
const HANDOFF_VIEWPORT_TEXT_START = HANDOFF_SHIP_HOLD_START + HANDOFF_SHIP_SETTLE_DURATION, HANDOFF_VIEWPORT_TEXT_DURATION = .06, HANDOFF_VIEWPORT_TEXT_GAP = .02;
const SYSTEM_LOADS = [
  { label: 'CORE', amount: 1, point: [0, 0, 0], distance: 3.6, radius: 12, callout: [17, 98], calloutSide: 'right' },
  { label: 'DRIVE', amount: 1, point: [0, -2.1, .15], distance: 3.1, radius: 10, callout: [17, 145], calloutSide: 'right' },
  { label: 'WPN', amount: 1, point: [-1.68, -.84, .1], distance: 3.3, radius: 10, callout: [117, 102], calloutSide: 'left' },
  { label: 'LINK', amount: 1, point: [0, 1.26, .1], distance: 3.4, radius: 10, callout: [17, 138], calloutSide: 'right', lineOrigin: 'lowerLeft' }
];
const LOGO_COLOR_BANDS = { '24,29,48': 0, '69,47,77': 1, '153,61,104': 2, '218,68,112': 3, '251,63,99': 4 };
const LOGO_SHADOW_COLOR = [55, 43, 92];
const LOGO_REFLECTION_LEVELS = [.78, 1, 1.2, 1.4];

function clamp(value) { return Math.max(0, Math.min(1, value)); }
function parseHeaderFont(source) {
  const values = source.match(/0x[0-9a-f]{2}/ig) || [];
  if (values.length < 768) throw new Error('HUD font data is incomplete.');
  return Uint8Array.from(values.slice(0, 768), value => Number.parseInt(value.slice(2), 16));
}

export function createHudStage({ width, height }) {
  if (width !== W * SCALE || height !== H * SCALE) throw new Error('System HUD requires a 540 x 675 sequence frame.');
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); context.imageSmoothingEnabled = false;
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(COLORS.space, 1); renderer.autoClear = false;
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(COLORS.space, .06);
  const shipScene = new THREE.Scene(); shipScene.fog = scene.fog;
  const camera = new THREE.PerspectiveCamera(42, W / H, .1, 100); const backgroundCamera = new THREE.PerspectiveCamera(42, W / H, .1, 100);
  camera.position.set(0, .15, 9); backgroundCamera.position.set(0, .15, 9); backgroundCamera.lookAt(0, 0, 0);
  const cameraAim = new THREE.Vector3(), cameraPosition = new THREE.Vector3(), cameraFromAim = new THREE.Vector3(), cameraFromPosition = new THREE.Vector3(), cameraToAim = new THREE.Vector3(), cameraToPosition = new THREE.Vector3();
  const root = new THREE.Group(); root.position.x = -1.35; root.scale.setScalar(.82); shipScene.add(root);
  const shipMaterial = new THREE.LineBasicMaterial({ color: COLORS.wire, transparent: true, opacity: 0 });
  const thrustParticleCount = 18, thrustPositions = new Float32Array(thrustParticleCount * 6), thrustColors = new Float32Array(thrustParticleCount * 6), thrustGeometry = new THREE.BufferGeometry(), thrustPositionAttribute = new THREE.BufferAttribute(thrustPositions, 3), thrustColorAttribute = new THREE.BufferAttribute(thrustColors, 3), thrustMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  thrustGeometry.setAttribute('position', thrustPositionAttribute); thrustGeometry.setAttribute('color', thrustColorAttribute); const thrustField = new THREE.LineSegments(thrustGeometry, thrustMaterial); thrustField.frustumCulled = false; root.add(thrustField);
  const glyphCache = new Map(); let fontData = null, atasciiData = null, flightTitleFontData = null, flightSiteFontData = null, computerFontData = null, picomagFontData = null, technicalFontData = null, logoPixels = null, logoSource = null, classicPixels = null, classicSource = null, pilotsSource = null, pilotsHighlightMask = null, pilotsTint = null, pilotsSweepPaths = null, focusOverlayGeometry = null;

  function seeded(value) { const sample = Math.sin(value * 12.9898 + 78.233) * 43758.5453; return sample - Math.floor(sample); }
  const starColors = [0xddeeff, 0x8dd8ff, 0xffb1da], staticStars = [], driftingStars = [], twinklePhases = [];
  starColors.forEach((color, layerIndex) => {
    const positions = new Float32Array(42 * 3);
    for (let index = 0; index < positions.length; index += 3) { const seed = layerIndex * 100 + index; positions[index] = (seeded(seed) - .5) * 15; positions[index + 1] = (seeded(seed + 1) - .5) * 9; positions[index + 2] = -4 - seeded(seed + 2) * 5; }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); const field = new THREE.Points(geometry, new THREE.PointsMaterial({ color, size: .045, transparent: true, opacity: 0 })); scene.add(field); staticStars.push(field);
  });
  starColors.forEach((color, layerIndex) => {
    const positions = new Float32Array(18 * 3), seeds = new Float32Array(18 * 3);
    for (let index = 0; index < 18; index += 1) { const seed = 500 + layerIndex * 50 + index * 3; seeds[index * 3] = seeded(seed); seeds[index * 3 + 1] = seeded(seed + 1); seeds[index * 3 + 2] = seeded(seed + 2); }
    const geometry = new THREE.BufferGeometry(), attribute = new THREE.BufferAttribute(positions, 3); geometry.setAttribute('position', attribute); const material = new THREE.PointsMaterial({ color, size: .055, transparent: true, opacity: 0 }); scene.add(new THREE.Points(geometry, material));
    const streakPositions = new Float32Array(18 * 6), streakGeometry = new THREE.BufferGeometry(), streakAttribute = new THREE.BufferAttribute(streakPositions, 3); streakGeometry.setAttribute('position', streakAttribute); const streakMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0 }); scene.add(new THREE.LineSegments(streakGeometry, streakMaterial));
    driftingStars.push({ positions, seeds, attribute, material, streakPositions, streakAttribute, streakMaterial });
  });
  const twinklePositions = new Float32Array(18 * 3), twinkleColors = new Float32Array(18 * 3);
  for (let index = 0; index < twinklePositions.length; index += 3) { const seed = 900 + index; twinklePositions[index] = (seeded(seed) - .5) * 13; twinklePositions[index + 1] = (seeded(seed + 1) - .5) * 8; twinklePositions[index + 2] = -3 - seeded(seed + 2) * 5; twinklePhases.push(seeded(seed + 3) * Math.PI * 2); }
  const twinkleGeometry = new THREE.BufferGeometry(), twinkleAttribute = new THREE.BufferAttribute(twinkleColors, 3); twinkleGeometry.setAttribute('position', new THREE.BufferAttribute(twinklePositions, 3)); twinkleGeometry.setAttribute('color', twinkleAttribute); const twinkleField = new THREE.Points(twinkleGeometry, new THREE.PointsMaterial({ vertexColors: true, size: .09, transparent: true, opacity: 0 })); scene.add(twinkleField); const twinkleBaseColors = starColors.map(color => new THREE.Color(color));

  function createShipGeometry(image) {
    const source = document.createElement('canvas'); source.width = image.naturalWidth; source.height = image.naturalHeight; const sourceContext = source.getContext('2d'); sourceContext.drawImage(image, 0, 0); const pixels = sourceContext.getImageData(0, 0, source.width, source.height).data, background = [pixels[0], pixels[1], pixels[2]], voxelSize = .42, filled = new Set();
    for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) { const index = (y * source.width + x) * 4, difference = Math.abs(pixels[index] - background[0]) + Math.abs(pixels[index + 1] - background[1]) + Math.abs(pixels[index + 2] - background[2]); if (difference >= 40) filled.add(`${x},${y}`); }
    const lines = [], boundaryVertices = new Map(), depth = voxelSize / 2;
    const point = (u, v, z) => lines.push((u - source.width / 2) * voxelSize, (source.height / 2 - v) * voxelSize, z);
    const boundary = (u1, v1, u2, v2) => { point(u1, v1, -depth); point(u2, v2, -depth); point(u1, v1, depth); point(u2, v2, depth); const start = `${u1},${v1}`, end = `${u2},${v2}`; if (!boundaryVertices.has(start)) boundaryVertices.set(start, new Set()); if (!boundaryVertices.has(end)) boundaryVertices.set(end, new Set()); boundaryVertices.get(start).add(end); boundaryVertices.get(end).add(start); };
    filled.forEach(cell => { const [x, y] = cell.split(',').map(Number); if (!filled.has(`${x - 1},${y}`)) boundary(x, y, x, y + 1); if (!filled.has(`${x + 1},${y}`)) boundary(x + 1, y, x + 1, y + 1); if (!filled.has(`${x},${y - 1}`)) boundary(x, y, x + 1, y); if (!filled.has(`${x},${y + 1}`)) boundary(x, y + 1, x + 1, y + 1); });
    boundaryVertices.forEach((neighbors, vertex) => { const [u, v] = vertex.split(',').map(Number), points = [...neighbors].map(neighbor => neighbor.split(',').map(Number)); if (points.length === 2 && (points[0][0] === points[1][0] || points[0][1] === points[1][1])) return; point(u, v, -depth); point(u, v, depth); });
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3)); root.add(new THREE.LineSegments(geometry, shipMaterial));
  }
  function glyphImage(code, color, data = fontData, key = 'main') { const cacheKey = `${key}:${code}:${color}`; if (glyphCache.has(cacheKey)) return glyphCache.get(cacheKey); const glyph = document.createElement('canvas'); glyph.width = glyph.height = 8; const glyphContext = glyph.getContext('2d'); glyphContext.fillStyle = color; const offset = code * 8; for (let row = 0; row < 8; row += 1) for (let column = 0; column < 8; column += 1) if ((data?.[offset + row] || 0) & (128 >> column)) glyphContext.fillRect(column, row, 1, 1); glyphCache.set(cacheKey, glyph); return glyph; }
  function glyphCode(character) { const code = character.codePointAt(0); return code >= 32 && code <= 126 ? code - 32 : 31; }
  function measure(value, scale = 1) { return Math.max(0, [...value].length * 9 - 1) * scale; }
  function text(value, x, y, color, scale = 1, align = 'left') { let pen = Math.round(x - (align === 'center' ? measure(value, scale) / 2 : align === 'right' ? measure(value, scale) : 0)); for (const character of value) { context.drawImage(glyphImage(glyphCode(character), color), pen, y, 8 * scale, 8 * scale); pen += 9 * scale; } }
  function titleEase(progress) { if (progress <= 0) return 0; if (progress >= 1) return 1; return progress < .5 ? Math.pow(2, 20 * progress - 10) / 2 : (2 - Math.pow(2, -20 * progress + 10)) / 2; }
  function waveText(value, centerX, y, color, elapsed, phase = 0, lineIndex = 0, mode = 'enter', waveElapsed = elapsed) {
    const startX = Math.round(centerX - measure(value) / 2), exitX = FLIGHT_TITLE_EXIT_X - measure(value), lineDelay = mode === 'enter' ? FLIGHT_TITLE_ENTRANCE_DELAY + lineIndex * .1 : lineIndex * .1;
    if (mode === 'enter' && elapsed <= lineDelay) return;
    [...value].forEach((character, index) => {
      const letterDelay = lineDelay + index * (mode === 'enter' ? .02 : FLIGHT_TITLE_EXIT_STAGGER), letterProgress = clamp((elapsed - letterDelay) / (mode === 'enter' ? .36 : FLIGHT_TITLE_EXIT_DURATION));
      if (mode === 'enter' && !letterProgress || mode === 'exit' && letterProgress >= 1) return;
      const eased = titleEase(letterProgress), targetX = startX + index * 9, fromX = mode === 'enter' ? FLIGHT_TITLE_START_X : targetX, toX = mode === 'enter' ? targetX : exitX + index * 9, letterX = Math.round(fromX + (toX - fromX) * eased), waveY = y + Math.round(Math.sin(waveElapsed * 7.5 - index * .8 + phase) * FLIGHT_TITLE_WAVE_AMPLITUDE);
      context.drawImage(glyphImage(glyphCode(character), color, flightTitleFontData, 'flight-title'), letterX, waveY, 8, 8);
    });
  }
  function computerGlyphImage(character, color) { const code = glyphCode(character), cacheKey = `computer-${code}:${color}`; if (glyphCache.has(cacheKey)) return glyphCache.get(cacheKey); const glyph = document.createElement('canvas'); glyph.width = glyph.height = COMPUTER_GLYPH_SIZE; const glyphContext = glyph.getContext('2d'); glyphContext.fillStyle = color; const glyphOffset = code * 8; for (let row = 0; row < COMPUTER_GLYPH_SIZE; row += 1) for (let column = 0; column < COMPUTER_GLYPH_SIZE; column += 1) { let filled = false; for (let sourceRow = row * 2; sourceRow < row * 2 + 2; sourceRow += 1) for (let sourceColumn = column * 2; sourceColumn < column * 2 + 2; sourceColumn += 1) if (computerFontData?.[glyphOffset + sourceRow] & (1 << (7 - sourceColumn))) filled = true; if (filled) glyphContext.fillRect(column, row, 1, 1); } glyphCache.set(cacheKey, glyph); return glyph; }
  function computerText(value, x, y, color) { let pen = Math.round(x); for (const character of value) { context.drawImage(computerGlyphImage(character, color), pen, y, COMPUTER_GLYPH_SIZE, COMPUTER_GLYPH_SIZE); pen += COMPUTER_GLYPH_SIZE + COMPUTER_GLYPH_GAP; } }
  function computerMeasure(value) { return Math.max(0, [...value].length * (COMPUTER_GLYPH_SIZE + COMPUTER_GLYPH_GAP) - COMPUTER_GLYPH_GAP); }
  function picomagGlyphImage(character, color) { const code = glyphCode(character), cacheKey = `picomag-${code}:${color}`; if (glyphCache.has(cacheKey)) return glyphCache.get(cacheKey); const glyph = document.createElement('canvas'); glyph.width = glyph.height = COMPUTER_GLYPH_SIZE; const glyphContext = glyph.getContext('2d'); glyphContext.fillStyle = color; const glyphOffset = code * 8; for (let row = 0; row < COMPUTER_GLYPH_SIZE; row += 1) for (let column = 0; column < COMPUTER_GLYPH_SIZE; column += 1) { let filled = false; for (let sourceRow = row * 2; sourceRow < row * 2 + 2; sourceRow += 1) for (let sourceColumn = column * 2; sourceColumn < column * 2 + 2; sourceColumn += 1) if (picomagFontData?.[glyphOffset + sourceRow] & (1 << (7 - sourceColumn))) filled = true; if (filled) glyphContext.fillRect(column, row, 1, 1); } glyphCache.set(cacheKey, glyph); return glyph; }
  function terminalText(value, x, y, color) { let pen = Math.round(x); for (const character of value) { context.drawImage(picomagGlyphImage(character, color), pen, y, COMPUTER_GLYPH_SIZE, COMPUTER_GLYPH_SIZE); pen += COMPUTER_GLYPH_SIZE + COMPUTER_GLYPH_GAP; } }
  function rawGlyph(code, x, y, color) { context.drawImage(glyphImage(code, color, atasciiData, 'atascii'), x, y); }
  function thinBorder(frame) { context.save(); context.strokeStyle = COLORS.frame; context.lineWidth = 1; context.strokeRect(frame.x, frame.y, frame.width, frame.height); context.restore(); }
  function tiledBorder(frame) { const right = frame.x + frame.width - 8, bottom = frame.y + frame.height - 8; rawGlyph(HUD_TILES.topLeft, frame.x, frame.y, COLORS.frame); rawGlyph(HUD_TILES.topRight, right, frame.y, COLORS.frame); rawGlyph(HUD_TILES.bottomLeft, frame.x, bottom, COLORS.frame); rawGlyph(HUD_TILES.bottomRight, right, bottom, COLORS.frame); for (let x = frame.x + 8; x < right; x += 8) { rawGlyph(HUD_TILES.horizontal, x, frame.y, COLORS.frame); rawGlyph(HUD_TILES.horizontal, x, bottom, COLORS.frame); } for (let y = frame.y + 8; y < bottom; y += 8) { rawGlyph(HUD_TILES.leftVertical, frame.x, y, COLORS.frame); rawGlyph(HUD_TILES.rightVertical, right, y, COLORS.frame); } }
  function technicalGlyphImage(character, color) { const code = glyphCode(character), cacheKey = `tech-${code}:${color}`; if (glyphCache.has(cacheKey)) return glyphCache.get(cacheKey); const glyph = document.createElement('canvas'); glyph.width = glyph.height = TECH_SOURCE_GLYPH_SIZE; const glyphContext = glyph.getContext('2d'); glyphContext.fillStyle = color; const glyphOffset = code * 8; for (let row = 0; row < TECH_SOURCE_GLYPH_SIZE; row += 1) for (let column = 0; column < TECH_SOURCE_GLYPH_SIZE; column += 1) { let filled = false; for (let sourceRow = row * 2; sourceRow < row * 2 + 2; sourceRow += 1) for (let sourceColumn = column * 2; sourceColumn < column * 2 + 2; sourceColumn += 1) if (technicalFontData?.[glyphOffset + sourceRow] & (1 << (7 - sourceColumn))) filled = true; if (filled) glyphContext.fillRect(column, row, 1, 1); } glyphCache.set(cacheKey, glyph); return glyph; }
  function technicalText(value, x, y, color) { let pen = x; for (const character of value) { context.drawImage(technicalGlyphImage(character, color), pen, y, TECH_GLYPH_SIZE, TECH_GLYPH_SIZE); pen += TECH_GLYPH_SIZE + TECH_GLYPH_GAP; } }
  function technicalMeasure(value) { return Math.max(0, [...value].length * (TECH_GLYPH_SIZE + TECH_GLYPH_GAP) - TECH_GLYPH_GAP); }
  function drawTechnicalBlock(focus, x, y, typingProgress) {
    const tick = focus.index + 1;
    const hex = value => value.toString(16).toUpperCase().padStart(2, '0');
    const header = `${focus.current.label}/SYS`;
    const lineOne = `#${hex((tick * 19 + focus.current.radius) % 256)}/${hex((tick * 7 + 31) % 256)}`;
    const lineTwo = `+${hex((tick * 11 + 89) % 256)}-${hex((tick * 5 + 173) % 256)}`;
    let remainingCharacters = Math.floor((header.length + lineOne.length + lineTwo.length) * typingProgress);
    const typed = value => { const visible = value.slice(0, Math.max(0, Math.min(value.length, remainingCharacters))); remainingCharacters -= visible.length; return visible; };
    const visibleHeader = typed(header);
    const visibleLineOne = typed(lineOne);
    const visibleLineTwo = typed(lineTwo);
    context.globalAlpha = .65;
    technicalText(visibleHeader, x, y, COLORS.callout);
    if (visibleHeader.length === header.length) pixelLine(x, y + TECH_GLYPH_SIZE, x + technicalMeasure(header) - 1, y + TECH_GLYPH_SIZE, COLORS.callout);
    context.globalAlpha = 1;
    technicalText(visibleLineOne, x, y + 6, COLORS.primary);
    technicalText(visibleLineTwo, x, y + 12, COLORS.primary);
  }
  function pixelLine(x1, y1, x2, y2, color) { let x = Math.round(x1), y = Math.round(y1); const targetX = Math.round(x2), targetY = Math.round(y2), stepX = x < targetX ? 1 : -1, stepY = y < targetY ? 1 : -1, deltaX = Math.abs(targetX - x), deltaY = -Math.abs(targetY - y); let error = deltaX + deltaY; context.fillStyle = color; while (true) { context.fillRect(x, y, 1, 1); if (x === targetX && y === targetY) break; const doubled = error * 2; if (doubled >= deltaY) { error += deltaY; x += stepX; } if (doubled <= deltaX) { error += deltaX; y += stepY; } } }
  function bar(x, y, barWidth, level, active) { context.strokeStyle = COLORS.outline; context.strokeRect(x + .5, y + .5, barWidth, 7); if (active) { context.fillStyle = COLORS.fill; context.fillRect(x + 2, y + 2, Math.floor((barWidth - 3) * level), 4); } }
  function scrollingCoordinates(sequence) {
    const focus = subsystemFocus(sequence);
    const byte = value => ((Math.round(value) % 256) + 256) % 256;
    const hex = value => byte(value).toString(16).toUpperCase().padStart(2, '0');
    const drift = Math.floor(sequence.elapsed * 3);
    const yaw = root.rotation.y / (Math.PI * 2) * 256;
    const pitch = root.rotation.x / (Math.PI * 2) * 256;
    const altitude = (root.position.y + 1) * 32;
    const range = camera.position.length() * 16;
    const target = focus?.current.label || 'SYNC';
    const system = (focus?.index ?? 4) * 17;
    const feeds = [
      [`X${hex(yaw + drift)} Y${hex(pitch + system)} Z${hex(altitude + range)} ${target}   `, 9],
      [`R${hex(yaw - drift)} P${hex(pitch + drift)} D${hex(range - altitude)} F${hex(sequence.elapsed * 12)}   `, 7]
    ];
    context.save();
    context.beginPath(); context.rect(13, 70, measure('"WARDEN"'), 10); context.clip();
    feeds.forEach(([feed, speed], index) => {
      const y = 70 + index * 6;
      const feedWidth = computerMeasure(feed);
      const offset = Math.floor((sequence.elapsed * speed) % (feedWidth + 12));
      computerText(feed, 13 - offset, y, COLORS.secondary);
      computerText(feed, 13 - offset + feedWidth + 12, y, COLORS.secondary);
    });
    context.restore();
  }
  function scrollingOperations(sequence) {
    const focus = subsystemFocus(sequence);
    const { loads } = systemLoadState(sequence);
    const aggregate = loads.reduce((total, item) => total + item.phase, 0) / loads.length;
    const byte = value => ((Math.round(value) % 256) + 256) % 256;
    const hex = value => byte(value).toString(16).toUpperCase().padStart(2, '0');
    const phase = sequence.name.slice(0, 4).toUpperCase().padEnd(4, '-');
    const target = (focus?.current.label || 'SYNC').padEnd(4, '-').slice(0, 4);
    const yaw = root.rotation.y / (Math.PI * 2) * 256;
    const range = camera.position.length() * 16;
    const commands = [
      `CMD ${phase} OK`,
      `BUS ${target} LK`,
      `LOAD ${hex(aggregate * 255)} %`,
      `CHK ${hex((aggregate + (focus?.index ?? 0)) * 127)} OK`,
      `NAV ${hex(yaw)} SET`,
      `MEM ${hex(range)} RD`,
      `IO RDY ${hex(sequence.elapsed * 3)}`,
      `FETCH ${hex(sequence.elapsed * 11)}`,
      `CRC ${hex(yaw + range)} OK`,
      `MAP ${hex(range - root.position.y * 16)} IN`,
      `TX ${hex(sequence.elapsed * 17)} ACK`,
      `SYNC ${hex(sequence.elapsed * 5)} OK`
    ];
    const advances = [1, 1, 2, 1, 3, 1, 2, 1, 2, 3, 1, 2];
    const durations = [1.2, 1.05, 1.35, 1.1, 1.5, 1.0, 1.25, 1.1, 1.4, 1.15, 1.3, 1.05];
    const lineHeight = COMPUTER_GLYPH_SIZE + 2;
    const typingInterval = .04;
    let terminalTime = sequence.elapsed;
    let eventIndex = 0;
    while (terminalTime >= durations[eventIndex]) {
      terminalTime -= durations[eventIndex];
      eventIndex = (eventIndex + 1) % commands.length;
    }
    const eventTime = terminalTime;
    const scrollAt = durations[eventIndex] - .18;
    const stepped = eventTime >= scrollAt ? advances[eventIndex] : 0;
    const width = computerMeasure('XXXXXXXXXXXX');
    const terminalRight = SHIP_VIEWPORT.x + SHIP_VIEWPORT.width - 7;
    const x = terminalRight - width;
    const height = lineHeight * 3;
    const y = SHIP_VIEWPORT.y + SHIP_VIEWPORT.height - 8 - height;
    context.save();
    context.beginPath(); context.rect(x, y, width, height); context.clip();
    let lineIndex = eventIndex, lineY = y + (2 - stepped) * lineHeight, isCurrent = true;
    for (let lineCount = 0; lineCount < commands.length && lineY > y - lineHeight; lineCount += 1) {
      if (lineY + COMPUTER_GLYPH_SIZE >= y && lineY <= y + height) {
        const command = commands[lineIndex];
        const typedCharacters = isCurrent && !stepped ? Math.min(command.length, Math.floor(eventTime / typingInterval)) : command.length;
        const visible = command.slice(0, typedCharacters);
        terminalText(visible, x, lineY, COLORS.secondary);
        if (isCurrent && !stepped && typedCharacters < command.length && Math.floor(sequence.elapsed * 8) % 2 === 0) terminalText('_', x + computerMeasure(visible), lineY, COLORS.secondary);
      }
      const previousIndex = (lineIndex - 1 + commands.length) % commands.length;
      lineY -= advances[previousIndex] * lineHeight;
      lineIndex = previousIndex;
      isCurrent = false;
    }
    context.restore();
  }
  function sequenceFor(elapsed) { const boundedElapsed = clamp(elapsed / BOOT_DURATION) * BOOT_DURATION; let cursor = 0; for (let index = 0; index < BOOT_STAGES.length; index += 1) { const stage = BOOT_STAGES[index]; if (boundedElapsed < cursor + stage.duration || index === BOOT_STAGES.length - 1) return { ...stage, index, elapsed: boundedElapsed, local: clamp((boundedElapsed - cursor) / stage.duration) }; cursor += stage.duration; } }
  function systemLoadState(sequence) { const progress = sequence.name === 'systems' ? sequence.local : sequence.name === 'ready' ? 1 : 0; return { progress, loads: SYSTEM_LOADS.map((system, index) => ({ ...system, phase: clamp(progress * SYSTEM_LOADS.length - index) })) }; }
  function subsystemFocus(sequence) { if (sequence.name !== 'systems') return null; const { progress, loads } = systemLoadState(sequence), raw = progress * loads.length, index = Math.min(loads.length - 1, Math.floor(raw)); return { index, current: loads[index], previous: index ? loads[index - 1] : null, blend: clamp(raw - index) }; }
  function setCameraShot(shot, aim, position) { if (!shot) { aim.set(0, 0, 0); root.localToWorld(aim); position.copy(aim); position.y += .15; position.z += 9; return; } aim.set(...shot.point); root.localToWorld(aim); position.copy(aim); position.y += .1; position.z += shot.distance; }
  function setLockedCameraShot(shot, rotationY, aim, position) {
    const scale = root.scale.x, [sourceX, sourceY, sourceZ] = shot.point, cosine = Math.cos(rotationY), sine = Math.sin(rotationY), pointX = sourceX * scale, pointY = sourceY * scale, pointZ = sourceZ * scale;
    aim.set(root.position.x + pointX * cosine + pointZ * sine, root.position.y + pointY, root.position.z - pointX * sine + pointZ * cosine);
    position.copy(aim); position.y += .1; position.z += shot.distance;
  }
  function updateStarfield(elapsed, signalProgress = 1, staticOpacity = .68, speedMultiplier = 1, motionAxis = 'depth', streakProgress = signalProgress) {
    staticStars.forEach(field => { field.material.opacity = staticOpacity; });
    driftingStars.forEach(layer => {
      layer.material.opacity = signalProgress * .9;
      layer.streakMaterial.opacity = speedMultiplier > 1 ? streakProgress * .5 : 0;
      for (let index = 0; index < layer.seeds.length / 3; index += 1) {
        const position = index * 3, speed = (.55 + layer.seeds[position + 2] * .95) * speedMultiplier;
        const travel = motionAxis === 'horizontal' ? ((layer.seeds[position] * 26 - elapsed * speed) % 26 + 26) % 26 : (elapsed * speed + layer.seeds[position + 2] * 19) % 19;
        const x = motionAxis === 'horizontal' ? -13 + travel : (layer.seeds[position] - .5) * 13;
        const y = (layer.seeds[position + 1] - .5) * 8;
        const z = motionAxis === 'horizontal' ? -3 - layer.seeds[position + 2] * 6 : -12 + travel;
        layer.positions[position] = x; layer.positions[position + 1] = y; layer.positions[position + 2] = z;
        const streak = index * 6, trail = speedMultiplier > 1 ? .24 + layer.seeds[position + 2] * (motionAxis === 'horizontal' ? 1.05 : .62) : 0;
        layer.streakPositions[streak] = x; layer.streakPositions[streak + 1] = y; layer.streakPositions[streak + 2] = z;
        layer.streakPositions[streak + 3] = motionAxis === 'horizontal' ? x + trail : x; layer.streakPositions[streak + 4] = y; layer.streakPositions[streak + 5] = motionAxis === 'horizontal' ? z : z - trail;
      }
      layer.attribute.needsUpdate = true; layer.streakAttribute.needsUpdate = true;
    });
    for (let index = 0; index < twinklePhases.length; index += 1) { const intensity = (.14 + Math.max(0, Math.sin(elapsed * 2.1 + twinklePhases[index]) - .77) * 3.75) * signalProgress, color = twinkleBaseColors[index % twinkleBaseColors.length], position = index * 3; twinkleColors[position] = color.r * intensity; twinkleColors[position + 1] = color.g * intensity; twinkleColors[position + 2] = color.b * intensity; } twinkleAttribute.needsUpdate = true;
  }
  function updateThrust(elapsed, power = 1) { const tick = Math.floor(elapsed * 18), pulse = .86 + Math.sin(elapsed * 11.5) * .14; for (let index = 0; index < thrustParticleCount; index += 1) { const seed = index * 17.3, phase = (elapsed * (3.4 + seeded(seed) * 1.8) + seeded(seed + 1) * .8) % 1, spread = (seeded(seed + 2) - .5) * (.23 - phase * .16), startY = -2.18 - phase * (.7 + power * 1.2) * pulse, length = .14 + seeded(seed + 3) * (.16 + power * .1), endY = startY - length, startX = spread, endX = spread + (seeded(seed + 4) - .5) * (.11 - phase * .06), z = (seeded(seed + 5) - .5) * (.12 - phase * .05), visible = seeded(tick * 7.1 + index * 3.7) > .16, position = index * 6, color = index * 6, hot = seeded(seed + 6) > .62 ? [1, .34, .8] : [.12, .9, 1], brightness = visible ? (.82 + seeded(seed + 7) * .18) * pulse : 0; thrustPositions[position] = startX; thrustPositions[position + 1] = startY; thrustPositions[position + 2] = z; thrustPositions[position + 3] = endX; thrustPositions[position + 4] = endY; thrustPositions[position + 5] = z; thrustColors[color] = hot[0] * brightness; thrustColors[color + 1] = hot[1] * brightness; thrustColors[color + 2] = hot[2] * brightness; thrustColors[color + 3] = hot[0] * brightness * .78; thrustColors[color + 4] = hot[1] * brightness * .78; thrustColors[color + 5] = hot[2] * brightness * .78; } thrustPositionAttribute.needsUpdate = true; thrustColorAttribute.needsUpdate = true; thrustMaterial.opacity = .58 + power * .22; }
  function renderBackground(elapsed) {
    updateStarfield(elapsed, 1, .68);
    renderer.setScissorTest(false); renderer.clear(); renderer.render(scene, backgroundCamera);
    context.clearRect(0, 0, width, height); context.drawImage(renderer.domElement, 0, 0, width, height);
  }
  function updateThree(sequence, starElapsed = sequence.elapsed, shipViewport = SHIP_CONTENT_VIEWPORT, motionElapsed = starElapsed, handoffFaceOn = 0) {
    camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setViewport(0, 0, W, H); root.position.x = -1.35; root.position.z = 0; root.rotation.set(0, 0, 0); shipMaterial.color.set(COLORS.wire); thrustMaterial.opacity = 0;
    updateStarfield(starElapsed, 1, .68);
    const phaseMotionElapsed = sequence.index >= 3 ? sequence.elapsed - HUD_STAGE_START_ELAPSED : motionElapsed, acquisition = sequence.index > 2 ? 1 : sequence.name === 'acquire' ? clamp(sequence.local * 1.35) : 0, eased = acquisition * acquisition * (3 - 2 * acquisition), baseRotation = phaseMotionElapsed * .65, readySpinProgress = sequence.name === 'ready' ? clamp(sequence.local / READY_SPIN_DURATION) : 0, readySpinEase = 1 - (1 - readySpinProgress) ** 3, readyStartRotation = sequence.name === 'ready' ? (sequence.elapsed - sequence.local * sequence.duration - HUD_STAGE_START_ELAPSED) * .65 : 0, neutralRotation = (Math.floor(readyStartRotation / (Math.PI * 2)) + READY_SPIN_TURNS + 1) * Math.PI * 2, settledEased = eased + (1 - eased) * handoffFaceOn, normalRotation = sequence.name === 'ready' ? baseRotation + (neutralRotation - baseRotation) * readySpinEase : baseRotation * eased, normalTilt = sequence.name === 'ready' ? 0 : Math.sin(phaseMotionElapsed * .8) * .08 * eased, normalY = sequence.name === 'ready' ? -.2 : Math.sin(phaseMotionElapsed * 1.5) * .12 - .2 + (1 - eased) * .7;
    shipMaterial.opacity = settledEased; root.visible = acquisition > 0; root.scale.setScalar(.45 + settledEased * .37); root.rotation.y = normalRotation + (Math.PI * 2 - normalRotation) * handoffFaceOn; root.rotation.x = normalTilt * (1 - handoffFaceOn); root.position.y = normalY + (-.2 - normalY) * handoffFaceOn;
    root.updateMatrixWorld(true); const focus = subsystemFocus(sequence); if (sequence.name === 'ready') { setLockedCameraShot(SYSTEM_LOADS.at(-1), readyStartRotation, cameraFromAim, cameraFromPosition); setCameraShot(null, cameraToAim, cameraToPosition); const zoomProgress = clamp(sequence.local / READY_ZOOM_DURATION), blend = zoomProgress * zoomProgress * (3 - 2 * zoomProgress); cameraAim.copy(cameraFromAim).lerp(cameraToAim, blend); cameraPosition.copy(cameraFromPosition).lerp(cameraToPosition, blend); } else if (!focus) setCameraShot(null, cameraAim, cameraPosition); else { setCameraShot(focus.previous, cameraFromAim, cameraFromPosition); setCameraShot(focus.current, cameraToAim, cameraToPosition); const transition = clamp(focus.blend * 8), blend = transition * transition * (3 - 2 * transition); cameraAim.copy(cameraFromAim).lerp(cameraToAim, blend); cameraPosition.copy(cameraFromPosition).lerp(cameraToPosition, blend); } camera.position.copy(cameraPosition); camera.lookAt(cameraAim);
    renderer.setScissorTest(false); renderer.clear(); renderer.render(scene, backgroundCamera); renderer.clearDepth(); renderer.setScissor(shipViewport.x, H - shipViewport.y - shipViewport.height, shipViewport.width, shipViewport.height); renderer.setScissorTest(true); renderer.render(shipScene, camera); renderer.setScissorTest(false);
  }
  function renderFlight({ elapsed, accent = COLORS.wire }) {
    const viewport = FLIGHT_VIEWPORT, entryProgress = clamp(elapsed / FLIGHT_SHIP_ENTRY_DURATION), shipEntry = 1 - (1 - entryProgress) ** 3, bob = Math.sin(elapsed * 3.1) * .11 + Math.sin(elapsed * 7.4) * .018, outroElapsed = Math.max(0, elapsed - FLIGHT_OUTRO_START), shipExitProgress = clamp(outroElapsed / FLIGHT_SHIP_EXIT_DURATION), shipExit = shipExitProgress ** 2, restFade = 1 - clamp((outroElapsed - FLIGHT_SHIP_EXIT_DURATION) / FLIGHT_REST_FADE_DURATION), siteElapsed = Math.max(0, elapsed - FLIGHT_SITE_START), finalFade = clamp((elapsed - FLIGHT_SITE_FADE_START) / FLIGHT_FINAL_FADE_DURATION), streakProgress = outroElapsed < FLIGHT_SHIP_EXIT_DURATION - .08 ? 1 : 0;
    updateStarfield(elapsed, 1, .32, 44, 'horizontal', streakProgress);
    shipMaterial.color.set(accent); shipMaterial.opacity = .96; root.visible = shipExitProgress < 1; root.position.x = -FLIGHT_SHIP_ENTRY_DISTANCE * (1 - shipEntry) + shipExit * FLIGHT_SHIP_EXIT_DISTANCE; root.position.y = bob; root.position.z = 0; root.scale.setScalar(.68 + shipEntry * .67 + Math.sin(elapsed * 2.2) * .035 * shipEntry); updateThrust(elapsed, .62 + shipExitProgress * .38);
    root.rotation.set(0, 0, -Math.PI / 2); root.rotateY(Math.sin(elapsed * 1.4) * .27 + shipExitProgress ** 1.4 * Math.PI * 2);
    root.updateMatrixWorld(true);
    cameraAim.set(0, bob, 0);
    cameraPosition.copy(cameraAim); cameraPosition.y += .04; cameraPosition.z += 8.4; camera.position.copy(cameraPosition); camera.aspect = viewport.width / viewport.height; camera.updateProjectionMatrix(); camera.lookAt(cameraAim);
    const bottom = H - viewport.y - viewport.height;
    renderer.setViewport(0, 0, W, H); renderer.setScissorTest(false); renderer.clear(); renderer.render(scene, backgroundCamera); renderer.clearDepth(); renderer.setViewport(viewport.x, bottom, viewport.width, viewport.height); renderer.setScissor(viewport.x, bottom, viewport.width, viewport.height); renderer.setScissorTest(true); renderer.render(scene, camera); renderer.clearDepth(); renderer.render(shipScene, camera); renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
    context.clearRect(0, 0, width, height); context.drawImage(renderer.domElement, 0, 0, width, height);
    context.save(); context.globalAlpha = restFade;
    drawPilotPanel(elapsed, accent, outroElapsed < FLIGHT_SHIP_EXIT_DURATION - .08);
    drawFlightTitle(elapsed, accent);
    if (logoPixels) { quantizeLogo(elapsed); context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.drawImage(logoPixels, 14, 24, 512, 36); context.restore(); }
    drawClassicArcade(66);
    context.restore();
    drawFlightWebsite(siteElapsed);
    if (finalFade) { context.save(); context.globalAlpha = finalFade; context.fillStyle = COLORS.shadow; context.fillRect(0, 0, width, height); context.restore(); }
  }
  function colorParts(hex) { const value = hex.replace('#', ''); return [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16)]; }
  function colorString(parts, alpha = 1) { return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`; }
  function radialText(value, x, y, color, scale = 1, time = 0) {
    const base = colorParts(color), width = measure(value, scale), middle = (value.length - 1) / 2, furthest = Math.max(1, middle), waveRadius = (time * 14.5) % (furthest + 2), shades = [.42, .62, .9, 1.22, 1.6]; let cursor = Math.round(x - width / 2);
    [...value].forEach((character, index) => { const distance = Math.abs(index - middle), wave = Math.max(0, 1 - Math.abs(distance - waveRadius) / .95) ** 2, baseline = Math.max(0, 1 - distance / (furthest + 1)) * .08, step = Math.max(0, Math.min(shades.length - 1, Math.round((.48 + baseline + wave * .95) * 3))), shade = base.map(channel => Math.max(0, Math.min(255, Math.round(channel * shades[step])))); context.drawImage(glyphImage(glyphCode(character), colorString(shade)), cursor, y, 8 * scale, 8 * scale); cursor += 9 * scale; });
  }
  function drawClassicArcade(y) {
    if (!classicSource || !classicPixels) return;
    const classicContext = classicPixels.getContext('2d'); classicContext.clearRect(0, 0, classicPixels.width, classicPixels.height); classicContext.drawImage(classicSource, 0, 0);
    const image = classicContext.getImageData(0, 0, classicPixels.width, classicPixels.height), color = [169, 167, 215];
    for (let index = 0; index < image.data.length; index += 4) { if (!image.data[index + 3]) continue; image.data[index] = color[0]; image.data[index + 1] = color[1]; image.data[index + 2] = color[2]; }
    classicContext.putImageData(image, 0, 0); context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.drawImage(classicPixels, Math.round((width - classicPixels.width * 4) / 2), y, classicPixels.width * 4, classicPixels.height * 4); context.restore();
  }
  function randomFlash(elapsed, rate, offset, probability) { const tick = Math.floor(elapsed * rate), phase = elapsed * rate - tick, trigger = seeded(tick * 13.7 + offset); if (trigger > probability) return 0; const duration = .04 + seeded(tick * 5.3 + offset + 31) * .02; return phase < duration ? 1 : 0; }
  function visorSweepState(elapsed) { const rate = 2.8, cyclePosition = elapsed * rate, cycle = Math.floor(cyclePosition), phase = cyclePosition - cycle, start = .02 + seeded(cycle * 17.23 + 4.1) * .12, duration = .18 + seeded(cycle * 11.47 + 8.6) * .06; return phase < start || phase >= start + duration ? null : { progress: clamp((phase - start) / duration), lane: seeded(cycle * 31.71 + 2.8) < .5 ? 0 : 1, length: 2 + Math.floor(seeded(cycle * 23.17 + 9.4) * 6) }; }
  function preparePilots(image) {
    const source = document.createElement('canvas'); source.width = image.naturalWidth; source.height = image.naturalHeight; const sourceContext = source.getContext('2d'); sourceContext.drawImage(image, 0, 0);
    const pixels = sourceContext.getImageData(0, 0, source.width, source.height), isBackdrop = index => { const red = pixels.data[index], green = pixels.data[index + 1], blue = pixels.data[index + 2]; return red > 210 && green > 210 && blue > 210 && Math.max(red, green, blue) - Math.min(red, green, blue) < 42; };
    const visited = new Uint8Array(source.width * source.height), queue = [];
    const enqueue = (x, y) => { if (x < 0 || x >= source.width || y < 0 || y >= source.height) return; const cell = y * source.width + x; if (visited[cell]) return; const index = cell * 4; if (!isBackdrop(index)) return; visited[cell] = 1; queue.push(cell); };
    for (let x = 0; x < source.width; x += 1) { enqueue(x, 0); enqueue(x, source.height - 1); }
    for (let y = 1; y < source.height - 1; y += 1) { enqueue(0, y); enqueue(source.width - 1, y); }
    for (let cursor = 0; cursor < queue.length; cursor += 1) { const cell = queue[cursor], x = cell % source.width, y = Math.floor(cell / source.width), index = cell * 4; pixels.data[index + 3] = 0; enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1); }
    let brightestBlue = [55, 105, 175], brightestBlueValue = 0;
    for (let index = 0; index < pixels.data.length; index += 4) {
      if (!pixels.data[index + 3]) continue;
      const red = pixels.data[index], green = pixels.data[index + 1], blue = pixels.data[index + 2], value = red + green + blue;
      if (blue >= green && green >= red && value > brightestBlueValue && !isBackdrop(index)) { brightestBlue = [red, green, blue]; brightestBlueValue = value; }
    }
    const highlights = document.createElement('canvas'); highlights.width = source.width; highlights.height = source.height; const highlightContext = highlights.getContext('2d'), highlightPixels = highlightContext.createImageData(source.width, source.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      if (!pixels.data[index + 3] || !isBackdrop(index)) continue;
      pixels.data[index] = brightestBlue[0]; pixels.data[index + 1] = brightestBlue[1]; pixels.data[index + 2] = brightestBlue[2];
      highlightPixels.data[index] = 255; highlightPixels.data[index + 1] = 255; highlightPixels.data[index + 2] = 255; highlightPixels.data[index + 3] = 255;
    }
    sourceContext.putImageData(pixels, 0, 0); highlightContext.putImageData(highlightPixels, 0, 0); return { source, highlights };
  }
  function prepareSweepPaths(image) {
    const guideCanvas = document.createElement('canvas'); guideCanvas.width = image.naturalWidth; guideCanvas.height = image.naturalHeight; const guideContext = guideCanvas.getContext('2d'); guideContext.drawImage(image, 0, 0); const pixels = guideContext.getImageData(0, 0, guideCanvas.width, guideCanvas.height), isGuide = index => pixels.data[index + 3] > 0 && pixels.data[index] > pixels.data[index + 1] + 14 && pixels.data[index] > pixels.data[index + 2] + 14, visited = new Uint8Array(guideCanvas.width * guideCanvas.height), components = [];
    for (let y = 0; y < guideCanvas.height; y += 1) for (let x = 0; x < guideCanvas.width; x += 1) { const start = y * guideCanvas.width + x; if (visited[start] || !isGuide(start * 4)) continue; const queue = [start], points = []; visited[start] = 1; for (let cursor = 0; cursor < queue.length; cursor += 1) { const cell = queue[cursor], pointX = cell % guideCanvas.width, pointY = Math.floor(cell / guideCanvas.width); points.push([pointX, pointY]); for (let offsetY = -1; offsetY <= 1; offsetY += 1) for (let offsetX = -1; offsetX <= 1; offsetX += 1) { if (!offsetX && !offsetY) continue; const nextX = pointX + offsetX, nextY = pointY + offsetY; if (nextX < 0 || nextX >= guideCanvas.width || nextY < 0 || nextY >= guideCanvas.height) continue; const next = nextY * guideCanvas.width + nextX; if (!visited[next] && isGuide(next * 4)) { visited[next] = 1; queue.push(next); } } } components.push(points.sort((a, b) => a[1] - b[1] || a[0] - b[0])); }
    const left = components.filter(path => path[0][0] < guideCanvas.width / 2).sort((a, b) => b.length - a.length).slice(0, 2).sort((a, b) => a[0][1] - b[0][1]), right = components.filter(path => path[0][0] >= guideCanvas.width / 2).sort((a, b) => b.length - a.length).slice(0, 2).sort((a, b) => a[0][1] - b[0][1]); return left.length === 2 && right.length === 2 ? { left, right } : null;
  }
  function sampleSweepPath(path, progress) { const position = progress * (path.length - 1), lower = Math.floor(position), upper = Math.min(path.length - 1, lower + 1), blend = position - lower; return [path[lower][0] + (path[upper][0] - path[lower][0]) * blend, path[lower][1] + (path[upper][1] - path[lower][1]) * blend]; }
  function sweepTrailPoints(path, progress, length) { const position = progress * (path.length - 1), points = [sampleSweepPath(path, progress)], seen = new Set([Math.floor(position)]); for (let offset = 1; offset < length; offset += 1) { const index = Math.max(0, Math.floor(position) - offset); if (seen.has(index)) continue; seen.add(index); points.push(path[index]); } return points; }
  function drawPilotPanel(elapsed, accent, showVisorTrails = true) {
    const x = PILOT_PANEL.x * SCALE, y = PILOT_PANEL.y * SCALE, panelWidth = PILOT_PANEL.width * SCALE, panelHeight = PILOT_PANEL.height * SCALE;
    const accentParts = colorParts(accent), pilotTint = [55, 105, 175], flashColor = [135, 195, 255], bright = [255, 255, 255];
    context.save(); context.fillStyle = '#0d0924'; context.fillRect(x, y, panelWidth, panelHeight); context.strokeStyle = colorString(accentParts, .92); context.lineWidth = 3; context.strokeRect(x + 1.5, y + 1.5, panelWidth - 3, panelHeight - 3);
    if (pilotsSource && pilotsTint) {
      const tintContext = pilotsTint.getContext('2d'); tintContext.clearRect(0, 0, pilotsTint.width, pilotsTint.height); tintContext.globalCompositeOperation = 'source-over'; tintContext.drawImage(pilotsSource, 0, 0); tintContext.globalCompositeOperation = 'color'; tintContext.fillStyle = colorString(pilotTint, .36); tintContext.fillRect(0, 0, pilotsTint.width, pilotsTint.height); tintContext.globalCompositeOperation = 'destination-in'; tintContext.drawImage(pilotsSource, 0, 0);
      const flashA = randomFlash(elapsed, 2.35, 3.1, .22), flashB = randomFlash(elapsed, 5.7, 17.4, .1), flash = Math.min(1, flashA + flashB * .72);
      if (flash > .01) { tintContext.globalCompositeOperation = 'screen'; tintContext.fillStyle = colorString(flashColor, flash * (.26 + seeded(Math.floor(elapsed * 4.1) * 8.1 + 4.6) * .38)); tintContext.fillRect(0, 0, pilotsTint.width, pilotsTint.height); tintContext.globalCompositeOperation = 'destination-in'; tintContext.drawImage(pilotsSource, 0, 0); }
      tintContext.globalCompositeOperation = 'source-over'; context.imageSmoothingEnabled = false; context.drawImage(pilotsTint, x + 12, y + 6, panelWidth - 24, panelHeight - 12);
      if (flash > .01 && pilotsHighlightMask) { context.save(); context.globalCompositeOperation = 'screen'; context.globalAlpha *= Math.min(1, flash * (.88 + seeded(Math.floor(elapsed * 4.1) * 8.1 + 4.6) * .12)); context.imageSmoothingEnabled = false; context.drawImage(pilotsHighlightMask, x + 12, y + 6, panelWidth - 24, panelHeight - 12); context.restore(); }
      const sweep = showVisorTrails ? visorSweepState(elapsed) : null;
      if (sweep && pilotsSweepPaths) { const squareSize = 2 * SCALE, imageX = x + 12, imageY = y + 6, imageWidth = panelWidth - 24, imageHeight = panelHeight - 12, sourceScaleX = imageWidth / pilotsSource.width, sourceScaleY = imageHeight / pilotsSource.height; context.fillStyle = colorString(bright, .72 + flash * .28); [pilotsSweepPaths.left[sweep.lane], pilotsSweepPaths.right[sweep.lane]].forEach(path => { sweepTrailPoints(path, sweep.progress, sweep.length).forEach(([pointX, pointY]) => context.fillRect(Math.round(imageX + pointX * sourceScaleX), Math.round(imageY + pointY * sourceScaleY), squareSize, squareSize)); }); }
    }
    context.restore();
  }
  function drawFlightTitle(elapsed, accent) {
    if (!flightTitleFontData) return;
    context.save(); context.scale(SCALE, SCALE);
    FLIGHT_TITLE_CARDS.forEach((card, cardIndex) => {
      const cardElapsed = elapsed - FLIGHT_TITLE_CARD_STARTS[cardIndex];
      if (cardElapsed < 0 || cardElapsed >= FLIGHT_TITLE_EXIT_START + flightTitleExitWindow(card)) return;
      const mode = cardElapsed >= FLIGHT_TITLE_EXIT_START ? 'exit' : 'enter', animationElapsed = mode === 'exit' ? cardElapsed - FLIGHT_TITLE_EXIT_START : cardElapsed;
      card.forEach((line, index) => waveText(line, Math.round(W / 2), FLIGHT_TITLE_Y + index * (8 + FLIGHT_TITLE_LINE_GAP), '#f1f8ff', animationElapsed, index * Math.PI, index, mode, cardElapsed));
    });
    context.restore();
  }
  function drawFlightWebsite(elapsed) {
    if (!flightSiteFontData) return;
    const startX = Math.round((W - measure(FLIGHT_SITE_COPY)) / 2);
    context.save(); context.scale(SCALE, SCALE); context.beginPath(); context.rect(0, 0, W, FLIGHT_SITE_HORIZON_Y); context.clip();
    [...FLIGHT_SITE_COPY].forEach((character, index) => {
      const progress = clamp((elapsed - index * FLIGHT_SITE_LETTER_STAGGER) / FLIGHT_SITE_JUMP_DURATION);
      if (!progress) return;
      const launchOffset = (1 - progress) * 11 - Math.sin(progress * Math.PI) * 6, y = FLIGHT_SITE_FINAL_Y + Math.round(launchOffset);
      context.drawImage(glyphImage(glyphCode(character), '#f1f8ff', flightSiteFontData, 'flight-site'), startX + index * 9, y, 8, 8);
    });
    context.restore();
  }
  function renderTransition({ elapsed, progress }) {
    const transition = clamp(progress), viewport = { x: SHIP_CONTENT_VIEWPORT.x, y: Math.round(9 + (SHIP_CONTENT_VIEWPORT.y - 9) * transition), width: SHIP_CONTENT_VIEWPORT.width, height: Math.round(207 + (SHIP_CONTENT_VIEWPORT.height - 207) * transition) }, settleProgress = clamp((transition - HANDOFF_SHIP_HOLD_START) / HANDOFF_SHIP_SETTLE_DURATION), handoffFaceOn = settleProgress * settleProgress * (3 - 2 * settleProgress);
    updateThree({ name: 'acquire', index: 2, elapsed, local: transition }, elapsed, viewport, elapsed, handoffFaceOn);
    context.clearRect(0, 0, width, height); context.drawImage(renderer.domElement, 0, 0, width, height); drawOverlay({ ...sequenceFor(HUD_STAGE_START_ELAPSED), elapsed }, transition, true);
  }
  function drawFocusOverlay(sequence) {
    const focus = subsystemFocus(sequence);
    if (!focus || focus.blend < .125) { focusOverlayGeometry = null; return; }
    if (!focusOverlayGeometry || focusOverlayGeometry.index !== focus.index) {
      const projectedHighlights = (focus.current.highlights || [focus.current.point]).map(coordinates => {
        const point = root.localToWorld(new THREE.Vector3(...coordinates)).project(camera);
        return [Math.round((point.x * .5 + .5) * W), Math.round((-point.y * .5 + .5) * H)];
      });
      const [blockX, blockY] = focus.current.callout;
      const header = `${focus.current.label}/SYS`;
      const lineEndX = focus.current.calloutSide === 'right' ? blockX + technicalMeasure(header) + 3 : blockX - 3;
      const lineEndY = blockY + 5;
      const [highlightX, highlightY] = projectedHighlights.reduce((nearest, point) => {
        const nearestDistance = (nearest[0] - lineEndX) ** 2 + (nearest[1] - lineEndY) ** 2;
        const pointDistance = (point[0] - lineEndX) ** 2 + (point[1] - lineEndY) ** 2;
        return pointDistance < nearestDistance ? point : nearest;
      });
      const distance = Math.max(1, Math.hypot(lineEndX - highlightX, lineEndY - highlightY));
      const startX = focus.current.lineOrigin === 'lowerLeft' ? Math.round(highlightX - focus.current.radius * .7) : Math.round(highlightX + (lineEndX - highlightX) / distance * focus.current.radius);
      const startY = focus.current.lineOrigin === 'lowerLeft' ? Math.round(highlightY + focus.current.radius * .7) : Math.round(highlightY + (lineEndY - highlightY) / distance * focus.current.radius);
      focusOverlayGeometry = { index: focus.index, projectedHighlights, line: [startX, startY, lineEndX, lineEndY] };
    }
    context.save();
    context.beginPath(); context.rect(SHIP_CONTENT_VIEWPORT.x, SHIP_CONTENT_VIEWPORT.y, SHIP_CONTENT_VIEWPORT.width, SHIP_CONTENT_VIEWPORT.height); context.clip();
    const { projectedHighlights, line } = focusOverlayGeometry;
    const blinkComplete = focus.blend >= .225;
    if (blinkComplete || Math.floor(sequence.elapsed * 10) % 2) {
      context.globalAlpha = .55; context.fillStyle = COLORS.fill;
      projectedHighlights.forEach(([highlightX, highlightY]) => {
        for (let angle = 0; angle < 360; angle += 20) {
          const radians = angle * Math.PI / 180;
          context.fillRect(Math.round(highlightX + Math.cos(radians) * focus.current.radius), Math.round(highlightY + Math.sin(radians) * focus.current.radius), 1, 1);
        }
      });
    }
    if (!blinkComplete) { context.restore(); return; }
    const [blockX, blockY] = focus.current.callout;
    context.globalAlpha = 1; pixelLine(line[0], line[1], line[2], line[3], COLORS.status);
    drawTechnicalBlock(focus, blockX, blockY, clamp((focus.blend - .225) / .3));
    context.restore();
  }
  function quantizeLogo(time) { if (!logoPixels || !logoSource) return; const logoContext = logoPixels.getContext('2d'); logoContext.clearRect(0, 0, logoPixels.width, logoPixels.height); logoContext.drawImage(logoSource, 0, 0); const image = logoContext.getImageData(0, 0, logoPixels.width, logoPixels.height), phase = Math.floor(time * 4) % LOGO_REFLECTION_LEVELS.length, base = [112, 108, 188], reflection = LOGO_REFLECTION_LEVELS.map(level => base.map(channel => level <= 1 ? Math.round(channel * level) : Math.round(channel + (255 - channel) * (level - 1)))); for (let index = 0; index < image.data.length; index += 4) { if (!image.data[index + 3]) continue; const pixel = index / 4, x = pixel % logoPixels.width, band = LOGO_COLOR_BANDS[`${image.data[index]},${image.data[index + 1]},${image.data[index + 2]}`] ?? 3, color = x >= 55 && x <= 63 ? reflection[3] : band === 0 ? LOGO_SHADOW_COLOR : reflection[(band - 1 + phase) % reflection.length]; image.data[index] = color[0]; image.data[index + 1] = color[1]; image.data[index + 2] = color[2]; } logoContext.putImageData(image, 0, 0); }
  function drawOverlay(sequence, revealProgress = 1, inverseReveal = false) {
    context.clearRect(0, 0, width, height); context.globalCompositeOperation = 'source-over'; context.drawImage(renderer.domElement, 0, 0, width, height);
    if (!fontData || sequence.name === 'void') return;
    const revealAlpha = order => inverseReveal ? clamp((revealProgress - (HANDOFF_REVEAL_ORDER_COUNT - 1 - order) * HANDOFF_REVEAL_STAGGER) / HANDOFF_REVEAL_DURATION) : revealProgress;
    const viewportTextRevealAlpha = index => inverseReveal ? clamp((revealProgress - (HANDOFF_VIEWPORT_TEXT_START + index * (HANDOFF_VIEWPORT_TEXT_DURATION + HANDOFF_VIEWPORT_TEXT_GAP))) / HANDOFF_VIEWPORT_TEXT_DURATION) : revealProgress;
    const viewportBorderAlpha = inverseReveal ? Number(revealProgress >= 1) : revealProgress;
    const signalProgress = sequence.name === 'signal' ? sequence.local : 1;
    context.save(); context.scale(SCALE, SCALE); context.globalAlpha = signalProgress * revealAlpha(0);
    const { loads } = systemLoadState(sequence), complete = loads.at(-1).phase >= 1;
    const systemsLabel = complete ? 'ALL SYSTEMS GO' : `SYSTEMS CHECK ${SPINNER_FRAMES[Math.floor(sequence.elapsed * 8) % SPINNER_FRAMES.length]}`;
    if (complete) radialText('<<ALL SYSTEMS GO>>', W / 2, 31, COLORS.callout, 1, sequence.elapsed); else text(systemsLabel, W / 2, 31, COLORS.secondary, 1, 'center');
    if (logoPixels) { quantizeLogo(sequence.elapsed); context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.drawImage(logoPixels, 14, 24, 512, 36); context.restore(); }
    drawClassicArcade(66);
    if (sequence.name === 'signal') { context.restore(); return; }
    const acquireProgress = sequence.name === 'acquire' ? sequence.local : 1;
    context.globalAlpha = viewportBorderAlpha; thinBorder(SHIP_VIEWPORT);
    context.globalAlpha = acquireProgress * viewportTextRevealAlpha(0); text('GK-99', 13, 51, COLORS.status);
    context.globalAlpha = acquireProgress * viewportTextRevealAlpha(1); text('"WARDEN"', 13, 61, COLORS.primary);
    context.globalAlpha = acquireProgress * viewportTextRevealAlpha(2); scrollingCoordinates(sequence);
    context.globalAlpha = acquireProgress * viewportTextRevealAlpha(3); scrollingOperations(sequence);
    if (sequence.name === 'acquire') { context.restore(); return; }
    const aggregate = loads.reduce((total, item) => total + item.phase, 0) / loads.length, rows = [['SYS', aggregate, `${String(Math.round(aggregate * 100)).padStart(3, '0')}%`], ...loads.map(item => [item.label, item.phase, item.phase >= 1 ? 'OK' : item.phase > 0 ? 'CHK' : 'IDLE'])];
    rows.forEach(([label, phase, status], index) => {
      const y = SYSTEM_ROWS_Y + index * 8, active = index === 0 || phase > 0, statusVisible = status !== 'CHK' || Math.floor(sequence.elapsed * 8) % 2 === 0;
      const rowReveal = inverseReveal ? clamp((revealProgress - clamp((H - 6 - (y + 8)) / (H - 6 - SHIP_VIEWPORT.y - SHIP_VIEWPORT.height)) - HANDOFF_ROW_TRAIL_DELAY) / HANDOFF_ROW_REVEAL_DURATION) : revealProgress;
      context.globalAlpha = rowReveal;
      text(label, 14, y, index === 0 ? COLORS.status : active ? COLORS.primary : COLORS.idle); if (statusVisible) text(status, SYSTEM_STATUS_RIGHT, y, active ? COLORS.secondary : COLORS.idle, 1, 'right'); bar(SYSTEM_BAR_X, y, SYSTEM_BAR_WIDTH, phase, active);
    });
    context.globalAlpha = revealAlpha(8); drawFocusOverlay(sequence); context.restore();
  }
  const ready = Promise.all([fetch('./assets/font-data-h/330.h').then(response => { if (!response.ok) throw new Error('Could not load Reactor.'); return response.text(); }), fetch('./assets/font-data-h/031.h').then(response => { if (!response.ok) throw new Error('Could not load Bitty.'); return response.text(); }), fetch('./assets/font-data-h/078.h').then(response => { if (!response.ok) throw new Error('Could not load Computer.'); return response.text(); }), fetch('./assets/font-data-h/270.h').then(response => { if (!response.ok) throw new Error('Could not load PicoMag.'); return response.text(); }), fetch('./assets/font-data-h/129.h').then(response => { if (!response.ok) throw new Error('Could not load Emmaline.'); return response.text(); }), fetch('./assets/font-data-h/456.h').then(response => { if (!response.ok) throw new Error('Could not load ZX Eurostile.'); return response.text(); }), fetch('./assets/glyphs/legacy-glyphs.json').then(response => { if (!response.ok) throw new Error('Could not load ATASCII glyphs.'); return response.json(); })]).then(([reactor, bitty, computer, picomag, emmaline, eurostile, glyphSource]) => { fontData = parseHeaderFont(reactor); atasciiData = new Uint8Array(128 * 8); flightTitleFontData = parseHeaderFont(emmaline); flightSiteFontData = parseHeaderFont(eurostile); technicalFontData = parseHeaderFont(bitty); computerFontData = parseHeaderFont(computer); picomagFontData = parseHeaderFont(picomag); glyphSource.glyphs.forEach(glyph => { if (glyph.system === 'ATASCII' && glyph.internalSlot) atasciiData.set(glyph.bitmap, Number.parseInt(glyph.internalSlot, 16) * 8); }); glyphCache.clear(); });
  const logo = new Image(); logo.onload = () => { logoSource = document.createElement('canvas'); logoSource.width = logo.naturalWidth; logoSource.height = logo.naturalHeight; logoSource.getContext('2d').drawImage(logo, 0, 0); logoPixels = document.createElement('canvas'); logoPixels.width = logo.naturalWidth; logoPixels.height = logo.naturalHeight; }; logo.src = './assets/images/gklogo.png';
  const classic = new Image(); classic.onload = () => { classicSource = document.createElement('canvas'); classicSource.width = classic.naturalWidth; classicSource.height = classic.naturalHeight; classicSource.getContext('2d').drawImage(classic, 0, 0); classicPixels = document.createElement('canvas'); classicPixels.width = classic.naturalWidth; classicPixels.height = classic.naturalHeight; }; classic.src = './assets/images/classicarcade.png';
  const pilots = new Image(); pilots.onload = () => { const prepared = preparePilots(pilots); pilotsSource = prepared.source; pilotsHighlightMask = prepared.highlights; pilotsTint = document.createElement('canvas'); pilotsTint.width = pilots.naturalWidth; pilotsTint.height = pilots.naturalHeight; }; pilots.src = './assets/images/pilots.png';
  const pilotsGuides = new Image(); pilotsGuides.onload = () => { pilotsSweepPaths = prepareSweepPaths(pilotsGuides); }; pilotsGuides.src = './assets/images/pilots-guides.png';
  const ship = new Image(); ship.onload = () => createShipGeometry(ship); ship.src = './assets/images/ship.png';
  return { canvas, ready, handoffElapsed: HUD_HANDOFF_ELAPSED, renderBackground, renderTransition, renderFlight, render: ({ elapsed, duration = BOOT_DURATION - HUD_HANDOFF_ELAPSED, starElapsed = elapsed }) => { const postHandoffDuration = BOOT_DURATION - HUD_STAGE_START_ELAPSED, sequenceElapsed = HUD_STAGE_START_ELAPSED + clamp(elapsed / Math.max(.1, duration)) * postHandoffDuration, sequence = sequenceFor(sequenceElapsed); updateThree(sequence, starElapsed); drawOverlay(sequence); } };
}
