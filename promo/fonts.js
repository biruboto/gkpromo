const FONT_CONTROL_NAMES = ['font', 'headerFont', 'detailFont', 'ctaFont', 'footerFont'];
const FONT_FAVORITES_KEY = 'gk-promo-font-favorites';
const LIBRARIES = ['default', 'games'];

export function createFontManager({ controls, onFontChange, onFontLoaded }) {
  const storedFavorites = (() => { try { return JSON.parse(localStorage.getItem(FONT_FAVORITES_KEY)) || []; } catch { return []; } })();
  const fontFavorites = new Set(Array.isArray(storedFavorites) ? storedFavorites : []);
  const fontLoadVersions = new Map();
  const activeLibraries = new Map(FONT_CONTROL_NAMES.map(controlName => [controlName, 'default']));
  const selectedVariants = new Map(FONT_CONTROL_NAMES.map(controlName => [controlName, 0]));
  const arcadeImageCache = new Map();
  const arcadeFontCache = new Map();
  let defaultFonts = [];
  let gamesFonts = null;
  let gamesRequest = null;

  function parseHeaderFont(source) {
    const values = source.match(/0x[0-9a-f]{2}/ig) || [];
    if (values.length < 768) throw new Error('header font data is incomplete');
    return Uint8Array.from(values.slice(0, 768), value => Number.parseInt(value.slice(2), 16));
  }

  function beginLoad(target) {
    const version = (fontLoadVersions.get(target) || 0) + 1;
    fontLoadVersions.set(target, version);
    return version;
  }

  function finishLoad(target, version, font) {
    if (fontLoadVersions.get(target) !== version) return false;
    onFontLoaded(target, font);
    onFontChange();
    return true;
  }

  async function loadFont(file, name, target, announce = true) {
    const version = beginLoad(target);
    const response = await fetch(`./assets/font-data-h/${file}`);
    if (!response.ok) throw new Error(`font request returned ${response.status}`);
    const nextFont = parseHeaderFont(await response.text());
    if (!finishLoad(target, version, nextFont)) return;
    if (announce) controls.status.textContent = `${name} loaded as ${target} font.`;
  }

  function arcadeSource(font) {
    if (!arcadeImageCache.has(font.asset)) {
      arcadeImageCache.set(font.asset, new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => {
          if (image.naturalWidth !== font.width || image.naturalHeight !== font.height || image.naturalWidth % 8 || image.naturalHeight % 8) {
            reject(new Error(`${font.name} is not an 8 x 8 glyph sheet`));
            return;
          }
          resolve(image);
        };
        image.onerror = () => reject(new Error(`could not load ${font.asset}`));
        image.src = new URL(`../assets/arcade-fonts/${font.asset}`, import.meta.url).href;
      }));
    }
    return arcadeImageCache.get(font.asset);
  }

  async function arcadeVariant(font, variant) {
    const safeVariant = Math.min(font.variants.length - 1, Math.max(0, variant));
    const cacheKey = `${font.id}:${safeVariant}`;
    if (arcadeFontCache.has(cacheKey)) return arcadeFontCache.get(cacheKey);
    const image = await arcadeSource(font);
    const atlas = document.createElement('canvas');
    atlas.width = font.width; atlas.height = 8;
    const context = atlas.getContext('2d', { willReadFrequently: true });
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, safeVariant * 8, font.width, 8, 0, 0, font.width, 8);
    const imageData = context.getImageData(0, 0, font.width, 8);
    if (font.transparentFromTopLeft) {
      const background = imageData.data.slice(0, 3);
      for (let offset = 0; offset < imageData.data.length; offset += 4) {
        if (background.every((channel, index) => imageData.data[offset + index] === channel)) imageData.data[offset + 3] = 0;
      }
      context.putImageData(imageData, 0, 0);
    }
    const nextFont = { kind: 'arcade', id: `games:${font.id}@${safeVariant}`, atlas, pixels: imageData.data, slotCount: font.slotCount, variant: safeVariant };
    arcadeFontCache.set(cacheKey, nextFont);
    return nextFont;
  }

  async function loadArcadeFont(font, variant, target, announce = true) {
    const version = beginLoad(target);
    if (announce) controls.status.textContent = `Loading ${font.name} variant ${font.variants[variant]}...`;
    const nextFont = await arcadeVariant(font, variant);
    if (!finishLoad(target, version, nextFont)) return;
    if (announce) controls.status.textContent = `${font.name} variant ${font.variants[variant]} loaded as ${target} font.`;
  }

  function defaultOption(font) {
    const option = new Option(font.name, font.file);
    option.dataset.fontLibrary = 'default'; option.dataset.fontId = `default:${font.file}`;
    return option;
  }

  function gameOption(font) {
    const option = new Option(font.name, `games:${font.id}`);
    option.dataset.fontLibrary = 'games'; option.dataset.fontId = `games:${font.id}`;
    option.dataset.fontManufacturer = font.manufacturer; option.dataset.fontVariants = String(font.variants.length);
    return option;
  }

  function appendGameOptions() {
    if (!gamesFonts) return;
    FONT_CONTROL_NAMES.forEach(controlName => {
      const select = controls[controlName];
      const selectedValue = select.value;
      [...select.options].filter(option => option.dataset.fontLibrary === 'games').forEach(option => option.remove());
      gamesFonts.forEach(font => select.add(gameOption(font)));
      select.value = selectedValue;
    });
  }

  async function ensureGamesLibrary() {
    if (gamesFonts) return gamesFonts;
    if (!gamesRequest) {
      gamesRequest = fetch('./arcade/index.json').then(async response => {
        if (!response.ok) throw new Error(`Games font index returned ${response.status}`);
        const index = await response.json();
        if (index.version !== 1 || index.cellSize !== 8 || !Array.isArray(index.fonts)) throw new Error('Games font index is not supported');
        gamesFonts = index.fonts;
        appendGameOptions();
        migrateFavorites();
        return gamesFonts;
      }).catch(error => { gamesRequest = null; throw error; });
    }
    return gamesRequest;
  }

  function migrateFavorites() {
    let changed = false;
    [...fontFavorites].forEach(favorite => {
      if (favorite.includes(':')) return;
      const option = FONT_CONTROL_NAMES.flatMap(controlName => [...controls[controlName].options]).find(item => item.textContent === favorite);
      if (!option) return;
      fontFavorites.delete(favorite); fontFavorites.add(option.dataset.fontId); changed = true;
    });
    if (changed) saveFontFavorites();
  }

  async function populateFonts() {
    const response = await fetch('./assets/font-data-h/index.json');
    if (!response.ok) throw new Error(`font index returned ${response.status}`);
    defaultFonts = await response.json();
    const reactorFile = defaultFonts.find(font => font.name === 'Reactor')?.file || defaultFonts[0]?.file;
    const beachballFile = defaultFonts.find(font => font.name === 'Beachball')?.file || reactorFile;
    const footerFile = defaultFonts.find(font => font.name === 'Cinema Bold')?.file || reactorFile;
    FONT_CONTROL_NAMES.forEach(controlName => {
      controls[controlName].replaceChildren(...defaultFonts.map(defaultOption));
      controls[controlName].value = controlName === 'footerFont' ? footerFile : controlName === 'font' ? beachballFile : reactorFile;
    });
    migrateFavorites();
    renderFontPickers();
    return defaultFonts;
  }

  function selectedGame(controlName) {
    const option = controls[controlName].selectedOptions[0];
    if (option?.dataset.fontLibrary !== 'games') return null;
    return gamesFonts?.find(font => `games:${font.id}` === option.value) || null;
  }

  function loadSelectedFont(controlName, target, announce = true) {
    const option = controls[controlName].selectedOptions[0];
    if (option?.dataset.fontLibrary === 'games') {
      const font = selectedGame(controlName);
      if (!font) return Promise.reject(new Error('Games font metadata is unavailable'));
      const variant = Math.min(font.variants.length - 1, selectedVariants.get(controlName) || 0);
      selectedVariants.set(controlName, variant);
      return loadArcadeFont(font, variant, target, announce);
    }
    return loadFont(option.value, option.textContent, target, announce);
  }

  function saveFontFavorites() { try { localStorage.setItem(FONT_FAVORITES_KEY, JSON.stringify([...fontFavorites])); } catch {} }

  function closeFontPickers(except = null) {
    document.querySelectorAll('.font-picker-menu').forEach(menu => { if (menu !== except) menu.hidden = true; });
    document.querySelectorAll('.font-picker-trigger').forEach(trigger => trigger.setAttribute('aria-expanded', String(trigger.nextElementSibling === except && !except.hidden)));
  }

  function selectedLabel(controlName) {
    const select = controls[controlName];
    const option = select.selectedOptions[0];
    const game = selectedGame(controlName);
    return game ? `${option.textContent} · ${game.variants[selectedVariants.get(controlName) || 0]}` : option?.textContent || 'Select font';
  }

  function syncFontPickerSelection(controlName) {
    const select = controls[controlName]; const picker = select?.nextElementSibling;
    if (!select || !picker?.classList.contains('font-picker')) return;
    picker.querySelector('.font-picker-trigger span').textContent = selectedLabel(controlName);
    picker.querySelectorAll('[data-font-value]').forEach(choice => choice.setAttribute('aria-selected', String(choice.dataset.fontValue === select.value)));
  }

  function stepFontPicker(controlName, direction) {
    const select = controls[controlName]; const library = activeLibraries.get(controlName);
    const options = [...select.options].filter(option => option.dataset.fontLibrary === library);
    const index = options.findIndex(option => option.value === select.value);
    const nextIndex = Math.min(options.length - 1, Math.max(0, (index < 0 ? direction < 0 ? options.length : -1 : index) + direction));
    if (!options[nextIndex] || options[nextIndex].value === select.value) return;
    select.value = options[nextIndex].value; selectedVariants.set(controlName, 0); syncFontPickerSelection(controlName);
    loadSelectedFont(controlName, FONT_TARGETS[controlName]).catch(error => { controls.status.textContent = `Could not load ${options[nextIndex].textContent}: ${error.message}`; });
  }

  function reopenFontPicker(controlName) {
    const picker = controls[controlName].nextElementSibling;
    const menu = picker?.querySelector('.font-picker-menu'); const trigger = picker?.querySelector('.font-picker-trigger');
    if (!menu || !trigger) return;
    closeFontPickers(menu); menu.hidden = false; trigger.setAttribute('aria-expanded', 'true');
  }

  function renderFontPicker(controlName) {
    const select = controls[controlName]; if (!select) return;
    let picker = select.nextElementSibling;
    if (!picker?.classList.contains('font-picker')) {
      picker = document.createElement('div'); picker.className = 'font-picker'; select.classList.add('font-picker-native'); select.after(picker);
    }
    picker.dataset.fontControl = controlName;
    const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'font-picker-trigger'; trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-expanded', 'false');
    const label = document.createElement('span'); label.textContent = selectedLabel(controlName); const chevron = document.createElement('i'); chevron.dataset.lucide = 'chevron-down'; chevron.setAttribute('aria-hidden', 'true'); trigger.append(label, chevron);
    const menu = document.createElement('div'); menu.className = 'font-picker-menu'; menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', `${select.getAttribute('aria-label') || 'Font'} options`); menu.hidden = true;

    const tools = document.createElement('div'); tools.className = 'font-picker-tools';
    const libraryControl = document.createElement('div'); libraryControl.className = 'font-library-toggle'; libraryControl.setAttribute('role', 'group'); libraryControl.setAttribute('aria-label', 'Font library');
    LIBRARIES.forEach(library => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = library.toUpperCase(); button.dataset.fontLibrary = library; button.setAttribute('aria-pressed', String(activeLibraries.get(controlName) === library));
      button.addEventListener('click', async () => {
        activeLibraries.set(controlName, library);
        if (library === 'games' && !gamesFonts) {
          button.textContent = 'LOADING';
          try { await ensureGamesLibrary(); } catch (error) { controls.status.textContent = `Could not load Games fonts: ${error.message}`; return; }
        }
        renderFontPickers(); reopenFontPicker(controlName);
      });
      libraryControl.append(button);
    });
    const search = document.createElement('input'); search.type = 'search'; search.className = 'font-picker-search'; search.placeholder = 'Search fonts'; search.setAttribute('aria-label', 'Search fonts');
    tools.append(libraryControl, search);

    const game = selectedGame(controlName);
    if (game) {
      const variant = selectedVariants.get(controlName) || 0;
      const variantControl = document.createElement('div'); variantControl.className = 'font-variant-control';
      const previous = document.createElement('button'); previous.type = 'button'; previous.title = 'Previous font variant'; previous.setAttribute('aria-label', previous.title); previous.disabled = variant === 0;
      const previousIcon = document.createElement('i'); previousIcon.dataset.lucide = 'chevron-left'; previousIcon.setAttribute('aria-hidden', 'true'); previous.append(previousIcon);
      const variantLabel = document.createElement('span'); variantLabel.textContent = `VARIANT ${game.variants[variant]} OF ${game.variants.at(-1)}`;
      const next = document.createElement('button'); next.type = 'button'; next.title = 'Next font variant'; next.setAttribute('aria-label', next.title); next.disabled = variant === game.variants.length - 1;
      const nextIcon = document.createElement('i'); nextIcon.dataset.lucide = 'chevron-right'; nextIcon.setAttribute('aria-hidden', 'true'); next.append(nextIcon);
      const changeVariant = direction => {
        selectedVariants.set(controlName, Math.min(game.variants.length - 1, Math.max(0, variant + direction)));
        loadSelectedFont(controlName, FONT_TARGETS[controlName]).catch(error => { controls.status.textContent = `Could not load ${game.name}: ${error.message}`; });
        renderFontPickers(); reopenFontPicker(controlName);
      };
      previous.addEventListener('click', () => changeVariant(-1)); next.addEventListener('click', () => changeVariant(1));
      variantControl.append(previous, variantLabel, next); tools.append(variantControl);
    }

    const list = document.createElement('div'); list.className = 'font-picker-list'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', `${libraryControl.getAttribute('aria-label')} results`);
    const library = activeLibraries.get(controlName);
    const options = [...select.options].filter(option => option.dataset.fontLibrary === library);
    const favorites = options.filter(option => fontFavorites.has(option.dataset.fontId));
    const remaining = options.filter(option => !fontFavorites.has(option.dataset.fontId));
    const addGroup = (title, group) => {
      if (!group.length) return;
      const container = document.createElement('div'); container.className = 'font-picker-group'; const heading = document.createElement('span'); heading.className = 'font-picker-label'; heading.textContent = title; container.append(heading);
      group.forEach(option => {
        const row = document.createElement('div'); row.className = 'font-picker-row'; row.dataset.searchText = `${option.textContent} ${option.dataset.fontManufacturer || ''}`.toLowerCase();
        const choice = document.createElement('button'); choice.type = 'button'; choice.className = 'font-picker-choice'; choice.dataset.fontValue = option.value; choice.textContent = option.textContent; choice.setAttribute('role', 'option'); choice.setAttribute('aria-selected', String(option.selected));
        if (option.dataset.fontManufacturer) choice.title = option.dataset.fontManufacturer;
        choice.addEventListener('click', () => {
          select.value = option.value; selectedVariants.set(controlName, 0); activeLibraries.set(controlName, option.dataset.fontLibrary); syncFontPickerSelection(controlName);
          loadSelectedFont(controlName, FONT_TARGETS[controlName]).catch(error => { controls.status.textContent = `Could not load ${option.textContent}: ${error.message}`; });
          closeFontPickers(); renderFontPickers();
        });
        const favorite = document.createElement('button'); favorite.type = 'button'; favorite.className = 'font-favorite'; const favoriteId = option.dataset.fontId; const selected = fontFavorites.has(favoriteId); favorite.classList.toggle('is-favorite', selected); favorite.title = selected ? `Remove ${option.textContent} from favorites` : `Add ${option.textContent} to favorites`; favorite.setAttribute('aria-label', favorite.title); favorite.setAttribute('aria-pressed', String(selected));
        const heart = document.createElement('i'); heart.dataset.lucide = 'heart'; heart.setAttribute('aria-hidden', 'true'); favorite.append(heart);
        favorite.addEventListener('click', () => {
          if (fontFavorites.has(favoriteId)) fontFavorites.delete(favoriteId); else fontFavorites.add(favoriteId);
          saveFontFavorites(); renderFontPickers(); reopenFontPicker(controlName);
        });
        row.append(choice, favorite); container.append(row);
      });
      list.append(container);
    };
    addGroup('FAVORITES', favorites); addGroup(favorites.length ? `ALL ${library.toUpperCase()}` : library.toUpperCase(), remaining);
    if (!options.length) {
      const empty = document.createElement('span'); empty.className = 'font-picker-empty'; empty.textContent = library === 'games' ? 'Open Games to load this library.' : 'No fonts available.'; list.append(empty);
    }
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      list.querySelectorAll('.font-picker-row').forEach(row => { row.hidden = Boolean(query && !row.dataset.searchText.includes(query)); });
      list.querySelectorAll('.font-picker-group').forEach(group => { group.hidden = !group.querySelector('.font-picker-row:not([hidden])'); });
    });
    menu.append(tools, list);
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

  function getFontSetting(controlName) {
    const option = controls[controlName].selectedOptions[0];
    if (option?.dataset.fontLibrary === 'games') return `${option.dataset.fontId}@${selectedVariants.get(controlName) || 0}`;
    return option?.dataset.fontId || '';
  }

  function allProfileFontValues(project) {
    const profiles = project?.settings?.layoutProfiles;
    if (!profiles || typeof profiles !== 'object') return [];
    return Object.values(profiles).flatMap(profile => profile?.fonts && typeof profile.fonts === 'object' ? Object.values(profile.fonts) : []);
  }

  async function prepareProjectFonts(project) {
    if (allProfileFontValues(project).some(value => typeof value === 'string' && value.startsWith('games:'))) await ensureGamesLibrary();
  }

  function validateFontSetting(value, label) {
    if (typeof value !== 'string') throw new Error(`${label} must be a font identifier.`);
    if (value.startsWith('games:')) {
      const match = value.match(/^games:([^@]+)@(\d+)$/);
      const font = match && gamesFonts?.find(item => item.id === match[1]);
      const variant = match ? Number(match[2]) : -1;
      if (!font || !Number.isInteger(variant) || variant < 0 || variant >= font.variants.length) throw new Error(`${label} is not an available Games font variant.`);
      return value;
    }
    if (value.startsWith('default:')) {
      const file = value.slice('default:'.length);
      if (!defaultFonts.some(font => font.file === file)) throw new Error(`${label} is not an available Default font.`);
      return value;
    }
    const legacy = defaultFonts.find(font => font.name === value);
    if (!legacy) throw new Error(`${label} is not an available font.`);
    return `default:${legacy.file}`;
  }

  function selectFontSettings(settings) {
    FONT_CONTROL_NAMES.forEach(controlName => {
      const setting = settings[controlName];
      if (typeof setting !== 'string') return;
      if (setting.startsWith('games:')) {
        const match = setting.match(/^games:([^@]+)@(\d+)$/); if (!match) return;
        const option = [...controls[controlName].options].find(item => item.value === `games:${match[1]}`); if (!option) return;
        controls[controlName].value = option.value; selectedVariants.set(controlName, Number(match[2])); activeLibraries.set(controlName, 'games');
        return;
      }
      const file = setting.startsWith('default:') ? setting.slice('default:'.length) : defaultFonts.find(font => font.name === setting)?.file;
      if (!file) return;
      controls[controlName].value = file; selectedVariants.set(controlName, 0); activeLibraries.set(controlName, 'default');
    });
  }

  const FONT_TARGETS = { font: 'body', headerFont: 'header', detailFont: 'detail', ctaFont: 'cta', footerFont: 'footer' };
  Object.entries(FONT_TARGETS).forEach(([controlName, target]) => {
    controls[controlName].addEventListener('change', () => {
      syncFontPickerSelection(controlName);
      loadSelectedFont(controlName, target).catch(error => { controls.status.textContent = `Could not load ${controls[controlName].selectedOptions[0].textContent}: ${error.message}`; });
    });
  });
  document.addEventListener('pointerdown', event => { if (!event.target.closest('.font-picker')) closeFontPickers(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeFontPickers(); });

  return {
    ensureGamesLibrary,
    getFontSetting,
    loadFont,
    loadSelectedFont,
    populateFonts,
    prepareProjectFonts,
    renderFontPickers,
    selectFontSettings,
    validateFontSetting
  };
}
