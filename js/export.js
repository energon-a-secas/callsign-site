// ── Export ───────────────────────────────────────────────────
// A build leaves as Markdown (for a README or a planning doc), JSON (for a
// script) or aligned text (for a chat message). Rows come from garageRows().

const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

/** @param {string} title @param {Array} rows */
export function toMarkdown(title, rows) {
  const lines = [
    `## ${cell(title) || 'Untitled build'}`,
    '',
    '| Slot | What it is | Designation | Callsign | 3 | 4 | Reads as |',
    '|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${cell(r.label)} | ${cell(r.note || r.role)} | \`${cell(r.plate.designation)}\` | ` +
      `**${cell(r.plate.callsign)}** | ${r.plate.acronym.three[0] || 'none'} | ` +
      `${r.plate.acronym.four[0] || 'none'} | ${cell(r.plate.expansion) || 'none'} |`),
    '',
    '_Named with [Callsign](https://callsign.neorgon.com/)_',
    '',
  ];
  return lines.join('\n');
}

export function toJson(title, rows, link) {
  return JSON.stringify({
    build: title || 'Untitled build',
    link,
    slots: rows.map((r) => ({
      slot: r.label,
      what: r.note || r.role,
      house: r.plate.houseName,
      designation: r.plate.designation,
      callsign: r.plate.callsign,
      acronyms: { three: r.plate.acronym.three, four: r.plate.acronym.four },
      readsAs: r.plate.expansion || null,
    })),
  }, null, 2);
}

export function toText(title, rows) {
  const w1 = Math.max(4, ...rows.map((r) => r.label.length));
  const w2 = Math.max(11, ...rows.map((r) => r.plate.designation.length));
  const out = rows.map((r) =>
    `${r.label.toUpperCase().padEnd(w1)}  ${r.plate.designation.padEnd(w2)}  ` +
    `${r.plate.acronym.three[0] || ''}${r.note ? `  (${r.note})` : ''}`);
  return [`${(title || 'Untitled build').toUpperCase()}`, ...out].join('\n');
}
