# 04 — Keyboard move and resize

**What to build:** The header as the single keyboard surface for window movement — closing audit items 24–26, the audit's #1 impact gap.

**Blocked by:** 01 (the header's `moveHint` label), 02 (container focusability), 03 (DOM focus can reach the header).

**Status:** done

- [x] Header gets `tabindex="0"` and `aria-label` = "{title}. {moveHint}"; no new role (it hosts the control buttons).
- [x] Arrow keys move 10px via `moveTo`; Alt+arrows resize from the bottom-right corner via `resizeFrom`; Shift multiplies ×10 — all clamping, state gating, and `onmove`/`onresize` parity inherited from the programmatic APIs.
- [x] Pointer drag/resize behavior unchanged; no `aria-live`/`aria-valuenow` (deferred).
- [x] Add a `fireKeydown` helper to `test/support/seam.ts`, following the existing pointer-helper pattern (the spec's only seam addition).
- [x] `move-drag`/`resize` tests add keyboard cases via the seam's `fireKeydown` helper: step sizes, clamping, callback parity, and that minimized/maximized windows are gated identically to pointer paths.
- [x] Title-less windows use `untitledWindow` from the labels bag in place of `{title}` in the header's `aria-label` (no ". Arrow keys…" leading dot).
