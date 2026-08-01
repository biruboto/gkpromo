import { createWireframeCabinet } from './cabinet-wireframe.js?v=26';

const INTERNAL_W = 180, INTERNAL_H = 225, PREVIEW_W = 540, PREVIEW_H = 675;
const sources = {
  asteroids: { label: 'Asteroids upright', url: './models/asteroids.3ds', excludeMeshes: ['Mesh09'], removeDanglers: true },
  ironman: { label: 'Iron Man pinball', url: './models/ironman.3ds' },
  neogeo: { label: 'Neo Geo arcade cabinet', url: './models/neo-geo_arcade_cabinet.glb', format: 'glb', targetVertices: 500 },
  pacman: { label: 'Pac-Man arcade cabinet', url: './models/pac-man_arcade_cabinet.glb', format: 'glb', targetVertices: 500 },
};
const controls = Object.fromEntries(['cabinet', 'model', 'rotationSpeed', 'rotationSpeedOutput', 'yaw', 'yawOutput', 'pitch', 'pitchOutput', 'autoRotate', 'flyby', 'zoom', 'zoomOutput', 'cameraPitch', 'cameraPitchOutput', 'cameraOrbit', 'cameraOrbitOutput', 'opacity', 'opacityOutput', 'lineColor', 'reset', 'status'].map(id => [id, document.querySelector(`#${id}`)]));
const model = createWireframeCabinet({ width: INTERNAL_W, height: INTERNAL_H });
const previewContext = controls.cabinet.getContext('2d'); previewContext.imageSmoothingEnabled = false;
let yaw = Number(controls.yaw.value), lastFrame = performance.now(), flybyTime = 0;
function syncOutputs({ cameraOrbit, cameraPitch, zoom } = {}) { controls.rotationSpeedOutput.textContent = `${controls.rotationSpeed.value} deg/s`; controls.yawOutput.textContent = `${Math.round(yaw)} deg`; controls.pitchOutput.textContent = `${controls.pitch.value} deg`; controls.zoomOutput.textContent = `${Math.round(zoom ?? Number(controls.zoom.value))}%`; controls.cameraPitchOutput.textContent = `${Math.round(cameraPitch ?? Number(controls.cameraPitch.value))} deg`; controls.cameraOrbitOutput.textContent = `${Math.round(cameraOrbit ?? Number(controls.cameraOrbit.value))} deg`; controls.opacityOutput.textContent = `${controls.opacity.value}%`; controls.yaw.value = String(Math.round(yaw)); }
function reset() { controls.rotationSpeed.value = '30'; yaw = -35; controls.pitch.value = '0'; controls.autoRotate.checked = true; controls.flyby.checked = false; flybyTime = 0; controls.zoom.value = '100'; controls.cameraPitch.value = '0'; controls.cameraOrbit.value = '0'; controls.opacity.value = '72'; controls.lineColor.value = '#00ddff'; syncOutputs(); }
let modelLoadId = 0;
async function loadSelectedModel() {
  const source = sources[controls.model.value]; const loadId = ++modelLoadId;
  controls.status.textContent = `Loading ${source.label} mesh...`;
  try {
    if (source.neutralView) { yaw = 0; controls.autoRotate.checked = false; controls.cameraPitch.value = '-19'; controls.cameraOrbit.value = '30'; controls.zoom.value = '100'; syncOutputs(); }
    const applied = source.format === 'fbx' ? await model.loadFbxSource(source.url, source) : source.format === 'glb' ? await model.loadGlbSource(source.url, source) : await model.loadSource(source.url, source);
    if (loadId !== modelLoadId || !applied) return;
    controls.status.textContent = `${source.label} mesh ready. Use the controls to tune its presentation.`;
  } catch (error) {
    if (loadId === modelLoadId) controls.status.textContent = `Could not load ${source.label}: ${error.message}`;
  }
}
function frame(now) {
  const delta = Math.min(.1, (now - lastFrame) / 1000); lastFrame = now;
  if (controls.autoRotate.checked) yaw = ((yaw + Number(controls.rotationSpeed.value) * delta + 180) % 360) - 180;
  let cameraOrbit = Number(controls.cameraOrbit.value); let cameraPitch = Number(controls.cameraPitch.value); let zoom = Number(controls.zoom.value);
  if (controls.flyby.checked) {
    flybyTime += delta;
    cameraOrbit += Math.sin(flybyTime * 0.22) * 75;
    cameraPitch += Math.cos(flybyTime * 0.15) * 28;
    zoom = Math.max(45, Math.min(450, zoom * (1 + Math.sin(flybyTime * 0.35) * 0.30)));
  } else { flybyTime = 0; }
  syncOutputs({ cameraOrbit, cameraPitch, zoom });
  if (model) { const canvas = model.render({ color: controls.lineColor.value, opacity: Number(controls.opacity.value) / 100, yaw: yaw * Math.PI / 180, pitch: Number(controls.pitch.value) * Math.PI / 180, zoom: zoom / 100, cameraPitch: cameraPitch * Math.PI / 180, cameraOrbit: cameraOrbit * Math.PI / 180, projection: 'perspective', wobble: false }); previewContext.clearRect(0, 0, PREVIEW_W, PREVIEW_H); previewContext.drawImage(canvas, 0, 0, PREVIEW_W, PREVIEW_H); }
  requestAnimationFrame(frame);
}
controls.yaw.addEventListener('input', () => { yaw = Number(controls.yaw.value); syncOutputs(); }); controls.reset.addEventListener('click', reset); controls.model.addEventListener('change', loadSelectedModel);
if (!model) controls.status.textContent = 'WebGL is unavailable in this browser.'; else {
  requestAnimationFrame(frame); loadSelectedModel();
}
