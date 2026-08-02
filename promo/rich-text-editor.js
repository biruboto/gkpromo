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
  let activeTextControl = controls.bodyEditor, savedBodyRange = null, savedHeaderRange = null, savedDetailRange = null, savedCtaRange = null;
  const savedInlineRanges = { footer: null, hours: null };
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
  function hydrateBodyEditor() {
    const editor = controls.bodyEditor; const expression = /\[\[(\/?effect(?::[a-z-]+)?|[a-z0-9-]+)\]\]/ig;
    const targets = [editor]; let position = 0; let match;
    editor.replaceChildren();
    const appendText = value => { if (value) targets.at(-1).append(document.createTextNode(value)); };
    while ((match = expression.exec(controls.body.value))) {
      appendText(controls.body.value.slice(position, match.index));
      const marker = match[1].toLowerCase();
      if (marker === '/effect' && targets.length > 1) targets.pop();
      else if (marker.startsWith('effect')) {
        const effect = marker.split(':')[1] || 'none'; const span = document.createElement('span');
        span.dataset.effect = effect; if (effect === 'shadow') span.className = 'editor-effect-shadow'; else if (effect === 'highlight') span.className = 'editor-effect-highlight'; else if (effect === 'underline') span.className = 'editor-effect-underline'; else if (effect === 'superscript') span.className = 'editor-effect-superscript'; else if (effect === 'subscript') span.className = 'editor-effect-subscript'; else if (effect === 'stroke') span.className = 'editor-effect-stroke'; else if (['blink', 'flash', 'reflect', 'wave', 'sweep', 'spin'].includes(effect)) span.className = `editor-effect-${effect}`;
        targets.at(-1).append(span); targets.push(span);
      } else {
        const glyphData = legacyGlyphs.get(marker);
        if (glyphData) targets.at(-1).append(createEditorGlyph(glyphData));
        else if (marker === 'leader-tab') targets.at(-1).append(createEditorLeaderTab());
        else appendText(match[0]);
      }
      position = expression.lastIndex;
    }
    appendText(controls.body.value.slice(position));
  }
  function hydrateHeaderEditor() {
    const editor = controls.headerEditor; const expression = /\[\[(\/?effect(?::[a-z-]+)?|[a-z0-9-]+)\]\]/ig;
    const targets = [editor]; let position = 0; let match; editor.replaceChildren();
    const appendText = value => { if (value) targets.at(-1).append(document.createTextNode(value)); };
    while ((match = expression.exec(controls.headline.value))) {
      appendText(controls.headline.value.slice(position, match.index)); const marker = match[1].toLowerCase();
      if (marker === '/effect' && targets.length > 1) targets.pop();
      else if (marker.startsWith('effect')) {
        const effect = marker.split(':')[1] || 'none'; const span = document.createElement('span'); span.dataset.effect = effect;
        span.className = effect === 'shadow' ? 'editor-effect-shadow' : effect === 'highlight' ? 'editor-effect-highlight' : effect === 'underline' ? 'editor-effect-underline' : effect === 'superscript' ? 'editor-effect-superscript' : effect === 'subscript' ? 'editor-effect-subscript' : effect === 'stroke' ? 'editor-effect-stroke' : ['blink', 'flash', 'reflect', 'wave', 'sweep', 'spin'].includes(effect) ? `editor-effect-${effect}` : '';
        targets.at(-1).append(span); targets.push(span);
      } else appendText(match[0]);
      position = expression.lastIndex;
    }
    appendText(controls.headline.value.slice(position));
  }
  function hydrateDetailEditor() {
    const editor = controls.detailEditor; const expression = /\[\[(\/?effect(?::[a-z-]+)?|[a-z0-9-]+)\]\]/ig;
    const targets = [editor]; let position = 0; let match; editor.replaceChildren();
    const appendText = value => { if (value) targets.at(-1).append(document.createTextNode(value)); };
    while ((match = expression.exec(controls.detail.value))) {
      appendText(controls.detail.value.slice(position, match.index)); const marker = match[1].toLowerCase();
      if (marker === '/effect' && targets.length > 1) targets.pop();
      else if (marker.startsWith('effect')) {
        const effect = marker.split(':')[1] || 'none'; const span = document.createElement('span'); span.dataset.effect = effect;
        span.className = effect === 'shadow' ? 'editor-effect-shadow' : effect === 'highlight' ? 'editor-effect-highlight' : effect === 'underline' ? 'editor-effect-underline' : effect === 'superscript' ? 'editor-effect-superscript' : effect === 'subscript' ? 'editor-effect-subscript' : effect === 'stroke' ? 'editor-effect-stroke' : ['blink', 'flash', 'reflect', 'wave', 'sweep', 'spin'].includes(effect) ? `editor-effect-${effect}` : '';
        targets.at(-1).append(span); targets.push(span);
      } else appendText(match[0]);
      position = expression.lastIndex;
    }
    appendText(controls.detail.value.slice(position));
  }
  function hydrateCtaEditor() {
    const editor = controls.ctaEditor; const expression = /\[\[(\/?effect(?::[a-z-]+)?|[a-z0-9-]+)\]\]/ig;
    const targets = [editor]; let position = 0; let match; editor.replaceChildren();
    const appendText = value => { if (value) targets.at(-1).append(document.createTextNode(value)); };
    while ((match = expression.exec(controls.cta.value))) {
      appendText(controls.cta.value.slice(position, match.index)); const marker = match[1].toLowerCase();
      if (marker === '/effect' && targets.length > 1) targets.pop();
      else if (marker.startsWith('effect')) {
        const effect = marker.split(':')[1] || 'none'; const span = document.createElement('span'); span.dataset.effect = effect;
        span.className = effect === 'shadow' ? 'editor-effect-shadow' : effect === 'highlight' ? 'editor-effect-highlight' : effect === 'underline' ? 'editor-effect-underline' : effect === 'superscript' ? 'editor-effect-superscript' : effect === 'subscript' ? 'editor-effect-subscript' : effect === 'stroke' ? 'editor-effect-stroke' : ['blink', 'flash', 'reflect', 'wave', 'sweep', 'spin'].includes(effect) ? `editor-effect-${effect}` : '';
        targets.at(-1).append(span); targets.push(span);
      } else {
        const glyphData = legacyGlyphs.get(marker);
        if (glyphData) targets.at(-1).append(createEditorGlyph(glyphData));
        else appendText(match[0]);
      }
      position = expression.lastIndex;
    }
    appendText(controls.cta.value.slice(position));
  }
  function inlineRichField(section) {
    return section === 'footer' ? { editor: controls.footerEditor, source: controls.footer } : { editor: controls.hoursEditor, source: controls.hours };
  }
  function hydrateInlineRichEditor(section) {
    const { editor, source } = inlineRichField(section); const expression = /\[\[(\/?effect(?::[a-z-]+)?|[a-z0-9-]+)\]\]/ig;
    const targets = [editor]; let position = 0; let match; editor.replaceChildren();
    const appendText = value => { if (value) targets.at(-1).append(document.createTextNode(value)); };
    while ((match = expression.exec(source.value))) {
      appendText(source.value.slice(position, match.index)); const marker = match[1].toLowerCase();
      if (marker === '/effect' && targets.length > 1) targets.pop();
      else if (marker.startsWith('effect')) {
        const effect = marker.split(':')[1] || 'none'; const span = document.createElement('span'); span.dataset.effect = effect;
        span.className = effect === 'shadow' ? 'editor-effect-shadow' : effect === 'highlight' ? 'editor-effect-highlight' : effect === 'underline' ? 'editor-effect-underline' : effect === 'superscript' ? 'editor-effect-superscript' : effect === 'subscript' ? 'editor-effect-subscript' : effect === 'stroke' ? 'editor-effect-stroke' : ['blink', 'flash', 'reflect', 'wave', 'sweep', 'spin'].includes(effect) ? `editor-effect-${effect}` : '';
        targets.at(-1).append(span); targets.push(span);
      } else {
        const glyphData = legacyGlyphs.get(marker);
        if (glyphData) targets.at(-1).append(createEditorGlyph(glyphData));
        else appendText(match[0]);
      }
      position = expression.lastIndex;
    }
    appendText(source.value.slice(position));
  }
  function syncInlineRichSource(section) {
    const { editor, source } = inlineRichField(section);
    source.value = serializeEditorContents(editor);
  }
  function saveInlineRichSelection(section) {
    const { editor } = inlineRichField(section); const selection = window.getSelection();
    if (selection.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer)) savedInlineRanges[section] = selection.getRangeAt(0).cloneRange();
  }
  function inlineRichPointAt(editor, offset) {
    let remaining = Math.max(0, offset);
    const find = node => {
      if (node.nodeType === Node.TEXT_NODE) return { container: node, offset: Math.min(remaining, node.textContent.length) };
      for (const child of node.childNodes) { const length = bodyNodeLength(child); if (remaining <= length) return find(child); remaining -= length; }
      return { container: node, offset: node.childNodes.length };
    };
    return find(editor);
  }
  function toggleInlineRichEffect(section, effect) {
    const { editor, source } = inlineRichField(section); const selection = window.getSelection(); let range = null;
    if (selection.rangeCount) {
      const current = selection.getRangeAt(0);
      if (!current.collapsed && editor.contains(current.startContainer) && editor.contains(current.endContainer)) { savedInlineRanges[section] = current.cloneRange(); range = current; }
    }
    range ||= savedInlineRanges[section]; if (!range || range.collapsed) return;
    const before = document.createRange(); before.selectNodeContents(editor); before.setEnd(range.startContainer, range.startOffset);
    const start = bodyNodeLength(before.cloneContents()); const end = start + bodyNodeLength(range.cloneContents()); const units = bodyStyledUnits(source.value);
    const selected = units.filter(unit => unit.start < end && unit.end > start); if (!toggleUnitEffect(selected, effect)) return;
    source.value = serializeBodyUnits(units); hydrateInlineRichEditor(section);
    editor.focus(); const restored = document.createRange(); const startPoint = inlineRichPointAt(editor, start); const endPoint = inlineRichPointAt(editor, end);
    restored.setStart(startPoint.container, startPoint.offset); restored.setEnd(endPoint.container, endPoint.offset); selection.removeAllRanges(); selection.addRange(restored); savedInlineRanges[section] = restored.cloneRange();
  }
  function insertInlineRichGlyph(section, glyphData) {
    const { editor } = inlineRichField(section); const selection = window.getSelection();
    const range = savedInlineRanges[section]?.cloneRange() || document.createRange();
    if (!savedInlineRanges[section]) { range.selectNodeContents(editor); range.collapse(false); }
    range.deleteContents(); const glyph = createEditorGlyph(glyphData); range.insertNode(glyph);
    range.setStartAfter(glyph); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); savedInlineRanges[section] = range.cloneRange();
    editor.focus(); syncInlineRichSource(section);
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
  function syncBodySource() { controls.body.value = serializeEditorContents(controls.bodyEditor); }
  function saveBodySelection() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (controls.bodyEditor.contains(range.startContainer) && controls.bodyEditor.contains(range.endContainer)) savedBodyRange = range.cloneRange();
  }
  function bodyEffectSelectionRange() {
    const selection = window.getSelection();
    if (selection.rangeCount) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed && controls.bodyEditor.contains(range.startContainer) && controls.bodyEditor.contains(range.endContainer)) {
        savedBodyRange = range.cloneRange();
        return range.cloneRange();
      }
    }
    return savedBodyRange && !savedBodyRange.collapsed ? savedBodyRange.cloneRange() : null;
  }
  function bodyNodeLength(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent.length;
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return 0;
    if (node.matches?.('[data-glyph-id], [data-leader-tab]')) return 1;
    if (node.tagName === 'BR') return 1;
    const length = [...node.childNodes].reduce((total, child) => total + bodyNodeLength(child), 0);
    return /^(DIV|P)$/.test(node.tagName) ? length + 1 : length;
  }
  function bodySelectionOffsets(range) {
    const before = document.createRange(); before.selectNodeContents(controls.bodyEditor); before.setEnd(range.startContainer, range.startOffset);
    return { start: bodyNodeLength(before.cloneContents()), end: bodyNodeLength(before.cloneContents()) + bodyNodeLength(range.cloneContents()) };
  }
  function bodyPointAtOffset(offset) {
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
    return findPoint(controls.bodyEditor);
  }
  function restoreBodySelection(start, end) {
    controls.bodyEditor.focus();
    const range = document.createRange(); const startPoint = bodyPointAtOffset(start); const endPoint = bodyPointAtOffset(end);
    range.setStart(startPoint.container, startPoint.offset); range.setEnd(endPoint.container, endPoint.offset);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); savedBodyRange = range.cloneRange();
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
  function toggleBodyEffect(effect) {
    const range = bodyEffectSelectionRange();
    if (!range) return;
    const { start, end } = bodySelectionOffsets(range); const units = bodyStyledUnits(controls.body.value);
    const selected = units.filter(unit => unit.start < end && unit.end > start);
    if (!toggleUnitEffect(selected, effect)) return;
    controls.body.value = serializeBodyUnits(units); hydrateBodyEditor(); restoreBodySelection(start, end);
  }
  function toggleHeaderEffect(effect) {
    const selection = window.getSelection(); let range = null;
    if (selection.rangeCount) {
      const current = selection.getRangeAt(0);
      if (!current.collapsed && controls.headerEditor.contains(current.startContainer) && controls.headerEditor.contains(current.endContainer)) { savedHeaderRange = current.cloneRange(); range = current; }
    }
    range ||= savedHeaderRange;
    if (!range || range.collapsed) return;
    const before = document.createRange(); before.selectNodeContents(controls.headerEditor); before.setEnd(range.startContainer, range.startOffset);
    const start = bodyNodeLength(before.cloneContents()); const end = start + bodyNodeLength(range.cloneContents()); const units = bodyStyledUnits(controls.headline.value);
    const selected = units.filter(unit => unit.start < end && unit.end > start); if (!toggleUnitEffect(selected, effect)) return;
    controls.headline.value = serializeBodyUnits(units); hydrateHeaderEditor();
    const pointAt = offset => {
      let remaining = Math.max(0, offset);
      const find = node => {
        if (node.nodeType === Node.TEXT_NODE) return { container: node, offset: Math.min(remaining, node.textContent.length) };
        for (const child of node.childNodes) { const length = bodyNodeLength(child); if (remaining <= length) return find(child); remaining -= length; }
        return { container: node, offset: node.childNodes.length };
      };
      return find(controls.headerEditor);
    };
    controls.headerEditor.focus(); const restored = document.createRange(); const startPoint = pointAt(start); const endPoint = pointAt(end); restored.setStart(startPoint.container, startPoint.offset); restored.setEnd(endPoint.container, endPoint.offset); selection.removeAllRanges(); selection.addRange(restored); savedHeaderRange = restored.cloneRange();
  }
  function toggleDetailEffect(effect) {
    const selection = window.getSelection(); let range = null;
    if (selection.rangeCount) { const current = selection.getRangeAt(0); if (!current.collapsed && controls.detailEditor.contains(current.startContainer) && controls.detailEditor.contains(current.endContainer)) { savedDetailRange = current.cloneRange(); range = current; } }
    range ||= savedDetailRange; if (!range || range.collapsed) return;
    const before = document.createRange(); before.selectNodeContents(controls.detailEditor); before.setEnd(range.startContainer, range.startOffset);
    const start = bodyNodeLength(before.cloneContents()); const end = start + bodyNodeLength(range.cloneContents()); const units = bodyStyledUnits(controls.detail.value); const selected = units.filter(unit => unit.start < end && unit.end > start); if (!toggleUnitEffect(selected, effect)) return;
    controls.detail.value = serializeBodyUnits(units); hydrateDetailEditor();
    const pointAt = offset => { let remaining = Math.max(0, offset); const find = node => { if (node.nodeType === Node.TEXT_NODE) return { container: node, offset: Math.min(remaining, node.textContent.length) }; for (const child of node.childNodes) { const length = bodyNodeLength(child); if (remaining <= length) return find(child); remaining -= length; } return { container: node, offset: node.childNodes.length }; }; return find(controls.detailEditor); };
    controls.detailEditor.focus(); const restored = document.createRange(); const startPoint = pointAt(start); const endPoint = pointAt(end); restored.setStart(startPoint.container, startPoint.offset); restored.setEnd(endPoint.container, endPoint.offset); selection.removeAllRanges(); selection.addRange(restored); savedDetailRange = restored.cloneRange();
  }
  function toggleCtaEffect(effect) {
    const selection = window.getSelection(); let range = null;
    if (selection.rangeCount) { const current = selection.getRangeAt(0); if (!current.collapsed && controls.ctaEditor.contains(current.startContainer) && controls.ctaEditor.contains(current.endContainer)) { savedCtaRange = current.cloneRange(); range = current; } }
    range ||= savedCtaRange; if (!range || range.collapsed) return;
    const before = document.createRange(); before.selectNodeContents(controls.ctaEditor); before.setEnd(range.startContainer, range.startOffset);
    const start = bodyNodeLength(before.cloneContents()); const end = start + bodyNodeLength(range.cloneContents()); const units = bodyStyledUnits(controls.cta.value); const selected = units.filter(unit => unit.start < end && unit.end > start); if (!toggleUnitEffect(selected, effect)) return;
    controls.cta.value = serializeBodyUnits(units); hydrateCtaEditor();
    const pointAt = offset => { let remaining = Math.max(0, offset); const find = node => { if (node.nodeType === Node.TEXT_NODE) return { container: node, offset: Math.min(remaining, node.textContent.length) }; for (const child of node.childNodes) { const length = bodyNodeLength(child); if (remaining <= length) return find(child); remaining -= length; } return { container: node, offset: node.childNodes.length }; }; return find(controls.ctaEditor); };
    controls.ctaEditor.focus(); const restored = document.createRange(); const startPoint = pointAt(start); const endPoint = pointAt(end); restored.setStart(startPoint.container, startPoint.offset); restored.setEnd(endPoint.container, endPoint.offset); selection.removeAllRanges(); selection.addRange(restored); savedCtaRange = restored.cloneRange();
  }
  function toggleInputEffect(control, effect) {
    const start = control.selectionStart, end = control.selectionEnd;
    if (start === null || end === null || start === end) return;
    const units = bodyStyledUnits(control.value);
    const selected = units.filter(unit => unit.sourceStart < end && unit.sourceEnd > start);
    if (!toggleUnitEffect(selected, effect)) return;
    control.value = serializeBodyUnits(units); control.focus(); control.setSelectionRange(selected[0].outputStart, selected.at(-1).outputEnd);
  }
  function setBodySelectionAfter(node) {
    const range = document.createRange(); range.setStartAfter(node); range.collapse(true);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); savedBodyRange = range.cloneRange();
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
    selection.removeAllRanges(); selection.addRange(range); savedBodyRange = range.cloneRange(); syncBodySource();
  }
  function insertBodyGlyph(glyphData) {
    const range = savedBodyRange || document.createRange();
    if (!savedBodyRange) range.selectNodeContents(controls.bodyEditor), range.collapse(false);
    range.deleteContents(); const glyph = createEditorGlyph(glyphData); range.insertNode(glyph);
    setBodySelectionAfter(glyph); controls.bodyEditor.focus(); syncBodySource();
  }
  function insertBodyLeaderTab() {
    const range = savedBodyRange || document.createRange();
    if (!savedBodyRange) range.selectNodeContents(controls.bodyEditor), range.collapse(false);
    range.deleteContents(); const marker = createEditorLeaderTab(); range.insertNode(marker);
    setBodySelectionAfter(marker); controls.bodyEditor.focus(); syncBodySource();
  }
  function insertHeaderGlyph(glyphData) {
    const range = savedHeaderRange || document.createRange();
    if (!savedHeaderRange) range.selectNodeContents(controls.headerEditor), range.collapse(false);
    range.deleteContents(); const glyph = createEditorGlyph(glyphData); range.insertNode(glyph);
    const next = document.createRange(); next.setStartAfter(glyph); next.collapse(true); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(next); savedHeaderRange = next.cloneRange(); controls.headerEditor.focus(); controls.headline.value = serializeEditorContents(controls.headerEditor);
  }
  function insertCtaGlyph(glyphData) {
    const range = savedCtaRange || document.createRange();
    if (!savedCtaRange) range.selectNodeContents(controls.ctaEditor), range.collapse(false);
    range.deleteContents(); const glyph = createEditorGlyph(glyphData); range.insertNode(glyph);
    const next = document.createRange(); next.setStartAfter(glyph); next.collapse(true); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(next); savedCtaRange = next.cloneRange(); controls.ctaEditor.focus(); controls.cta.value = serializeEditorContents(controls.ctaEditor);
  }
  function insertCtaLineBreak() {
    const selection = window.getSelection(); const range = selection.rangeCount && controls.ctaEditor.contains(selection.getRangeAt(0).commonAncestorContainer) ? selection.getRangeAt(0) : savedCtaRange || document.createRange();
    if (!range.commonAncestorContainer.parentNode) range.selectNodeContents(controls.ctaEditor), range.collapse(false);
    range.deleteContents(); const lineBreak = document.createElement('br'); range.insertNode(lineBreak);
    range.setStartAfter(lineBreak); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); savedCtaRange = range.cloneRange(); controls.ctaEditor.focus(); controls.cta.value = serializeEditorContents(controls.ctaEditor);
  }
  function applyCharacterEffect(section, effect) {
    const scaleControl = { header: 'headerScale', detail: 'detailScale', body: 'bodyScale', cta: 'ctaScale', footer: 'footerScale', hours: 'footerScale' }[section];
    if (['superscript', 'subscript'].includes(effect) && getTextScale(scaleControl) === 1) return;
    if (section === 'body') {
      toggleBodyEffect(effect);
    } else if (section === 'header') {
      toggleHeaderEffect(effect);
    } else if (section === 'detail') {
      toggleDetailEffect(effect);
    } else if (section === 'cta') {
      toggleCtaEffect(effect);
    } else if (section === 'footer' || section === 'hours') {
      toggleInlineRichEffect(section, effect);
    } else {
      const control = { header: controls.headline, detail: controls.detail }[section];
      toggleInputEffect(control, effect);
    }
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
    if (activeTextControl === controls.bodyEditor) { insertBodyGlyph(legacyGlyphs.get(glyphId)); return; }
    if (activeTextControl === controls.headerEditor) { insertHeaderGlyph(legacyGlyphs.get(glyphId)); return; }
    if (activeTextControl === controls.ctaEditor) { insertCtaGlyph(legacyGlyphs.get(glyphId)); return; }
    if (activeTextControl === controls.footerEditor) { insertInlineRichGlyph('footer', legacyGlyphs.get(glyphId)); return; }
    if (activeTextControl === controls.hoursEditor) { insertInlineRichGlyph('hours', legacyGlyphs.get(glyphId)); return; }
    const control = activeTextControl || controls.headline;
    control.setRangeText(`[[${glyphId}]]`, control.selectionStart, control.selectionEnd, 'end');
    control.focus();
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
    hydrateBodyEditor(); hydrateInlineRichEditor('hours'); hydrateInlineRichEditor('footer');
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
  function wireInlineRichEditor(section, allowLineBreaks) {
    const { editor } = inlineRichField(section);
    editor.addEventListener('focus', () => { activeTextControl = editor; saveInlineRichSelection(section); });
    editor.addEventListener('input', () => { activeTextControl = editor; syncInlineRichSource(section); saveInlineRichSelection(section); });
    editor.addEventListener('keydown', event => { if (!allowLineBreaks && event.key === 'Enter') event.preventDefault(); });
    editor.addEventListener('keyup', () => saveInlineRichSelection(section));
    editor.addEventListener('mouseup', () => saveInlineRichSelection(section));
  }
  wireInlineRichEditor('hours', false);
  wireInlineRichEditor('footer', true);
  controls.headerEditor.addEventListener('focus', () => { activeTextControl = controls.headerEditor; });
  controls.headerEditor.addEventListener('input', () => { activeTextControl = controls.headerEditor; controls.headline.value = serializeEditorContents(controls.headerEditor); });
  controls.headerEditor.addEventListener('keyup', () => { const selection = window.getSelection(); if (selection.rangeCount) savedHeaderRange = selection.getRangeAt(0).cloneRange(); });
  controls.headerEditor.addEventListener('mouseup', () => { const selection = window.getSelection(); if (selection.rangeCount) savedHeaderRange = selection.getRangeAt(0).cloneRange(); });
  controls.detailEditor.addEventListener('focus', () => { activeTextControl = controls.detailEditor; });
  controls.detailEditor.addEventListener('input', () => { activeTextControl = controls.detailEditor; controls.detail.value = serializeEditorContents(controls.detailEditor); });
  controls.detailEditor.addEventListener('keydown', event => { if (event.key === 'Enter') event.preventDefault(); });
  controls.detailEditor.addEventListener('keyup', () => { const selection = window.getSelection(); if (selection.rangeCount) savedDetailRange = selection.getRangeAt(0).cloneRange(); });
  controls.detailEditor.addEventListener('mouseup', () => { const selection = window.getSelection(); if (selection.rangeCount) savedDetailRange = selection.getRangeAt(0).cloneRange(); });
  controls.ctaEditor.addEventListener('focus', () => { activeTextControl = controls.ctaEditor; });
  controls.ctaEditor.addEventListener('input', () => { activeTextControl = controls.ctaEditor; controls.cta.value = serializeEditorContents(controls.ctaEditor); });
  controls.ctaEditor.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); insertCtaLineBreak(); } });
  controls.ctaEditor.addEventListener('keyup', () => { const selection = window.getSelection(); if (selection.rangeCount) savedCtaRange = selection.getRangeAt(0).cloneRange(); });
  controls.ctaEditor.addEventListener('mouseup', () => { const selection = window.getSelection(); if (selection.rangeCount) savedCtaRange = selection.getRangeAt(0).cloneRange(); });
  controls.bodyEditor.addEventListener('focus', () => { activeTextControl = controls.bodyEditor; saveBodySelection(); });
  controls.bodyEditor.addEventListener('input', () => { activeTextControl = controls.bodyEditor; syncBodySource(); saveBodySelection(); });
  controls.bodyEditor.addEventListener('keydown', removeAdjacentBodyGlyph);
  controls.bodyEditor.addEventListener('keyup', saveBodySelection);
  controls.bodyEditor.addEventListener('mouseup', saveBodySelection);
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (selection.rangeCount && controls.bodyEditor.contains(selection.getRangeAt(0).commonAncestorContainer)) saveBodySelection();
    if (selection.rangeCount && controls.headerEditor.contains(selection.getRangeAt(0).commonAncestorContainer)) savedHeaderRange = selection.getRangeAt(0).cloneRange();
    if (selection.rangeCount && controls.detailEditor.contains(selection.getRangeAt(0).commonAncestorContainer)) savedDetailRange = selection.getRangeAt(0).cloneRange();
    if (selection.rangeCount && controls.ctaEditor.contains(selection.getRangeAt(0).commonAncestorContainer)) savedCtaRange = selection.getRangeAt(0).cloneRange();
    ['hours', 'footer'].forEach(section => saveInlineRichSelection(section));
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
