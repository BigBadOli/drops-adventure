# Drops Adventure — working notes

Fork of `jamesrice/drops-adventure` (upstream author: James at Fiction Tribe).
This fork is `BigBadOli/drops-adventure`, used as a sandbox for testing changes
before they go anywhere near the live kiosk.

## What this is

A low-poly Three.js island walking game for the Drops Arcade. Pick a hero,
wander the island, walk into wiggling gummy cubes to refill a draining power
bar. Day captures trigger a dance, night captures trigger a sky show.

No build step. Plain ES modules, static site, one Cloudflare Pages Function
for the leaderboard. The repo root *is* the site.

## Run locally

```bash
npm run dev     # http://localhost:8787
```

Must be served over HTTP — ES modules and textures won't load from `file://`.

## File map

- `index.html` — all UI markup and CSS, including the hero-select cards
- `js/game.js` — the engine (~64KB): sim loop, input, camera, day/night, animation
- `js/characters.js` — hero rigs, built procedurally from Three.js primitives.
  No model files; each character is code.
- `js/music.js` — per-character soundtracks generated with WebAudio
- `js/style.js` — `GUMMY_FLAVORS` (the 11 Drops flavors and colors)
- `strings.js` — all player-visible text
- `functions/api/scores.js` — Cloudflare Pages Function, KV-backed leaderboard
- `vendor/three.module.js` — vendored Three.js, don't edit

## Rig interface

Every character returned by `buildCharacter(id)` exposes the same shape:

```
{ group, armL, armR, legL, legR, head, boa?, cask?, smoke?, mats, dance, height }
```

Face points `-z`. The shared walk/dance code in `game.js` drives all heroes
through this interface, so a new character only needs to return the same keys.

Gotchas that have bitten:

- `mats` is what the night-glow sweep brightens (`game.js`, `rigGlow`). Anything
  left out of it stays matte after dark; anything put *into* it has its
  `emissiveIntensity` overwritten every frame, so a part that needs to keep its
  own glow (Reggie's lit joint tips) must be built outside `mats`.
- `height` is documentation only — nothing reads it. Proportions come from the
  geometry, not this number.
- Arm/leg `rotation.x` is **positive = forward**. Negative throws limbs behind
  the character, which is easy to miss until you see the dance.
- `boa` / `cask` / `smoke` are optional per-hero props animated every frame
  outside the dance branch. That's the hook for anything continuously moving.

## Adding a new hero — the touchpoints

1. `js/characters.js` — add the id to `CHAR_IDS`, add a `MUSIC_STYLE` entry,
   write a `buildX()` function, add it to the `buildCharacter()` dispatcher
2. `strings.js` — add a `chars` entry (name, sub, desc)
3. `js/music.js` — add a soundtrack style to `STYLES`
4. `js/game.js` — add a dance branch in the character animation section
   (search `r.dance ===`)
5. `js/game.js` — add `DigitN` to `BIND`; the number-key handler below it reads
   the index off the code, so it needs no further edit
6. `index.html` — add a `.charCard:nth-child(N)` gradient
7. `manifest.json` — description text (cosmetic)

Nos. 1 and 4 both used to end in a bare `else` that silently returned the goat;
they're explicit `if`/`else if` chains now, but keep them that way — a fourth
hero added to the old shape either came out a goat or stole the goat's dance.

The select screen scales on its own: `previewRigs` spreads the 3D lineup across
a fixed total width (`PREVIEW_SPREAD`) rather than a fixed gap, and the picker
cards are four-across above 880px and a 2×2 below. Adding a fifth hero means
revisiting both — the row will get tight.

Most of this is a few lines. The real work is the `buildX()` geometry function.
Worth knowing when writing one: the whole figure is a handful of primitives, so
readability comes from silhouette and from keeping trim colors far apart. The
budtender was initially unreadable — black jacket, black afro and black shades
merged into one blob, and the afro swallowed the face entirely.

## The two vertical modes (`py` / `jumpY`)

Normally the hero is glued to the ground: `py = terrainH(px, pz)` every frame
and `jumpY` is a hop *offset above that*. There is no falling.

The shoreline leap switches this. `CFG.playableR` is a hard wall that only
applies while `grounded`, so an airborne hero crosses it, sets `falling`, and
converts to a real world height (`py = terrainH() + jumpY`, `jumpY = 0`). While
`falling`, `py` is absolute, the terrain no longer drives it, steering and bar
drain are off, and horizontal velocity coasts. Splashdown at `WATER_Y` starts
`sinkT`; when that expires the run ends via `gameOver(true, STR.leaped)` —
`stopped: true`, so the score banks like the 🏁 button.

If you touch the sim loop, remember both modes exist. Anything that assumes
`py` tracks the terrain is wrong mid-leap.

## Landing on things

Colliders are `{x, z, r}` circles that push the player out horizontally. Any
that also carry a `top` (and `topR`) are **landable**: rocks, pine tips, leafy
crowns, toadstool caps.

Two rules make it work, and both matter:

- Every solid thing carries a `blockTop` — how tall it actually is. A collider
  only blocks you while you are **below** it. Miss this and a stalk keeps
  shoving you sideways while you stand on the cap four units above it, which
  reads as an invisible pillar through the middle of the platform. `top`
  (landable) implies `blockTop`; things you cannot stand on, like a toadstool
  stalk or a cannabis stem, declare it via `blockFn`.
- The push-out is **skipped** once the hero's feet clear `blockTop` — and also
  whenever they are still rising (`vy > 0`). The second half matters more: it
  lets you jump straight at a rock and come down on top of it, instead of being
  shoved sideways the whole way up and having to arc on precisely.
- `supportH()` returns the terrain *or* the top of a platform the hero is at or
  above, and `py` is set from that rather than straight from `terrainH()`. World
  height (`py + jumpY`) is preserved whenever the support changes, so stepping
  off a rock converts the drop into `jumpY` and falls under normal gravity
  instead of teleporting, and drifting over one lands on it.

A platform's footprint (`topR`) is held at **least** `push-out radius + 0.3`.
Making it smaller leaves a ring of dead space you have to cross in mid-air
before the top will hold you, and the jump reads as failing for no visible
reason — that was the original "clunky" feel.

A share of the gummies (`CFG.perchNodes`) sit **on** those platforms. Which
platforms qualify is computed per planet from the double-jump height
(`jumpV² / 2g × 1.78`, the measured double-jump gain), so a perch is never set
somewhere that planet's gravity can't reach — rocks on the isle, toadstool caps
under Ring Reach's 0.25 g, and never within 14 units of spawn, so the opening
gummy is always a plain walk. Perched nodes also carry a height test on capture;
without it you would sweep them off a cap by strolling underneath. Ground nodes
keep the old height-blind rule, so nothing about them changed.

`__fx.nodes()` lists every gummy with its height and whether it is perched.
`__fx.platforms()` lists the landable surfaces nearest the hero and
`__fx.warp(x, z, h)` drops them at a spot — together they make this testable
without wandering the island hoping to find a rock.

## Planets and the ship

`PLANETS` in `style.js` is the whole definition of a world: palette, sky
keyframes, gravity scale, flora style, where its red beacon plant sits, and any
`bodies` hanging in its sky. The world is fully procedural, so adding one is
data — there are no assets.

A world's own ring system (`arc`) must be a **torus**, not a flat annulus. The
band is centred on the camera, so a flat ring is seen exactly edge-on and
renders as a hairline; the tube is what gives it width from the inside.

Sky bodies live outside `world` and are re-centred on the camera every frame,
so they read as genuinely distant instead of sliding past as you walk. Their
materials set `fog: false`: the fog ends at 230 and they sit out at 300–430, so
without it they would be erased before they ever drew. Daytime stars are not
code either — `stars` in the sky keyframes drives `starMat.opacity` directly,
which is why Hazy Acres keeps them lit at noon.

`buildWorld(i)` clears and refills the `world` group (terrain, water, flora,
beacon) and must be followed by `layoutNodes(...)`, because gummies are placed
around colliders and those have just moved. The ship deliberately lives in
`scene`, not `world`, so a rebuild mid-flight can't dispose the thing the
player is inside.

Travel is a phase machine: `landing` → `ready` → `board` → `ascend` →
`descend` → `arrive` → `none`. The first two leave the player in control; the
rest lock input and let the ship carry the camera (`step()` returns early and
pins `px/pz/py` to the ship). The planet swap happens at exactly one instant —
the end of `ascend`, when `travelFade()` is 1 and the screen is solid white.
`resetRun()` tears all of this down and forces planet 0, so a death mid-flight
doesn't strand a hovering ship or an invisible hero.

`__fx.planet(i)` rebuilds in place for QA; `?planet=1` boots straight there.

## The camera

The follow camera is the default (`CAM_MODES.auto` in `game.js`): wide framing
— pitch 0.16, distance 9.5, fov 64, look-at at head + 2.4 — plus a camera that
chases the hero's heading. `?cam=classic` restores the original; `?cam=wide` is
the framing without the follow.

**The dead zone is the whole design, not a polish value.** Movement is
camera-relative, so any sustained input outside the dead zone makes the camera
chase, which rotates what that direction means, which makes you curve — you
orbit at whatever rate the camera chases. Slowing the chase only widens the
circle; it never produces a straight line. Inside the dead zone nothing chases
and you walk dead straight.

The default 34° dead zone therefore means holding anything but forward carves a
circle (measured: 29°/s, roughly a 10-unit radius). That was chosen **on
purpose** after playing the alternatives. `?dead=100` genuinely walks straighter
— forward, diagonal and sideways all measured 0° of camera movement — and feels
worse, because the camera stops revealing the world and you end up locked to one
bearing. The swinging is doing the work.

A manual look suspends the follow for `CAM_HOLD` seconds and the tilt then eases
back. Follow is off during the travel cutscene, the shoreline leap and dances.

The camera pull-in is height-aware: a collider shorter than the sight line at
that point is skipped. Without that, the lower camera gets yanked in by
knee-high rocks.

## Known issue: gamepad on the hero-select screen

The game already has gamepad support — `gamepadInput()` in `game.js` handles
sticks, sprint, jump and Start. But it's only polled while `state === "play"`,
so the hero-select screen ignores the controller entirely and needs keyboard
(1/2/3) or a click.

Fix would be to poll the pad during `state === "select"` and map d-pad
left/right to move the highlight plus a face button to confirm. James is aware
and may fix upstream — check before duplicating the work.

## Context: how this gets used

Runs on an in-store/event kiosk. It's embedded by iframe into a Shopify page
(`dropscandies.com`), which loads `https://drops-adventure.pages.dev/`. The
Shopify wrapper has its own gamepad-to-keyboard shim, but it can't reach into
this game because the iframe is cross-origin — so controller fixes for the
game itself have to happen in this repo.

Debut ran on a MacBook with a PS5 controller and went well. Likely future
hardware: a Raspberry Pi tablet with an 8-bit controller in an arcade cabinet.

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml` (wrangler-action),
which needs a `CLOUDFLARE_API_TOKEN` repo secret. For a sandbox, deploy to a
**separate** Cloudflare Pages project so the live kiosk URL is untouched.

## Useful query params

- `?dev` — fps / draw-call readout
- `?smoke` — autoplay bot (`&char=rave|mountain|goat|budtender`)
- `?t=80` — start mid-cycle (night is roughly t=70–113)
- `?seed=123` — fixed gummy layout
