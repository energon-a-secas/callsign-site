// ── Seeded randomness ────────────────────────────────────────
// Every name is a pure function of its inputs: the same seed, house, slot
// and roll always give the same plate, so a shared link reproduces a build.

/** FNV-1a with a murmur finaliser: 32-bit, well mixed on short strings. */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** mulberry32 seeded from the joined parts. Returns a () => [0, 1) function. */
export function rngFrom(...parts) {
  let a = hash32(parts.join('|'));
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
export const int = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
export const pad = (n, width) => String(n).padStart(width, '0');

/** Pick `count` distinct items, order preserved from the draw. */
export function sample(rng, arr, count) {
  const pool = arr.slice();
  const out = [];
  while (out.length < count && pool.length) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}
