# 09 — Re-clamping on root/viewport resize

**What to build:** When a root or the viewport resizes, every window of that root is brought back into the work area automatically — maximized windows re-fit, cascade-owned windows re-arrange, minimized windows are left alone — with callback traffic coalesced so a resizing container never floods the app.

**Blocked by:** 02 — Constructor, mount, DOM contract, work-area defaults, registry; 03 — moveTo + header drag + pointer conversion + position clamp; 05 — State: minimize / maximize / restore / focus / MRU; 08 — Cascade.

**Status:** resolved

- [x] Element roots are observed with ResizeObserver; `document.body` roots observe the window resize event (both platform APIs — no dependencies added).
- [x] On a size change, every window re-clamps its position into the work area (the one shared clamp, idempotent); `max` windows re-fit the work area in both directions; library-owned cascade windows re-cascade; `min` windows are left untouched.
- [x] Shrinking a root shrinks oversized windows to fit (work area beats size) but shrinking-bound windows are never grown back when the root grows; `max` is the only exception.
- [x] Library-driven re-clamps fire `onmove`/`onresize` coalesced to at most once per window per frame (a per-frame guard on the window-resize path — no rAF layer; RO delivery is natively per-frame).
- [x] The taskbar is untouched on resize (its band is re-measured live), and re-clamping keeps windows wholly inside the work area throughout.
- [ ] Real-browser sanity check: actual ResizeObserver delivery and the per-frame coalescing behave as designed outside jsdom. _(No headless browser in this workspace — manual follow-up; the jsdom seam exercises the deterministic behaviour.)_

## Answer

Re-clamping rides the work-area-change channel ticket 08 left open, plus a new `src/observe.ts`. `observeRoot(root)` starts watching a root the first time a window registers for it: element roots get a `ResizeObserver`, `document.body` roots get a `window` `resize` listener (both platform APIs — the zero-dependency claim holds). `unobserveRoot` disconnects when the last window of a root is destroyed, so observation is exactly as long as a root has windows.

On a size change, `handleResize` marks every window of that root pending and defers one microtask flush. The flush runs re-cascade first (`notifyWorkAreaChange`, which re-slots library-owned cascade windows) then `reclamp()` on each still-live pending window — re-cascade first, so owned windows land in fresh slots and the re-clamp finds them already in-bounds and stays silent. The existing `reclamp()` is reused unchanged and is the one shared, idempotent clamp: `min` returns untouched, `max` re-fits the work area in both directions, and `normal` windows clamp position and shrink to fit (`Math.min`) — never grown back on a growing root, `max` being the only exception.

Coalescing is per-window via a pending set deduped across one microtask, with no rAF layer: the browser already delivers RO and `window.resize` at most once per frame, so the microtask only has to collapse same-tick duplicates. `notifyWorkAreaChange` is deferred into the same flush so cascade re-cascades are coalesced too (not fired once per resize event). The taskbar is untouched — its band is read live on every work-area measurement, so a re-anchored bar is reflected without any resize handling. 9 tests cover the slice in `test/reclamp.test.ts`.
