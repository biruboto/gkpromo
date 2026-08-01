import { createCrtPipeline, CRT_CONTROL_IDS, CRT_LOOKS } from './crt.js?v=228';
import { createFontManager } from './fonts.js?v=228';
import { createGameBackgrounds, MODEL_SOURCES } from './game-backgrounds.js?v=244';
import { createMonochromeImageBlock } from './image-block.js?v=236';
import { createPromoRenderer } from './renderer.js?v=232';
import { createRichTextEditor } from './rich-text-editor.js?v=228';
import { populateTemplateSelect, templates } from './templates.js?v=235';

const W = 540, H = 675, EXPORT_SCALE = 2, EXPORT_W = 1080, EXPORT_H = 1350;
const LEADER_TAB_TOKEN = '[[leader-tab]]';
const canvas = document.querySelector('#preview');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const crtCanvas = document.createElement('canvas');
crtCanvas.width = EXPORT_W;
crtCanvas.height = EXPORT_H;
const exportCanvas = document.createElement('canvas');
exportCanvas.width = EXPORT_W;
exportCanvas.height = EXPORT_H;
const exportCtx = exportCanvas.getContext('2d');
exportCtx.imageSmoothingEnabled = false;
const controls = Object.fromEntries(['headline', 'headerEditor', 'detail', 'detailEditor', 'detailToggle', 'detailFont', 'detailScale', 'body', 'bodyEditor', 'bodyScale', 'footer', 'footerEditor', 'footerScale', 'hours', 'hoursEditor', 'hoursToggle', 'cta', 'ctaEditor', 'ctaToggle', 'ctaFont', 'ctaScale', 'font', 'headerFont', 'headerScale', 'footerFont', 'logo', 'classic', 'imageFile', 'imageUrl', 'imageUrlLoad', 'imageClear', 'imageResolution', 'imageResolutionOutput', 'imageThreshold', 'imageThresholdOutput', 'imageAutoThreshold', 'imageContrast', 'imageContrastOutput', 'imageDither', 'imageDitherAmount', 'imageDitherAmountOutput', 'imageColor', 'imageAlign', 'imageScale', 'imageScaleOutput', 'imageOpacity', 'imageOpacityOutput', 'imageInvert', 'theme', 'themePreview', 'template', 'gameStyle', 'modelField', 'model', 'modelEdgeAngle', 'modelEdgeAngleOutput', 'modelDetail', 'modelDetailOutput', 'modelOpacity', 'modelOpacityOutput', 'boundaries', 'crtLook', 'crt', 'crtCurve', 'crtRgb', 'crtScanline', 'crtMask', 'crtVignette', 'crtDrift', 'crtBloom', 'crtGlow', 'composerTitle', 'projectSave', 'projectLoad', 'projectFile', 'png', 'record', 'status'].map(id => [id, document.querySelector(`#${id}`)]));
controls.glyphGrid = document.querySelector('#glyph-grid');
controls.projectSave.disabled = true;
controls.projectLoad.disabled = true;
const animationState = { time: 0 };
const crtPipeline = createCrtPipeline({
  sourceCanvas: canvas, outputCanvas: crtCanvas, sourceWidth: W, sourceHeight: H, outputWidth: EXPORT_W, outputHeight: EXPORT_H,
  getTreatment: () => controls.crt.value,
  getSetting: name => Number(controls[CRT_CONTROL_IDS[name]].value) / 100,
  getTime: () => animationState.time
});
const SCALE_STEPS = [1, 2, 4];
const MP4_MIME_TYPES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4'];
const BODY_BORDER_GLYPHS = { square: 'petscii-upper-70', rounded: 'petscii-upper-55' };
const PROJECT_FORMAT = 'gk-promo-project';
const PROJECT_VERSION = 1;
const PROJECT_FONT_CONTROLS = ['font', 'headerFont', 'detailFont', 'ctaFont', 'footerFont'];
const PROJECT_SCALE_CONTROLS = ['headerScale', 'detailScale', 'bodyScale', 'ctaScale', 'footerScale'];
const PROJECT_COPY_CONTROLS = { header: 'headline', detail: 'detail', body: 'body', cta: 'cta', hours: 'hours', footer: 'footer' };
const DEFAULT_SECTION_ORDER = ['logo', 'image', 'header', 'detail', 'body', 'cta', 'footer'];
const DEFAULT_IMAGE_SETTINGS = { resolution: 64, threshold: 128, contrast: 115, dither: 'bayer4', ditherAmount: 60, color: 'accent', align: 'center', scale: 72, opacity: 100, invert: false };
const DEFAULT_MODEL_SETTINGS = { edgeThreshold: 1, targetVertices: 500, opacity: 48 };
const DEFAULT_MODEL_ID = 'asteroids';
const CUSTOM_TEMPLATE_ID = '__custom_project__';
let sectionOrder = [...DEFAULT_SECTION_ORDER];
controls.model.replaceChildren(...Object.entries(MODEL_SOURCES).map(([id, source]) => new Option(source.label, id)));
controls.model.value = DEFAULT_MODEL_ID;
let activeModelSettings = { ...DEFAULT_MODEL_SETTINGS };
let modelSettingsTimer = null;
function readModelSettings() { return { edgeThreshold: Number(controls.modelEdgeAngle.value), targetVertices: Number(controls.modelDetail.value), opacity: Number(controls.modelOpacity.value) }; }
function syncModelSettings() {
  controls.modelEdgeAngleOutput.textContent = `${controls.modelEdgeAngle.value} deg`;
  controls.modelDetailOutput.textContent = `${controls.modelDetail.value} vertices`;
  controls.modelOpacityOutput.textContent = `${controls.modelOpacity.value}%`;
}
function scheduleModelSettings() {
  syncModelSettings();
  if (modelSettingsTimer !== null) clearTimeout(modelSettingsTimer);
  modelSettingsTimer = setTimeout(() => { activeModelSettings = readModelSettings(); modelSettingsTimer = null; }, 180);
}
syncModelSettings();
function syncModelField() {
  const visible = controls.gameStyle.value === 'model';
  controls.modelField.hidden = !visible;
  controls.model.disabled = !visible;
}
syncModelField();
controls.gameStyle.addEventListener('change', syncModelField);
function textScale(controlName) { return SCALE_STEPS[Number(controls[controlName].value)] || 1; }
function syncCrtControls() {
  Object.entries(CRT_CONTROL_IDS).forEach(([name, controlName]) => {
    document.querySelector(`[data-crt-output="${name}"]`).textContent = `${controls[controlName].value}%`;
  });
}
function applyCrtLook(name) {
  const look = CRT_LOOKS[name];
  if (!look) return;
  controls.crt.value = look.treatment;
  Object.entries(look.controls).forEach(([controlName, value]) => { controls[CRT_CONTROL_IDS[controlName]].value = value; });
  syncCrtControls();
}
function syncScaleOutput(controlName) {
  document.querySelectorAll(`[data-scale-toggle="${controlName}"] [data-scale-value]`).forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.scaleValue === controls[controlName].value));
  });
}
const colors = {
  yuNo: { background: '#12131c', text: '#c7d4f2', highlight: '#f6e6a6', shadow: '#70405a', accent: '#e7855b', muted: '#59637a' },
  neon: { background: '#071722', text: '#9be7e5', highlight: '#f8e9a7', shadow: '#654a88', accent: '#ea759d', muted: '#386574' },
  pulse: { background: '#1a1020', text: '#f0c7de', highlight: '#c7eeb8', shadow: '#6a3e66', accent: '#6fcbc1', muted: '#7d537a' },
  solar: { background: '#1a150d', text: '#f2d89c', highlight: '#cfefa7', shadow: '#774c3b', accent: '#e76f51', muted: '#71654b' },
  emerald: { background: '#07130e', text: '#b9f6c7', highlight: '#f4ffd6', shadow: '#1e5c45', accent: '#35d07f', muted: '#4f9270' },
  cobalt: { background: '#101427', text: '#d9e2ff', highlight: '#ffd56a', shadow: '#394b87', accent: '#5b8cff', muted: '#7181ad' }
};
function syncThemePreview() {
  const palette = colors[controls.theme.value];
  const values = Object.entries(palette);
  controls.themePreview.replaceChildren(...values.map(([name, value]) => {
    const swatch = document.createElement('span');
    swatch.className = 'palette-swatch'; swatch.style.backgroundColor = value; swatch.title = `${name}: ${value}`;
    return swatch;
  }));
  controls.themePreview.setAttribute('aria-label', `Current color theme: ${values.map(([name, value]) => `${name} ${value}`).join(', ')}`);
  controls.glyphGrid?.querySelectorAll('.glyph-tile').forEach(tile => {
    const glyphData = legacyGlyphs.get(tile.dataset.glyphId);
    if (glyphData) drawGlyphTile(tile.querySelector('canvas'), glyphData);
  });
  drawBorderGlyphPreviews();
}
const logoImages = Object.fromEntries(Object.entries({
  pixel: './assets/images/gklogo.png',
  plain: './assets/images/gklogoplain.png',
  gradient: './assets/images/gklogogradient.png',
  classic: './assets/images/classicarcade.png'
}).map(([name, source]) => { const image = new Image(); image.src = source; return [name, image]; }));
const moonLanderImages = Object.fromEntries(Object.entries({
  mountain: './assets/images/mlmtn.png',
  city: './assets/images/mlcity.png'
}).map(([name, source]) => { const image = new Image(); image.src = source; return [name, image]; }));
let bodyFont = null, headerFont = null, detailFont = null, ctaFont = null, footerFont = null, hoursFont = null, titleFont = null;
const contentVisibility = { detail: true, cta: false, hours: true };
const scrollModes = { detail: 'off', hours: 'reveal' };
const textAlignments = { header: 'center', detail: 'center', body: 'left', cta: 'center', footer: 'center' };
const textVerticalAlignments = { header: 'center', detail: 'top', body: 'center', cta: 'top', footer: 'bottom' };
let bodyBorderStyle = 'none';
function getImageSettings() {
  return {
    resolution: Number(controls.imageResolution.value),
    threshold: Number(controls.imageThreshold.value),
    contrast: Number(controls.imageContrast.value),
    dither: controls.imageDither.value,
    ditherAmount: Number(controls.imageDitherAmount.value),
    color: controls.imageColor.value,
    align: controls.imageAlign.value,
    scale: Number(controls.imageScale.value),
    opacity: Number(controls.imageOpacity.value),
    invert: controls.imageInvert.checked
  };
}
function setImageSettings(settings = DEFAULT_IMAGE_SETTINGS) {
  controls.imageResolution.value = settings.resolution; controls.imageThreshold.value = settings.threshold;
  controls.imageContrast.value = settings.contrast; controls.imageDither.value = settings.dither;
  controls.imageDitherAmount.value = settings.ditherAmount; controls.imageColor.value = settings.color;
  controls.imageAlign.value = settings.align; controls.imageScale.value = settings.scale;
  controls.imageOpacity.value = settings.opacity; controls.imageInvert.checked = settings.invert;
  syncImageControls();
}
function syncImageControls() {
  controls.imageResolutionOutput.textContent = `${controls.imageResolution.value} PX`;
  controls.imageThresholdOutput.textContent = controls.imageThreshold.value;
  controls.imageContrastOutput.textContent = `${controls.imageContrast.value}%`;
  controls.imageDitherAmountOutput.textContent = `${controls.imageDitherAmount.value}%`;
  controls.imageScaleOutput.textContent = `${controls.imageScale.value}%`;
  controls.imageOpacityOutput.textContent = `${controls.imageOpacity.value}%`;
  controls.imageDitherAmount.disabled = controls.imageDither.value === 'none';
}
populateTemplateSelect(controls.template);
const legacyGlyphs = new Map();
const { loadFont, populateFonts, loadSelectedFont, renderFontPickers } = createFontManager({
  controls,
  onFontChange: () => promoRenderer.clearFontCaches(),
  onFontLoaded: (target, font) => {
    if (target === 'header') headerFont = font;
    else if (target === 'detail') detailFont = font;
    else if (target === 'cta') ctaFont = font;
    else if (target === 'footer') footerFont = font;
    else if (target === 'hours') hoursFont = font;
    else if (target === 'title') { titleFont = font; renderComposerTitle(); }
    else bodyFont = font;
  }
});
let recording = false;
const gameBackgrounds = createGameBackgrounds({ context: ctx, width: W, height: H, images: moonLanderImages, getStyle: () => controls.gameStyle.value, getModel: () => controls.model.value, getModelSettings: () => activeModelSettings });
controls.modelEdgeAngle.addEventListener('input', scheduleModelSettings); controls.modelDetail.addEventListener('input', scheduleModelSettings); controls.modelOpacity.addEventListener('input', scheduleModelSettings);
const imageBlock = createMonochromeImageBlock({
  getSettings: getImageSettings,
  onChange: () => {
    controls.imageClear.disabled = !imageBlock.hasImage();
    controls.imageAutoThreshold.disabled = !imageBlock.hasImage();
  }
});
const promoRenderer = createPromoRenderer({
  context: ctx, canvas, exportContext: exportCtx, width: W, height: H, exportScale: EXPORT_SCALE,
  controls, colors, logoImages, legacyGlyphs, gameBackgrounds, imageBlock, crtPipeline, contentVisibility, scrollModes,
  textAlignments, textVerticalAlignments, getBodyBorderStyle: () => bodyBorderStyle,
  getFonts: () => ({ body: bodyFont, header: headerFont, detail: detailFont, cta: ctaFont, footer: footerFont, hours: hoursFont }),
  getTextScale: textScale, getSectionOrder: () => sectionOrder, animationState, leaderTabToken: LEADER_TAB_TOKEN
});
const rightDock = document.querySelector('.right-dock');
function normalizeSectionOrder(value) {
  if (!Array.isArray(value) || new Set(value).size !== value.length) return null;
  if (value.length === DEFAULT_SECTION_ORDER.length && value.every(section => DEFAULT_SECTION_ORDER.includes(section))) return [...value];
  const legacySections = DEFAULT_SECTION_ORDER.filter(section => section !== 'image');
  if (value.length !== legacySections.length || !value.every(section => legacySections.includes(section))) return null;
  const normalized = [...value];
  normalized.splice(normalized.indexOf('logo') + 1, 0, 'image');
  return normalized;
}
function syncSectionOrder(order = DEFAULT_SECTION_ORDER) {
  sectionOrder = normalizeSectionOrder(order) || [...DEFAULT_SECTION_ORDER];
  const sections = new Map([...rightDock.querySelectorAll('[data-composite-section]')].map(section => [section.dataset.compositeSection, section]));
  sectionOrder.forEach(sectionName => rightDock.append(sections.get(sectionName)));
  sectionOrder.forEach((sectionName, index) => {
    const summary = sections.get(sectionName).querySelector('summary');
    summary.setAttribute('aria-label', `${summary.querySelector('span:last-child').textContent}, composition item ${index + 1} of ${sectionOrder.length}. Drag or use Alt plus arrow keys to reorder.`);
    summary.setAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
  });
}
function clearSectionDropTargets() {
  rightDock.querySelectorAll('.drop-before, .drop-after').forEach(section => section.classList.remove('drop-before', 'drop-after'));
}
function moveSection(sectionName, targetName, placeAfter) {
  const nextOrder = sectionOrder.filter(name => name !== sectionName);
  const targetIndex = nextOrder.indexOf(targetName);
  nextOrder.splice(targetIndex + (placeAfter ? 1 : 0), 0, sectionName);
  syncSectionOrder(nextOrder);
  controls.status.textContent = `${sectionName.toUpperCase()} moved to composition position ${sectionOrder.indexOf(sectionName) + 1}.`;
}
rightDock.addEventListener('dragstart', event => {
  const summary = event.target.closest('[data-composite-section] > summary');
  if (!summary) return;
  const section = summary.parentElement;
  section.classList.add('is-dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', section.dataset.compositeSection);
});
rightDock.addEventListener('dragover', event => {
  const target = event.target.closest('[data-composite-section]');
  const dragging = rightDock.querySelector('.is-dragging');
  if (!target || !dragging || target === dragging) return;
  event.preventDefault();
  clearSectionDropTargets();
  target.classList.add(event.clientY >= target.getBoundingClientRect().top + target.offsetHeight / 2 ? 'drop-after' : 'drop-before');
});
rightDock.addEventListener('drop', event => {
  const target = event.target.closest('[data-composite-section]');
  const dragging = rightDock.querySelector('.is-dragging');
  if (!target || !dragging || target === dragging) return;
  event.preventDefault();
  moveSection(dragging.dataset.compositeSection, target.dataset.compositeSection, target.classList.contains('drop-after'));
  dragging.classList.remove('is-dragging');
  clearSectionDropTargets();
});
rightDock.addEventListener('dragend', () => {
  rightDock.querySelector('.is-dragging')?.classList.remove('is-dragging');
  clearSectionDropTargets();
});
rightDock.addEventListener('keydown', event => {
  if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
  const summary = event.target.closest('[data-composite-section] > summary');
  if (!summary) return;
  const sectionName = summary.parentElement.dataset.compositeSection;
  const currentIndex = sectionOrder.indexOf(sectionName);
  const nextIndex = currentIndex + (event.key === 'ArrowUp' ? -1 : 1);
  if (nextIndex < 0 || nextIndex >= sectionOrder.length) return;
  event.preventDefault();
  const nextOrder = [...sectionOrder];
  [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
  syncSectionOrder(nextOrder);
  summary.focus();
  controls.status.textContent = `${sectionName.toUpperCase()} moved to composition position ${nextIndex + 1}.`;
});
syncSectionOrder();
['imageResolution', 'imageThreshold', 'imageContrast', 'imageDitherAmount'].forEach(controlName => {
  controls[controlName].addEventListener('input', () => { syncImageControls(); imageBlock.process(); });
});
controls.imageDither.addEventListener('change', () => { syncImageControls(); imageBlock.process(); });
controls.imageInvert.addEventListener('change', () => imageBlock.process());
controls.imageAutoThreshold.addEventListener('click', () => {
  controls.imageThreshold.value = imageBlock.getSuggestedThreshold();
  syncImageControls(); imageBlock.process();
  controls.status.textContent = `Threshold set to ${controls.imageThreshold.value}.`;
});
['imageScale', 'imageOpacity'].forEach(controlName => controls[controlName].addEventListener('input', syncImageControls));
async function loadImageSource(loader, successMessage) {
  resetImageClearConfirmation();
  controls.imageFile.disabled = true; controls.imageUrlLoad.disabled = true; controls.imageClear.disabled = true; controls.imageAutoThreshold.disabled = true;
  try {
    await loader();
    controls.status.textContent = successMessage;
  } catch (error) {
    controls.status.textContent = `Could not load image: ${error.message}`;
  } finally {
    controls.imageFile.disabled = false; controls.imageUrlLoad.disabled = false;
    controls.imageClear.disabled = !imageBlock.hasImage(); controls.imageAutoThreshold.disabled = !imageBlock.hasImage();
  }
}
controls.imageFile.addEventListener('change', () => {
  const [file] = controls.imageFile.files;
  if (!file) return;
  loadImageSource(() => imageBlock.loadFile(file), `Image loaded: ${file.name}`);
});
function loadImageUrl() {
  const url = controls.imageUrl.value.trim();
  if (!url) { controls.status.textContent = 'Enter an image URL first.'; return; }
  loadImageSource(() => imageBlock.loadUrl(url), 'Remote image loaded.');
}
controls.imageUrlLoad.addEventListener('click', loadImageUrl);
controls.imageUrl.addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  event.preventDefault(); loadImageUrl();
});
const imageClearLabel = controls.imageClear.textContent;
let imageClearConfirmTimer = null;
function resetImageClearConfirmation() {
  if (imageClearConfirmTimer !== null) { clearTimeout(imageClearConfirmTimer); imageClearConfirmTimer = null; }
  controls.imageClear.classList.remove('is-confirming');
  controls.imageClear.removeAttribute('aria-label');
  controls.imageClear.textContent = imageClearLabel;
  delete controls.imageClear.dataset.confirming;
}
controls.imageClear.addEventListener('click', () => {
  if (controls.imageClear.dataset.confirming === 'true') {
    resetImageClearConfirmation();
    imageBlock.clear(); controls.imageFile.value = ''; controls.imageUrl.value = '';
    controls.status.textContent = 'Image block cleared.';
    return;
  }
  controls.imageClear.dataset.confirming = 'true';
  controls.imageClear.classList.add('is-confirming');
  controls.imageClear.setAttribute('aria-label', 'Confirm clearing image');
  controls.imageClear.textContent = 'ARE YOU SURE?';
  controls.status.textContent = 'Click ARE YOU SURE? again to clear the image.';
  imageClearConfirmTimer = setTimeout(resetImageClearConfirmation, 2800);
});
syncImageControls();
function drawBorderGlyphPreviews() {
  document.querySelectorAll('[data-border-style]').forEach(button => {
    const glyphData = legacyGlyphs.get(BODY_BORDER_GLYPHS[button.dataset.borderStyle]);
    const glyphCanvas = button.querySelector('canvas');
    if (glyphData && glyphCanvas) promoRenderer.drawLegacyGlyphPreview(glyphCanvas, glyphData, colors[controls.theme.value].text);
  });
}
function renderComposerTitle() {
  if (!titleFont) return;
  const title = 'GK Promo Composer';
  const canvasElement = controls.composerTitle;
  const titleContext = canvasElement.getContext('2d');
  const glyphBounds = character => {
    const index = character.codePointAt(0) - 0x20;
    let left = 8, right = -1, top = 8, bottom = -1;
    for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) {
      if ((titleFont[index * 8 + row] || 0) & (128 >> column)) { left = Math.min(left, column); right = Math.max(right, column); top = Math.min(top, row); bottom = Math.max(bottom, row); }
    }
    return right < 0 ? null : { left, right, top, bottom, width: right - left + 1 };
  };
  const layout = scale => {
    let width = 0, previousWasGlyph = false;
    const glyphs = [...title].map(character => {
      if (character === ' ') { width += 4 * scale; previousWasGlyph = false; return null; }
      const bounds = glyphBounds(character);
      if (!bounds) return null;
      if (previousWasGlyph) width += scale;
      const glyph = { character, bounds, x: width };
      width += bounds.width * scale; previousWasGlyph = true;
      return glyph;
    }).filter(Boolean);
    return { glyphs, width };
  };
  let scale = 2, titleLayout = layout(scale);
  if (titleLayout.width > canvasElement.width) { scale = 1; titleLayout = layout(scale); }
  titleContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
  titleContext.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#eaf9ff';
  const y = Math.floor((canvasElement.height - 8 * scale) / 2);
  titleLayout.glyphs.forEach(({ character, bounds, x }) => {
    const index = character.codePointAt(0) - 0x20;
    for (let row = bounds.top; row <= bounds.bottom; row++) for (let column = bounds.left; column <= bounds.right; column++) {
      if ((titleFont[index * 8 + row] || 0) & (128 >> column)) titleContext.fillRect(x + (column - bounds.left) * scale, y + row * scale, scale, scale);
    }
  });
}
const richTextEditor = createRichTextEditor({
  controls, legacyGlyphs, leaderTabToken: LEADER_TAB_TOKEN, getTextScale: textScale,
  getGlyphColor: () => colors[controls.theme.value].text,
  drawGlyphPreview: (canvasElement, glyphData, color) => promoRenderer.drawLegacyGlyphPreview(canvasElement, glyphData, color)
});
const {
  applyCharacterEffect, drawGlyphTile, hydrateBodyEditor, hydrateCtaEditor, hydrateDetailEditor,
  hydrateHeaderEditor, hydrateInlineRichEditor, insertBodyLeaderTab, loadLegacyGlyphs, syncCharacterToolAvailability, syncEffectToolbarState
} = richTextEditor;

controls.theme.addEventListener('change', syncThemePreview); syncThemePreview();
controls.crtLook.addEventListener('change', () => {
  applyCrtLook(controls.crtLook.value);
  if (controls.crtLook.value !== 'custom') controls.status.textContent = `${controls.crtLook.selectedOptions[0].textContent} CRT preset applied.`;
});
controls.crt.addEventListener('change', () => { controls.crtLook.value = 'custom'; });
Object.values(CRT_CONTROL_IDS).forEach(controlName => controls[controlName].addEventListener('input', () => { controls.crtLook.value = 'custom'; syncCrtControls(); }));
syncCrtControls();
['headerScale', 'detailScale', 'bodyScale', 'ctaScale', 'footerScale'].forEach(controlName => {
  document.querySelector(`[data-scale-toggle="${controlName}"]`).addEventListener('click', event => {
    const button = event.target.closest('[data-scale-value]');
    if (!button) return;
    controls[controlName].value = button.dataset.scaleValue;
    syncScaleOutput(controlName);
    syncCharacterToolAvailability();
  });
  syncScaleOutput(controlName);
});

let animationId = null;
function frame(now) { promoRenderer.render(now); animationId = requestAnimationFrame(frame); }
function pauseFrame() { if (animationId !== null) { cancelAnimationFrame(animationId); animationId = null; } }
function resumeFrame() { if (animationId === null && document.visibilityState === 'visible') animationId = requestAnimationFrame(frame); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') pauseFrame(); else resumeFrame(); });
function download(blob, name) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function syncDetailToggle() { const enabled = contentVisibility.detail; controls.detailToggle.setAttribute('aria-pressed', String(enabled)); controls.detailToggle.textContent = enabled ? 'ON' : 'OFF'; }
controls.detailToggle.addEventListener('click', () => { contentVisibility.detail = !contentVisibility.detail; syncDetailToggle(); }); syncDetailToggle();
function syncCtaToggle() { const enabled = contentVisibility.cta; controls.ctaToggle.setAttribute('aria-pressed', String(enabled)); controls.ctaToggle.textContent = enabled ? 'ON' : 'OFF'; }
controls.ctaToggle.addEventListener('click', () => { contentVisibility.cta = !contentVisibility.cta; syncCtaToggle(); }); syncCtaToggle();
function syncHoursToggle() { const enabled = contentVisibility.hours; controls.hoursToggle.setAttribute('aria-pressed', String(enabled)); controls.hoursToggle.textContent = enabled ? 'ON' : 'OFF'; }
controls.hoursToggle.addEventListener('click', () => { contentVisibility.hours = !contentVisibility.hours; syncHoursToggle(); }); syncHoursToggle();
function syncScrollModes() {
  document.querySelectorAll('[data-scroll-mode]').forEach(control => {
    const section = control.dataset.scrollMode;
    control.querySelectorAll('[data-scroll-value]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scrollValue === scrollModes[section])));
  });
}
document.querySelectorAll('[data-scroll-mode]').forEach(control => {
  control.addEventListener('click', event => {
    const button = event.target.closest('[data-scroll-value]'); if (!button) return;
    scrollModes[control.dataset.scrollMode] = button.dataset.scrollValue; syncScrollModes();
  });
});
syncScrollModes();
function syncBodyBorderControls() {
  document.querySelectorAll('[data-border-toolbar="body"] [data-border-style]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.borderStyle === bodyBorderStyle)));
}
function projectRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value;
}
function projectString(value, label) {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  return value;
}
function projectBoolean(value, label) {
  if (typeof value !== 'boolean') throw new Error(`${label} must be true or false.`);
  return value;
}
function projectChoice(value, choices, label) {
  const selected = projectString(value, label);
  if (!choices.includes(selected)) throw new Error(`${label} is not supported by this composer.`);
  return selected;
}
function projectInteger(value, minimum, maximum, label) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${label} must be a whole number between ${minimum} and ${maximum}.`);
  return value;
}
function projectSectionOrder(value) {
  if (value === undefined) return [...DEFAULT_SECTION_ORDER];
  const normalized = normalizeSectionOrder(value);
  if (!normalized) throw new Error('Composition order must contain each section exactly once.');
  return normalized;
}
function projectImageSettings(value) {
  if (value === undefined) return { ...DEFAULT_IMAGE_SETTINGS, source: { dataUrl: '', name: '' } };
  const image = projectRecord(value, 'Image settings');
  const source = projectRecord(image.source, 'Image source');
  const dataUrl = projectString(source.dataUrl, 'Image source data');
  const name = projectString(source.name, 'Image source name');
  if (dataUrl && (!/^data:image\/(?:avif|bmp|gif|jpeg|png|webp|x-icon);base64,/i.test(dataUrl) || dataUrl.length > 12_000_000)) throw new Error('Image source data is not a supported embedded image.');
  if (name.length > 260) throw new Error('Image source name is too long.');
  return {
    resolution: projectInteger(image.resolution, 8, 160, 'Image resolution'),
    threshold: projectInteger(image.threshold, 0, 255, 'Image threshold'),
    contrast: projectInteger(image.contrast, 50, 200, 'Image contrast'),
    dither: projectChoice(image.dither, ['none', 'bayer2', 'bayer4', 'floyd', 'atkinson'], 'Image dither'),
    ditherAmount: projectInteger(image.ditherAmount, 0, 100, 'Image dither amount'),
    color: projectChoice(image.color, ['accent', 'text', 'highlight', 'muted'], 'Image ink'),
    align: projectChoice(image.align, ['left', 'center', 'right'], 'Image alignment'),
    scale: projectInteger(image.scale, 20, 100, 'Image display width'),
    opacity: projectInteger(image.opacity, 10, 100, 'Image opacity'),
    invert: projectBoolean(image.invert, 'Image inversion'),
    source: { dataUrl, name }
  };
}
function selectedFontName(controlName) {
  return controls[controlName].selectedOptions[0]?.textContent || '';
}
function setCustomProjectTemplate() {
  let option = [...controls.template.options].find(item => item.value === CUSTOM_TEMPLATE_ID);
  if (!option) {
    option = new Option('CUSTOM PROJECT', CUSTOM_TEMPLATE_ID);
    controls.template.add(option, 0);
  }
  controls.template.value = CUSTOM_TEMPLATE_ID;
}
function createProject() {
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    copy: Object.fromEntries(Object.entries(PROJECT_COPY_CONTROLS).map(([name, controlName]) => [name, controls[controlName].value])),
    settings: {
      theme: controls.theme.value,
      gameStyle: controls.gameStyle.value,
      model: controls.model.value,
      modelEdgeAngle: Number(controls.modelEdgeAngle.value),
      modelDetail: Number(controls.modelDetail.value),
      modelOpacity: Number(controls.modelOpacity.value),
      logo: controls.logo.value,
      classic: controls.classic.checked,
      boundaries: controls.boundaries.checked,
      crt: {
        look: controls.crtLook.value,
        mode: controls.crt.value,
        controls: Object.fromEntries(Object.entries(CRT_CONTROL_IDS).map(([name, controlName]) => [name, Number(controls[controlName].value)]))
      },
      fonts: Object.fromEntries(PROJECT_FONT_CONTROLS.map(controlName => [controlName, selectedFontName(controlName)])),
      scales: Object.fromEntries(PROJECT_SCALE_CONTROLS.map(controlName => [controlName, controls[controlName].value])),
      alignments: { ...textAlignments },
      verticalAlignments: { ...textVerticalAlignments },
      visibility: { ...contentVisibility },
      scrollModes: { ...scrollModes },
      sectionOrder: [...sectionOrder],
      image: { ...getImageSettings(), source: imageBlock.getSourceState() },
      bodyBorder: bodyBorderStyle
    }
  };
}
function validateProject(value) {
  const project = projectRecord(value, 'Project');
  if (project.format !== PROJECT_FORMAT) throw new Error('This is not a GK Promo project file.');
  if (project.version !== PROJECT_VERSION) throw new Error(`Project version ${project.version ?? 'unknown'} is not supported.`);
  const copy = projectRecord(project.copy, 'Project copy');
  const settings = projectRecord(project.settings, 'Project settings');
  const crt = projectRecord(settings.crt, 'CRT settings');
  const projectFonts = projectRecord(settings.fonts, 'Font settings');
  const projectScales = projectRecord(settings.scales, 'Text scale settings');
  const alignments = projectRecord(settings.alignments, 'Text alignment settings');
  const verticalAlignments = projectRecord(settings.verticalAlignments, 'Vertical alignment settings');
  const visibility = projectRecord(settings.visibility, 'Visibility settings');
  const projectScrollModes = projectRecord(settings.scrollModes, 'Scrolling settings');
  const validSelectValues = controlName => [...controls[controlName].options].map(option => option.value);
  const validatedCrtControls = {};
  Object.entries(CRT_CONTROL_IDS).forEach(([name, controlName]) => {
    const number = crt.controls?.[name];
    const control = controls[controlName];
    if (!Number.isInteger(number) || number < Number(control.min) || number > Number(control.max)) throw new Error(`CRT ${name} must be a whole number between ${control.min} and ${control.max}.`);
    validatedCrtControls[name] = number;
  });
  const validatedFonts = {};
  PROJECT_FONT_CONTROLS.forEach(controlName => {
    const fontName = projectChoice(projectFonts[controlName], [...controls[controlName].options].map(option => option.textContent), `${controlName} font`);
    validatedFonts[controlName] = fontName;
  });
  const validatedScales = {};
  PROJECT_SCALE_CONTROLS.forEach(controlName => { validatedScales[controlName] = projectChoice(projectScales[controlName], ['0', '1', '2'], `${controlName} scale`); });
  const validatedCopy = {};
  Object.keys(PROJECT_COPY_CONTROLS).forEach(name => { validatedCopy[name] = projectString(copy[name], `${name} copy`); });
  const legacyWireframe = settings.gameStyle === 'wireframe';
  return {
    copy: validatedCopy,
    settings: {
      theme: projectChoice(settings.theme, Object.keys(colors), 'Color theme'),
      gameStyle: projectChoice(legacyWireframe ? 'model' : settings.gameStyle, validSelectValues('gameStyle'), 'Background style'),
      model: projectChoice(settings.model || (legacyWireframe ? 'ironman' : DEFAULT_MODEL_ID), validSelectValues('model'), '3D model'),
      modelEdgeAngle: projectInteger(settings.modelEdgeAngle ?? DEFAULT_MODEL_SETTINGS.edgeThreshold, 1, 45, 'Model edge angle'),
      modelDetail: projectInteger(settings.modelDetail ?? DEFAULT_MODEL_SETTINGS.targetVertices, 100, 1200, 'Model mesh detail'),
      modelOpacity: projectInteger(settings.modelOpacity ?? DEFAULT_MODEL_SETTINGS.opacity, 0, 100, 'Model opacity'),
      logo: projectChoice(settings.logo, ['pixel', 'plain', 'gradient', 'classic'], 'Logo'),
      classic: projectBoolean(settings.classic, 'Classic Arcade'),
      boundaries: projectBoolean(settings.boundaries, 'Text boundaries'),
      crt: {
        look: projectChoice(crt.look, validSelectValues('crtLook'), 'CRT preset'),
        mode: projectChoice(crt.mode, validSelectValues('crt'), 'CRT mode'),
        controls: validatedCrtControls
      },
      fonts: validatedFonts,
      scales: validatedScales,
      alignments: {
        header: projectChoice(alignments.header, ['left', 'center', 'right'], 'Header alignment'), detail: projectChoice(alignments.detail, ['left', 'center', 'right'], 'Detail alignment'),
        body: projectChoice(alignments.body, ['left', 'center', 'right'], 'Body alignment'), cta: projectChoice(alignments.cta, ['left', 'center', 'right'], 'Call to action alignment'), footer: projectChoice(alignments.footer, ['left', 'center', 'right'], 'Footer alignment')
      },
      verticalAlignments: {
        header: projectChoice(verticalAlignments.header, ['top', 'center', 'bottom'], 'Header vertical alignment'), detail: projectChoice(verticalAlignments.detail, ['top', 'center', 'bottom'], 'Detail vertical alignment'),
        body: projectChoice(verticalAlignments.body, ['top', 'center', 'bottom'], 'Body vertical alignment'), cta: projectChoice(verticalAlignments.cta, ['top', 'center', 'bottom'], 'Call to action vertical alignment'), footer: projectChoice(verticalAlignments.footer, ['top', 'center', 'bottom'], 'Footer vertical alignment')
      },
      visibility: {
        detail: projectBoolean(visibility.detail, 'Detail visibility'), cta: projectBoolean(visibility.cta, 'Call to action visibility'), hours: projectBoolean(visibility.hours, 'Hours visibility')
      },
      scrollModes: {
        detail: projectChoice(projectScrollModes.detail, ['off', 'ticker', 'reveal'], 'Detail scroll mode'), hours: projectChoice(projectScrollModes.hours, ['off', 'ticker', 'reveal'], 'Hours scroll mode')
      },
      sectionOrder: projectSectionOrder(settings.sectionOrder),
      image: projectImageSettings(settings.image),
      bodyBorder: projectChoice(settings.bodyBorder, ['none', 'square', 'rounded'], 'Body border')
    }
  };
}
async function applyProject(project) {
  const { copy, settings } = validateProject(project);
  controls.theme.value = settings.theme; controls.gameStyle.value = settings.gameStyle; controls.model.value = settings.model; controls.modelEdgeAngle.value = settings.modelEdgeAngle; controls.modelDetail.value = settings.modelDetail; controls.modelOpacity.value = settings.modelOpacity; activeModelSettings = readModelSettings(); syncModelSettings(); controls.logo.value = settings.logo;
  syncModelField();
  controls.classic.checked = settings.classic; controls.boundaries.checked = settings.boundaries;
  controls.crtLook.value = settings.crt.look; controls.crt.value = settings.crt.mode;
  Object.entries(settings.crt.controls).forEach(([name, value]) => { controls[CRT_CONTROL_IDS[name]].value = value; });
  Object.entries(PROJECT_COPY_CONTROLS).forEach(([name, controlName]) => { controls[controlName].value = copy[name]; });
  Object.entries(settings.scales).forEach(([controlName, value]) => { controls[controlName].value = value; });
  Object.assign(textAlignments, settings.alignments); Object.assign(textVerticalAlignments, settings.verticalAlignments);
  Object.assign(contentVisibility, settings.visibility); Object.assign(scrollModes, settings.scrollModes); syncSectionOrder(settings.sectionOrder); bodyBorderStyle = settings.bodyBorder;
  setImageSettings(settings.image); controls.imageFile.value = ''; controls.imageUrl.value = '';
  const imageLoad = settings.image.source.dataUrl ? imageBlock.loadProjectSource(settings.image.source.dataUrl, settings.image.source.name) : Promise.resolve(imageBlock.clear());
  PROJECT_FONT_CONTROLS.forEach(controlName => {
    const option = [...controls[controlName].options].find(item => item.textContent === settings.fonts[controlName]);
    controls[controlName].value = option.value;
  });
  syncCrtControls(); PROJECT_SCALE_CONTROLS.forEach(syncScaleOutput); syncThemePreview(); syncDetailToggle(); syncCtaToggle(); syncHoursToggle(); syncScrollModes(); syncCharacterToolAvailability(); syncBodyBorderControls();
  renderFontPickers(); hydrateBodyEditor(); hydrateHeaderEditor(); hydrateDetailEditor(); hydrateCtaEditor(); hydrateInlineRichEditor('hours'); hydrateInlineRichEditor('footer'); syncEffectToolbarState(); setCustomProjectTemplate();
  await Promise.all([imageLoad, ...PROJECT_FONT_CONTROLS.map(controlName => loadSelectedFont(controlName, { font: 'body', headerFont: 'header', detailFont: 'detail', ctaFont: 'cta', footerFont: 'footer' }[controlName], false))]);
}
async function applyTemplate(template) {
  controls.theme.value = template.theme; controls.gameStyle.value = template.gameStyle || 'asteroids'; controls.model.value = template.model || DEFAULT_MODEL_ID; controls.logo.value = template.logo || 'pixel'; controls.classic.checked = template.classic;
  syncModelField();
  controls.boundaries.checked = template.boundaries; controls.crtLook.value = 'custom'; controls.crt.value = template.crt || 'off';
  Object.entries(template.crtControls || {}).forEach(([name, value]) => { controls[CRT_CONTROL_IDS[name]].value = value; }); syncCrtControls();
  controls.headline.value = template.headline; controls.detail.value = template.detail; controls.body.value = template.body;
  controls.cta.value = template.cta; controls.hours.value = template.hours; controls.footer.value = template.footer;
  Object.entries(template.scales).forEach(([controlName, value]) => { controls[controlName].value = value; syncScaleOutput(controlName); });
  Object.assign(textAlignments, template.alignments); Object.assign(textVerticalAlignments, template.verticalAlignments); Object.assign(contentVisibility, template.visibility); Object.assign(scrollModes, template.scrollModes || {}); syncSectionOrder(template.sectionOrder || DEFAULT_SECTION_ORDER); bodyBorderStyle = template.bodyBorder || 'none';
  setImageSettings({ ...DEFAULT_IMAGE_SETTINGS, ...(template.image || {}) }); imageBlock.clear(); controls.imageFile.value = ''; controls.imageUrl.value = '';
  const imageLoad = template.image?.source ? imageBlock.loadBundledSource(template.image.source, template.image.sourceName) : Promise.resolve();
  document.querySelectorAll('[data-toolbar]').forEach(toolbar => {
    const section = toolbar.dataset.toolbar;
    toolbar.querySelectorAll('[data-vertical-alignment]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.verticalAlignment === textVerticalAlignments[section])));
    toolbar.querySelectorAll('[data-alignment]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.alignment === textAlignments[section])));
  });
  syncThemePreview(); syncDetailToggle(); syncCtaToggle(); syncHoursToggle(); syncScrollModes(); syncCharacterToolAvailability(); syncBodyBorderControls(); renderFontPickers(); hydrateBodyEditor(); hydrateHeaderEditor(); hydrateDetailEditor(); hydrateCtaEditor(); hydrateInlineRichEditor('hours'); hydrateInlineRichEditor('footer'); syncEffectToolbarState();
  await Promise.all([imageLoad, ...Object.entries(template.fonts).map(([controlName, fontName]) => {
    const option = [...controls[controlName].options].find(item => item.textContent === fontName);
    if (!option) return Promise.resolve();
    controls[controlName].value = option.value;
    const target = { font: 'body', headerFont: 'header', detailFont: 'detail', ctaFont: 'cta', footerFont: 'footer' }[controlName];
    return loadSelectedFont(controlName, target, false);
  })]);
}
controls.template.addEventListener('change', () => {
  applyTemplate(templates[controls.template.value]).then(() => { controls.status.textContent = `${controls.template.selectedOptions[0].textContent} template loaded.`; }).catch(error => { controls.status.textContent = `Could not load template: ${error.message}`; });
});
function populateToolbars() {
  document.querySelectorAll('.toolbar-toggles').forEach(toolbar => {
    const section = toolbar.dataset.toolbar;
    const buttons = Array.from({ length: 7 }, (_, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'toolbar-toggle';
      if (index < 3) {
        const alignment = ['top', 'center', 'bottom'][index];
        const icon = { top: 'align-vertical-justify-start', center: 'align-vertical-justify-center', bottom: 'align-vertical-justify-end' }[alignment];
        button.dataset.verticalAlignment = alignment; button.title = `${section} align ${alignment}`;
        button.setAttribute('aria-label', `${section} align ${alignment}`); button.setAttribute('aria-pressed', String(textVerticalAlignments[section] === alignment));
        const iconElement = document.createElement('i'); iconElement.dataset.lucide = icon; iconElement.setAttribute('aria-hidden', 'true'); iconElement.textContent = alignment[0].toUpperCase(); button.append(iconElement);
        button.addEventListener('click', () => {
          textVerticalAlignments[section] = alignment;
          toolbar.querySelectorAll('[data-vertical-alignment]').forEach(control => control.setAttribute('aria-pressed', String(control.dataset.verticalAlignment === alignment)));
        });
      } else if (index < 6) {
        const alignment = ['left', 'center', 'right'][index - 3];
        const icon = { left: 'text-align-start', center: 'text-align-center', right: 'text-align-end' }[alignment];
        button.dataset.alignment = alignment; button.title = `${section} align ${alignment}`;
        button.setAttribute('aria-label', `${section} align ${alignment}`); button.setAttribute('aria-pressed', String(textAlignments[section] === alignment));
        const iconElement = document.createElement('i'); iconElement.dataset.lucide = icon; iconElement.setAttribute('aria-hidden', 'true'); iconElement.textContent = alignment[0].toUpperCase(); button.append(iconElement);
        button.addEventListener('click', () => {
          textAlignments[section] = alignment;
          toolbar.querySelectorAll('[data-alignment]').forEach(control => control.setAttribute('aria-pressed', String(control.dataset.alignment === alignment)));
        });
      } else if (section === 'body') {
        button.dataset.paragraphControl = 'leader-tab'; button.title = 'Insert leader tab'; button.setAttribute('aria-label', 'Insert leader tab');
        const iconElement = document.createElement('i'); iconElement.dataset.lucide = 'indent-increase'; iconElement.setAttribute('aria-hidden', 'true'); iconElement.textContent = '⇥'; button.append(iconElement);
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', insertBodyLeaderTab);
      }
      return button;
    });
    toolbar.replaceChildren(...buttons);
  });
  document.querySelectorAll('.character-buttons').forEach(toolbar => {
    const section = toolbar.dataset.characterToolbar;
    const buttons = Array.from({ length: 7 }, (_, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'character-slot';
      if (index === 0) {
        button.dataset.characterControl = 'highlight'; button.title = `${section} highlight selected text`;
        button.setAttribute('aria-label', `${section} highlight selected text`);
        const iconElement = document.createElement('i'); iconElement.dataset.lucide = 'highlighter'; iconElement.setAttribute('aria-hidden', 'true'); iconElement.textContent = 'H'; button.append(iconElement);
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => applyCharacterEffect(section, 'highlight'));
      } else if (index === 1) {
        button.dataset.characterControl = 'underline'; button.title = `${section} underline selected text`;
        button.setAttribute('aria-label', `${section} underline selected text`);
        const iconElement = document.createElement('i'); iconElement.dataset.lucide = 'underline'; iconElement.setAttribute('aria-hidden', 'true'); iconElement.textContent = 'U'; button.append(iconElement);
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => applyCharacterEffect(section, 'underline'));
      } else if (index === 2) {
        button.dataset.characterControl = 'superscript'; button.title = `${section} superscript selected text`;
        button.setAttribute('aria-label', `${section} superscript selected text`);
        const iconElement = document.createElement('i'); iconElement.dataset.lucide = 'superscript'; iconElement.setAttribute('aria-hidden', 'true'); iconElement.textContent = 'x2'; button.append(iconElement);
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => applyCharacterEffect(section, 'superscript'));
      } else if (index === 3) {
        button.dataset.characterControl = 'subscript'; button.title = `${section} subscript selected text`;
        button.setAttribute('aria-label', `${section} subscript selected text`);
        const iconElement = document.createElement('i'); iconElement.dataset.lucide = 'subscript'; iconElement.setAttribute('aria-hidden', 'true'); iconElement.textContent = 'x2'; button.append(iconElement);
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => applyCharacterEffect(section, 'subscript'));
      } else if (index === 4) {
        button.dataset.characterControl = 'stroke'; button.title = `${section} stroke selected text`;
        button.setAttribute('aria-label', `${section} stroke selected text`);
        const iconElement = document.createElement('i'); iconElement.dataset.lucide = 'type-outline'; iconElement.setAttribute('aria-hidden', 'true'); iconElement.textContent = 'O'; button.append(iconElement);
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => applyCharacterEffect(section, 'stroke'));
      } else if (index === 5) {
        button.dataset.characterControl = 'shadow'; button.title = `${section} drop shadow selected text`;
        button.setAttribute('aria-label', `${section} drop shadow selected text`);
        const iconElement = document.createElement('i'); iconElement.dataset.lucide = 'layers-2'; iconElement.setAttribute('aria-hidden', 'true'); iconElement.textContent = 'S'; button.append(iconElement);
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => applyCharacterEffect(section, 'shadow'));
      } else {
        button.title = `${section} character control ${index + 1}`; button.setAttribute('aria-label', `${section} character control ${index + 1}`);
      }
      if (button.dataset.characterControl) button.setAttribute('aria-pressed', 'false');
      return button;
    });
    toolbar.replaceChildren(...buttons);
  });
  document.querySelectorAll('.animation-buttons').forEach(toolbar => {
    const section = toolbar.dataset.animationToolbar;
    const buttons = Array.from({ length: 7 }, (_, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'animation-slot';
      if (index < 6) {
        const animation = ['blink', 'flash', 'reflect', 'wave', 'sweep', 'spin'][index];
        const icon = { blink: 'eye-off', flash: 'contrast', reflect: 'scan-line', wave: 'waves', sweep: 'move-right', spin: 'flip-horizontal-2' }[animation];
        const label = { blink: 'blink', flash: 'alternate text and highlight', reflect: 'reflect', wave: 'wave', sweep: 'sweep highlight', spin: 'spin across selected text' }[animation];
        button.dataset.animationControl = animation; button.title = `${section} ${label} selected text`;
        button.setAttribute('aria-label', `${section} ${label} selected text`);
        const iconElement = document.createElement('i'); iconElement.dataset.lucide = icon; iconElement.setAttribute('aria-hidden', 'true'); iconElement.textContent = animation[0].toUpperCase(); button.append(iconElement);
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => applyCharacterEffect(section, animation));
      } else {
        button.title = `${section} animation control ${index + 1}`; button.setAttribute('aria-label', `${section} animation control ${index + 1}`);
      }
      if (button.dataset.animationControl) button.setAttribute('aria-pressed', 'false');
      return button;
    });
    toolbar.replaceChildren(...buttons);
  });
  document.querySelectorAll('.border-buttons').forEach(toolbar => {
    const buttons = ['square', 'rounded'].map(style => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'border-option';
      button.dataset.borderStyle = style; button.title = `${style} body border`; button.setAttribute('aria-label', `${style} body border`);
      const glyphCanvas = document.createElement('canvas'); glyphCanvas.width = glyphCanvas.height = 16; glyphCanvas.setAttribute('aria-hidden', 'true'); button.append(glyphCanvas);
      button.addEventListener('click', () => { bodyBorderStyle = bodyBorderStyle === style ? 'none' : style; syncBodyBorderControls(); });
      return button;
    });
    toolbar.replaceChildren(...buttons);
  });
  drawBorderGlyphPreviews(); syncCharacterToolAvailability(); syncEffectToolbarState(); syncBodyBorderControls();
  window.lucide?.createIcons({ attrs: { width: 14, height: 14, 'stroke-width': 2 } });
}
populateToolbars();
controls.projectSave.addEventListener('click', () => {
  const blob = new Blob([`${JSON.stringify(createProject(), null, 2)}\n`], { type: 'application/json' });
  download(blob, 'gk-promo-project.gkp');
  controls.status.textContent = 'Project saved as a .gkp file.';
});
controls.projectLoad.addEventListener('click', () => controls.projectFile.click());
controls.projectFile.addEventListener('change', async () => {
  const [file] = controls.projectFile.files;
  controls.projectFile.value = '';
  if (!file) return;
  controls.projectSave.disabled = true; controls.projectLoad.disabled = true;
  try {
    await applyProject(JSON.parse(await file.text()));
    controls.status.textContent = `Project loaded: ${file.name}`;
  } catch (error) {
    controls.status.textContent = `Could not load project: ${error.message}`;
  } finally {
    controls.projectSave.disabled = false; controls.projectLoad.disabled = false;
  }
});
controls.png.addEventListener('click', () => exportCanvas.toBlob(blob => { download(blob, 'gk-promo-1080x1350.png'); controls.status.textContent = 'PNG exported at 1080 x 1350.'; }, 'image/png'));
controls.record.addEventListener('click', () => {
  if (recording || !window.MediaRecorder) return;
  const mimeType = MP4_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) { controls.status.textContent = 'This browser cannot export MP4. Use Safari on iOS or macOS.'; return; }
  const stream = exportCanvas.captureStream(30); const chunks = []; let recorder;
  try { recorder = new MediaRecorder(stream, { mimeType }); } catch (error) { stream.getTracks().forEach(track => track.stop()); controls.status.textContent = `Could not start MP4 recording: ${error.message}`; return; }
  recording = true; controls.record.textContent = 'RECORDING...';
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  recorder.onstop = () => { download(new Blob(chunks, { type: recorder.mimeType || mimeType }), 'gk-promo-1080x1350.mp4'); recording = false; controls.record.textContent = 'EXPORT 15 SEC MP4'; stream.getTracks().forEach(track => track.stop()); };
  recorder.start(); setTimeout(() => recorder.stop(), 15000);
});
async function initializeFonts() {
  try {
    const fonts = await populateFonts();
    const matinee = fonts.find(font => font.name === 'Matinee') || fonts.find(font => font.name === 'Reactor') || fonts[0];
    await Promise.all([
      ...[['font', 'body'], ['headerFont', 'header'], ['detailFont', 'detail'], ['ctaFont', 'cta'], ['footerFont', 'footer']].map(([controlName, target]) => loadSelectedFont(controlName, target, false)),
      loadFont(matinee.file, matinee.name, 'hours', false),
      loadFont('293.h', 'Precinct 90', 'title', false)
    ]);
    await applyTemplate(templates[controls.template.value]);
    controls.projectSave.disabled = false;
    controls.projectLoad.disabled = false;
    controls.status.textContent = 'Default fonts loaded.';
  } catch (error) {
    controls.status.textContent = `Font library could not load: ${error.message}`;
  }
}
hydrateHeaderEditor();
hydrateDetailEditor();
hydrateCtaEditor();
hydrateInlineRichEditor('hours');
hydrateInlineRichEditor('footer');
controls.status.textContent = 'Loading header font library...';
initializeFonts();
loadLegacyGlyphs().then(drawBorderGlyphPreviews).catch(error => { controls.glyphGrid.textContent = `Could not load glyphs: ${error.message}`; });
resumeFrame();

