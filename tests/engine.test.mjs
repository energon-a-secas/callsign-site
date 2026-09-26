// ── Engine tests ─────────────────────────────────────────────
// Plain node, no framework: `make test`. What the page, the CLI and the skill
// all rely on: every house names every slot without throwing, acronyms have
// the right length, nothing lands on a real part, the same input gives the
// same plate, a matched frame shares one name, links survive a round trip,
// and the CLI refuses what it cannot name instead of guessing.

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forge, garageRows, GRAMMAR } from '../js/forge.js';
import { HOUSES } from '../js/houses.js';
import { PARTS, WEAPONS } from '../js/slots.js';
import { isCanon } from '../js/canon.js';
import { blankGarage, sanitizeGarage } from '../js/state.js';
import { encode, decode, forgeLink, garageLink, MAX_LINK } from '../js/links.js';
import { badgeText, badgeMarkdown, buildBadges, chatLine } from '../js/export.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
const failures = [];
const ok = (label, cond, detail = '') => {
  if (cond) pass++;
  else failures.push(`${label}${detail ? `\n      ${String(detail).slice(0, 300)}` : ''}`);
};

// ── Every house, every slot ──────────────────────────────────
const SEEDS = ['', 'release automation daemon', 'RAD', 'billing dashboard', 'auth service', 'KRSV', '???',
  'Stripe webhooks adapter for the billing platform'];
const SLOTS = [...PARTS, ...WEAPONS].map((s) => s.id);
let plates = 0;
for (const h of HOUSES) for (const slot of SLOTS) for (const seed of SEEDS) for (let roll = 0; roll < 4; roll++) {
  const p = forge({ seed, house: h.id, slot, roll });
  plates++;
  const at = `${h.id}/${slot}/"${seed}"/r${roll}`;
  ok(`plate text ${at}`, p.designation && p.callsign && !/undefined|NaN|null/.test(p.designation + p.callsign + p.expansion), p.designation);
  ok(`3 letters ${at}`, p.acronym.three.length > 0 && p.acronym.three.every((a) => /^[A-Z]{3}$/.test(a)), p.acronym.three);
  ok(`4 letters ${at}`, p.acronym.four.length > 0 && p.acronym.four.every((a) => /^[A-Z]{4}$/.test(a)), p.acronym.four);
  ok(`not a real part ${at}`, !isCanon(p.designation), p.designation);
  ok(`grammar stamp ${at}`, p.grammar === GRAMMAR);
  ok(`no long dashes ${at}`, !/[–—]/.test(JSON.stringify(p)));
  ok(`deterministic ${at}`, JSON.stringify(forge({ seed, house: h.id, slot, roll })) === JSON.stringify(p));
}

// ── A matched frame is one line ──────────────────────────────
// Melinite names each part on its own: a bare word cannot tell a head from a core.
for (const h of HOUSES.filter((x) => x.id !== 'melinite')) {
  const g = blankGarage();
  g.name = 'billing platform';
  g.frameHouse = h.id;
  const frame = garageRows(g).filter((r) => r.group === 'frame');
  const names = new Set(frame.map((r) => r.plate.name));
  const codes = new Set(frame.map((r) => r.plate.designation));
  ok(`matched frame shares a name: ${h.id}`, names.size === 1, [...names].join(' | '));
  ok(`matched frame parts differ: ${h.id}`, codes.size === frame.length, [...codes].join(' | '));
}

// ── Links ────────────────────────────────────────────────────
const g = blankGarage();
g.name = 'billing platform';
g.parts[0].note = 'señal ñandú 漢字';
ok('encode and decode round trip', JSON.stringify(sanitizeGarage(decode(encode(g)))) === JSON.stringify(sanitizeGarage(g)));
ok('decode refuses junk', decode('%%%') === null && decode('') === null && decode('bm90IGpzb24') === null);
const fl = new URL(forgeLink({ seed: 'release automation daemon', house: 'ibis', slot: 'booster', roll: 2 }, { via: 'agent' }));
ok('a forge link carries every field',
  fl.searchParams.get('s') === 'release automation daemon' && fl.searchParams.get('h') === 'ibis'
  && fl.searchParams.get('p') === 'booster' && fl.searchParams.get('r') === '2'
  && fl.searchParams.get('g') === String(GRAMMAR) && fl.searchParams.get('via') === 'agent' && fl.hash === '#forge', fl.href);
ok('roll 0 is left out of the link', !new URL(forgeLink({ seed: 'x', house: 'ibis', slot: 'core' })).searchParams.has('r'));
const big = blankGarage();
for (const bay of [...big.parts, ...big.weapons]) { bay.note = '漢'.repeat(120); bay.key = '字'.repeat(120); }
ok('an oversize build gets no link', garageLink(big) === null);
const small = garageLink(g);
ok('a normal build gets a link under the limit', typeof small === 'string' && small.length <= MAX_LINK, small && small.length);

// ── Paste formats ────────────────────────────────────────────
ok('badge: dashes doubled, colon escaped', badgeText('IB-C03B: RAD 386') === 'IB--C03B%3A_RAD_386', badgeText('IB-C03B: RAD 386'));
ok('badge: slash escaped', badgeText('HBZ-G3/P14SPL-08') === 'HBZ--G3%2FP14SPL--08', badgeText('HBZ-G3/P14SPL-08'));
ok('badge: underscores doubled', badgeText('A_B') === 'A__B', badgeText('A_B'));
ok('badge: nothing that ends a Markdown link', !/[()[\]\s]/.test(badgeText('Vvc-7 (x) [y] z')), badgeText('Vvc-7 (x) [y] z'));
ok('badge markdown wraps the image in the link',
  badgeMarkdown({ designation: 'VP-40C' }, 'https://x/') === '[![callsign: VP-40C](https://img.shields.io/badge/callsign-VP--40C-ff6f59)](https://x/)');
ok('build badges carry one link, once', (() => {
  const md = buildBadges(garageRows(g), 'https://x/?b=long');
  return md.split('https://x/?b=long').length === 2 && md.includes('][callsign-build]');
})());
for (const h of HOUSES) for (const seed of ['', 'KRSV']) {
  const reads = forge({ seed, house: h.id, slot: 'generator' }).expansion.split(' ');
  ok(`a reading repeats no word: ${h.id}/"${seed}"`, new Set(reads).size === reads.length, reads.join(' '));
}
const rad = forge({ seed: 'release automation daemon', house: 'ibis', slot: 'booster' });
ok('chat line leads with the acronym for a part', chatLine(rad, '').startsWith(`RAD (${rad.designation})`), chatLine(rad, ''));

// ── CLI ──────────────────────────────────────────────────────
const cli = (...args) => spawnSync(process.execPath,
  ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', join(ROOT, 'tools', 'callsign.mjs'), ...args], { encoding: 'utf8' });
const json = (r) => { try { return JSON.parse(r.stdout); } catch { return null; } };
let r = cli('forge', 'x', '--house', 'nope');
ok('cli: an unknown house exits 2', r.status === 2 && /unknown house/.test(r.stderr), `${r.status} ${r.stderr}`);
r = cli('forge', 'x', '--slot', 'nope');
ok('cli: an unknown slot exits 2', r.status === 2 && /unknown slot/.test(r.stderr), `${r.status} ${r.stderr}`);
r = cli('forge', 'x', '--bogus');
ok('cli: an unknown option exits 2', r.status === 2, `${r.status} ${r.stderr}`);
r = cli('forge', 'x', '--roll', '1.5');
ok('cli: a fractional roll exits 2', r.status === 2, `${r.status} ${r.stderr}`);
r = cli();
ok('cli: no command exits 2', r.status === 2);
r = cli('forge', 'release', 'automation', 'daemon', '--house', 'ibis', '--slot', 'booster', '--json');
const one = json(r);
ok('cli: forge prints the engine plate as JSON',
  r.status === 0 && Array.isArray(one) && one.length === 1 && one[0].designation === rad.designation
  && one[0].grammar === GRAMMAR && one[0].link.includes('g=1'), r.stdout + r.stderr);
r = cli('forge', 'billing', 'dashboard', '--count', '3', '--json');
const three = json(r) || [];
ok('cli: --count 3 across houses gives three houses', three.length === 3 && new Set(three.map((x) => x.house)).size === 3, r.stdout);
r = cli('link', 'billing', 'dashboard', '--house', 'balam', '--slot', 'head', '--via', 'agent');
ok('cli: link prints one tagged link', r.status === 0 && r.stdout.trim().split('\n').length === 1 && r.stdout.includes('via=agent'), r.stdout);
r = cli('garage', small);
ok('cli: garage reads a link', r.status === 0 && r.stdout.includes('BILLING PLATFORM'), r.stdout + r.stderr);
r = cli('garage', 'not-a-build');
ok('cli: garage refuses junk with exit 2', r.status === 2, `${r.status} ${r.stderr}`);
r = cli('houses', '--json');
const houses = json(r) || [];
ok('cli: houses lists every id and no in-game names', houses.length === HOUSES.length && !JSON.stringify(houses).includes('canon'), r.stdout.slice(0, 200));

console.log(`engine: ${pass} checks passed over ${plates} plates`);
if (failures.length) {
  console.log(`engine: ${failures.length} failed`);
  failures.slice(0, 25).forEach((f) => console.log(`  ${f}`));
  process.exit(1);
}
