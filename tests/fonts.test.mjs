import assert from 'node:assert/strict';
import test from 'node:test';
import { createFontManager } from '../promo/fonts.js';
import { composerDOM, stubGlobal } from './helpers.mjs';

function setup(t) {
  const { controls } = composerDOM(t);
  let requests = 0;
  const fonts = Array.from({ length: 481 }, (_, i) => ({ file: `${i}.h`, name: `Font ${i}` }));
  stubGlobal(t, 'fetch', async path => {
    if (path.endsWith('index.json')) return { ok: true, json: async () => fonts };
    requests += 1;
    return { ok: true, text: async () => '0xff,'.repeat(768) };
  });
  const loaded = [];
  const manager = createFontManager({ controls, onFontChange() {}, onFontLoaded: (target, font) => loaded.push({ target, font }) });
  return { manager, controls, loaded, get requests() { return requests; } };
}

test('font lists are built on opening, and selecting one does not rebuild other pickers', async t => {
  const { manager, controls } = setup(t);
  await manager.populateFonts();
  assert.equal(document.querySelectorAll('.font-picker-choice').length, 0);
  const bodyPicker = controls.font.nextElementSibling;
  const bodyTrigger = bodyPicker.querySelector('.font-picker-trigger');
  const headerPicker = controls.headerFont.nextElementSibling;
  headerPicker.querySelector('.font-picker-trigger').click();
  assert.equal(document.querySelectorAll('.font-picker-choice').length, 481);
  headerPicker.querySelectorAll('.font-picker-choice')[5].click();
  await Promise.resolve(); await Promise.resolve();
  assert.equal(controls.headerFont.value, '5.h');
  assert.equal(bodyPicker.querySelector('.font-picker-trigger'), bodyTrigger);
  assert.equal(bodyPicker.querySelectorAll('.font-picker-choice').length, 0);
  assert.equal(headerPicker.querySelector('.font-picker-menu').hidden, true);
});

test('favoriting keeps the current search and updates other menus when opened', async t => {
  const { manager, controls } = setup(t);
  await manager.populateFonts();
  const header = controls.headerFont.nextElementSibling;
  header.querySelector('.font-picker-trigger').click();
  const search = header.querySelector('input[type="search"]');
  search.value = 'Font 20'; search.dispatchEvent(new Event('input'));
  header.querySelector('.font-picker-row:not([hidden]) .font-favorite').click();
  assert.equal(header.querySelector('input[type="search"]').value, 'Font 20');
  assert.equal(header.querySelector('.font-picker-label').textContent, 'FAVORITES');
  const body = controls.font.nextElementSibling;
  body.querySelector('.font-picker-trigger').click();
  assert.equal(body.querySelector('.font-picker-label').textContent, 'FAVORITES');
});

test('concurrent use of a header font shares one fetch and parse', async t => {
  const state = setup(t);
  await Promise.all([state.manager.loadFont('1.h', 'Font 1', 'body'), state.manager.loadFont('1.h', 'Font 1', 'header')]);
  assert.equal(state.requests, 1);
  assert.equal(state.loaded.length, 2);
  assert.equal(state.loaded[0].font, state.loaded[1].font);
});
