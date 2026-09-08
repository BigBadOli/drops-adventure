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
export const SKY_KEYS_HAZE = [
  { p: 0.00, sky: 0xf0b7a0, sun: 0xffcaa0, sunI: 1.05, hemi: 0.36, stars: 0.0 }, // dawn
  { p: 0.08, sky: 0xd9a8c8, sun: 0xffe0cc, sunI: 1.75, hemi: 0.52, stars: 0.0 },
  { p: 0.42, sky: 0xc9a2d8, sun: 0xfff0e0, sunI: 1.85, hemi: 0.52, stars: 0.0 }, // lilac noon
  { p: 0.52, sky: 0xe0857f, sun: 0xff8a5c, sunI: 0.9, hemi: 0.3, stars: 0.06 },
  { p: 0.60, sky: 0x3b2a55, sun: 0x9c86d8, sunI: 0.2, hemi: 0.13, stars: 0.95 },
  { p: 0.85, sky: 0x261c3d, sun: 0x9c86d8, sunI: 0.18, hemi: 0.11, stars: 1.0 }, // deep night
  { p: 0.94, sky: 0x6b4a7a, sun: 0xd8a8c8, sunI: 0.33, hemi: 0.19, stars: 0.4 },
  { p: 1.00, sky: 0xf0b7a0, sun: 0xffcaa0, sunI: 1.05, hemi: 0.36, stars: 0.0 },
];

// Each planet is a palette, a sky, a gravity scale and a flora style. The world
// is fully procedural, so a new planet is data — there are no assets to author.
export const PLANETS = [
  {
    id: "isle",
    name: "Gummy Isle",
    pal: PAL,
    sky: SKY_KEYS,
    gravity: 1,
    flora: "temperate",
    waterEmissive: 0x0d3a42,
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
