# 04 — Resize: handles, clamps, shared primitive, toggle + gate

**What to build:** A window resizes from any of its eight edges or corners like a desktop window — dragged edge moves, opposite edge stays put, it never escapes the work area and never collapses past its floor — and a consumer can resize programmatically through the same path, or switch resize off entirely.

**Blocked by:** 02 — Constructor, mount, DOM contract, work-area defaults, registry; 03 — moveTo + header drag + pointer conversion + position clamp.

**Status:** resolved

- [x] Eight compass handles (`mcrw-resize-n/-e/-s/-w/-ne/-nw/-se/-sw`) are mounted as direct children of `.mcrw`, and pointer-dragging each one resizes the window with the opposite edge held fixed; corners clamp each axis independently.
- [x] Resize clamps via the shared clamp: each dragged edge stops at the work-area bound on its side and never passes the opposite edge minus the minimum size; where the work area is smaller than a size constraint, the work area wins (windows shrink to fit, never outside bounds).
- [x] `resizeFrom(dir, { dx, dy })` is the core resize primitive and `resizeTo(w, h)` is the anchored convenience; pointer-resize and programmatic resize share the same clamp path, so both behave identically.
- [x] `resizable: false` removes the handles and adds `mcrw-no-resize`; a `mcrw-no-resize` class applied by the consumer is honored as a behavior gate at resize time even if the handles are present.
- [x] Resize fires `onresize` with the window's full new rect `{ x, y, width, height }` each time it lands (a west/north-edge resize also carries the new `x`/`y`).
- [x] Resize outside the `normal` state is a no-op (the no-op gate is specified — enforcement is wired in 05 State, which owns the gating rule).

## Answer

Resize lands through one shared path. Eight compass handles mount as direct children of `.mcrw` (after `.mcrw-header`/`.mcrw-body`, in order `n/e/s/w/ne/nw/se/sw`), present iff `resizable`; `resizable: false` omits them and adds `mcrw-no-resize`. Each handle's `pointerdown` feeds a per-move delta into `resizeFrom(dir, { dx, dy })` — the core primitive — which applies the directional delta and clamps via `clampResize` (new in `src/clamp.ts`, beside `clampPosition`, so it is the same shared clamp). `resizeTo(w, h)` is the `se`-anchored convenience: `resizeFrom('se', { dx: w - width, dy: h - height })`.

`clampResize` clamps each moved edge independently: a growing edge (right/bottom) stops at the work-area bound and at `opposite + min` on its shrink side; a shrinking edge (left/top) stops at the work-area origin bound and at `opposite - min`. The min floor is soft — when the work area is smaller than the min, the floor is capped at the work-area bound, so the edge pins to the work area and the window shrinks to fit rather than exceeding bounds. The opposite edge of each moved edge never moves (excess drag pins).

`resizeFrom` fires `onresize(win, rect)` with the full new rect each time it lands, and is gated by `isResizeGated()`: a no-op outside `normal` (pre-wired like `moveTo` in 03, exercised once 05 introduces non-`normal` states) or when `.mcrw` carries `mcrw-no-resize` — which covers both `resizable: false` and a consumer-applied class, so a fixed-size window is fixed to script as well as to the pointer (US 14).

Notes for later tickets: the pointer handlers share a `startPointerDrag` scaffold (button check + per-event `toContainer` + document-level move/up/cancel teardown), so drag (03) and resize keep one conversion path. The `normal`-state gate is dead until 05. 05/06 will want header controls to `stopPropagation` so a control click never starts a header drag. A window already below its min in a too-small work area pins at the work-area bound and cannot be shrunk further — 09's re-clamp is where below-min windows get normalized. 26 tests cover the resize slice in `test/resize.test.ts` (plus the one-line `resizable: false` adjustment in `test/constructor.test.ts`).
