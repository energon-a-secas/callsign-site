// ── Render ───────────────────────────────────────────────────
// View switching. Each view module owns its region, and nothing here rebuilds
// a region that can hold keyboard focus while someone types.

import { VIEWS } from './state.js';
import { houseOptions, slotOptions } from './templates.js';
import { renderForge } from './render-forge.js';
import { renderGarage } from './render-garage.js';
import { renderHouses } from './render-houses.js';
import { $ } from './utils.js';

/** Fill the static selects once. */
export function mount(s) {
  $('slotSel').innerHTML = slotOptions(s.forge.slot);
  $('houseSel').innerHTML = houseOptions(s.forge.house, { all: true });
  $('frameHouse').innerHTML = houseOptions(s.garage.frameHouse);
}

export function render(s) {
  for (const v of VIEWS) $(`view-${v}`).hidden = s.view !== v;
  document.querySelectorAll('[data-view]').forEach((b) => {
    if (b.dataset.view === s.view) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  if (s.view === 'forge') renderForge(s);
  if (s.view === 'garage') renderGarage(s, { full: true });
  if (s.view === 'houses') renderHouses(s);
}
