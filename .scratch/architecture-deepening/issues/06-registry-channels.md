# 06 — Split the registry's change channel

Candidate 4 of the architecture review (Worth exploring). Spec: `.scratch/architecture-deepening/spec.md`.

Status: ready-for-agent
Blocked by: 05

## Files

`src/registry.ts`, `src/taskbar.ts`, `src/observe.ts` (subscriber migration).

## Problem

`registry.ts` carries membership, MRU, z-index policy, auto-ids, and a single `notifyChange` bus fired for membership, state, and focus changes alike. Taskbar resyncs everything on anything; every sync re-clamps the whole root and notifies work-area watchers — a pure focus move costs reclamp × N plus a re-cascade check. "Who reacts to what" has no locality: it lives in call order across four files, where bugs hide.

## Design (decided)

Three channels, inside `registry.ts` (no new events module — the channels are "who exists and what happened to it" made explicit, not a separate concern):

- **membership** — register/unregister. Drives the reclamp/recascade path (taskbar item creation/removal).
- **state** — minimize/maximize/restore. Taskbar updates the affected item's state projection (cheap post-ticket-02) without re-clamping.
- **focus** — focus/blur. Taskbar updates the `-focused` highlight only.

Work area is still measured live per event (CONTEXT.md contract) — only WHICH changes wake the taskbar changes. `onChange` may remain as an alias over the union for compatibility, or be migrated — implementer's call, no public contract change.

## Acceptance

- A focus change no longer triggers reclamp × N or a re-cascade check.
- Reactions are declared per channel in one place.
- New seam-level tests: per-channel reactions (focus change updates one item; membership change resyncs).
- All existing tests pass unchanged.

## Comments
