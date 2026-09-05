import assert from 'node:assert/strict';
import test from 'node:test';
import { createPromoRenderer } from '../promo/renderer.js';
import { outputFormat } from '../promo/formats.js';
import { composerDOM, canvasContexts } from './helpers.mjs';

function setup(t) {
  const { dom, controls } = composerDOM(t), pixels = canvasContexts(t, dom.window);
  const canvas = controls.preview, context = canvas.getContext('2d'), exportCanvas = document.createElement('canvas');
  const state = { font: new Uint8Array(768).fill(255), format: 'portrait', warnings: [] };
  controls.headline.value = 'TEST TITLE'; controls.body.value = 'BODY TEXT'; controls.footer.value = '';
  controls.theme.value = 'yuNo'; controls.logo.value = 'pixel'; controls.classic.checked = true;
  const colors = {
    yuNo: { background: '#12131c', text: '#c7d4f2', highlight: '#f6e6a6', shadow: '#70405a', accent: '#e7855b', muted: '#59637a' },
    neon: { background: '#071722', text: '#9be7e5', highlight: '#f8e9a7', shadow: '#654a88', accent: '#ea759d', muted: '#386574' }
  };
  const logoImages = Object.fromEntries(['pixel', 'stacked', 'classic'].map(key => [key, { complete: true, naturalWidth: 8, naturalHeight: 8 }]));
  const renderer = createPromoRenderer({
    context, canvas, exportContext: exportCanvas.getContext('2d'), width: 540, height: 675, exportScale: 2,
    controls, colors, logoImages, legacyGlyphs: new Map(), gameBackgrounds: { draw() {}, resize() {} }, imageBlock: { getBitmap: () => null },
    crtPipeline: { render: () => canvas, resize() {} }, contentVisibility: { detail: false, cta: false, hours: false }, scrollModes: { detail: 'off', hours: 'off' },
    textAlignments: { header: 'center', body: 'left', footer: 'center' }, textVerticalAlignments: { header: 'center', body: 'center', footer: 'bottom' }, getBodyBorderStyle: () => 'none',
    getFonts: () => Object.fromEntries(['body', 'header', 'detail', 'cta', 'footer', 'hours'].map(key => [key, state.font])),
    getTextScale: name => [1, 2, 4][Number(controls[name].value)], getSectionOrder: () => ['logo', 'image', 'header', 'detail', 'body', 'cta', 'footer'],
    getOutputFormat: () => outputFormat(state.format), onMissingGlyphsChange: warnings => { state.warnings = warnings; },
    animationState: { time: 0 }, leaderTabToken: '[[leader-tab]]'
  });
  const draw = (time = 0, options = {}) => {
    context.calls = []; renderer.render(time, options);
    return context.calls.filter(([name]) => name === 'drawImage');
  };
  return { renderer, controls, state, pixels, draw };
}

test('warm logo frames reuse recolored pixels without changing drawing positions', t => {
  const { pixels, draw } = setup(t);
  const first = draw(0); assert.equal(pixels.reads, 2);
  const next = draw(100); assert.equal(pixels.reads, 2);
  assert.deepEqual(next, first);
  draw(250); draw(500); draw(750);
  assert.equal(pixels.reads, 5, 'four main logo phases plus one Classic Arcade image');
  draw(1000); draw(1250); draw(1500); draw(1750);
  assert.equal(pixels.reads, 5);
});

test('theme and output format changes invalidate the appropriate logo frames', t => {
  const { renderer, controls, state, pixels, draw } = setup(t);
  draw(); controls.theme.value = 'neon'; draw();
  assert.equal(pixels.reads, 4);
  state.format = 'landscape'; renderer.resize(outputFormat(state.format)); draw();
  assert.equal(pixels.reads, 5, 'stacked logo replaces portrait logo; Classic Arcade keeps its tint');
});

test('cached layout responds to copy, text scale, font and width changes', t => {
  const { renderer, controls, state, draw } = setup(t);
  const first = draw(); assert.deepEqual(draw(), first);
  controls.headline.value = 'CHANGED TITLE'; const edited = draw(); assert.notDeepEqual(edited, first);
  controls.headerScale.value = '0'; const scaled = draw(); assert.notDeepEqual(scaled, edited);
  state.font = new Uint8Array(768).fill(128); renderer.clearFontCaches();
  const newFont = draw(); assert.notDeepEqual(newFont, scaled);
  state.format = 'landscape'; renderer.resize(outputFormat(state.format)); assert.notDeepEqual(draw(), newFont);
});

test('cached text retains missing glyph diagnostics without treating newlines as glyphs', t => {
  const { renderer, controls, state, draw } = setup(t);
  const atlas = document.createElement('canvas'); atlas.width = 96 * 8; atlas.height = 8;
  const pixels = new Uint8ClampedArray(atlas.width * atlas.height * 4);
  for (let row = 0; row < 8; row++) pixels[(row * atlas.width + ('A'.charCodeAt(0) - 32) * 8) * 4 + 3] = 255;
  state.font = { kind: 'arcade', id: 'test', slotCount: 96, atlas, pixels };
  controls.headline.value = 'A\n?'; controls.body.value = 'A'; renderer.clearFontCaches(); draw();
  assert.deepEqual(state.warnings, [{ section: 'header', characters: ['?'] }]);
  controls.headline.value = 'A'; draw(); assert.deepEqual(state.warnings, []);
  controls.headline.value = 'A\n?'; draw();
  assert.deepEqual(state.warnings, [{ section: 'header', characters: ['?'] }]);
});

test('static print and normal frames can alternate without retaining static logo state', t => {
  const { draw } = setup(t);
  const animated = draw(500), printed = draw(500, { exportFrame: true, staticText: true, backgroundColor: '#59637a' });
  assert.notEqual(animated[0][1], printed[0][1]);
  assert.deepEqual(draw(500), animated);
});
