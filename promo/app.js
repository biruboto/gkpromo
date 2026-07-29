import { createCrtPipeline, CRT_CONTROL_IDS, CRT_LOOKS } from './crt.js?v=225';
import { createFontManager } from './fonts.js?v=225';
import { createGameBackgrounds } from './game-backgrounds.js?v=225';
import { createPromoRenderer } from './renderer.js?v=225';
import { createRichTextEditor } from './rich-text-editor.js?v=225';
import { populateTemplateSelect, templates } from './templates.js?v=225';

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
const controls = Object.fromEntries(['headline', 'headerEditor', 'detail', 'detailEditor', 'detailToggle', 'detailFont', 'detailScale', 'body', 'bodyEditor', 'bodyScale', 'footer', 'footerEditor', 'footerScale', 'hours', 'hoursEditor', 'hoursToggle', 'cta', 'ctaEditor', 'ctaToggle', 'ctaFont', 'ctaScale', 'font', 'headerFont', 'headerScale', 'footerFont', 'logo', 'classic', 'theme', 'themePreview', 'template', 'gameStyle', 'boundaries', 'crtLook', 'crt', 'crtCurve', 'crtRgb', 'crtScanline', 'crtMask', 'crtVignette', 'crtDrift', 'crtBloom', 'crtGlow', 'projectSave', 'projectLoad', 'projectFile', 'png', 'record', 'status'].map(id => [id, document.querySelector(`#${id}`)]));
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
const CUSTOM_TEMPLATE_ID = '__custom_project__';
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
let bodyFont = null, headerFont = null, detailFont = null, ctaFont = null, footerFont = null, hoursFont = null;
const contentVisibility = { detail: true, cta: false, hours: true };
const scrollModes = { detail: 'off', hours: 'reveal' };
const textAlignments = { header: 'center', detail: 'center', body: 'left', cta: 'center', footer: 'center' };
const textVerticalAlignments = { header: 'center', detail: 'top', body: 'center', cta: 'top', footer: 'bottom' };
let bodyBorderStyle = 'none';
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
    else bodyFont = font;
  }
});
let recording = false;
const gameBackgrounds = createGameBackgrounds({ context: ctx, width: W, height: H, images: moonLanderImages, getStyle: () => controls.gameStyle.value });
const promoRenderer = createPromoRenderer({
  context: ctx, canvas, exportContext: exportCtx, width: W, height: H, exportScale: EXPORT_SCALE,
  controls, colors, logoImages, legacyGlyphs, gameBackgrounds, crtPipeline, contentVisibility, scrollModes,
  textAlignments, textVerticalAlignments, getBodyBorderStyle: () => bodyBorderStyle,
  getFonts: () => ({ body: bodyFont, header: headerFont, detail: detailFont, cta: ctaFont, footer: footerFont, hours: hoursFont }),
  getTextScale: textScale, animationState, leaderTabToken: LEADER_TAB_TOKEN
});
function drawBorderGlyphPreviews() {
  document.querySelectorAll('[data-border-style]').forEach(button => {
    const glyphData = legacyGlyphs.get(BODY_BORDER_GLYPHS[button.dataset.borderStyle]);
    const glyphCanvas = button.querySelector('canvas');
    if (glyphData && glyphCanvas) promoRenderer.drawLegacyGlyphPreview(glyphCanvas, glyphData, colors[controls.theme.value].text);
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

function frame(now) { promoRenderer.render(now); requestAnimationFrame(frame); }
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
  return {
    copy: validatedCopy,
    settings: {
      theme: projectChoice(settings.theme, Object.keys(colors), 'Color theme'),
      gameStyle: projectChoice(settings.gameStyle, validSelectValues('gameStyle'), 'Game style'),
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
      bodyBorder: projectChoice(settings.bodyBorder, ['none', 'square', 'rounded'], 'Body border')
    }
  };
}
async function applyProject(project) {
  const { copy, settings } = validateProject(project);
  controls.theme.value = settings.theme; controls.gameStyle.value = settings.gameStyle; controls.logo.value = settings.logo;
  controls.classic.checked = settings.classic; controls.boundaries.checked = settings.boundaries;
  controls.crtLook.value = settings.crt.look; controls.crt.value = settings.crt.mode;
  Object.entries(settings.crt.controls).forEach(([name, value]) => { controls[CRT_CONTROL_IDS[name]].value = value; });
  Object.entries(PROJECT_COPY_CONTROLS).forEach(([name, controlName]) => { controls[controlName].value = copy[name]; });
  Object.entries(settings.scales).forEach(([controlName, value]) => { controls[controlName].value = value; });
  Object.assign(textAlignments, settings.alignments); Object.assign(textVerticalAlignments, settings.verticalAlignments);
  Object.assign(contentVisibility, settings.visibility); Object.assign(scrollModes, settings.scrollModes); bodyBorderStyle = settings.bodyBorder;
  PROJECT_FONT_CONTROLS.forEach(controlName => {
    const option = [...controls[controlName].options].find(item => item.textContent === settings.fonts[controlName]);
    controls[controlName].value = option.value;
  });
  syncCrtControls(); PROJECT_SCALE_CONTROLS.forEach(syncScaleOutput); syncThemePreview(); syncDetailToggle(); syncCtaToggle(); syncHoursToggle(); syncScrollModes(); syncCharacterToolAvailability(); syncBodyBorderControls();
  renderFontPickers(); hydrateBodyEditor(); hydrateHeaderEditor(); hydrateDetailEditor(); hydrateCtaEditor(); hydrateInlineRichEditor('hours'); hydrateInlineRichEditor('footer'); syncEffectToolbarState(); setCustomProjectTemplate();
  await Promise.all(PROJECT_FONT_CONTROLS.map(controlName => loadSelectedFont(controlName, { font: 'body', headerFont: 'header', detailFont: 'detail', ctaFont: 'cta', footerFont: 'footer' }[controlName], false)));
}
async function applyTemplate(template) {
  controls.theme.value = template.theme; controls.gameStyle.value = template.gameStyle || 'asteroids'; controls.logo.value = 'pixel'; controls.classic.checked = template.classic;
  controls.boundaries.checked = template.boundaries; controls.crtLook.value = 'custom'; controls.crt.value = template.crt || 'off';
  Object.entries(template.crtControls || {}).forEach(([name, value]) => { controls[CRT_CONTROL_IDS[name]].value = value; }); syncCrtControls();
  controls.headline.value = template.headline; controls.detail.value = template.detail; controls.body.value = template.body;
  controls.cta.value = template.cta; controls.hours.value = template.hours; controls.footer.value = template.footer;
  Object.entries(template.scales).forEach(([controlName, value]) => { controls[controlName].value = value; syncScaleOutput(controlName); });
  Object.assign(textAlignments, template.alignments); Object.assign(textVerticalAlignments, template.verticalAlignments); Object.assign(contentVisibility, template.visibility); Object.assign(scrollModes, template.scrollModes || {}); bodyBorderStyle = template.bodyBorder || 'none';
  document.querySelectorAll('[data-toolbar]').forEach(toolbar => {
    const section = toolbar.dataset.toolbar;
    toolbar.querySelectorAll('[data-vertical-alignment]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.verticalAlignment === textVerticalAlignments[section])));
    toolbar.querySelectorAll('[data-alignment]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.alignment === textAlignments[section])));
  });
  syncThemePreview(); syncDetailToggle(); syncCtaToggle(); syncHoursToggle(); syncScrollModes(); syncCharacterToolAvailability(); syncBodyBorderControls(); renderFontPickers(); hydrateBodyEditor(); hydrateHeaderEditor(); hydrateDetailEditor(); hydrateCtaEditor(); hydrateInlineRichEditor('hours'); hydrateInlineRichEditor('footer'); syncEffectToolbarState();
  await Promise.all(Object.entries(template.fonts).map(([controlName, fontName]) => {
    const option = [...controls[controlName].options].find(item => item.textContent === fontName);
    if (!option) return Promise.resolve();
    controls[controlName].value = option.value;
    const target = { font: 'body', headerFont: 'header', detailFont: 'detail', ctaFont: 'cta', footerFont: 'footer' }[controlName];
    return loadSelectedFont(controlName, target, false);
  }));
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
      loadFont(matinee.file, matinee.name, 'hours', false)
    ]);
    await applyTemplate(templates[controls.template.value]);
    controls.projectSave.disabled = false;
    controls.projectLoad.disabled = false;
    controls.status.textContent = 'Default fonts loaded.';
  } catch (error) {
    controls.status.textContent = `Font library could not load: ${error.message}`;
  }
}
hydrateHeaderEditor(); hydrateDetailEditor(); hydrateCtaEditor(); hydrateInlineRichEditor('hours'); hydrateInlineRichEditor('footer'); controls.status.textContent = 'Loading header font library...'; initializeFonts(); loadLegacyGlyphs().then(drawBorderGlyphPreviews).catch(error => { controls.glyphGrid.textContent = `Could not load glyphs: ${error.message}`; }); requestAnimationFrame(frame);
