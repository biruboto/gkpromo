# Responsive Output Formats Implementation Plan

Branch: `feature/responsive-output-formats`

Implementation status: complete; pending user visual review in Zed Live Server.

## Objective

Support two output formats in the Promo Composer from one shared project:

- Instagram portrait: 1080 x 1350 (4:5)
- HD landscape: 1920 x 1080 (16:9)

Changing formats must recompose the existing content. It must not stretch or crop a
finished portrait frame into a landscape frame. Copy, fonts, effects, palettes,
visibility, assets, backgrounds, and CRT settings remain shared.

## Product Behavior

1. Add a two-option segmented format control under Basic Settings.
2. Allow switching formats at any time, including after loading or editing a project.
3. Keep portrait output visually unchanged from the current composer.
4. Give landscape its own intentional composition rather than a wider vertical stack.
5. Remember layout-related adjustments for each format while keeping one project and
   one set of content.
6. Update the live resolution label, download name, canvas accessibility label, PNG
   status, and MP4 status to match the active format.
7. Report content overflow in the composer instead of silently dropping copy.

## Format Model

Create a small format registry, preferably in `promo/formats.js`:

```js
export const OUTPUT_FORMATS = {
  portrait: {
    id: 'portrait',
    label: '4:5',
    logicalWidth: 540,
    logicalHeight: 675,
    exportScale: 2,
    exportWidth: 1080,
    exportHeight: 1350,
    layout: 'portrait'
  },
  landscape: {
    id: 'landscape',
    label: '16:9',
    logicalWidth: 960,
    logicalHeight: 540,
    exportScale: 2,
    exportWidth: 1920,
    exportHeight: 1080,
    layout: 'landscape'
  }
};
```

Both formats retain a 2x export scale, integer coordinates, bitmap font rendering, and
`imageSmoothingEnabled = false`.

## State Ownership

Use one active format and two lightweight layout profiles:

```js
activeFormat: 'portrait',
layoutProfiles: {
  portrait: {
    sectionOrder,
    fonts,
    scales,
    alignments,
    verticalAlignments,
    imageAlign,
    imageScale
  },
  landscape: {
    sectionOrder,
    fonts,
    scales,
    alignments,
    verticalAlignments,
    imageAlign,
    imageScale
  }
}
```

The following remain shared across formats:

- all rich copy and glyph tokens
- palette and background style
- logo selection and Classic Arcade visibility
- detail, CTA, and hours visibility
- scroll modes and body border
- imported image source and image-processing settings
- model, animation, and CRT settings

When the format changes, save the current layout controls into its profile, activate
the target profile, resize the render surfaces, and redraw. This is still one project;
the profiles only prevent a landscape alignment or scale adjustment from damaging a
previously tuned portrait layout.

## Layout Strategies

### Portrait

Preserve the existing layout calculations and constants as the portrait strategy.
The current output is the regression baseline.

### Landscape

Use a safe-area layout with three semantic bands:

- Top band: logo at the left; header and optional detail in the remaining width.
- Content band: body in the flexible main region, with Image and CTA assigned to a
  left media slot and a lower-right action slot according to their relative order.
  Without an image, the body receives the full content width.
- Bottom band: venue information remains anchored consistently along the bottom.

The semantic bands use a centered 3:2 safe area inside the full 16:9 frame. At working
resolution the composition width is 810 pixels with 75-pixel side fields; the animated
background continues through the complete 960-pixel width.

Hidden sections collapse and release their space. The body remains the primary flexible
section. Text wraps against its actual landscape field width. The landscape strategy
returns the same field rectangles used for rendering and boundary overlays rather than
embedding coordinates throughout drawing code.

The section order remains format-specific. Portrait uses it as a vertical stack. In
landscape, Header/Detail reorder in the top region while Body remains in the main text
column. Moving Image past CTA swaps those two fields between the left media slot and
the lower-right action slot. Logo and Footer keep stable roles so the strong automatic
composition remains intact.

Initial landscape geometry is provisional until all four templates have been reviewed.
The first implementation checkpoint is to tune column widths, band heights, and gaps
using Free Play, Arcade Events, Announcement, and Pinball as fixtures.

## Rendering Refactor

Refactor `promo/renderer.js` so layout calculation and drawing are separate steps:

1. Read the active format and current logical dimensions at the start of a frame.
2. Measure wrapped text and intrinsic section heights.
3. Pass those measurements to either `calculatePortraitLayout` or
   `calculateLandscapeLayout`.
4. Receive named rectangles for logo, image, header, detail, body, CTA, and footer.
5. Draw the existing section renderers into those rectangles.
6. Draw text boundaries from the same rectangles.
7. Return a render report containing overflow flags and affected section names.

Avoid a second landscape renderer. Shared text measurement, glyph effects, border
drawing, scrolling, and CTA logic should stay in one rendering path.

## Resizing Dependencies

The following components currently capture fixed 540 x 675 or 1080 x 1350 dimensions
when created. Give each an explicit resize/update path:

- `promo/app.js`: resize preview, clean export, and CRT canvases from the format registry.
- `promo/game-backgrounds.js`: update width/height-dependent wrapping, spawn positions,
  star generation, Moon Patrol placement, and model framing. Reset deterministic state
  only where dimensions make existing state invalid.
- `promo/crt.js`: update source/output sizes and WebGL viewport without changing the
  selected CRT controls.
- `promo/renderer.js`: derive field geometry from the active layout strategy.

The format switch reloads only the selected bitmap fonts for the target profile. It does
not reload imported images or the selected template.

## Project File Shape

Bump the project schema to version 3 and save:

- `settings.outputFormat`
- `settings.layoutProfiles.portrait`
- `settings.layoutProfiles.landscape`

Each layout profile includes its own font selections. Project loading accepts this
current schema only.

Templates should gain optional per-format layout defaults. The base landscape strategy
must still produce a usable result when a template does not provide an override.

## Overflow Handling

Existing wrapping functions cap several sections by line count. Add an explicit result
that distinguishes "fits" from "was truncated by layout." At minimum check:

- header maximum lines
- detail maximum lines
- body available lines
- CTA two-line contract
- hours single-line contract
- footer two-line contract

Display a concise status warning naming the sections that do not fit. Do not export a
different layout than the live preview. Export remains allowed so the warning does not
block time-sensitive work.

## UI Changes

In `promo.html`:

- add the `4:5` / `16:9` segmented control using the existing toggle visual language;
- make preview CSS responsive to the active aspect ratio without changing canvas pixels;
- keep the whole canvas visible at common editor widths;
- update the resolution readout dynamically;
- preserve the current three-column desktop composer and narrow-screen stacking behavior.

Do not start a server or add a new preview workflow. Visual review remains in Zed Live
Server per repository instructions.

## Implementation Sequence

1. Add the format registry, selector, active-format state, dynamic labels, and dynamic
   export filenames.
2. Add resize APIs to the renderer dependencies and prove portrait renders identically
   after moving dimensions out of module-level constants.
3. Extract portrait field calculation from drawing without changing its geometry.
4. Implement landscape field calculation and render all existing sections into it.
5. Add per-format layout profiles and update control synchronization on format changes.
6. Add project version 3 serialization and validation.
7. Add overflow reporting.
8. Tune every template in both formats and update template layout defaults only when the
   general landscape strategy is insufficient.
9. Advance JavaScript cache-busting query versions in `promo.html` and `promo/app.js`.
10. Update `HANDOFF.md` with the format model, project file shape, layout behavior, and
    export resolutions.

## Verification

Run lightweight checks after each implementation phase:

```powershell
Get-ChildItem promo -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Also add or expose pure-function checks for:

- format dimensions and export dimensions
- portrait layout regression rectangles
- landscape rectangles with detail, CTA, image, and hours independently hidden
- section rectangles staying inside safe bounds
- format toggle round trips preserving both layout profiles
- overflow reporting for deliberately long copy

Manual Zed Live Server review matrix:

- four templates x two formats
- CRT off and strong
- PNG and MP4 labels and dimensions
- imported image present and absent
- every optional section toggled off individually
- repeated portrait -> landscape -> portrait switching
- save in one format, load, switch, and verify the other profile
- narrow composer viewport with the landscape preview scaled to fit

## Acceptance Criteria

- Existing portrait projects and templates retain their current appearance and output size.
- Landscape exports are exactly 1920 x 1080; portrait exports remain 1080 x 1350.
- Switching formats does not alter shared content or discard format-specific layout tuning.
- Landscape output looks intentionally composed for all existing templates.
- No enabled section is silently lost without an overflow warning.
- Preview, PNG, and MP4 all use the same active composition and CRT treatment.
- Version 3 `.gkp` files retain both format profiles, including independent font choices.
- All promo JavaScript passes `node --check`.

## Out Of Scope

- arbitrary custom resolutions
- freeform drag positioning on the canvas
- simultaneous side-by-side editing of both formats
- separate copy or imagery per format
- automatic font-size reduction below the existing 1x, 2x, and 4x scale steps
- changing the 15-second, 30fps MP4 contract
