// ── Houses view ──────────────────────────────────────────────
// Each grammar on one card: what the code looks like, which word families it
// draws from, a few in-game names for reference, and what it rolls here.
// Callsign's own houses have no in-game names and say so.

import { forge } from './forge.js';
import { HOUSES, GROUPS } from './houses.js';
import { familyOfPool, LOOSE } from './families.js';
import { $, escHtml } from './utils.js';

const code = (t) => `<code>${escHtml(t)}</code>`;

/** The families a house draws, once each, in the order its draws name them. */
const familiesOf = (h) => [...new Map(h.draws.map((d) => familyOfPool(d.pool)).filter(Boolean).map((f) => [f.id, f])).values()];

function houseCard(h, seed) {
  const part = forge({ seed, house: h.id, slot: 'core' });
  const weapon = forge({ seed, house: h.id, slot: h.signature || 'rifle' });
  const families = familiesOf(h);
  const words = families.length
    ? families.map((f) => `<button type="button" class="linkbtn" data-lexicon-family="${escHtml(f.id)}">${escHtml(f.label)}</button>`).join('')
    : `<span class="house__none">${LOOSE[h.id] ? 'none, it stamps your own letters' : 'none, the code is the whole name'}</span>`;
  const inGame = h.canon.length ? h.canon.map(code).join(' ') : '<span class="house__none">none, a Callsign original</span>';
  return `<article class="house">
    <header class="house__head">
      <h4 class="house__name">${escHtml(h.full || h.name)}</h4>
      <span class="house__tag">${escHtml(h.tagline)}</span>
    </header>
    <p class="house__theme">${escHtml(h.theme)}</p>
    <dl class="house__facts">
      <dt>Grammar</dt><dd>${code(h.grammar)}</dd>
      <dt>Words</dt><dd>${words}</dd>
      <dt>In game</dt><dd>${inGame}</dd>
      <dt>Rolled</dt><dd>${code(part.designation)} ${code(weapon.designation)}</dd>
    </dl>
    <button type="button" class="btn btn--secondary btn--sm" data-use-house="${escHtml(h.id)}">Forge with ${escHtml(h.name)}</button>
  </article>`;
}

export function renderHouses(s) {
  const seed = s.forge.seed.trim();
  $('housesSeed').textContent = seed ? `"${seed}"` : 'an empty seed';
  $('houseGrid').innerHTML = GROUPS.map((g) => `<section class="house-group" aria-labelledby="hg-${g.id}">
    <div class="section__titles">
      <h3 class="house-group__title" id="hg-${g.id}">${escHtml(g.label)}</h3>
      <p class="section__lead">${escHtml(g.note)}</p>
    </div>
    <div class="houses">${HOUSES.filter((h) => h.group === g.id).map((h) => houseCard(h, seed)).join('')}</div>
  </section>`).join('');
}
