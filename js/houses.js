// ── Houses ───────────────────────────────────────────────────
// One naming grammar per manufacturer, each checked against the game's own
// part list. A house stamps a code and a name and nothing else; forge.js
// builds everything a plate says on top of that.
//
// make(ctx) receives:
//   rng       draws for this one plate
//   line      draws shared by a matched frame (identical for all four parts);
//             take the name and series from it first, in a fixed order
//   slot      the part or weapon class (see slots.js)
//   letters   an acronym from the user's own words, when there is one
//   words     those words
//   attempt   0, or the retry number after a roll landed on a real part
// and returns { code, name, sep?, nameFirst?, word? }. `word` is what an
// acronym is shortened from when it differs from the name (KIRBY for KIRBY C3).
//
// Where a code segment has no known meaning (BAWS J/T/E, Schneider E/F/Z/D),
// the letters are sampled from the ones the game uses and nothing more is
// claimed about them.

import { pick, int, pad } from './rng.js';
import { disemvowel } from './acronym.js';
import * as L from './lexicon.js';

export const GROUPS = [
  { id: 'balam', label: 'Balam Group', note: 'The heavy-industry conglomerate behind the Redguns, and its subsidiary.' },
  { id: 'arquebus', label: 'Arquebus Group', note: 'The energy-weapons corporation behind the Vespers, its development division, and its aerodynamics house.' },
  { id: 'specialists', label: 'Specialists', note: 'Makers of one kind of weapon. Furlong, VCPL and Takigawa come from off-world; nobody has pinned down where Melinite belongs.' },
  { id: 'rubicon', label: 'Rubicon', note: 'Local makers: a workshop that sells to everyone, a steel foundry, and a scavenger crew.' },
  { id: 'coral', label: 'Coral', note: 'A mercenary support system, and the research institute the Fires of Ibis wiped out.' },
];

const isFrame = (s) => s.group === 'frame';
const isInner = (s) => s.group === 'inner';
const isMelee = (s) => ['blade', 'pilebunker', 'flamer'].includes(s.id);

const BALAM_TYPE = {
  head: 'HD', core: 'BD', arms: 'AR', legs: 'LG', fcs: 'FC', booster: 'BS', generator: 'GN', expansion: 'EX',
  rifle: 'RF', shotgun: 'SG', linear: 'LR', machinegun: 'MG', handgun: 'HG', pilebunker: 'PB', bazooka: 'SB', drone: 'BO',
};
const DF_TYPE = {
  head: 'HD', core: 'BD', arms: 'AR', legs: 'LG', generator: 'GN', booster: 'BT', fcs: 'FC', expansion: 'EX',
  gatling: 'GA', bazooka: 'BA', grenade: 'GR', machinegun: 'MG', flamer: 'ET',
};
// Arquebus slot classes: 40 core, 42 legs, 44 head, 46 arms, 20 generator,
// 21 FCS (22 and 25 fill the inner band), 60 back, 61 shield, 66 arm, 67 melee.
const AQ_CLASS = { core: 40, legs: 42, head: 44, arms: 46, generator: 20, fcs: 21, booster: 22, expansion: 25 };
// Element (L laser, E electric, P pulse) plus form (R rifle, H handgun, S shotgun...).
const AQ_WEAPON = {
  rifle: [66, 'LR'], sniper: [66, 'LR'], linear: [66, 'ER'], machinegun: [66, 'LG'], gatling: [66, 'PG'],
  shotgun: [66, 'LS'], handgun: [66, 'LH'], laser: [66, 'LR'], stun: [60, 'SN'], bazooka: [60, 'PC'],
  grenade: [60, 'EC'], plasma: [60, 'LC'], missile: [60, 'LT'], drone: [60, 'LT'], blade: [67, 'LD'],
  pilebunker: [67, 'LL'], flamer: [67, 'EB'], shield: [61, 'PS'],
};
const FURLONG_FAMILY = { head: 'HDU', core: 'CRU', arms: 'ARU', legs: 'LGU', booster: 'BST', fcs: 'FCS', generator: 'GEN', expansion: 'EXP' };
const FURLONG_LAUNCH = { MLT: [4, 6, 8, 10, 12], VTC: [4, 8, 12], SPL: [6, 8, 12, 16], DUO: [2, 3], ACT: [1, 2] };
const ALLMIND_CLASS = { head: 20, core: 7, arms: 4, legs: 6, booster: 10, fcs: 12, generator: 15, expansion: 18 };
const BAWS_UNIT = [4, 0, 3, 1];
const CONSONANTS = 'BCDFGHKLMNPRSTVW'.split('');
const VOWELS = 'AEIOU'.split('');
const BINARY = ['001', '010', '011', '100', '101', '110', '111'];
const TRIANGULAR = ['003', '010', '015', '021', '036', '045', '055', '066', '078', '091'];

/** Where a weapon mounts, in VCPL's middle digit: 0 back, 6 arm, 7 melee. */
const vcplMount = (s) => (isMelee(s) ? 7 : s.mount === 'back' ? 0 : 6);

export const HOUSES = [
  // ── Balam Group ────────────────────────────────────────────
  {
    id: 'balam', name: 'Balam', full: 'Balam Industries', group: 'balam', tagline: 'Group parent',
    theme: 'Mass-production parts under a type code and a surname. Nearly every surname matches a noted entomologist, and C3 marks a custom line.',
    grammar: 'TT-NNN SURNAME', canon: ['HD-011 MELANDER', 'RF-024 TURNER', 'LG-022T BORNEMISSZA'], signature: 'rifle',
    make({ rng, line, slot, attempt }) {
      const name = pick(line, L.ENTOMOLOGISTS);
      const series = int(line, 1, 49) + attempt * 100;
      const custom = line() < 0.2;
      const type = BALAM_TYPE[slot.id] || slot.code;
      if (isFrame(slot)) {
        const tank = slot.id === 'legs' && rng() < 0.3 ? 'T' : '';
        return { code: `${type}-${pad(series, 3)}${tank}`, name: custom ? `${name} C3` : name, word: name };
      }
      const redguns = rng() < 0.12 ? 'M' : '';
      return { code: `${type}-${pad(int(rng, 1, 99) + attempt * 100, 3)}${redguns}`, name, word: name };
    },
  },
  {
    id: 'dafeng', name: 'Dafeng', full: 'Dafeng Core Industries', group: 'balam', tagline: 'Balam subsidiary',
    theme: 'Heavyweight parts named with Chinese star groups from two of the three celestial enclosures, in hyphenated pinyin.',
    grammar: 'DF-TT-NN STAR-GROUP', canon: ['DF-HD-08 TIAN-QIANG', 'DF-GA-08 HU-BEN', 'DF-GN-06 MING-TANG'], signature: 'gatling',
    make({ rng, line, slot, attempt }) {
      const pool = isFrame(slot) ? L.ASTERISMS : isInner(slot) ? L.ASTERISMS_OFFICE : L.ASTERISMS_GUARD;
      const name = pick(line, pool);
      const model = attempt ? int(rng, 13, 99) : int(line, 1, 12);
      return { code: `DF-${DF_TYPE[slot.id] || slot.code}-${pad(model, 2)}`, name };
    },
  },

  // ── Arquebus Group ─────────────────────────────────────────
  {
    id: 'arquebus', name: 'Arquebus', full: 'Arquebus Corporation', group: 'arquebus', tagline: 'Group parent',
    theme: 'No names at all: a slot class and a letter code. 44 is a head, 66 an arm gun, 61 a shield; LR is a laser rifle.',
    grammar: 'VP-CC[FORM]X', canon: ['VP-44S', 'VP-424', 'VP-66LR'], signature: 'laser',
    make({ rng, line, slot, attempt }) {
      const letter = pick(line, ['S', 'D', 'C']);
      if (!slot.code) {
        const legs = slot.id === 'legs' ? String(pick(line, [2, 4])) : '';
        const variant = attempt ? String(int(rng, 1, 9)) : '';
        return { code: `VP-${AQ_CLASS[slot.id]}${legs}${variant}${letter}`, name: '' };
      }
      const [cls, form] = AQ_WEAPON[slot.id] || [66, slot.code];
      const tail = attempt ? pick(rng, ['T', 'V', 'X']) : pick(rng, ['S', 'D']);
      return { code: `VP-${cls}${form}${tail}`, name: '' };
    },
  },
  {
    id: 'add', name: 'Arquebus ADD', full: 'Arquebus ADD', group: 'arquebus', tagline: 'Development division',
    theme: 'Prototypes and concept models: the corporate code with a VE prefix and a revision letter on the end.',
    grammar: 'VE-CC[FORM]A', canon: ['VE-44B', 'VE-66LRB', 'VE-60SNA'], signature: 'stun',
    make({ rng, line, slot, attempt }) {
      if (!slot.code) {
        const rev = pick(line, ['A', 'B', 'C']);
        const legs = slot.id === 'legs' ? String(pick(line, [2, 4])) : '';
        const mid = attempt ? pick(rng, ['S', 'D']) : '';
        return { code: `VE-${AQ_CLASS[slot.id]}${legs}${mid}${rev}`, name: '' };
      }
      const [cls, form] = AQ_WEAPON[slot.id] || [66, slot.code];
      const rev = attempt > 2 ? pick(rng, ['D', 'E']) : pick(rng, ['A', 'B', 'C']);
      return { code: `VE-${cls}${form}${rev}`, name: '' };
    },
  },
  {
    id: 'schneider', name: 'Schneider', full: 'Schneider', group: 'arquebus', tagline: 'Aerodynamics',
    theme: 'Light parts named after birds in German, a frame line sharing one letter. Boosters take a part of the bird instead.',
    grammar: 'BIRD/CCX', canon: ['NACHTREIHER/40E', 'ALULA/21E', 'WUERGER/66E'], signature: 'shotgun',
    make({ rng, line, slot, attempt }) {
      const bird = pick(line, L.BIRDS);
      const letter = pick(line, ['E', 'F', 'Z', 'D']);
      const plate = (name, cls) => ({ name, code: `${cls + attempt}${letter}`, sep: '/', nameFirst: true });
      if (isFrame(slot)) return plate(bird, AQ_CLASS[slot.id]);
      if (isInner(slot)) return plate(pick(rng, L.PLUMAGE), { booster: 21, fcs: 23, generator: 20, expansion: 25 }[slot.id]);
      return plate(bird, isMelee(slot) ? 67 : slot.mount === 'back' ? 60 : 66);
    },
  },

  // ── Specialists ────────────────────────────────────────────
  {
    id: 'furlong', name: 'Furlong', full: 'Furlong Dynamics', group: 'specialists', tagline: 'Missiles',
    theme: 'No names. The code carries the family, the generation, a product number, the launch type and the cell count.',
    grammar: 'FAM-G#/PNN[TYPE]-NN', canon: ['BML-G1/P20MLT-04', 'BST-G2/P06SPD', 'FCS-G2/P12SML'], signature: 'missile',
    make({ rng, line, slot, weapon }) {
      const gen = int(line, 1, 3);
      const product = pad(int(rng, 1, 32), 2);
      const family = FURLONG_FAMILY[slot.id] || (slot.id === 'missile' ? 'BML' : `${slot.mount === 'back' ? 'B' : 'H'}${slot.code}`);
      let type = '';
      let cells = '';
      if (slot.id === 'fcs') type = pick(rng, ['', 'SLT', 'SML']);
      else if (slot.id === 'booster') type = pick(rng, ['', 'SPD']);
      else if (weapon && (slot.id === 'missile' || slot.family === 'explosive')) {
        type = pick(rng, [...Object.keys(FURLONG_LAUNCH), 'CNT']);
        if (type !== 'CNT') cells = `-${pad(pick(rng, FURLONG_LAUNCH[type]), 2)}`;
      }
      return { code: `${family}-G${gen}/P${product}${type}${cells}`, name: '' };
    },
  },
  {
    id: 'vcpl', name: 'VCPL', full: 'VCPL', group: 'specialists', tagline: 'Plasma',
    theme: 'Plasma and laser weapons only: a 7-series number whose middle digit says where it mounts (0 back, 6 arm, 7 melee), then a type code.',
    grammar: 'Vvc-7MN[TT]', canon: ['Vvc-760PR', 'Vvc-770LB', 'Vvc-706PM'], signature: 'plasma',
    make({ rng, line, slot, partIndex, attempt }) {
      if (!slot.code) {
        // VCPL makes no frames. A frame's parts share mount and type and count up
        // from one variant digit, so its four plates never collide with each other.
        const mount = pick(line, [0, 6, 7]);
        const variant = (int(line, 0, 9) + partIndex + attempt) % 10;
        return { code: `Vvc-7${mount}${variant}${pick(line, ['PR', 'LB', 'LS', 'LD', 'PM'])}`, name: '' };
      }
      const mount = vcplMount(slot);
      const type = mount === 7 ? pick(rng, ['LB', 'LS'])
        : mount === 6 ? 'PR'
          : slot.id === 'drone' || slot.id === 'shield' || slot.id === 'stun' ? 'LD' : 'PM';
      // On a missile launcher the last digit is the cell count, or V for vertical.
      // Two of the six are real parts, so a retry steps to the next variant from
      // one fixed start (line holds still for the first retries) and cannot miss.
      const variants = type === 'PM' ? ['2', '3', '4', '6', '8', 'V'] : ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const variant = variants[(int(line, 0, variants.length - 1) + attempt) % variants.length];
      return { code: `Vvc-7${mount}${variant}${type}`, name: '' };
    },
  },
  {
    id: 'melinite', name: 'Melinite', full: 'Melinite', group: 'specialists', tagline: 'Explosives',
    theme: 'Grenades and bazookas with no code at all, only a word. The words lean toward precious things and loud sounds.',
    grammar: 'WORD', canon: ['EARSHOT', 'LITTLE GEM', 'IRIDIUM'], signature: 'grenade',
    make({ rng }) {
      // A bare word cannot tell a head from a core, so every part rolls its own.
      return { code: '', name: pick(rng, L.MELINITE) };
    },
  },
  {
    id: 'takigawa', name: 'Takigawa', full: 'Takigawa Harmonics', group: 'specialists', tagline: 'Pulse',
    theme: 'Pulse equipment in terse codes: HI for a hand unit, SI for a shield, a number, then GU, BU or SU and a model code.',
    grammar: 'HI-NN: GU-XX', canon: ['HI-32: BU-TT/A', 'HI-16: GU-Q1', 'SI-24: SU-Q5'], signature: 'shield',
    make({ rng, line, slot, attempt }) {
      const number = pad(int(line, 10, 39) + attempt * 10, 2);
      const r = slot.code ? rng : line;
      // Weapons are HI (hand) or SI (shield). Parts, which Takigawa never made,
      // carry their part letter in that position so a frame's four plates differ.
      const unit = slot.id === 'shield' ? 'SI' : slot.code ? 'HI' : `${slot.letter}I`;
      const type = slot.id === 'shield' || slot.id === 'expansion' ? 'SU'
        : isMelee(slot) ? 'BU'
          : slot.code ? 'GU' : pick(line, ['GU', 'BU', 'SU']);
      const model = r() < 0.3 ? `TT/${pick(r, ['A', 'B', 'C'])}` : `${pick(r, ['Q', 'A', 'R'])}${int(r, 1, 9)}`;
      return { code: `${unit}-${number}:`, name: `${type}-${model}` };
    },
  },

  // ── Rubicon ────────────────────────────────────────────────
  {
    id: 'baws', name: 'BAWS', full: 'BAWS', group: 'rubicon', tagline: 'Sells to both sides',
    theme: 'Workhorse parts named with the pen names of Basho and his disciples. Variants of one weapon add -RF or -AR.',
    grammar: 'AS-J-NNN PENNAME', canon: ['AH-J-124 BASHO', 'AG-J-098 JOSO', 'MA-J-201 RANSETSU-AR'], signature: 'rifle',
    make({ rng, line, slot, partIndex, attempt }) {
      const poet = pick(line, L.POETS);
      const series = pick(line, ['J', 'T', 'E']);
      if (isFrame(slot)) {
        const tens = int(line, 0, 9);
        const unit = (int(line, 0, 5) + BAWS_UNIT[partIndex]) % 10;
        return { code: `A${slot.letter}-${series}-${1 + attempt}${tens}${unit}`, name: poet };
      }
      if (isInner(slot)) return { code: `A${slot.letter}-${series}-${pad(int(rng, 1, 199) + attempt * 200, 3)}`, name: poet };
      const variant = ['rifle', 'machinegun', 'linear', 'sniper'].includes(slot.id) && rng() < 0.5 ? `-${pick(rng, ['RF', 'AR'])}` : '';
      return { code: `MA-${series}-${2 + attempt}${pad(int(rng, 0, 39), 2)}`, name: `${poet}${variant}`, word: poet };
    },
  },
  {
    id: 'elcano', name: 'Elcano', full: 'Elcano', group: 'rubicon', tagline: 'Steel foundry',
    theme: 'A Rubiconian steelmaker naming parts in Spanish: steadfast and early-light words for the body, weather for the weapons.',
    grammar: 'EL-PS-NN PALABRA', canon: ['EL-PH-00 ALBA', 'EL-TL-11 FORTALEZA', 'EL-PW-01 TRUENO'], signature: 'shotgun',
    make({ rng, line, slot, attempt }) {
      const lineLetter = pick(line, ['P', 'T']);
      const word = pick(slot.code ? rng : line, slot.code ? L.SPANISH_WEATHER : L.SPANISH_STEADY);
      const number = (lineLetter === 'P' ? 0 : 10) + int(line, 0, 9) + attempt * 20;
      return { code: `EL-${lineLetter}${slot.letter || 'W'}-${pad(number, 2)}`, name: word };
    },
  },
  {
    id: 'rad', name: 'RaD', full: 'RaD', group: 'rubicon', tagline: 'Scavengers',
    theme: 'Salvaged parts by series: 2000 scouts named for the job, 3000 construction rigs, 5000 combat frames named for courses of a meal. Weapons get idioms.',
    grammar: 'SC-5000 NAME', canon: ['HC-2000 FINDER EYE', 'CS-5000 MAIN DISH', 'WB-0000 BAD COOK'], signature: 'flamer',
    make({ rng, line, slot, attempt }) {
      const series = pick(line, [2000, 3000, 5000]);
      const legs = pick(line, ['2', 'R']);
      const pool = { 2000: L.RAD_SCOUT, 3000: L.RAD_WORKS, 5000: L.RAD_COURSES }[series];
      const name = pick(line, pool);
      if (slot.id === 'booster') return { code: `BC-${pad(pick(rng, [2, 4, 6, 8]) * 100 + attempt * 1000, 4)}`, name: pick(rng, L.RAD_BOOSTERS) };
      if (slot.letter) {
        const lead = slot.id === 'legs' ? legs : slot.letter;
        return { code: `${lead}${series === 5000 ? 'S' : 'C'}-${series + attempt}`, name };
      }
      const kind = isMelee(slot) ? 'WB' : slot.mount === 'back' ? 'WS' : 'WR';
      const d = int(rng, 1, 9);
      const number = pick(rng, [`0${d}${d}${d}`, `${d}000`, `${d}${d}00`, `00${d}0`, `${d}00${int(rng, 0, 9)}`]);
      return { code: `${kind}-${number}`, name: pick(rng, L.RAD_IDIOMS) };
    },
  },

  // ── Coral ──────────────────────────────────────────────────
  {
    id: 'allmind', name: 'ALLMIND', full: 'ALLMIND', group: 'coral', tagline: 'Mercenary support system',
    theme: 'Two-block part numbers. Frames are a word for the mind plus a Greek letter; weapons are words with the vowels dropped. Stamps your own word into weapons.',
    grammar: 'CC-NNN WRD', canon: ['20-081 MIND ALPHA', '44-141 JVLN ALPHA', '44-143 HMMR'], signature: 'missile',
    make({ rng, line, slot, words }) {
      const mind = pick(line, L.MINDWORDS);
      const greek = pick(line, L.GREEK);
      const serial = pad(int(rng, 1, 199), 3);
      if (!slot.code) {
        return { code: `${pad(ALLMIND_CLASS[slot.id], 2)}-${serial}`, name: `${mind} ${greek}`, word: mind };
      }
      const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '');
      const own = disemvowel(longest).slice(0, 4);
      const word = own.length >= 3 ? own : disemvowel(pick(rng, L.TERSE)).slice(0, 4);
      const revision = rng() < 0.4 ? ` ${pick(rng, L.GREEK)}` : '';
      return { code: `${slot.mount === 'back' ? 45 : 44}-${serial}`, name: `${word}${revision}`, word };
    },
  },
  {
    id: 'ibis', name: 'IBIS', full: 'Institute IB parts', group: 'coral', tagline: 'Ibis series',
    theme: 'Coral parts from the Ibis series: three letters and three digits, shared across a unit. No source explains the letters. Stamps your acronym.',
    grammar: 'IB-C03S: AAA NNN', canon: ['IB-C03H: HAL 826', 'IB-C03W1: WLT 011', 'IB-C03G: NGI 000'], signature: 'plasma',
    make({ rng, line, slot, letters }) {
      let stock = line() < 0.7
        ? pick(line, CONSONANTS) + pick(line, VOWELS) + pick(line, CONSONANTS)
        : pick(line, CONSONANTS) + pick(line, CONSONANTS) + pick(line, CONSONANTS);
      if (L.IB_TAKEN.includes(stock)) stock = `${stock.slice(0, 2)}${stock[2] === 'X' ? 'Y' : 'X'}`;
      const frameDigits = pad(int(line, 0, 999), 3);
      const suffix = slot.letter || `W${int(rng, 1, 7)}`;
      const digits = slot.code ? pick(rng, [pick(rng, BINARY), pick(rng, TRIANGULAR), pad(int(rng, 0, 999), 3)]) : frameDigits;
      return { code: `IB-C03${suffix}:`, name: `${letters || stock} ${digits}`, word: letters || stock };
    },
  },
  {
    id: 'ia', name: 'Institute IA', full: 'Institute IA parts', group: 'coral', tagline: 'Unpiloted Coral-era parts',
    theme: 'Parts built for unpiloted ACs long ago: biology words for the body, sky and light words for the weapons.',
    grammar: 'IA-C01S: WORD', canon: ['IA-C01H: EPHEMERA', 'IA-C01G: AORTA', 'IA-C01W1: NEBULA'], signature: 'laser',
    make({ rng, line, slot }) {
      if (slot.code) return { code: `IA-C01W${int(rng, 1, 9)}:`, name: pick(rng, L.IA_SKY) };
      return { code: `IA-C01${slot.letter}:`, name: pick(line, L.IA_BODY) };
    },
  },
];

const BY_ID = new Map(HOUSES.map((h) => [h.id, h]));
export const houseById = (id) => BY_ID.get(id) || HOUSES[0];
/** True only for a house this engine has; houseById() falls back silently. */
export const hasHouse = (id) => BY_ID.has(id);
