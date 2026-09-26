// ── Export ───────────────────────────────────────────────────
// Everything that leaves the page as text. A build goes out as Markdown (a
// README or a planning doc), JSON (a script) or plain text (a chat message);
// one plate goes out as a README badge, a chat line or a wiki line. DOM-free,
// so the CLI prints exactly what the page copies.

import { GRAMMAR } from './forge.js';
import { SITE } from './links.js';

const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

/** @param {string} title @param {Array} rows @param {string} [link] */
export function toMarkdown(title, rows, link = '') {
  const lines = [
    `## ${cell(title) || 'Untitled build'}`,
    '',
    '| Slot | What it is | Designation | Callsign | 3 | 4 | Reads as |',
    '|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${cell(r.label)} | ${cell(r.note || r.role)} | \`${cell(r.plate.designation)}\` | ` +
      `**${cell(r.plate.callsign)}** | ${r.plate.acronym.three[0] || 'none'} | ` +
      `${r.plate.acronym.four[0] || 'none'} | ${cell(r.plate.expansion) || 'none'} |`),
    '',
    `_Named with [Callsign](${link || SITE}), grammar ${GRAMMAR}_`,
    '',
  ];
  return lines.join('\n');
}

export function toJson(title, rows, link) {
  return JSON.stringify({
    build: title || 'Untitled build',
    grammar: GRAMMAR,
    link: link || null,
    slots: rows.map((r) => ({
      slot: r.label,
      what: r.note || r.role,
      house: r.plate.houseName,
      houseId: r.plate.house,
      designation: r.plate.designation,
      callsign: r.plate.callsign,
      acronyms: { three: r.plate.acronym.three, four: r.plate.acronym.four },
      readsAs: r.plate.expansion || null,
    })),
  }, null, 2);
}

/** Rows as aligned plain text; toChat adds what makes it reproducible. */
export function toText(title, rows) {
  const w1 = Math.max(4, ...rows.map((r) => r.label.length));
  const w2 = Math.max(11, ...rows.map((r) => r.plate.designation.length));
  const out = rows.map((r) =>
    `${r.label.toUpperCase().padEnd(w1)}  ${r.plate.designation.padEnd(w2)}  ` +
    `${r.plate.acronym.three[0] || ''}${r.note ? `  (${r.note})` : ''}`);
  return [`${(title || 'Untitled build').toUpperCase()}`, ...out].join('\n');
}

/** A build for a chat message: the link when there is one, else the grammar that names it. */
export function toChat(title, rows, link = '') {
  return `${toText(title, rows)}\n${link || `Named with Callsign, grammar ${GRAMMAR}`}`;
}

// ── One plate ────────────────────────────────────────────────

/**
 * Text for a shields.io static badge path: dashes and underscores doubled,
 * whitespace as underscores, everything else percent-encoded, including the
 * characters that would end a Markdown link early.
 */
export function badgeText(text) {
  return encodeURIComponent(String(text).replace(/-/g, '--').replace(/_/g, '__').replace(/\s+/g, '_'))
    .replace(/[()'*!~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export const BADGE_COLOR = 'ff6f59';

export const badgeImage = (p) => `https://img.shields.io/badge/callsign-${badgeText(p.designation)}-${BADGE_COLOR}`;

/** Markdown GitHub renders as an image: a README runs no iframe and no script. */
export function badgeMarkdown(p, link = '') {
  const alt = `callsign: ${p.designation}`.replace(/[[\]]/g, '');
  const img = `![${alt}](${badgeImage(p)})`;
  return link ? `[${img}](${link})` : img;
}

/**
 * A build's badges as one Markdown block. Every badge points at one reference
 * link, so a build URL that runs to a couple of kilobytes appears once.
 */
export function buildBadges(rows, link = '') {
  const images = rows.map((r) => {
    const img = `![${`callsign: ${r.plate.designation}`.replace(/[[\]]/g, '')}](${badgeImage(r.plate)})`;
    return link ? `[${img}][callsign-build]` : img;
  });
  // A build too big for a link still records the grammar that names it, where the README hides it.
  return link ? `${images.join('\n')}\n\n[callsign-build]: ${link}` : `${images.join('\n')}\n\n<!-- Callsign grammar ${GRAMMAR} -->`;
}

const nameOf = (p) => (p.weapon ? p.designation : `${p.acronym.three[0]} (${p.designation})`);
const readsOf = (p) => (p.expansion ? `, reads as ${p.expansion}` : '');

/** Plain text for Slack or Discord, which unfurl every Callsign link as the same card. */
export function chatLine(p, link = '') {
  return `${nameOf(p)}, ${p.houseName} ${p.slotLabel}${readsOf(p)}${link ? `: ${link}` : ''}`;
}

/** One Markdown line for a wiki or a planning doc. */
export function wikiLine(p, link = '') {
  const name = p.weapon ? `**${p.designation}**` : `**${p.acronym.three[0]}** \`${p.designation}\``;
  return `${name}: ${p.houseName} ${p.slotLabel}${readsOf(p)}${link ? ` ([Callsign](${link}))` : ''}`;
}
