# 05 — Consolidate cascade re-placement

Candidate 5 of the architecture review (Worth exploring). Spec: `.scratch/architecture-deepening/spec.md`.

Status: ready-for-human (implemented, reviewed, committed)
Blocked by: 04

## Files

`src/cascade.ts` (gains re-placement), `src/microw.ts` (loses its cascade statics' internals).

## Problem

The Cascade concept (CONTEXT.md: "cascade re-places the windows it still owns") is split: slot math and ownership live in `cascade.ts`; re-placement orchestration — `recascadeRoot`, the `lastWorkArea` map, the static-init `onWorkAreaChange` listener — lives among `MicroW`'s statics, reaching into the (post-ticket-01 internal) `applyRect`. Understanding placement means bouncing between two modules.

## Design (decided)

Move re-placement policy into `cascade.ts` behind one interface — "place this window" and "re-place the windows you own" — including the work-area watcher (the static init block and `lastWorkArea` map move with it). `MicroW.cascade()` stays as validation-and-dispatch facade.

Cascade applies new positions via type-only import of `MicroW`, calling the internal `applyRect` from ticket 01. No callback adapter — nothing varies across that seam; one adapter means a hypothetical seam.

## Acceptance

- Placement policy reads in one file.
- Cascade determinism tests (seeded replay, multi-root, re-place on work-area change) pass unchanged and cover re-placement through the same interface.
- No ADR touched (ADR-0006 defaults unaffected).

## Comments

- 2026-08-31: Implemented. `placeWindow(win, workArea, width, height)` (place
  this window) and `recascadeRoot(root)` (re-place the windows you own) moved
  into `cascade.ts` with the `lastWorkArea` map and the static-init
  `onWorkAreaChange` watcher; `MicroW.cascade()` is validation-and-dispatch,
  and `configureCascade` seeds the watcher baseline so the configure-time
  re-placement is not itself a work-area change (order preserved). The
  width/height params mirror `nextCascadeSlot`'s signature — the constructor
  passes pre-construction geometry, so `getState()` was not used.
- `applyRect` widened from `private` per ticket 01's record, going further
  than the first cut after review: it is now `/** @internal */` with
  `stripInternal: true` in `tsconfig.types.json`, so the shipped `.d.ts`
  does NOT publish it (the first cut leaked it into `dist/types`, which the
  standards review flagged as contradicting the types-first rule). The
  source-level widening remains the known cost of the type-only-import
  discipline.
- Review-driven cleanups: dead `isCascadeConfigured` export removed (its
  last caller disappeared with the move); the duplicated mode ternary
  extracted into `slotFor`. Judgement call accepted: the
  workArea/width/height clump is inherent to the slot math's signature.
- Semantic equivalence verified by review line-by-line against the old
  statics: seeding order, mark-then-clamp, counter resets, owned-only +
  normal-state-only filtering all identical; watcher registration timing
  unchanged in effect (cascade.ts loads with microw.ts, and it remains the
  only work-area watcher).
- All 13 cascade determinism tests pass unchanged (seeded replay, multi-root,
  re-place on work-area change — through the same facade); 230 tests total;
  build, verify-dist, and types-consumer checks pass; no ADR touched.
- Review verdicts: Standards 4 met / 1 partial (resolved: `@internal` +
  `stripInternal`) / 0 missing, 1 hard-minor violation (resolved: CHANGELOG
  cites tickets by name); Spec 8 met / 0 partial / 0 missing / 0 wrong.
