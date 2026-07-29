# ATASCII Mapping

The HUD loads raw 8x8 Atari font data. Regular printable text is mapped into
the font by subtracting `0x20` from its ASCII codepoint:

```text
ASCII 0x20 (space) -> glyph slot 0x00
ASCII 0x41 (A)     -> glyph slot 0x21
ASCII 0x7E (~)     -> glyph slot 0x5E
```

The HUD also draws selected raw glyph slots directly for its tilework.

## Active Thin Border

| Element | Raw glyph slot |
| --- | --- |
| Top-left corner | `0x51` |
| Horizontal edge | `0x52` |
| Top-right corner | `0x45` |
| Left vertical edge | `0x7C` |
| Right vertical edge | `0x7C` |
| Bottom-left corner | `0x5A` |
| Bottom-right corner | `0x43` |

These glyphs are used for both the outer HUD frame and the ship viewport.

## Completion Banner

| Element | Raw glyph slot |
| --- | --- |
| Two glyphs before `ALL SYSTEMS GO` | `0x7E` |
| Two glyphs after `ALL SYSTEMS GO` | `0x7F` |

## Implementation

Raw glyphs are rendered with:

```js
rawGlyph(glyphCode, x, y, color)
```

The active mapping is defined in `hud.html` as `HUD_TILES`.
