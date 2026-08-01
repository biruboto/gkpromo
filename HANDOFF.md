# GK HUD Handoff

## Repository and Preview

- `hud.html` is the interactive GK HUD. `promo.html` is the active GK Promo Composer, orchestrated by `promo/app.js`. `sequence.html` is the separate 4:5 staged-animation workspace, orchestrated by `sequence/app.js`.
- Sequence Lab includes a Three.js `Wireframe Cabinet` backdrop: a no-art, low-poly arcade cabinet built from the 26in W x 30in D x 73in reference silhouette, with only cabinet, control-deck, monitor, marquee, and coin-door linework.
- `cabinet.html` is the dedicated tuning page for the shared wireframe models. It provides rotation, view, line color, and opacity controls without the sequence UI, and lets the user switch between `models/asteroids.3ds` and `models/ironman.3ds`. Imported meshes are converted into linework at runtime; the procedural cabinet is the fallback if the initial asset cannot load.
- Preview with Zed Live Server from the repository root. Both active pages fetch local assets and must be served over HTTP.
- There is no build step. The promo page uses Lucide from its CDN; the HUD imports Three.js from jsDelivr.
- When editing the promo JavaScript, advance the shared cache-busting query in `promo.html` and the imports at the top of `promo/app.js` (`v=255` at this handoff).

## HUD (`hud.html`)

- The HUD is a native `320x224` composition. Keep canvas rendering pixelated, integer-scaled, and free of DOM content in the captured frame.
- Three.js draws the star field and voxel wireframe ship into `#scene`; `#hud` draws bitmap type, framing, callouts, and logo treatment above it.
- `assets/images/ship.png` supplies the extruded wireframe silhouette. `assets/images/gklogo.png` is quantized at runtime for animated reflection bands.
- HUD fonts are normalized `.h` headers in `assets/font-data-h/`. The HUD expands printable glyphs with its ATASCII tile slots at load time; the selectable default is `Reactor`, and `Bitty` is the technical-font layer.
- `F1` opens debug controls. `R` or the panel restart control resets the deterministic boot sequence: `void`, `signal`, `acquire`, `systems`, `ready`.
- `ATASCII_MAPPING.md` documents HUD-specific tile slots.

## Promo Composer Layout and Output

- The composer supports `540x675` portrait and `960x540` landscape working canvases. Exports are exact 2x `1080x1350` (4:5) and `1920x1080` (16:9). Rendering stays on integer pixel coordinates with `imageSmoothingEnabled = false`.
- Basic Settings includes an output-format segmented control. Switching formats recomposes the same copy, fonts, palette, effects, visibility, images, backgrounds, and CRT settings. Portrait retains the established vertical stack. Landscape anchors the logo at upper left, places header/detail in the upper main region, gives the image and body the central regions, keeps CTA with the main content, and anchors venue information along the bottom.
- Landscape backgrounds remain full-bleed across the `960x540` working frame, while primary composition fields use a centered `810x540` (3:2) safe area. This leaves 75 native pixels, or 150 export pixels, of breathing room on each side of the `1920x1080` output.
- Font selections, text scale, horizontal and vertical alignment, section order, image alignment, and image display width are remembered independently for portrait and landscape. In landscape, Logo and Footer have fixed semantic regions and Header/Detail reorder in the top region. Body remains in the main text column. Reordering Image and CTA past each other literally swaps them between the left media slot and the lower-right action slot.
- The UI uses a left dock for Basic Settings, Composition, and export; the center live canvas; and a right dock for the fixed GK Pixel logo, Header, Detail Line, Body, CTA, and Footer. The Logo panel exposes only the Classic Arcade subtitle toggle.
- Basic Settings generates its template selector from the registry in `promo/templates.js`, currently exposing `FREE PLAY`, `ARCADE EVENTS`, and `ANNOUNCEMENT`, alongside ten six-role palettes and a text-boundary overlay. CRT Emulation exposes a CRT Preset, Mode, and finishing controls; animated stars always use standard motion and the initialized deterministic field.
- The selected template is applied after the font library initializes, so its defaults override the literal fallback input values in `promo.html` on first load.
- All templates set CRT Mode to off but do not change the finishing sliders; CRT settings are selected independently when preparing an export.
- Exports are PNG and a 15-second 30fps MP4 when the browser supports `MediaRecorder` MP4. The exporter intentionally does not fall back to WebM because iOS saving was the requirement.
- `SAVE PROJECT` downloads a versioned, pretty-printed JSON project with the `.gkp` extension. Project version 3 stores the active output format and both complete layout profiles, including their font selections, alongside the shared content/settings. `LOAD PROJECT` accepts the current version 3 format. The rich-copy source remains in the established token syntax rather than being converted to Markdown.
- The live composer reports enabled text sections that exceed their format field. Overflow warnings do not block export, and preview, PNG, and MP4 continue to use the same composition.
- The current composer uses a flat palette background and animated stars. No transparency or background gradient is applied.
- The detail field collapses to its rendered copy height plus an 8-pixel buffer. The body begins 8 pixels below it when shown, or 24 pixels below its position when hidden, and expands to the footer whenever CTA is hidden. With CTA enabled, the body grows to fit up to 10 rendered lines before the CTA is placed beneath it.
- A single Enter in the Body editor creates one rendered line break; intentionally empty paragraphs remain blank lines.
- CTA copy wraps to at most two nonempty lines inside its standard button without truncating its rich-text source. When CTA occupies the tall left landscape media slot, it can use up to five lines and its button grows vertically. A single Enter creates a preserved CTA line break; a two-line standard CTA grows its own field without shifting the body or footer.
- CTA buttons render 8 canvas pixels below their selected vertical alignment point.
- CRT Mode is an optional WebGL final pass with `Off`, `CRT-Pi Soft`, and `CRT-Pi Strong` options. Its curated CRT Presets are Arcade Cabinet, Broadcast Monitor, Warm Tube, and Chroma Shift; editing a CRT control returns the preset to Custom. Arcade Cabinet sets Curvature `130%`, RGB Separation `50%`, Scanline Depth `40%`, Aperture Mask `50%`, Vignette `120%`, Signal Drift `7%`, Bloom `120%`, and Phosphor Glow `170%`. It transforms the active clean composition into its 2x export frame, then uses that same frame for preview, PNG, and MP4 output. Its Curvature, RGB Separation, Scanline Depth, Aperture Mask, Vignette, Signal Drift, Bloom, and Phosphor Glow controls are direct shader parameters. It uses an original shader modeled on CRT-Pi behavior, not copied RetroArch source. Text boundaries remain preview-only and are not treated or exported. If WebGL is unavailable, rendering falls back to the clean composition.

## Promo Defaults: `FREE PLAY`

- Palette: `CRT Sunset` (`yuNo`); game style: Starfield; logo: animated GK Pixel; Classic Arcade subtitle on; text boundaries off; fixed standard motion.
- Fonts: Header `Reactor` at 4x, Detail `Reactor` at 2x, Body `Beachball` at 2x, CTA `ZX Eurostile` at 2x, Footer `Cinema Bold` at 2x. Hours always uses `Matinee` at 2x.
- Header: `July Free Play Calendar`, with `Free Play` carrying the wave effect and the complete header carrying the default toggleable drop shadow. Header is horizontally and vertically centered.
- Detail: `Unlimited Credits on All Games!!`, with `Unlimited` carrying the sweep effect. Detail is horizontally centered and top-aligned; scrolling is off by default.
- Body is vertically centered, left-aligned, and uses `▶` rows, a heart before Pride, leader tabs, and highlighted dates. Its default body border is off.
- CTA is on by default with `$6 NOON-5PM (ALL AGES)` and `$12 5PM-MIDNIGHT (21+)` on separate lines; its dollar signs are superscripted and its `PM` labels are subscripted. Hours is off by default because the CTA carries the pricing and age details. Footer is centered, uses a superscript `th` in `5th`, and no longer reserves room for a ship.
- Keep template values in the registry in `promo/templates.js`; the template selector is generated from its keys, while literal input values in `promo.html` are only pre-initialization fallbacks.

## Promo Defaults: `ARCADE EVENTS`

- Palette: `Neon Space` (`neon`); game style: Starfield; logo: animated GK Pixel; Classic Arcade subtitle on; text boundaries off; fixed standard motion.
- CRT: off by default. Its finishing sliders remain independent of the template and can be enabled when preparing an export.
- Header: `Arcade Events This Week`, with the complete header carrying the default toggleable drop shadow. Detail line is off by default.
- Body is top-aligned with a rounded border and lists the July 20, 21, 22, and 26 dates with highlighted date lines, followed by their Mario Kart/Killer Queen, UFO 50, Electropop/Chiptune, Crunk Witch/Tonight We Launch!, and Samurai Showdown II events. CTA is on by default in `ZX Eurostile` at 2x, with ATASCII arrowheads around `SUMMER PROMO` and `50% OFF ALL GAMES NOON-5PM` beneath; Hours and footer use the standard venue copy.

## Promo Defaults: `ANNOUNCEMENT`

- Palette: `Signal Pulse` (`pulse`); game style: Moon Patrol; logo: animated GK Pixel; Classic Arcade subtitle on; text boundaries off; CRT off.
- Header is `Friday 7/17` and `Closed` on separate lines, with only `Closed` blinking and the complete header carrying the default toggleable drop shadow. The centered detail line reads `Until 7PM`. The top-aligned rounded body reads `Opening to the` and `public at7PM (21+)`. Hours is off; the complete two-line address carries a stroke; CTA is off by default.

## Text Rendering, Effects, and Editing

- `promo/app.js` is the ES-module entry point and owns application state, control wiring, export, and initialization. `promo/renderer.js` owns composition and bitmap text rendering; `promo/rich-text-editor.js` owns contenteditable state, token serialization, and special-glyph insertion; `promo/fonts.js` owns the font catalog and picker; `promo/game-backgrounds.js` owns animated backgrounds; `promo/crt.js` owns the WebGL final pass; and `promo/templates.js` owns template data and selector population.
- The typography model measures bitmap glyph bounds, uses 2 native pixels between body/detail glyphs and 6 native pixels for spaces. Header uses a 1-pixel glyph gap and 6-pixel spaces. Do not replace this with browser font metrics.
- Header, Detail, Body, CTA, Hours, and Address use rich `contenteditable` surfaces backed by hidden source fields. Hours remains single-line; Address accepts line breaks. Their source syntax is semantic tokens such as `[[effect:highlight]]text[[/effect]]`; selection effects must be togglable in both directions.
- Character and animation toolbar buttons mirror the effects at the text cursor. For a selection, a button is active only when that effect applies to the complete selection.
- Character effects: `highlight`, `underline`, `superscript`, `subscript`, `stroke`, and `shadow`. Stroke and shadow both use the palette `shadow` role. Stroke retains the enclosing field's thickness, including on superscript and subscript glyphs. Shadow is full-opacity, one native pixel down/right at the current glyph scale. Underlines are continuous across a run and sit one native pixel below the glyph cell. Superscript and subscript step down one scale, then align their top or bottom ink pixels, respectively, to the normal-size glyph before their contiguous script run, falling back to the following glyph only when needed. Both are unavailable at 1x.
- Animation effects: `blink`, `flash` (text/highlight alternation), `reflect`, `wave`, `sweep`, and `spin`. Spin performs a full vertical-axis turn: normal, edge-on, horizontally reversed, edge-on, then normal. Its per-character stagger sends a pass across the selection, followed by a settled pause before the next pass. Reflect uses the same palette-derived band treatment as the animated logo. Effects are token-level, not field-level; a selection crossing a line break applies the effect independently to each line.
- Body and CTA have paragraph controls for vertical alignment, horizontal alignment, and (Body only) a leader-tab insertion control. The Body font row also includes a labeled Border picker with the actual square and rounded top-left PETSCII corner glyphs, colored with the current palette text color like the Special Glyphs picker. Header and Detail use fixed alignment as described above; Footer has no alignment toolbar.
- A leader tab serializes as `[[leader-tab]]`. It splits a line into a left segment and a right-aligned segment and fills intervening space with period glyphs using the active font's actual bitmap spacing. Do not substitute literal spaces or a CSS tab.
- Detail and Hours support `OFF`, `TICKER`, and `REVEAL` single-line scrolling. Scrolling is directly canvas-rendered, clipped, and snapped to whole pixels. A browser-only vertical tear was reported in the live preview but is absent from export; do not add an offscreen marquee buffer solely to address it.
- Body borders are optional square or rounded PETSCII-cell borders. They use the measured bounds of actual populated body lines plus one 8px cell of padding, not the full body field.

## Palette and Logo Rules

- Each palette has exactly six roles: `background`, `text`, `highlight`, `shadow`, `accent`, and `muted`. Palette definitions live in `colors` in `promo/app.js`.
- The available palettes are CRT Sunset, Neon Space, Signal Pulse, Solar Flare, Emerald Terminal, Cobalt Gold, Amethyst Night, Copper Circuit, Polar Signal, and Ruby Relay. Emerald Terminal is the green-screen option; Cobalt Gold pairs deep ultramarine with gold highlights.
- `text` is the default copy color; `highlight` is contrasting selected text; `shadow` is shared by stroke and drop shadow; `accent` colors the detail line and logo; `muted` supports stars and secondary UI/render details.
- The animated logo uses `accent` and derives its reflection shades from that color. It does not use an opacity reduction. Text shadows use the same palette `shadow` role.

## Promo Font Pipeline

- Promo fonts are normalized `.h` bitmap headers, separate from the HUD `.fnt` files.
- `assets/font-data-h/index.json` maps display names to browser-facing files in `assets/font-data-h/`. `promo/fonts.js` parses the first 768 hexadecimal bytes as 96 printable 8x8 ASCII glyphs (`0x20`-`0x7E`).
- The custom font picker is rendered in JavaScript. `Reactor` appears only once and is the initial header selection. Favorites are persisted in `localStorage` under `gk-promo-font-favorites`, appear in a Favorites group at the top, and use a fill-only heart state.
- Up/Down on a focused font trigger steps through the underlying font select, including after favorites change. Preserve that behavior when touching picker code.
- `assets/fonts/` and `assets/fonts/source-headers/` are source material; `assets/font-data-h/` is the browser-facing catalog.

## Special Glyphs

- `assets/glyphs/legacy-glyphs.json` is the complete normalized special-glyph source. Glyphs are stored as stable IDs, system, code slot, and 8 bitmap rows; ATASCII also records `internalSlot`. Image-backed `EMOJI` entries may include an `image` filename under `assets/images/emoji/` and a `transparentColor` key for RGB source art.
- The promo picker intentionally exposes one merged `SPECIAL GLYPHS` group: the selected ATASCII and PETSCII slots plus image-backed `EMOJI` entries.
- Inserted source tokens use stable IDs such as `[[atascii-7F]]` and `[[petscii-upper-5a]]`. In rich editors, these display as their Unicode counterparts so selection and copy work, but serialize back to the token. Do not replace the stored token scheme.
- Current Unicode mappings include heart `atascii-00`, spade `atascii-7B`, left triangle `atascii-7E`, right triangle `atascii-7F`, club `petscii-upper-58`, and up triangle `petscii-upper-5A`.
- PETSCII supplies all dynamic border glyphs. Keep border drawing on the 8px cell grid.

## Extension Rules

- Add a promo font by placing its normalized `.h` file in `assets/font-data-h/` and adding it to `assets/font-data-h/index.json`.
- Add a special glyph by appending a normalized entry to `assets/glyphs/legacy-glyphs.json`; keep IDs stable because document source stores them. Image-backed emoji also need their `8x8` PNG under `assets/images/emoji/`.
- Preserve `ctx.imageSmoothingEnabled = false`, integer canvas scales, and direct bitmap rendering. Avoid CSS resampling or mixed-resolution render paths.
- Run `Get-ChildItem promo -Filter *.js | ForEach-Object { node --check $_.FullName }` after JavaScript changes. Do not start a local server or browser automatically; Zed Live Server is the local preview workflow.
