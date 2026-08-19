# 05 — State: minimize / maximize / restore / focus / MRU

**What to build:** The window's three-state model — `normal`, `min`, `max` — plus focus as the only orthogonal state, with a most-recently-used order that keeps focus on a visible window, so that minimize/maximize/restore behave like a desktop window manager and the app can react to every transition with the right payloads.

**Blocked by:** 02 — Constructor, mount, DOM contract, work-area defaults, registry; 03 — moveTo + header drag + pointer conversion + position clamp; 04 — Resize: handles, clamps, shared primitive, toggle + gate.

**Status:** resolved

- [x] `minimize()` transitions a window to `min` (adding `mcrw-min`, the only hiding class), leaves its geometry untouched, and fires `onminimize`.
- [x] `maximize()` fills the root's work area and remembers the pre-max geometry; the header's max control toggles `normal ↔ max`; restore returns a `min` or `max` window to `normal`, fires `onrestore`, and returns the instance.
- [x] Focus is the only orthogonal state: a minimized or maximized window can still be the focused one; `mcrw-focused` and the inline stacking `z-index` track it. Focus is model state, never real DOM focus.
- [x] `minimize()` blurs the window (`onblur`) and focuses the next most-recently-used non-minimized window (`onfocus`); if none exists, no window is focused. Close and minimize share the same MRU hand-off.
- [x] `minimize()` is a no-op on a non-minimizable window (min control disabled), so nothing can strand a window in a state with no way back.
- [x] Resize — pointer and programmatic — is a no-op outside `normal`, so a `max` window's geometry stays owned by maximize; the same gating applies to drag.
- [x] `getState()` reports `state` and `focused`; state classes are exactly `mcrw-min`/`mcrw-max` (normal carries none) and the state/lifecycle callback family fires with the window instance only (`onmove`/`onresize` carry the geometry rect — see 03/04).
- [x] The state-gating rules just described are documented in the ADRs (amend/extend the state-model decision) so their intent survives the implementation.

## Answer

The three-state model and orthogonal focus land as one slice. `minimize()` transitions to `min` (adds `mcrw-min`, the only hiding class, and drops `mcrw-max`), leaves geometry untouched, fires `onminimize`, and — when the window was focused — blurs it (`onblur`) and hands focus to the next most-recently-used non-minimized window (`onfocus`) via the shared MRU order, or to nobody. `maximize()` fills the work area, remembers the pre-max geometry (only the first time, so a `max → min → max` round-trip never loses it), and fires `onmaximize`; the header's `mcrw-btn-max` control toggles `normal ↔ max`. `restore()` returns a `min`/`max` window to `normal`, restores the pre-max geometry, fires `onrestore`, focuses the window, and returns the instance. `focus()` is public (the taskbar's normal-item click maps to it in 07): it blurs the previously focused sibling in the root, sets `focused`, adds `mcrw-focused`, and raises the window to a fresh monotonic `zTop` — model state, never real DOM focus, so a `min`/`max` window can still be the focused one; it is idempotent.

The registry grew the focus-MRU order (`mruOf`, `raise`, most-recent-first) beside the creation-order list; `register` raises each new window, and the shared `handOffFocus()` helper is what `destroy()` (06) reuses. Resize (pointer and programmatic), drag, and `moveTo` share one `isStateGated()` gate — no-ops outside `normal` — now live since non-`normal` states exist. `minimize()` is a no-op when the min control is disabled (`minimizable`). `getState()` reports `state`/`focused` throughout, and state/lifecycle callbacks fire with the window instance only. The state model and its gating rules are documented in ADR-0009 (new); 29 tests cover the slice in `test/state.test.ts`.

Notes for later tickets: `handOffFocus()` and `blur()` are the shared primitives `destroy()` (06) reuses for its focus hand-off; the close control is still unwired (06). Header controls stop their own `pointerdown` from propagating, so a control click never starts a header drag.
