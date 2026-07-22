# Drops Adventure — design (2026-07-21)

Built autonomously from the user's spec (session was non-interactive, so the
spec in the request is treated as the approved design).

## Starting point
`794d9bb0…zip` — "Glow Isle", a complete Three.js low-poly island walking/survival
game: fixed 60 Hz sim, seeded RNG, day/night cycle (120 s), energy bar drained by
walking/sprinting, refilled by collectibles, instanced trees/rocks, smoke-test bot
(`?smoke`), pointer-lock third-person camera. All of that is kept.

## Changes
1. **Character selector** (opening screen, replaces title card):
   - **Kiki — rave girl**: pink boa (ring of fluffy spheres), bright dance outfit,
     hair buns, platform boots.
   - **Gus — mountain man**: flannel, beard, cap, big backpack + bedroll.
   - **Barnaby — billy goat**: curved horns, chin beard, hooves, wine cask on a
     neck strap.
   All procedural low-poly (~1.7 units tall), share the rig interface
   (arms/legs/head pivots) so the existing walk animation drives all three.
   Live 3D previews stand on the beach behind gradient selector cards; click a
   card or press 1/2/3. `C` in-game returns to the selector.
2. **Gummy power-ups** replace crystals: wiggling sugar-speckled cubes,
   0.34 units (~1/5 of character height), instanced, per-instance color from the
   six Drops gummy colors (orange, periwinkle, lemon, pink, lime, red), tinted
   glow halos. (The chat-attached gummy photos aren't available as files, so the
   gummies are procedural 3D recreations in the same colors.)
3. **Day capture** → character locks into a 2.6 s expressive dance
   (per-character: rave boogie spin / folk stomp / goat pronk + headbang) with
   confetti bursts.
4. **Night capture** → ~4.5 s sky show: stars flare and twinkle, comets streak,
   colorful firework explosions in the sky, dazzling light pulse.
5. **Drops logo in the sky**: official 5-color logo PNG as a distant fog-free
   sprite that brightens at night.
6. **Music matches character**: procedural WebAudio sequencer — 128 bpm
   four-on-the-floor rave for Kiki, 92 bpm folk picking for Gus, 138 bpm oompah
   polka for Barnaby. (The generic mus-loop.wav is no longer used.)
7. **UI**: bright gradient panels, gradient title text, Drops-palette energy bar.
8. **Cloudflare Pages**: static site, no build step. `npm run deploy` →
   `wrangler pages deploy . --project-name drops-adventure`.

## Non-goals
Mobile touch controls, save/load beyond best-time localStorage, multiple islands.
