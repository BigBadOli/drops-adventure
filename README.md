# Drops Adventure

A bright, low-poly island walking adventure built with Three.js — no build step,
plain ES modules, static site + one Cloudflare Pages Function for the live
leaderboard.

**Live:** https://drops-adventure.pages.dev

## Play

Serve the folder over HTTP (ES modules + texture loading don't work from `file://`):

```bash
npm run dev            # http://localhost:8787
```

- **Pick a hero** on the opening screen (click a card, or press 1/2/3):
  - **Kiki** the rave girl — pink boa, dance outfit, 128 bpm rave soundtrack
  - **Gus** the mountain man — backpack & bedroll, folk-picking soundtrack
  - **Barnaby** the billy goat — horns & wine cask, oompah polka soundtrack
- WASD/arrows move (keys steer the character) · mouse orbits the camera ·
  Shift sprint · Space hop · R restart · C or 🎭 switch hero · M or 🔊 mute ·
  ☰ pause menu · 🏁 stop & save your score
- Walk into the **wiggling gummy cubes** (1/5 your size) to refill gummy power.
  All **11 Drops flavors** spawn (Evergreen, Formula One, Beethoven, River
  Float, 100 Sheep, Looking Glass, Bicycle Day, Rodeo Queen, Lullaby,
  Nightshade, Crickets) — capturing one toasts its name + effect
  (Hybrid / Sativa / Indica / Super Sativa / Super Indica / Micro Dose).
  - **Daytime capture** → your hero locks into a signature boogie with confetti.
  - **Night capture** → dazzling sky show: flaring stars, comets, colorful
    firework explosions.
- **Switching heroes mid-run keeps your run** (score, position, clock).
- The **Drops logo** floats in the far sky and glows brighter at night.
- Survive the day/night cycle; the power bar always drains, sprint drains faster.

## Live leaderboard

`functions/api/scores.js` is a Cloudflare Pages Function backed by KV
(binding `SCORES`, configured in `wrangler.toml`). `GET /api/scores` returns
the top 8; `POST` submits `{n, s, t}` (3-char initials, gummies, seconds
survived — ranked by time, gummies as tiebreaker). The client falls back to a
localStorage board when the API is unreachable (e.g. local `npm run dev`).

## Debug / QA query params

- `?dev` — fps/draw-call readout
- `?smoke` — autoplay bot, results in `window.__SMOKE` + document title
  (`&char=rave|mountain|goat` to pick the bot's hero)
- `?t=80` — start the clock mid-cycle (nighttime is roughly t=70–113)
- `?seed=123` — gummy layout seed
- `?idle` — contrast route: bot stands still and must die

## Deploy to Cloudflare Pages

```bash
npx wrangler login     # once
npm run deploy         # wrangler pages deploy . --project-name drops-adventure
```

No build output directory — the repo root is the site.

## Notes

- Music is generated per-character with WebAudio in `js/music.js` (no audio
  files needed beyond the two sfx).
- Character rigs are procedural (`js/characters.js`) and share one animation
  interface, so the walk/dance code drives all three heroes.
- Gummy flavors/colors live in `GUMMY_FLAVORS` in `js/style.js`.
