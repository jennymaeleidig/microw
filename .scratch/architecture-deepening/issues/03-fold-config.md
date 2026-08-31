# 03 — Delete config.ts

Candidate 6 of the architecture review (Speculative), revised after ticket 02. Spec: `.scratch/architecture-deepening/spec.md`.

Status: ready-for-agent
Blocked by: 02

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
