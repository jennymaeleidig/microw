# 11 — General documentation

**What to build:** A developer can pick up microw's docs and use it end to end: the class contract, the geometry and work-area rules, the state model, the taskbar's class hooks with recipe CSS, and the full API reference — all in microw's own words, with no reference to WinBox or any other library.

**Blocked by:** 05 — State: minimize / maximize / restore / focus / MRU; 12 — User-testing wizard: launch demo, prompt to test; 13 — Fix testing-wizard feedback: resize min-size and click-to-focus.

**Status:** resolved

- [x] The `mcrw-*` class contract is documented: window structure (`.mcrw`, header/title/body), the eight resize handles, the `mcrw-btn-*` controls, the state classes (`mcrw-min`/`mcrw-max`/`mcrw-focused`, `mcrw-no-resize`), and which parts are structural versus presentational — headless: all styling is consumer CSS.
- [x] The root-geometry and work-area contract is documented: root must be `position: relative` + `isolation: isolate`, container-relative coordinates, translation-only transforms allowed and scale/rotate forbidden, border correction, and the always-wholly-in-work-area invariant.
- [x] The state model is documented: `normal`/`min`/`max` mutually exclusive, focus the only orthogonal state, `minimize`/`maximize`/`restore` semantics (including focus-handoff, the resize/drag no-op outside `normal`, and that minimize is a no-op on non-minimizable windows).
- [x] The taskbar is documented with its `side`/`grow`/`align` class semantics, the per-window opt-out and global disable, and a reference recipe (e.g. a bottom bar) the consumer can copy — the contract, not a shipped theme.
- [x] The full API surface is referenced: `new MicroW(options)`, every chainable method, `getState()`'s return shape, the callback family (state/lifecycle callbacks receive the window instance; `onmove`/`onresize` receive the full new rect `{ x, y, width, height }`), and the statics (`taskbar`, `windows`, `destroyAll`, `configure`, `cascade`).
- [x] The docs contain no mention of WinBox, its idioms, or a migration mapping — microw's behavior stands on its own terms.

## Answer

A new `docs/reference.md` carries the complete, end-to-end contract, and the README points to it.

**`docs/reference.md`** documents, in microw's own vocabulary: the headless `mcrw-*` class contract (window DOM tree, the eight resize handles in compass order, `mcrw-btn-*` controls, state classes, and the structural-versus-presentational split — only `.mcrw-title` is presentational); the root-geometry and work-area rules (`position: relative` + `isolation: isolate`, container-relative padding-edge coordinates, border correction, translation-only transforms with `scale`/`rotate` forbidden, and the always-wholly-in-work-area invariant with re-clamping); the state model (`normal`/`min`/`max` mutually exclusive, focus the only orthogonal state, full `minimize`/`maximize`/`restore` semantics including focus-handoff, the no-op gate outside `normal`, and non-minimizable windows); the taskbar (`side`/`grow`/`align` hooks, per-window opt-out, global disable, and a copyable bottom-bar recipe); cascade; and the full API reference (constructor options, chainable methods, `getState()` shape, the callback family, the five statics, and every exported type).

**`README.md`** gains a single blockquote linking to the reference; it remains the entry point.

No mention of WinBox or any other library. Both files pass `prettier --check`; the full suite (161 tests) and `typecheck` stay green.
