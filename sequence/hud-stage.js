import * as THREE from 'three';

const W = 180, H = 225, SCALE = 3;
const SHIP_VIEWPORT = { x: 6, y: 43, width: 168, height: 128 };
const SHIP_CONTENT_VIEWPORT = { x: 9, y: 46, width: 162, height: 122 };
const TECH_SOURCE_GLYPH_SIZE = 4, TECH_GLYPH_SIZE = 4, TECH_GLYPH_GAP = 1;
const COMPUTER_GLYPH_SIZE = 4, COMPUTER_GLYPH_GAP = 1;
const SYSTEM_STATUS_RIGHT = 104, SYSTEM_BAR_X = 116, SYSTEM_BAR_WIDTH = 50;
const HUD_TILES = { topLeft: 0x51, horizontal: 0x52, topRight: 0x45, leftVertical: 0x7c, rightVertical: 0x7c, bottomLeft: 0x5a, bottomRight: 0x43 };
const COLORS = { space: '#0c0a20', shadow: '#020208', wire: '#00ddff', frame: '#4848d0', primary: '#ccccff', secondary: '#88ffee', status: '#ffdd44', dim: '#ff4488', idle: '#707080', fill: '#00ddff', outline: '#7070ff', callout: '#ff4488' };
const SPINNER_FRAMES = ['|', '/', '-', '\\'];
const BOOT_STAGES = [{ name: 'void', duration: 1.4 }, { name: 'signal', duration: 2.4 }, { name: 'acquire', duration: 2.1 }, { name: 'systems', duration: 8 * 4 }, { name: 'ready', duration: 6.5 }];
const BOOT_DURATION = BOOT_STAGES.reduce((total, stage) => total + stage.duration, 0);
const HUD_HANDOFF_ELAPSED = BOOT_STAGES.slice(0, 3).reduce((total, stage) => total + stage.duration, 0) - .05;
const HUD_REVEAL_DURATION = .72;
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
  const glyphCache = new Map(); let fontData = null, computerFontData = null, picomagFontData = null, technicalFontData = null, logoPixels = null, logoSource = null, focusOverlayGeometry = null;

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
    const geometry = new THREE.BufferGeometry(), attribute = new THREE.BufferAttribute(positions, 3); geometry.setAttribute('position', attribute); const material = new THREE.PointsMaterial({ color, size: .055, transparent: true, opacity: 0 }); scene.add(new THREE.Points(geometry, material)); driftingStars.push({ positions, seeds, attribute, material });
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
  function glyphCode(character) { if (character === '|') return 0x7c; const code = character.codePointAt(0); return code >= 32 && code <= 126 ? code - 32 : 31; }
  function measure(value, scale = 1) { return Math.max(0, [...value].length * 9 - 1) * scale; }
  function text(value, x, y, color, scale = 1, align = 'left') { let pen = Math.round(x - (align === 'center' ? measure(value, scale) / 2 : align === 'right' ? measure(value, scale) : 0)); for (const character of value) { context.drawImage(glyphImage(glyphCode(character), color), pen, y, 8 * scale, 8 * scale); pen += 9 * scale; } }
  function computerGlyphImage(character, color) { const code = glyphCode(character), cacheKey = `computer-${code}:${color}`; if (glyphCache.has(cacheKey)) return glyphCache.get(cacheKey); const glyph = document.createElement('canvas'); glyph.width = glyph.height = COMPUTER_GLYPH_SIZE; const glyphContext = glyph.getContext('2d'); glyphContext.fillStyle = color; const glyphOffset = code * 8; for (let row = 0; row < COMPUTER_GLYPH_SIZE; row += 1) for (let column = 0; column < COMPUTER_GLYPH_SIZE; column += 1) { let filled = false; for (let sourceRow = row * 2; sourceRow < row * 2 + 2; sourceRow += 1) for (let sourceColumn = column * 2; sourceColumn < column * 2 + 2; sourceColumn += 1) if (computerFontData?.[glyphOffset + sourceRow] & (1 << (7 - sourceColumn))) filled = true; if (filled) glyphContext.fillRect(column, row, 1, 1); } glyphCache.set(cacheKey, glyph); return glyph; }
  function computerText(value, x, y, color) { let pen = Math.round(x); for (const character of value) { context.drawImage(computerGlyphImage(character, color), pen, y, COMPUTER_GLYPH_SIZE, COMPUTER_GLYPH_SIZE); pen += COMPUTER_GLYPH_SIZE + COMPUTER_GLYPH_GAP; } }
  function computerMeasure(value) { return Math.max(0, [...value].length * (COMPUTER_GLYPH_SIZE + COMPUTER_GLYPH_GAP) - COMPUTER_GLYPH_GAP); }
  function picomagGlyphImage(character, color) { const code = glyphCode(character), cacheKey = `picomag-${code}:${color}`; if (glyphCache.has(cacheKey)) return glyphCache.get(cacheKey); const glyph = document.createElement('canvas'); glyph.width = glyph.height = COMPUTER_GLYPH_SIZE; const glyphContext = glyph.getContext('2d'); glyphContext.fillStyle = color; const glyphOffset = code * 8; for (let row = 0; row < COMPUTER_GLYPH_SIZE; row += 1) for (let column = 0; column < COMPUTER_GLYPH_SIZE; column += 1) { let filled = false; for (let sourceRow = row * 2; sourceRow < row * 2 + 2; sourceRow += 1) for (let sourceColumn = column * 2; sourceColumn < column * 2 + 2; sourceColumn += 1) if (picomagFontData?.[glyphOffset + sourceRow] & (1 << (7 - sourceColumn))) filled = true; if (filled) glyphContext.fillRect(column, row, 1, 1); } glyphCache.set(cacheKey, glyph); return glyph; }
  function terminalText(value, x, y, color) { let pen = Math.round(x); for (const character of value) { context.drawImage(picomagGlyphImage(character, color), pen, y, COMPUTER_GLYPH_SIZE, COMPUTER_GLYPH_SIZE); pen += COMPUTER_GLYPH_SIZE + COMPUTER_GLYPH_GAP; } }
  function rawGlyph(code, x, y, color) { context.drawImage(glyphImage(code, color), x, y); }
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
  function updateStarfield(elapsed, signalProgress = 1, staticOpacity = .68) {
    staticStars.forEach(field => { field.material.opacity = staticOpacity; });
    driftingStars.forEach(layer => { layer.material.opacity = signalProgress * .9; for (let index = 0; index < layer.seeds.length / 3; index += 1) { const position = index * 3, speed = .55 + layer.seeds[position + 2] * .95, travel = (elapsed * speed + layer.seeds[position + 2] * 19) % 19; layer.positions[position] = (layer.seeds[position] - .5) * 13; layer.positions[position + 1] = (layer.seeds[position + 1] - .5) * 8; layer.positions[position + 2] = -12 + travel; } layer.attribute.needsUpdate = true; });
    for (let index = 0; index < twinklePhases.length; index += 1) { const intensity = (.14 + Math.max(0, Math.sin(elapsed * 2.1 + twinklePhases[index]) - .77) * 3.75) * signalProgress, color = twinkleBaseColors[index % twinkleBaseColors.length], position = index * 3; twinkleColors[position] = color.r * intensity; twinkleColors[position + 1] = color.g * intensity; twinkleColors[position + 2] = color.b * intensity; } twinkleAttribute.needsUpdate = true;
  }
  function renderBackground(elapsed) {
    updateStarfield(elapsed, 1, .68);
    renderer.setScissorTest(false); renderer.clear(); renderer.render(scene, backgroundCamera);
    context.clearRect(0, 0, width, height); context.drawImage(renderer.domElement, 0, 0, width, height);
  }
  function updateThree(sequence, starElapsed = sequence.elapsed, shipViewport = SHIP_CONTENT_VIEWPORT, motionElapsed = starElapsed) {
    updateStarfield(starElapsed, 1, .68);
    const acquisition = sequence.index > 2 ? 1 : sequence.name === 'acquire' ? clamp(sequence.local * 1.35) : 0, eased = acquisition * acquisition * (3 - 2 * acquisition); shipMaterial.opacity = eased; root.visible = acquisition > 0; root.scale.setScalar(.45 + eased * .37); root.rotation.y = motionElapsed * .65 * eased; root.rotation.x = Math.sin(motionElapsed * .8) * .08 * eased; root.position.y = Math.sin(motionElapsed * 1.5) * .12 - .2 + (1 - eased) * .7;
    root.updateMatrixWorld(true); const focus = subsystemFocus(sequence); if (sequence.name === 'ready') { setCameraShot(SYSTEM_LOADS.at(-1), cameraFromAim, cameraFromPosition); setCameraShot(null, cameraToAim, cameraToPosition); const blend = clamp(sequence.local / .28) ** 2 * (3 - 2 * clamp(sequence.local / .28)); cameraAim.copy(cameraFromAim).lerp(cameraToAim, blend); cameraPosition.copy(cameraFromPosition).lerp(cameraToPosition, blend); } else if (!focus) setCameraShot(null, cameraAim, cameraPosition); else { setCameraShot(focus.previous, cameraFromAim, cameraFromPosition); setCameraShot(focus.current, cameraToAim, cameraToPosition); const transition = clamp(focus.blend * 8), blend = transition * transition * (3 - 2 * transition); cameraAim.copy(cameraFromAim).lerp(cameraToAim, blend); cameraPosition.copy(cameraFromPosition).lerp(cameraToPosition, blend); } camera.position.copy(cameraPosition); camera.lookAt(cameraAim);
    renderer.setScissorTest(false); renderer.clear(); renderer.render(scene, backgroundCamera); renderer.clearDepth(); renderer.setScissor(shipViewport.x, H - shipViewport.y - shipViewport.height, shipViewport.width, shipViewport.height); renderer.setScissorTest(true); renderer.render(shipScene, camera); renderer.setScissorTest(false);
  }
  function renderTransition({ elapsed, progress }) {
    const transition = clamp(progress), viewport = { x: SHIP_CONTENT_VIEWPORT.x, y: Math.round(9 + (SHIP_CONTENT_VIEWPORT.y - 9) * transition), width: SHIP_CONTENT_VIEWPORT.width, height: Math.round(207 + (SHIP_CONTENT_VIEWPORT.height - 207) * transition) };
    updateThree({ name: 'acquire', index: 2, elapsed, local: transition }, elapsed, viewport);
    context.clearRect(0, 0, width, height); context.drawImage(renderer.domElement, 0, 0, width, height);
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
  function drawOverlay(sequence, revealProgress = 1) {
    context.clearRect(0, 0, width, height); context.globalCompositeOperation = 'source-over'; context.drawImage(renderer.domElement, 0, 0, width, height);
    if (!fontData || sequence.name === 'void') return;
    const signalProgress = sequence.name === 'signal' ? sequence.local : 1;
    context.save(); context.scale(SCALE, SCALE); context.globalAlpha = signalProgress * revealProgress;
    const { loads } = systemLoadState(sequence), complete = loads.at(-1).phase >= 1;
    const systemsLabel = complete ? 'ALL SYSTEMS GO' : `SYSTEMS CHECK ${SPINNER_FRAMES[Math.floor(sequence.elapsed * 8) % SPINNER_FRAMES.length]}`;
    text(systemsLabel, W / 2, 25, complete ? COLORS.callout : COLORS.secondary, 1, 'center');
    if (logoPixels) { quantizeLogo(sequence.elapsed); context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.drawImage(logoPixels, 14, 24, 512, 36); context.restore(); }
    if (sequence.name === 'signal') { context.restore(); return; }
    const acquireProgress = sequence.name === 'acquire' ? sequence.local : 1;
    context.globalAlpha = 1; thinBorder(SHIP_VIEWPORT);
    context.globalAlpha = acquireProgress * revealProgress; text('GK-99', 13, 51, COLORS.status); text('"WARDEN"', 13, 61, COLORS.primary); scrollingCoordinates(sequence); scrollingOperations(sequence);
    if (sequence.name === 'acquire') { context.restore(); return; }
    context.globalAlpha = revealProgress;
    const aggregate = loads.reduce((total, item) => total + item.phase, 0) / loads.length, rows = [['SYS', aggregate, `${String(Math.round(aggregate * 100)).padStart(3, '0')}%`], ...loads.map(item => [item.label, item.phase, item.phase >= 1 ? 'OK' : item.phase > 0 ? 'CHK' : 'IDLE'])];
    rows.forEach(([label, phase, status], index) => { const y = 178 + index * 8, active = index === 0 || phase > 0, statusVisible = status !== 'CHK' || Math.floor(sequence.elapsed * 8) % 2 === 0; text(label, 14, y, index === 0 ? COLORS.status : active ? COLORS.primary : COLORS.idle); if (statusVisible) text(status, SYSTEM_STATUS_RIGHT, y, active ? COLORS.secondary : COLORS.idle, 1, 'right'); bar(SYSTEM_BAR_X, y, SYSTEM_BAR_WIDTH, phase, active); });
    drawFocusOverlay(sequence); context.restore();
  }
  const ready = Promise.all([fetch('./assets/font-data-h/330.h').then(response => { if (!response.ok) throw new Error('Could not load Reactor.'); return response.text(); }), fetch('./assets/font-data-h/031.h').then(response => { if (!response.ok) throw new Error('Could not load Bitty.'); return response.text(); }), fetch('./assets/font-data-h/078.h').then(response => { if (!response.ok) throw new Error('Could not load Computer.'); return response.text(); }), fetch('./assets/font-data-h/270.h').then(response => { if (!response.ok) throw new Error('Could not load PicoMag.'); return response.text(); }), fetch('./assets/glyphs/legacy-glyphs.json').then(response => { if (!response.ok) throw new Error('Could not load ATASCII glyphs.'); return response.json(); })]).then(([reactor, bitty, computer, picomag, glyphSource]) => { fontData = new Uint8Array(128 * 8); fontData.set(parseHeaderFont(reactor)); technicalFontData = parseHeaderFont(bitty); computerFontData = parseHeaderFont(computer); picomagFontData = parseHeaderFont(picomag); glyphSource.glyphs.forEach(glyph => { if (glyph.system === 'ATASCII' && glyph.internalSlot) fontData.set(glyph.bitmap, Number.parseInt(glyph.internalSlot, 16) * 8); }); glyphCache.clear(); });
  const logo = new Image(); logo.onload = () => { logoSource = document.createElement('canvas'); logoSource.width = logo.naturalWidth; logoSource.height = logo.naturalHeight; logoSource.getContext('2d').drawImage(logo, 0, 0); logoPixels = document.createElement('canvas'); logoPixels.width = logo.naturalWidth; logoPixels.height = logo.naturalHeight; }; logo.src = './assets/images/gklogo.png';
  const ship = new Image(); ship.onload = () => createShipGeometry(ship); ship.src = './assets/images/ship.png';
  return { canvas, ready, handoffElapsed: HUD_HANDOFF_ELAPSED, renderBackground, renderTransition, render: ({ elapsed, duration = BOOT_DURATION, starElapsed = elapsed }) => { const sequence = sequenceFor(elapsed * BOOT_DURATION / Math.max(.1, duration)); updateThree(sequence, starElapsed); drawOverlay(sequence, clamp((elapsed - HUD_HANDOFF_ELAPSED) / HUD_REVEAL_DURATION)); } };
}
