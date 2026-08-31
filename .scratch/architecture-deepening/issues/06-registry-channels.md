# 06 — Split the registry's change channel

Candidate 4 of the architecture review (Worth exploring). Spec: `.scratch/architecture-deepening/spec.md`.

Status: ready-for-human (implemented, reviewed, committed)
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

- 2026-08-31: Implemented. Three channels inside `registry.ts` (Q8):
  `onMembershipChange` / `onStateChange` / `onFocusChange`, each carrying the
  affected window; `onChange`/`notifyChange` fully migrated (implementer's
  call — no external consumers). The taskbar declares its three reactions in
  one place (the constructor): membership → `sync()` (item add/remove,
  identity, re-clamp, work-area notify); state → `updateItem` (affected
  item's identity + cue, no re-clamp); focus → `updateFocusCue` (highlight
  pass, in place). microw.ts fires focus from `focus()`, state from
  min/max/restore — restore keeps its old double-notify (focus + state).
  Group-label anti-drift preserved: every reaction re-reads the label bag
  (the existing "cannot drift" test triggers via a focus change).
- Design tension resolved, disclosed to review: three existing tests used
  the OLD behaviour — a focus change triggering a full sync — as the
  propagation mechanism for a band layout change, which a literal "focus
  reaction = highlight only" would break. Resolution: the taskbar polls its
  own band in every reaction (`syncBand`, O(1) rect read); an unchanged band
  costs nothing (so a PURE focus move triggers neither reclamp × N nor a
  watcher wake — the acceptance's letter), and a changed band is propagated
  as the work-area change it is (re-clamp + notify → recascade). Spec review
  judged this faithful to the ticket's intent ("only WHICH changes wake the
  taskbar changes"; the taskbar owns the band per CONTEXT.md's Work area
  entry), not a workaround.
- `observe.ts` is untouched: it never subscribed to the change bus (the
  ticket's file list predates tickets 04/05), so its "subscriber migration"
  was a no-op.
- New `test/registry-channels.test.ts`: focus move updates the cue in place
  (same item nodes, no resync); membership change resyncs (item appears with
  `aria-controls`, disappears on destroy); state change updates the affected
  item when no window takes focus (the case only the state channel covers).
  Written first; all pass against the old single-bus code too
  (characterization — semantics frozen). 233 tests: 230 existing unchanged
  - 3 new.
- Review-driven cleanups: the identity pass inside `sync()` no longer routes
  through `updateItem` (which now carries band-poll semantics) — the spec
  review caught a double reclamp/notify on membership changes; `ensureBand`
  renamed `syncBand` (the old name hid the re-clamp/notify side effect); the
  rect-equality shape duplicated across taskbar and cascade extracted into
  `sameRect` in `work-area.ts`; membership notify gained its
  `notifyMembershipChange` wrapper for symmetry. Judgement calls accepted:
  the triple subscribe boilerplate in registry.ts (explicitness over a
  factory), `observe.ts` file-list mismatch noted above.
- Review verdicts: Standards 0 hard violations, 5 judgement calls (all
  addressed or accepted); Spec 7 met / 0 missing / 2 minor (double reclamp
  fixed; observe.ts file-list noted). 233 tests pass; build, verify-dist,
  and types-consumer checks pass.
