// ── Acronyms ─────────────────────────────────────────────────
// Three letters is the target, four is the variant. Letters come from the
// words the user typed when there are any, so RAD can still mean something;
// otherwise from the generated name, the way ALLMIND strips a word to JVLN.

import { pick } from './rng.js';

const STOP = new Set(('a an the and or of for to in on at by with from into via ' +
  'my our your its is are be that this it as per new').split(' '));

// Words that describe the kind of thing rather than the thing. Used only when
// nothing better is left, so "billing service" leans on "billing".
const WEAK = new Set('app site tool service project system platform api'.split(' '));

// Letter runs nobody wants on a repo, a Slack channel or a badge.
const BLOCKED = new Set(('ASS FUK FUC FCK SEX CUM FAG NIG KKK NAZ TIT DIK DIC COC JIZ PIS POO WTF STD ' +
  'ANAL ANUS CUNT DICK COCK FUCK SHIT PISS SLUT TITS NAZI PORN JIZZ TWAT WANK RAPE HOES DAMN KILL').split(' '));

const VOWELS = /[AEIOU]/;

/** Split free text (including camelCase and kebab-case) into lowercase words. */
export function words(text) {
  return String(text || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !/^\d+$/.test(w) && !STOP.has(w));
}

/** "JAVELIN" -> "JVLN": keep the first letter, drop later vowels and repeats. */
export function disemvowel(word) {
  const up = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (!up) return '';
  let out = up[0];
  for (const ch of up.slice(1)) {
    if (!/[AEIOUY]/.test(ch) && ch !== out[out.length - 1]) out += ch;
  }
  return out;
}

/** A 3 or 4 letter run typed on its own is taken as the acronym itself. */
export function fixedAcronym(text) {
  const t = String(text || '').trim();
  return /^[A-Za-z]{3,4}$/.test(t) && t === t.toUpperCase() ? t : '';
}

const initial = (w) => w[0].toUpperCase();
const consonants = (w) => disemvowel(w).slice(1);

function clean(list, len) {
  const seen = new Set();
  return list
    .map((s) => s.toUpperCase().replace(/[^A-Z]/g, ''))
    .filter((s) => s.length === len && !BLOCKED.has(s) && !/^(.)\1+$/.test(s))
    .filter((s) => (seen.has(s) ? false : seen.add(s)));
}

/** The words an acronym is built from: the descriptive ones when there are any. */
export function usedWords(list, len = 3) {
  const strong = list.filter((w) => !WEAK.has(w));
  return (strong.length ? strong : list).slice(0, len);
}

/** Candidates from a word list, most meaningful first. */
function fromWords(list, len) {
  const strong = list.filter((w) => !WEAK.has(w));
  const ws = strong.length ? strong : list;
  const out = [];
  if (!ws.length) return out;
  const inits = ws.map(initial).join('');
  if (ws.length >= len) {
    out.push(inits.slice(0, len));
    out.push(inits.slice(0, len - 1) + inits[inits.length - 1]);
  }
  if (ws.length === len - 1) {
    const first = ws[0];
    const last = ws[ws.length - 1];
    const clipped = initial(first) + (consonants(first)[0] || '') + inits.slice(1); // billing dashboard -> BLD
    const extended = inits + (consonants(last)[0] || last[1] || '');               // RAD -> RADM
    out.push(...(len === 3 ? [clipped, extended] : [extended, clipped]));
  }
  if (ws.length === len - 2 && ws.length >= 2) {
    out.push(ws.map((w) => initial(w) + (consonants(w)[0] || '')).join(''));
    out.push(inits + consonants(ws[ws.length - 1]).slice(0, 2));
  }
  if (ws.length === 1 || out.length === 0) {
    const w = ws[0];
    const clip = disemvowel(w).slice(0, len);   // auth -> ATH, the way people shorten words in code
    const cut = w.slice(0, len);                // user -> USER, better at four letters
    const ends = initial(w) + consonants(w).slice(0, len - 2) + w[w.length - 1];
    out.push(...(len === 3 ? [clip, cut, ends] : [cut, clip, ends]));
  }
  return out;
}

/** For a generated name, prefer letters you can say out loud (BON over BNC). */
function rank(list, sayable) {
  if (!sayable) return list;
  return list
    .map((s, i) => ({ s, score: (VOWELS.test(s.slice(1)) ? 2 : 0) - i * 0.9 }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s);
}

/**
 * Build the acronym set for a plate.
 * @param {object} o
 * @param {string} o.seed        what the user typed
 * @param {string} o.name        the generated proper name, fallback source
 * @param {string[]} o.roles     role words for the slot, used for the 4th letter
 * @param {() => number} o.rng
 */
export function acronyms({ seed, name, roles, rng }) {
  const fixed = fixedAcronym(seed);
  if (fixed) {
    const base = fixed.slice(0, 3);
    const four = fixed.length === 4 ? [fixed] : roles.map((r) => base + r[0]);
    return { source: 'fixed', three: [base], four: clean(four, 4).slice(0, 3) };
  }
  const typed = words(seed);
  const source = typed.length ? 'seed' : 'name';
  const list = typed.length ? typed : words(name);
  let three = rank(clean(fromWords(list, 3), 3), source === 'name');
  let four = clean(fromWords(list, 4), 4);
  // A name with no letters in it (RaD's 24680) falls back to the slot's roles.
  if (!three.length) {
    three = clean([disemvowel(name || '').padEnd(3, 'X'), ...roles.map((r) => disemvowel(r).slice(0, 3)), 'XRV'], 3);
  }
  // A 3-letter pick plus a role word always yields a readable 4-letter variant.
  four = clean([...four, ...roles.map((r) => three[0] + r[0])], 4);
  if (!four.length) four = [three[0] + pick(rng, ['X', 'R', 'V'])];
  return { source, three: three.slice(0, 3), four: four.slice(0, 3) };
}
