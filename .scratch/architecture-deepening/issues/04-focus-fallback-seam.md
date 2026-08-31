# 04 — A seam for focus fallback

Candidate 3 of the architecture review (Worth exploring). Spec: `.scratch/architecture-deepening/spec.md`.

Status: ready-for-human (implemented, reviewed, committed)
Blocked by: 03

## Files

`src/microw.ts` (`focus`, `blur`, `handOffFocus`), `src/taskbar.ts` (registration), new seam in `src/` (placement: implementer's call — small `focus-fallback.ts` or inside `registry.ts`).

## Problem

ADR-0010's fallback priority — MRU non-min window → taskbar element → per-window `fallbackFocus` → documented no-op — is discoverable only by cross-referencing `microw.ts` with `taskbar.ts` and tickets 03/05. The window module imports the taskbar module for one lookup (`taskbarElementOf`), inverting who should know whom.

## Design (decided)

A registration seam. Semantics are FROZEN at ADR-0010 — this is structural only:

- Fallback targets register: the taskbar registers per-root on mount and unregisters on destroy; a window's `fallbackFocus` registers per-window at construction (and on destroy).
- `handOffFocus` asks one interface: "next fallback target for this root" — MRU non-min window always first, then registered targets in registration order (taskbar mounts before the consumer could rely on anything else; `fallbackFocus` is the last tier).
- `microw.ts` drops its `taskbar.ts` import FOR HANDOFF ONLY. The statics' import (`MicroW.taskbar()`, `destroyTaskbars()`) is legitimate facade code and stays — no second seam.

Two real adapters exist (taskbar, consumer `fallbackFocus`), so this is a real seam, not a hypothetical one.

## Acceptance

- The fallback priority is written exactly once.
- New seam-level tests: fallback ordering (window → taskbar → fallbackFocus → no-op), taskbar unregister-on-destroy, no window can take focus → documented no-op.
- All existing tests pass unchanged.

## Comments

- 2026-08-31: Implemented as `focus-fallback.ts` (placement was the
  implementer's call; the registry already owns membership ordering, so the
  fallback chain got its own small module rather than growing `registry.ts`).
  `nextFocusTarget(root, from)` is the one interface `handOffFocus` asks; it
  returns a `FocusTarget` union (`window` vs `element`) so microw.ts can call
  `focus()` vs `focus({ preventScroll: true })` without a value import of
  MicroW (cycle discipline). The frozen semantics meant the ticket's
  "registered targets in registration order" resolved to two explicit tiers —
  root-level target (the taskbar, one per root) before the per-window
  `fallbackFocus` — because pure insertion order would flip the taskbar tier
  whenever a window with a `fallbackFocus` is constructed before
  `MicroW.taskbar()` mounts, which the existing taskbar precedence test
  forbids. ADR-0010's frozen priority is the ground truth; behaviour is
  byte-equivalent.
- New `test/focus-fallback.test.ts`: four seam-level tests — MRU non-min
  window beats taskbar and fallbackFocus; taskbar beats fallbackFocus even
  when it mounts after the fallback registered; destroyed taskbar unregisters
  (hand-off falls through to fallbackFocus); no target at all is the
  documented no-op. They were written first and passed against the old code
  too (characterization tests — semantics are frozen, the refactor is
  structural); all 230 tests pass unchanged, no existing test touched.
- `taskbarElementOf` deleted from `taskbar.ts`; `microw.ts` keeps only the
  facade import (`createTaskbar`, `destroyTaskbars`, `type Taskbar`). Window
  fallback unregisters after the hand-off in `destroy()` (it may need the
  window's own fallback); taskbar replacement (`createTaskbar` on an occupied
  root) and `destroyTaskbars()` leave no stale registration.
- Review verdicts: Standards 5 met / 1 partial / 0 missing; Spec 6 met /
  0 partial / 0 missing / 0 wrong. Two review findings fixed before landing
  (unused `bar` binding in the first new test; CHANGELOG's bare "ADR-0010"
  citation now cited by name). Judgement calls accepted as designed: the
  two-lifetime registration maps (per-root vs per-window lifetimes justify
  the split) and the two-variant `FocusTarget` union (typed exhaustiveness
  without a value-import cycle).
