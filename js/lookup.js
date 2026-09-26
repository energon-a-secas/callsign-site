// ── Lookup ───────────────────────────────────────────────────
// "Where is this name from?" Given a word or a whole designation, say which
// house's grammar it fits and which family each of its words comes from.
// DOM-free, so the Lexicon view and the CLI give the same answer.

import * as L from './lexicon.js';
import { HOUSES } from './houses.js';
import { FAMILIES, MARKS, LOOSE, familyOfPool } from './families.js';
import { disemvowel } from './acronym.js';
import { isCanon } from './canon.js';

/**
 * Uppercase letters and digits only, umlauts written out the way the German
 * pools write them (ZAUNKOENIG), and the Norse letters as they are romanised.
 */
export function fold(text) {
  return String(text ?? '')
    .replace(/[äÄ]/g, 'AE').replace(/[öÖ]/g, 'OE').replace(/[üÜ]/g, 'UE').replace(/ß/g, 'SS')
    .replace(/[æÆ]/g, 'AE').replace(/[øØ]/g, 'O').replace(/[þÞ]/g, 'TH').replace(/[ðÐ]/g, 'D')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

let index = null;
let byKey = null;
let stripped = null;
// House shapes are written for the engine's own output; a person may paste
// any case, so the lookup matches them case-insensitively.
let shapes = null;
const shapeOf = (h) => {
  shapes ??= new Map(HOUSES.map((x) => [x.id, new RegExp(x.shape.source, 'i')]));
  return shapes.get(h.id);
};

/** Every family word by its folded form, longest first so AETHER DRIFT wins over a shorter word. */
function entries() {
  if (index) return index;
  index = FAMILIES.flatMap((family) => family.pools.flatMap((pool) =>
    L[pool].map((word) => ({ key: fold(word), word, pool, family }))));
  index.sort((a, b) => b.key.length - a.key.length || a.key.localeCompare(b.key));
  byKey = new Map(index.map((e) => [e.key, e]));
  // ALLMIND stamps TERSE words with their vowels dropped, cut to four letters.
  stripped = new Map();
  for (const h of HOUSES) for (const d of h.draws || []) {
    if (!d.stripped) continue;
    for (const word of L[d.pool]) {
      const key = disemvowel(word).slice(0, d.stripped);
      if (!stripped.has(key)) stripped.set(key, []);
      stripped.get(key).push(word);
    }
  }
  return index;
}

/** Whole-word matches in folded text, longest first, never overlapping. */
function scan(folded) {
  const text = ` ${folded} `;
  const taken = new Uint8Array(text.length);
  const hits = [];
  for (const e of entries()) {
    const needle = ` ${e.key} `;
    for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + e.key.length + 1)) {
      const start = at + 1;
      const end = start + e.key.length;
      if (taken.subarray(start, end).some(Boolean)) continue;
      taken.fill(1, start, end);
      hits.push({ at: start, word: e.word, pool: e.pool, family: e.family });
    }
  }
  const left = [];
  for (const m of text.matchAll(/[A-Z0-9]+/g)) {
    if (taken[m.index]) continue;
    // Sköll folds to SKOELL for German's sake; the Norse pools write SKOLL.
    const plain = m[0].replace(/([AOU])E/g, '$1');
    const e = plain !== m[0] && byKey.get(plain);
    if (e) hits.push({ at: m.index, word: e.word, pool: e.pool, family: e.family });
    else left.push(m[0]);
  }
  return { hits: hits.sort((a, b) => a.at - b.at), left };
}

// Where the words sit in a designation: after the code, except Schneider,
// which writes the name first (NACHTREIHER/40E), and Melinite, all name.
const NAME_FIRST = new Set(['schneider']);
const ALL_NAME = new Set(['melinite']);
function namePart(house, text) {
  if (ALL_NAME.has(house.id)) return text;
  if (NAME_FIRST.has(house.id)) return text.split('/')[0];
  const space = text.indexOf(' ');
  return space === -1 ? '' : text.slice(space + 1);
}

const drawsPool = (house, pool) => (house.draws || []).some((d) => d.pool === pool);

/**
 * @returns {{ query: string, canon: boolean, houses: object[], hits: object[],
 *   stripped: object[], marks: object[], loose: object|null, misses: string[], suggestions: string[] }}
 */
/** True when the text is, or holds, a real part's designation, in any spelling. */
function holdsCanon(query) {
  if (isCanon(query)) return true;
  // The longest designation (DF-ET-09 TAI-YANG-SHOU) folds to six tokens.
  const tokens = fold(query).split(' ').filter(Boolean);
  return tokens.some((_, i) => [1, 2, 3, 4, 5, 6].some((n) => i + n <= tokens.length && isCanon(tokens.slice(i, i + n).join(' '))));
}

export function lookup(input) {
  const query = String(input ?? '').replace(/\s+/g, ' ').trim();
  const empty = { query, canon: false, houses: [], hits: [], stripped: [], marks: [], loose: null, misses: [], suggestions: [] };
  if (!query) return empty;
  // A real part's designation is never echoed back: Callsign never rolls it.
  if (holdsCanon(query)) return { ...empty, canon: true };

  entries();
  const whole = scan(fold(query));
  // A house counts when its shape fits the whole input and, if it stamps
  // words at all, at least one word found belongs to its pools, or it is a
  // house that can stamp your own letters instead (IBIS, ALLMIND).
  const houses = HOUSES.filter((h) => shapeOf(h).test(query)
    && (!h.draws.length || LOOSE[h.id] || whole.hits.some((x) => drawsPool(h, x.pool))));
  const house = houses.length === 1 ? houses[0] : null;

  // With one house, only its name counts: HD or JV in a code are not words.
  const found = house ? scan(fold(namePart(house, query))) : whole;
  let hits = found.hits;
  const loose = [];
  // A house with no words stamps no family word, even when its letters spell one (IBIS: RAD).
  if (house && !house.draws.length) { loose.push(...hits.map((x) => fold(x.word))); hits = []; }
  const marks = [];
  const strippedHits = [];
  const misses = [];
  for (const token of found.left) {
    const mark = house && MARKS.find((m) => m.house === house.id && m.token === token);
    if (mark) { marks.push(mark); continue; }
    // ALLMIND strips MIRROR to MR, so its words can be two letters long.
    if (house?.id === 'allmind' && /^[A-Z]{2,}$/.test(token) && disemvowel(token) === token && stripped.has(token)) {
      strippedHits.push({ token, words: stripped.get(token), family: familyOfPool('TERSE') });
      continue;
    }
    if (/\d/.test(token) || token.length < 3) continue;
    if (house && LOOSE[house.id]) loose.push(token);
    else misses.push(token);
  }

  let suggestions = [];
  const folded = fold(query);
  if (!hits.length && !strippedHits.length && !house && /^[A-Z0-9]{2,}$/.test(folded)) {
    suggestions = entries().filter((e) => e.key.startsWith(folded)).map((e) => e.word)
      .sort((a, b) => a.localeCompare(b)).slice(0, 8);
  }
  return {
    query, canon: false, houses, hits, stripped: strippedHits, marks,
    loose: house && LOOSE[house.id] && (loose.length || !house.draws.length) ? { house, copy: LOOSE[house.id], tokens: loose } : null,
    misses, suggestions,
  };
}
