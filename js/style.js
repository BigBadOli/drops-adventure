// STYLE FORMULA (approved 2026-07-20, style explicit in the brief):
// "Low-poly 3D nature diorama, flat-shaded faceted geometry, soft
// global-illumination-style lighting. Chunky simplified silhouettes, no
// outlines, gently rounded proportions. Environment in sage-green grass,
// warm sand rim, deep teal water; hero in warm coral-cream that pops from
// the greens; interactive pickups marked with an acid-cyan glow. Cozy, calm
// mood, soft sun, hazy pastel distance fog, sky that breathes through a
// full day-night cycle. High readability: glowing pickups contrast strongly
// against matte terrain, consistent third-person perspective."
//
// Every procedural asset in this build derives its colors/light from the
// constants below — the byte-identical embedding of the FORMULA for a
// fully procedural asset pipeline (stylization.md §8: engine lighting,
// fog and ambient derive from formula blocks 3–4).

export const FORMULA =
  "Low-poly 3D nature diorama, flat-shaded faceted geometry, soft global-illumination-style lighting. " +
  "Chunky simplified silhouettes, no outlines, gently rounded proportions. " +
  "Environment in sage-green grass, warm sand rim, deep teal water; hero in warm coral-cream that pops from the greens; " +
  "interactive pickups marked with an acid-cyan glow. Cozy, calm mood, soft sun, hazy pastel distance fog, " +
  "sky that breathes through a full day-night cycle. High readability: glowing pickups contrast strongly against matte terrain, " +
  "consistent third-person perspective.";

export const PAL = {
  // block 3 — environment roles
  grass: 0x8fbf6f,      // sage-green
  grassDark: 0x6f9e54,
  sand: 0xe6cf9a,       // warm sand rim
  sandWet: 0xc9b183,
  seafloor: 0x4e6e5d,
  water: 0x1f6f7a,      // deep teal
  pine: 0x4e7d4a,
  pineDark: 0x3d653c,
  leaf: 0x7fb35f,
  trunk: 0x8a6748,
  rock: 0x9a958b,
  // block 3 — hero role (contrasts the greens)
  heroCream: 0xf5e7c8,  // warm coral-cream
  heroCoral: 0xe2725b,
  heroDark: 0x4a4038,
  visor: 0x7c4a38,      // helmet face opening (warm dark coral-brown)
  // block 3 — signal hue (pickups only)
  crystal: 0x2ee8d4,    // acid-cyan glow
  crystalBase: 0x0f6b63,
};

// block 4 — light & mood: day/night keyframes (sky bg + fog share a color)
export const SKY_KEYS = [
  // p (0..1 of 120 s cycle), sky/fog, sun color, sun intensity, hemi, stars
  { p: 0.00, sky: 0xf7d9a8, sun: 0xffd9a0, sunI: 1.15, hemi: 0.38, stars: 0.0 }, // dawn
  { p: 0.08, sky: 0xaadfee, sun: 0xfff3dd, sunI: 1.95, hemi: 0.55, stars: 0.0 }, // morning
  { p: 0.42, sky: 0xa8dcf0, sun: 0xfff6e6, sunI: 2.05, hemi: 0.55, stars: 0.0 }, // day
  { p: 0.52, sky: 0xf2b28c, sun: 0xff9e66, sunI: 0.95, hemi: 0.32, stars: 0.05 }, // dusk
  { p: 0.60, sky: 0x2a3358, sun: 0x8fa8d8, sunI: 0.22, hemi: 0.14, stars: 0.9 }, // nightfall
  { p: 0.85, sky: 0x1c2440, sun: 0x8fa8d8, sunI: 0.20, hemi: 0.12, stars: 1.0 }, // deep night
  { p: 0.94, sky: 0x51467a, sun: 0xd8a8b8, sunI: 0.35, hemi: 0.20, stars: 0.4 }, // pre-dawn
  { p: 1.00, sky: 0xf7d9a8, sun: 0xffd9a0, sunI: 1.15, hemi: 0.38, stars: 0.0 },
];

export const FOG_NEAR = 75;
export const FOG_FAR = 230;

// Planet 2 — a hazy ochre world with an indigo sea. Deliberately warm and dusty
// where the isle is cool and green, so the switch reads instantly even in a
// screenshot; the cannabis canopy then pops green against the ochre ground.
// Thin atmosphere: the sky never goes bright, and the stars never fully go out,
// so the daylight hours still read as standing on a rock in space. Ground light
// (sunI/hemi) stays generous so the world itself is no darker to play in.
export const SKY_KEYS_HAZE = [
  { p: 0.00, sky: 0x6b4560, sun: 0xffcaa0, sunI: 1.05, hemi: 0.36, stars: 0.45 }, // dawn
  { p: 0.08, sky: 0x513c6b, sun: 0xffe0cc, sunI: 1.75, hemi: 0.52, stars: 0.55 },
  { p: 0.42, sky: 0x433263, sun: 0xfff0e0, sunI: 1.85, hemi: 0.52, stars: 0.62 }, // violet "noon"
  { p: 0.52, sky: 0x5a3757, sun: 0xff8a5c, sunI: 0.9, hemi: 0.3, stars: 0.7 },
  { p: 0.60, sky: 0x2b1f44, sun: 0x9c86d8, sunI: 0.2, hemi: 0.13, stars: 1.0 },
  { p: 0.85, sky: 0x171128, sun: 0x9c86d8, sunI: 0.18, hemi: 0.11, stars: 1.0 }, // deep night
  { p: 0.94, sky: 0x4d3a63, sun: 0xd8a8c8, sunI: 0.33, hemi: 0.19, stars: 0.7 },
  { p: 1.00, sky: 0x6b4560, sun: 0xffcaa0, sunI: 1.05, hemi: 0.36, stars: 0.45 },
];

// Each planet is a palette, a sky, a gravity scale and a flora style. The world
// is fully procedural, so a new planet is data — there are no assets to author.
// Ring Reach — a sugar-bright world: mint ground, a magenta sea, and its own
// ring arcing overhead. Sky stays saturated rather than dark; the ring does the
// heavy lifting here, not gloom.
export const SKY_KEYS_RING = [
  { p: 0.00, sky: 0x7fd9d0, sun: 0xffd9c0, sunI: 1.15, hemi: 0.42, stars: 0.20 }, // dawn
  { p: 0.08, sky: 0x59c8d8, sun: 0xfff0e6, sunI: 1.95, hemi: 0.58, stars: 0.22 },
  { p: 0.42, sky: 0x3fb9d6, sun: 0xfff6ee, sunI: 2.0, hemi: 0.58, stars: 0.25 }, // teal noon
  { p: 0.52, sky: 0xd85c9e, sun: 0xff7fb0, sunI: 1.0, hemi: 0.34, stars: 0.35 }, // magenta dusk
  { p: 0.60, sky: 0x3a1c4e, sun: 0xc07fd8, sunI: 0.24, hemi: 0.16, stars: 1.0 },
  { p: 0.85, sky: 0x22102f, sun: 0xc07fd8, sunI: 0.2, hemi: 0.13, stars: 1.0 },
  { p: 0.94, sky: 0x7a3a86, sun: 0xf0a8d8, sunI: 0.38, hemi: 0.22, stars: 0.55 },
  { p: 1.00, sky: 0x7fd9d0, sun: 0xffd9c0, sunI: 1.15, hemi: 0.42, stars: 0.20 },
];

// Ember Deep — a heavy, close-to-the-furnace world. Near-black sky all day, lit
// ground, crystal spires. Gravity here makes the isle feel springy afterwards.
export const SKY_KEYS_EMBER = [
  { p: 0.00, sky: 0x5c1e22, sun: 0xffb070, sunI: 1.1, hemi: 0.34, stars: 0.55 },
  { p: 0.08, sky: 0x3d1418, sun: 0xffc890, sunI: 1.7, hemi: 0.46, stars: 0.65 },
  { p: 0.42, sky: 0x2e0f14, sun: 0xffd6a8, sunI: 1.8, hemi: 0.46, stars: 0.75 }, // ember noon
  { p: 0.52, sky: 0x6b2415, sun: 0xff7a3c, sunI: 0.95, hemi: 0.3, stars: 0.8 },
  { p: 0.60, sky: 0x1a0a10, sun: 0xd88a6a, sunI: 0.22, hemi: 0.14, stars: 1.0 },
  { p: 0.85, sky: 0x0d050a, sun: 0xd88a6a, sunI: 0.2, hemi: 0.12, stars: 1.0 },
  { p: 0.94, sky: 0x3a1220, sun: 0xe0907a, sunI: 0.34, hemi: 0.2, stars: 0.85 },
  { p: 1.00, sky: 0x5c1e22, sun: 0xffb070, sunI: 1.1, hemi: 0.34, stars: 0.55 },
];

export const PLANETS = [
  {
    id: "isle",
    name: "Gummy Isle",
    pal: PAL,
    sky: SKY_KEYS,
    gravity: 1,
    flora: "temperate",
    waterEmissive: 0x0d3a42,
    beacon: { a: 0.65, r: 21, leaf: 0xd8392f }, // the red-leafed tree you signal from
  },
  {
    id: "haze",
    name: "Hazy Acres",
    pal: {
      grass: 0x9a8b52, grassDark: 0x77693a,
      sand: 0xd9bd8e, sandWet: 0xb69874,
      seafloor: 0x4a3f5e, water: 0x3b2f6b,
      pine: 0x5f9e3f, pineDark: 0x4c7f33, leaf: 0x6cb04a,
      trunk: 0x6f8f4a, rock: 0x9a8f9e,
      heroCream: PAL.heroCream, heroCoral: PAL.heroCoral, heroDark: PAL.heroDark,
      visor: PAL.visor, crystal: PAL.crystal, crystalBase: PAL.crystalBase,
    },
    sky: SKY_KEYS_HAZE,
    gravity: 0.38, // a double jump clears roughly two and a half heroes here
    flora: "cannabis",
    waterEmissive: 0x241a4a,
    beacon: { a: 2.45, r: 21, leaf: 0xe0447c },
    // Neighbours in the sky. az/el are radians (el 0 = horizon), dist stays
    // inside the 500 far plane, and they ride with the camera so they read as
    // genuinely distant rather than sliding past as you walk.
    bodies: [
      // a banded giant sitting low, big enough to dominate one horizon
      { r: 78, dist: 430, az: 1.05, el: 0.21, color: 0xc9834a, emissive: 0x40230e },
      // ringed neighbour, mid-sky
      { r: 21, dist: 370, az: 2.75, el: 0.55, color: 0x9db4d6, emissive: 0x18233c,
        ring: { inner: 1.45, outer: 2.35, tilt: 0.42, color: 0xe0cfa8 } },
      // a close pale moon, high up
      { r: 9, dist: 300, az: 4.55, el: 0.82, color: 0xdad4c6, emissive: 0x2b2721 },
      // and a small far one, mostly a detail you notice on the second visit
      { r: 5.5, dist: 340, az: 5.6, el: 0.33, color: 0xb98f8f, emissive: 0x2a1a1a },
    ],
  },
  {
    id: "ring",
    name: "Ring Reach",
    pal: {
      grass: 0x4fd0b0, grassDark: 0x37a88f,
      sand: 0xf2e3a8, sandWet: 0xd4c184,
      seafloor: 0x8a2f63, water: 0xc7407f,
      pine: 0xff5fb0, pineDark: 0xd8408f, leaf: 0xff8ac8,
      trunk: 0xf5e6d0, rock: 0x8fd8e0,
      heroCream: PAL.heroCream, heroCoral: PAL.heroCoral, heroDark: PAL.heroDark,
      visor: PAL.visor, crystal: PAL.crystal, crystalBase: PAL.crystalBase,
    },
    sky: SKY_KEYS_RING,
    gravity: 0.25, // the floatiest of the four
    flora: "mushroom",
    waterEmissive: 0x5c1030,
    beacon: { a: 4.1, r: 21, leaf: 0xfff04d },
    // this world's own ring system, seen from the surface as a band overhead
    arc: { radius: 330, tube: 34, color: 0xf5e3b0, yaw: 0.7, tilt: 0.34 },
    bodies: [
      { r: 13, dist: 330, az: 0.4, el: 0.62, color: 0xffd98a, emissive: 0x3a2a10 },
      { r: 26, dist: 400, az: 3.5, el: 0.24, color: 0xa85fd0, emissive: 0x2a1440 },
    ],
  },
  {
    id: "ember",
    name: "Ember Deep",
    pal: {
      grass: 0x7a2f3a, grassDark: 0x59202a,
      sand: 0xa8603a, sandWet: 0x82462c,
      seafloor: 0x1a0a12, water: 0x2e1220,
      pine: 0xffb347, pineDark: 0xe08a2a, leaf: 0xffd98a,
      trunk: 0x4a3038, rock: 0x4a3038,
      heroCream: PAL.heroCream, heroCoral: PAL.heroCoral, heroDark: PAL.heroDark,
      visor: PAL.visor, crystal: PAL.crystal, crystalBase: PAL.crystalBase,
    },
    sky: SKY_KEYS_EMBER,
    gravity: 1.55, // heavy — jumps go leaden, and the isle feels springy after
    flora: "crystal",
    waterEmissive: 0x501a10,
    beacon: { a: 5.6, r: 21, leaf: 0x4fe8ff },
    bodies: [
      // an enormous close sun-lit body — you are deep in someone's gravity well
      { r: 132, dist: 440, az: 2.2, el: 0.30, color: 0x8c2f22, emissive: 0x2a0d0a },
      { r: 11, dist: 320, az: 5.0, el: 0.66, color: 0xe0a070, emissive: 0x3a2015 },
    ],
  },
];

// The 11 Drops flavors — names, effects, and pack colors from the product line.
// Every color spawns on the island; capturing one toasts its name + effect.
export const GUMMY_FLAVORS = [
  { name: "Evergreen",     effect: "Hybrid",       color: 0x8cc63e }, // lime
  { name: "Formula One",   effect: "Sativa",       color: 0xf7c51e }, // lemon
  { name: "Beethoven",     effect: "Sativa",       color: 0xf7941d }, // orange
  { name: "River Float",   effect: "Indica",       color: 0xf2606e }, // watermelon
  { name: "100 Sheep",     effect: "Indica",       color: 0xe8125c }, // cherry
  { name: "Looking Glass", effect: "Super Sativa", color: 0xa3282e }, // cranberry
  { name: "Bicycle Day",   effect: "Hybrid",       color: 0xd9256f }, // raspberry
  { name: "Rodeo Queen",   effect: "Super Sativa", color: 0xf25c12 }, // strawberry
  { name: "Lullaby",       effect: "Micro Dose",   color: 0x2f6fb0 }, // blueberry
  { name: "Nightshade",    effect: "Super Indica", color: 0x2b3480 }, // dark berry
  { name: "Crickets",      effect: "Super Indica", color: 0x7b2d8b }, // blackberry
];
export const GUMMY_COLORS = GUMMY_FLAVORS.map(f => f.color);

// Drops brand logo colors (5-color logo) — used for UI gradients & fireworks.
export const DROPS_BRAND = [0x8dc63f, 0xfbb040, 0xf7941d, 0xef4b5d, 0xc2185b];
