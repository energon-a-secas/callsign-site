// ── Links ────────────────────────────────────────────────────
// The public contract: the URLs that reproduce one plate or a whole build.
// DOM-free, so the page, the CLI and the skill all build the same links, and
// llms.txt documents exactly what these functions write.

import { GRAMMAR } from './forge.js';

export const SITE = 'https://callsign.neorgon.com/';

/** GitHub Pages answers 414 once a query reaches 8,192 characters; stay clear of it. */
export const MAX_LINK = 8000;

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
