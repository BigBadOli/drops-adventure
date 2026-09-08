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

- **Pick a hero** on the opening screen (click a card, or press 1/2/3/4):
  - **Kiki** the rave girl — pink boa, dance outfit, 128 bpm rave soundtrack
  - **Gus** the mountain man — backpack & bedroll, folk-picking soundtrack
  - **Barnaby** the billy goat — horns & wine cask, oompah polka soundtrack
  - **Reggie** the budtender — afro & leather, trailing smoke, death metal riff
- WASD/arrows move (keys steer the character) · mouse orbits the camera ·
  Shift sprint · Space hop (tap twice for a double jump) · R restart ·
  C or 🎭 switch hero · M or 🔊 mute ·
  ☰ pause menu · 🏁 stop & save your score
- Walk into the **wiggling gummy cubes** (1/5 your size) to refill gummy power.
  All **11 Drops flavors** spawn (Evergreen, Formula One, Beethoven, River
  Float, 100 Sheep, Looking Glass, Bicycle Day, Rodeo Queen, Lullaby,
  Nightshade, Crickets) — capturing one toasts its name + effect
  (Hybrid / Sativa / Indica / Super Sativa / Super Indica / Micro Dose).
  - **Daytime capture** → your hero locks into a signature boogie with confetti.
  - **Night capture** → dazzling sky show: flaring stars, comets, colorful
    firework explosions.
- **Travel between three planets.** One plant on each world has red leaves — walk
  up to it and a prompt appears (**E**, a controller face button, or tap it). A
  saucer drops out of the sky; walk into it and press again to board. Each trip
  takes you on to the next world, so the three form a circuit that loops home.
  Every world has its own gravity, and it changes how it plays:

  | World | Gravity | Single-jump apex | Flora |
  |---|---|---|---|
  | Gummy Isle | 1.0 | 0.92 | pines and leafy trees |
  | Hazy Acres | 0.38 | 2.36 | giant cannabis |
  | Ring Reach | 0.25 | 3.57 | giant toadstools |

  Heroes are ~1.7 units tall, so Ring Reach barely holds you down. Hazy Acres
  hangs a whole solar system overhead — a dozen neighbouring worlds, two of them
  ringed — and keeps its stars lit through the day; Ring Reach has its own ring
  system, seen from the surface as a band arcing overhead. Dying anywhere
  returns you to the isle for the next run.
- **Leap off the island to end a run.** The shoreline blocks you on foot, but
  jump as you reach it and you sail clean over — a committed arc out to sea
  with no way to steer back, ending in a splashdown. Your score banks exactly
  as it does with 🏁. Spend the air-jump mid-leap for extra hang time and a
  longer flight.
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

**Automatic:** every push to `main` on GitHub deploys via
`.github/workflows/deploy.yml` (uses `cloudflare/wrangler-action`). One-time
setup: add a `CLOUDFLARE_API_TOKEN` repo secret (Settings → Secrets and
variables → Actions, or `gh secret set CLOUDFLARE_API_TOKEN`). Create the
token at https://dash.cloudflare.com/profile/api-tokens using the "Edit
Cloudflare Workers" template, scoped to this account.

**Manual (fallback):**
```bash
npx wrangler login     # once
npm run deploy         # wrangler pages deploy . --project-name drops-adventure
```

No build output directory — the repo root is the site. Note: Cloudflare
Pages' native Git integration can't be *added* to an existing direct-upload
project (would require deleting and recreating it), so CI/CD here runs
through GitHub Actions + Wrangler instead — same result, zero disruption to
the live project.

## Notes

- Music is generated per-character with WebAudio in `js/music.js` (no audio
  files needed beyond the two sfx).
- Character rigs are procedural (`js/characters.js`) and share one animation
  interface, so the walk/dance code drives every hero.
- Gummy flavors/colors live in `GUMMY_FLAVORS` in `js/style.js`.
