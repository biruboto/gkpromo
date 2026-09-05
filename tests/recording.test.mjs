import assert from 'node:assert/strict';
import test from 'node:test';
import { recordCanvas } from '../promo/recording.js';
import { stubGlobal } from './helpers.mjs';

function setup(t, failStart = false) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let recorder, stops = 0, finishes = 0;
  const downloads = [], errors = [];
  stubGlobal(t, 'MediaRecorder', class {
    state = 'inactive'; mimeType = 'video/mp4';
    constructor() { recorder = this; }
    start() { if (failStart) throw new Error('start failed'); this.state = 'recording'; }
    stop() {
      assert.equal(this.state, 'recording'); this.state = 'inactive';
      queueMicrotask(() => { this.ondataavailable({ data: new Blob(['frame']) }); this.onstop(); });
    }
  });
  const options = {
    canvas: { captureStream: () => ({ getTracks: () => [{ stop() { stops += 1; } }] }) },
    mimeType: 'video/mp4', onComplete: blob => downloads.push(blob),
    onFinish: () => { finishes += 1; }, onError: error => errors.push(error)
  };
  return { options, downloads, errors, get recorder() { return recorder; }, get stops() { return stops; }, get finishes() { return finishes; } };
}

test('a completed recording downloads once and releases its stream', async t => {
  const state = setup(t);
  recordCanvas(state.options);
  t.mock.timers.tick(15000); await Promise.resolve();
  assert.equal(state.downloads.length, 1);
  assert.equal(await state.downloads[0].text(), 'frame');
  assert.equal(state.finishes, 1); assert.equal(state.stops, 1);
});

test('cancelling suppresses the partial download and clears the stop timer', async t => {
  const state = setup(t), session = recordCanvas(state.options);
  session.cancel(); session.cancel();
  await Promise.resolve(); t.mock.timers.tick(15000);
  assert.equal(state.downloads.length, 0);
  assert.equal(state.finishes, 1); assert.equal(state.stops, 1);
});

test('recorder errors clean up without downloading', async t => {
  const state = setup(t);
  recordCanvas(state.options);
  state.recorder.onerror({ error: new Error('encoder failed') });
  state.recorder.onstop(); t.mock.timers.tick(15000);
  assert.equal(state.errors[0].message, 'encoder failed');
  assert.equal(state.downloads.length, 0);
  assert.equal(state.finishes, 1); assert.equal(state.stops, 1);
});

test('a start failure releases the stream and restores UI state', t => {
  const state = setup(t, true);
  assert.throws(() => recordCanvas(state.options), /start failed/);
  assert.equal(state.finishes, 1); assert.equal(state.stops, 1);
});
