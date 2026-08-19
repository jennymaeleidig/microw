# 03 — moveTo + header drag + pointer conversion + position clamp

**What to build:** A window can be moved — by hand (dragging its header) or by script (`moveTo`) — and can never leave its root's work area, tracked correctly under scroll and a translated root, so that moving windows feels exact and bounds-safe.

**Blocked by:** 02 — Constructor, mount, DOM contract, work-area defaults, registry.

**Status:** resolved

- [x] `moveTo(x, y)` moves a window programmatically to container-relative coordinates and fires `onmove` with the window's full new rect `{ x, y, width, height }`.
- [x] Dragging the `.mcrw-header` moves the window with the pointer, converting each event's `client` coordinates via a per-event rect read — never a cached rect; deltas stay fractional, rounding only at the final style write.
- [x] Drag tracks correctly under a scrolled root (scroll cancels out of the conversion) and under a translation-only-transformed root; the root's border is subtracted per event so a bordered root yields correct coordinates.
- [x] Position is clamped by the shared clamp so a dragged or `moveTo` window is always wholly inside its root's work area, pinned when the drag exceeds a bound.
- [x] Moving outside the `normal` state is a no-op, so a minimized or maximized window's geometry stays owned by its state.
- [x] The drag surface is the header and only the header; nothing else moves the window, and no document-relative or `position: fixed` placement exists.

## Answer

`moveTo` and header drag land with the one shared position clamp. `moveTo(x, y)` routes through `clampPosition` (new `src/clamp.ts` — the shared clamp that resize/placement/re-clamp/cascade reuse in 04/08/09) and fires `onmove(win, rect)` with the full new geometry; both `moveTo` and drag no-op outside `normal`. The header is the drag surface: `pointerdown` on `.mcrw-header` records the pointer's grab offset and tracks `pointermove`/`pointerup`/`pointercancel` on the document, feeding every event through `toContainer`, which reads `root.getBoundingClientRect()` per event and subtracts `clientLeft`/`clientTop` — so scroll and translation-only transforms cancel out and a bordered root yields correct container coordinates. Deltas stay fractional; `writeGeometry` is the only place that rounds.

Notes for later tickets: `onmove` is the first `(win, rect)` geometry callback (`WindowGeometryCallback` in types); `onresize` reuses it in 04. The `normal`-state gate is wired in `moveTo`/drag but untestable until 05 introduces non-`normal` states. The drag listens on `document` (jsdom lacks `setPointerCapture`); the seam exercises this by mounting the root into the document. 05/06 will want the header controls to stop their own `pointerdown` from propagating so a control click doesn't start a drag. 13 new tests cover move/clamp/drag in `test/move-drag.test.ts`.
