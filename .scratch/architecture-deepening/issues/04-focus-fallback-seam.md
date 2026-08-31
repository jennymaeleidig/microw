# 04 — A seam for focus fallback

Candidate 3 of the architecture review (Worth exploring). Spec: `.scratch/architecture-deepening/spec.md`.

Status: ready-for-agent
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
