import * as THREE from 'three';

const W = 180, H = 225, SCALE = 3;
const SHIP_VIEWPORT = { x: 6, y: 43, width: 168, height: 128 };
const SHIP_CONTENT_VIEWPORT = { x: 9, y: 46, width: 162, height: 122 };
const HUD_TILES = { topLeft: 0x51, horizontal: 0x52, topRight: 0x45, leftVertical: 0x7c, rightVertical: 0x7c, bottomLeft: 0x5a, bottomRight: 0x43 };
const COLORS = { space: '#0c0a20', shadow: '#020208', wire: '#00ddff', frame: '#4848d0', primary: '#ccccff', secondary: '#88ffee', status: '#ffdd44', dim: '#ff4488', fill: '#00ddff', outline: '#7070ff', callout: '#ffdd44' };
const BOOT_STAGES = [{ name: 'void', duration: 1.4 }, { name: 'signal', duration: 2.4 }, { name: 'acquire', duration: 2.1 }, { name: 'systems', duration: 8 * 4 }, { name: 'ready', duration: 6.5 }];
const BOOT_DURATION = BOOT_STAGES.reduce((total, stage) => total + stage.duration, 0);
const SYSTEM_LOADS = [
  { label: 'CORE', amount: 1, point: [0, 0, 0], distance: 3.6, radius: 6, callout: [17, 98], calloutSide: 'right' },
  { label: 'DRIVE', amount: 1, point: [0, -2.1, .15], distance: 3.1, radius: 5, callout: [119, 145], calloutSide: 'left' },
  { label: 'WPN', amount: 1, point: [-1.68, -.84, .1], distance: 3.3, radius: 5, callout: [14, 135], calloutSide: 'right' },
  { label: 'LINK', amount: 1, point: [0, 1.26, .1], distance: 3.4, radius: 5, callout: [117, 102], calloutSide: 'left', lineOrigin: 'lowerLeft' }
];
const LOGO_COLOR_BANDS = { '24,29,48': 0, '69,47,77': 1, '153,61,104': 2, '218,68,112': 3, '251,63,99': 4 };
const LOGO_REFLECTION_LEVELS = [.7, 1, 1.32, 1.6];

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
  const glyphCache = new Map(); let fontData = null, technicalFontData = null, logoPixels = null, logoSource = null;

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
  function glyphCode(character) { const code = character.codePointAt(0); return code >= 32 && code <= 126 ? code - 32 : 31; }
  function measure(value, scale = 1) { return Math.max(0, [...value].length * 9 - 1) * scale; }
  function text(value, x, y, color, scale = 1, align = 'left') { let pen = Math.round(x - (align === 'center' ? measure(value, scale) / 2 : align === 'right' ? measure(value, scale) : 0)); for (const character of value) { context.drawImage(glyphImage(glyphCode(character), color), pen, y, 8 * scale, 8 * scale); pen += 9 * scale; } }
  function rawGlyph(code, x, y, color) { context.drawImage(glyphImage(code, color), x, y); }
  function tiledBorder(frame) { const right = frame.x + frame.width - 8, bottom = frame.y + frame.height - 8; rawGlyph(HUD_TILES.topLeft, frame.x, frame.y, COLORS.frame); rawGlyph(HUD_TILES.topRight, right, frame.y, COLORS.frame); rawGlyph(HUD_TILES.bottomLeft, frame.x, bottom, COLORS.frame); rawGlyph(HUD_TILES.bottomRight, right, bottom, COLORS.frame); for (let x = frame.x + 8; x < right; x += 8) { rawGlyph(HUD_TILES.horizontal, x, frame.y, COLORS.frame); rawGlyph(HUD_TILES.horizontal, x, bottom, COLORS.frame); } for (let y = frame.y + 8; y < bottom; y += 8) { rawGlyph(HUD_TILES.leftVertical, frame.x, y, COLORS.frame); rawGlyph(HUD_TILES.rightVertical, right, y, COLORS.frame); } }
  function technicalText(value, x, y, color) { let pen = x; for (const character of value) { const source = glyphImage(glyphCode(character), color, technicalFontData, 'tech'); context.drawImage(source, pen, y, 4, 4); pen += 5; } }
  function technicalMeasure(value) { return Math.max(0, [...value].length * 5 - 1); }
  function pixelLine(x1, y1, x2, y2, color) { let x = Math.round(x1), y = Math.round(y1); const targetX = Math.round(x2), targetY = Math.round(y2), stepX = x < targetX ? 1 : -1, stepY = y < targetY ? 1 : -1, deltaX = Math.abs(targetX - x), deltaY = -Math.abs(targetY - y); let error = deltaX + deltaY; context.fillStyle = color; while (true) { context.fillRect(x, y, 1, 1); if (x === targetX && y === targetY) break; const doubled = error * 2; if (doubled >= deltaY) { error += deltaY; x += stepX; } if (doubled <= deltaX) { error += deltaX; y += stepY; } } }
  function bar(x, y, barWidth, level, active) { context.strokeStyle = COLORS.outline; context.strokeRect(x + .5, y + .5, barWidth, 6); if (active) { context.fillStyle = COLORS.fill; context.fillRect(x + 2, y + 2, Math.floor((barWidth - 3) * level), 3); } }
  function sequenceFor(elapsed) { const boundedElapsed = clamp(elapsed / BOOT_DURATION) * BOOT_DURATION; let cursor = 0; for (let index = 0; index < BOOT_STAGES.length; index += 1) { const stage = BOOT_STAGES[index]; if (boundedElapsed < cursor + stage.duration || index === BOOT_STAGES.length - 1) return { ...stage, index, elapsed: boundedElapsed, local: clamp((boundedElapsed - cursor) / stage.duration) }; cursor += stage.duration; } }
  function systemLoadState(sequence) { const progress = sequence.name === 'systems' ? sequence.local : sequence.name === 'ready' ? 1 : 0; return { progress, loads: SYSTEM_LOADS.map((system, index) => ({ ...system, phase: clamp(progress * SYSTEM_LOADS.length - index) })) }; }
  function subsystemFocus(sequence) { if (sequence.name !== 'systems') return null; const { progress, loads } = systemLoadState(sequence), raw = progress * loads.length, index = Math.min(loads.length - 1, Math.floor(raw)); return { index, current: loads[index], previous: index ? loads[index - 1] : null, blend: clamp(raw - index) }; }
  function setCameraShot(shot, aim, position) { if (!shot) { aim.set(0, 0, 0); position.set(0, .15, 9); return; } aim.set(...shot.point); root.localToWorld(aim); position.copy(aim); position.y += .1; position.z += shot.distance; }
  function updateThree(sequence) {
    const signalProgress = sequence.index > 1 ? 1 : sequence.name === 'signal' ? sequence.local : 0; staticStars.forEach(field => { field.material.opacity = sequence.name === 'void' ? .16 : .68; });
    driftingStars.forEach(layer => { layer.material.opacity = signalProgress * .9; for (let index = 0; index < layer.seeds.length / 3; index += 1) { const position = index * 3, speed = .55 + layer.seeds[position + 2] * .95, travel = (sequence.elapsed * speed + layer.seeds[position + 2] * 19) % 19; layer.positions[position] = (layer.seeds[position] - .5) * 13; layer.positions[position + 1] = (layer.seeds[position + 1] - .5) * 8; layer.positions[position + 2] = -12 + travel; } layer.attribute.needsUpdate = true; });
    for (let index = 0; index < twinklePhases.length; index += 1) { const intensity = (.14 + Math.max(0, Math.sin(sequence.elapsed * 2.1 + twinklePhases[index]) - .77) * 3.75) * signalProgress, color = twinkleBaseColors[index % twinkleBaseColors.length], position = index * 3; twinkleColors[position] = color.r * intensity; twinkleColors[position + 1] = color.g * intensity; twinkleColors[position + 2] = color.b * intensity; } twinkleAttribute.needsUpdate = true;
    const acquisition = sequence.index > 2 ? 1 : sequence.name === 'acquire' ? clamp(sequence.local * 1.35) : 0, eased = acquisition * acquisition * (3 - 2 * acquisition); shipMaterial.opacity = eased; root.visible = acquisition > 0; root.scale.setScalar(.45 + eased * .37); root.rotation.y = sequence.elapsed * .65 * eased; root.rotation.x = Math.sin(sequence.elapsed * .8) * .08 * eased; root.position.y = Math.sin(sequence.elapsed * 1.5) * .12 - .2 + (1 - eased) * .7;
    root.updateMatrixWorld(true); const focus = subsystemFocus(sequence); if (sequence.name === 'ready') { setCameraShot(SYSTEM_LOADS.at(-1), cameraFromAim, cameraFromPosition); setCameraShot(null, cameraToAim, cameraToPosition); const blend = clamp(sequence.local / .28) ** 2 * (3 - 2 * clamp(sequence.local / .28)); cameraAim.copy(cameraFromAim).lerp(cameraToAim, blend); cameraPosition.copy(cameraFromPosition).lerp(cameraToPosition, blend); } else if (!focus) setCameraShot(null, cameraAim, cameraPosition); else { setCameraShot(focus.previous, cameraFromAim, cameraFromPosition); setCameraShot(focus.current, cameraToAim, cameraToPosition); const transition = clamp(focus.blend * 8), blend = transition * transition * (3 - 2 * transition); cameraAim.copy(cameraFromAim).lerp(cameraToAim, blend); cameraPosition.copy(cameraFromPosition).lerp(cameraToPosition, blend); } camera.position.copy(cameraPosition); camera.lookAt(cameraAim);
    renderer.setScissorTest(false); renderer.clear(); renderer.render(scene, backgroundCamera); renderer.clearDepth(); renderer.setScissor(SHIP_CONTENT_VIEWPORT.x, H - SHIP_CONTENT_VIEWPORT.y - SHIP_CONTENT_VIEWPORT.height, SHIP_CONTENT_VIEWPORT.width, SHIP_CONTENT_VIEWPORT.height); renderer.setScissorTest(true); renderer.render(shipScene, camera); renderer.setScissorTest(false);
  }
  function drawFocusOverlay(sequence) { const focus = subsystemFocus(sequence); if (!focus || focus.blend < .125) return; context.save(); context.beginPath(); context.rect(SHIP_CONTENT_VIEWPORT.x, SHIP_CONTENT_VIEWPORT.y, SHIP_CONTENT_VIEWPORT.width, SHIP_CONTENT_VIEWPORT.height); context.clip(); const point = root.localToWorld(new THREE.Vector3(...focus.current.point)).project(camera), highlightX = Math.round((point.x * .5 + .5) * W), highlightY = Math.round((-point.y * .5 + .5) * H); if (focus.blend >= .225 || Math.floor(sequence.elapsed * 10) % 2) { context.globalAlpha = .55; context.fillStyle = COLORS.fill; for (let angle = 0; angle < 360; angle += 20) { const radians = angle * Math.PI / 180; context.fillRect(Math.round(highlightX + Math.cos(radians) * focus.current.radius), Math.round(highlightY + Math.sin(radians) * focus.current.radius), 1, 1); } } if (focus.blend < .225) { context.restore(); return; } const [blockX, blockY] = focus.current.callout, header = `${focus.current.label}/SYS`, lineEndX = focus.current.calloutSide === 'right' ? blockX + technicalMeasure(header) + 2 : blockX - 2, lineEndY = blockY + 3, distance = Math.max(1, Math.hypot(lineEndX - highlightX, lineEndY - highlightY)), startX = focus.current.lineOrigin === 'lowerLeft' ? Math.round(highlightX - focus.current.radius * .7) : Math.round(highlightX + (lineEndX - highlightX) / distance * focus.current.radius), startY = focus.current.lineOrigin === 'lowerLeft' ? Math.round(highlightY + focus.current.radius * .7) : Math.round(highlightY + (lineEndY - highlightY) / distance * focus.current.radius); context.globalAlpha = 1; pixelLine(startX, startY, lineEndX, lineEndY, COLORS.status); const typing = clamp((focus.blend - .225) / .3), payload = `#${String((focus.index + 1) * 39).padStart(2, '0')}/${String((focus.index + 1) * 17).padStart(2, '0')}`; technicalText(header.slice(0, Math.ceil(header.length * typing)), blockX, blockY, COLORS.callout); technicalText(payload.slice(0, Math.ceil(payload.length * typing)), blockX, blockY + 6, COLORS.primary); context.restore(); }
  function quantizeLogo(time) { if (!logoPixels || !logoSource) return; const logoContext = logoPixels.getContext('2d'); logoContext.clearRect(0, 0, logoPixels.width, logoPixels.height); logoContext.drawImage(logoSource, 0, 0); const image = logoContext.getImageData(0, 0, logoPixels.width, logoPixels.height), phase = Math.floor(time * 4) % LOGO_REFLECTION_LEVELS.length, base = [72, 72, 208], reflection = LOGO_REFLECTION_LEVELS.map(level => base.map(channel => level <= 1 ? Math.round(channel * level) : Math.round(channel + (255 - channel) * (level - 1)))); for (let index = 0; index < image.data.length; index += 4) { if (!image.data[index + 3]) continue; const pixel = index / 4, x = pixel % logoPixels.width, band = LOGO_COLOR_BANDS[`${image.data[index]},${image.data[index + 1]},${image.data[index + 2]}`] ?? 3, color = x >= 55 && x <= 63 ? reflection[3] : band === 0 ? [2, 2, 8] : reflection[(band - 1 + phase) % reflection.length]; image.data[index] = color[0]; image.data[index + 1] = color[1]; image.data[index + 2] = color[2]; } logoContext.putImageData(image, 0, 0); }
  function drawOverlay(sequence) {
    context.clearRect(0, 0, width, height); context.drawImage(renderer.domElement, 0, 0, width, height);
    if (!fontData || sequence.name === 'void') return;
    const signalProgress = sequence.name === 'signal' ? sequence.local : 1;
    context.save(); context.scale(SCALE, SCALE); context.globalAlpha = signalProgress;
    const { loads } = systemLoadState(sequence), complete = loads.at(-1).phase >= 1;
    text(complete ? 'ALL SYSTEMS GO' : 'SYSTEMS CHECK', W / 2, 25, complete ? COLORS.callout : COLORS.secondary, 1, 'center');
    if (logoPixels) { quantizeLogo(sequence.elapsed); context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.drawImage(logoPixels, 14, 24, 512, 36); context.restore(); }
    if (sequence.name === 'signal') { context.restore(); return; }
    const acquireProgress = sequence.name === 'acquire' ? sequence.local : 1; context.globalAlpha = acquireProgress;
    tiledBorder(SHIP_VIEWPORT); text('GK-99', 13, 51, COLORS.status); text('"WARDEN"', 13, 61, COLORS.primary); text('ROM', 136, 159, COLORS.secondary); text(complete ? 'PASS' : 'CHK', 156, 159, COLORS.secondary, 1, 'right');
    if (sequence.name === 'acquire') { context.restore(); return; }
    context.globalAlpha = 1;
    const aggregate = loads.reduce((total, item) => total + item.phase, 0) / loads.length, rows = [['SYS', aggregate, `${String(Math.round(aggregate * 100)).padStart(3, '0')}%`], ...loads.map(item => [item.label, item.phase, item.phase >= 1 ? 'OK' : item.phase > 0 ? 'CHK' : 'IDLE'])];
    rows.forEach(([label, phase, status], index) => { const y = 178 + index * 8, active = index === 0 || phase > 0; text(label, 14, y, index === 0 ? COLORS.status : active ? COLORS.primary : COLORS.dim); text(status, 55, y, active ? COLORS.secondary : COLORS.dim); bar(89, y + 1, 77, phase, active); });
    drawFocusOverlay(sequence); context.restore();
  }
  const ready = Promise.all([fetch('./assets/font-data-h/330.h').then(response => { if (!response.ok) throw new Error('Could not load Reactor.'); return response.text(); }), fetch('./assets/font-data-h/031.h').then(response => { if (!response.ok) throw new Error('Could not load Bitty.'); return response.text(); }), fetch('./assets/glyphs/legacy-glyphs.json').then(response => { if (!response.ok) throw new Error('Could not load ATASCII glyphs.'); return response.json(); })]).then(([reactor, bitty, glyphSource]) => { fontData = new Uint8Array(128 * 8); fontData.set(parseHeaderFont(reactor)); technicalFontData = parseHeaderFont(bitty); glyphSource.glyphs.forEach(glyph => { if (glyph.system === 'ATASCII' && glyph.internalSlot) fontData.set(glyph.bitmap, Number.parseInt(glyph.internalSlot, 16) * 8); }); glyphCache.clear(); });
  const logo = new Image(); logo.onload = () => { logoSource = document.createElement('canvas'); logoSource.width = logo.naturalWidth; logoSource.height = logo.naturalHeight; logoSource.getContext('2d').drawImage(logo, 0, 0); logoPixels = document.createElement('canvas'); logoPixels.width = logo.naturalWidth; logoPixels.height = logo.naturalHeight; }; logo.src = './assets/images/gklogo.png';
  const ship = new Image(); ship.onload = () => createShipGeometry(ship); ship.src = './assets/images/ship.png';
  return { canvas, ready, render: ({ elapsed }) => { const sequence = sequenceFor(elapsed); updateThree(sequence); drawOverlay(sequence); } };
}
