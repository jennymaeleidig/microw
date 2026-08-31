# Taskbar items as semantic buttons (root cause D)

Type: grilling
Status: resolved

## Question

Taskbar items are bare, click-only divs with class-only state — so a
minimized window is permanently unrecoverable for keyboard and AT users,
the harshest consequence in the audit (WCAG 2.1.1 + 4.1.2; audit items
19–23). Decide:

- Item element: native `<button>` (name comes free from the title
  textContent) vs `role="button"` + `tabindex="0"` + Enter/Space → existing
  `handleClick`.
- State exposure: `aria-expanded` + `aria-controls` vs `aria-pressed` for
  the minimized state — and how `-focused` state is exposed, if at all
  (ties into the model-focus vs DOM-focus distinction from root cause C).
- Toolbar semantics for the bar itself: `role="toolbar"` + `aria-label`
  (audit item 19, advisory), and what the label is / where it's configured.
- Ordering/roving tabindex if many items, or plain tab sequence for v1.

Evidence: `docs/aria-conformance-audit.md` root cause D, with the exact
taskbar.ts call sites. Record the CSS impact note.

## Answer

Decided 2026-07 (grilling session, all four sub-decisions agreed):

- **Element**: native `<button type="button">` keeping the
  `mcrw-taskbar-item` class — the accessible name comes free from the title
  text. Same consumer reset note as ticket 02, recorded in
  [06-consumer-a11y-contract](06-consumer-a11y-contract.md).
- **State exposure**: `aria-expanded` (false ⇔ minimized; true for
  normal/max) + `aria-controls` → the window container's id, auto-assigned
  (`mcrw-win-N`) when a minimizable window lacks one. Written from the
  existing `sync()` path via the same `updateControlState()` helper pattern
  ticket 02 established. `aria-pressed` rejected: clicking an
  already-focused non-minimized item is not a toggle.
- **`-focused` and `-max` stay class-only**, documented: DOM focus (per
  ADR-0010) carries the semantic announcement; `-focused` is a visual cue
  only. No `aria-current` in v1.1.
- **Bar semantics**: `role="group"` + `aria-label` from the labels bag
  (`taskbarLabel`, English default "Taskbar"); plain tab sequence in
  creation order, no roving tabindex — `role="toolbar"` + arrow-key pattern
  explicitly deferred. Title-less windows get a fallback name from the
  labels bag (`untitledWindow`, English default "Untitled window"), which
  joins the `setControlLabels` mechanism from ticket 02.
- **CSS impact** (v1.1 additive): native-button reset for
  `mcrw-taskbar-item`; focus-visible on items; class contract unchanged.
