# 03 — DOM focus follows the model

**What to build:** Model focus drives real DOM focus one-way, with a taskbar fallback — closing audit items 13–15. Implements ADR-0010.

**Blocked by:** 02 (the `tabindex="-1"` container is the focus target).

**Status:** done

- [x] All model `focus()` paths move real DOM focus: `element.focus({ preventScroll: true })` on the target window's container; DOM focus never feeds back into the model. Note: the taskbar-fallback clause below is exercisable only once ticket 05 lands (it assigns the taskbar its `tabindex="-1"`); its `activeElement` assertions are verified in `taskbar.test.ts` there.
- [x] New `fallbackFocus?: HTMLElement` window option; when a model hand-off finds no window (minimize of the only window, close of the focused last window), DOM focus goes to the taskbar element (given `tabindex="-1"` in ticket 05), else the `fallbackFocus` element, else a documented no-op.
- [x] `state`/`destroy`/`taskbar` tests assert `document.activeElement` after focus, minimize, restore, and last-close through the seam.
