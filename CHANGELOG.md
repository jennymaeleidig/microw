# Changelog

## Unreleased

- **Refactor: one geometry-and-callback writer.** `moveTo`, `resizeFrom`,
  `reclamp`, and cascade re-placement all route placement through a single
  internal writer, so the clamp-then-write-then-fire order (`onresize` before
  `onmove`) lives in exactly one place. Behaviour change: geometry callbacks
  now fire only when the geometry actually changed — a no-op `moveTo`/
  `resizeFrom` no longer fires `onmove`/`onresize` (previously it fired
  unconditionally).

## v1.1 — accessibility conformance

Semver-**minor**: the `mcrw-*` class contract is unchanged and every addition
is additive — v1.0 integrations keep working. The new DOM semantics are
documented in [the Accessibility contract](docs/reference.md#2-the-accessibility-contract).

### Added

- **Named, role-correct windows.** The container is `role="dialog"` with an
  unconditional `tabindex="-1"`, named by its visible title via
  `aria-labelledby` (auto-assigned `mcrw-title-N` id on `.mcrw-title`) or, for
  title-less windows, `aria-label` ("Untitled window" by default). Minimizable
  windows without a consumer id get `mcrw-win-N` for taskbar `aria-controls`.
  Auto-ids fill gaps only — a consumer-supplied `id` always wins.
- **Real header controls.** `.mcrw-btn-min` / `-max` / `-close` are now native
  `<button type="button">` elements: tab-reachable, Enter/Space activation,
  `aria-label`s from the labels bag. Click and pointerdown behavior is
  unchanged. The max control exposes `aria-pressed` (label stays "Maximize").
- **Keyboard move and resize.** The header is the window's single tab stop
  (`tabindex="0"`): arrow keys move in 10 px steps (Shift: 100 px), Alt+arrow
  keys resize from the bottom-right corner — same clamping, gating, and
  `onmove`/`onresize` callbacks as pointer interaction. The header's
  accessible name is `"{title}. {moveHint}"`.
- **Model focus directs DOM focus**
  ([ADR-0010 — model focus directs DOM focus](docs/adr/0010-model-focus-directs-dom-focus.md)):
  `focus()` moves real DOM focus
  to the container with scrolling suppressed; DOM focus never feeds back into
  the model. Minimize/close hand-offs with no window to receive focus fall to
  the taskbar element, then to the new `fallbackFocus` window option, then do
  nothing.
- **Taskbar semantics.** The bar is a labeled group (`role="group"`,
  `aria-label`, `tabindex="-1"` as the focus-fallback target); items are
  native `<button type="button">` elements named by the window's title
  ("Untitled window" fallback) exposing `aria-expanded` (`false` ⇔ minimized)
  and `aria-controls` pointing at the window container. `-focused`/`-max`
  remain class-only.
- **`MicroW.setControlLabels({ min, max, close, moveHint, taskbarLabel, untitledWindow })`**
  — one global call for all accessibility copy; English defaults, partial
  merges, read at render time. New exported type `ControlLabels`.
- **New `fallbackFocus?: HTMLElement` window option** — receives stranded DOM
  focus when no window and no taskbar can.

### Migration

- **Style the buttons.** Controls and taskbar items render with user-agent
  button styling until you neutralize it, keyed to `.mcrw-btn-*` and
  `.mcrw-taskbar-item`. Whether a reset is required — and how much of one —
  depends on the cultivar you map against; see [The accessibility contract](docs/reference.md#2-the-accessibility-contract)
  in docs/reference.md for the per-tier requirements. Never strip the
  `aria-label`s microw sets — cultivar icon variants match through them.
- **Add focus-visible styling** on the window container, header, controls,
  taskbar, and taskbar items — the library ships no focus indication.
- **`mcrw-focused` is visual-only.** Real DOM focus follows the model now
  (ADR-0010); don't repurpose the class for behavior.
- **Tests asserting focus isolation will break** — focus is no longer
  model-only; `document.activeElement` tracks the focused window's container.
