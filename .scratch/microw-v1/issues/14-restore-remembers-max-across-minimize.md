# 14 — Restore remembers max across minimize

**What to build:** A window that is maximized, then minimized, then restored comes back **maximized** — the state it was in before minimize — rather than dropping to normal. Minimize becomes effectively orthogonal to max (like focus already is); a second restore then returns the window to normal with its remembered pre-max geometry.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] `maximize → minimize → restore` returns the window to `max`: it fills the work area, carries `mcrw-max`, and still remembers its pre-max geometry.
- [x] Restoring that `max` window a second time returns it to `normal` with the remembered pre-max geometry and clears the memory — unchanged from today.
- [x] A window minimized from `normal` (never maximized) still restores to `normal` — unchanged.
- [x] `onrestore` still fires once on the min-after-max restore, with the window now in `max` state; this is documented so consumers no longer assume restore always lands on `normal`.
- [x] The state-model ADR and the v1 spec's restore/minimize rules are amended to state that minimize remembers the prior state and `max → min → restore → max`.
- [x] The headless seam's min-after-max restore test is updated to the new expectation, and the full suite, `build`, `typecheck`, and `prettier --check` stay green.

## Answer

Minimize now remembers the state it left, so restore can put the window back where it was.

**Library (`src/microw.ts`).** `MicroW` gains a `preMin` memory (`Exclude<WindowState, "min">`) set by `minimize()` and cleared on leaving `min`. `restore()` branches on it: a window minimized from `max` re-fills the work area (via a shared `fillWorkArea()` helper, extracted from `maximize()`) and lands in `max` — still carrying `preMax`, so the next restore returns it to `normal` with the remembered pre-max geometry. A window minimized from `normal` still restores to `normal`, and a `max` window still restores to `normal` with its pre-max geometry cleared. `onrestore` fires once on each restore, with the window already in its restored state.

**Docs.** ADR-0009, the v1 spec's state model and user story 21, `CONTEXT.md` (Minimize and Restore), and the README's `restore()` line all now state that minimize remembers the prior state and `max → min → restore → max`. The global-disable rule — which restores minimized windows via `restore()` — is amended to say it lands them back on their pre-minimize state rather than always `normal`.

**Tests.** The headless-seam min-after-max test now asserts the window returns to `max` (work-area fill + `mcrw-max`) before a second restore returns it to `normal`; a new test pins `onrestore` firing once with the window in `max`, and a taskbar test covers global-disable restoring a min-after-max window to `max`. Suite: 160 passing; `build`, `typecheck`, and `prettier --check` all clean.
