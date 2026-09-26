// ── Golden plates ────────────────────────────────────────────
// A shared name is a promise: the same words, house, slot and roll give the
// same plate for as long as the grammar number stays the same. This hashes
// every house and slot over a handful of seeds and rolls, plus whole builds.
// If the hash moves, a name somebody already copied has changed.
//
//   make test     compare against tests/golden.json
//   make golden   record the current grammar, after bumping GRAMMAR in js/forge.js
//
// Adding one word to a word pool renames about half of that house's plates,
// which is why a pool edit is a grammar bump and not a tidy-up.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forge, garageRows, buildIdentity, GRAMMAR } from '../js/forge.js';
import { HOUSES } from '../js/houses.js';
import { PARTS, WEAPONS } from '../js/slots.js';
import { blankGarage } from '../js/state.js';

const FILE = join(dirname(fileURLToPath(import.meta.url)), 'golden.json');
const SEEDS = ['', 'release automation daemon', 'RAD', 'billing dashboard', 'auth service', '漢字 mixed input'];
const SLOTS = [...PARTS, ...WEAPONS].map((s) => s.id);

const lines = [];
for (const h of HOUSES) for (const slot of SLOTS) for (const seed of SEEDS) for (let roll = 0; roll < 6; roll++) {
  const p = forge({ seed, house: h.id, slot, roll });
  lines.push([h.id, slot, seed, roll, p.designation, p.callsign, p.acronym.three, p.acronym.four, p.expansion].join('\t'));
}
for (const name of ['', 'billing platform', 'Release Automation', 'KRSV']) {
  for (const h of HOUSES) {
    const g = blankGarage();
    g.name = name;
    g.frameHouse = h.id;
    for (const r of garageRows(g, { includeOff: true })) {
      lines.push(['build', name, h.id, r.ref, r.plate.designation, r.plate.acronym.three].join('\t'));
    }
    const id = buildIdentity(g);
    lines.push(['identity', name, h.id, id.acronym.three, id.line, id.expansion].join('\t'));
  }
}
const digest = createHash('sha256').update(lines.join('\n')).digest('hex');
const recorded = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};

if (process.argv.includes('--update')) {
  // Re-recording a grammar that already shipped would hide a rename. --force is
  // for the one window before a grammar is first published.
  if (recorded[GRAMMAR] && recorded[GRAMMAR] !== digest && !process.argv.includes('--force')) {
    console.error(`golden: grammar ${GRAMMAR} is already recorded with different names. Bump GRAMMAR in js/forge.js, then run make golden.`);
    process.exit(1);
  }
  recorded[GRAMMAR] = digest;
  writeFileSync(FILE, `${JSON.stringify(recorded, null, 2)}\n`);
  console.log(`golden: recorded grammar ${GRAMMAR} over ${lines.length} plates`);
  process.exit(0);
}
if (!recorded[GRAMMAR]) {
  console.error(`golden: nothing recorded for grammar ${GRAMMAR}. Run make golden once its names are final.`);
  process.exit(1);
}
if (recorded[GRAMMAR] !== digest) {
  console.error(`golden: grammar ${GRAMMAR} names changed across ${lines.length} plates. If that was the point, bump GRAMMAR in js/forge.js and run make golden; if not, undo the edit that renamed them.`);
  process.exit(1);
}
console.log(`golden: grammar ${GRAMMAR} unchanged over ${lines.length} plates`);
