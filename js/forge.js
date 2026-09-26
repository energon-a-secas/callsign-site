// ── Forge ────────────────────────────────────────────────────
// Turns (what you typed, house, slot, roll) into a plate. A house only knows
// how to stamp a code and a name; acronyms, readings and the callsign are
// assembled here, so every house gets them the same way.

import { houseById } from './houses.js';
import { PARTS, MOUNTS, slot as slotDef, isWeapon } from './slots.js';
import { rngFrom } from './rng.js';
import { acronyms, words, usedWords, fixedAcronym } from './acronym.js';
import { expand, invent } from './expand.js';
import { isCanon } from './canon.js';

/**
 * The naming grammar this engine implements. The word pools, the house rules,
 * the acronym lists and the canon hashes all feed it, so any edit that renames
 * an existing plate is a new grammar: bump this, re-record tests/golden.json
 * with `make golden`, and links made under the old number say so on arrival.
 */
export const GRAMMAR = 1;

/** The key an empty input hashes to, in the forge and in the garage alike. */
export const EMPTY_KEY = 'callsign';

const title = (w) => w.charAt(0).toUpperCase() + w.slice(1);

/** Code and name joined the way the house writes them; either may be empty. */
function designationOf({ code, name, sep = ' ', nameFirst = false }) {
  if (!name) return code;
  if (!code) return name;
  return nameFirst ? `${name}${sep}${code}` : `${code}${sep}${name}`;
}
const normalise = (v) => String(v || '').trim().toLowerCase();

/** Extra hash parts only when there is something to add, so attempt 0 keys cleanly. */
const retry = (attempt, from = 1) => (attempt >= from ? [attempt] : []);

/**
 * @param {object} o
 * @param {string} o.seed   words the acronym and reading come from
 * @param {string} [o.key]  what the randomness hashes; defaults to the seed
 * @param {string} o.house  a house id; an unknown one falls back to the first house
 * @param {string} o.slot   part or weapon class id; an unknown one falls back to Head
 * @param {number} [o.roll]
 * @param {{key: string, roll: number, seed?: string}|null} [o.line]  shared draw for a matched frame
 */
export function forge({ seed = '', key, house, slot, roll = 0, line = null }) {
  const h = houseById(house);
  const s = slotDef(slot);
  const weapon = isWeapon(s.id);
  const k = normalise(key ?? seed) || EMPTY_KEY;
  const partIndex = Math.max(0, PARTS.findIndex((p) => p.id === s.id));
  const typed = words(seed);
  const acrRng = rngFrom('acr', k, h.id, s.id, roll);
  // Letters from your own words exist before the house stamps anything, so a
  // house whose grammar carries letters (IBIS, ALLMIND) can stamp yours.
  // Words too short to give three letters ('ui', 'qa') give none, so the name or
  // an invented reading supplies them instead of the slot's role letters.
  const lettersOf = (text) => {
    if (!words(text).length && !fixedAcronym(text)) return null;
    const found = acronyms({ seed: text, name: '', roles: s.roles, rng: acrRng });
    return found.source === 'role' ? null : found;
  };
  const own = lettersOf(seed);
  // A matched frame stamps the build's letters, so all four parts agree.
  const stamp = line ? lettersOf(line.seed || '') : own;
  const roll1 = (attempt) => h.make({
    // Retries vary the plate's own draws first. Only a stubborn collision
    // also varies the shared line, which may split a matched frame.
    rng: rngFrom('plate', k, h.id, s.id, roll, ...retry(attempt)),
    line: line
      ? rngFrom('line', line.key, h.id, line.roll, ...retry(attempt, 6))
      : rngFrom('line', k, h.id, s.id, roll, ...retry(attempt, 6)),
    slot: s, weapon, partIndex, attempt,
    letters: stamp?.three[0] || '', words: line ? words(line.seed || '') : typed,
  });
  let out = roll1(0);
  // A roll that lands exactly on a real part's designation is rolled again.
  for (let attempt = 1; attempt < 10 && isCanon(designationOf(out)); attempt++) out = roll1(attempt);
  const designation = designationOf(out);
  // A code-only house (Arquebus, Furlong, VCPL) has no word to shorten, so with
  // nothing typed the reading comes first and the letters come from it.
  const invented = !own && !out.name ? invent(s.roles, rngFrom('inv', k, h.id, s.id, roll)) : '';
  const fromInvented = invented ? acronyms({ seed: invented, name: '', roles: s.roles, rng: acrRng }) : null;
  // A reading whose initials give no usable letters (Cached Coherent Core) is
  // dropped with them, so what a plate reads as always spells its letters.
  const acronym = own
    || (fromInvented
      ? { ...fromInvented, source: fromInvented.source === 'role' ? 'role' : 'invented' }
      : acronyms({ seed: '', name: out.word || out.name, roles: s.roles, rng: acrRng }));
  const lead = acronym.three[0];
  const expansion = acronym.source === 'seed' ? usedWords(typed, 3).map(title).join(' ')
    : acronym.source === 'invented' ? invented
      : expand(lead, s.roles, rngFrom('exp', k, h.id, s.id, roll));

  return {
    grammar: GRAMMAR,
    id: `${h.id}:${s.id}:${roll}`,
    seed, house: h.id, houseName: h.name, slot: s.id, slotLabel: s.label, roll, weapon,
    code: out.code, name: out.name || '', designation, nameFirst: Boolean(out.nameFirst), sep: out.sep ?? ' ',
    // Projects answer to an acronym, tools and services to a weapon's name.
    callsign: weapon ? (out.name || out.code) : lead,
    acronym, expansion,
  };
}

const mountLabel = (id) => MOUNTS.find((m) => m.id === id)?.label || id;
const buildKeyOf = (g) => normalise(g.name) || EMPTY_KEY;

/** Every slot of a build as a row with its plate. Off slots only on request. */
export function garageRows(g, { includeOff = false } = {}) {
  const buildKey = buildKeyOf(g);
  const rows = [];
  for (const p of g.parts) {
    if (!p.on && !includeOff) continue;
    const def = slotDef(p.id);
    const matched = g.matched && def.group === 'frame';
    const plate = forge({
      seed: p.note,
      key: p.key || p.note || buildKey,
      house: matched ? g.frameHouse : p.house,
      slot: p.id,
      roll: matched ? g.frameRoll : p.roll,
      line: matched ? { key: buildKey, roll: g.frameRoll, seed: g.name } : null,
    });
    rows.push({ kind: 'part', ref: p.id, group: def.group, label: def.label, role: def.names,
      note: p.note, on: p.on, locked: p.locked, matched, plate });
  }
  for (const w of g.weapons) {
    if (!w.on && !includeOff) continue;
    const def = slotDef(w.cls);
    const plate = forge({
      seed: w.note, key: w.key || w.note || `${buildKey}#${w.mount}`, house: w.house, slot: w.cls, roll: w.roll,
    });
    rows.push({ kind: 'weapon', ref: w.mount, group: 'weapons', mount: mountLabel(w.mount),
      label: `${mountLabel(w.mount)}, ${def.label}`, role: def.names,
      note: w.note, on: w.on, locked: w.locked, matched: false, plate });
  }
  return rows;
}

/** The build's own acronym and, for a matched frame, the line its parts share. */
export function buildIdentity(g) {
  const buildKey = buildKeyOf(g);
  const plate = forge({
    seed: g.name, key: buildKey, house: g.frameHouse, slot: 'core', roll: g.frameRoll,
    line: { key: buildKey, roll: g.frameRoll, seed: g.name },
  });
  return {
    grammar: GRAMMAR, acronym: plate.acronym, line: plate.name || plate.code,
    expansion: plate.expansion, houseName: plate.houseName,
  };
}

export { mountLabel };
