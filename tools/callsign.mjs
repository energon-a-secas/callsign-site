#!/usr/bin/env node
// ── Callsign CLI ─────────────────────────────────────────────
// The page's own engine from a terminal: the same modules, so the same names,
// and no network. It can also be imported: main(argv, io) returns the exit
// code, which is how the neorgon-forge `callsign` skill runs it.
//
//   forge <words...>     [--house <id>|all] [--slot <id>] [--roll <n>] [--count <n>]
//   identity <name...>   [--frame-house <id>] [--roll <n>]
//   garage <file|link>   a build saved as JSON, a Callsign link, or its ?b= payload
//   link <words...>      [--house <id>|all] [--slot <id>] [--roll <n>]
//   houses | slots       the ids every other command accepts
//
// Output is readable text by default; --json for scripts (forge always prints
// an array), --md for Markdown, --badge for README badges. --via <name> tags
// the links so arrivals are counted. Exit: 0 done, 2 usage error or unknown id.
// Only results go to stdout; messages go to stderr. `--` ends the options, so
// words that start with a dash can still be named.

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { forge, garageRows, buildIdentity, GRAMMAR } from '../js/forge.js';
import { HOUSES, hasHouse } from '../js/houses.js';
import { PARTS, WEAPONS, hasSlot } from '../js/slots.js';
import { rngFrom, sample } from '../js/rng.js';
import { sanitizeGarage, blankGarage, isBuild } from '../js/state.js';
import { forgeLink, garageLink, decode, linkGrammar, clip, SITE, SEED_MAX, ROLL_MAX } from '../js/links.js';
import { toMarkdown, toJson, toChat, badgeMarkdown, buildBadges, chatLine, wikiLine } from '../js/export.js';

// Re-exported so the skill can check it loaded a Callsign engine and say which grammar.
export { GRAMMAR };

export const USAGE = `usage: callsign <command> [words] [options]
  forge <words...>     names for what you describe
  identity <name...>   a build's acronym and frame line
  garage <file|link>   every slot of a saved build
  link <words...>      the share link for a plate
  houses | slots       the ids the other commands accept
options: --house <id|all>  --slot <id>  --roll <n>  --count <n>  --frame-house <id>
         --via <name>  --base <url>  --json  --md  --badge  --help
grammar ${GRAMMAR}: the same words, house, slot and roll always give the same plate`;

const FLAGS = new Set(['json', 'md', 'badge', 'help']);
const VALUED = new Set(['house', 'slot', 'roll', 'count', 'frame-house', 'via', 'base']);

// What each command reads. Anything else is refused rather than silently ignored.
const ALLOWED = {
  forge: ['house', 'slot', 'roll', 'count', 'via', 'base', 'json', 'md', 'badge'],
  link: ['house', 'slot', 'roll', 'count', 'via', 'base', 'json'],
  identity: ['frame-house', 'roll', 'via', 'base', 'json'],
  garage: ['via', 'base', 'json', 'md', 'badge'],
  houses: ['json'],
  slots: ['json'],
};

export class UsageError extends Error {}

function parse(argv) {
  const opts = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { rest.push(...argv.slice(i + 1)); break; }
    if (/^-[a-zA-Z]$/.test(a)) throw new UsageError(`unknown option ${a}; options are spelled out, like --help, and -- ends them`);
    if (!a.startsWith('--')) { rest.push(a); continue; }
    const eq = a.indexOf('=');
    const key = eq > 0 ? a.slice(2, eq) : a.slice(2);
    if (FLAGS.has(key)) {
      if (eq > 0) throw new UsageError(`--${key} takes no value`);
      opts[key] = true;
      continue;
    }
    if (!VALUED.has(key)) throw new UsageError(`unknown option --${key}`);
    const value = eq > 0 ? a.slice(eq + 1) : argv[++i];
    if (value === undefined || (eq < 0 && value.startsWith('--'))) throw new UsageError(`--${key} needs a value`);
    opts[key] = value;
  }
  return { cmd: rest[0], args: rest.slice(1), opts };
}

const whole = (v, name, min, max) => {
  if (v === undefined) return undefined;
  const n = /^\d+$/.test(v) ? Number(v) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) throw new UsageError(`--${name} must be a whole number from ${min} to ${max}`);
  return n;
};

function checkBase(v) {
  try {
    const u = new URL(v);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch { /* reported below */ }
  throw new UsageError(`--base must be an absolute http or https URL, like ${SITE}`);
}

// forge() falls back silently on an unknown id, so every id is checked here first.
function checkHouse(id, { all = true } = {}) {
  if (id === undefined) return undefined;
  if ((all && id === 'all') || hasHouse(id)) return id;
  throw new UsageError(`unknown house '${id}'; run 'callsign houses' for the ids`);
}
function checkSlot(id) {
  if (id === undefined) return undefined;
  if (hasSlot(id)) return id;
  throw new UsageError(`unknown slot '${id}'; run 'callsign slots' for the ids`);
}

/**
 * Plates for a description. With house "all" there is one plate per house, and
 * --count picks that many houses in an order seeded by the words, so three
 * candidates come from three different grammars. With one house, --count
 * plates follow from --roll, the way the page's Reroll steps through them.
 */
export function forgePlates({ words = '', house = 'all', slot = 'core', roll = 0, count } = {}) {
  checkHouse(house);
  checkSlot(slot);
  // A link carries rolls up to ROLL_MAX; a plate past it would open as roll 0.
  if (house !== 'all' && roll + (count || 1) - 1 > ROLL_MAX) {
    throw new UsageError(`--roll plus --count runs past roll ${ROLL_MAX}, the last one a link can carry`);
  }
  if (house === 'all') {
    const houses = count
      ? sample(rngFrom('cli-houses', words.trim().toLowerCase(), slot, roll), HOUSES, Math.min(count, HOUSES.length))
      : HOUSES;
    return houses.map((h) => forge({ seed: words, house: h.id, slot, roll }));
  }
  return Array.from({ length: count || 1 }, (_, i) => forge({ seed: words, house, slot, roll: roll + i }));
}

/** The link that opens a page whose first plate is this one. */
const plateLink = (p, words, base, via) =>
  forgeLink({ seed: words, house: p.house, slot: p.slot, roll: p.roll }, { base, via });

/** One plate as the record --json prints. */
export const record = (p, link) => ({
  grammar: p.grammar,
  house: p.house, houseName: p.houseName, slot: p.slot, slotLabel: p.slotLabel, roll: p.roll,
  designation: p.designation, callsign: p.callsign,
  acronyms: { three: p.acronym.three, four: p.acronym.four },
  readsAs: p.expansion || null,
  link,
});

/**
 * A build from a file, a link, a query string or a bare payload, with the
 * grammar the link was made under (null when the input carries none).
 */
function readBuild(input, depth = 0) {
  let raw;
  let grammar = null;
  if (existsSync(input)) {
    try { raw = JSON.parse(readFileSync(input, 'utf8')); } catch { throw new UsageError(`${input} is not JSON`); }
  } else {
    let payload = input;
    let query = null;
    try { query = new URL(input).searchParams; } catch {
      if (input.includes('b=')) query = new URLSearchParams(input.slice(input.indexOf('?') + 1));
    }
    if (query) { payload = query.get('b') ?? ''; grammar = linkGrammar(query); }
    raw = decode(payload);
  }
  // The page's JSON download names the build and holds its link; the link rebuilds it.
  if (!isBuild(raw) && depth === 0 && typeof raw?.link === 'string') return readBuild(raw.link, 1);
  if (!isBuild(raw)) {
    throw new UsageError('that is not a Callsign build: give the garage JSON, a Callsign ?b= link, its payload, or a JSON export that has a link');
  }
  return { garage: sanitizeGarage(raw), grammar };
}

const stdio = {
  out: (s) => process.stdout.write(`${s}\n`),
  err: (s) => process.stderr.write(`${s}\n`),
};

export async function main(argv, io = stdio) {
  let parsed;
  try { parsed = parse(argv); } catch (e) { io.err(`callsign: ${e.message}\n${USAGE}`); return 2; }
  const { cmd, args, opts } = parsed;
  if (opts.help) { io.out(USAGE); return 0; }
  if (!cmd) { io.err(USAGE); return 2; }
  try {
    const allowed = ALLOWED[cmd];
    if (!allowed) throw new UsageError(`unknown command '${cmd}'\n${USAGE}`);
    const stray = Object.keys(opts).find((k) => !allowed.includes(k));
    if (stray) throw new UsageError(`--${stray} does not apply to ${cmd}${stray === 'house' && cmd === 'identity' ? '; use --frame-house' : ''}`);
    const base = opts.base === undefined ? SITE : checkBase(opts.base);
    switch (cmd) {
      case 'forge':
      case 'link': {
        // Cut the way the page reads a link, so the plate printed is the plate the link opens.
        const typed = args.join(' ');
        const words = clip(typed, SEED_MAX);
        if (words.length < typed.length) io.err(`callsign: the description was cut to its first ${SEED_MAX} characters, the most a link carries`);
        const plates = forgePlates({
          words,
          house: checkHouse(opts.house) ?? 'all',
          slot: checkSlot(opts.slot) ?? 'core',
          roll: whole(opts.roll, 'roll', 0, 999999) ?? 0,
          count: whole(opts.count, 'count', 1, 50),
        });
        const link = (p, fallbackVia) => plateLink(p, words, base, opts.via || fallbackVia);
        if (cmd === 'link') {
          const links = plates.map((p) => link(p, ''));
          io.out(opts.json ? JSON.stringify(links, null, 2) : links.join('\n'));
        } else if (opts.json) {
          io.out(JSON.stringify(plates.map((p) => record(p, link(p, ''))), null, 2));
        } else if (opts.badge) {
          plates.forEach((p) => io.out(badgeMarkdown(p, link(p, 'readme'))));
        } else if (opts.md) {
          plates.forEach((p) => io.out(wikiLine(p, link(p, 'wiki'))));
        } else {
          plates.forEach((p) => io.out(chatLine(p, link(p, ''))));
        }
        return 0;
      }
      case 'identity': {
        const name = args.join(' ').trim();
        if (!name) throw new UsageError('identity needs a build name');
        const g = blankGarage();
        g.name = clip(name, 80);
        g.frameHouse = checkHouse(opts['frame-house'], { all: false }) ?? g.frameHouse;
        g.frameRoll = whole(opts.roll, 'roll', 0, 999999) ?? 0;
        const id = buildIdentity(g);
        const link = garageLink(g, { base, via: opts.via || '' });
        if (opts.json) {
          io.out(JSON.stringify({
            grammar: GRAMMAR, build: g.name,
            acronyms: { three: id.acronym.three, four: id.acronym.four },
            readsAs: id.expansion, frameLine: id.line, frameHouse: id.houseName, link,
          }, null, 2));
        } else {
          const also = [...id.acronym.three.slice(1), ...id.acronym.four].join(', ') || 'none';
          io.out(`${id.acronym.three[0]} (also ${also}), frame line ${id.line} from ${id.houseName}, reads as ${id.expansion}`);
          if (link) io.out(link);
        }
        return 0;
      }
      case 'garage': {
        const input = args.join(' ').trim();
        if (!input) throw new UsageError('garage needs a JSON file, a Callsign link or a ?b= payload');
        const { garage: g, grammar: made } = readBuild(input);
        if (made !== null && made !== String(GRAMMAR)) {
          io.err(`callsign: this link was made with grammar ${made} and this tool runs grammar ${GRAMMAR}, so these names may differ from the ones that were shared`);
        }
        const rows = garageRows(g);
        const title = g.name.trim() || 'Untitled build';
        const link = garageLink(g, { base, via: opts.via || '' });
        if (opts.json) io.out(toJson(title, rows, link));
        else if (opts.md) io.out(toMarkdown(title, rows, link));
        else if (opts.badge) io.out(buildBadges(rows, garageLink(g, { base, via: opts.via || 'readme' }) || ''));
        else io.out(toChat(title, rows, link || ''));
        if (!link) io.err('callsign: this build is too big for a link that opens; share the Markdown or JSON instead');
        return 0;
      }
      case 'houses': {
        const list = HOUSES.map((h) => ({ id: h.id, name: h.full || h.name, group: h.group, grammar: h.grammar }));
        if (opts.json) io.out(JSON.stringify(list, null, 2));
        else list.forEach((h) => io.out(`${h.id.padEnd(10)} ${h.name.padEnd(24)} ${h.grammar}`));
        return 0;
      }
      case 'slots': {
        const list = [
          ...PARTS.map((p) => ({ id: p.id, kind: 'part', label: p.label, names: p.names })),
          ...WEAPONS.map((w) => ({ id: w.id, kind: 'weapon', label: w.label, names: w.names })),
        ];
        if (opts.json) io.out(JSON.stringify(list, null, 2));
        else list.forEach((s) => io.out(`${s.id.padEnd(11)} ${s.kind.padEnd(7)} ${s.names}`));
        return 0;
      }
      default:
        throw new UsageError(`unknown command '${cmd}'`);
    }
  } catch (e) {
    if (e instanceof UsageError) { io.err(`callsign: ${e.message}`); return 2; }
    throw e;
  }
}

// Run only when invoked directly, not when imported. argv[1] may name no real file (node -e, a REPL).
let invoked = false;
try { invoked = pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url; } catch { /* imported */ }
if (invoked) process.exitCode = await main(process.argv.slice(2));
