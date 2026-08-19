# microw v1.0 spec

Type: spec
Status: ready-for-agent

## Problem Statement

Web apps that need desktop-style windows — draggable, resizable panels, minimize/maximize, a taskbar to restore them — have no small answer. WinBox is the de-facto library, but it is an opinionated, styled, self-contained window manager: it ships themes, icons, a bundled look, an iframe loader, and its own assumptions about layout. It fights frameworks (injected DOM, scoped styles), forces its look on the app, and drags in features most apps never use. An app developer who wants windows as a _behavior_ — not a _look_ — is stuck either accepting WinBox wholesale or hand-rolling a window manager per app.

## Solution

microw is a zero-dependency, headless, framework-agnostic window management microframework. The library manages **State**, **Z-order**, **Drag**, **Resize**, and the **DOM structure** of windows inside a consumer-supplied **Root**; every pixel of styling is consumer CSS. Consumers compose a window from a typed API (`new MicroW(options)`), style it globally via the `mcrw-*` class contract, and restore minimized windows through the shipped headless **Taskbar** component. Windows are always wholly inside their root's **Work area** (root minus the taskbar strip), coordinates are container-relative only, and the whole runtime ships as TypeScript-transpiled plain JS with zero runtime dependencies.

## User Stories

### Windows

1. As an app developer, I want to create a window with `new MicroW(options)`, so that a bare `.mcrw` element mounts into my root at construction.
2. As an app developer, I want a window to mount into a root of my choosing (defaulting to `document.body`), so that windows are bounded to the container I intend them for.
3. As an app developer, I want to set `x`/`y`/`width`/`height` in container-relative pixels, so that I place windows predictably inside my root.
4. As an app developer, I want a window created without geometry to default to 25% of the work-area width at 4:3, centered, so that default windows scale with the root instead of being a fixed pixel blob.
5. As an app developer, I want `minWidth`/`minHeight` constraints, so that windows never shrink below usability.
6. As an app developer, I want `class`/`id` passthrough onto the `.mcrw` element, so that I can target individual windows from my own CSS and JS.
7. As an app developer, I want the window's `title` and `html` set at construction only, so that I own the header and body content afterwards via the DOM.

### Drag and resize

8. As an app developer, I want a window draggable by its `.mcrw-header`, so that users can move it anywhere in the root.
9. As an app developer, I want dragging to stay correct under a scrolled root, so that windows track the pointer wherever the root is scrolled.
10. As an app developer, I want dragging to clamp to the work area, so that a window can never be dragged off-screen or behind the taskbar.
11. As an app developer, I want resize via eight compass handles (`.mcrw-resize-n/-e/-s/-w/-ne/-nw/-se/-sw`), so that users can resize a window from any edge or corner.
12. As an app developer, I want each dragged edge to move while the opposite edge stays fixed, so that resizing behaves the way desktop windows do.
13. As an app developer, I want resize to clamp to the work area and to the window's min size, so that windows stay wholly in-bounds and never collapse past their floor.
14. As an app developer, I want `resizable: false` to remove the handles and add `mcrw-no-resize`, so that fixed-size windows exist.
15. As an app developer, I want `mcrw-no-resize` to work as a consumer-applied class gate, so that I can toggle resize with media queries or my own state.
16. As an app developer, I want `resizeFrom(dir, { dx, dy })` as the resize primitive and `resizeTo(w, h)` as a convenience, so that I can drive resize programmatically.
17. As an app developer, I want programmatic resize to share one clamp with pointer resize, so that both paths behave identically.
18. As an app developer, I want `moveTo(x, y)` to move a window programmatically, so that I can script layout.

### State

19. As an app developer, I want `minimize()` to transition a window to `min` with the `mcrw-min` class, so that minimized windows hide via my CSS without losing geometry.
20. As an app developer, I want `maximize()` to fill the root's work area and remember the pre-max geometry, so that maximize is exactly "fill the usable space".
21. As an app developer, I want `restore()` to return a `min` window to the state it held before minimizing and a `max` window to `normal`, then focus it, so that one call gets a window back to workable state.
22. As an app developer, I want `minimize()` to blur the window and focus the next most-recently-used non-minimized window, so that focus never lands on a hidden window.
23. As an app developer, I want focus to be the only orthogonal state, so that a minimized or maximized window can still be the focused one.
24. As an app developer, I want the `mcrw-max` control to toggle `normal ↔ max`, so that maximize is reversible from the header.
25. As an app developer, I want `minimize()` to be a no-op on a non-minimizable window, so that disabled minimize can never strand a window.
26. As an app developer, I want resize and drag — pointer and programmatic (`moveTo`) — to be no-ops outside `normal`, so that a `max` window's geometry stays owned by maximize.
27. As an app developer, I want `getState()` to return `{ state, focused, x, y, width, height, minWidth, minHeight, title, workArea }`, so that I can read live window geometry and the current work area.

### Lifecycle

28. As an app developer, I want `destroy()` to remove the window's element, registry entry, and taskbar item and hand focus to the next MRU window, so that closing is total and leak-free.
29. As an app developer, I want `destroy()` to work from any state, so that closing a minimized or maximized window is identical.
30. As an app developer, I want `MicroW.destroyAll()` to destroy every window and return the count, so that I can tear down the whole desktop at once.
31. As an app developer, I want lifecycle callbacks (`oncreate`, `onmaximize`, `onminimize`, `onrestore`, `onclose`, `onfocus`, `onblur`, `onmove`, `onresize`), so that my app reacts to window events.
32. As an app developer, I want geometry-bearing callbacks to receive the full new geometry, so that I don't have to call `getState()` after every move.
33. As an app developer, I want a window's root fixed at construction, so that per-root clamping and stacking are unambiguous.

### Taskbar

34. As an app developer, I want `MicroW.taskbar(root, options)` to mount a headless taskbar listing that root's windows, so that minimized windows stay reachable.
35. As an app developer, I want one `.mcrw-taskbar-item` per minimizable live window with title and state classes, so that the taskbar reflects the desktop truth.
36. As an app developer, I want taskbar items in creation order that never reorder on focus, so that the bar is stable and predictable.
37. As an app developer, I want `mcrw-taskbar-item-focused` to follow focus in place, so that the active window is visible without rearranging items.
38. As an app developer, I want clicking a `min` item to `restore()` and clicking a `normal` or `max` item to `focus()`, so that the taskbar is a switcher, not just a restore button.
39. As an app developer, I want the taskbar to reserve its side of the root as the work area, so that windows never sit behind or in front of the bar.
40. As an app developer, I want the taskbar's `side` (bottom/top/left/right), `grow`, and `align` as class hooks, so that I position and style the bar entirely in my own CSS.
41. As an app developer, I want a per-window `taskbar: false` opt-out, so that individual windows have no item and are non-minimizable (`minimize()` is a no-op), so that no window is ever stranded without a restore affordance.
42. As an app developer, I want a library-level global taskbar disable, so that a non-minimizing app strips minimize everywhere without per-window config.
43. As an app developer, I want a globally-disabled taskbar to restore any minimized windows, so that no window is stranded without a restore affordance.
44. As an app developer, I want `taskbar.destroy()` to remove the bar and re-clamp windows to the full root, so that removing the taskbar restores the full work area.

### Cascade

45. As an app developer, I want `MicroW.cascade({ root, mode })` to arrange new windows of that root into offset slots, so that windows open without stacking dead-on top of each other.
46. As an app developer, I want `mode: 'cascade'` to place windows in a stepped staircase (⌈w/8⌉ × ⌈h/8⌉ offsets) that restarts at the top-left on reaching the edge, so that many windows remain distinguishable.
47. As an app developer, I want `mode: 'random'` to place windows at seeded, deterministic offsets within the work area, so that a demo desktop looks organic but reproducible.
48. As an app developer, I want cascade to supply default placement only, so that a window I position explicitly is never rearranged.
49. As an app developer, I want cascade-placed windows to become consumer-owned the moment I drag, resize, or `moveTo` them, so that my intent wins over the arrangement.
50. As an app developer, I want cascade to re-place its library-owned windows when the work area changes, so that the staircase stays in bounds.

### Root and geometry contract

51. As an app developer, I want my root to be a `position: relative`, `isolation: isolate` container, so that windows position and stack within it correctly.
52. As an app developer, I want a bordered root to yield correct coordinates, so that borders don't silently offset my windows.
53. As an app developer, I want translation-only transforms allowed on the root, so that `translate`/`translateZ(0)` resets work without breaking coordinates.
54. As an app developer, I want windows to re-clamp when the root or viewport resizes, so that a shrinking container never leaves windows outside the work area.
55. As an app developer, I want `max` windows to re-fit the work area on root/viewport resize, so that maximize stays honest as the container changes.
56. As an app developer, I want library-driven re-clamps to fire `onmove`/`onresize` coalesced per window per frame, so that my pushed consumers stay current.

### Distribution

57. As a plain-JS app developer, I want the package's compiled ESM/CJS with zero runtime dependencies, so that I can use microw with nothing but the browser.
58. As a TypeScript app developer, I want exported types for every option, callback, and static, so that my integration is compile-checked.
59. As a framework app developer, I want windows that survive re-renders and change detection, so that React/Angular/Svelte/Vue apps work without wrappers.
60. As a framework app developer, I want `mcrw-*` to be global consumer CSS, so that framework-scoped styles can't strip the window's structure.
61. As an app developer, I want the library to never inject styles, so that my stylesheet is the only source of appearance.
62. As an app developer, I want the fork tree removed from the repo and everything CC0-1.0, so that microw has no Apache-2.0 residue and I can use it anywhere.

## Implementation Decisions

### Naming

- Constructor `MicroW`; project `microw`; **CSS class prefix `mcrw-*`** (ADR-0008 — renamed from `mw-*` to avoid namespace collisions; classes only, the JS/API names are untouched).

### Coordinate model

- Coordinates are **container-relative only** (ADR-0002): windows are `position: absolute` in a `position: relative` root; no `position: fixed`, no document-relative escape hatch, no re-parenting — the root is fixed at construction.
- Every pointer event converts `clientX/clientY` via a **per-event** `root.getBoundingClientRect()` read; the rect is not live, so it is never cached. Scroll cancels out of the conversion (both sides viewport-relative); **never** add `scrollTop`/`scrollLeft`. Deltas stay fractional; round only at the final style write.
- The root's **border is corrected per event** by subtracting `clientLeft`/`clientTop` (padding edge = containing-block origin); padding needs no correction. The correction applies uniformly to pointer conversion, band measurement, and `getState().workArea`.
- Root transforms: **translation-only** (`translate`, `translate*`, `translateZ(0)` safe — the vector cancels); scale/rotate (either syntax) are forbidden on the root — post-transform px can't round-trip. `contain: paint` clips, noted harmless under the work-area invariant. `contain`/`will-change` are not required. The root must have a box (`display: contents`/`none` → zero rects). Enforcement is document-only — no runtime CSS police.
- Maximize-fill and work-area measurement use `clientWidth`/`clientHeight` (padding box minus scrollbar); pointer math uses `getBoundingClientRect()` (border box, viewport-relative, fractional).

### State model

- States `normal`/`min`/`max` are mutually exclusive; **focus is the only orthogonal state** — model state, never real DOM focus. No `hidden` state (minimize is the only way a window leaves view). No `onhide`/`onshow`, no `show()`/`hide()`.
- `minimize()`: transition + `mcrw-min` class + `onminimize`; **remembers the state it left (`normal` or `max`)**, blurs (`onblur`) and focuses the next most-recently-used non-minimized window (`onfocus`); if none exists, no window is focused. No-op when the window is not minimizable.
- `maximize()`: fills the work area, remembers pre-max geometry, fires `onmaximize`.
- `restore()`: returns a `min` window to the state it was in before minimizing — `normal → min → restore` lands on `normal`, `max → min → restore` lands on `max` (re-filling the work area, still remembering the pre-max geometry) — and a `max` window restores to `normal` with its pre-max geometry restored and the memory cleared. **Restore always focuses** (folds in WinBox's `restore().focus()` chain) and fires `onrestore` once, with the window already in its restored state — `onrestore` must not assume the landing state is `normal`. Returns the instance.
- Focus-handoff on close and minimize uses the same MRU order: next most-recently-interacted non-minimized window, or nowhere.
- Drag and `moveTo` follow the same gate as resize: both are no-ops outside `normal` (US 26) — a `max` window's position is owned by maximize.

### Clamp

- One shared clamp enforces everything: drag, resize, placement, re-clamping, cascade containment. A window is **always wholly inside its work area** (the hard invariant); the work area beats size constraints (min size is a soft floor; oversized windows shrink to fit).
- Drag clamps position; resize clamps each dragged edge to the work-area bound on its side and to `oppositeEdge ∓ min` on its shrink side; corners clamp each axis independently; excess drag pins (the far edge never moves).
- Resize (pointer and programmatic) is a no-op outside `normal`. The work area is the implicit max — no `maxWidth`/`maxHeight` options.
- `resizeFrom(dir, { dx, dy })` is the core primitive; `resizeTo(w, h)` is `resizeFrom('se', …)`-anchored convenience; pointer-resize feeds the same path.

### DOM and CSS contract

Element hierarchy (all structural; consumer CSS only — ADR-0001, the library writes no static CSS, only its dynamic geometry — `left`/`top`/`width`/`height` — and the stacking `z-index`):

- `.mcrw` — window root; `position: absolute` in its root; `isolation: isolate`; inline `z-index` in band `[1, 999]`.
- `.mcrw-header` — the drag surface (always draggable; no drag-disable in v1); contains `.mcrw-title` + enabled controls.
- `.mcrw-title` — **presentational** (may restyle or hide freely).
- `.mcrw-body` — content area.
- 8 resize handles `.mcrw-resize-n/-e/-s/-w/-ne/-nw/-se/-sw` — direct children of `.mcrw` in that order, present iff `resizable`; consumer positions them.
- Controls `.mcrw-btn-min`/`.mcrw-btn-max`/`.mcrw-btn-close` — structural iff enabled, absent otherwise.

State classes (library-toggled; `normal` carries no class — base `.mcrw` rules ARE normal styling): `mcrw-min` (the only hiding class), `mcrw-max`, `mcrw-focused`. No `mcrw-hidden`, no `mcrw-compact`.

Resize toggle: `resizable: true` (default); `false` adds `mcrw-no-resize` and omits the handles. `mcrw-no-resize` is also a valid consumer-applied behavior gate (handles stay in the DOM; the library checks the class at drag time).

Taskbar classes: `.mcrw-taskbar` (mounted in the root as a window sibling; consumer positions it; stacks above its root's windows — reference `z-index: 1000`), `.mcrw-taskbar-item` (one per minimizable live window; state classes `mcrw-taskbar-item-min`/`-max`; `mcrw-taskbar-item-focused` follows focus in place; creation order, never reorders), side classes `mcrw-taskbar-bottom/-top/-left/-right` (present iff configured), grow classes `mcrw-taskbar-grow-right/-left/-down/-up`, align classes `mcrw-taskbar-align-start/-center/-end`.

Structural vs presentational: structural = `.mcrw`, `.mcrw-header`, `.mcrw-body`, `.mcrw-resize-*`, state classes, `mcrw-no-resize`, `.mcrw-taskbar` + item + their state classes, enabled `.mcrw-btn-*`. Presentational = `.mcrw-title` only.

Consumer requirements: `mcrw-*` must be global consumer CSS; the root must be `position: relative` + `isolation: isolate` (two-level isolation — ADR-0003).

### API surface

Constructor `new MicroW(options)` — one options object:

- `root` (default `document.body`) — the Root, fixed at construction.
- `x`, `y` — container-relative px; default centered in the work area.
- `width`, `height` — numeric px; defaults 25% of work-area width, height = ¾ × width (4:3), work-area-relative (ADR-0006).
- `minWidth`, `minHeight` — default unset (no clamp).
- `title`, `html` — construction-only.
- `controls` — `{ left: [...], right: [...] }` over `min`/`max`/`close`; default `{ left: [], right: ['min', 'max', 'close'] }` (ADR-0005). Minimizable = min control enabled.
- `resizable` — default `true`.
- `taskbar` — per-window opt-out, default `true`; a `taskbar: false` window is non-minimizable (`minimize()` is a no-op) so it can never be stranded without a restore affordance (ADR-0004/0005).
- `class`, `id` — passthrough onto `.mcrw`.
- Callbacks: `oncreate, onmaximize, onminimize, onrestore, onclose, onfocus, onblur` — each `(win)`; `onmove`/`onresize` receive `(win, rect)` with the window's full new geometry `{ x, y, width, height }`.

Instance methods (chainable, return the instance): `minimize()`, `maximize()`, `restore()`, `moveTo(x, y)`, `resizeTo(w, h)`, `resizeFrom(dir, { dx, dy })`, `getState()` → `{ state, focused, x, y, width, height, minWidth, minHeight, title, workArea }` (geometry always live; `workArea` reflects the current taskbar reservation), `destroy()`. No `mount()` — windows mount at construction, unmount at close.

Statics:

- `MicroW.taskbar(root, options)` — per-root factory; `options` = `{ side, grow, align }` (side default `bottom`; grow in-axis only, defaults `right`/`down`, invalid direction falls back to default; align default `start`). Returns a taskbar instance with `destroy()`. Work-area reservation = side band measured live via the bar's `getBoundingClientRect()` per event; no size option; an empty bar reserves nothing; re-clamp on mount, item add/remove, and `destroy()`.
- `MicroW.windows(root?)` — live window instances for a root (or all); the one registry serves z-order/MRU and taskbar sync.
- `MicroW.destroyAll()` — destroys every window, returns the count, empties the registry and taskbars.
- `MicroW.configure({ taskbar: false })` — global taskbar disable: strips the min control from every header, makes `minimize()` a no-op, restores any minimized window to the state it held before minimizing, and `MicroW.taskbar(root)` creates nothing. The one static config surface future globals slot into.
- `MicroW.cascade({ root, mode })` — `root` defaults to `document.body`; `mode: 'cascade' | 'random'`; void; re-call reconfigures the mode **and** re-places library-owned windows.

### Z-order

- Root-scoped stacking (ADR-0003): the root establishes a stacking context (`isolation: isolate`, two-level with the per-window context); windows z-order within their root by MRU in band `[1, 999]`; the taskbar sits above its root's windows (reference `z-index: 1000`); cross-root overlap orders by consumer composition; focus never re-stacks across roots. Band saturation = documented tie, no re-basing. `zTop` is monotonic — never decremented on close, never reused.

### Taskbar semantics

- Items: one `.mcrw-taskbar-item` per minimizable live window of the root, title text, state classes, `-focused` in place. Creation order, stable; close collapses the gap; new windows append. Click = `restore()` (min) or `focus()` (normal/max).
- Global disable restores minimized windows rather than stranding them (no window in a state with no affordance).
- The taskbar is the only restore affordance for minimized windows (ADR-0004); the header's max control toggling `normal ↔ max` is the only in-window way out of `max`.
- Positioning is consumer CSS; the side/grow/align classes are hooks with documented semantics + reference recipe CSS in the spec (a bottom bar: `position: absolute; bottom: 0; left: 0; right: 0` + `display: flex` mapped from grow/align). Named recipes (cultivars) are future work.

### Cascade

- Default placement only: a window constructed with explicit `x`/`y` is never cascade-placed; no `onmove` fires at mount.
- `cascade` mode: per-root monotonic slot counter advanced only by cascade-placed windows; step ⌈w/8⌉ × ⌈h/8⌉ (window-relative); next step exiting the work area's right/bottom edge resets the counter to slot 0 (staircase restarts top-left).
- `random` mode: seeded per root (distinct sequences across roots, stable within a root), uniform over in-bounds offsets, containment only — no overlap avoidance (MRU resolves overlaps).
- Ownership: a cascade-placed window (either mode) becomes consumer-owned on drag, resize, or `moveTo` — never re-placed afterward.
- Dynamic re-cascade on work-area events: taskbar item add/remove, bar `destroy()`, root/viewport resize — re-places **library-owned windows only**, on shrink and grow (`cascade` rebuilds the staircase in creation order; `random` re-rolls from the same seed).
- Placement is computed inside the work-area rect read live at mount; oversized windows are clamped by the one shared clamp (work area beats size).

### Close and destroy

- `destroy()`: removes the element, splices the window from the registry and focus-MRU order, blurs if focused, hands focus to the next MRU non-minimized window (or nowhere), fires `onclose`, removes the taskbar item (gap collapses, creation order of the rest preserved). Works from any state; closing the last window leaves a clean empty desktop.

### Re-clamping on root/viewport resize

- Hybrid observation: `ResizeObserver` on element roots; `window` `resize` for `document.body` roots (RO observes element boxes, not the viewport; both are platform APIs — the zero-dependency claim holds).
- On resize: every window re-clamps position (the one shared clamp, idempotent); `max` windows re-fit the work area (both directions); library-owned cascade windows re-cascade; `min` windows untouched; the taskbar untouched (band re-measured live).
- Oversized windows on shrink: work area beats size — windows shrink to fit (**shrink-only**; growing the root never grows windows back; `max` is the exception). Coalescing: RO is per-frame natively; the window-resize path uses a per-frame guard so `onmove`/`onresize` fire at most once per window per frame. No rAF layer.

### Build and publish pipeline

- Source of truth: TypeScript `strict` (ADR-0007); `tsc` transpiles to plain JS for distribution. TypeScript is dev-only — the emitted JS has zero runtime dependencies.
- Package ships: compiled ESM + CJS + `.d.ts` + source maps (+ the `.ts` source). No bundler, no UMD.
- Types-first `exports` map in `package.json`; the public API is enforceable, exported types (options, callbacks, statics).
- Repo root becomes microw's own package (rename from winbox); the WinBox fork tree (`src/`, `dist/`, `demo/`, `task/`, `index.html`, `CHANGELOG.md`, `.github/`, fork `package.json`/`README.md`) is removed at implementation start; `package.json` → `"license": "CC0-1.0"`, name `microw`, README rewritten (WinBox heritage out).
- Formatting: Prettier defaults (`npx prettier --write .` before committing; CI may `--check`); `.prettierignore` covers the fork tree, `node_modules/`, `.opencode/`, `dist/`.

## Testing Decisions

- **One seam — the headless DOM seam.** All tests run in jsdom with **stubbed layout** (jsdom has no real geometry): `getBoundingClientRect`, `clientWidth`/`clientHeight`, `clientLeft`/`clientTop`, and the ResizeObserver/window-resize signals are injected as controllable doubles, so every geometry-dependent behavior is exercised deterministically — coordinates, clamp math, work-area band, cascade placement, re-clamp triggers.
- **What makes a good test**: tests assert **external behavior** through the public API and the observable DOM only — element presence/removal, class transitions (`mcrw-min`/`mcrw-max`/`mcrw-focused`, `mcrw-taskbar-item-*`, `mcrw-no-resize`), `getState()` values, callback firing order and payloads, registry enumeration, z-index writes, and DOM ordering. No test reaches into internal state (no instance-private fields, no internal counters); the DOM and `getState()` are the truth.
- **Modules under test**: the constructor (options validation, defaults, mount), the state transitions and focus-handoff (minimize blur + focus-next MRU, restore focus), the clamp (drag/resize edges, min-size floor, work-area-beats-size, pinning), pointer conversion math (scroll, border correction, translation transform), the registry and MRU z-order (monotonic `zTop`, close gap), `destroy()`/`MicroW.destroyAll()`, the taskbar (item set per minimizable live window, creation order, in-place `-focused`, click mapping, side/grow/align classes, global disable restore, `destroy()` re-clamp), cascade (slot advance, edge reset, seeded random, ownership handoff, dynamic re-cascade), and re-clamping (position re-clamp, max re-fit, coalescing to one callback per window per frame).
- **Prior art**: the prototype's headless smoke test (`taskbar-smoke.mjs` — jsdom with stubbed layout; grew 38/38 → 53/53 green) is the established pattern in this effort for exactly this kind of deterministic DOM/state testing; the spec's suite follows that shape.
- **Open edge (implementation phase, not a v1 test seam)**: real-browser integration — actual `ResizeObserver` delivery, real pointer chains over handles, and close across framework re-renders — is deferred to implementation-time validation, not shipped as a second seam.

## Out of Scope

- **In-window restore affordance** — the taskbar is the only restore affordance for minimized windows (ADR-0004); the window header never ships a restore button.
- **Re-parenting** (`reparent(newRoot)`) — a window's root is fixed at construction (ADR-0002).
- **Styling recipe book / cultivars** — v1 ships the class contract, not named styling recipes; the taskbar classes get documented semantics + reference recipe CSS only.
- **Resizing from `max`/`min` states** — resize (pointer and programmatic) is a no-op outside `normal`; no de-max-on-edge-drag in v1.
- **Dropped WinBox features** — modal, fullscreen, autosize, overflow, iframe/URL loading, custom templates, custom controls, themes, bundled SVG icons, window icon, splitscreen helper.
- **`maxWidth`/`maxHeight` options** — the work area is the implicit max.
- **Drag-disable** (`mcrw-no-drag`) — the header is always draggable in v1.
- **Document-relative (`position: fixed`) placement** — container-relative only (ADR-0002); any ancestor `transform` re-parents fixed windows, which is why scale/rotate are likewise forbidden on the root.
- **Global stacking across roots** — stacking is root-scoped (ADR-0003).
- **`show()`/`hide()`/`onhide`/`onshow`** — minimize is the hide.
- **Real-browser / framework-scaffold test harness** — headless seam only (see Testing Decisions).

## Further Notes

- Band saturation (999+ live windows in one root) is a **documented tie** — all windows sit at 999; no re-basing (ADR-0003).
- The taskbar stacks above its root's windows at reference `z-index: 1000` (consumer CSS; the library's inline writes on `.mcrw` are geometry — `left`/`top`/`width`/`height` — and the stacking `z-index`, nothing else).
- `scale`/`rotate` on the root invalidate the coordinate model and are documented as forbidden (document-only enforcement); `contain: paint` clips (harmless under the work-area invariant).
- Library-driven re-clamps fire `onmove`/`onresize` coalesced to one per window per frame.
- WinBox is inspiration only, not a fork: the fork tree is removed at implementation start, and behavior is derived from this spec, never from the fork's implementation (Apache-2.0 code must not be copied into CC0 files).
- The prefix amendment (ADR-0008) supersedes the `mw-*` references in ADR-0001/0005 — their prose has been swept to `mcrw-*`.
