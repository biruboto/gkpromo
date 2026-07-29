const W = 540, H = 675, EXPORT_SCALE = 2, EXPORT_W = 1080, EXPORT_H = 1350;
const HEADER_LOGO_Y = 24, CLASSIC_ARCADE_Y = 74;
const COPY_TOP_Y = 120, TEXT_FIELD_X = 24, TEXT_FIELD_WIDTH = W - 48;
const BODY_FIELD_X = TEXT_FIELD_X + 8, BODY_FIELD_WIDTH = TEXT_FIELD_WIDTH - 12;
const HEADER_FIELD_HEIGHT = 80, DETAIL_FIELD_HEIGHT = 48, BODY_FIELD_HEIGHT = 192, CTA_FIELD_HEIGHT = 64;
const MAX_BODY_LINES_WITH_CTA = 10;
const CTA_VERTICAL_OFFSET = 8;
const EMPTY_DETAIL_BODY_GAP = 24;
const FOOTER_FIELD_Y = 572, FOOTER_FIELD_HEIGHT = 76;
const FOOTER_TEXT_WIDTH = 414;
const HOURS_SCALE = 2;
const HOURS_ADDRESS_GAP = 4;
const LEADER_TAB_TOKEN = '[[leader-tab]]';
const TICKER_SPEED = 28, REVEAL_PAUSE = .7, MOTION_SPEED = 1;
const canvas = document.querySelector('#preview');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const crtCanvas = document.createElement('canvas');
crtCanvas.width = EXPORT_W;
crtCanvas.height = EXPORT_H;
let crtRenderer = null;
const exportCanvas = document.createElement('canvas');
exportCanvas.width = EXPORT_W;
exportCanvas.height = EXPORT_H;
const exportCtx = exportCanvas.getContext('2d');
exportCtx.imageSmoothingEnabled = false;
const controls = Object.fromEntries(['headline', 'headerEditor', 'detail', 'detailEditor', 'detailToggle', 'detailFont', 'detailScale', 'body', 'bodyEditor', 'bodyScale', 'footer', 'footerScale', 'hours', 'hoursToggle', 'cta', 'ctaEditor', 'ctaToggle', 'ctaFont', 'ctaScale', 'font', 'headerFont', 'headerScale', 'footerFont', 'logo', 'classic', 'theme', 'themePreview', 'template', 'boundaries', 'crtLook', 'crt', 'crtCurve', 'crtRgb', 'crtScanline', 'crtMask', 'crtVignette', 'crtDrift', 'crtBloom', 'crtGlow', 'png', 'record', 'status'].map(id => [id, document.querySelector(`#${id}`)]));
controls.glyphGrid = document.querySelector('#glyph-grid');
const SCALE_STEPS = [1, 2, 4];
const SHADOW_ALPHA = 1;
const FONT_CONTROL_NAMES = ['font', 'headerFont', 'detailFont', 'ctaFont', 'footerFont'];
const FONT_FAVORITES_KEY = 'gk-promo-font-favorites';
const fontFavorites = new Set((() => { try { return JSON.parse(localStorage.getItem(FONT_FAVORITES_KEY)) || []; } catch { return []; } })());
const fontLoadVersions = new Map();
const MP4_MIME_TYPES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4'];
const CRT_STRENGTHS = { soft: .58, strong: 1 };
const CRT_CONTROL_IDS = { curve: 'crtCurve', rgb: 'crtRgb', scanline: 'crtScanline', mask: 'crtMask', vignette: 'crtVignette', drift: 'crtDrift', bloom: 'crtBloom', glow: 'crtGlow' };
const CRT_LOOKS = {
  arcade: { treatment: 'strong', controls: { curve: '130', rgb: '50', scanline: '40', mask: '50', vignette: '120', drift: '7', bloom: '120', glow: '170' } },
  broadcast: { treatment: 'soft', controls: { curve: '10', rgb: '20', scanline: '30', mask: '45', vignette: '100', drift: '0', bloom: '65', glow: '65' } },
  tube: { treatment: 'strong', controls: { curve: '88', rgb: '30', scanline: '58', mask: '45', vignette: '100', drift: '0', bloom: '135', glow: '180' } },
  chroma: { treatment: 'soft', controls: { curve: '35', rgb: '88', scanline: '44', mask: '45', vignette: '100', drift: '0', bloom: '85', glow: '95' } }
};
const CRT_VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vTexCoord;
  void main() {
    vTexCoord = aPosition * .5 + .5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;
const CRT_FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 vTexCoord;
  uniform sampler2D uSource;
  uniform vec2 uSourceSize;
  uniform vec2 uOutputSize;
  uniform float uStrength;
  uniform float uCurve;
  uniform float uSeparation;
  uniform float uScanlines;
  uniform float uMask;
  uniform float uVignette;
  uniform float uDrift;
  uniform float uBloom;
  uniform float uGlow;
  uniform float uTime;

  vec3 sampleFrame(vec2 coordinate) {
    return texture2D(uSource, clamp(coordinate, 0.0, 1.0)).rgb;
  }

  vec3 brightFrame(vec2 coordinate) {
    return max(pow(sampleFrame(coordinate), vec3(2.15)) - vec3(.035), vec3(0.0));
  }

  void main() {
    float outputAspect = uOutputSize.x / uOutputSize.y;
    vec2 screen = (vTexCoord - .5) * 2.0;
    vec2 geometry = vec2(screen.x * outputAspect, screen.y);
    float radius = dot(geometry, geometry);
    vec2 warped = geometry * (1.0 + vec2(.024, .036) * uStrength * uCurve * radius);
    warped *= 1.0 - .018 * uStrength * uCurve;
    vec2 sourceCoord = vec2(warped.x / outputAspect, warped.y) * .5 + .5;
    float edge = 1.0 - smoothstep(.97, 1.05, max(abs(warped.x / outputAspect), abs(warped.y)));
    vec2 texel = 1.0 / uSourceSize;
    sourceCoord.x += sin(sourceCoord.y * 190.0 + uTime * 5.0) * texel.x * 2.0 * uStrength * uDrift;
    vec3 center = sampleFrame(sourceCoord);
    vec3 horizontal = (sampleFrame(sourceCoord - vec2(texel.x, 0.0)) + center * 2.0 + sampleFrame(sourceCoord + vec2(texel.x, 0.0))) * .25;
    vec3 bloom = (brightFrame(sourceCoord - vec2(texel.x, 0.0)) + brightFrame(sourceCoord + vec2(texel.x, 0.0)) + brightFrame(sourceCoord - vec2(0.0, texel.y)) + brightFrame(sourceCoord + vec2(0.0, texel.y))) * .25;
    vec3 glow = (brightFrame(sourceCoord - vec2(texel.x * 3.0, 0.0)) + brightFrame(sourceCoord + vec2(texel.x * 3.0, 0.0))) * .09;
    glow += (brightFrame(sourceCoord - vec2(0.0, texel.y * 2.0)) + brightFrame(sourceCoord + vec2(0.0, texel.y * 2.0))) * .12;
    glow += (brightFrame(sourceCoord + vec2(texel.x * 2.0, texel.y * 2.0)) + brightFrame(sourceCoord + vec2(-texel.x * 2.0, texel.y * 2.0)) + brightFrame(sourceCoord + vec2(texel.x * 2.0, -texel.y * 2.0)) + brightFrame(sourceCoord - vec2(texel.x * 2.0, texel.y * 2.0))) * .05;
    vec2 separation = vec2(texel.x * uSeparation * 2.5, 0.0);
    vec3 separated = vec3(sampleFrame(sourceCoord - separation).r, horizontal.g, sampleFrame(sourceCoord + separation).b);
    vec3 color = mix(horizontal, separated, uSeparation);
    color = pow(max(color, vec3(0.0)), vec3(2.15));
    color += bloom * .28 * uStrength * uBloom;
    color += glow * .7 * uStrength * uGlow;
    float scanlineBand = mod(floor(sourceCoord.y * uSourceSize.y), 2.0);
    float beam = mix(1.0 - .78 * uStrength * uScanlines, 1.0, scanlineBand);
    beam = mix(beam, min(1.08, beam + .14), smoothstep(.08, .65, dot(color, vec3(.299, .587, .114))) * uStrength * uGlow);
    float triad = mod(floor(gl_FragCoord.x), 3.0);
    vec3 mask = vec3(.72);
    if (triad < 1.0) mask.r = 1.0;
    else if (triad < 2.0) mask.g = 1.0;
    else mask.b = 1.0;
    mask = mix(vec3(1.0), mask, uMask * uStrength);
    float vignette = 1.0 - .16 * uStrength * uCurve * uVignette * smoothstep(.2, 1.55, radius);
    float signalRoll = 1.0 + sin(sourceCoord.y * 14.0 - uTime * 2.0) * .035 * uStrength * uDrift;
    color *= beam * mask * vignette * signalRoll * edge;
    color = pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));
    gl_FragColor = vec4(color, 1.0);
  }
`;
function textScale(controlName) { return SCALE_STEPS[Number(controls[controlName].value)] || 1; }
function superscriptScale(scale) { return Math.max(1, Math.round(scale / 2)); }
function crtSetting(name) { return Number(controls[CRT_CONTROL_IDS[name]].value) / 100; }
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
  solar: { background: '#1a150d', text: '#f2d89c', highlight: '#cfefa7', shadow: '#774c3b', accent: '#e76f51', muted: '#71654b' }
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
}
const logoImages = Object.fromEntries(Object.entries({
  pixel: './assets/images/gklogo.png',
  plain: './assets/images/gklogoplain.png',
  gradient: './assets/images/gklogogradient.png',
  classic: './assets/images/classicarcade.png'
}).map(([name, source]) => { const image = new Image(); image.src = source; return [name, image]; }));
const logoPixels = document.createElement('canvas');
const classicPixels = document.createElement('canvas');
const LOGO_COLOR_BANDS = { '24,29,48': 0, '69,47,77': 1, '153,61,104': 2, '218,68,112': 3, '251,63,99': 4 };
const LOGO_REFLECTION_LEVELS = [.8, 1, 1.32, 1.6];
const reactorBase64 = 'AAAAAAAAAAA4ODg4ADg4AO7uZswAAAAAACT+bGz+SAAAGP7A/g7+GADm7Bgwbs4A/ubgfuzs/gA4OBgwAAAAAB44MHBwMDgeeBwMDg4MHHgAGH48fhgAAAA4OP44OAAAAAAAADg4GDAAAAB+AAAAAAAAAAAAODgAAAcOHDhw4AD+zt7uzs7+ADh4ODg4OHwA/s4O/sDO/gD+Dg5+Dg7+AM7Ozv4ODg4A/s7A/g7O/gD+4P7m5ub+AP4ODg4ODg4A/s7OfM7O/gD+zs7+Ds7+AAA4OAA4OAAAADg4ADg4GDAOHDhwOBwOAAAAfgB+fgAAcDgcDhw4cAD+zg4+ADg4AP7m7vbu4P4A/s7O/s7OzgD+5ub85ub+AP7m5uDm5v4A/ubm5ubs+AD+4OD84OD+AP7g4Pzg4OAA/ubg7ubm/gDm5ub+5ubmADg4ODg4ODgADg4ODs7O/gDm5uz47ObmAODg4ODg4P4A/q6urq6urgD+zs7Ozs7OAP7Ozs7Ozv4A/ubm/uDg4AD+5ubm5ub8Hv7m5vzm5uYA/sbA/g7O/gD+ODg4ODg4AM7Ozs7Ozv4A5ubm5uz48ACurq6urq7+AM7OznzOzs4Azs7O/g7O/gD+zhw4cOb+AH5wcHBwcHB+AOBwOBwOBwB+Dg4ODg4OfhA4fP44ODg4AAAAAAAAAP8ANn9/PhwIABgYGB8fGBgYAwMDAwMDAwMYGBj4+AAAABgYGPj4GBgYAAAA+PgYGBgDBw4cOHDgwMDgcDgcDgcDAQMHDx8/f/8AAAAADw8PD4DA4PD4/P7/Dw8PDwAAAADw8PDwAAAAAP//AAAAAAAAAAAAAAAA//8AAAAA8PDw8AAcHHd3CBwAAAAAHx8YGBgAAAD//wAAABgYGP//GBgYAAA8fn5+PAAAAAAA/////8DAwMDAwMDAAAAA//8YGBgYGBj//wAAAPDw8PDw8PDwGBgYHx8AAAB4YHhgfhgeAAAYPH4YGBgAABgYGH48GAAAGDB+MBgAAAAYDH4MGAAAABg8fn48GAAAAP4O/s7+AODg/ubm5v4AAAD+5uDm/gAODv7Ozs7+AAAA/ub+4P4AfnZwfHBwcAAAAP7Ozv4O/uDg/ubm5uYAODgAODg4OAAODgAODg7O/uDg5ub85uYAPBwcHBwcHAAAAP6urq6uAAAA/s7Ozs4AAAD+zs7O/gAAAP7m5v7g4AAA/s7O/g4OAAD+5uDg4AAAAP7A/g7+AODg/ODg5v4AAADOzs7O/gAAAObm7PjwAAAArq6urv4AAADOznzOzgAAAM7Ozv4O/gAA/gb+4P4AABg8fn4YPAAYGBgYGBgYGAB+eHxuZgYACBg4eDgYCAAQGBweHBgQAA==';
let bodyFont = null, headerFont = null, detailFont = null, ctaFont = null, footerFont = null, hoursFont = null;
let activeHighlightColor = '#ffffff', activeStrokeColor = '#000000', activeShadowColor = '#dd4455';
let activeAnimationTime = 0;
const textStyles = { headline: { shadow: true }, body: { shadow: false } };
const contentVisibility = { detail: true, cta: false, hours: true };
const scrollModes = { detail: 'off', hours: 'reveal' };
const textAlignments = { header: 'center', detail: 'center', body: 'left', cta: 'center', footer: 'center' };
const textVerticalAlignments = { header: 'center', detail: 'top', body: 'center', cta: 'top', footer: 'bottom' };
let bodyBorderStyle = 'none';
const templates = {
  'free-play': {
    theme: 'yuNo', logo: 'pixel', classic: true, boundaries: false, crt: 'off',
    crtControls: { curve: '100', rgb: '45', scanline: '100', bloom: '100', glow: '100' },
    headline: 'July [[effect:wave]]Free Play[[/effect]] Calendar', detail: '[[effect:sweep]]Unlimited[[/effect]] Credits on All Games!!',
    body: '[[atascii-7F]] 2nd Thursday[[leader-tab]][[effect:highlight]]Thu 7/9[[/effect]]\n[[atascii-7F]] Portland [[atascii-00]] Pride[[leader-tab]][[effect:highlight]]Sun 7/19[[/effect]]\n[[atascii-7F]] Last Wednesday[[leader-tab]][[effect:highlight]]Wed 7/29[[/effect]]',
    cta: '[[effect:superscript]]$[[/effect]]6 NOON-5[[effect:subscript]]PM[[/effect]] (ALL AGES)\n[[effect:superscript]]$[[/effect]]12 5[[effect:subscript]]PM[[/effect]]-MIDNIGHT (21+)', hours: 'ALL AGES NOON-5PM [[petscii-upper-5a]] 21+ 5PM-MIDNIGHT', footer: '115 NW 5[[effect:superscript]]th[[/effect]] Ave Portland, OR\nwww.groundkontrol.com',
    scales: { headerScale: '2', detailScale: '1', bodyScale: '1', ctaScale: '1', footerScale: '1' },
    alignments: { header: 'center', detail: 'center', body: 'left', cta: 'center', footer: 'center' },
    verticalAlignments: { header: 'center', detail: 'top', body: 'center', cta: 'top', footer: 'bottom' },
    visibility: { detail: true, cta: true, hours: false }, scrollModes: { detail: 'off', hours: 'reveal' }, bodyBorder: 'none',
    fonts: { font: 'Beachball', headerFont: 'Reactor', detailFont: 'Reactor', ctaFont: 'ZX Eurostile', footerFont: 'Cinema Bold' }
  },
  'arcade-events': {
    theme: 'neon', logo: 'pixel', classic: true, boundaries: false, crt: 'off',
    headline: 'Arcade Events This Week', detail: '[[effect:underline]]July 20-26[[/effect]]',
    body: '[[effect:highlight]]Monday 7/20[[/effect]]\nMario Kart World Tournament + Killer Queen Community Night\n[[effect:highlight]]Tuesday 7/21[[/effect]]\nLX Entertainment Night: UFO 50\n[[effect:highlight]]Wednesday 7/22[[/effect]]\nElectropop/Chiptune Show\nCrunk Witch + Tonight We Launch!\n[[effect:highlight]]Sunday 7/26[[/effect]]\nSamurai Showdown II Tournament',
    cta: '[[atascii-7E]][[atascii-7E]][[atascii-7E]][[atascii-7E]][[atascii-7E]]   SUMMER PROMO   [[atascii-7F]][[atascii-7F]][[atascii-7F]][[atascii-7F]][[atascii-7F]]\n50% OFF ALL GAMES NOON-5PM', hours: 'ALL AGES NOON-5PM [[petscii-upper-5a]] 21+ 5PM-MIDNIGHT', footer: '115 NW 5[[effect:superscript]]th[[/effect]] Ave Portland, OR\nwww.groundkontrol.com',
    scales: { headerScale: '2', detailScale: '1', bodyScale: '1', ctaScale: '1', footerScale: '1' },
    alignments: { header: 'center', detail: 'center', body: 'center', cta: 'center', footer: 'center' },
    verticalAlignments: { header: 'center', detail: 'top', body: 'top', cta: 'center', footer: 'bottom' },
    visibility: { detail: false, cta: true, hours: true }, scrollModes: { detail: 'off', hours: 'reveal' }, bodyBorder: 'rounded',
    fonts: { font: 'Beachball', headerFont: 'Reactor', detailFont: 'Reactor', ctaFont: 'ZX Eurostile', footerFont: 'Cinema Bold' }
  }
};
const glyphCache = new Map();
const glyphBoundsCache = new Map();
const legacyGlyphs = new Map();
const legacyGlyphCache = new Map();
const legacyGlyphBoundsCache = new Map();
const reflectedGlyphCache = new Map();
const ATASCII_PICKER_SLOTS = new Set(['0x00', '0x1C', '0x1D', '0x1E', '0x1F', '0x60', '0x7B', '0x7D', '0x7E', '0x7F']);
const PETSCII_PICKER_SLOTS = new Set(['0x51', '0x56', '0x57', '0x58', '0x5A']);
const LEGACY_UNICODE = {
  'atascii-00': '♥', 'atascii-14': '●', 'atascii-1C': '↑', 'atascii-1D': '↓', 'atascii-1E': '←', 'atascii-1F': '→',
  'atascii-60': '♦', 'atascii-7B': '♠', 'atascii-7D': '◢', 'atascii-7E': '◀', 'atascii-7F': '▶',
  'petscii-upper-51': '●', 'petscii-upper-56': '✕', 'petscii-upper-57': '○', 'petscii-upper-58': '♣', 'petscii-upper-5A': '▲'
};
const random = value => { const sample = Math.sin(value * 12.9898 + 78.233) * 43758.5453; return sample - Math.floor(sample); };
let stars = [], seed = 1, recording = false;
let activeTextControl = controls.bodyEditor, savedBodyRange = null, savedHeaderRange = null, savedDetailRange = null, savedCtaRange = null;

function resetStars() {
  seed += 1;
  stars = Array.from({ length: 120 }, (_, index) => ({ x: Math.floor(random(seed * 101 + index * 3) * W), y: Math.floor(random(seed * 103 + index * 3 + 1) * H), z: .2 + random(seed * 107 + index * 3 + 2) }));
}
function glyphIndexFor(character) {
  const codepoint = character.codePointAt(0);
  // Header fonts are ordered directly from printable ASCII space through tilde.
  return codepoint >= 0x20 && codepoint <= 0x7e ? codepoint - 0x20 : 0x1f;
}
function glyph(character, color, font = bodyFont, fontKey = 'body') {
  const glyphIndex = glyphIndexFor(character);
  const key = `${fontKey}:${glyphIndex}:${color}`;
  if (glyphCache.has(key)) return glyphCache.get(key);
  const image = document.createElement('canvas'); image.width = image.height = 8;
  const imageCtx = image.getContext('2d'); imageCtx.fillStyle = color;
  for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) if ((font?.[glyphIndex * 8 + row] || 0) & (128 >> column)) imageCtx.fillRect(column, row, 1, 1);
  glyphCache.set(key, image); return image;
}
function glyphBounds(character, font = bodyFont, fontKey = 'body') {
  const glyphIndex = glyphIndexFor(character);
  const key = `${fontKey}:${glyphIndex}`;
  if (glyphBoundsCache.has(key)) return glyphBoundsCache.get(key);
  let left = 8, right = -1, top = 8, bottom = -1;
  for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) {
    if ((font?.[glyphIndex * 8 + row] || 0) & (128 >> column)) { left = Math.min(left, column); right = Math.max(right, column); top = Math.min(top, row); bottom = Math.max(bottom, row); }
  }
  const bounds = right < 0 ? null : { left, width: right - left + 1, top, bottom };
  glyphBoundsCache.set(key, bounds); return bounds;
}
function legacyGlyph(glyphData, color) {
  const key = `${glyphData.id}:${color}`;
  if (legacyGlyphCache.has(key)) return legacyGlyphCache.get(key);
  const image = document.createElement('canvas'); image.width = image.height = 8;
  const imageCtx = image.getContext('2d'); imageCtx.fillStyle = color;
  for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) if (glyphData.bitmap[row] & (128 >> column)) imageCtx.fillRect(column, row, 1, 1);
  legacyGlyphCache.set(key, image); return image;
}
const BODY_BORDER_GLYPHS = {
  topLeft: 'petscii-upper-70', topRight: 'petscii-upper-6e', bottomLeft: 'petscii-upper-6d', bottomRight: 'petscii-upper-7d',
  roundedTopLeft: 'petscii-upper-55', roundedTopRight: 'petscii-upper-49', roundedBottomLeft: 'petscii-upper-4a', roundedBottomRight: 'petscii-upper-4b',
  top: 'petscii-upper-43', bottom: 'petscii-upper-43', left: 'petscii-upper-42', right: 'petscii-upper-42'
};
function drawBorderGlyph(glyphId, x, y, color) {
  const glyphData = legacyGlyphs.get(glyphId);
  if (!glyphData) return false;
  ctx.drawImage(legacyGlyph(glyphData, color), x, y, 8, 8);
  return true;
}
function drawBodyBorder(style, x, y, width, height, color) {
  if (style === 'none') return;
  const right = x + width - 8, bottom = y + height - 8;
  for (let edgeX = x + 8; edgeX < right; edgeX += 8) {
    drawBorderGlyph(BODY_BORDER_GLYPHS.top, edgeX, y, color);
    drawBorderGlyph(BODY_BORDER_GLYPHS.bottom, edgeX, bottom, color);
  }
  for (let edgeY = y + 8; edgeY < bottom; edgeY += 8) {
    drawBorderGlyph(BODY_BORDER_GLYPHS.left, x, edgeY, color);
    drawBorderGlyph(BODY_BORDER_GLYPHS.right, right, edgeY, color);
  }
  if (style === 'rounded') {
    drawBorderGlyph(BODY_BORDER_GLYPHS.roundedTopLeft, x, y, color); drawBorderGlyph(BODY_BORDER_GLYPHS.roundedTopRight, right, y, color);
    drawBorderGlyph(BODY_BORDER_GLYPHS.roundedBottomLeft, x, bottom, color); drawBorderGlyph(BODY_BORDER_GLYPHS.roundedBottomRight, right, bottom, color);
    return;
  }
  drawBorderGlyph(BODY_BORDER_GLYPHS.topLeft, x, y, color); drawBorderGlyph(BODY_BORDER_GLYPHS.topRight, right, y, color);
  drawBorderGlyph(BODY_BORDER_GLYPHS.bottomLeft, x, bottom, color); drawBorderGlyph(BODY_BORDER_GLYPHS.bottomRight, right, bottom, color);
}
function reflectedGlyph(glyphLayout, color, font = bodyFont, fontKey = 'body', phase = 0) {
  const glyphId = glyphLayout.type === 'legacy' ? glyphLayout.glyphData.id : glyphIndexFor(glyphLayout.character);
  const key = `${glyphLayout.type}:${fontKey}:${glyphId}:${color}:${phase}`;
  if (reflectedGlyphCache.has(key)) return reflectedGlyphCache.get(key);
  const image = document.createElement('canvas'); image.width = image.height = 8;
  const imageCtx = image.getContext('2d'); const reflection = logoReflectionColors(color);
  for (let row = 0; row < 8; row++) {
    const bitmap = glyphLayout.type === 'legacy' ? glyphLayout.glyphData.bitmap[row] : font?.[glyphId * 8 + row] || 0;
    const [red, green, blue] = reflection[(row + phase) % reflection.length];
    imageCtx.fillStyle = `rgb(${red} ${green} ${blue})`;
    for (let column = 0; column < 8; column++) if (bitmap & (128 >> column)) imageCtx.fillRect(column, row, 1, 1);
  }
  reflectedGlyphCache.set(key, image); return image;
}
function legacyGlyphBounds(glyphData) {
  if (legacyGlyphBoundsCache.has(glyphData.id)) return legacyGlyphBoundsCache.get(glyphData.id);
  let left = 8, right = -1, top = 8, bottom = -1;
  for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) {
    if (glyphData.bitmap[row] & (128 >> column)) { left = Math.min(left, column); right = Math.max(right, column); top = Math.min(top, row); bottom = Math.max(bottom, row); }
  }
  const bounds = right < 0 ? null : { left, width: right - left + 1, top, bottom };
  legacyGlyphBoundsCache.set(glyphData.id, bounds); return bounds;
}
function tokenize(value) {
  const tokens = []; const expression = /\[\[(\/?effect(?::[a-z-]+)?|[a-z0-9-]+)\]\]/ig;
  const effectStack = []; let effects = []; let position = 0; let match;
  const addText = text => { for (const character of text) tokens.push({ type: 'font', character, effects }); };
  while ((match = expression.exec(value))) {
    addText(value.slice(position, match.index));
    const marker = match[1].toLowerCase();
    if (marker === '/effect') effects = effectStack.pop() || [];
    else if (marker.startsWith('effect')) { effectStack.push(effects); effects = [...effects, marker.split(':')[1] || 'none']; }
    else {
      const glyphData = legacyGlyphs.get(marker);
      if (glyphData) tokens.push({ type: 'legacy', glyphData, effects });
      else if (marker === 'leader-tab') {}
      else addText(match[0]);
    }
    position = expression.lastIndex;
  }
  addText(value.slice(position));
  return tokens;
}
const BODY_TEXT_SPACING = { letterGap: 2, spaceWidth: 6 };
const HEADER_TEXT_SPACING = { letterGap: 1, spaceWidth: 6 };
function textLayout(value, scale = 1, font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING) {
  scale = Math.max(1, Math.round(scale));
  const tokens = tokenize(value);
  const boundsForToken = token => token.character === ' ' ? null : token.type === 'legacy' ? legacyGlyphBounds(token.glyphData) : glyphBounds(token.character, font, fontKey);
  const referenceBoundsForScript = index => {
    const isScript = token => token?.effects.includes('superscript') || token?.effects.includes('subscript');
    let runStart = index, runEnd = index;
    while (isScript(tokens[runStart - 1])) runStart -= 1;
    while (isScript(tokens[runEnd + 1])) runEnd += 1;
    for (let candidateIndex = runStart - 1; candidateIndex >= 0; candidateIndex--) {
      const bounds = boundsForToken(tokens[candidateIndex]);
      if (bounds) return bounds;
    }
    for (let candidateIndex = runEnd + 1; candidateIndex < tokens.length; candidateIndex++) {
      const bounds = boundsForToken(tokens[candidateIndex]);
      if (bounds) return bounds;
    }
    return null;
  };
  const glyphs = []; let cursor = 0, previousWasGlyph = false, underlineRun = 0, wasUnderlined = false;
  for (const [tokenIndex, token] of tokens.entries()) {
    const isUnderlined = token.effects.includes('underline');
    const isSuperscript = token.effects.includes('superscript');
    const isSubscript = token.effects.includes('subscript');
    const glyphScale = isSuperscript || isSubscript ? superscriptScale(scale) : scale;
    if (isUnderlined && !wasUnderlined) underlineRun += 1;
    wasUnderlined = isUnderlined;
    const character = token.character;
    if (character === ' ') { cursor += spacing.spaceWidth * glyphScale; previousWasGlyph = false; continue; }
    const bounds = boundsForToken(token);
    if (!bounds) { cursor += spacing.spaceWidth * glyphScale; previousWasGlyph = false; continue; }
    if (previousWasGlyph) cursor += spacing.letterGap * glyphScale;
    const referenceBounds = isSuperscript || isSubscript ? referenceBoundsForScript(tokenIndex) || bounds : bounds;
    const yOffset = isSuperscript ? referenceBounds.top * scale - bounds.top * glyphScale : isSubscript ? (referenceBounds.bottom + 1) * scale - (bounds.bottom + 1) * glyphScale : 0;
    glyphs.push({ ...token, bounds, scale: glyphScale, yOffset, underlineRun: isUnderlined ? underlineRun : 0, x: cursor - bounds.left * glyphScale });
    cursor += bounds.width * glyphScale; previousWasGlyph = true;
  }
  return { glyphs, width: cursor };
}
function textWidth(value, scale = 1, font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING) { return textLayout(value, scale, font, fontKey, spacing).width; }
function text(value, x, y, color, scale = 1, align = 'left', font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING, forceShadow = false, shadowColor = activeShadowColor) {
  scale = Math.max(1, Math.round(scale));
  const layout = textLayout(value, scale, font, fontKey, spacing); const start = Math.round(x - (align === 'center' ? layout.width / 2 : align === 'right' ? layout.width : 0));
  const underlineSegments = [];
  layout.glyphs.forEach((glyphLayout, glyphIndex) => {
    if (glyphLayout.effects.includes('blink') && Math.floor(activeAnimationTime * 2) % 2) return;
    const glyphScale = glyphLayout.scale;
    const sweepStart = (activeAnimationTime * 72) % (layout.width + 8 * scale) - 8 * scale;
    const isSwept = glyphLayout.effects.includes('sweep') && glyphLayout.x + glyphLayout.bounds.width * glyphScale >= sweepStart && glyphLayout.x <= sweepStart + 8 * scale;
    const glyphColor = isSwept || glyphLayout.effects.includes('flash') && Math.floor(activeAnimationTime * 2) % 2 ? activeHighlightColor : glyphLayout.effects.includes('highlight') ? activeHighlightColor : color;
    const waveOffset = glyphLayout.effects.includes('wave') ? Math.round(Math.sin(activeAnimationTime * 8 - glyphIndex * .85) * 2) * glyphScale : 0;
    const glyphY = y + glyphLayout.yOffset + waveOffset;
    const image = glyphLayout.effects.includes('reflect') ? reflectedGlyph(glyphLayout, glyphColor, font, fontKey, Math.floor(activeAnimationTime * 4) % LOGO_REFLECTION_LEVELS.length) : glyphLayout.type === 'legacy' ? legacyGlyph(glyphLayout.glyphData, glyphColor) : glyph(glyphLayout.character, glyphColor, font, fontKey);
    const strokeImage = glyphLayout.effects.includes('stroke') ? glyphLayout.type === 'legacy' ? legacyGlyph(glyphLayout.glyphData, activeStrokeColor) : glyph(glyphLayout.character, activeStrokeColor, font, fontKey) : null;
    if (strokeImage) {
      for (const offsetY of [-1, 0, 1]) for (const offsetX of [-1, 0, 1]) {
        if (offsetX || offsetY) ctx.drawImage(strokeImage, start + glyphLayout.x + offsetX * glyphScale, glyphY + offsetY * glyphScale, 8 * glyphScale, 8 * glyphScale);
      }
    }
    if (forceShadow || glyphLayout.effects.includes('shadow')) {
      const shadowImage = glyphLayout.type === 'legacy' ? legacyGlyph(glyphLayout.glyphData, shadowColor) : glyph(glyphLayout.character, shadowColor, font, fontKey);
      ctx.save(); ctx.globalAlpha *= SHADOW_ALPHA;
      ctx.drawImage(shadowImage, start + glyphLayout.x + glyphScale, glyphY + glyphScale, 8 * glyphScale, 8 * glyphScale);
      ctx.restore();
    }
    ctx.drawImage(image, start + glyphLayout.x, glyphY, 8 * glyphScale, 8 * glyphScale);
    if (glyphLayout.underlineRun) {
      const segment = underlineSegments.at(-1);
      const glyphStart = Math.round(start + glyphLayout.x);
      const glyphEnd = glyphStart + glyphLayout.bounds.width * glyphScale;
      if (segment?.run === glyphLayout.underlineRun && segment.y === glyphY && segment.thickness === glyphScale) segment.end = glyphEnd;
      else underlineSegments.push({ run: glyphLayout.underlineRun, color: glyphColor, start: glyphStart, end: glyphEnd, y: glyphY, thickness: glyphScale });
    }
  });
  underlineSegments.forEach(segment => {
    ctx.fillStyle = segment.color;
    ctx.fillRect(segment.start, segment.y + 9 * segment.thickness, segment.end - segment.start, segment.thickness);
  });
}
function styledText(style, value, x, y, color, shadowColor, scale = 1, align = 'left', font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING) {
  text(value, x, y, color, scale, align, font, fontKey, spacing, textStyles[style].shadow, shadowColor);
}
function leaderText(value, x, width, y, color, shadowColor, scale = 1, font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING) {
  const parts = leaderLineParts(value);
  if (!parts) { styledText('body', value, x, y, color, shadowColor, scale, 'left', font, fontKey, spacing); return; }
  const rightX = x + width;
  styledText('body', parts.left, x, y, color, shadowColor, scale, 'left', font, fontKey, spacing);
  styledText('body', parts.right, rightX, y, color, shadowColor, scale, 'right', font, fontKey, spacing);
  const periodWidth = textWidth('.', scale, font, fontKey, spacing); let count = 0;
  while (textWidth(`${parts.left}${'.'.repeat(count + 1)}${parts.right}`, scale, font, fontKey, spacing) <= width) count += 1;
  if (count) {
    const dotStart = textWidth(`${parts.left}.`, scale, font, fontKey, spacing) - periodWidth;
    styledText('body', '.'.repeat(count), x + dotStart, y, color, shadowColor, scale, 'left', font, fontKey, spacing);
  }
}
function singleLineValue(value) { return value.replace(/\s*\r?\n\s*/g, ' '); }
function scrollingText(value, x, width, y, color, shadowColor, scale, font, fontKey, spacing, mode) {
  const line = singleLineValue(value); const lineWidth = textWidth(line, scale, font, fontKey, spacing); const clipHeight = 12 * scale;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y - scale, width, clipHeight); ctx.clip();
  if (mode === 'ticker') {
    const tickerLine = line.endsWith(' ') ? line : `${line} `; const loopWidth = textWidth(tickerLine, scale, font, fontKey, spacing); const offset = Math.floor(activeAnimationTime * TICKER_SPEED) % loopWidth;
    for (let drawX = x - offset; drawX < x + width; drawX += loopWidth) styledText('body', tickerLine, drawX, y, color, shadowColor, scale, 'left', font, fontKey, spacing);
  } else {
    const overflow = Math.max(0, lineWidth - width);
    if (!overflow) styledText('body', line, x, y, color, shadowColor, scale, 'left', font, fontKey, spacing);
    else {
      const travelDuration = Math.max(1.1, overflow / TICKER_SPEED); const cycle = REVEAL_PAUSE * 2 + travelDuration * 2; let phase = activeAnimationTime % cycle; let offset;
      if (phase < REVEAL_PAUSE) offset = 0;
      else if ((phase -= REVEAL_PAUSE) < travelDuration) offset = overflow * phase / travelDuration;
      else if ((phase -= travelDuration) < REVEAL_PAUSE) offset = overflow;
      else offset = overflow * (1 - (phase - REVEAL_PAUSE) / travelDuration);
      styledText('body', line, x - Math.round(offset), y, color, shadowColor, scale, 'left', font, fontKey, spacing);
    }
  }
  ctx.restore();
}
function wrap(value, maximumWidth, scale = 1, font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING) {
  const lines = []; let line = '';
  value.trim().replace(/\s+/g, ' ').split(' ').forEach(word => { const next = line ? `${line} ${word}` : word; if (textWidth(next, scale, font, fontKey, spacing) > maximumWidth && line) { lines.push(line); line = word; } else line = next; });
  if (line) lines.push(line); return normalizeEffectsAcrossLines(lines).slice(0, 4);
}
function wrapPreservingSpaces(value, maximumWidth, scale = 1, font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING) {
  const lines = []; let line = '';
  (value.match(/ +|[^ ]+/g) || []).forEach(token => {
    const next = line + token;
    if (line && textWidth(next, scale, font, fontKey, spacing) > maximumWidth) { lines.push(line); line = token; }
    else line = next;
  });
  if (line) lines.push(line); return lines;
}
function leaderLineParts(value) {
  const index = value.indexOf(LEADER_TAB_TOKEN);
  if (index < 0 || value.indexOf(LEADER_TAB_TOKEN, index + LEADER_TAB_TOKEN.length) >= 0) return null;
  const left = value.slice(0, index); const effectExpression = /\[\[(\/?effect(?::[a-z-]+)?)\]\]/ig; const activeEffects = []; let match;
  while ((match = effectExpression.exec(left))) {
    const marker = match[1].toLowerCase();
    if (marker === '/effect') activeEffects.pop(); else activeEffects.push(marker.split(':')[1] || 'none');
  }
  return { left, right: `${activeEffects.map(effect => `[[effect:${effect}]]`).join('')}${value.slice(index + LEADER_TAB_TOKEN.length)}` };
}
function leaderLineFits(value, maximumWidth, scale, font, fontKey, spacing) {
  const parts = leaderLineParts(value);
  return parts && textWidth(parts.left, scale, font, fontKey, spacing) + textWidth(parts.right, scale, font, fontKey, spacing) <= maximumWidth;
}
function normalizeEffectsAcrossLines(lines) {
  const activeEffects = []; const expression = /\[\[(\/?effect(?::[a-z-]+)?)\]\]/ig;
  return lines.map(line => {
    let output = activeEffects.map(effect => `[[effect:${effect}]]`).join(''); let position = 0; let match;
    while ((match = expression.exec(line))) {
      output += line.slice(position, match.index) + match[0];
      const marker = match[1].toLowerCase();
      if (marker === '/effect') activeEffects.pop();
      else activeEffects.push(marker.split(':')[1] || 'none');
      position = expression.lastIndex;
    }
    output += line.slice(position);
    return output + activeEffects.map(() => '[[/effect]]').reverse().join('');
  });
}
function wrapWithLineBreaks(value, maximumWidth, scale = 1, font = bodyFont, fontKey = 'body', spacing = BODY_TEXT_SPACING, maximumLines = 4, preserveSpaces = false) {
  const lines = [];
  value.replace(/\r\n?/g, '\n').split('\n').forEach(paragraph => {
    if (!paragraph.trim()) { lines.push(''); return; }
    if (leaderLineFits(paragraph, maximumWidth, scale, font, fontKey, spacing)) lines.push(paragraph);
    else {
      const leader = leaderLineParts(paragraph);
      if (leader) lines.push(...wrapPreservingSpaces(leader.left, maximumWidth, scale, font, fontKey, spacing), ...wrapPreservingSpaces(leader.right, maximumWidth, scale, font, fontKey, spacing));
      else lines.push(...(preserveSpaces ? wrapPreservingSpaces(paragraph, maximumWidth, scale, font, fontKey, spacing) : wrap(paragraph, maximumWidth, scale, font, fontKey, spacing)));
    }
  });
  return normalizeEffectsAcrossLines(lines).slice(0, maximumLines);
}
function drawImageCentered(image, y, scale = 4) {
  if (!image.complete || !image.naturalWidth) return;
  const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
  ctx.drawImage(image, Math.round((W - width) / 2), y, width, height);
}
function logoReflectionColors(color) {
  const value = color.slice(1); const rgb = [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16)];
  return LOGO_REFLECTION_LEVELS.map(level => rgb.map(channel => level <= 1 ? Math.round(channel * level) : Math.round(channel + (255 - channel) * (level - 1))));
}
function drawAnimatedLogo(y, palette, time, scale = 4) {
  const image = logoImages.pixel;
  if (!image.complete || !image.naturalWidth) return;
  logoPixels.width = image.naturalWidth; logoPixels.height = image.naturalHeight;
  const logoCtx = logoPixels.getContext('2d'); logoCtx.drawImage(image, 0, 0);
  const imageData = logoCtx.getImageData(0, 0, logoPixels.width, logoPixels.height);
  const reflection = logoReflectionColors(palette.accent);
  const phase = Math.floor(time * 4) % reflection.length;
  const shadow = palette.shadow.match(/\w\w/g).map(value => Number.parseInt(value, 16));
  for (let index = 0; index < imageData.data.length; index += 4) {
    if (!imageData.data[index + 3]) continue;
    const pixel = index / 4; const x = pixel % logoPixels.width;
    const sourceColor = `${imageData.data[index]},${imageData.data[index + 1]},${imageData.data[index + 2]}`;
    const band = LOGO_COLOR_BANDS[sourceColor] ?? 3;
    const color = x >= 55 && x <= 63 ? reflection[3] : band === 0 ? shadow : reflection[(band - 1 + phase) % reflection.length];
    imageData.data[index] = color[0]; imageData.data[index + 1] = color[1]; imageData.data[index + 2] = color[2];
  }
  logoCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(logoPixels, Math.round((W - logoPixels.width * scale) / 2), y, logoPixels.width * scale, logoPixels.height * scale);
}
function drawClassicArcade(y, palette, scale = 4) {
  const image = logoImages.classic;
  if (!image.complete || !image.naturalWidth) return;
  classicPixels.width = image.naturalWidth; classicPixels.height = image.naturalHeight;
  const classicCtx = classicPixels.getContext('2d'); classicCtx.drawImage(image, 0, 0);
  const imageData = classicCtx.getImageData(0, 0, classicPixels.width, classicPixels.height);
  const color = logoReflectionColors(palette.accent)[3];
  for (let index = 0; index < imageData.data.length; index += 4) {
    if (!imageData.data[index + 3]) continue;
    imageData.data[index] = color[0]; imageData.data[index + 1] = color[1]; imageData.data[index + 2] = color[2];
  }
  classicCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(classicPixels, Math.round((W - classicPixels.width * scale) / 2), y, classicPixels.width * scale, classicPixels.height * scale);
}
function drawTextBoundaries(rectangles, palette) {
  ctx.save(); ctx.strokeStyle = palette.muted; ctx.globalAlpha = .8; ctx.lineWidth = 1;
  rectangles.filter(({ width, height }) => width > 1 && height > 1).forEach(({ x, y, width, height }) => ctx.strokeRect(Math.round(x) + .5, Math.round(y) + .5, Math.round(width) - 1, Math.round(height) - 1));
  ctx.restore();
}
function alignmentPoint(x, width, alignment) { return alignment === 'right' ? x + width : alignment === 'center' ? x + width / 2 : x; }
function alignedStart(x, width, itemWidth, alignment) { return alignment === 'right' ? x + width - itemWidth : alignment === 'center' ? Math.round(x + (width - itemWidth) / 2) : x; }
function verticallyAlignedStart(y, height, itemHeight, alignment) { return alignment === 'bottom' ? y + height - itemHeight : alignment === 'center' ? Math.round(y + (height - itemHeight) / 2) : y; }
function compileCrtShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  const message = gl.getShaderInfoLog(shader);
  gl.deleteShader(shader);
  throw new Error(message || 'Unknown shader compilation failure');
}
function createCrtRenderer() {
  if (crtRenderer) return crtRenderer;
  if (crtRenderer === false) return null;
  const gl = crtCanvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) { crtRenderer = false; return null; }
  try {
    const program = gl.createProgram();
    const vertexShader = compileCrtShader(gl, gl.VERTEX_SHADER, CRT_VERTEX_SHADER);
    const fragmentShader = compileCrtShader(gl, gl.FRAGMENT_SHADER, CRT_FRAGMENT_SHADER);
    gl.attachShader(program, vertexShader); gl.attachShader(program, fragmentShader); gl.linkProgram(program);
    gl.deleteShader(vertexShader); gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Unknown shader link failure');
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const position = gl.getAttribLocation(program, 'aPosition');
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    crtRenderer = {
      gl, program, texture, buffer, position,
      source: gl.getUniformLocation(program, 'uSource'),
      sourceSize: gl.getUniformLocation(program, 'uSourceSize'),
      outputSize: gl.getUniformLocation(program, 'uOutputSize'),
      strength: gl.getUniformLocation(program, 'uStrength'),
      curve: gl.getUniformLocation(program, 'uCurve'),
      separation: gl.getUniformLocation(program, 'uSeparation'),
      scanlines: gl.getUniformLocation(program, 'uScanlines'),
      mask: gl.getUniformLocation(program, 'uMask'),
      vignette: gl.getUniformLocation(program, 'uVignette'),
      drift: gl.getUniformLocation(program, 'uDrift'),
      bloom: gl.getUniformLocation(program, 'uBloom'),
      glow: gl.getUniformLocation(program, 'uGlow'),
      time: gl.getUniformLocation(program, 'uTime')
    };
  } catch (error) {
    console.warn('CRT renderer unavailable:', error);
    crtRenderer = false;
  }
  return crtRenderer || null;
}
function renderCrtPiFrame() {
  const strength = CRT_STRENGTHS[controls.crt.value];
  if (!strength) return canvas;
  const renderer = createCrtRenderer();
  if (!renderer) return canvas;
  const { gl, program, texture, buffer, position, source, sourceSize, outputSize } = renderer;
  gl.viewport(0, 0, EXPORT_W, EXPORT_H);
  gl.useProgram(program);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1i(source, 0); gl.uniform2f(sourceSize, W, H); gl.uniform2f(outputSize, EXPORT_W, EXPORT_H); gl.uniform1f(renderer.strength, strength);
  gl.uniform1f(renderer.curve, crtSetting('curve')); gl.uniform1f(renderer.separation, crtSetting('rgb'));
  gl.uniform1f(renderer.scanlines, crtSetting('scanline')); gl.uniform1f(renderer.mask, crtSetting('mask'));
  gl.uniform1f(renderer.vignette, crtSetting('vignette')); gl.uniform1f(renderer.drift, crtSetting('drift'));
  gl.uniform1f(renderer.bloom, crtSetting('bloom')); gl.uniform1f(renderer.glow, crtSetting('glow')); gl.uniform1f(renderer.time, activeAnimationTime);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return crtCanvas;
}
function render(now) {
  const palette = colors[controls.theme.value]; activeHighlightColor = palette.highlight; activeStrokeColor = palette.shadow; activeShadowColor = palette.shadow; const time = now / 1000 * MOTION_SPEED; activeAnimationTime = time;
  ctx.fillStyle = palette.background; ctx.fillRect(0, 0, W, H);
  stars.forEach((star, index) => { ctx.globalAlpha = .22 + star.z * .68; ctx.fillStyle = index % 11 === 0 ? palette.accent : index % 3 === 0 ? palette.text : palette.muted; ctx.fillRect(star.x, Math.floor((star.y + time * (6 + star.z * 19)) % H), star.z > .72 ? 2 : 1, star.z > .9 ? 2 : 1); }); ctx.globalAlpha = 1;
  if (controls.logo.value === 'pixel') drawAnimatedLogo(HEADER_LOGO_Y, palette, time);
  else drawImageCentered(logoImages[controls.logo.value], HEADER_LOGO_Y);
  if (controls.classic.checked) drawClassicArcade(CLASSIC_ARCADE_Y, palette);
  const titleScale = textScale('headerScale');
  const headerFieldY = COPY_TOP_Y;
  const titleLineHeight = titleScale * 10;
  const maxHeaderLines = Math.max(1, Math.floor(HEADER_FIELD_HEIGHT / titleLineHeight));
  const lines = wrap(controls.headline.value, TEXT_FIELD_WIDTH, titleScale, headerFont, 'header', HEADER_TEXT_SPACING).slice(0, maxHeaderLines);
  const headerAlignment = textAlignments.header;
  const titleY = verticallyAlignedStart(headerFieldY, HEADER_FIELD_HEIGHT, lines.length * titleLineHeight, textVerticalAlignments.header);
  lines.forEach((line, index) => styledText('headline', line, alignmentPoint(TEXT_FIELD_X, TEXT_FIELD_WIDTH, headerAlignment), titleY + index * titleLineHeight, palette.text, palette.shadow, titleScale, headerAlignment, headerFont, 'header', HEADER_TEXT_SPACING));
  const boundaries = [{ x: TEXT_FIELD_X, y: headerFieldY, width: TEXT_FIELD_WIDTH, height: HEADER_FIELD_HEIGHT }];
  const detailFieldY = headerFieldY + HEADER_FIELD_HEIGHT + 4;
  const showDetail = contentVisibility.detail && controls.detail.value.trim();
  const detailScale = textScale('detailScale'); const detailLineHeight = detailScale * 12;
  const maxDetailLines = Math.max(1, Math.floor(DETAIL_FIELD_HEIGHT / detailLineHeight));
  const detailLines = showDetail ? scrollModes.detail === 'off' ? wrap(controls.detail.value, TEXT_FIELD_WIDTH, detailScale, detailFont, 'detail').slice(0, maxDetailLines) : [singleLineValue(controls.detail.value)] : [];
  const detailAlignment = textAlignments.detail;
  const detailFieldHeight = showDetail ? Math.min(DETAIL_FIELD_HEIGHT, detailLines.length * detailLineHeight + 8) : 0;
  const detailY = verticallyAlignedStart(detailFieldY, detailFieldHeight, detailLines.length * detailLineHeight, textVerticalAlignments.detail);
  detailLines.forEach((line, index) => {
    const lineY = detailY + index * detailLineHeight;
    if (scrollModes.detail === 'off') styledText('body', line, alignmentPoint(TEXT_FIELD_X, TEXT_FIELD_WIDTH, detailAlignment), lineY, palette.accent, palette.shadow, detailScale, detailAlignment, detailFont, 'detail');
    else scrollingText(line, TEXT_FIELD_X, TEXT_FIELD_WIDTH, lineY, palette.accent, palette.shadow, detailScale, detailFont, 'detail', BODY_TEXT_SPACING, scrollModes.detail);
  });
  const cta = controls.cta.value;
  const showCta = contentVisibility.cta && cta.trim();
  const bodyFieldY = detailFieldY + detailFieldHeight + (showDetail ? 8 : EMPTY_DETAIL_BODY_GAP);
  const bodyScale = textScale('bodyScale'); const bodyLineHeight = bodyScale * 12;
  const maxBodyLines = showCta ? MAX_BODY_LINES_WITH_CTA : Math.max(1, Math.floor((FOOTER_FIELD_Y - bodyFieldY) / bodyLineHeight));
  const bodyLines = wrapWithLineBreaks(controls.body.value, BODY_FIELD_WIDTH, bodyScale, bodyFont, 'body', BODY_TEXT_SPACING, maxBodyLines, true);
  const bodyFieldHeight = showCta ? Math.max(BODY_FIELD_HEIGHT, bodyLines.length * bodyLineHeight) : FOOTER_FIELD_Y - bodyFieldY;
  const bodyAlignment = textAlignments.body;
  const bodyY = verticallyAlignedStart(bodyFieldY, bodyFieldHeight, bodyLines.length * bodyLineHeight, textVerticalAlignments.body);
  const bodyLineWidths = bodyLines.map(line => leaderLineParts(line) ? BODY_FIELD_WIDTH : textWidth(line, bodyScale, bodyFont, 'body', BODY_TEXT_SPACING));
  if (bodyBorderStyle !== 'none' && bodyLines.length) {
    const bodyLineStarts = bodyLineWidths.map(width => alignedStart(BODY_FIELD_X, BODY_FIELD_WIDTH, width, bodyAlignment));
    const contentLeft = Math.min(...bodyLineStarts), contentRight = Math.max(...bodyLineStarts.map((start, index) => start + bodyLineWidths[index]));
    const contentBottom = bodyY + (bodyLines.length - 1) * bodyLineHeight + bodyScale * 10;
    const borderX = Math.floor((contentLeft - 16) / 8) * 8, borderY = Math.floor((bodyY - 16) / 8) * 8;
    const borderRight = Math.ceil((contentRight + 16) / 8) * 8, borderBottom = Math.ceil((contentBottom + 16) / 8) * 8;
    drawBodyBorder(bodyBorderStyle, borderX, borderY, borderRight - borderX, borderBottom - borderY, palette.accent);
  }
  bodyLines.forEach((line, index) => {
    const lineY = bodyY + index * bodyLineHeight;
    if (leaderLineParts(line)) leaderText(line, BODY_FIELD_X, BODY_FIELD_WIDTH, lineY, palette.text, palette.shadow, bodyScale, bodyFont, 'body', BODY_TEXT_SPACING);
    else styledText('body', line, alignmentPoint(BODY_FIELD_X, BODY_FIELD_WIDTH, bodyAlignment), lineY, palette.text, palette.shadow, bodyScale, bodyAlignment);
  });
  if (showDetail) boundaries.push({ x: TEXT_FIELD_X, y: detailFieldY, width: TEXT_FIELD_WIDTH, height: detailFieldHeight });
  boundaries.push({ x: BODY_FIELD_X, y: bodyFieldY, width: BODY_FIELD_WIDTH, height: bodyFieldHeight });
  if (showCta) {
    const ctaScale = textScale('ctaScale'); const buttonMaxWidth = W - 64; const ctaPadding = 12 * ctaScale;
    const ctaLines = wrapWithLineBreaks(cta, buttonMaxWidth - ctaPadding * 2, ctaScale, ctaFont, 'cta', BODY_TEXT_SPACING, 3, true).filter(line => line.trim()).slice(0, 2);
    const buttonWidth = Math.min(buttonMaxWidth, Math.max(...ctaLines.map(line => textWidth(line, ctaScale, ctaFont, 'cta'))) + ctaPadding * 2);
    const ctaGlyphHeight = ctaScale * 8; const ctaLineHeight = ctaScale * 10;
    const buttonHeight = ctaGlyphHeight + (ctaLines.length - 1) * ctaLineHeight + 20;
    const ctaFieldY = bodyFieldY + bodyFieldHeight + 12; const ctaFieldHeight = Math.max(CTA_FIELD_HEIGHT, buttonHeight); const ctaY = verticallyAlignedStart(ctaFieldY, ctaFieldHeight, buttonHeight, textVerticalAlignments.cta) + CTA_VERTICAL_OFFSET;
    const ctaX = alignedStart(32, W - 64, buttonWidth, textAlignments.cta);
    ctx.fillStyle = palette.accent; ctx.fillRect(ctaX, ctaY, buttonWidth, buttonHeight);
    const ctaTextY = ctaY + Math.round((buttonHeight - (ctaGlyphHeight + (ctaLines.length - 1) * ctaLineHeight)) / 2);
    ctaLines.forEach((line, index) => styledText('body', line, ctaX + buttonWidth / 2, ctaTextY + index * ctaLineHeight, palette.background, palette.shadow, ctaScale, 'center', ctaFont, 'cta'));
    boundaries.push({ x: 32, y: ctaFieldY, width: W - 64, height: ctaFieldHeight });
  }
  const footerScale = textScale('footerScale'); const footerLineHeight = footerScale * 12; const hoursLineHeight = HOURS_SCALE * 12;
  const hoursScrolling = scrollModes.hours !== 'off'; const hoursLines = contentVisibility.hours && controls.hours.value.trim() ? hoursScrolling ? [singleLineValue(controls.hours.value)] : wrapWithLineBreaks(controls.hours.value, FOOTER_TEXT_WIDTH, HOURS_SCALE, hoursFont, 'hours', BODY_TEXT_SPACING, 1) : [];
  const footerLines = wrapWithLineBreaks(controls.footer.value, FOOTER_TEXT_WIDTH, footerScale, footerFont, 'footer', BODY_TEXT_SPACING, 2); const hoursGap = hoursLines.length && footerLines.length ? HOURS_ADDRESS_GAP : 0; const footerHeight = hoursLines.length * hoursLineHeight + hoursGap + footerLines.length * footerLineHeight; const footerY = verticallyAlignedStart(FOOTER_FIELD_Y, FOOTER_FIELD_HEIGHT, footerHeight, textVerticalAlignments.footer);
  const footerViewportX = alignedStart(TEXT_FIELD_X, TEXT_FIELD_WIDTH, FOOTER_TEXT_WIDTH, 'center'); const footerTextCenter = TEXT_FIELD_X + TEXT_FIELD_WIDTH / 2;
  hoursLines.forEach((line, index) => {
    const lineY = footerY + index * hoursLineHeight;
    if (hoursScrolling) scrollingText(line, footerViewportX, FOOTER_TEXT_WIDTH, lineY, palette.text, palette.shadow, HOURS_SCALE, hoursFont, 'hours', BODY_TEXT_SPACING, scrollModes.hours);
    else styledText('body', line, footerTextCenter, lineY, palette.text, palette.shadow, HOURS_SCALE, 'center', hoursFont, 'hours');
  });
  footerLines.forEach((line, index) => styledText('body', line, footerTextCenter, footerY + hoursLines.length * hoursLineHeight + hoursGap + index * footerLineHeight, palette.accent, palette.shadow, footerScale, 'center', footerFont, 'footer'));
  boundaries.push({ x: TEXT_FIELD_X, y: FOOTER_FIELD_Y, width: TEXT_FIELD_WIDTH, height: FOOTER_FIELD_HEIGHT });
  const finalFrame = renderCrtPiFrame();
  if (finalFrame !== canvas) ctx.drawImage(finalFrame, 0, 0, W, H);
  exportCtx.drawImage(finalFrame, 0, 0, W * EXPORT_SCALE, H * EXPORT_SCALE);
  if (controls.boundaries.checked) drawTextBoundaries(boundaries, palette);
}
function frame(now) { render(now); requestAnimationFrame(frame); }
function download(blob, name) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function parseHeaderFont(source) {
  const values = source.match(/0x[0-9a-f]{2}/ig) || [];
  if (values.length < 768) throw new Error('header font data is incomplete');
  return Uint8Array.from(values.slice(0, 768), value => Number.parseInt(value.slice(2), 16));
}
async function loadFont(file, name, target, announce = true) {
  const version = (fontLoadVersions.get(target) || 0) + 1; fontLoadVersions.set(target, version);
  const response = await fetch(`./assets/font-data-h/${file}`);
  if (!response.ok) throw new Error(`font request returned ${response.status}`);
  const nextFont = parseHeaderFont(await response.text());
  if (fontLoadVersions.get(target) !== version) return;
  if (target === 'header') headerFont = nextFont;
  else if (target === 'detail') detailFont = nextFont;
  else if (target === 'cta') ctaFont = nextFont;
  else if (target === 'footer') footerFont = nextFont;
  else if (target === 'hours') hoursFont = nextFont;
  else bodyFont = nextFont;
  glyphCache.clear(); glyphBoundsCache.clear();
  if (announce) controls.status.textContent = `${name} loaded as ${target} font.`;
}
async function populateFonts() {
  const response = await fetch('./assets/font-data-h/index.json');
  if (!response.ok) throw new Error(`font index returned ${response.status}`);
  const fonts = await response.json();
  const options = () => fonts.map(font => new Option(font.name, font.file));
  const reactorFile = fonts.find(font => font.name === 'Reactor')?.file || fonts[0]?.file;
  const beachballFile = fonts.find(font => font.name === 'Beachball')?.file || reactorFile;
  const footerFile = fonts.find(font => font.name === 'Cinema Bold')?.file || reactorFile;
  ['font', 'headerFont', 'detailFont', 'ctaFont', 'footerFont'].forEach(controlName => {
    controls[controlName].replaceChildren(...options());
    controls[controlName].value = controlName === 'footerFont' ? footerFile : controlName === 'font' ? beachballFile : reactorFile;
  });
  renderFontPickers();
  return fonts;
}
function loadSelectedFont(controlName, target, announce = true) {
  const option = controls[controlName].selectedOptions[0];
  return loadFont(option.value, option.textContent, target, announce);
}
function saveFontFavorites() { try { localStorage.setItem(FONT_FAVORITES_KEY, JSON.stringify([...fontFavorites])); } catch {} }
function closeFontPickers(except = null) {
  document.querySelectorAll('.font-picker-menu').forEach(menu => { if (menu !== except) menu.hidden = true; });
  document.querySelectorAll('.font-picker-trigger').forEach(trigger => trigger.setAttribute('aria-expanded', String(trigger.nextElementSibling === except && !except.hidden)));
}
function syncFontPickerSelection(controlName) {
  const select = controls[controlName]; const picker = select?.nextElementSibling;
  if (!select || !picker?.classList.contains('font-picker')) return;
  const selected = select.selectedOptions[0]; picker.querySelector('.font-picker-trigger span').textContent = selected?.textContent || 'Select font';
  picker.querySelectorAll('[data-font-value]').forEach(choice => choice.setAttribute('aria-selected', String(choice.dataset.fontValue === select.value)));
}
function stepFontPicker(controlName, direction) {
  const select = controls[controlName]; const options = [...select.options]; const index = options.findIndex(option => option.value === select.value);
  const nextIndex = Math.min(options.length - 1, Math.max(0, index + direction));
  if (nextIndex === index) return;
  select.value = options[nextIndex].value; syncFontPickerSelection(controlName); select.dispatchEvent(new Event('change'));
}
function renderFontPicker(controlName) {
  const select = controls[controlName]; if (!select) return;
  let picker = select.nextElementSibling;
  if (!picker?.classList.contains('font-picker')) {
    picker = document.createElement('div'); picker.className = 'font-picker'; select.classList.add('font-picker-native'); select.after(picker);
  }
  picker.dataset.fontControl = controlName;
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'font-picker-trigger'; trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-expanded', 'false');
  const label = document.createElement('span'); label.textContent = select.selectedOptions[0]?.textContent || 'Select font'; const chevron = document.createElement('i'); chevron.dataset.lucide = 'chevron-down'; chevron.setAttribute('aria-hidden', 'true'); trigger.append(label, chevron);
  const menu = document.createElement('div'); menu.className = 'font-picker-menu'; menu.setAttribute('role', 'listbox'); menu.setAttribute('aria-label', `${select.getAttribute('aria-label') || 'Font'} options`); menu.hidden = true;
  const options = [...select.options]; const favorites = options.filter(option => fontFavorites.has(option.textContent)); const remaining = options.filter(option => !fontFavorites.has(option.textContent));
  const addGroup = (title, group) => {
    if (!group.length) return;
    const container = document.createElement('div'); container.className = 'font-picker-group'; const heading = document.createElement('span'); heading.className = 'font-picker-label'; heading.textContent = title; container.append(heading);
    group.forEach(option => {
      const row = document.createElement('div'); row.className = 'font-picker-row';
      const choice = document.createElement('button'); choice.type = 'button'; choice.className = 'font-picker-choice'; choice.dataset.fontValue = option.value; choice.textContent = option.textContent; choice.setAttribute('role', 'option'); choice.setAttribute('aria-selected', String(option.selected));
      choice.addEventListener('click', () => { select.value = option.value; select.dispatchEvent(new Event('change')); closeFontPickers(); renderFontPickers(); });
      const favorite = document.createElement('button'); favorite.type = 'button'; favorite.className = 'font-favorite'; favorite.dataset.fontFavorite = option.textContent; const selected = fontFavorites.has(option.textContent); favorite.classList.toggle('is-favorite', selected); favorite.title = selected ? `Remove ${option.textContent} from favorites` : `Add ${option.textContent} to favorites`; favorite.setAttribute('aria-label', favorite.title); favorite.setAttribute('aria-pressed', String(selected));
      const heart = document.createElement('i'); heart.dataset.lucide = 'heart'; heart.setAttribute('aria-hidden', 'true'); favorite.append(heart);
      favorite.addEventListener('click', () => {
        if (fontFavorites.has(option.textContent)) fontFavorites.delete(option.textContent); else fontFavorites.add(option.textContent);
        saveFontFavorites(); renderFontPickers();
        const refreshedPicker = select.nextElementSibling; const refreshedMenu = refreshedPicker?.querySelector('.font-picker-menu'); const refreshedTrigger = refreshedPicker?.querySelector('.font-picker-trigger');
        if (refreshedMenu && refreshedTrigger) {
          closeFontPickers(refreshedMenu); refreshedMenu.hidden = false; refreshedTrigger.setAttribute('aria-expanded', 'true'); refreshedTrigger.focus();
        }
      });
      row.append(choice, favorite); container.append(row);
    });
    menu.append(container);
  };
  addGroup('FAVORITES', favorites); addGroup(favorites.length ? 'ALL FONTS' : 'FONTS', remaining);
  trigger.addEventListener('click', () => { const opening = menu.hidden; closeFontPickers(opening ? menu : null); menu.hidden = !opening; trigger.setAttribute('aria-expanded', String(opening)); });
  trigger.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault(); stepFontPicker(controlName, event.key === 'ArrowDown' ? 1 : -1);
  });
  picker.replaceChildren(trigger, menu);
}
function renderFontPickers() {
  FONT_CONTROL_NAMES.forEach(renderFontPicker);
  window.lucide?.createIcons({ attrs: { width: 14, height: 14, 'stroke-width': 2 } });
}
document.addEventListener('pointerdown', event => { if (!event.target.closest('.font-picker')) closeFontPickers(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeFontPickers(); });
function drawGlyphTile(canvasElement, glyphData) {
  const tileCtx = canvasElement.getContext('2d'); tileCtx.imageSmoothingEnabled = false;
  tileCtx.clearRect(0, 0, canvasElement.width, canvasElement.height); tileCtx.fillStyle = colors[controls.theme.value].text;
  for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) if (glyphData.bitmap[row] & (128 >> column)) tileCtx.fillRect(column * 2, row * 2, 2, 2);
}
function createEditorGlyph(glyphData) {
  const glyph = document.createElement('span');
  glyph.className = 'editor-glyph'; glyph.dataset.glyphId = glyphData.id; glyph.contentEditable = 'false'; glyph.textContent = LEGACY_UNICODE[glyphData.id] || '◇';
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
      span.dataset.effect = effect; if (effect === 'shadow') span.className = 'editor-effect-shadow'; else if (effect === 'highlight') span.className = 'editor-effect-highlight'; else if (effect === 'underline') span.className = 'editor-effect-underline'; else if (effect === 'superscript') span.className = 'editor-effect-superscript'; else if (effect === 'subscript') span.className = 'editor-effect-subscript'; else if (effect === 'stroke') span.className = 'editor-effect-stroke'; else if (['blink', 'flash', 'reflect', 'wave', 'sweep'].includes(effect)) span.className = `editor-effect-${effect}`;
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
      span.className = effect === 'shadow' ? 'editor-effect-shadow' : effect === 'highlight' ? 'editor-effect-highlight' : effect === 'underline' ? 'editor-effect-underline' : effect === 'superscript' ? 'editor-effect-superscript' : effect === 'subscript' ? 'editor-effect-subscript' : effect === 'stroke' ? 'editor-effect-stroke' : ['blink', 'flash', 'reflect', 'wave', 'sweep'].includes(effect) ? `editor-effect-${effect}` : '';
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
      span.className = effect === 'shadow' ? 'editor-effect-shadow' : effect === 'highlight' ? 'editor-effect-highlight' : effect === 'underline' ? 'editor-effect-underline' : effect === 'superscript' ? 'editor-effect-superscript' : effect === 'subscript' ? 'editor-effect-subscript' : effect === 'stroke' ? 'editor-effect-stroke' : ['blink', 'flash', 'reflect', 'wave', 'sweep'].includes(effect) ? `editor-effect-${effect}` : '';
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
      span.className = effect === 'shadow' ? 'editor-effect-shadow' : effect === 'highlight' ? 'editor-effect-highlight' : effect === 'underline' ? 'editor-effect-underline' : effect === 'superscript' ? 'editor-effect-superscript' : effect === 'subscript' ? 'editor-effect-subscript' : effect === 'stroke' ? 'editor-effect-stroke' : ['blink', 'flash', 'reflect', 'wave', 'sweep'].includes(effect) ? `editor-effect-${effect}` : '';
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
function serializeBodyNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  if (node.matches('[data-glyph-id]')) return `[[${node.dataset.glyphId}]]`;
  if (node.matches('[data-leader-tab]')) return LEADER_TAB_TOKEN;
  if (node.tagName === 'BR') return '\n';
  const content = [...node.childNodes].map(serializeBodyNode).join('');
  if (node.matches('[data-effect]')) return `[[effect:${node.dataset.effect}]]${content}[[/effect]]`;
  return /^(DIV|P)$/.test(node.tagName) ? `${content}\n` : content;
}
function syncBodySource() { controls.body.value = [...controls.bodyEditor.childNodes].map(serializeBodyNode).join('').replace(/\n+$/, ''); }
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
        units.push({ raw: LEADER_TAB_TOKEN, start: offset, end: offset + 1, sourceStart: match.index, sourceEnd: expression.lastIndex, effects: [...effects] }); offset += 1;
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
    let shared = 0;
    while (shared < activeEffects.length && shared < unit.effects.length && activeEffects[shared] === unit.effects[shared]) shared += 1;
    value += '[[/effect]]'.repeat(activeEffects.length - shared);
    activeEffects = activeEffects.slice(0, shared);
    unit.effects.slice(shared).forEach(effect => value += `[[effect:${effect}]]`);
    activeEffects = [...unit.effects]; unit.outputStart = value.length; value += unit.raw; unit.outputEnd = value.length;
  });
  return value + '[[/effect]]'.repeat(activeEffects.length);
}
function toggleBodyEffect(effect) {
  const range = bodyEffectSelectionRange();
  if (!range) return;
  const { start, end } = bodySelectionOffsets(range); const units = bodyStyledUnits(controls.body.value);
  const selected = units.filter(unit => unit.start < end && unit.end > start);
  if (!selected.length) return;
  const removing = selected.every(unit => unit.effects.includes(effect));
  selected.forEach(unit => { unit.effects = removing ? unit.effects.filter(item => item !== effect) : unit.effects.includes(effect) ? unit.effects : [...unit.effects, effect]; });
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
  const selected = units.filter(unit => unit.start < end && unit.end > start); if (!selected.length) return;
  const removing = selected.every(unit => unit.effects.includes(effect));
  selected.forEach(unit => { unit.effects = removing ? unit.effects.filter(item => item !== effect) : unit.effects.includes(effect) ? unit.effects : [...unit.effects, effect]; });
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
  const start = bodyNodeLength(before.cloneContents()); const end = start + bodyNodeLength(range.cloneContents()); const units = bodyStyledUnits(controls.detail.value); const selected = units.filter(unit => unit.start < end && unit.end > start); if (!selected.length) return;
  const removing = selected.every(unit => unit.effects.includes(effect)); selected.forEach(unit => { unit.effects = removing ? unit.effects.filter(item => item !== effect) : unit.effects.includes(effect) ? unit.effects : [...unit.effects, effect]; });
  controls.detail.value = serializeBodyUnits(units); hydrateDetailEditor();
  const pointAt = offset => { let remaining = Math.max(0, offset); const find = node => { if (node.nodeType === Node.TEXT_NODE) return { container: node, offset: Math.min(remaining, node.textContent.length) }; for (const child of node.childNodes) { const length = bodyNodeLength(child); if (remaining <= length) return find(child); remaining -= length; } return { container: node, offset: node.childNodes.length }; }; return find(controls.detailEditor); };
  controls.detailEditor.focus(); const restored = document.createRange(); const startPoint = pointAt(start); const endPoint = pointAt(end); restored.setStart(startPoint.container, startPoint.offset); restored.setEnd(endPoint.container, endPoint.offset); selection.removeAllRanges(); selection.addRange(restored); savedDetailRange = restored.cloneRange();
}
function toggleCtaEffect(effect) {
  const selection = window.getSelection(); let range = null;
  if (selection.rangeCount) { const current = selection.getRangeAt(0); if (!current.collapsed && controls.ctaEditor.contains(current.startContainer) && controls.ctaEditor.contains(current.endContainer)) { savedCtaRange = current.cloneRange(); range = current; } }
  range ||= savedCtaRange; if (!range || range.collapsed) return;
  const before = document.createRange(); before.selectNodeContents(controls.ctaEditor); before.setEnd(range.startContainer, range.startOffset);
  const start = bodyNodeLength(before.cloneContents()); const end = start + bodyNodeLength(range.cloneContents()); const units = bodyStyledUnits(controls.cta.value); const selected = units.filter(unit => unit.start < end && unit.end > start); if (!selected.length) return;
  const removing = selected.every(unit => unit.effects.includes(effect)); selected.forEach(unit => { unit.effects = removing ? unit.effects.filter(item => item !== effect) : unit.effects.includes(effect) ? unit.effects : [...unit.effects, effect]; });
  controls.cta.value = serializeBodyUnits(units); hydrateCtaEditor();
  const pointAt = offset => { let remaining = Math.max(0, offset); const find = node => { if (node.nodeType === Node.TEXT_NODE) return { container: node, offset: Math.min(remaining, node.textContent.length) }; for (const child of node.childNodes) { const length = bodyNodeLength(child); if (remaining <= length) return find(child); remaining -= length; } return { container: node, offset: node.childNodes.length }; }; return find(controls.ctaEditor); };
  controls.ctaEditor.focus(); const restored = document.createRange(); const startPoint = pointAt(start); const endPoint = pointAt(end); restored.setStart(startPoint.container, startPoint.offset); restored.setEnd(endPoint.container, endPoint.offset); selection.removeAllRanges(); selection.addRange(restored); savedCtaRange = restored.cloneRange();
}
function toggleInputEffect(control, effect) {
  const start = control.selectionStart, end = control.selectionEnd;
  if (start === null || end === null || start === end) return;
  const units = bodyStyledUnits(control.value);
  const selected = units.filter(unit => unit.sourceStart < end && unit.sourceEnd > start);
  if (!selected.length) return;
  const removing = selected.every(unit => unit.effects.includes(effect));
  selected.forEach(unit => { unit.effects = removing ? unit.effects.filter(item => item !== effect) : unit.effects.includes(effect) ? unit.effects : [...unit.effects, effect]; });
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
  const next = document.createRange(); next.setStartAfter(glyph); next.collapse(true); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(next); savedHeaderRange = next.cloneRange(); controls.headerEditor.focus(); controls.headline.value = [...controls.headerEditor.childNodes].map(serializeBodyNode).join('').replace(/\n+$/, '');
}
function insertCtaGlyph(glyphData) {
  const range = savedCtaRange || document.createRange();
  if (!savedCtaRange) range.selectNodeContents(controls.ctaEditor), range.collapse(false);
  range.deleteContents(); const glyph = createEditorGlyph(glyphData); range.insertNode(glyph);
  const next = document.createRange(); next.setStartAfter(glyph); next.collapse(true); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(next); savedCtaRange = next.cloneRange(); controls.ctaEditor.focus(); controls.cta.value = [...controls.ctaEditor.childNodes].map(serializeBodyNode).join('').replace(/\n+$/, '');
}
function insertCtaLineBreak() {
  const selection = window.getSelection(); const range = selection.rangeCount && controls.ctaEditor.contains(selection.getRangeAt(0).commonAncestorContainer) ? selection.getRangeAt(0) : savedCtaRange || document.createRange();
  if (!range.commonAncestorContainer.parentNode) range.selectNodeContents(controls.ctaEditor), range.collapse(false);
  range.deleteContents(); const lineBreak = document.createElement('br'); range.insertNode(lineBreak);
  range.setStartAfter(lineBreak); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); savedCtaRange = range.cloneRange(); controls.ctaEditor.focus(); controls.cta.value = [...controls.ctaEditor.childNodes].map(serializeBodyNode).join('').replace(/\n+$/, '');
}
function applyCharacterEffect(section, effect) {
  const scaleControl = { header: 'headerScale', detail: 'detailScale', body: 'bodyScale', cta: 'ctaScale' }[section];
  if (['superscript', 'subscript'].includes(effect) && textScale(scaleControl) === 1) return;
  if (section === 'body') {
    toggleBodyEffect(effect);
  } else if (section === 'header') {
    toggleHeaderEffect(effect);
  } else if (section === 'detail') {
    toggleDetailEffect(effect);
  } else if (section === 'cta') {
    toggleCtaEffect(effect);
  } else {
    const control = { header: controls.headline, detail: controls.detail }[section];
    toggleInputEffect(control, effect);
  }
}
function syncCharacterToolAvailability() {
  ['header', 'detail', 'body', 'cta'].forEach(section => {
    const scaleControl = { header: 'headerScale', detail: 'detailScale', body: 'bodyScale', cta: 'ctaScale' }[section];
    const available = textScale(scaleControl) > 1;
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
  hydrateBodyEditor();
  const pickerGlyphs = library.glyphs.filter(glyphData => {
    return glyphData.system === 'ATASCII' ? ATASCII_PICKER_SLOTS.has(glyphData.slot) : glyphData.system === 'PETSCII' && PETSCII_PICKER_SLOTS.has(glyphData.slot);
  });
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
[['font', 'body'], ['headerFont', 'header'], ['detailFont', 'detail'], ['ctaFont', 'cta'], ['footerFont', 'footer']].forEach(([controlName, target]) => {
  controls[controlName].addEventListener('change', () => {
    syncFontPickerSelection(controlName);
    loadSelectedFont(controlName, target).catch(error => { controls.status.textContent = `Could not load ${controls[controlName].selectedOptions[0].textContent}: ${error.message}`; });
  });
});
controls.theme.addEventListener('change', syncThemePreview); syncThemePreview();
controls.crtLook.addEventListener('change', () => {
  applyCrtLook(controls.crtLook.value);
  if (controls.crtLook.value !== 'custom') controls.status.textContent = `${controls.crtLook.selectedOptions[0].textContent} CRT look applied.`;
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
async function applyTemplate(template) {
  controls.theme.value = template.theme; controls.logo.value = template.logo; controls.classic.checked = template.classic;
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
  syncThemePreview(); syncDetailToggle(); syncCtaToggle(); syncHoursToggle(); syncScrollModes(); syncCharacterToolAvailability(); syncBodyBorderControls(); renderFontPickers(); hydrateBodyEditor(); hydrateHeaderEditor(); hydrateDetailEditor(); hydrateCtaEditor();
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
      return button;
    });
    toolbar.replaceChildren(...buttons);
  });
  document.querySelectorAll('.animation-buttons').forEach(toolbar => {
    const section = toolbar.dataset.animationToolbar;
    const buttons = Array.from({ length: 7 }, (_, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'animation-slot';
      if (index < 5) {
        const animation = ['blink', 'flash', 'reflect', 'wave', 'sweep'][index];
        const icon = { blink: 'eye-off', flash: 'contrast', reflect: 'scan-line', wave: 'waves', sweep: 'move-right' }[animation];
        const label = { blink: 'blink', flash: 'alternate text and highlight', reflect: 'reflect', wave: 'wave', sweep: 'sweep highlight' }[animation];
        button.dataset.animationControl = animation; button.title = `${section} ${label} selected text`;
        button.setAttribute('aria-label', `${section} ${label} selected text`);
        const iconElement = document.createElement('i'); iconElement.dataset.lucide = icon; iconElement.setAttribute('aria-hidden', 'true'); iconElement.textContent = animation[0].toUpperCase(); button.append(iconElement);
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => applyCharacterEffect(section, animation));
      } else {
        button.title = `${section} animation control ${index + 1}`; button.setAttribute('aria-label', `${section} animation control ${index + 1}`);
      }
      return button;
    });
    toolbar.replaceChildren(...buttons);
  });
  document.querySelectorAll('.border-buttons').forEach(toolbar => {
    const buttons = ['square', 'rounded'].map(style => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'border-option';
      button.dataset.borderStyle = style; button.title = `${style} body border`; button.setAttribute('aria-label', `${style} body border`);
      const iconElement = document.createElement('i'); iconElement.dataset.lucide = style === 'square' ? 'square' : 'rounded-corner'; iconElement.setAttribute('aria-hidden', 'true'); iconElement.textContent = style === 'square' ? 'S' : 'R'; button.append(iconElement);
      button.addEventListener('click', () => { bodyBorderStyle = bodyBorderStyle === style ? 'none' : style; syncBodyBorderControls(); });
      return button;
    });
    toolbar.replaceChildren(...buttons);
  });
  syncCharacterToolAvailability(); syncBodyBorderControls();
  window.lucide?.createIcons({ attrs: { width: 14, height: 14, 'stroke-width': 2 } });
}
populateToolbars();
[controls.detail, controls.hours, controls.footer].forEach(control => control.addEventListener('focus', () => { activeTextControl = control; }));
controls.headerEditor.addEventListener('focus', () => { activeTextControl = controls.headerEditor; });
controls.headerEditor.addEventListener('input', () => { activeTextControl = controls.headerEditor; controls.headline.value = [...controls.headerEditor.childNodes].map(serializeBodyNode).join('').replace(/\n+$/, ''); });
controls.headerEditor.addEventListener('keyup', () => { const selection = window.getSelection(); if (selection.rangeCount) savedHeaderRange = selection.getRangeAt(0).cloneRange(); });
controls.headerEditor.addEventListener('mouseup', () => { const selection = window.getSelection(); if (selection.rangeCount) savedHeaderRange = selection.getRangeAt(0).cloneRange(); });
controls.detailEditor.addEventListener('focus', () => { activeTextControl = controls.detailEditor; });
controls.detailEditor.addEventListener('input', () => { activeTextControl = controls.detailEditor; controls.detail.value = [...controls.detailEditor.childNodes].map(serializeBodyNode).join('').replace(/\n+$/, ''); });
controls.detailEditor.addEventListener('keydown', event => { if (event.key === 'Enter') event.preventDefault(); });
controls.detailEditor.addEventListener('keyup', () => { const selection = window.getSelection(); if (selection.rangeCount) savedDetailRange = selection.getRangeAt(0).cloneRange(); });
controls.detailEditor.addEventListener('mouseup', () => { const selection = window.getSelection(); if (selection.rangeCount) savedDetailRange = selection.getRangeAt(0).cloneRange(); });
controls.ctaEditor.addEventListener('focus', () => { activeTextControl = controls.ctaEditor; });
controls.ctaEditor.addEventListener('input', () => { activeTextControl = controls.ctaEditor; controls.cta.value = [...controls.ctaEditor.childNodes].map(serializeBodyNode).join('').replace(/\n+$/, ''); });
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
    controls.status.textContent = 'Default fonts loaded.';
  } catch (error) {
    controls.status.textContent = `Font library could not load: ${error.message}`;
  }
}
hydrateHeaderEditor(); hydrateDetailEditor(); hydrateCtaEditor(); resetStars(); controls.status.textContent = 'Loading header font library...'; initializeFonts(); loadLegacyGlyphs().catch(error => { controls.glyphGrid.textContent = `Could not load glyphs: ${error.message}`; }); requestAnimationFrame(frame);
