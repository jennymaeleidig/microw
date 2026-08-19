# 13 — Fix testing-wizard feedback: resize min-size and click-to-focus

**What to build:** Two fixes surfaced by the user-testing wizard. (1) Resizing any window in the demo stops at a readable minimum — no window can be dragged so small that its title or body vanishes. (2) Interacting with a window — clicking it or starting to drag it — focuses it and raises it to the top of its root, so focus follows the user's pointer, not only restore-from-taskbar.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Resizing any demo window from any of its eight handles stops at a floor where the title and body remain visible and readable — a window cannot collapse to a sliver.
- [x] Clicking (pointerdown) anywhere on a window — header or body — focuses it: it gains `mcrw-focused`, the previously focused window loses it, `onfocus`/`onblur` fire with the correct window instances, and the window rises to the top of its root.
- [x] Starting a drag on an unfocused window focuses and raises it too, so dragging a window that was behind another brings it to the front.
- [x] The taskbar's `mcrw-taskbar-item-focused` follows interactive focus in place — item order never changes.
- [x] The headless seam gains coverage for click-to-focus and drag-to-front, and the full suite, `build`, `typecheck`, and `prettier --check` stay green.

## Answer

Two fixes, one demo-side and one library-side.

**Resize floor (demo).** Every demo window now declares a minimum through the shared `win` helper — `new MicroW({ root: desktop, minWidth: 260, minHeight: 180, ...options })` — so no window resizes below a readable 260×180 (Terminal overrides to 280×160). The library's clamp already enforced `minWidth`/`minHeight` on all eight handles; the demo just never set them on most windows.

**Click-to-focus (library).** `MicroW` now focuses and raises on any primary-button `pointerdown`: an `onFocusPointerDown` handler on the `.mcrw` element covers the body and header (and bubbles from the resize handles), and the header controls `stopPropagation` and focus themselves. Focus runs through the existing `focus()` path — blur the previous window, add `mcrw-focused`, fire `onfocus`/`onblur`, raise, notify the taskbar — so the taskbar highlight follows interaction in place and dragging a background window brings it to front.

Verified: four new headless-seam tests (body click-to-focus, header drag-to-front, control focus without drag, taskbar highlight via pointer) bring the suite to 158 passing; `typecheck`, `build`, and `prettier --check` are clean.
