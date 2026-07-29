const FONT_CONTROL_NAMES = ['font', 'headerFont', 'detailFont', 'ctaFont', 'footerFont'];
const FONT_FAVORITES_KEY = 'gk-promo-font-favorites';

export function createFontManager({ controls, onFontChange, onFontLoaded }) {
  const fontFavorites = new Set((() => { try { return JSON.parse(localStorage.getItem(FONT_FAVORITES_KEY)) || []; } catch { return []; } })());
  const fontLoadVersions = new Map();
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
    onFontLoaded(target, nextFont);
    onFontChange();
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
  [['font', 'body'], ['headerFont', 'header'], ['detailFont', 'detail'], ['ctaFont', 'cta'], ['footerFont', 'footer']].forEach(([controlName, target]) => {
    controls[controlName].addEventListener('change', () => {
      syncFontPickerSelection(controlName);
      loadSelectedFont(controlName, target).catch(error => { controls.status.textContent = `Could not load ${controls[controlName].selectedOptions[0].textContent}: ${error.message}`; });
    });
  });
  document.addEventListener('pointerdown', event => { if (!event.target.closest('.font-picker')) closeFontPickers(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeFontPickers(); });
  return {
    loadFont,
    populateFonts,
    loadSelectedFont,
    renderFontPickers
  };
}
