# 08 — Cascade

**What to build:** `MicroW.cascade({ root, mode })` arranges new windows of a root into offset slots — a stepped staircase or a seeded, reproducible scatter — so windows open without dead-stacking on top of each other, while explicitly positioned windows and any window the consumer takes charge of are never rearranged.

**Blocked by:** 02 — Constructor, mount, DOM contract, work-area defaults, registry; 03 — moveTo + header drag + pointer conversion + position clamp; 04 — Resize: handles, clamps, shared primitive, toggle + gate; 07 — Taskbar: items, work-area band, opt-out, global disable.

**Status:** resolved

- [x] With `mode: 'cascade'`, newly mounted windows of that root take slot positions stepped by ⌈w/8⌉ × ⌈h/8⌉, restarting at the work area's top-left when the staircase would walk past its right or bottom edge.
- [x] With `mode: 'random'`, windows land at seeded, deterministic offsets within the work area — sequences distinct across roots, stable within a root.
- [x] Cascade supplies default placement only: a window constructed with explicit `x`/`y` is never cascade-placed, and no `onmove` fires at mount.
- [x] A cascade-placed window becomes consumer-owned the moment it is dragged, resized, or `moveTo`'d, and is never re-placed afterward.
- [x] When the work area changes (taskbar band add/remove), cascade re-places only its library-owned windows — the staircase rebuilds in creation order, random re-rolls from the same seed — and windows stay inside the work area (work area beats size).
- [x] Re-calling `MicroW.cascade({ root, mode })` reconfigures the mode and re-places the library-owned windows.

## Answer

Cascade lands as a per-root arrangement layered on the registry and the work-area measurement: placement math lives in `src/cascade.ts`, the MicroW wiring in `src/microw.ts`. `MicroW.cascade({ root, mode })` (`root` defaults to `document.body`; `mode` `'cascade' | 'random'`, invalid mode throws a `TypeError`) configures the root and re-places its library-owned windows.

Placement is default-only. In the constructor, a window with neither `x` nor `y` under a configured root is cascade-placed and no `onmove` fires at mount; an explicit `x`/`y` skips cascade entirely. The two modes:

- `cascade` — a per-root monotonic slot counter (advanced only by cascade-placed windows) offsets each window by ⌈w/8⌉ × ⌈h/8⌉ from the work area's top-left, restarting at the origin when the next slot would walk past the right or bottom edge.
- `random` — a per-root seed (distinct across roots, stable within a root) drives a mulberry32 PRNG; each mount rolls the next two values into a uniform in-bounds offset. The same monotonic counter indexes mounts, so a handed-off window's index is never re-rolled into by a later mount (no dead-stack).

Ownership: a cascade-placed window becomes consumer-owned on `moveTo`, drag (which routes through `moveTo`), or resize (which routes through `resizeFrom`) and is never re-placed afterward; `destroy()` releases it. Re-cascade re-slots only `normal`, library-owned windows in creation order — cascade rebuilds the staircase, random re-rolls from the same seed — and the one shared clamp keeps every window wholly inside the work area (work area beats size).

Work-area changes flow through a new `onWorkAreaChange`/`notifyWorkAreaChange` channel in `work-area.ts`, fired by the taskbar on item add/remove and destroy; cascade subscribes, compares against the last-measured work area, and re-places only on an actual change. The same seam is what root/viewport resize will ride in ticket 09. 13 tests cover the slice in `test/cascade.test.ts`.
