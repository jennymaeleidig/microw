# 01 — One geometry-and-callback writer

Candidate 2 of the architecture review (Strong). Spec: `.scratch/architecture-deepening/spec.md`.

Status: ready-for-human (implemented, reviewed, committed)
Blocked by: —

## Files

`src/microw.ts` — `moveTo`, `resizeFrom`, `reclamp`, `applyPlacement`, `writeGeometry`.

## Problem

The epilogue assign-rect → `writeGeometry()` → fire `onresize` then `onmove` is copied across four methods; `reclamp` and `applyPlacement` are near-identical twins. The event-order invariant lives only in the copies — a protocol change means four edits and four chances to get the order wrong.

## Design (decided)

Extract one internal `applyRect(rect: Rect): void`:

1. Clamps the rect into the current work area (the `clampRect` helper's job today).
2. Assigns `x`/`y`/`width`/`height`.
3. Calls `writeGeometry()`.
4. Fires `onresize` then `onmove`, only for the axes that actually moved/resized.

The four callers become compute-then-apply:

- `moveTo` — computes clamped position, calls `applyRect`.
- `resizeFrom` — computes clamped resize rect, calls `applyRect`.
- `reclamp` — computes the re-clamped rect (state-gated: skips `min`; `max` fills work area), calls `applyRect`.
- `applyPlacement` — **deleted**; cascade re-placement (ticket 05) calls `applyRect` directly.

`writeGeometry` stays private to the module; `applyRect` is the narrow internal apply step ticket 05 depends on (type-only import of `MicroW`).

## Acceptance

- Exactly one place writes geometry-then-fires-callbacks.
- Existing callback-order and reclamp tests pass unchanged.
- `applyPlacement` no longer exists.

## Comments

- 2026-08-31: Implemented. `applyRect` is private — ticket 05 must widen its
  visibility when cascade re-placement moves behind the type-only-import seam.
- Review follow-ups applied: `private get rect()` bundles the four-field
  literal (Data Clumps); added characterization tests pinning that a no-op
  `moveTo` fires no callbacks and a real move fires `onmove` only. The
  disclosed semantic change (callbacks fire only when geometry changes,
  per step 4 of this ticket) is recorded in CHANGELOG.md under Unreleased.
- Review verdicts: Standards 4 met / 1 partial (resolved) / 0 missing; Spec
  0 missing / 2 partial (one resolved by tests, one deferred to ticket 05) /
  0 wrong. 224 tests pass.
