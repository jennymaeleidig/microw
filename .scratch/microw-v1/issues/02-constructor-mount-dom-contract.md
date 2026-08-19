# 02 — Constructor, mount, DOM contract, work-area defaults, registry

**What to build:** `new MicroW(options)` creates a fully structured window in the consumer's root the moment it runs — correct default or configured geometry, live reporting via `getState()`, and a home in the shared registry — so that a developer can place bare windows in their app with nothing but the constructor.

**Blocked by:** 01 — Scaffold: fork removal, package, build, headless test seam.

**Status:** resolved

- [x] A window mounts at construction into the chosen root (default `document.body`) and its root is fixed for life — no re-parenting.
- [x] The mounted structure is the `mcrw-*` contract: `.mcrw` with `.mcrw-header`, `.mcrw-title`, `.mcrw-body`, and structural controls present iff enabled (min/max/close default on the right). The library writes no static CSS inline — only its dynamic geometry (`left`/`top`/`width`/`height`) and the stacking `z-index`.
- [x] `x`/`y`/`width`/`height` place the window in container-relative pixels; a window created with no geometry defaults to 25% of the work-area width at 4:3, centered in the work area.
- [x] `minWidth`/`minHeight` are carried by the window (clamp enforcement lands with their consumers in 03/04).
- [x] `class` and `id` pass through onto the `.mcrw` element; `title` and `html` are honored at construction only (the header and body are consumer DOM afterwards).
- [x] The work-area measurement yields the root's padding edge (border-corrected), with no taskbar band reserved yet — the same function later feeds drag, resize, cascade, and re-clamp.
- [x] The window registers in the one shared registry (`MicroW.windows(root?)`), stamped with a monotonic `zTop` in the stacking band, and `getState()` returns the live geometry shape including the current work area.
- [x] `oncreate` fires once at construction; geometry-bearing reads come from `getState()` which is always live.

## Answer

The constructor, mount, DOM contract, work-area defaults, and registry land as a self-contained slice. `new MicroW(options)` builds the `mcrw-*` structure — `.mcrw` holding `.mcrw-header` (with `.mcrw-title` plus enabled `mcrw-btn-*` controls) then `.mcrw-body` — places it at explicit or default geometry (25% of work-area width at 4:3, centered), writes the geometry (`left`/`top`/`width`/`height`) and the banded `z-index` inline, mounts into the construction-fixed root (default `document.body`), registers in the shared per-root registry (`MicroW.windows(root?)`, monotonic `zTop`), and fires `oncreate` once. `getState()` returns the live snapshot — `{ state, focused, x, y, width, height, minWidth, minHeight, title, workArea }` — with the work area re-measured per call from the root's padding box (`clientWidth`/`clientHeight`; border-corrected, no taskbar band yet).

Notes for later tickets: geometry is written inline as _placement_ while `position: absolute`/`isolation: isolate` stay consumer CSS (the headless rule reserves inline _styling_ for z-index); `minWidth`/`minHeight` are carried but unenforced until 03/04; `state`/`focused` are pre-wired at `normal`/`false` for 05; the registry exposes enumeration only — removal is 06. 22 new tests cover the constructor slice in `test/constructor.test.ts`.
