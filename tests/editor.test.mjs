import assert from 'node:assert/strict';
import test from 'node:test';
import { createRichTextEditor } from '../promo/rich-text-editor.js';
import { composerDOM, stubGlobal } from './helpers.mjs';

function setup(t) {
  const { controls } = composerDOM(t);
  const glyph = { id: 'test-glyph', system: 'EMOJI', slot: '0x00' };
  const editor = createRichTextEditor({ controls, legacyGlyphs: new Map([[glyph.id, glyph]]), leaderTabToken: '[[leader-tab]]', getTextScale: () => 2, getGlyphColor: () => '#ffffff', drawGlyphPreview() {} });
  return { controls, editor, glyph };
}

const fields = { header: 'headline', detail: 'detail', body: 'body', cta: 'cta', hours: 'hours', footer: 'footer' };
function hydrate(editor, section) {
  if (section === 'hours' || section === 'footer') editor.hydrateInlineRichEditor(section);
  else editor[`hydrate${section[0].toUpperCase()}${section.slice(1)}Editor`]();
}
function selectNode(node) {
  const range = document.createRange(); range.selectNode(node);
  window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
}

for (const [section, source] of Object.entries(fields)) {
  test(`${section}: effects preserve glyphs, nested formatting and selection`, t => {
    const { controls, editor } = setup(t);
    const original = 'A[[effect:shadow]][[test-glyph]]B[[/effect]]C';
    controls[source].value = original; hydrate(editor, section);
    const field = controls[`${section}Editor`], glyph = field.querySelector('[data-glyph-id]');
    assert.ok(glyph, 'glyph marker becomes an embedded glyph');
    selectNode(glyph);
    editor.applyCharacterEffect(section, 'highlight');
    assert.ok(field.querySelector('[data-effect="highlight"] [data-glyph-id]'));
    assert.equal(field.textContent, 'A\u25c7BC');
    const selection = window.getSelection().getRangeAt(0);
    assert.ok(selection.cloneContents().querySelector('[data-glyph-id]'));
    assert.equal(selection.startContainer.closest?.('[data-glyph-id]') || null, null);
    editor.applyCharacterEffect(section, 'highlight');
    assert.equal(controls[source].value, original);
  });
}

test('body leader tabs remain atomic through effect toggles', t => {
  const { controls, editor } = setup(t);
  controls.body.value = 'LEFT[[leader-tab]]RIGHT'; editor.hydrateBodyEditor();
  selectNode(controls.bodyEditor.querySelector('[data-leader-tab]'));
  editor.applyCharacterEffect('body', 'highlight');
  editor.applyCharacterEffect('body', 'highlight');
  assert.equal(controls.body.value, 'LEFT[[leader-tab]]RIGHT');
  assert.equal(controls.bodyEditor.querySelectorAll('[data-leader-tab]').length, 1);
});

test('CTA Enter preserves the caret and subsequent text', t => {
  const { controls, editor } = setup(t);
  controls.cta.value = 'AB'; editor.hydrateCtaEditor();
  const range = document.createRange(); range.setStart(controls.ctaEditor.firstChild, 1); range.collapse(true);
  window.getSelection().addRange(range);
  controls.ctaEditor.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
  assert.equal(controls.cta.value, 'A\nB');
  assert.equal(controls.ctaEditor.querySelectorAll('br').length, 1);
});

test('loading glyphs hydrates header, detail and CTA as well as body', async t => {
  const { controls, editor, glyph } = setup(t);
  for (const source of Object.values(fields)) controls[source].value = '[[test-glyph]]';
  stubGlobal(t, 'fetch', async () => ({ ok: true, json: async () => ({ glyphs: [glyph] }) }));
  await editor.loadLegacyGlyphs();
  for (const section of Object.keys(fields)) assert.ok(controls[`${section}Editor`].querySelector('[data-glyph-id]'));
});

test('template hydration invalidates a selection from the previous copy', t => {
  const { controls, editor } = setup(t);
  controls.headline.value = 'OLD'; editor.hydrateHeaderEditor();
  selectNode(controls.headerEditor.firstChild);
  controls.headerEditor.dispatchEvent(new window.Event('mouseup'));
  controls.headline.value = 'NEW'; editor.hydrateHeaderEditor();
  window.getSelection().removeAllRanges();
  editor.applyCharacterEffect('header', 'highlight');
  assert.equal(controls.headline.value, 'NEW');
});
