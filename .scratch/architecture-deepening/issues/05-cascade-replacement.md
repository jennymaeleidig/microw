# 05 — Consolidate cascade re-placement

Candidate 5 of the architecture review (Worth exploring). Spec: `.scratch/architecture-deepening/spec.md`.

Status: ready-for-agent
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
