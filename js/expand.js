// ── Readings ─────────────────────────────────────────────────
// When the letters did not come from your own words, Callsign proposes what
// they could stand for. The last word leans on the slot's role when one fits,
// so a Booster reads like a pipeline and a Generator like a store.

import { pick } from './rng.js';

const bank = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.split(' ')]));

const MOD = bank({
  A: 'Adaptive Atomic Async Auxiliary Armored', B: 'Batch Binary Bound Burst Bonded',
  C: 'Cached Central Coherent Cold Composite', D: 'Deferred Distributed Direct Dynamic Deep',
  E: 'Edge Elastic Encrypted External Extended', F: 'Federated Fast Fixed Forward Fused',
  G: 'Global Guarded Graded Ground', H: 'Hardened Heavy Hybrid Hot High',
  I: 'Incremental Indexed Inline Integrated Inner', J: 'Joint Journaled Jumbo',
  K: 'Keyed Kinetic Known', L: 'Layered Linear Live Local Long',
  M: 'Managed Modular Mirrored Multi Mobile', N: 'Native Networked Nested Nominal',
  O: 'Offline Open Orbital Ordered Outer', P: 'Parallel Primary Protected Pulse Passive',
  Q: 'Quantized Queued Quick Quiet', R: 'Rapid Redundant Remote Reactive Rolling',
  S: 'Scheduled Secure Shared Static Staged', T: 'Tactical Tiered Timed Total Transient',
  U: 'Unified Upstream Universal Urgent', V: 'Versioned Vertical Virtual Volatile',
  W: 'Warm Weighted Wide Wired', X: 'Xenon Xenial', Y: 'Yielding Yearly', Z: 'Zero Zonal Zoned',
});

const NOUN = bank({
  A: 'Array Agent Archive Actuator Anchor', B: 'Bridge Buffer Beacon Broker Bay',
  C: 'Cache Cluster Console Controller Conduit', D: 'Daemon Dispatcher Deck Driver Depot',
  E: 'Engine Exchange Emitter Envoy Enclave', F: 'Forge Feed Filter Frame Funnel',
  G: 'Gateway Grid Gauge Governor Garrison', H: 'Hub Harness Handler Hangar Hive',
  I: 'Index Interface Injector Inlet Intake', J: 'Junction Journal Jammer Jet',
  K: 'Kernel Keystone Kiln Keeper', L: 'Ledger Link Loader Lattice Lens',
  M: 'Monitor Matrix Module Mesh Manifold', N: 'Node Nexus Navigator Network Notifier',
  O: 'Orchestrator Outpost Observer Orbit Oracle', P: 'Pipeline Proxy Probe Platform Panel',
  Q: 'Queue Quorum Quarry Quiver', R: 'Relay Router Registry Runner Reactor',
  S: 'Scheduler Sentinel Signal Store Switch', T: 'Tracker Terminal Tower Transport Turret',
  U: 'Uplink Unit Utility Updater', V: 'Vault Validator Vector Viewport Valve',
  W: 'Watcher Warden Worker Workshop Wing', X: 'Xebec Xenolith', Y: 'Yard Yoke', Z: 'Zone Zenith',
});

/** The reading banks, for tests/golden.test.mjs: editing one renames plates. */
export const BANKS = { MOD, NOUN };

const COMMON = Object.keys(MOD).filter((ch) => !'JKQXYZ'.includes(ch));

/** A reading for a code with no word in it: two modifiers and the slot's role. */
export function invent(roles, rng) {
  const first = pick(rng, MOD[pick(rng, COMMON)]);
  let second = pick(rng, MOD[pick(rng, COMMON)]);
  for (let i = 0; i < 4 && second === first; i++) second = pick(rng, MOD[pick(rng, COMMON)]);
  return `${first} ${second} ${pick(rng, roles)}`;
}

/** "RAD" -> "Rolling Async Daemon". Empty string when there are no letters. */
export function expand(letters, roles, rng) {
  const chars = String(letters || '').toUpperCase().replace(/[^A-Z]/g, '').split('');
  const used = new Set();
  return chars.map((ch, i) => {
    if (i === chars.length - 1) return roles.find((r) => r[0].toUpperCase() === ch) || pick(rng, NOUN[ch]);
    // A repeated letter (BBL) must not read "Burst Burst": skip a word already used.
    const fresh = MOD[ch].filter((w) => !used.has(w));
    const word = pick(rng, fresh.length ? fresh : MOD[ch]);
    used.add(word);
    return word;
  }).join(' ');
}
