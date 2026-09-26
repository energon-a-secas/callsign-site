// ── Lexicon view ─────────────────────────────────────────────
// Every word family the houses draw from, grouped the way the Houses page
// groups houses, with subject and language filters and a lookup that says
// where any word or designation comes from. The filters are built once and
// only their state and counts change, so nothing rebuilds a region that holds
// focus while someone types.

import * as L from './lexicon.js';
import { GROUPS } from './houses.js';
import { PARTS } from './slots.js';
import {
  FAMILIES, SUBJECTS, LANGUAGES, POOL_LABELS, familyById, usedBy, groupOf,
  visibleFamilies, facetCounts, wordsOf, subjectLabel, language,
} from './families.js';
import { lookup } from './lookup.js';
import { $, escHtml } from './utils.js';

/** A family with more words than this shows a preview of each pool. */
export const LONG = 24;
export const PREVIEW = 8;
/** Families showing every word. Not saved: a reload starts from previews. */
export const expanded = new Set();

const fmt = (n) => n.toLocaleString('en');
const plural = (n, one, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;
export const joinAnd = (list, word = 'and') => (list.length < 2 ? list.join('')
  : `${list.slice(0, -1).join(', ')} ${word} ${list[list.length - 1]}`);

const SLOT_WORDS = { frame: 'frame parts', inner: 'inner parts', weapons: 'weapons' };
const slotText = (slots) => joinAnd(slots.map((x) => SLOT_WORDS[x] || PARTS.find((p) => p.id === x)?.label || x));

/** Which houses draw one pool, and for what: "Schneider for frame parts and weapons". */
export function poolUse(pool) {
  return FAMILIES.flatMap((f) => usedBy(f.id)).filter((u) => u.pool === pool)
    .map((u) => `${u.house.name} for ${slotText(u.slots)}${u.note ? ` (${u.note})` : ''}`);
}

// ── Filters ──────────────────────────────────────────────────

const facet = (name, id, label) => `<label class="facet__opt">
    <input class="facet__input" type="radio" name="${name}" value="${escHtml(id)}">
    <span class="chip facet__chip">${escHtml(label)} <span class="facet__count" data-count="${escHtml(id)}"></span><span class="sr-only facet__unit"> families</span></span>
  </label>`;

/** Build the filter chips once; renderLexicon only updates them. */
export function mountLexicon() {
  $('lexSubjects').innerHTML = facet('lexSubject', 'all', 'All') + SUBJECTS.map((x) => facet('lexSubject', x.id, x.label)).join('');
  $('lexLangs').innerHTML = facet('lexLang', 'all', 'All') + LANGUAGES.map((x) => facet('lexLang', x.id, x.label)).join('');
}

function syncFacets(lex) {
  const counts = facetCounts(lex);
  const sync = (box, current, table) => box.querySelectorAll('.facet__input').forEach((input) => {
    input.checked = input.value === current;
    const n = table[input.value] ?? 0;
    const chip = input.nextElementSibling;
    chip.querySelector('.facet__count').textContent = String(n);
    chip.querySelector('.facet__unit').textContent = n === 1 ? ' family' : ' families';
    chip.classList.toggle('facet__chip--empty', n === 0);
  });
  sync($('lexSubjects'), lex.family ? 'all' : lex.subject, counts.subjects);
  sync($('lexLangs'), lex.family ? 'all' : lex.lang, counts.langs);
}

// ── Family cards ─────────────────────────────────────────────

const languagesOf = (f) => f.languages.map((id) => language(id).label);

/** One family as a card. A pure string, so a test can check what a card may say. */
export function familyCard(f, { open = false, mark = '' } = {}) {
  const total = wordsOf(f);
  const preview = total > LONG && !open;
  const tag = f.languages.length === 1 ? language(f.languages[0]).tag : '';
  const uses = usedBy(f.id);
  const byHouse = [...new Map(uses.map((u) => [u.house.id, u.house])).values()];
  const pools = f.pools.map((pool) => {
    const words = L[pool];
    const shown = preview ? words.slice(0, PREVIEW) : words;
    const role = joinAnd([...new Set(uses.filter((u) => u.pool === pool).map((u) => slotText(u.slots)))]);
    return `<p class="family__pool">${escHtml(POOL_LABELS[pool] || pool)}<span>: ${escHtml(role)}</span></p>
      <ul class="family__words" id="fw-${f.id}-${pool}" role="list" aria-label="${escHtml(`${POOL_LABELS[pool] || pool} in ${f.label}`)}"${tag ? ` lang="${tag}"` : ''}>${
  shown.map((w) => `<li>${w === mark ? `<mark>${escHtml(w.toLowerCase())}</mark>` : escHtml(w.toLowerCase())}</li>`).join('')
}${preview ? `<li class="family__more" aria-hidden="true">+${words.length - shown.length}</li>` : ''}</ul>`;
  }).join('');
  const usedLines = byHouse.map((h) => {
    const mine = uses.filter((u) => u.house.id === h.id);
    const parts = mine.map((u) => `${slotText(u.slots)}${f.pools.length > 1 ? ` from ${POOL_LABELS[u.pool] || u.pool}` : ''}${u.note ? ` (${u.note})` : ''}`);
    return `<li><strong>${escHtml(h.name)}</strong>: ${escHtml(parts.join('; '))}</li>`;
  }).join('');
  const sources = f.sources.length
    ? `<dt>Sources</dt><dd><ul class="family__sources">${f.sources.map((x) => `<li><a href="${escHtml(x.url)}">${escHtml(x.label)}</a></li>`).join('')}</ul></dd>`
    : '';
  const lists = f.pools.map((p) => `fw-${f.id}-${p}`).join(' ');
  const more = total > LONG
    ? `<button type="button" class="btn btn--ghost btn--sm" data-family-more="${f.id}" aria-expanded="${open}" aria-controls="${lists}">${open ? 'Show fewer' : `Show all ${fmt(total)}`}</button>`
    : '';
  const forgeWith = byHouse.map((h) => `<button type="button" class="btn btn--secondary btn--sm" data-use-house="${escHtml(h.id)}">Forge with ${escHtml(h.name)}</button>`).join('');
  return `<article class="house family" id="family-${f.id}" data-family="${f.id}">
    <header class="house__head">
      <h4 class="house__name" id="fam-${f.id}-title" tabindex="-1">${escHtml(f.label)}</h4>
      <span class="house__tag">${escHtml(joinAnd(languagesOf(f)))}, ${plural(total, 'word')}</span>
    </header>
    <p class="house__theme">${escHtml(f.about)}</p>
    <dl class="house__facts">
      <dt>Subject</dt><dd>${escHtml(joinAnd(f.subjects.map(subjectLabel)))}</dd>
      <dt>Used by</dt><dd><ul class="family__uses">${usedLines}</ul></dd>
      ${sources}
    </dl>
    ${pools}
    <div class="family__actions">${more}${forgeWith}</div>
  </article>`;
}

function renderFamilies(lex, mark) {
  const picked = lex.family ? familyById(lex.family) : null;
  const shown = picked ? [picked] : visibleFamilies(lex);
  const words = shown.reduce((n, f) => n + wordsOf(f), 0);
  const all = FAMILIES.length;
  const filtered = !picked && (lex.subject !== 'all' || lex.lang !== 'all');
  $('lexCount').innerHTML = picked
    ? `Showing ${escHtml(picked.label)} only. <button type="button" class="linkbtn" data-lex-all>Show every family</button>`
    : filtered
      ? `Showing ${fmt(shown.length)} of ${all} families, ${plural(words, 'word')}. <button type="button" class="linkbtn" data-lex-clear>Clear filters</button>`
      : `${all} families, ${plural(words, 'word')}.`;
  if (!shown.length) {
    const active = [lex.subject !== 'all' && subjectLabel(lex.subject), lex.lang !== 'all' && language(lex.lang).label].filter(Boolean);
    $('familyGrid').innerHTML = `<div class="lexicon__empty"><p>No family is tagged ${escHtml(joinAnd(active))}.</p>
      <button type="button" class="btn btn--secondary btn--sm" data-lex-clear>Clear filters</button></div>`;
    return;
  }
  $('familyGrid').innerHTML = GROUPS.map((g) => {
    const mine = shown.filter((f) => groupOf(f.id)?.id === g.id);
    if (!mine.length) return '';
    return `<section class="house-group" aria-labelledby="lg-${g.id}">
      <div class="section__titles">
        <h3 class="house-group__title" id="lg-${g.id}">${escHtml(g.label)}</h3>
        ${g.original ? `<p class="section__lead">${escHtml(g.note)}</p>` : ''}
      </div>
      <div class="houses${picked ? ' houses--one' : ''}">${mine.map((f) => familyCard(f, { open: expanded.has(f.id), mark: mark?.family === f.id ? mark.word : '' })).join('')}</div>
    </section>`;
  }).join('');
}

// ── Lookup ───────────────────────────────────────────────────

/** The lookup's answer, and a one-line summary for the live region. */
export function lookupHtml(find) {
  const r = lookup(find);
  if (!r.query) {
    return { html: '<p class="slot-hint">Type a word, or paste a designation from any plate, to see which house stamped it and which family each word comes from.</p>', summary: '' };
  }
  if (r.canon) {
    const text = 'That is, or holds, a real part\'s designation from the game, so Callsign never rolls it.';
    return { html: `<div class="lookup-result"><p class="lookup-result__verdict">${text}</p></div>`, summary: text };
  }
  const [only] = r.houses;
  let verdict = '';
  if (r.houses.length === 1 && !only.draws.length && !r.loose) verdict = `${only.name} uses no words, so there is no family to show.`;
  else if (r.houses.length === 1) verdict = `Fits the ${escHtml(only.name)} grammar, <code>${escHtml(only.grammar)}</code>.`;
  else if (r.houses.length > 1) verdict = `The code fits ${escHtml(joinAnd(r.houses.map((h) => h.name), 'or'))}.`;
  else if (r.hits.length || r.stripped.length) verdict = 'No house stamps this exact shape, but these words come from Callsign\'s families.';
  const hits = [
    ...r.hits.map((x) => `<li class="hit">
      <strong class="hit__word">${escHtml(x.word)}</strong>
      <span class="hit__family">${escHtml(x.family.label)}</span>
      <span class="hit__meta">${escHtml([POOL_LABELS[x.pool] || x.pool, x.family.languages.length === 1 ? language(x.family.languages[0]).label : '', `drawn by ${joinAnd(poolUse(x.pool))}`].filter(Boolean).join(', '))}</span>
      <button type="button" class="btn btn--ghost btn--sm" data-show-family="${x.family.id}" data-mark="${escHtml(x.word)}">Show family</button>
    </li>`),
    ...r.stripped.map((x) => `<li class="hit">
      <strong class="hit__word">${escHtml(x.token)}</strong>
      <span class="hit__family">${escHtml(x.family.label)}</span>
      <span class="hit__meta">${escHtml(`from ${joinAnd(x.words, 'or')}, vowels dropped`)}</span>
      <button type="button" class="btn btn--ghost btn--sm" data-show-family="${x.family.id}" data-mark="${escHtml(x.words[0])}">Show family</button>
    </li>`),
  ].join('');
  const marks = r.marks.map((m) => `${escHtml(m.token)} is ${escHtml(only?.name || 'the house')}'s mark for ${escHtml(m.means)}.`).join(' ');
  const loose = r.loose ? `${r.loose.tokens.length ? `${escHtml(joinAnd(r.loose.tokens))}: ` : ''}${escHtml(r.loose.copy)}` : '';
  const misses = r.misses.length ? `No family holds ${escHtml(joinAnd(r.misses, 'or'))}.` : '';
  const suggest = r.suggestions.length
    ? `<div class="lookup-result__suggest"><p>Starts with ${escHtml(r.query.toUpperCase())}:</p><div class="chips">${r.suggestions.map((w) => `<button type="button" class="chip chip--button" data-lookup-word="${escHtml(w)}">${escHtml(w)}</button>`).join('')}</div></div>`
    : '';
  if (!verdict && !hits && !marks && !loose && !misses && !suggest) {
    const text = 'No family word or house matches that. Type two letters or more of a word, or a whole designation from a plate.';
    return { html: `<p class="slot-hint">${text}</p>`, summary: text };
  }
  const html = `<div class="lookup-result">
    ${verdict ? `<p class="lookup-result__verdict">${verdict}</p>` : ''}
    ${hits ? `<ul class="lookup-result__hits" role="list">${hits}</ul>` : ''}
    ${marks ? `<p class="lookup-result__marks">${marks}</p>` : ''}
    ${loose ? `<p class="lookup-result__marks">${loose}</p>` : ''}
    ${misses ? `<p class="lookup-result__miss">${misses}</p>` : ''}
    ${suggest}
  </div>`;
  const found = r.hits.length + r.stripped.length;
  const summary = [
    r.houses.length === 1 ? `Fits the ${only.name} grammar.` : '',
    found ? `${plural(found, 'word')} found in the families.` : 'No family word found.',
  ].filter(Boolean).join(' ');
  return { html, summary };
}

let statusTimer;
let lastCount = '';
let lastSummary = '';
/** Say only what changed, once the typing pauses. */
function announce(count, summary) {
  const parts = [count !== lastCount ? count : '', summary !== lastSummary ? summary : ''].filter(Boolean);
  lastCount = count;
  lastSummary = summary;
  if (!parts.length) return;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { $('lexStatus').textContent = parts.join(' '); }, 400);
}

/**
 * Update the view. The lookup input and the chips keep their nodes; only the
 * result, the count and the grid are rebuilt.
 * @param {object} s  app state
 * @param {{ mark?: { family: string, word: string } }} [opts]
 */
export function renderLexicon(s, { mark = null, quiet = false } = {}) {
  const lex = s.lexicon;
  const input = $('lookupInput');
  if (input.value !== lex.find) input.value = lex.find;
  syncFacets(lex);
  const { html, summary } = lookupHtml(lex.find);
  $('lookupResult').innerHTML = html;
  renderFamilies(lex, mark);
  // Show all and Show fewer say so through aria-expanded; nothing to announce.
  if (!quiet) announce($('lexCount').textContent.replace(/(Show every family|Clear filters)\s*$/, '').trim(), summary);
}
