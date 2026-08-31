# Keyboard move and resize (root cause E)

Type: grilling
Status: resolved

## Question

What is the keyboard alternative for moving and resizing windows — the #1
impact gap (WCAG 2.1.1, audit items 24–26)?

Decide at minimum:

- Which element is the keyboard entry point for both operations (focusable
  header with `tabindex="0"` is the audit's suggestion; per-handle splitter
  semantics on all eight resize handles is the alternative).
- Move model: arrows on the focused header (step size, modifiers for large
  steps, interaction with `moveTo` clamping).
- Resize model: one shared mechanism from the focused header (direction
  semantics per corner bias?) vs focusable handles with
  `role="separator"`/`aria-valuenow` per the Window Splitter pattern — or
  both (splitter semantics as a follow-up).
- What is exposed to AT while dragging/resizing by pointer, if anything.

The audit's recommendation and evidence live in
`docs/aria-conformance-audit.md` (root cause E, items 24–26); the checklist
requirements are in `docs/aria-conformance-criteria.md`. Record the CSS
impact note (new focusable element, focus styles) per standing preference.

## Answer

Decided 2026-07 (grilling session, all four sub-decisions agreed):

- **Entry point**: the header is the single keyboard surface — one
  `tabindex="0"` tab stop per window. Splitter semantics (`role="separator"`
  + `aria-valuenow`) on the eight resize handles are **deferred** as an
  advisory follow-up, not silently dropped; eight extra tab stops per window
  were judged an AT regression.
- **Move**: plain arrow keys move via the existing `moveTo` path (same
  clamping, same `onmove`); **Alt+Arrows resize** via `resizeFrom`, anchored
  at the bottom-right corner (matches `resizeTo`'s SE anchor). State gating
  (normal windows only) is inherited from the programmatic APIs.
- **Steps**: base 10px; holding **Shift** multiplies ×10 (100px), for both
  move and resize.
- **AT exposure**: no new roles (the header already hosts the control
  buttons). The header carries an instruction-bearing `aria-label`:
  "{title}. Arrow keys to move, Alt+arrow keys to resize." No live geometry
  announcements (no `aria-live`/`aria-valuenow`) in v1.1.
- **CSS impact** (v1.1 additive; `mcrw-*` class contract unchanged): the
  header becomes focusable — consumers/cultivars must give it a visible
  focus style; this joins the consumer contract in
  [06-consumer-a11y-contract](06-consumer-a11y-contract.md).
- **i18n coupling**: the label text is UI copy, so it shares whatever
  configurable-labels mechanism ticket 02 decides for the control names.

The implementation keys off the existing `moveTo`/`resizeFrom` APIs — no
new geometry code, only an event surface on the header.
