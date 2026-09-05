import assert from 'node:assert/strict';
import test from 'node:test';
import { createMonochromeImageBlock } from '../promo/image-block.js';
import { stubGlobal } from './helpers.mjs';

function setup(t) {
  const pending = [];
  stubGlobal(t, 'Image', class {
    naturalWidth = 1; naturalHeight = 1;
    set src(value) { this.source = value; pending.push(this); }
  });
  stubGlobal(t, 'document', { createElement: () => ({ getContext: () => ({
    clearRect() {}, drawImage() {},
    getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) })
  }) }) });
  const block = createMonochromeImageBlock({ getSettings: () => ({ resolution: 8, contrast: 100, threshold: 128, ditherAmount: 0, dither: 'none', invert: false }) });
  return { block, pending };
}

test('clearing an image supersedes a pending decode', async t => {
  const { block, pending } = setup(t);
  const loading = block.loadProjectSource('old', 'old.png');
  block.clear(); pending[0].onload();
  assert.equal(await loading, false);
  assert.equal(block.hasImage(), false);
  assert.equal(block.getSourceState().dataUrl, '');
});

test('the newest image wins even when older decodes finish last', async t => {
  const { block, pending } = setup(t);
  const old = block.loadProjectSource('old', 'old.png');
  const current = block.loadProjectSource('new', 'new.png');
  pending[1].onload(); assert.equal(await current, true);
  pending[0].onload(); assert.equal(await old, false);
  assert.equal(block.getSourceState().name, 'new.png');
});

test('switching to an empty template supersedes an in-flight image fetch', async t => {
  const { block, pending } = setup(t);
  let finishFetch;
  stubGlobal(t, 'fetch', () => new Promise(resolve => { finishFetch = resolve; }));
  const loading = block.loadBundledSource('/old.png', 'old.png');
  block.clear();
  finishFetch({ ok: true, blob: async () => new Blob(['image'], { type: 'image/png' }) });
  assert.equal(await loading, false);
  assert.equal(pending.length, 0);
  assert.equal(block.hasImage(), false);
});
