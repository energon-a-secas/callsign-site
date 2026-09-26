// ── Golden plates ────────────────────────────────────────────
// A shared name is a promise: the same words, house, slot and roll give the
// same plate for as long as the grammar number stays the same. This records
// one digest per house (every slot over seeds that walk each acronym path,
// the plates known to hit the canon reroll, and a matched frame and identity
// per build name) and one per piece of data every name is drawn from: each
// word pool, the canon hashes, the acronym word lists, the reading banks and
// each slot. Sampled plates alone would miss a pool entry no sample uses.
//
// A digest per house and per pool is what lets the grammar grow: a new house
// or a new pool is an addition and records without a bump, while a changed
// digest means a name somebody already copied has changed.
//
//   make test     compare against tests/golden.json
//   make golden   record additions; refuses a changed digest
//
// Adding one word to an existing pool renames about half of that house's
// plates, which is why a pool edit is a grammar bump and not a tidy-up.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forge, garageRows, buildIdentity, GRAMMAR } from '../js/forge.js';
import { HOUSES } from '../js/houses.js';
import { PARTS, WEAPONS, MOUNTS } from '../js/slots.js';
import { blankGarage } from '../js/state.js';
import * as LEXICON from '../js/lexicon.js';
import { CANON_HASHES } from '../js/canon.js';
import { RULES } from '../js/acronym.js';
import { BANKS } from '../js/expand.js';

const FILE = join(dirname(fileURLToPath(import.meta.url)), 'golden.json');
// One seed per acronym path: none, three words, a fixed acronym of three and of
// four, two words, a weak word, stop words, camelCase, kebab-case, five strong
// words, a word too short for letters, digits, punctuation only, and non-Latin.
const SEEDS = ['', 'release automation daemon', 'RAD', 'KRSV', 'billing dashboard', 'auth service',
  'the new search index for my team', 'billingDashboard', 'release-train-bot',
  'stripe webhooks adapter billing platform', 'ui', 'v2 api 2026', '???', '漢字 mixed input'];
// Plates that land on a real part and reroll once, twice and three times.
const REROLLS = [['', 'arquebus', 'head', 2], ['', 'add', 'rifle', 0], ['', 'add', 'rifle', 1], ['', 'vcpl', 'grenade', 146]];
const SLOTS = [...PARTS, ...WEAPONS].map((s) => s.id);

const sha = (text) => createHash('sha256').update(text).digest('hex');

function houseDigest(h) {
  const lines = [];
  for (const slot of SLOTS) for (const seed of SEEDS) for (let roll = 0; roll < 6; roll++) {
    const p = forge({ seed, house: h.id, slot, roll });
    lines.push([slot, seed, roll, p.designation, p.callsign, p.acronym.three, p.acronym.four, p.expansion].join('\t'));
  }
  for (const [seed, house, slot, roll] of REROLLS) {
    if (house === h.id) lines.push(['reroll', slot, seed, roll, forge({ seed, house, slot, roll }).designation].join('\t'));
  }
  for (const name of ['', 'billing platform', 'Release Automation', 'KRSV']) {
    const g = blankGarage();
    g.name = name;
    g.frameHouse = h.id;
    for (const r of garageRows(g).filter((row) => row.matched)) lines.push(['frame', name, r.ref, r.plate.designation, r.plate.acronym.three].join('\t'));
    const id = buildIdentity(g);
    lines.push(['identity', name, id.acronym.three, id.line, id.expansion].join('\t'));
  }
  return sha(lines.join('\n'));
}

// Only the slot fields a name is drawn from; labels and hints are copy, free to edit.
const slotData = (s) => JSON.stringify([s.id, s.group, s.letter, s.family, s.mount, s.code, s.roles]);

const current = {
  houses: Object.fromEntries(HOUSES.map((h) => [h.id, houseDigest(h)])),
  data: {
    ...Object.fromEntries(Object.entries(LEXICON).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [`pool:${k}`, sha(JSON.stringify(v))])),
    canon: sha(JSON.stringify(CANON_HASHES)),
    rules: sha(JSON.stringify(RULES)),
    banks: sha(JSON.stringify(BANKS)),
    mounts: sha(JSON.stringify(MOUNTS.map((m) => m.id))),
    ...Object.fromEntries([...PARTS, ...WEAPONS].map((s, i) => [`slot:${s.id}`, sha(`${i}:${slotData(s)}`)])),
  },
};

const all = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};
const recorded = all[GRAMMAR] && typeof all[GRAMMAR] === 'object' ? all[GRAMMAR] : { houses: {}, data: {} };

const changed = [];
const added = [];
for (const kind of ['houses', 'data']) {
  for (const [key, digest] of Object.entries(recorded[kind] || {})) {
    if (!(key in current[kind])) changed.push(`${kind}/${key} is gone`);
    else if (current[kind][key] !== digest) changed.push(`${kind}/${key} changed`);
  }
  for (const key of Object.keys(current[kind])) if (!(key in (recorded[kind] || {}))) added.push(`${kind}/${key}`);
}
const count = Object.keys(current.houses).length;

if (process.argv.includes('--update')) {
  // A changed digest in a grammar that shipped would hide a rename. --force is
  // for the one window before a grammar is first published.
  if (changed.length && !process.argv.includes('--force')) {
    console.error(`golden: grammar ${GRAMMAR} would rename plates (${changed.join(', ')}). Bump GRAMMAR in js/forge.js, then run make golden.`);
    process.exit(1);
  }
  all[GRAMMAR] = current;
  writeFileSync(FILE, `${JSON.stringify(all, null, 2)}\n`);
  console.log(`golden: recorded grammar ${GRAMMAR}, ${count} houses${added.length ? `; added ${added.join(', ')}` : ''}`);
  process.exit(0);
}
if (!all[GRAMMAR]) {
  console.error(`golden: nothing recorded for grammar ${GRAMMAR}. Run make golden once its names are final.`);
  process.exit(1);
}
if (changed.length) {
  console.error(`golden: grammar ${GRAMMAR} names changed: ${changed.join(', ')}. If that was the point, bump GRAMMAR in js/forge.js and run make golden; if not, undo the edit that renamed them.`);
  process.exit(1);
}
if (added.length) {
  console.error(`golden: not recorded yet: ${added.join(', ')}. Run make golden to record the additions.`);
  process.exit(1);
}
console.log(`golden: grammar ${GRAMMAR} unchanged over ${count} houses and ${Object.keys(current.data).length} pieces of data`);
