// ── Links ────────────────────────────────────────────────────
// The public contract: the URLs that reproduce one plate or a whole build.
// DOM-free, so the page, the CLI and the skill all build the same links, and
// llms.txt documents exactly what these functions write.

import { GRAMMAR } from './forge.js';

export const SITE = 'https://callsign.neorgon.com/';

/** GitHub Pages answers 414 once a query reaches 8,192 characters; stay clear of it. */
export const MAX_LINK = 8000;

/** The most a link carries of one description or note; the page's inputs stop there too. */
export const SEED_MAX = 120;

/** The highest roll a link carries. The page reads anything else as roll 0. */
export const ROLL_MAX = 999999;

/** Cut text the way the page reads it, never leaving half of a surrogate pair. */
export const clip = (text, max = SEED_MAX) => String(text).slice(0, max).replace(/[\uD800-\uDBFF]$/, '');

/**
 * The grammar a link was made under, as the text of its g. A link that carries
 * a plate or a build but no g comes from before grammars were numbered, so it
 * counts as grammar 0. Null when the link carries nothing to name.
 */
export function linkGrammar(query) {
  const g = query.get('g');
  if (g !== null) return g;
  return ['s', 'h', 'p', 'r', 'b'].some((k) => query.has(k)) ? '0' : null;
}

/** JSON as base64url over its UTF-8 bytes, padding stripped. */
export function encode(obj) {
  let bin = '';
  for (const b of new TextEncoder().encode(JSON.stringify(obj))) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The inverse of encode(), or null for anything that is not one of its outputs. */
export function decode(text) {
  try {
    const bin = atob(String(text).replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch { return null; }
}

/**
 * A forge page. With a single house it shows six plates from `roll` on, so the
 * first plate is the one the link names; with house "all" it shows one plate
 * per house at `roll`.
 */
export function forgeLink({ seed = '', house = 'all', slot = 'core', roll = 0 }, { base = SITE, via = '' } = {}) {
  const u = new URL(base);
  if (via) u.searchParams.set('via', via);
  if (seed) u.searchParams.set('s', seed);
  u.searchParams.set('h', house);
  u.searchParams.set('p', slot);
  if (roll) u.searchParams.set('r', String(roll));
  u.searchParams.set('g', String(GRAMMAR));
  u.hash = 'forge';
  return u.toString();
}

/** The keys a Lexicon link carries. None collides with a forge or garage key. */
export const LEXICON_KEYS = ['fam', 'sub', 'lang', 'find'];

/**
 * The Lexicon view: one family (fam), or the families a subject and a
 * language filter leave (sub, lang), and optionally a lookup (find). Only
 * what differs from the defaults is written, and at least one key always is.
 */
export function lexiconLink({ family = '', subject = 'all', lang = 'all', find = '' } = {}, { base = SITE, via = '' } = {}) {
  const u = new URL(base);
  if (via) u.searchParams.set('via', via);
  if (family) u.searchParams.set('fam', family);
  else {
    if (subject && subject !== 'all') u.searchParams.set('sub', subject);
    if (lang && lang !== 'all') u.searchParams.set('lang', lang);
  }
  if (find) u.searchParams.set('find', clip(find));
  // An unfiltered view still writes one key, so the link resets whatever the
  // person opening it had saved instead of showing their own filters.
  if (!LEXICON_KEYS.some((k) => u.searchParams.has(k))) u.searchParams.set('sub', 'all');
  u.searchParams.set('g', String(GRAMMAR));
  u.hash = 'lexicon';
  return u.toString();
}

/** A whole build, or null when it would be too long for any browser to open. */
export function garageLink(garage, { base = SITE, via = '' } = {}) {
  const u = new URL(base);
  if (via) u.searchParams.set('via', via);
  u.searchParams.set('b', encode(garage));
  u.searchParams.set('g', String(GRAMMAR));
  u.hash = 'garage';
  const link = u.toString();
  return link.length > MAX_LINK ? null : link;
}
