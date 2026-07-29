# GK HUD Handoff

## Repository and Preview

- `hud.html` is the interactive GK HUD. `promo.html` is the active GK Promo Composer, rendered by `promo.js`.
- Preview with Zed Live Server from the repository root. Both active pages fetch local assets and must be served over HTTP.
- There is no build step. The promo page uses Lucide from its CDN; the HUD imports Three.js from jsDelivr.
- When editing `promo.js`, advance its cache-busting query in `promo.html` (`promo.js?v=201` at this handoff).

## HUD (`hud.html`)

- The HUD is a native `320x224` composition. Keep canvas rendering pixelated, integer-scaled, and free of DOM content in the captured frame.
- Three.js draws the star field and voxel wireframe ship into `#scene`; `#hud` draws bitmap type, framing, callouts, and logo treatment above it.
- `assets/images/ship.png` supplies the extruded wireframe silhouette. `assets/images/gklogo.png` is quantized at runtime for animated reflection bands.
- HUD fonts are normalized `.h` headers in `assets/font-data-h/`. The HUD expands printable glyphs with its ATASCII tile slots at load time; the selectable default is `Reactor`, and `Bitty` is the technical-font layer.
- `F1` opens debug controls. `R` or the panel restart control resets the deterministic boot sequence: `void`, `signal`, `acquire`, `systems`, `ready`.
- `ATASCII_MAPPING.md` documents HUD-specific tile slots.

## Promo Composer Layout and Output

- The working canvas is `540x675` (4:5); exports are an exact 2x `1080x1350`. Rendering stays on integer pixel coordinates with `imageSmoothingEnabled = false`.
- The UI uses a left dock for Basic Settings, Composition, and export; the center live canvas; and a right dock for Logo, Header, Detail Line, Body, CTA, and Footer.
- Basic Settings exposes the `FREE PLAY` and `ARCADE EVENTS` templates, four six-role palettes, and a text-boundary overlay. Composition exposes CRT finishing controls; animated stars always use standard motion and the initialized deterministic field.
- The selected template is applied after the font library initializes, so its defaults override the literal fallback input values in `promo.html` on first load.
- Exports are PNG and a 15-second 30fps MP4 when the browser supports `MediaRecorder` MP4. The exporter intentionally does not fall back to WebM because iOS saving was the requirement.
- The current composer uses a flat palette background and animated stars. No transparency or background gradient is applied.
- The detail field collapses to its rendered copy height plus an 8-pixel buffer. The body begins 8 pixels below it when shown, or 24 pixels below its position when hidden, and expands to the footer whenever CTA is hidden. With CTA enabled, the body grows to fit up to 10 rendered lines before the CTA is placed beneath it.
- CTA copy wraps to at most two nonempty lines inside its button without truncating its rich-text source. A single Enter creates a preserved CTA line break; a two-line CTA grows its own field without shifting the body or footer.
- CTA buttons render 8 canvas pixels below their selected vertical alignment point.
- CRT Treatment is an optional WebGL final pass with `Off`, `CRT-Pi Soft`, and `CRT-Pi Strong` presets. Its curated CRT Look choices are Arcade Cabinet, Broadcast Monitor, Warm Tube, and Chroma Shift; editing a CRT control returns the selection to Custom. Arcade Cabinet sets Curvature `130%`, RGB Separation `50%`, Scanline Depth `40%`, Aperture Mask `50%`, Vignette `120%`, Signal Drift `7%`, Bloom `120%`, and Phosphor Glow `170%`. It transforms the clean 540x675 composition into the 1080x1350 export frame, then uses that same frame for preview, PNG, and MP4 output. Its Curvature, RGB Separation, Scanline Depth, Aperture Mask, Vignette, Signal Drift, Bloom, and Phosphor Glow controls are direct shader parameters. It uses an original shader modeled on CRT-Pi behavior, not copied RetroArch source. Text boundaries remain preview-only and are not treated or exported. If WebGL is unavailable, rendering falls back to the clean composition.

## Promo Defaults: `FREE PLAY`

- Palette: `CRT Sunset` (`yuNo`); logo: animated GK Pixel; Classic Arcade subtitle on; text boundaries off; fixed standard motion.
- Fonts: Header `Reactor` at 4x, Detail `Reactor` at 2x, Body `Beachball` at 2x, CTA `ZX Eurostile` at 2x, Footer `Cinema Bold` at 2x. Hours always uses `Matinee` at 2x.
- Header: `July Free Play Calendar`, with `Free Play` carrying the wave effect. Header is horizontally and vertically centered.
- Detail: `Unlimited Credits on All Games!!`, with `Unlimited` carrying the sweep effect. Detail is horizontally centered and top-aligned; scrolling is off by default.
- Body is vertically centered, left-aligned, and uses `▶` rows, a heart before Pride, leader tabs, and highlighted dates. Its default body border is off.
- CTA is on by default with `$6 NOON-5PM (ALL AGES)` and `$12 5PM-MIDNIGHT (21+)` on separate lines; its dollar signs are superscripted and its `PM` labels are subscripted. Hours is off by default because the CTA carries the pricing and age details. Footer is centered, uses a superscript `th` in `5th`, and no longer reserves room for a ship.
- Keep template values in the `templates['free-play']` object in `promo.js`; the literal input values in `promo.html` are only the pre-initialization fallback.

## Promo Defaults: `ARCADE EVENTS`

- Palette: `Neon Space` (`neon`); logo: animated GK Pixel; Classic Arcade subtitle on; text boundaries off; fixed standard motion.
- CRT: off by default. CRT finishing is independent of the template and can be enabled when preparing an export.
- Header: `Arcade Events This Week`. Detail line is off by default.
- Body is top-aligned with a rounded border and lists the July 20, 21, 22, and 26 dates with highlighted date lines, followed by their Mario Kart/Killer Queen, UFO 50, Electropop/Chiptune, Crunk Witch/Tonight We Launch!, and Samurai Showdown II events. CTA is on by default in `ZX Eurostile` at 2x, with ATASCII arrowheads around `SUMMER PROMO` and `50% OFF ALL GAMES NOON-5PM` beneath; Hours and footer use the standard venue copy.

## Text Rendering, Effects, and Editing

- `promo.js` owns rendering, font loading, controls, glyph insertion, animation, and export. Render constants are at the top of that file.
- The typography model measures bitmap glyph bounds, uses 2 native pixels between body/detail glyphs and 6 native pixels for spaces. Header uses a 1-pixel glyph gap and 6-pixel spaces. Do not replace this with browser font metrics.
- Header, Detail, Body, and CTA use rich `contenteditable` surfaces backed by hidden source fields. Their source syntax is semantic tokens such as `[[effect:highlight]]text[[/effect]]`; selection effects must be togglable in both directions.
- Hours and Footer still use source inputs/textareas. They support text effects during rendering, but are not yet rich text editors.
- Character effects: `highlight`, `underline`, `superscript`, `subscript`, `stroke`, and `shadow`. Stroke and shadow both use the palette `shadow` role. Shadow is full-opacity, one native pixel down/right at the current glyph scale. Underlines are continuous across a run and sit one native pixel below the glyph cell. Superscript and subscript step down one scale, then align their top or bottom ink pixels, respectively, to the normal-size glyph before their contiguous script run, falling back to the following glyph only when needed. Both are unavailable at 1x.
- Animation effects: `blink`, `flash` (text/highlight alternation), `reflect`, `wave`, and `sweep`. Reflect uses the same palette-derived band treatment as the animated logo. Effects are token-level, not field-level.
- Body and CTA have paragraph controls for vertical alignment, horizontal alignment, and (Body only) a leader-tab insertion control. Header and Detail use fixed alignment as described above; Footer has no alignment toolbar.
- A leader tab serializes as `[[leader-tab]]`. It splits a line into a left segment and a right-aligned segment and fills intervening space with period glyphs using the active font's actual bitmap spacing. Do not substitute literal spaces or a CSS tab.
- Detail and Hours support `OFF`, `TICKER`, and `REVEAL` single-line scrolling. Scrolling is directly canvas-rendered, clipped, and snapped to whole pixels. A browser-only vertical tear was reported in the live preview but is absent from export; do not add an offscreen marquee buffer solely to address it.
- Body borders are optional square or rounded PETSCII-cell borders. They use the measured bounds of actual populated body lines plus one 8px cell of padding, not the full body field.

## Palette and Logo Rules

- Each palette has exactly six roles: `background`, `text`, `highlight`, `shadow`, `accent`, and `muted`. Palette definitions live in `colors` in `promo.js`.
- `text` is the default copy color; `highlight` is contrasting selected text; `shadow` is shared by stroke and drop shadow; `accent` colors the detail line and logo; `muted` supports stars and secondary UI/render details.
- The animated logo uses `accent` and derives its reflection shades from that color. It does not use an opacity reduction. Text shadows use the same palette `shadow` role.

## Promo Font Pipeline

- Promo fonts are normalized `.h` bitmap headers, separate from the HUD `.fnt` files.
- `assets/font-data-h/index.json` maps display names to browser-facing files in `assets/font-data-h/`. `promo.js` parses the first 768 hexadecimal bytes as 96 printable 8x8 ASCII glyphs (`0x20`-`0x7E`).
- The custom font picker is rendered in JavaScript. `Reactor` appears only once and is the initial header selection. Favorites are persisted in `localStorage` under `gk-promo-font-favorites`, appear in a Favorites group at the top, and use a fill-only heart state.
- Up/Down on a focused font trigger steps through the underlying font select, including after favorites change. Preserve that behavior when touching picker code.
- `assets/fonts/` and `assets/fonts/source-headers/` are source material; `assets/font-data-h/` is the browser-facing catalog.

## Special Glyphs

- `assets/glyphs/legacy-glyphs.json` is the complete normalized legacy glyph source. Glyphs are stored as stable IDs, system, code slot, and 8 bitmap rows; ATASCII also records `internalSlot`.
- The promo picker intentionally exposes one merged `SPECIAL GLYPHS` group only: ATASCII `0x00`, `0x1C`, `0x1D`, `0x1E`, `0x1F`, `0x60`, `0x7B`, `0x7D`, `0x7E`, `0x7F`; PETSCII `0x51`, `0x56`, `0x57`, `0x58`, `0x5A`.
- Inserted source tokens use stable IDs such as `[[atascii-7F]]` and `[[petscii-upper-5a]]`. In rich editors, these display as their Unicode counterparts so selection and copy work, but serialize back to the token. Do not replace the stored token scheme.
- Current Unicode mappings include heart `atascii-00`, spade `atascii-7B`, left triangle `atascii-7E`, right triangle `atascii-7F`, club `petscii-upper-58`, and up triangle `petscii-upper-5A`.
- PETSCII supplies all dynamic border glyphs. Keep border drawing on the 8px cell grid.

## Extension Rules

- Add a promo font by placing its normalized `.h` file in `assets/font-data-h/` and adding it to `assets/font-data-h/index.json`.
- Add a legacy glyph by appending a normalized entry to `assets/glyphs/legacy-glyphs.json`; keep IDs stable because document source stores them. Add the slot to the picker allowlist only when it belongs in Special Glyphs.
- Preserve `ctx.imageSmoothingEnabled = false`, integer canvas scales, and direct bitmap rendering. Avoid CSS resampling or mixed-resolution render paths.
- Run `node --check promo.js` after JavaScript changes. Do not start a local server or browser automatically; Zed Live Server is the local preview workflow.
