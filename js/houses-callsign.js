// ── Callsign originals ───────────────────────────────────────
// Houses Callsign made up in the style of the game's makers. None of them is
// in Armored Core VI, so none has in-game examples; their words come from
// public science sources (js/families.js cites them). houses.js appends these
// after its own fifteen, and each follows the make() contract described there:
// frames draw their name and series from `line` first, in a fixed order, so a
// matched frame shares both; every retry (`attempt`) changes the code.
//
// `draws` says which pools a house stamps and for which slots, and `shape`
// matches a whole designation. forge() reads neither: they serve the Lexicon
// view and its lookup, so editing them never renames a plate.

import { pick, int, pad } from './rng.js';
import * as L from './lexicon.js';

const isFrame = (s) => s.group === 'frame';
const isInner = (s) => s.group === 'inner';
const isMelee = (s) => ['blade', 'pilebunker', 'flamer'].includes(s.id);

// Apojove: the IAU gives Jupiter's captured moons a name ending by orbit.
const JV_ORBIT = { A: 'P', E: 'R', O: 'I' };

// Umklapp: low-index crystal planes in lowest terms. A retry swaps h for 4 to
// 9, a plane no first roll can draw.
const MILLER = ['100', '110', '111', '210', '211', '221', '310', '311', '320', '321', '322', '331'];
const plane = (base, attempt) => (attempt ? `${4 + ((attempt - 1) % 6)}${base.slice(1)}` : base);

// Quadnil: IUPAC's 1978 systematic names. Each digit of the atomic number is a
// root; enn before nil drops an n, and bi or tri before ium drops an i.
const ROOTS = ['nil', 'un', 'bi', 'tri', 'quad', 'pent', 'hex', 'sept', 'oct', 'enn'];
const rootsOf = (z) => String(z).split('').map((d) => ROOTS[Number(d)]);
export const systematicName = (z) =>
  `${rootsOf(z).join('')}ium`.replace(/nnn/g, 'nn').replace(/iium$/, 'ium').toUpperCase();
export const symbolOf = (z) => {
  const s = rootsOf(z).map((r) => r[0]).join('');
  return s[0].toUpperCase() + s.slice(1);
};
export const Z_OF = new Map(Array.from({ length: 172 - 119 + 1 }, (_, i) => [systematicName(119 + i), 119 + i]));
// Closed neutron shells suggested near element 126; the code's mass is Z plus one.
const MAGIC_N = [184, 196, 228];

// Peristome: Fibonacci leaf divergences with the slash dropped (38 is 3/8 of a turn).
const SPIRALS = ['12', '13', '25', '38', '513', '821'];

// Protyle: a retry stamps a new edition of the same plate.
const PT_EDITION = ['', '-II', '-III', '-IV', '-V', '-VI', '-VII', '-VIII', '-IX', '-X'];

export const CALLSIGN_HOUSES = [
  {
    id: 'apojove', name: 'Apojove', full: 'Apojove Outer Works', group: 'originals', tagline: 'Outer-system yards',
    theme: 'Outer-system parts named under the IAU\'s rules for small bodies. Frames take Jupiter\'s captured outer moons and stamp the orbit the name encodes (a name ending in A is prograde, O prograde and steeply inclined, E retrograde); inner parts take Neptune\'s moons and the bodies past it, and weapons take Saturn\'s Gallic and Norse moons and the centaurs.',
    grammar: 'JV-ONN/S MOON', canon: [], signature: 'pilebunker',
    draws: [
      { pool: 'JOVIAN_MOONS', slots: ['frame'] },
      { pool: 'FAR_BODIES', slots: ['inner'] },
      { pool: 'GIANTS_AND_CENTAURS', slots: ['weapons'], note: 'C marks a centaur, S a moon of Saturn' },
    ],
    shape: /^JV-[PRINSC]\d{2,3}\/[A-Z]{1,2} [A-Z]+(-[A-Z]+)?$/,
    make({ rng, line, slot, attempt }) {
      if (isFrame(slot)) {
        const name = pick(line, L.JOVIAN_MOONS);
        const series = int(line, 10, 89) + attempt * 100;
        return { code: `JV-${JV_ORBIT[name.slice(-1)]}${pad(series, 2)}/${slot.letter}`, name };
      }
      if (isInner(slot)) {
        const name = pick(rng, L.FAR_BODIES);
        return { code: `JV-N${pad(int(rng, 10, 89) + attempt * 100, 2)}/${slot.letter}`, name };
      }
      const name = pick(rng, L.GIANTS_AND_CENTAURS);
      const orbit = L.CENTAURS.includes(name) ? 'C' : 'S';
      const mount = isMelee(slot) ? 9 : slot.mount === 'back' ? 6 : 3;
      return { code: `JV-${orbit}${mount}${int(rng, 0, 9) + attempt * 10}/${slot.code}`, name };
    },
  },
  {
    id: 'umklapp', name: 'Umklapp', full: 'Umklapp Lattice Works', group: 'originals', tagline: 'Exotic matter',
    theme: 'Exotic-matter parts cut along a crystal plane: quasiparticles, field configurations and bound states for the body, hypothetical particles and superpartners for the weapons. The three digits are the Miller index of the plane.',
    grammar: 'UMK-HKLS PARTICLE', canon: [], signature: 'plasma',
    draws: [
      { pool: 'EXOTIC_BODIES', slots: ['frame', 'inner'] },
      { pool: 'EXOTIC_FIELDS', slots: ['weapons'] },
    ],
    shape: /^UMK-\d{3}[A-Z]{1,2} [A-Z]+$/,
    make({ rng, line, slot, attempt }) {
      const r = isFrame(slot) ? line : rng;
      const name = pick(r, slot.code ? L.EXOTIC_FIELDS : L.EXOTIC_BODIES);
      const base = pick(r, MILLER);
      return { code: `UMK-${plane(base, attempt)}${slot.letter || slot.code}`, name };
    },
  },
  {
    id: 'vastitas', name: 'Vastitas', full: 'Vastitas Macro-Engineering', group: 'originals', tagline: 'Megastructure yards',
    theme: 'Frames named for habitats, megastructures and the big fixed installations around them; everything else for drives, sails, beams and launchers. The code opens with the yard\'s Lagrange point: L4 or L5 for a frame, L1 to L3 for the rest.',
    grammar: 'L5-SNNN STRUCTURE', canon: [], signature: 'linear',
    draws: [
      { pool: 'MEGASTRUCTURES', slots: ['frame'] },
      { pool: 'DRIVES', slots: ['inner', 'weapons'] },
    ],
    shape: /^L[1-5]-[A-Z]{1,2}\d{3} [A-Z]+([ -][A-Z]+)*$/,
    make({ rng, line, slot, attempt }) {
      // Every plate makes the same line draws, so a matched frame never splits.
      const structure = pick(line, L.MEGASTRUCTURES);
      const yard = pick(line, [4, 5]);
      const series = int(line, 10, 89) + attempt * 100;
      if (isFrame(slot)) return { code: `L${yard}-${slot.letter}${pad(series, 3)}`, name: structure };
      const near = pick(rng, [1, 2, 3]);
      const number = pad(int(rng, 1, 99) + attempt * 100, 3);
      return { code: `L${near}-${slot.letter || slot.code}${number}`, name: pick(rng, L.DRIVES) };
    },
  },
  {
    id: 'quadnil', name: 'Quadnil', full: 'Quadnil Superheavy Works', group: 'originals', tagline: 'Placeholder elements',
    theme: 'Parts named with the placeholder names IUPAC gives elements past 118 until they are made and named. Each code reads as an isotope: the element\'s symbol and a mass number built on a closed neutron shell suggested near element 126 (184, 196 or 228). Weapons take their names from the physics of the island of stability.',
    grammar: 'Uxx-MMMS ELEMENT', canon: [], signature: 'bazooka',
    draws: [
      { pool: 'SUPERHEAVY', slots: ['frame', 'inner'], note: 'weapons also draw one for the symbol and mass in the code' },
      { pool: 'ISLAND_PHYSICS', slots: ['weapons'] },
    ],
    shape: /^U[nubtqphseo]{2}-\d{3}[A-Z]{1,2} [A-Z]+([ -][A-Z]+)*$/,
    make({ rng, line, slot, attempt }) {
      if (!slot.code) {
        const r = isFrame(slot) ? line : rng;
        const name = pick(r, L.SUPERHEAVY);
        const n = pick(r, MAGIC_N);
        const z = Z_OF.get(name);
        return { code: `${symbolOf(z)}-${z + n + attempt}${slot.letter}`, name, word: symbolOf(z).toUpperCase() };
      }
      const name = pick(rng, L.ISLAND_PHYSICS);
      const z = Z_OF.get(pick(rng, L.SUPERHEAVY));
      const n = pick(rng, MAGIC_N);
      return { code: `${symbolOf(z)}-${z + n + attempt}${slot.code}`, name };
    },
  },
  {
    id: 'peristome', name: 'Peristome', full: 'Peristome Phytomechanics', group: 'originals', tagline: 'Grown parts',
    theme: 'Grown parts named for real plants that look off-world. Cycads and stone plants make the frame, parasites and fungus-fed plants the inner parts, and carnivores and carrion flowers the weapons. The number is a leaf spiral with its slash dropped: 38 is three-eighths of a turn.',
    grammar: 'PE-FFS GENUS', canon: [], signature: 'stun',
    draws: [
      { pool: 'FLORA_BODIES', slots: ['frame'] },
      { pool: 'FLORA_HIDDEN', slots: ['inner'] },
      { pool: 'FLORA_TRAPS', slots: ['weapons'] },
    ],
    shape: /^PE-(12|13|25|38|513|821)[A-Z]{1,2}([2-9]|10)? [A-Z]+$/,
    make({ rng, line, slot, attempt }) {
      const cut = attempt ? String(attempt + 1) : '';
      const body = pick(line, L.FLORA_BODIES);
      const spiral = pick(line, SPIRALS);
      if (isFrame(slot)) return { code: `PE-${spiral}${slot.letter}${cut}`, name: body };
      const code = `PE-${pick(rng, SPIRALS)}${slot.letter || slot.code}${cut}`;
      return { code, name: pick(rng, slot.code ? L.FLORA_TRAPS : L.FLORA_HIDDEN) };
    },
  },
  {
    id: 'siboga', name: 'Siboga', full: 'Siboga Abyssal Works', group: 'originals', tagline: 'Rated for depth',
    theme: 'Parts rated for depth and named by genus: vent, seep, whale-fall and trench creatures for the frame, and microbes of heat, acid, salt, sulfur, metal and radiation for everything else. Weapons trade the depth for a heat rating in degrees Celsius.',
    grammar: 'SV-DDDDS GENUS', canon: [], signature: 'flamer',
    draws: [
      { pool: 'ABYSSAL_FAUNA', slots: ['frame'] },
      { pool: 'EXTREMOPHILES', slots: ['inner', 'weapons'] },
    ],
    shape: /^SV-(\d{4,5}[A-Z]|[A-Z]{2}-\d{3}) [A-Z]+$/,
    make({ rng, line, slot, attempt }) {
      if (isFrame(slot)) {
        const name = pick(line, L.ABYSSAL_FAUNA);
        const depth = int(line, 2, 19) * 500 + attempt * 100;
        return { code: `SV-${depth}${slot.letter}`, name };
      }
      if (isInner(slot)) {
        const depth = int(rng, 2, 19) * 500 + attempt * 100;
        return { code: `SV-${depth}${slot.letter}`, name: pick(rng, L.EXTREMOPHILES) };
      }
      const heat = attempt ? 113 + attempt : int(rng, 50, 113);
      return { code: `SV-${slot.code}-${pad(heat, 3)}`, name: pick(rng, L.EXTREMOPHILES) };
    },
  },
  {
    id: 'protyle', name: 'Protyle', full: 'Protyle Instrument Works', group: 'originals', tagline: 'Spent science',
    theme: 'Science that was announced and then withdrawn. Frames are named for constellations and constellation names the IAU did not keep in the modern 88; inner parts and weapons for elements that turned out to be mistakes or mixtures, and for forces, fluids and theories science gave up on. Numbers run from 089 to 199, past the 88.',
    grammar: 'PT-TNNN NAME', canon: [], signature: 'laser',
    draws: [
      { pool: 'LOST_SKY', slots: ['frame'] },
      { pool: 'SPENT_SCIENCE', slots: ['inner', 'weapons'] },
    ],
    shape: /^PT-[A-Z]{1,2}\d{3}(-[IVX]+)? [A-Z]+([ -][A-Z]+)*$/,
    make({ rng, line, slot, attempt }) {
      const name = pick(line, L.LOST_SKY);
      const plate = int(line, 89, 199);
      const ed = PT_EDITION[attempt];
      if (isFrame(slot)) return { code: `PT-${slot.letter}${pad(plate, 3)}${ed}`, name };
      const code = `PT-${slot.letter || slot.code}${pad(int(rng, 89, 199), 3)}${ed}`;
      return { code, name: pick(rng, L.SPENT_SCIENCE) };
    },
  },
];
