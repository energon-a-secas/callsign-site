// ── State ────────────────────────────────────────────────────
// One mutable object shared by every module. localStorage keeps the last
// session and the hangar; the URL carries whatever is being shared. The URL
// formats themselves live in links.js, which the CLI shares.

import { PARTS, WEAPONS, MOUNTS } from './slots.js';
import { HOUSES } from './houses.js';
import { GRAMMAR } from './forge.js';
import { decode, forgeLink, garageLink, lexiconLink, linkGrammar, clip, LEXICON_KEYS, SEED_MAX, ROLL_MAX } from './links.js';
import { SUBJECTS, LANGUAGES, hasFamily } from './families.js';

const STORAGE_KEY = 'callsign:v1';
export const VIEWS = ['forge', 'garage', 'houses', 'lexicon'];
const HANGAR_MAX = 40;
const NOTE_MAX = SEED_MAX;

const houseOk = (id, fallback) => (HOUSES.some((h) => h.id === id) ? id : fallback);
const partIds = new Set(PARTS.map((p) => p.id));
const weaponIds = new Set(WEAPONS.map((w) => w.id));

// Four mounts, one of each kind of job, so a fresh build already reads as a system.
const WEAPON_DEFAULTS = [
  { cls: 'rifle', house: 'balam', on: true },
  { cls: 'shield', house: 'takigawa', on: true },
  { cls: 'missile', house: 'furlong', on: false },
  { cls: 'drone', house: 'vcpl', on: false },
];

export function blankGarage() {
  return {
    name: '',
    matched: true,
    frameHouse: 'baws',
    frameRoll: 0,
    parts: PARTS.map((p) => ({
      id: p.id, on: p.group === 'frame' || p.id === 'generator',
      house: p.group === 'frame' ? 'baws' : 'ibis', roll: 0, note: '', key: '', locked: false,
    })),
    weapons: MOUNTS.map((m, i) => ({ mount: m.id, ...WEAPON_DEFAULTS[i], roll: 0, note: '', key: '', locked: false })),
  };
}

export const state = {
  view: 'forge',
  forge: { seed: '', house: 'all', slot: 'core', roll: 0 },
  // One family picked, or the filters that narrow the list, and a lookup.
  lexicon: { family: '', subject: 'all', lang: 'all', find: '' },
  garage: blankGarage(),
  hangar: [],
  // What a shared link could not reproduce, said once above the views, and
  // text to copy by hand when the browser blocked a copy.
  notice: '',
  noticeText: '',
};

// The grammar the stored session was saved under, so a build stashed from it keeps that mark.
let savedGrammar = GRAMMAR;

const str = (v, max = NOTE_MAX) => (typeof v === 'string' ? clip(v, max) : '');
const roll = (v) => (Number.isInteger(v) && v >= 0 && v <= ROLL_MAX ? v : 0);

/** A garage holding nothing typed: starting over loses nothing. */
export const isBlank = (g) => !g.name.trim() && g.parts.every((p) => !p.note) && g.weapons.every((w) => !w.note);

/** The shape of a garage object, as a link or a file carries it. Anything else is not a build. */
export const isBuild = (raw) => Boolean(raw) && typeof raw === 'object'
  && (Array.isArray(raw.parts) || Array.isArray(raw.weapons));

/** Accept anything shaped like a garage, keep only what is valid. */
export function sanitizeGarage(g) {
  if (!g || typeof g !== 'object') return null;
  const base = blankGarage();
  const parts = Array.isArray(g.parts) ? g.parts : [];
  const weapons = Array.isArray(g.weapons) ? g.weapons : [];
  return {
    name: str(g.name, 80),
    matched: g.matched !== false,
    frameHouse: houseOk(g.frameHouse, base.frameHouse),
    frameRoll: roll(g.frameRoll),
    parts: base.parts.map((d) => {
      const p = parts.find((x) => x && x.id === d.id && partIds.has(x.id)) || {};
      return { ...d, on: typeof p.on === 'boolean' ? p.on : d.on, house: houseOk(p.house, d.house), roll: roll(p.roll),
        note: str(p.note), key: str(p.key), locked: p.locked === true };
    }),
    weapons: base.weapons.map((d) => {
      const w = weapons.find((x) => x && x.mount === d.mount) || {};
      return { ...d, cls: weaponIds.has(w.cls) ? w.cls : d.cls, on: typeof w.on === 'boolean' ? w.on : d.on,
        house: houseOk(w.house, d.house), roll: roll(w.roll), note: str(w.note), key: str(w.key), locked: w.locked === true };
    }),
  };
}

function sanitizeForge(f, base) {
  if (!f || typeof f !== 'object') return base;
  const slotOk = partIds.has(f.slot) || weaponIds.has(f.slot);
  return {
    seed: str(f.seed),
    house: f.house === 'all' ? 'all' : houseOk(f.house, base.house),
    slot: slotOk ? f.slot : base.slot,
    roll: roll(f.roll),
  };
}

const LEXICON_DEFAULTS = { family: '', subject: 'all', lang: 'all', find: '' };
const subjectOk = (id) => id === 'all' || SUBJECTS.some((x) => x.id === id);
const langOk = (id) => id === 'all' || LANGUAGES.some((x) => x.id === id);

/**
 * A family, even an unknown one, clears the filters: fam= names one family
 * "instead" of filtering, so the page never shows a family the filters hide.
 */
function sanitizeLexicon(l, base) {
  if (!l || typeof l !== 'object') return base;
  const named = typeof l.family === 'string' && l.family !== '';
  return {
    family: hasFamily(l.family) ? l.family : '',
    subject: !named && subjectOk(l.subject) ? l.subject : 'all',
    lang: !named && langOk(l.lang) ? l.lang : 'all',
    find: str(l.find),
  };
}

/** Load the last session and the hangar from localStorage. */
export function loadSaved(s) {
  savedGrammar = GRAMMAR;
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw) return;
    if (VIEWS.includes(raw.view)) s.view = raw.view;
    s.forge = sanitizeForge(raw.forge, s.forge);
    s.lexicon = sanitizeLexicon(raw.lexicon, s.lexicon);
    s.garage = sanitizeGarage(raw.garage) || s.garage;
    // A session saved before grammars were numbered counts as grammar 0.
    savedGrammar = Number.isInteger(raw.grammar) ? raw.grammar : 0;
    if (savedGrammar !== GRAMMAR && (s.forge.seed.trim() || !isBlank(s.garage))) {
      s.notice = `Your last session was saved under ${savedGrammar ? `grammar ${savedGrammar}` : 'an earlier grammar'}, and this page runs grammar ${GRAMMAR}, so its names may have changed.`;
    }
    if (Array.isArray(raw.hangar)) {
      s.hangar = raw.hangar
        .map((b) => ({
          id: str(b?.id, 40),
          savedAt: Number(b?.savedAt) || 0,
          // Builds saved before grammars were numbered count as grammar 0.
          grammar: Number.isInteger(b?.grammar) ? b.grammar : 0,
          garage: sanitizeGarage(b?.garage),
        }))
        .filter((b) => b.id && b.garage)
        .slice(0, HANGAR_MAX);
    }
  } catch { /* unreadable storage: start clean */ }
}

/** Persist the session. */
export function save(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      grammar: GRAMMAR, view: s.view, forge: s.forge, lexicon: s.lexicon, garage: s.garage, hangar: s.hangar,
    }));
  } catch { /* quota exceeded or storage blocked */ }
}

/** Keep a copy of the current build in the hangar, newest first. */
export function stash(s, grammar = GRAMMAR) {
  const id = `b${Date.now().toString(36)}`;
  s.hangar = [{ id, savedAt: Date.now(), grammar, garage: structuredClone(s.garage) }, ...s.hangar]
    .slice(0, HANGAR_MAX);
  return id;
}

// ── URL ──────────────────────────────────────────────────────

const FORGE_DEFAULTS = { seed: '', house: 'all', slot: 'core', roll: 0 };
const quote = (v) => `"${String(v).slice(0, 24)}"`;

/** Apply a shared link on top of the saved session. The link wins, and what it could not carry is said. */
export function readUrl(s) {
  const q = new URLSearchParams(location.search);
  const notes = [];
  const g = linkGrammar(q);
  const lexiconOnly = LEXICON_KEYS.some((k) => q.has(k)) && !['s', 'h', 'p', 'r', 'b'].some((k) => q.has(k));
  if (g !== null && g !== String(GRAMMAR)) {
    const made = q.has('g') ? `was made with Callsign grammar ${quote(g)}` : 'was made before Callsign numbered its grammars';
    const what = lexiconOnly ? 'the word families below may differ from the ones that were shared' : 'the names below may differ from the ones that were shared';
    notes.push(`This link ${made}, and this page runs grammar ${GRAMMAR}, so ${what}.`);
  }
  if (q.has('b')) {
    const raw = decode(q.get('b'));
    if (isBuild(raw)) {
      const garage = sanitizeGarage(raw);
      // The link replaces the working build, so the viewer's own goes to the hangar first.
      if (!isBlank(s.garage) && JSON.stringify(s.garage) !== JSON.stringify(garage)) {
        stash(s, savedGrammar);
        notes.push('Your own build was kept in the hangar.');
      }
      s.garage = garage;
      s.view = 'garage';
    } else {
      notes.push('The build in this link could not be read, so your own garage is shown instead. Ask for the link again: chat apps sometimes cut long ones.');
    }
  }
  if (['s', 'h', 'p', 'r'].some((k) => q.has(k))) {
    const house = q.get('h') ?? FORGE_DEFAULTS.house;
    const slotId = q.get('p') ?? FORGE_DEFAULTS.slot;
    const seed = q.get('s') ?? '';
    const r = q.get('r');
    // Unknown ids fall back to the defaults, never to this viewer's saved
    // session, so one link shows the same page to everyone who opens it.
    s.forge = sanitizeForge({ seed, house, slot: slotId, roll: r === null ? 0 : Number(r) }, FORGE_DEFAULTS);
    if (s.forge.house !== house) notes.push(`The link names a house Callsign does not have (${quote(house)}), so every house is shown.`);
    if (s.forge.slot !== slotId) notes.push(`The link names a slot Callsign does not have (${quote(slotId)}), so Core is shown.`);
    if (r !== null && s.forge.roll !== Number(r)) notes.push(`The link's roll (${quote(r)}) is not a whole number from 0 to ${ROLL_MAX}, so roll 0 is shown.`);
    if (seed.length > SEED_MAX) notes.push(`The link's words run past ${SEED_MAX} characters, so only the first ${SEED_MAX} are used.`);
    s.view = 'forge';
  }
  if (LEXICON_KEYS.some((k) => q.has(k))) {
    const fam = q.get('fam');
    const sub = q.get('sub');
    const lang = q.get('lang');
    const find = q.get('find') ?? '';
    // Unknown ids fall back to every family, never to this viewer's saved filters.
    s.lexicon = sanitizeLexicon({ family: fam ?? '', subject: sub ?? 'all', lang: lang ?? 'all', find }, LEXICON_DEFAULTS);
    if (fam !== null && s.lexicon.family !== fam) notes.push(`The link names a word family Callsign does not have (${quote(fam)}), so every family is shown.`);
    if (sub !== null && fam === null && s.lexicon.subject !== sub) notes.push(`The link names a subject Callsign does not have (${quote(sub)}), so every subject is shown.`);
    if (lang !== null && fam === null && s.lexicon.lang !== lang) notes.push(`The link names a language Callsign does not have (${quote(lang)}), so every language is shown.`);
    if (find.length > SEED_MAX) notes.push(`The link's lookup runs past ${SEED_MAX} characters, so only the first ${SEED_MAX} are used.`);
    s.view = 'lexicon';
  }
  const hash = location.hash.slice(1);
  if (VIEWS.includes(hash)) s.view = hash;
  // A link that names a plate or a build decides the page, so a note about the
  // saved session would describe what is not shown. A Lexicon link replaces
  // no build, so that note still stands.
  s.notice = [g === null || lexiconOnly ? s.notice : '', ...notes].filter(Boolean).join(' ');
}

/** A link that reproduces what is on screen, or null when a build is too big for one. */
export function shareUrl(s, { via = '' } = {}) {
  const base = location.origin + location.pathname;
  if (s.view === 'garage') return garageLink(s.garage, { base, via });
  if (s.view === 'forge') return forgeLink(s.forge, { base, via });
  if (s.view === 'lexicon') return lexiconLink(s.lexicon, { base, via });
  const u = new URL(base);
  if (via) u.searchParams.set('via', via);
  u.hash = s.view;
  return u.toString();
}
