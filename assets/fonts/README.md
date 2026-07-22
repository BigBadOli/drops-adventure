# Fonts

## Work Sans (`worksans_n4.woff2`, `worksans_n4.woff`)

Self-hosted from the real dropscandies.com CDN for brand parity. Despite the
original request specifying weight 600, **these files are Work Sans Regular
(400)** — confirmed via the font's own `OS/2.usWeightClass` and `name` table
metadata, not just the filename. `n4` is Shopify's asset-naming convention
for "normal, weight 400"; a 600 variant would be named `n6`.

Both provided URLs are the same font — the `.woff`-named file is actually
WOFF2-formatted content internally (same magic bytes), not true WOFF1.

If a genuine Semibold (600) file becomes available (e.g. an `n6` URL from
the same CDN), drop it in here and update the `@font-face` in `index.html`
— currently `font-weight: 400` throughout so the browser doesn't
synthetically (fake-)bold a weight that doesn't exist in the file, which
looks noticeably worse than a true semibold cut.

## Formiga (`Formiga-Bold.woff2`, `Formiga-Bold.woff`)

Licensed commercial font (TipoType). The user's OTF purchase covers web
embedding, so `Formiga-Bold.otf` was converted locally to WOFF2/WOFF
(`fontTools`, `TTFont.flavor = "woff2"/"woff"`) and only those converted
files are committed here.

**The 7 source OTF files (`Formiga-*.otf`, all weights) are intentionally
`.gitignore`d and must never be committed.** Cloudflare Pages serves every
file in the repo as a public static asset regardless of whether it's linked
from HTML — committing the OTFs would make the full desktop family freely
downloadable by anyone who finds the URL, which is a different license
grant than the web-embedding rights that were confirmed. (This actually
happened once already via a stray `git add -A` — see git history — and was
caught and reverted. If adding another weight later, always convert to
woff2/woff first and only commit the converted output.)
