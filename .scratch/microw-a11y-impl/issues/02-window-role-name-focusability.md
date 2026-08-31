# 02 — Window role, name, and focusability

**What to build:** The window container becomes a named, role-correct, focusable dialog — closing audit items 1–3 and 6.

**Blocked by:** 01 (label `untitledWindow` for the name fallback).

**Status:** done

- [x] Container gets `role="dialog"` and unconditional `tabindex="-1"` at creation.
- [x] `mcrw-title` gets an auto-assigned `mcrw-title-N` id when the window is titled; container gets `aria-labelledby` pointing at it.
- [x] Title-less windows get `aria-label` from the bag's `untitledWindow`; consumer-supplied `id` and title ids are never overridden (auto-ids fill gaps only).
- [x] Minimizable windows lacking a consumer id get `mcrw-win-N` (for taskbar `aria-controls` in ticket 05).
- [x] `constructor` tests assert role, both name paths, id precedence, and focusability of the container.
