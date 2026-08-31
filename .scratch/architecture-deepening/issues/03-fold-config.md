# 03 — Delete config.ts

Candidate 6 of the architecture review (Speculative), revised after ticket 02. Spec: `.scratch/architecture-deepening/spec.md`.

Status: ready-for-human (implemented, reviewed, committed)

## Files

Delete `src/config.ts`. Modified: `src/microw.ts`, `src/controls.ts` (its `onTaskbarConfigChange` consumer from ticket 02).

## Problem

`config.ts` is one boolean with two functions and a single consumer — the deletion test's textbook pass-through: delete it and the complexity vanishes.

## Design (decided)

Fold the taskbar-enabled flag into `microw.ts` statics as one private static field. `labels.ts` is deliberately KEPT: after ticket 02 it has two real consumers (`taskbar.ts`, `microw.ts`), making it a real seam — and folding it would force a value import `taskbar.ts → microw.ts`, breaking the type-only-import discipline for no gain.

The config-change channel added in ticket 02 moves with the flag (or stays a tiny exported function over the static field — implementer's call, keep it single-subscriber).

## Acceptance

- `config.ts` gone; no behaviour change; all tests pass unchanged.

## Comments

- 2026-08-31: Implemented. The ticket's premise ("one consumer") was stale
  after ticket 02 gave config.ts a second one (controls.ts). Either option
  the ticket named would have forced a controls.ts → microw.ts value import
  (a cycle, breaking the type-only discipline), so the implementer's-call
  clause was stretched to a fourth design, disclosed to and accepted by
  spec review: the channel is REPLACED by a direct
  `controlsOf(win).disableMin()` call inside `MicroW.configure`'s existing
  disable loop. This also removes the hidden-chain weakness ticket 02 had
  accepted.
- `WindowControls` gained an `allowMin` constructor param; `minimizable`
  rests on the invariant "min button exists ⟹ grown while enabled ⟹ no
  disable since (disable strips it)" — spec review verified no path
  violates it.
- labels.ts kept as decided. Semantic delta found by review: min controls
  are now stripped after `destroyTaskbars()` (channel fired before) —
  unobservable; taskbar already unmounted.
- Review verdicts: Standards 9 met / 0 partial / 0 missing; Spec 10 met /
  0 partial / 0 missing / 0 wrong. 226 tests pass.
