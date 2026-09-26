// ── Engine tests ─────────────────────────────────────────────
// Plain node, no framework: `make test`. What the page, the CLI and the skill
// all rely on: every house names every slot without throwing, acronyms have
// the right length, nothing lands on a real part, the same input gives the
// same plate, a matched frame shares one name, links survive a round trip,
// and the CLI refuses what it cannot name instead of guessing.

import { spawnSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forge, garageRows, GRAMMAR } from '../js/forge.js';
import { HOUSES } from '../js/houses.js';
import { CALLSIGN_HOUSES, Z_OF } from '../js/houses-callsign.js';
import { PARTS, WEAPONS } from '../js/slots.js';
import * as L from '../js/lexicon.js';
import { FAMILIES, SUBJECTS, LANGUAGES, POOL_LABELS, usedBy } from '../js/families.js';
import { lookup } from '../js/lookup.js';
import { familyCard } from '../js/render-lexicon.js';
import { acronyms } from '../js/acronym.js';
import { isCanon } from '../js/canon.js';
import { blankGarage, sanitizeGarage, loadSaved, readUrl } from '../js/state.js';
import { encode, decode, forgeLink, garageLink, lexiconLink, linkGrammar, clip, SITE, MAX_LINK, SEED_MAX } from '../js/links.js';
import { badgeText, badgeMarkdown, buildBadges, chatLine, toJson } from '../js/export.js';

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

// ── Never a real part, however far the rolls go ──────────────
// The loop above samples four rolls; a small grammar (VCPL's six missile
// variants, three of them real) only fails deep into the rolls.
let landed = [];
for (const h of HOUSES) for (const slot of SLOTS) for (let roll = 0; roll < 300; roll++) {
  const p = forge({ seed: '', house: h.id, slot, roll });
  if (isCanon(p.designation)) landed.push(`${h.id}/${slot}/r${roll} ${p.designation}`);
}
ok('no roll lands on a real part', landed.length === 0, landed.slice(0, 5).join(' | '));

// ── A reading spells its letters ─────────────────────────────
landed = [];
for (const h of HOUSES) for (const slot of SLOTS) for (const seed of ['', 'x', 'ui', '???']) for (let roll = 0; roll < 20; roll++) {
  const p = forge({ seed, house: h.id, slot, roll });
  const first = p.expansion.split(' ').map((w) => w[0]).join('').toUpperCase();
  if (!first.startsWith(p.acronym.three[0][0])) landed.push(`${h.id}/${slot}/"${seed}"/r${roll} ${p.acronym.three[0]} ${p.expansion}`);
}
ok('a reading starts with its first letter', landed.length === 0, landed.slice(0, 5).join(' | '));
const ui = forge({ seed: 'ui', house: 'balam', slot: 'core' });
ok('words too short for letters are not claimed as the source', ui.acronym.source !== 'seed' && ui.expansion !== 'Ui', `${ui.acronym.source} ${ui.expansion}`);

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
const qs = (text) => new URLSearchParams(text);
ok('a link with a payload and no g is grammar 0', linkGrammar(qs('s=x&h=ibis')) === '0' && linkGrammar(qs('b=abc')) === '0');
ok('a link with g is that grammar', linkGrammar(qs('s=x&g=1')) === '1');
ok('a link that names nothing has no grammar', linkGrammar(qs('via=readme')) === null && linkGrammar(qs('')) === null);
ok('clip never leaves half a surrogate pair', clip(`${'a'.repeat(SEED_MAX - 1)}😀`) === 'a'.repeat(SEED_MAX - 1));

// ── Opening a link ───────────────────────────────────────────
// readUrl and loadSaved read the browser's location and localStorage; stand them in.
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
const visit = (url, saved = null) => {
  store.clear();
  if (saved) store.set('callsign:v1', JSON.stringify(saved));
  const u = new URL(url, SITE);
  globalThis.location = { search: u.search, hash: u.hash, origin: u.origin, pathname: u.pathname };
  const s = { view: 'forge', forge: { seed: '', house: 'all', slot: 'core', roll: 0 }, garage: blankGarage(), hangar: [], notice: '', noticeText: '' };
  loadSaved(s);
  readUrl(s);
  return s;
};
const mine = blankGarage();
mine.name = 'my own build';
const session = (grammar, garage = mine, seed = '') => ({ grammar, view: 'garage', forge: { seed, house: 'all', slot: 'core', roll: 0 }, garage, hangar: [] });
let v = visit('?s=billing+dashboard&h=ibis&p=core#forge');
ok('a link from before grammars were numbered says so', /before Callsign numbered its grammars/.test(v.notice), v.notice);
v = visit('?s=x&h=ibis&p=core&g=7#forge');
ok('a link from another grammar names it', /grammar "7"/.test(v.notice), v.notice);
v = visit('?via=readme#houses');
ok('a link that names nothing opens quietly', v.notice === '' && v.view === 'houses', v.notice);
v = visit(forgeLink({ seed: 'x', house: 'ibis', slot: 'core', roll: 3 }));
ok('a current link opens quietly on its plate', v.notice === '' && v.forge.house === 'ibis' && v.forge.roll === 3, v.notice);
v = visit('?s=x&h=ibis&p=core&r=1000000&g=1#forge');
ok('a roll past the limit opens roll 0 and says so', v.forge.roll === 0 && /roll/.test(v.notice), v.notice);
v = visit(`?s=${'word '.repeat(30)}&h=ibis&p=core&g=1#forge`);
ok('words past the limit are cut and said', v.forge.seed.length === SEED_MAX && /120 characters/.test(v.notice), v.notice);
v = visit(small, session(0));
ok('a build link keeps the viewer\'s own build in the hangar',
  v.garage.name === 'billing platform' && v.hangar.length === 1 && v.hangar[0].garage.name === 'my own build'
  && v.hangar[0].grammar === 0 && /kept in the hangar/.test(v.notice) && !/last session/.test(v.notice), v.notice);
v = visit(small, session(GRAMMAR, sanitizeGarage(g)));
ok('opening your own build link stashes nothing', v.hangar.length === 0, v.hangar.length);
v = visit(small, session(GRAMMAR, blankGarage()));
ok('a blank garage is replaced without a stash', v.hangar.length === 0 && v.garage.name === 'billing platform');
v = visit(`?b=${encode({ hello: 1 })}&g=1#garage`, session(GRAMMAR));
ok('a payload that is not a build keeps the viewer\'s garage', v.garage.name === 'my own build' && /could not be read/.test(v.notice), v.notice);
v = visit('#garage', session(0));
ok('a session from an earlier grammar says its names may have changed', /last session was saved under an earlier grammar/.test(v.notice), v.notice);
v = visit('#garage', session(GRAMMAR));
ok('a current session opens quietly', v.notice === '', v.notice);
v = visit('#forge', session(0, blankGarage()));
ok('an empty session from an earlier grammar opens quietly', v.notice === '', v.notice);
v = visit('#forge', session(0, blankGarage(), 'billing dashboard'));
ok('a typed forge session from an earlier grammar says so', /last session/.test(v.notice), v.notice);

// ── Paste formats ────────────────────────────────────────────
ok('badge: dashes doubled, colon escaped', badgeText('IB-C03B: RAD 386') === 'IB--C03B%3A_RAD_386', badgeText('IB-C03B: RAD 386'));
ok('badge: slash escaped', badgeText('HBZ-G3/P14SPL-08') === 'HBZ--G3%2FP14SPL--08', badgeText('HBZ-G3/P14SPL-08'));
ok('badge: underscores doubled', badgeText('A_B') === 'A__B', badgeText('A_B'));
ok('badge: nothing that ends a Markdown link', !/[()[\]\s]/.test(badgeText('Vvc-7 (x) [y] z')), badgeText('Vvc-7 (x) [y] z'));
ok('build badges with no link still name the grammar', buildBadges(garageRows(g), '').includes(`Callsign grammar ${GRAMMAR}`));
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

// ── Word families ────────────────────────────────────────────
const NOT_A_FAMILY = ['ASTERISMS', 'CENTAURS', 'GREEK', 'IB_TAKEN'];
const arrays = Object.entries(L).filter(([, v]) => Array.isArray(v)).map(([k]) => k);
const familyPools = FAMILIES.flatMap((f) => f.pools);
ok('every family pool is a lexicon pool', familyPools.every((p) => arrays.includes(p)), familyPools.filter((p) => !arrays.includes(p)));
ok('every lexicon pool sits in exactly one family',
  arrays.filter((a) => !NOT_A_FAMILY.includes(a)).every((a) => familyPools.filter((p) => p === a).length === 1),
  arrays.filter((a) => !NOT_A_FAMILY.includes(a) && familyPools.filter((p) => p === a).length !== 1));
const owner = new Map();
const twice = [];
for (const pool of familyPools) for (const w of L[pool]) { if (owner.has(w)) twice.push(`${w} in ${owner.get(w)} and ${pool}`); owner.set(w, pool); }
ok('no word sits in two pools', twice.length === 0, twice.slice(0, 5).join(' | '));
ok('no family word is a real part designation', familyPools.every((p) => L[p].every((w) => !isCanon(w))), familyPools.flatMap((p) => L[p].filter((w) => isCanon(w))));
const originalPools = CALLSIGN_HOUSES.flatMap((h) => h.draws.map((d) => d.pool));
for (const pool of originalPools) {
  const bad = L[pool].filter((w) => !/^[A-Z0-9]+(?:[ -][A-Z0-9]+)*$/.test(w) || w.length > 14);
  ok(`${pool}: words are plain capitals, 14 characters at most`, bad.length === 0, bad);
  ok(`${pool}: 25 to 60 words`, L[pool].length >= 25 && L[pool].length <= 60, L[pool].length);
}
ok('every pool has a label', familyPools.every((p) => POOL_LABELS[p]));
const subjectIds = SUBJECTS.map((x) => x.id);
const langIds = LANGUAGES.map((x) => x.id);
for (const f of FAMILIES) {
  ok(`${f.id}: subjects and languages are known`, f.subjects.every((x) => subjectIds.includes(x)) && f.languages.every((x) => langIds.includes(x)) && f.subjects.length && f.languages.length);
  ok(`${f.id}: label fits and copy has no long dashes`, f.label.length <= 28 && !/[–—]/.test(f.label + f.about));
  ok(`${f.id}: sources are https`, f.sources.every((x) => /^https:\/\//.test(x.url) && x.label));
  ok(`${f.id}: some house draws it`, usedBy(f.id).length > 0);
}
ok('every original family cites a source', FAMILIES.filter((f) => f.pools.some((p) => originalPools.includes(p))).every((f) => f.sources.length));

// What a house says it draws is what it really draws. Forge every house and
// slot, read each plate back through the lookup, and check both directions.
const slotKeys = (id) => {
  const def = [...PARTS, ...WEAPONS].find((x) => x.id === id);
  return [id, WEAPONS.includes(def) ? 'weapons' : def.group];
};
const declared = (h, pool, slot) => h.draws.some((d) => d.pool === pool && d.slots.some((k) => slotKeys(slot).includes(k)));
for (const h of HOUSES) {
  ok(`${h.id}: has draws and a shape`, Array.isArray(h.draws) && h.shape instanceof RegExp);
  ok(`${h.id}: draws name real pools`, h.draws.every((d) => arrays.includes(d.pool)));
  const seen = new Set();
  const stray = [];
  const shapeMiss = [];
  const otherShape = [];
  for (const slot of SLOTS) for (const seed of ['', 'billing dashboard', 'x']) for (let roll = 0; roll < 40; roll++) {
    const p = forge({ seed, house: h.id, slot, roll });
    if (!h.shape.test(p.designation)) shapeMiss.push(p.designation);
    const others = HOUSES.filter((o) => o !== h && o.id !== 'melinite' && o.shape.test(p.designation));
    if (others.length && h.id !== 'melinite') otherShape.push(`${p.designation} fits ${others.map((o) => o.id)}`);
    if (isCanon(p.designation)) continue;
    const r = lookup(p.designation);
    for (const x of r.hits) {
      if (declared(h, x.pool, slot)) seen.add(`${x.pool}|${slotKeys(slot)[1]}|${slot}`);
      else stray.push(`${p.designation} (${slot}) drew ${x.pool}`);
    }
    for (const x of r.stripped) seen.add(`TERSE|weapons|${slot}`);
  }
  ok(`${h.id}: its shape fits every plate it makes`, shapeMiss.length === 0, shapeMiss.slice(0, 3));
  ok(`${h.id}: no other house's shape fits its plates`, otherShape.length === 0, otherShape.slice(0, 3));
  ok(`${h.id}: plates draw only from declared pools`, stray.length === 0, stray.slice(0, 3));
  const unseen = h.draws.filter((d) => ![...seen].some((k) => k.startsWith(`${d.pool}|`)));
  ok(`${h.id}: every declared pool shows up`, unseen.length === 0, unseen.map((d) => d.pool));
}
for (const h of HOUSES) for (const c of h.canon) {
  const r = lookup(c);
  ok(`lookup never echoes the real part ${h.id}`, r.canon && !r.hits.length && !r.houses.length);
}
const cardText = FAMILIES.map((f) => familyCard(f, { open: true })).join('\n');
const leaked = HOUSES.flatMap((h) => h.canon).filter((c) => cardText.includes(c));
ok('no family card shows an in-game designation', leaked.length === 0, leaked);

// House rules the codes depend on.
ok('every Jovian moon ends in A, E or O', L.JOVIAN_MOONS.every((w) => /[AEO]$/.test(w)), L.JOVIAN_MOONS.filter((w) => !/[AEO]$/.test(w)));
ok('the centaurs are the tail of the weapons pool', JSON.stringify(L.GIANTS_AND_CENTAURS.slice(-L.CENTAURS.length)) === JSON.stringify(L.CENTAURS));
ok('every superheavy name is a real placeholder name', L.SUPERHEAVY.every((w) => Z_OF.has(w)), L.SUPERHEAVY.filter((w) => !Z_OF.has(w)));
ok('placeholder names follow IUPAC', Z_OF.get('UNBINILIUM') === 120 && Z_OF.get('UNBIBIUM') === 122 && Z_OF.get('UNBIENNIUM') === 129 && Z_OF.get('UNTRINILIUM') === 130);

// Letters Callsign's own words must never hand out. A test list, not BLOCKED:
// changing BLOCKED would rename plates in shipped houses.
const DENY = new Set(['SPIC', 'CONO', 'METH', 'CSM', 'CTM', 'PTM', 'PTO', 'NIP', 'NRA', 'ANO', 'DEI', 'LAME',
  'DMT', 'PTA', 'LPM', 'HUEA']);
const denied = [];
// What the plates really hand out, which for Quadnil is the element symbol, not the word.
for (const h of CALLSIGN_HOUSES) for (const slot of SLOTS) for (let roll = 0; roll < 200; roll++) {
  const p = forge({ seed: '', house: h.id, slot, roll });
  const bad = [...p.acronym.three, ...p.acronym.four].filter((c) => DENY.has(c) || DENY.has(c.slice(0, 3)));
  if (bad.length) denied.push(`${p.designation}: ${bad}`);
  if (!WEAPONS.some((x) => x.id === slot) && p.acronym.three[0] === 'THE') denied.push(`${p.designation} leads with THE`);
}
for (const h of CALLSIGN_HOUSES) for (const d of h.draws) for (const slot of SLOTS) {
  if (!d.slots.some((k) => slotKeys(slot).includes(k))) continue;
  const roles = [...PARTS, ...WEAPONS].find((x) => x.id === slot).roles;
  for (const w of L[d.pool]) {
    const a = acronyms({ seed: '', name: w, roles, rng: () => 0.5 });
    const chips = [...a.three, ...a.four];
    const bad = chips.filter((c) => DENY.has(c) || [...DENY].some((x) => x.length === 3 && c.startsWith(x) && c.length === 4 && DENY.has(c.slice(0, 3))));
    if (bad.length) denied.push(`${w} (${slot}): ${bad}`);
    if (!WEAPONS.some((x) => x.id === slot) && a.three[0] === 'THE') denied.push(`${w} (${slot}) leads with THE`);
  }
}
ok('no original word hands out a denied acronym', denied.length === 0, denied.slice(0, 5).join(' | '));

// Lookups a person really types or pastes.
const look = (q) => lookup(q);
ok('lookup: a real part inside longer text is refused', look('my frame is HD-011 MELANDER ok').canon && look('hd-011 melander').canon);
ok('lookup: lowercase and extra spaces keep the house', look('jv-r69/h   sinope').houses[0]?.id === 'apojove' && look('ubh-316h unbihexium').houses[0]?.id === 'quadnil');
ok('lookup: ALLMIND two-letter words are found', look('44-155 MR DELTA').stripped[0]?.words.includes('MIRROR'));
ok('lookup: IBIS letters that spell a word stay its own letters', look('IB-C03H: RAD 826').loose?.tokens.includes('RAD') && !look('IB-C03H: RAD 826').hits.length);
ok('lookup: Norse letters fold to the pool spelling', look('Sköll').hits[0]?.word === 'SKOLL');
ok('lookup: German umlauts fold to the pool spelling', look('Zaunkönig').hits[0]?.word === 'ZAUNKOENIG');

// ── Lexicon links ────────────────────────────────────────────
const ll = new URL(lexiconLink({ family: 'strange-flora', find: 'kiel' }, { via: 'agent' }));
ok('a lexicon link carries only what differs', ll.searchParams.get('fam') === 'strange-flora' && ll.searchParams.get('find') === 'kiel'
  && !ll.searchParams.has('sub') && ll.searchParams.get('g') === String(GRAMMAR) && ll.hash === '#lexicon', ll.href);
const bare = new URL(lexiconLink({}));
ok('an unfiltered lexicon link still resets the view it opens', bare.searchParams.get('sub') === 'all' && bare.searchParams.has('g'), bare.href);
v = visit(lexiconLink({}), { ...session(GRAMMAR), lexicon: { family: '', subject: 'plants', lang: 'la', find: 'kiel' } });
ok('an unfiltered lexicon link clears the viewer\'s saved filters', v.lexicon.subject === 'all' && v.lexicon.lang === 'all' && v.lexicon.find === '', JSON.stringify(v.lexicon));
v = visit(lexiconLink({ family: 'german-birds' }), session(0));
ok('a lexicon link keeps the note about an older saved session', /last session/.test(v.notice), v.notice);
v = visit(lexiconLink({ subject: 'plants', lang: 'la' }));
ok('a lexicon link reopens its filters', v.view === 'lexicon' && v.lexicon.subject === 'plants' && v.lexicon.lang === 'la' && v.notice === '', JSON.stringify(v.lexicon));
v = visit('?fam=nope&sub=plants&g=1#lexicon');
ok('an unknown family shows every family, as its notice says', v.lexicon.family === '' && v.lexicon.subject === 'all' && /word family Callsign does not have/.test(v.notice), v.notice);
v = visit('?fam=german-birds&sub=plants&g=1#lexicon');
ok('a picked family clears the filters', v.lexicon.family === 'german-birds' && v.lexicon.subject === 'all');
v = visit('?sub=nope&g=1#lexicon');
ok('an unknown subject falls back and says so', v.lexicon.subject === 'all' && /subject Callsign does not have/.test(v.notice), v.notice);

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
const quiet = r.stdout;
r = cli('garage', small.replace('g=1', 'g=7'));
ok('cli: garage warns about a link from another grammar', r.status === 0 && /grammar 7/.test(r.stderr) && r.stdout === quiet, `${r.status} ${r.stderr}`);
r = cli('garage', small.replace('&g=1', ''));
ok('cli: garage counts a link with no g as grammar 0', r.status === 0 && /grammar 0/.test(r.stderr), `${r.status} ${r.stderr}`);
const exported = join(tmpdir(), `callsign-test-${process.pid}.json`);
writeFileSync(exported, toJson('billing platform', garageRows(g), small));
r = cli('garage', exported);
rmSync(exported, { force: true });
ok('cli: garage reads the page\'s JSON download through its link', r.status === 0 && r.stdout === quiet, `${r.status} ${r.stderr}`);
r = cli('garage', 'not-a-build');
ok('cli: garage refuses junk with exit 2', r.status === 2, `${r.status} ${r.stderr}`);
r = cli('forge', 'word '.repeat(40).trim(), '--house', 'ibis', '--json');
const cut = (json(r) || [])[0];
ok('cli: a long description is cut to what the link carries, and said',
  r.status === 0 && /120 characters/.test(r.stderr) && cut
  && new URL(cut.link).searchParams.get('s').length === SEED_MAX
  && forge({ seed: new URL(cut.link).searchParams.get('s'), house: 'ibis', slot: 'core' }).designation === cut.designation, r.stderr);
r = cli('identity', 'x', '--house', 'ibis');
ok('cli: an option a command does not read exits 2', r.status === 2 && /frame-house/.test(r.stderr), `${r.status} ${r.stderr}`);
r = cli('forge', 'x', '--base', 'not a url');
ok('cli: a bad --base exits 2', r.status === 2 && /--base/.test(r.stderr), `${r.status} ${r.stderr}`);
r = cli('forge', 'x', '--house', 'ibis', '--roll', '999999', '--count', '2');
ok('cli: rolls past the link limit exit 2', r.status === 2, `${r.status} ${r.stderr}`);
r = cli('forge', 'x', '--house', '--json');
ok('cli: an option with no value does not swallow the next', r.status === 2 && /needs a value/.test(r.stderr), `${r.status} ${r.stderr}`);
r = cli('forge', '--', '-x', '--house', 'ibis');
ok('cli: -- ends the options', r.status === 0 && r.stdout.includes('s=-x+--house+ibis'), `${r.status} ${r.stderr}`);
r = spawnSync(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '--input-type=module', '-e',
  `import(${JSON.stringify(join(ROOT, 'tools', 'callsign.mjs'))}).then((m) => console.log(m.GRAMMAR))`], { encoding: 'utf8' });
ok('cli: importing it runs nothing and exports the grammar', r.status === 0 && r.stdout.trim() === String(GRAMMAR), `${r.status} ${r.stderr}`);
r = cli('houses', '--json');
const houses = json(r) || [];
ok('cli: houses lists every id and no in-game names', houses.length === HOUSES.length && !JSON.stringify(houses).includes('canon'), r.stdout.slice(0, 200));
r = cli('families', '--json');
const fams = json(r) || [];
ok('cli: families lists every family with its houses', fams.length === FAMILIES.length && fams.every((f) => f.houses.length && f.words > 0), r.stdout.slice(0, 200));
r = cli('lookup', 'PE-12SN', 'ARISTOLOCHIA', '--json');
const found = json(r) || {};
ok('cli: lookup names the house and the family', found.houses?.[0] === 'peristome' && found.words?.[0]?.family === 'strange-flora', r.stdout.slice(0, 300));
r = cli('lookup', 'HD-011', 'MELANDER');
ok('cli: lookup never echoes a real part', r.status === 0 && !r.stdout.includes('MELANDER') && /real part/.test(r.stdout), r.stdout);
r = cli('lookup', 'HD-011', 'MELANDER', '--json');
ok('cli: lookup --json never echoes a real part', r.status === 0 && !r.stdout.includes('MELANDER') && json(r)?.realPart === true, r.stdout);
r = cli('lookup');
ok('cli: lookup with nothing exits 2', r.status === 2);

console.log(`engine: ${pass} checks passed over ${plates} plates`);
if (failures.length) {
  console.log(`engine: ${failures.length} failed`);
  failures.slice(0, 25).forEach((f) => console.log(`  ${f}`));
  process.exit(1);
}
