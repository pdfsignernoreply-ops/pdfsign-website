# PDFSign — Brand assets

Canonical logo assets. Reuse these across the **website, admin portal, and the
WPF desktop tool**. The wordmark is **"PDFSign"** — no ".in".

## Files

| File | Use |
|------|-----|
| `pdfsign-horizontal.svg` | Primary lockup, light backgrounds |
| `pdfsign-horizontal-dark.svg` | Lockup for dark / navy backgrounds |
| `pdfsign-on-green.svg` | All-white lockup for green backgrounds |
| `pdfsign-stacked.svg` | Shield over wordmark + tagline (PRIVATE. SECURE. SIGNED.) |
| `pdfsign-icon.svg` | Icon only — solid green shield (transparent bg) |
| `pdfsign-appicon.svg` | White rounded tile + shield (app / store icon) |
| `png/` | Raster exports of the icon + app icon (for WPF / installers / favicons) |

## Colors

| Token | Hex | Use |
|-------|-----|-----|
| Navy | `#1B2A47` | "PDF", primary ink |
| Green | `#16A34A` | "Sign", shield, the payoff |
| Green (light/top of gradient) | `#22C55E` | shield gradient top, accents on dark |
| Green-light | `#F0FDF4` | tints |

Shield gradient: `#22C55E` (top) → `#16A34A` (bottom).

## Typography

Wordmark: **Outfit**, weight 700 (tight tracking). Tagline: Outfit 600, uppercase,
~3px letter-spacing, "SIGNED." in green. SVGs `@import` Outfit; when embedding
where webfonts can't load (e.g. some WPF/<img> contexts), use a PNG export or an
outlined version.

## Don'ts
- Don't add ".in" to the wordmark.
- Don't recolor the shield or put the green shield on a green background (use `pdfsign-on-green.svg`).
- Don't stretch or rotate the lockup.
