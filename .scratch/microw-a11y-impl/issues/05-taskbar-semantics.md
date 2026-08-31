# 05 — Taskbar semantics and focus fallback target

**What to build:** The taskbar becomes a labeled group of real buttons that expose minimized state — closing audit items 19–23 — and serves as ticket 03's focus fallback element.

**Blocked by:** 01, 02, 03 (labels bag; the `mcrw-win-N` container ids its `aria-controls` points at; the fallback contract it implements).

**Status:** done

- [x] Taskbar element gets `role="group"` + `aria-label` from `taskbarLabel`, and `tabindex="-1"` (the focus fallback target).
- [x] Items render as native `<button type="button" class="mcrw-taskbar-item">`; the title text is the accessible name; title-less windows use `untitledWindow`.
- [x] Items expose `aria-expanded` (false ⇔ minimized) + `aria-controls` → the window container's id, written from `sync()` via the shared `updateControlState()` helper; keyboard activation = existing `handleClick`.
- [x] `-focused`/`-max` remain class-only; plain tab sequence in creation order; no roving tabindex.
- [x] `taskbar` tests assert element type, names, expanded/controls sync across minimize/restore/destroy, group labeling, and keyboard activation parity.
