import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { composerDOM, canvasContexts, stubGlobal } from './helpers.mjs';

test('composer starts without loading 3D and cancels an interrupted recording', async t => {
  const { dom, controls } = composerDOM(t);
  canvasContexts(t, dom.window);
  stubGlobal(t, 'Image', class {
    complete = true; naturalWidth = 8; naturalHeight = 8;
    set src(value) { this.source = value; queueMicrotask(() => this.onload?.()); }
  });
  const requests = [];
  stubGlobal(t, 'fetch', async path => {
    requests.push(path);
    const bytes = readFileSync(new URL(`../${path.replace(/^\.\//, '')}`, import.meta.url));
    return { ok: true, text: async () => bytes.toString(), json: async () => JSON.parse(bytes.toString()) };
  });
  const frames = new Map(); let nextFrame = 0;
  stubGlobal(t, 'requestAnimationFrame', callback => { frames.set(++nextFrame, callback); return nextFrame; });
  stubGlobal(t, 'cancelAnimationFrame', id => frames.delete(id));
  let stoppedTracks = 0;
  dom.window.HTMLCanvasElement.prototype.captureStream = () => ({ getTracks: () => [{ stop() { stoppedTracks += 1; } }] });
  class FakeRecorder {
    static isTypeSupported() { return true; }
    state = 'inactive';
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; queueMicrotask(() => this.onstop()); }
  }
  stubGlobal(t, 'MediaRecorder', FakeRecorder); dom.window.MediaRecorder = FakeRecorder;
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  await import('../promo/app.js');
  for (let step = 0; step < 30 && controls.projectSave.disabled; step++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(controls.projectSave.disabled, false, controls.status.textContent);
  assert.equal(document.querySelectorAll('.font-picker-choice').length, 0);
  assert.ok(requests.every(path => !path.includes('models/') && !path.includes('three')));
  const frame = [...frames.values()][0]; frames.clear(); frame(1000);
  controls.record.click();
  assert.equal(controls.record.textContent, 'RECORDING...');
  assert.ok([...controls.outputFormat.querySelectorAll('button')].every(button => button.disabled));
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
  await Promise.resolve();
  assert.equal(controls.record.textContent, 'EXPORT 15 SEC MP4');
  assert.match(controls.status.textContent, /cancelled/);
  assert.equal(stoppedTracks, 1);
  assert.equal(frames.size, 0);
});
