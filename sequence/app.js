import { createCrtPipeline, CRT_CONTROL_IDS, CRT_LOOKS } from '../promo/crt.js?v=228';
import { createWireframeCabinet } from './cabinet-wireframe.js?v=29';
import { createBootStage } from './boot-stage.js?v=10';
import { createHudStage } from './hud-stage.js?v=29';

const W = 540, H = 675, EXPORT_W = 1080, EXPORT_H = 1350;
const FONT_FILE = './assets/font-data-h/165.h';
const controls = Object.fromEntries(['preview', 'stageList', 'addStage', 'stageName', 'stageDuration', 'stageMotion', 'stageBackdrop', 'moveUp', 'moveDown', 'duplicateStage', 'deleteStage', 'stageHeadline', 'stageBody', 'stageFooter', 'stageAccent', 'stageAccentText', 'crtLook', 'crt', 'crtCurve', 'crtRgb', 'crtScanline', 'crtMask', 'crtVignette', 'crtDrift', 'crtBloom', 'crtGlow', 'scrubber', 'restart', 'playPause', 'sequenceDuration', 'stageReadout', 'timeReadout', 'png', 'record', 'status'].map(id => [id, document.querySelector(`#${id}`)]));
const previewContext = controls.preview.getContext('2d'); previewContext.imageSmoothingEnabled = false;
const sourceCanvas = document.createElement('canvas'); sourceCanvas.width = W; sourceCanvas.height = H;
const sourceContext = sourceCanvas.getContext('2d'); sourceContext.imageSmoothingEnabled = false;
const crtCanvas = document.createElement('canvas'); crtCanvas.width = EXPORT_W; crtCanvas.height = EXPORT_H;
const exportCanvas = document.createElement('canvas'); exportCanvas.width = EXPORT_W; exportCanvas.height = EXPORT_H;
const exportContext = exportCanvas.getContext('2d'); exportContext.imageSmoothingEnabled = false;
const MP4_MIME_TYPES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4'];
const stages = [
  { id: crypto.randomUUID(), name: 'BOOT SEQUENCE', duration: 14, motion: 'signal', backdrop: 'boot', headline: 'GK OS v.1.59', body: 'MEMCHK', footer: 'INTRFC INTLZ', accent: '#00ddff' },
  { id: crypto.randomUUID(), name: 'SYSTEM HUD', duration: 44.4, motion: 'signal', backdrop: 'hud', headline: 'ALL SYSTEMS\nGO', body: 'GK-99 // WARDEN\nARCADE NETWORK ONLINE', footer: 'GROUND KONTROL // PORTLAND', accent: '#00ddff' }
];
const stars = Array.from({ length: 96 }, (_, index) => ({ x: (Math.sin(index * 91.71) * .5 + .5) * W, y: (Math.sin(index * 47.13 + 1) * .5 + .5) * H, depth: .2 + (Math.sin(index * 17.39 + 2) * .5 + .5) }));
let selectedId = stages[0].id, bitmapFont = null, sequenceTime = 0, lastFrame = performance.now(), playing = true, recording = false;
const crtPipeline = createCrtPipeline({ sourceCanvas, outputCanvas: crtCanvas, sourceWidth: W, sourceHeight: H, outputWidth: EXPORT_W, outputHeight: EXPORT_H, getTreatment: () => controls.crt.value, getSetting: name => Number(controls[CRT_CONTROL_IDS[name]].value) / 100, getTime: () => sequenceTime });
const cabinetRenderer = createCabinetRenderer();
const hudStage = createHudStage({ width: W, height: H });
const bootStage = createBootStage({ width: W, height: H, getFont: () => bitmapFont, backgroundCanvas: hudStage.canvas });

function createCabinetRenderer() {
  return createWireframeCabinet({ width: W, height: H });
}
function clamp(value) { return Math.max(0, Math.min(1, value)); }
function easeOut(value) { return 1 - Math.pow(1 - clamp(value), 3); }
function drawCabinet(stage, state) {
  if (!cabinetRenderer) return;
  cabinetRenderer.render({ color: stage.accent, opacity: .28 + easeOut(state.progress * 3) * .48, elapsed: state.elapsed });
  sourceContext.drawImage(cabinetRenderer.canvas, 0, 0, W, H);
}
function selectedStage() { return stages.find(stage => stage.id === selectedId) || stages[0]; }
function totalDuration() { return stages.reduce((total, stage) => total + stage.duration, 0); }
function stageStartTime(id) {
  let start = 0;
  for (const stage of stages) { if (stage.id === id) return start; start += stage.duration; }
  return 0;
}
function stageState(time) {
  const duration = totalDuration(); let cursor = 0; const elapsed = duration ? ((time % duration) + duration) % duration : 0;
  for (let index = 0; index < stages.length; index++) {
    const stage = stages[index];
    if (elapsed < cursor + stage.duration || index === stages.length - 1) return { stage, index, elapsed, localTime: elapsed - cursor, progress: clamp((elapsed - cursor) / stage.duration), total: duration };
    cursor += stage.duration;
  }
}
function parseFont(source) {
  const values = source.match(/0x[0-9a-f]{2}/ig) || [];
  if (values.length < 768) throw new Error('Gemini font data is incomplete.');
  return Uint8Array.from(values.slice(0, 768), value => Number.parseInt(value.slice(2), 16));
}
async function loadFont(file, label) { const response = await fetch(file); if (!response.ok) throw new Error(`${label} font request returned ${response.status}`); return parseFont(await response.text()); }
function glyphIndex(character) { const code = character.codePointAt(0); return code >= 0x20 && code <= 0x7e ? code - 0x20 : 0; }
function bitmapLine(text, x, y, scale, color, align = 'left', reveal = text.length) {
  const visible = [...text].slice(0, reveal); const width = Math.max(0, visible.length * 9 - 1) * scale;
  let cursor = align === 'center' ? Math.round(x - width / 2) : align === 'right' ? x - width : x;
  sourceContext.fillStyle = color;
  visible.forEach(character => {
    const index = glyphIndex(character);
    for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) if ((bitmapFont[index * 8 + row] || 0) & (128 >> column)) sourceContext.fillRect(cursor + column * scale, y + row * scale, scale, scale);
    cursor += 9 * scale;
  });
}
function wrapLines(text, maxCharacters) {
  return text.split('\n').flatMap(paragraph => {
    const words = paragraph.split(/\s+/).filter(Boolean); const lines = []; let line = '';
    words.forEach(word => { const next = line ? `${line} ${word}` : word; if (next.length > maxCharacters && line) { lines.push(line); line = word; } else line = next; });
    if (line) lines.push(line); return lines.length ? lines : [''];
  });
}
function bitmapBlock(text, x, y, scale, color, options = {}) {
  const { align = 'left', maxCharacters = 20, reveal = Infinity, lineGap = 3 } = options;
  let remaining = reveal; const lines = wrapLines(text, maxCharacters);
  lines.forEach((line, index) => { const count = Math.max(0, Math.min(line.length, remaining)); bitmapLine(line, x, y + index * (8 + lineGap) * scale, scale, color, align, count); remaining -= line.length; });
  return lines.length * (8 + lineGap) * scale;
}
function drawBackdrop(stage, state) {
  const { progress, elapsed } = state; const accent = stage.accent;
  sourceContext.fillStyle = '#050914'; sourceContext.fillRect(0, 0, W, H);
  stars.forEach((star, index) => {
    const speed = 16 + star.depth * 44; const y = (star.y + elapsed * speed) % H; const size = star.depth > .74 ? 2 : 1;
    sourceContext.globalAlpha = .22 + star.depth * .52; sourceContext.fillStyle = index % 5 ? '#b5d7f5' : accent; sourceContext.fillRect(Math.round(star.x), Math.round(y), size, size);
  });
  sourceContext.globalAlpha = 1;
  if (stage.backdrop === 'grid') {
    sourceContext.strokeStyle = `${accent}55`; sourceContext.lineWidth = 1;
    for (let x = -W; x < W * 2; x += 36) { sourceContext.beginPath(); sourceContext.moveTo(W / 2, 430); sourceContext.lineTo(x, H); sourceContext.stroke(); }
    for (let y = 450; y < H; y += 28) { sourceContext.beginPath(); sourceContext.moveTo(0, y); sourceContext.lineTo(W, y); sourceContext.stroke(); }
  }
  if (stage.backdrop === 'scan') {
    sourceContext.fillStyle = `${accent}18`; sourceContext.fillRect(0, Math.round((elapsed * 90) % H), W, 3);
    sourceContext.strokeStyle = `${accent}66`; sourceContext.strokeRect(30, 92, W - 60, H - 184);
    for (let y = 104; y < H - 92; y += 16) { sourceContext.fillStyle = '#ffffff0a'; sourceContext.fillRect(31, y, W - 62, 1); }
  }
  if (stage.backdrop === 'cabinet') drawCabinet(stage, state);
  const lock = easeOut(progress * 4); sourceContext.strokeStyle = `${accent}${Math.round(lock * 180).toString(16).padStart(2, '0')}`; sourceContext.strokeRect(14, 14, W - 28, H - 28);
}
function drawStage(stage, state) {
  if (!bitmapFont) return;
  if (stage.backdrop === 'boot') {
    const transitionProgress = bootStage.transitionProgress(state.localTime);
    if (transitionProgress) hudStage.renderTransition({ elapsed: sequenceTime, progress: transitionProgress }); else hudStage.renderBackground(sequenceTime);
    bootStage.render({ elapsed: state.localTime, duration: stage.duration, transitionProgress }); sourceContext.drawImage(bootStage.canvas, 0, 0); return;
  }
  if (stage.backdrop === 'hud') { hudStage.render({ elapsed: state.localTime + hudStage.handoffElapsed, duration: stage.duration, starElapsed: sequenceTime }); sourceContext.drawImage(hudStage.canvas, 0, 0); return; }
  const { progress, index, total } = state; const accent = stage.accent; drawBackdrop(stage, state);
  const motionProgress = easeOut(progress * 3.2); let alpha = 1, offsetX = 0, offsetY = 0, headlineReveal = Infinity;
  if (stage.motion === 'signal') { alpha = clamp(progress * 5); offsetX = Math.round((1 - motionProgress) * -80); sourceContext.fillStyle = `${accent}44`; sourceContext.fillRect(24, Math.round(progress * H), W - 48, 3); }
  if (stage.motion === 'assemble') { alpha = clamp(progress * 4); offsetY = Math.round((1 - motionProgress) * 46); }
  if (stage.motion === 'type') { alpha = clamp(progress * 4); headlineReveal = Math.ceil(stage.headline.length * clamp(progress * 2.2)); }
  if (stage.motion === 'alert') { alpha = clamp(progress * 6); const jitter = progress < .32 ? Math.round(Math.sin(progress * 170) * 7) : 0; offsetX = jitter; offsetY = -jitter; sourceContext.fillStyle = `${accent}22`; sourceContext.fillRect(0, Math.round(progress * 28) * 12, W, 2); }
  sourceContext.save(); sourceContext.globalAlpha = alpha;
  bitmapLine('GK // SEQUENCE', 34, 42, 1, accent); bitmapLine(`${String(index + 1).padStart(2, '0')} / ${String(stages.length).padStart(2, '0')}`, W - 34, 42, 1, '#a8bfd8', 'right');
  sourceContext.fillStyle = `${accent}88`; sourceContext.fillRect(34, 62, W - 68, 2);
  const headlineY = 168 + offsetY; bitmapBlock(stage.headline, W / 2 + offsetX, headlineY, 4, '#f1f8ff', { align: 'center', maxCharacters: 13, reveal: headlineReveal, lineGap: 4 });
  bitmapBlock(stage.body, W / 2 + offsetX, 366 + offsetY, 2, '#b5c9de', { align: 'center', maxCharacters: 29, lineGap: 4 });
  sourceContext.fillStyle = accent; sourceContext.fillRect(72, 536, W - 144, 2); bitmapBlock(stage.footer, W / 2, 560, 1, accent, { align: 'center', maxCharacters: 46 });
  const meterWidth = W - 68; sourceContext.strokeStyle = '#7d91aa'; sourceContext.strokeRect(34, 626, meterWidth, 8); sourceContext.fillStyle = accent; sourceContext.fillRect(36, 628, Math.round((meterWidth - 4) * progress), 4);
  bitmapLine(`SEQUENCE ${total.toFixed(1)} SEC`, 34, 646, 1, '#7d91aa'); bitmapLine(stage.name.toUpperCase(), W - 34, 646, 1, '#7d91aa', 'right'); sourceContext.restore();
}
function render() {
  sourceContext.globalCompositeOperation = 'source-over'; sourceContext.globalAlpha = 1; sourceContext.clearRect(0, 0, W, H);
  const state = stageState(sequenceTime); drawStage(state.stage, state);
  const processedCanvas = crtPipeline.render(); exportContext.clearRect(0, 0, EXPORT_W, EXPORT_H); exportContext.drawImage(processedCanvas, 0, 0, EXPORT_W, EXPORT_H);
  previewContext.clearRect(0, 0, W, H); previewContext.drawImage(exportCanvas, 0, 0, W, H);
  controls.scrubber.max = String(state.total); controls.scrubber.value = String(sequenceTime % state.total); controls.sequenceDuration.textContent = `${state.total.toFixed(1)} SEC`;
  controls.stageReadout.textContent = `STAGE ${String(state.index + 1).padStart(2, '0')} // ${state.stage.name.toUpperCase()}`; controls.timeReadout.textContent = `${state.elapsed.toFixed(1)} / ${state.total.toFixed(1)}`;
}
function frame(now) { const delta = Math.min(.1, (now - lastFrame) / 1000); lastFrame = now; if (playing) sequenceTime = (sequenceTime + delta) % totalDuration(); render(); requestAnimationFrame(frame); }
function syncCrtControls() { Object.entries(CRT_CONTROL_IDS).forEach(([name, controlName]) => { document.querySelector(`[data-crt-output="${name}"]`).textContent = `${controls[controlName].value}%`; }); }
function applyCrtLook(name) { const look = CRT_LOOKS[name]; if (!look) return; controls.crt.value = look.treatment; Object.entries(look.controls).forEach(([controlName, value]) => { controls[CRT_CONTROL_IDS[controlName]].value = value; }); syncCrtControls(); }
function renderStageList() {
  controls.stageList.replaceChildren(...stages.map((stage, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = `stage-row${stage.id === selectedId ? ' is-selected' : ''}`; button.dataset.stageId = stage.id;
    const number = document.createElement('span'); number.className = 'stage-number'; number.textContent = String(index + 1).padStart(2, '0');
    const copy = document.createElement('span'); const name = document.createElement('strong'); const detail = document.createElement('span'); name.textContent = stage.name || 'UNTITLED'; detail.textContent = `${stage.motion.replace('-', ' ')} / ${stage.duration.toFixed(1)}s`; copy.append(name, detail);
    const backdrop = document.createElement('span'); backdrop.textContent = stage.backdrop; button.append(number, copy, backdrop);
    button.addEventListener('click', () => { selectedId = stage.id; sequenceTime = stageStartTime(stage.id); syncEditor(); renderStageList(); }); return button;
  }));
}
function syncEditor() {
  const stage = selectedStage(); controls.stageName.value = stage.name; controls.stageDuration.value = stage.duration; controls.stageMotion.value = stage.motion; controls.stageBackdrop.value = stage.backdrop;
  controls.stageHeadline.value = stage.headline; controls.stageBody.value = stage.body; controls.stageFooter.value = stage.footer; controls.stageAccent.value = stage.accent; controls.stageAccentText.value = stage.accent;
  const index = stages.indexOf(stage); controls.moveUp.disabled = index === 0; controls.moveDown.disabled = index === stages.length - 1; controls.deleteStage.disabled = stages.length === 1;
}
function updateSelected(field, value) { selectedStage()[field] = value; renderStageList(); }
function normalizedColor(value) { return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null; }
function addStage(stage = null) { const next = stage || { id: crypto.randomUUID(), name: 'NEW STAGE', duration: 2, motion: 'assemble', backdrop: 'deep-space', headline: 'NEW\nMESSAGE', body: 'EDIT THIS STAGE TO BUILD\nTHE NEXT SEQUENCE BEAT.', footer: 'SEQUENCE EDIT', accent: '#00ddff' }; if (!stage) stages.push(next); else stages.splice(stages.indexOf(selectedStage()) + 1, 0, next); selectedId = next.id; syncEditor(); renderStageList(); }
function download(blob, name) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

['stageName', 'stageMotion', 'stageBackdrop', 'stageHeadline', 'stageBody', 'stageFooter'].forEach(controlName => controls[controlName].addEventListener('input', () => updateSelected({ stageName: 'name', stageMotion: 'motion', stageBackdrop: 'backdrop', stageHeadline: 'headline', stageBody: 'body', stageFooter: 'footer' }[controlName], controls[controlName].value)));
controls.stageDuration.addEventListener('input', () => { const duration = Number(controls.stageDuration.value); if (Number.isFinite(duration)) updateSelected('duration', Math.max(.4, Math.min(90, duration))); });
controls.stageAccent.addEventListener('input', () => { updateSelected('accent', controls.stageAccent.value); controls.stageAccentText.value = controls.stageAccent.value; });
controls.stageAccentText.addEventListener('change', () => { const color = normalizedColor(controls.stageAccentText.value); if (!color) { controls.stageAccentText.value = selectedStage().accent; return; } updateSelected('accent', color); controls.stageAccent.value = color; controls.stageAccentText.value = color; });
controls.addStage.addEventListener('click', () => addStage());
controls.duplicateStage.addEventListener('click', () => { const source = selectedStage(); addStage({ ...source, id: crypto.randomUUID(), name: `${source.name} COPY` }); });
controls.deleteStage.addEventListener('click', () => { const index = stages.indexOf(selectedStage()); stages.splice(index, 1); selectedId = stages[Math.max(0, index - 1)].id; syncEditor(); renderStageList(); });
controls.moveUp.addEventListener('click', () => { const index = stages.indexOf(selectedStage()); if (!index) return; [stages[index - 1], stages[index]] = [stages[index], stages[index - 1]]; renderStageList(); syncEditor(); });
controls.moveDown.addEventListener('click', () => { const index = stages.indexOf(selectedStage()); if (index === stages.length - 1) return; [stages[index + 1], stages[index]] = [stages[index], stages[index + 1]]; renderStageList(); syncEditor(); });
controls.restart.addEventListener('click', () => { sequenceTime = 0; });
controls.playPause.addEventListener('click', () => { playing = !playing; controls.playPause.textContent = playing ? '||' : '>'; controls.playPause.title = playing ? 'Pause sequence' : 'Play sequence'; controls.playPause.setAttribute('aria-label', controls.playPause.title); });
controls.scrubber.addEventListener('input', () => { playing = false; controls.playPause.textContent = '>'; sequenceTime = Number(controls.scrubber.value); });
controls.crtLook.addEventListener('change', () => applyCrtLook(controls.crtLook.value)); controls.crt.addEventListener('change', () => { controls.crtLook.value = 'custom'; }); Object.values(CRT_CONTROL_IDS).forEach(controlName => controls[controlName].addEventListener('input', () => { controls.crtLook.value = 'custom'; syncCrtControls(); }));
controls.png.addEventListener('click', () => exportCanvas.toBlob(blob => { download(blob, 'gk-sequence-1080x1350.png'); controls.status.textContent = 'PNG exported at 1080 x 1350.'; }, 'image/png'));
controls.record.addEventListener('click', () => {
  if (recording || !window.MediaRecorder) return;
  const mimeType = MP4_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) { controls.status.textContent = 'This browser cannot export MP4.'; return; }
  const exportDuration = totalDuration(); const wasPlaying = playing; sequenceTime = 0; playing = true;
  const stream = exportCanvas.captureStream(30); const chunks = []; let recorder;
  try { recorder = new MediaRecorder(stream, { mimeType }); } catch (error) { playing = wasPlaying; controls.status.textContent = `Could not start MP4 recording: ${error.message}`; return; }
  recording = true; controls.record.textContent = 'RECORDING FULL SEQUENCE...'; controls.status.textContent = `Recording full sequence (${exportDuration.toFixed(1)} seconds).`;
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  recorder.onstop = () => { download(new Blob(chunks, { type: recorder.mimeType || mimeType }), 'gk-sequence-1080x1350.mp4'); stream.getTracks().forEach(track => track.stop()); recording = false; playing = wasPlaying; controls.record.textContent = 'EXPORT FULL SEQUENCE MP4'; };
  recorder.start(); setTimeout(() => recorder.stop(), exportDuration * 1000);
});

applyCrtLook('arcade'); syncEditor(); renderStageList();
if (cabinetRenderer) cabinetRenderer.loadSource('./models/asteroids.3ds', { excludeMeshes: ['Mesh09'], removeDanglers: true }).then(() => { controls.status.textContent = 'Imported cabinet mesh loaded for wireframe stages.'; }).catch(error => { console.warn('Using procedural cabinet:', error); });
hudStage.ready.catch(error => { console.warn('HUD stage assets could not be loaded:', error); });
loadFont(FONT_FILE, 'Gemini').then(font => { bitmapFont = font; if (!controls.status.textContent.startsWith('Imported cabinet')) controls.status.textContent = 'Gemini sequence font loaded.'; requestAnimationFrame(frame); }).catch(error => { controls.status.textContent = `Could not load sequence font: ${error.message}`; });
