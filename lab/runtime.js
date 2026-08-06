import { createCrtPipeline, CRT_CONTROL_IDS, CRT_LOOKS } from '../promo/crt.js';

const MP4_MIME_TYPES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4'];

function formatTime(seconds) {
  return `${seconds.toFixed(1).padStart(4, '0')} SEC`;
}

export function createAnimationRuntime({ preview, stageHost, stageFactory = null, width, height, duration, exportWidth = 1920, exportHeight = 1080, create, controls, downloadName = 'animation-frame.png' }) {
  if (exportWidth % width || exportHeight % height || exportWidth / width !== exportHeight / height) throw new Error('Export dimensions must be an integer multiple of the logical canvas.');
  const previewContext = preview.getContext('2d');
  previewContext.imageSmoothingEnabled = false;
  preview.width = width;
  preview.height = height;
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext('2d');
  sourceContext.imageSmoothingEnabled = false;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;
  const exportContext = exportCanvas.getContext('2d');
  exportContext.imageSmoothingEnabled = false;
  const crtCanvas = document.createElement('canvas');
  crtCanvas.width = exportWidth;
  crtCanvas.height = exportHeight;
  const crtDefaults = { curve: 150, rgb: 50, scanline: 30, mask: 50, vignette: 120, drift: 6, bloom: 120, glow: 90 };
  const stage = stageFactory ? stageFactory({ width, height, host: stageHost }) : null;
  let animation = null;
  let currentTime = 0;
  let playing = true;
  let recording = false;
  let scrubbing = false;
  let frameHandle = null;
  let lastFrame = performance.now();
  const crtPipeline = createCrtPipeline({
    sourceCanvas,
    outputCanvas: crtCanvas,
    sourceWidth: width,
    sourceHeight: height,
    outputWidth: exportWidth,
    outputHeight: exportHeight,
    getTreatment: () => controls.crt?.value || 'strong',
    getSetting: name => Number(controls[CRT_CONTROL_IDS[name]]?.value ?? crtDefaults[name]) / 100,
    getTime: () => currentTime
  });

  function updateReadout() {
    if (controls.time) controls.time.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    if (controls.scrubber && !scrubbing) controls.scrubber.value = String(currentTime);
    if (controls.playPause) controls.playPause.textContent = playing ? 'PAUSE' : 'PLAY';
  }

  function renderAt(time) {
    currentTime = Math.max(0, Math.min(duration, time));
    sourceContext.clearRect(0, 0, width, height);
    if (animation?.update) animation.update(currentTime);
    if (stage) {
      stage.render();
      sourceContext.drawImage(stage.canvas, 0, 0, width, height);
    }
    if (animation?.render) animation.render(sourceContext, currentTime);
    const processed = crtPipeline.render({ outputWidth: exportWidth, outputHeight: exportHeight });
    exportContext.clearRect(0, 0, exportWidth, exportHeight);
    exportContext.drawImage(processed, 0, 0, exportWidth, exportHeight);
    previewContext.clearRect(0, 0, width, height);
    previewContext.drawImage(processed, 0, 0, width, height);
    updateReadout();
  }

  function frame(now) {
    const delta = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    if (playing) renderAt((currentTime + delta) % duration);
    frameHandle = requestAnimationFrame(frame);
  }

  function setPlaying(nextPlaying) {
    playing = nextPlaying;
    lastFrame = performance.now();
    updateReadout();
  }

  function downloadFrame() {
    renderAt(currentTime);
    exportCanvas.toBlob(blob => {
      const link = document.createElement('a');
      link.download = downloadName;
      link.href = URL.createObjectURL(blob);
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 0);
    }, 'image/png');
  }

  async function recordAnimation() {
    if (recording || !window.MediaRecorder) {
      if (!window.MediaRecorder && controls.status) controls.status.textContent = 'MP4 recording is unavailable in this browser.';
      return;
    }
    const mimeType = MP4_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      if (controls.status) controls.status.textContent = 'This browser does not support MP4 recording.';
      return;
    }
    const stream = exportCanvas.captureStream(30);
    const chunks = [];
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch (error) {
      stream.getTracks().forEach(track => track.stop());
      if (controls.status) controls.status.textContent = `Could not start MP4 recording: ${error.message}`;
      return;
    }
    const wasPlaying = playing;
    recording = true;
    setPlaying(false);
    if (controls.record) controls.record.disabled = true;
    if (controls.status) controls.status.textContent = 'Rendering 1920 x 1080 MP4...';
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    const stopped = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start();
    const frameCount = Math.ceil(duration * 30);
    for (let frame = 0; frame <= frameCount; frame += 1) {
      renderAt(frame / 30);
      await new Promise(resolve => setTimeout(resolve, 1000 / 30));
    }
    recorder.stop();
    await stopped;
    stream.getTracks().forEach(track => track.stop());
    const link = document.createElement('a');
    link.download = downloadName.replace(/\.png$/i, '.mp4');
    link.href = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || mimeType }));
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
    recording = false;
    if (controls.record) controls.record.disabled = false;
    if (controls.status) controls.status.textContent = 'MP4 export complete.';
    setPlaying(wasPlaying);
  }

  function applyCrtLook(name) {
    const look = CRT_LOOKS[name];
    if (!look) return;
    if (controls.crt) controls.crt.value = look.treatment;
    Object.entries(look.controls).forEach(([controlName, value]) => {
      const control = controls[CRT_CONTROL_IDS[controlName]];
      if (control) control.value = value;
    });
    renderAt(currentTime);
  }

  controls.crtLook?.addEventListener('change', event => applyCrtLook(event.target.value));
  controls.crt?.addEventListener('change', () => renderAt(currentTime));
  Object.values(CRT_CONTROL_IDS).forEach(controlName => controls[controlName]?.addEventListener('input', () => {
    if (controls.crtLook) controls.crtLook.value = 'custom';
    renderAt(currentTime);
  }));

  controls.scrubber?.addEventListener('pointerdown', () => {
    scrubbing = true;
    setPlaying(false);
  });
  controls.scrubber?.addEventListener('input', event => {
    setPlaying(false);
    renderAt(Number(event.target.value));
  });
  const endScrubbing = () => {
    if (!scrubbing) return;
    scrubbing = false;
    updateReadout();
  };
  controls.scrubber?.addEventListener('pointerup', endScrubbing);
  controls.scrubber?.addEventListener('pointercancel', endScrubbing);
  controls.scrubber?.addEventListener('change', endScrubbing);
  controls.playPause?.addEventListener('click', () => setPlaying(!playing));
  controls.restart?.addEventListener('click', () => { renderAt(0); setPlaying(true); });
  controls.png?.addEventListener('click', downloadFrame);
  controls.record?.addEventListener('click', recordAnimation);
  if (controls.crtLook) applyCrtLook(controls.crtLook.value || 'arcade');

  const ready = Promise.resolve(create({ context: sourceContext, stage, width, height, duration })).then(created => {
    animation = created;
    return animation?.ready;
  }).then(() => {
    renderAt(0);
    if (controls.status) controls.status.textContent = 'Animation ready.';
    frameHandle = requestAnimationFrame(frame);
  }).catch(error => {
    if (controls.status) controls.status.textContent = `Could not load animation: ${error.message}`;
    console.error(error);
  });

  window.addEventListener('beforeunload', () => {
    if (frameHandle !== null) cancelAnimationFrame(frameHandle);
    stage?.dispose();
  }, { once: true });

  updateReadout();
  return { ready, renderAt, setPlaying };
}
