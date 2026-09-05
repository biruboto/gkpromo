export function recordCanvas({ canvas, mimeType, duration = 15000, onComplete, onFinish, onError }) {
  const stream = canvas.captureStream(30);
  const chunks = [];
  let recorder, timer, cancelled = false, finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    stream.getTracks().forEach(track => track.stop());
    onFinish();
  };
  try {
    recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      if (finished) return;
      try {
        if (!cancelled) onComplete(new Blob(chunks, { type: recorder.mimeType || mimeType }));
      } finally { finish(); }
    };
    recorder.onerror = event => {
      cancelled = true;
      finish();
      onError(event.error || new Error('Video recording failed.'));
    };
    recorder.start();
    timer = setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop(); }, duration);
  } catch (error) {
    cancelled = true;
    finish();
    throw error;
  }
  return {
    cancel() {
      if (finished) return;
      cancelled = true;
      try { if (recorder.state !== 'inactive') recorder.stop(); }
      finally { finish(); }
    }
  };
}
