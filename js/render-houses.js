// ── Houses view ──────────────────────────────────────────────
// Each grammar on one card: what the code looks like, what the words are
// drawn from, a few in-game names for reference, and what it rolls here.

import { forge } from './forge.js';
import { HOUSES, GROUPS } from './houses.js';
import { $, escHtml } from './utils.js';

const code = (t) => `<code>${escHtml(t)}</code>`;

function houseCard(h, seed) {
  const part = forge({ seed, house: h.id, slot: 'core' });
  const weapon = forge({ seed, house: h.id, slot: h.signature || 'rifle' });
  return `<article class="house">
    <header class="house__head">
      <h4 class="house__name">${escHtml(h.full || h.name)}</h4>
      <span class="house__tag">${escHtml(h.tagline)}</span>
    </header>
    <p class="house__theme">${escHtml(h.theme)}</p>
    <dl class="house__facts">
      <dt>Grammar</dt><dd>${code(h.grammar)}</dd>
      <dt>In game</dt><dd>${h.canon.map(code).join(' ')}</dd>
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
