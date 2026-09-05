export function createRichTextEditor({ controls, legacyGlyphs, leaderTabToken, getTextScale, getGlyphColor, drawGlyphPreview }) {
  const ATASCII_PICKER_SLOTS = new Set(['0x00', '0x1C', '0x1D', '0x1E', '0x1F', '0x60', '0x7B', '0x7D', '0x7E', '0x7F']);
  const PETSCII_PICKER_SLOTS = new Set(['0x51', '0x56', '0x57', '0x58', '0x5A']);
  const PICKER_GLYPH_ORDER = ['atascii-00', 'atascii-7B', 'petscii-upper-58', 'petscii-upper-5a', 'atascii-1C', 'atascii-1D', 'atascii-1E', 'atascii-1F', 'atascii-7D', 'atascii-7E', 'atascii-7F', 'atascii-60', 'petscii-upper-51', 'petscii-upper-56', 'petscii-upper-57', 'emoji-smiley', 'emoji-bigsmile', 'emoji-wow', 'emoji-sad', 'emoji-cool', 'emoji-skull', 'emoji-pac', 'emoji-smalldot', 'emoji-ghost'];
  const PICKER_GLYPH_ORDER_INDEX = new Map(PICKER_GLYPH_ORDER.map((id, index) => [id, index]));
  const LEGACY_UNICODE = {
    'atascii-00': '♥', 'atascii-14': '●', 'atascii-1C': '↑', 'atascii-1D': '↓', 'atascii-1E': '←', 'atascii-1F': '→',
    'atascii-60': '♦', 'atascii-7B': '♠', 'atascii-7D': '◢', 'atascii-7E': '◀', 'atascii-7F': '▶',
    'petscii-upper-51': '●', 'petscii-upper-56': '✕', 'petscii-upper-57': '○', 'petscii-upper-58': '♣', 'petscii-upper-5A': '▲'
  };
  let activeTextControl = controls.bodyEditor;
  const savedRanges = {};
  function drawGlyphTile(canvasElement, glyphData) {
    drawGlyphPreview(canvasElement, glyphData, getGlyphColor());
  }
  function createEditorGlyph(glyphData) {
    const glyph = document.createElement('span');
    glyph.className = 'editor-glyph'; glyph.dataset.glyphId = glyphData.id; glyph.contentEditable = 'false';
    if (glyphData.image) {
      const image = document.createElement('img'); image.src = `./assets/images/emoji/${glyphData.image}`; image.alt = ''; image.draggable = false; glyph.append(image);
    } else glyph.textContent = LEGACY_UNICODE[glyphData.id] || '◇';
    glyph.setAttribute('aria-label', `${glyphData.system} glyph ${glyphData.slot}`); glyph.title = `${glyphData.system} ${glyphData.slot}`;
    return glyph;
  }
  function createEditorLeaderTab() {
    const marker = document.createElement('span'); marker.className = 'editor-leader-tab'; marker.dataset.leaderTab = 'true'; marker.contentEditable = 'false'; marker.textContent = '⇥';
    marker.setAttribute('aria-label', 'Leader tab'); marker.title = 'Leader tab'; return marker;
  }
  function hydrateEditor(section) {
    const editor = editorForSection(section), source = sourceForSection(section);
    const expression = /\[\[(\/?effect(?::[a-z-]+)?|[a-z0-9-]+)\]\]/ig;
    const targets = [editor]; let position = 0; let match;
    editor.replaceChildren(); savedRanges[section] = null;
    const appendText = value => { if (value) targets.at(-1).append(document.createTextNode(value)); };
    while ((match = expression.exec(source.value))) {
      appendText(source.value.slice(position, match.index));
      const marker = match[1].toLowerCase();
      if (marker === '/effect' && targets.length > 1) targets.pop();
      else if (marker.startsWith('effect')) {
        const effect = marker.split(':')[1] || 'none'; const span = document.createElement('span');
        span.dataset.effect = effect;
        span.className = `editor-effect-${effect}`;
        targets.at(-1).append(span); targets.push(span);
      } else {
        const glyphData = legacyGlyphs.get(marker);
        if (glyphData) targets.at(-1).append(createEditorGlyph(glyphData));
        else if (marker === 'leader-tab' && section === 'body') targets.at(-1).append(createEditorLeaderTab());
        else appendText(match[0]);
      }
      position = expression.lastIndex;
    }
    appendText(source.value.slice(position));
  }
  function hydrateBodyEditor() { hydrateEditor('body'); }
  function hydrateHeaderEditor() { hydrateEditor('header'); }
  function hydrateDetailEditor() { hydrateEditor('detail'); }
  function hydrateCtaEditor() { hydrateEditor('cta'); }
  function hydrateInlineRichEditor(section) { hydrateEditor(section); }
  function syncSource(section) { sourceForSection(section).value = serializeEditorContents(editorForSection(section)); }
  function saveSelection(section) {
    const editor = editorForSection(section), selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.startContainer) && editor.contains(range.endContainer)) savedRanges[section] = range.cloneRange();
  }
  function editorRange(section) {
    saveSelection(section);
    const range = savedRanges[section], editor = editorForSection(section);
    return range && editor.contains(range.startContainer) && editor.contains(range.endContainer) ? range.cloneRange() : null;
  }
  function toggleEditorEffect(section, effect) {
    const editor = editorForSection(section), source = sourceForSection(section), range = editorRange(section);
    if (!range || range.collapsed) return;
    const { start, end } = selectionOffsets(editor, range), units = bodyStyledUnits(source.value);
    const selected = units.filter(unit => unit.start < end && unit.end > start);
    if (!toggleUnitEffect(selected, effect)) return;
    source.value = serializeBodyUnits(units); hydrateEditor(section);
    editor.focus();
    const restored = document.createRange(), startPoint = editorPointAtOffset(editor, start), endPoint = editorPointAtOffset(editor, end);
    restored.setStart(startPoint.container, startPoint.offset); restored.setEnd(endPoint.container, endPoint.offset);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(restored);
    savedRanges[section] = restored.cloneRange();
  }
  function insertEditorNode(section, node) {
    const editor = editorForSection(section);
    let range = editorRange(section);
    if (!range) { range = document.createRange(); range.selectNodeContents(editor); range.collapse(false); }
    range.deleteContents(); range.insertNode(node); range.setStartAfter(node); range.collapse(true);
    editor.focus();
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    savedRanges[section] = range.cloneRange(); syncSource(section);
  }
  function serializeBodyNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    if (node.matches('[data-glyph-id]')) return `[[${node.dataset.glyphId}]]`;
    if (node.matches('[data-leader-tab]')) return leaderTabToken;
    if (node.tagName === 'BR') return '\n';
    const content = [...node.childNodes].map(serializeBodyNode).join('');
    if (node.matches('[data-effect]')) return `[[effect:${node.dataset.effect}]]${content}[[/effect]]`;
    return content;
  }
  function serializeEditorContents(editor) {
    let value = '', previousWasBlock = false;
    [...editor.childNodes].forEach(node => {
      const isBlock = node.nodeType === Node.ELEMENT_NODE && /^(DIV|P)$/.test(node.tagName);
      if (value && (isBlock || previousWasBlock) && !value.endsWith('\n')) value += '\n';
      value += serializeBodyNode(node); previousWasBlock = isBlock;
    });
    return value.replace(/\n+$/, '');
  }
  function syncBodySource() { syncSource('body'); }
  function bodyNodeLength(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent.length;
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return 0;
    if (node.matches?.('[data-glyph-id], [data-leader-tab]')) return 1;
    if (node.tagName === 'BR') return 1;
    const length = [...node.childNodes].reduce((total, child) => total + bodyNodeLength(child), 0);
    return /^(DIV|P)$/.test(node.tagName) ? length + 1 : length;
  }
  function editorPointAtOffset(editor, offset) {
    let remaining = Math.max(0, offset);
    const findPoint = (node, parent = null) => {
      if (node.nodeType === Node.TEXT_NODE) return { container: node, offset: Math.min(remaining, node.textContent.length) };
      if (node.matches?.('[data-glyph-id], [data-leader-tab]') || node.tagName === 'BR') {
        const index = [...parent.childNodes].indexOf(node);
        return { container: parent, offset: index + Number(remaining > 0) };
      }
      for (const child of node.childNodes) {
        const length = bodyNodeLength(child);
        if (remaining <= length) return findPoint(child, node);
        remaining -= length;
      }
      return { container: node, offset: node.childNodes.length };
    };
    return findPoint(editor);
  }
  function bodyStyledUnits(value) {
    const units = []; const expression = /\[\[(\/?effect(?::[a-z-]+)?|[a-z0-9-]+)\]\]/ig;
    const effects = []; let position = 0; let match; let offset = 0;
    const appendText = (text, sourceStart) => {
      let sourceOffset = sourceStart;
      for (const character of text) {
        const length = character.length;
        units.push({ raw: character, start: offset, end: offset + length, sourceStart: sourceOffset, sourceEnd: sourceOffset + length, effects: [...effects] });
        offset += length; sourceOffset += length;
      }
    };
    while ((match = expression.exec(value))) {
      appendText(value.slice(position, match.index), position);
      const marker = match[1].toLowerCase();
      if (marker === '/effect') effects.pop();
      else if (marker.startsWith('effect')) effects.push(marker.split(':')[1] || 'none');
      else {
        const glyphData = legacyGlyphs.get(marker);
        if (glyphData) {
          const length = (LEGACY_UNICODE[glyphData.id] || '◇').length;
          units.push({ raw: match[0], start: offset, end: offset + length, sourceStart: match.index, sourceEnd: expression.lastIndex, effects: [...effects] }); offset += length;
        } else if (marker === 'leader-tab') {
          units.push({ raw: leaderTabToken, start: offset, end: offset + 1, sourceStart: match.index, sourceEnd: expression.lastIndex, effects: [...effects] }); offset += 1;
        } else appendText(match[0], match.index);
      }
      position = expression.lastIndex;
    }
    appendText(value.slice(position), position);
    return units;
  }
  function serializeBodyUnits(units) {
    let value = ''; let activeEffects = [];
    units.forEach(unit => {
      const unitEffects = unit.raw === '\n' ? [] : unit.effects;
      let shared = 0;
      while (shared < activeEffects.length && shared < unitEffects.length && activeEffects[shared] === unitEffects[shared]) shared += 1;
      value += '[[/effect]]'.repeat(activeEffects.length - shared);
      activeEffects = activeEffects.slice(0, shared);
      unitEffects.slice(shared).forEach(effect => value += `[[effect:${effect}]]`);
      activeEffects = [...unitEffects]; unit.outputStart = value.length; value += unit.raw; unit.outputEnd = value.length;
    });
    return value + '[[/effect]]'.repeat(activeEffects.length);
  }
  function toggleUnitEffect(units, effect) {
    const effectable = units.filter(unit => unit.raw !== '\n');
    if (!effectable.length) return false;
    const removing = effectable.every(unit => unit.effects.includes(effect));
    effectable.forEach(unit => { unit.effects = removing ? unit.effects.filter(item => item !== effect) : unit.effects.includes(effect) ? unit.effects : [...unit.effects, effect]; });
    return true;
  }
  function adjacentEditorNode(node, direction) {
    const sibling = direction === 'backward' ? node.previousSibling : node.nextSibling;
    if (sibling) return sibling;
    const parent = node.parentNode;
    return parent && parent !== controls.bodyEditor ? adjacentEditorNode(parent, direction) : null;
  }
  function edgeGlyph(node, direction) {
    let candidate = node;
    while (candidate?.nodeType === Node.ELEMENT_NODE && !candidate.matches('[data-glyph-id], [data-leader-tab]')) candidate = direction === 'backward' ? candidate.lastChild : candidate.firstChild;
    return candidate?.matches?.('[data-glyph-id], [data-leader-tab]') ? candidate : null;
  }
  function adjacentBodyGlyph(range, direction) {
    const { startContainer, startOffset } = range;
    if (startContainer.nodeType === Node.TEXT_NODE) {
      const atEdge = direction === 'backward' ? startOffset === 0 : startOffset === startContainer.textContent.length;
      return atEdge ? edgeGlyph(adjacentEditorNode(startContainer, direction), direction) : null;
    }
    const child = startContainer.childNodes[direction === 'backward' ? startOffset - 1 : startOffset];
    return edgeGlyph(child, direction);
  }
  function removeAdjacentBodyGlyph(event) {
    if (!['Backspace', 'Delete'].includes(event.key)) return;
    const selection = window.getSelection();
    if (!selection.rangeCount || !selection.getRangeAt(0).collapsed) return;
    const direction = event.key === 'Backspace' ? 'backward' : 'forward'; const glyph = adjacentBodyGlyph(selection.getRangeAt(0), direction);
    if (!glyph) return;
    event.preventDefault(); const parent = glyph.parentNode; const index = [...parent.childNodes].indexOf(glyph);
    glyph.remove(); const range = document.createRange(); range.setStart(parent, index); range.collapse(true);
    selection.removeAllRanges(); selection.addRange(range); savedRanges.body = range.cloneRange(); syncBodySource();
  }
  function insertBodyLeaderTab() { insertEditorNode('body', createEditorLeaderTab()); }
  function applyCharacterEffect(section, effect) {
    const scaleControl = { header: 'headerScale', detail: 'detailScale', body: 'bodyScale', cta: 'ctaScale', footer: 'footerScale', hours: 'footerScale' }[section];
    if (['superscript', 'subscript'].includes(effect) && getTextScale(scaleControl) === 1) return;
    if (!editorForSection(section)) return;
    toggleEditorEffect(section, effect);
    syncEffectToolbarState(section);
  }
  const TEXT_EDITOR_SECTIONS = ['header', 'detail', 'body', 'cta', 'footer', 'hours'];
  function editorForSection(section) {
    return { header: controls.headerEditor, detail: controls.detailEditor, body: controls.bodyEditor, cta: controls.ctaEditor, footer: controls.footerEditor, hours: controls.hoursEditor }[section];
  }
  function sourceForSection(section) {
    return { header: controls.headline, detail: controls.detail, body: controls.body, cta: controls.cta, footer: controls.footer, hours: controls.hours }[section];
  }
  function selectionSection() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    return TEXT_EDITOR_SECTIONS.find(section => editorForSection(section).contains(range.commonAncestorContainer)) || null;
  }
  function selectionOffsets(editor, range) {
    const before = document.createRange(); before.selectNodeContents(editor); before.setEnd(range.startContainer, range.startOffset);
    return { start: bodyNodeLength(before.cloneContents()), end: bodyNodeLength(before.cloneContents()) + bodyNodeLength(range.cloneContents()) };
  }
  function effectsAtSelection(section) {
    const selection = window.getSelection(); const editor = editorForSection(section); const source = sourceForSection(section);
    if (!selection.rangeCount || !editor.contains(selection.getRangeAt(0).commonAncestorContainer)) return new Set();
    const range = selection.getRangeAt(0); const { start, end } = selectionOffsets(editor, range); const units = bodyStyledUnits(source.value);
    let selected = [];
    if (range.collapsed) {
      const next = units.find(unit => unit.raw !== '\n' && unit.start <= start && unit.end > start);
      const previous = [...units].reverse().find(unit => unit.raw !== '\n' && unit.end === start);
      selected = next ? [next] : previous ? [previous] : [];
    } else selected = units.filter(unit => unit.raw !== '\n' && unit.start < end && unit.end > start);
    if (!selected.length) return new Set();
    return new Set(selected[0].effects.filter(effect => selected.every(unit => unit.effects.includes(effect))));
  }
  function syncEffectToolbarState(section = selectionSection()) {
    TEXT_EDITOR_SECTIONS.forEach(toolbarSection => {
      const activeEffects = toolbarSection === section ? effectsAtSelection(toolbarSection) : new Set();
      document.querySelectorAll(`[data-character-toolbar="${toolbarSection}"] [data-character-control], [data-animation-toolbar="${toolbarSection}"] [data-animation-control]`).forEach(button => {
        const effect = button.dataset.characterControl || button.dataset.animationControl;
        button.setAttribute('aria-pressed', String(activeEffects.has(effect)));
      });
    });
  }
  function syncCharacterToolAvailability() {
    ['header', 'detail', 'body', 'cta', 'footer', 'hours'].forEach(section => {
      const scaleControl = { header: 'headerScale', detail: 'detailScale', body: 'bodyScale', cta: 'ctaScale', footer: 'footerScale', hours: 'footerScale' }[section];
      const available = getTextScale(scaleControl) > 1;
      document.querySelectorAll(`[data-character-toolbar="${section}"] [data-character-control="superscript"], [data-character-toolbar="${section}"] [data-character-control="subscript"]`).forEach(button => {
        button.disabled = !available;
        const effect = button.dataset.characterControl;
        button.title = available ? `${section} ${effect} selected text` : `${section} ${effect} is unavailable at 1x`;
        button.setAttribute('aria-label', button.title);
      });
    });
  }
  function insertLegacyGlyph(glyphId) {
    if (!legacyGlyphs.has(glyphId)) return;
    controls.glyphGrid.querySelectorAll('.glyph-tile').forEach(tile => {
      const selected = tile.dataset.glyphId === glyphId;
      tile.classList.toggle('is-selected', selected); tile.setAttribute('aria-pressed', String(selected));
    });
    const section = TEXT_EDITOR_SECTIONS.find(name => editorForSection(name) === activeTextControl) || 'header';
    insertEditorNode(section, createEditorGlyph(legacyGlyphs.get(glyphId)));
  }
  async function loadLegacyGlyphs() {
    const response = await fetch('./assets/glyphs/legacy-glyphs.json');
    if (!response.ok) throw new Error(`glyph library returned ${response.status}`);
    const library = await response.json();
    library.glyphs.forEach(glyphData => {
      legacyGlyphs.set(glyphData.id, glyphData);
      if (glyphData.system === 'ATASCII' && glyphData.internalSlot) legacyGlyphs.set(`atascii-${glyphData.internalSlot.slice(2).toLowerCase()}`, glyphData);
    });
    await Promise.all(library.glyphs.filter(glyphData => glyphData.image).map(glyphData => new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => { glyphData.imageElement = image; resolve(); }; image.onerror = () => reject(new Error(`emoji image could not be loaded: ${glyphData.image}`)); image.src = `./assets/images/emoji/${glyphData.image}`;
    })));
    TEXT_EDITOR_SECTIONS.forEach(hydrateEditor);
    const pickerGlyphs = library.glyphs.filter(glyphData => {
      return glyphData.system === 'EMOJI' || glyphData.system === 'ATASCII' && ATASCII_PICKER_SLOTS.has(glyphData.slot) || glyphData.system === 'PETSCII' && PETSCII_PICKER_SLOTS.has(glyphData.slot);
    }).sort((first, second) => (PICKER_GLYPH_ORDER_INDEX.get(first.id) ?? Number.MAX_SAFE_INTEGER) - (PICKER_GLYPH_ORDER_INDEX.get(second.id) ?? Number.MAX_SAFE_INTEGER));
    const section = document.createElement('section'); section.className = 'glyph-system';
    const title = document.createElement('span'); title.className = 'glyph-system-title'; title.textContent = 'SPECIAL GLYPHS';
    const grid = document.createElement('div'); grid.className = 'glyph-grid';
    pickerGlyphs.forEach(glyphData => {
      const tile = document.createElement('button'); tile.type = 'button'; tile.className = 'glyph-tile';
      tile.dataset.glyphId = glyphData.id; tile.title = `${glyphData.system} ${glyphData.slot}`;
      tile.setAttribute('aria-label', `${glyphData.system} glyph ${glyphData.slot}`); tile.setAttribute('aria-pressed', 'false');
      const tileCanvas = document.createElement('canvas'); tileCanvas.width = tileCanvas.height = 16; tileCanvas.setAttribute('aria-hidden', 'true');
      drawGlyphTile(tileCanvas, glyphData); tile.append(tileCanvas); tile.addEventListener('click', () => insertLegacyGlyph(glyphData.id)); grid.append(tile);
    });
    section.append(title, grid);
    controls.glyphGrid.replaceChildren(section);
  }
  TEXT_EDITOR_SECTIONS.forEach(section => {
    const editor = editorForSection(section);
    editor.addEventListener('focus', () => { activeTextControl = editor; saveSelection(section); });
    editor.addEventListener('input', () => { activeTextControl = editor; syncSource(section); saveSelection(section); });
    editor.addEventListener('keyup', () => saveSelection(section));
    editor.addEventListener('mouseup', () => saveSelection(section));
    editor.addEventListener('keydown', event => {
      if (section === 'body') removeAdjacentBodyGlyph(event);
      if (event.key !== 'Enter') return;
      if (section === 'detail' || section === 'hours') event.preventDefault();
      if (section === 'cta') { event.preventDefault(); insertEditorNode(section, document.createElement('br')); }
    });
  });
  document.addEventListener('selectionchange', () => {
    TEXT_EDITOR_SECTIONS.forEach(saveSelection);
    syncEffectToolbarState();
  });
  return {
    applyCharacterEffect,
    drawGlyphTile,
    hydrateBodyEditor,
    hydrateCtaEditor,
    hydrateDetailEditor,
    hydrateHeaderEditor,
    hydrateInlineRichEditor,
    insertBodyLeaderTab,
    loadLegacyGlyphs,
    syncEffectToolbarState,
    syncCharacterToolAvailability
  };
}
