// ── Entry point ──────────────────────────────────────────────
// Wires the modules together. Keep this file under 50 lines.

import { state, loadSaved, readUrl, save } from './state.js';
import { mount, render } from './render.js';
import { bindEvents } from './events.js';

function init() {
  loadSaved(state);
  if (location.search) {
    readUrl(state);
    save(state);
    // A shared link is applied once. Strip it so a reload keeps later edits.
    history.replaceState(null, '', `${location.pathname}#${state.view}`);
  } else {
    readUrl(state);
  }
  mount(state);
  render(state);
  bindEvents();
}

init();
