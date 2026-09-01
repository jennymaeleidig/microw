# Changelog

## Unreleased

- **Feature: global listeners — `MicroW.onCreate`, `MicroW.onClose`,
  `MicroW.onState`, `MicroW.onFocus`
  (tickets "01 — lifecycle listeners", "02 — state listener", and
  "03 — focus listener" of the global-listeners spec).** Subscribe once,
  statically, and observe every window in the library — lifecycle, State,
  and Focus — including windows created by other code and bulk teardown
  via `destroyAll()`. Each static returns an unsubscribe function;
  multiple listeners fire in subscription order. Timing contract, one
  rule everywhere: the window's own option callback fires first, then the
  library's reactions (projection, taskbar), then the global listener —
  with the model settled by then (`onState` carries the snapshot;
  `onCreate` hands you a mounted window). No-ops fire nothing: a gated
  window's `minimize()`, an already-applied transition, re-focusing the
  focused window, raw DOM focus, and blur alone. The membership emit
  point moved from the registry bookkeeping to after the option callbacks
  — the one sanctioned change to existing behaviour, with the taskbar's
  reactions verified unchanged. Geometry is deliberately not observable
  globally. A throwing listener propagates and aborts teardown mid-way
  (documented).

- **Refactor: the registry's change channel split into three
  (ticket "06 — split the registry's change channel").** Membership
  (register / unregister), state (minimize / maximize / restore), and focus
  are separate channels inside the registry module, and the taskbar declares
  its reaction to each in one place: membership resyncs the items and
  re-clamps the root; state and focus update one item or the highlight only.
  A pure focus move no longer re-clamps every window or wakes the work-area
  watchers. The registry's former single channel, `onChange`, had no external
  consumers and was fully migrated and removed; the three channels are
  internal — not exported from the package entry point. The taskbar still
  owns its band: a reaction whose laid-out band
  changed propagates the work-area change (re-clamp, then wake the
  watchers), so a band that appears, moves, or disappears is still detected
  at the next reaction.

- **Refactor: cascade re-placement consolidated into `cascade.ts`
  (ticket "05 — consolidate cascade re-placement").**
  Placement policy — slots, rolls, ownership, re-placement, and the
  work-area watcher — now reads in one file, behind two interfaces:
  "place this window" (`placeWindow`) and "re-place the windows you own"
  (`recascadeRoot`). `MicroW.cascade()` is a validation-and-dispatch
  facade. Cascade applies positions through the window's internal
  `applyRect` writer, whose visibility ticket "01 — one geometry writer"
  anticipated widening: the method is `@internal` and stripped from the
  shipped `.d.ts`, staying out of the consumer contract. Behaviour
  unchanged; the cascade determinism tests pass unchanged and now cover
  re-placement through the same interface.

- **Refactor: a registration seam for focus fallback.** The hand-off priority
  of
  [ADR-0010 — model focus directs DOM focus](docs/adr/0010-model-focus-directs-dom-focus.md)
  — MRU non-min window, then the taskbar, then a window's `fallbackFocus`,
  else a documented no-op — is now written once in a new internal
  `focus-fallback` module. Fallback targets register there: the taskbar on
  mount and unregisters on destroy, a window's `fallbackFocus` registers at
  construction and unregisters on destroy. `microw.ts` no longer imports
  `taskbar.ts` for hand-off (the statics' facade import stays); behaviour is
  unchanged, and new seam-level tests pin the ordering.

- **Refactor: the Control gets a model home (ticket "02 — give the Control a
  model home", Way B — active projection).** `src/controls.ts` is the single
  writer of state exposure: the header control buttons, the window's state
  classes, the max control's `aria-pressed`, and every registered taskbar
  item's `aria-expanded` / `aria-controls` and state classes. State
  transitions hand projection one `emitState()` call; identity (item text,
  `-focused`) stays the taskbar's to write. `control-state.ts` and the
  state-class/`stripMin` helpers are deleted; `minimizable` is a model
  question (`minButton !== null`), not a DOM query.

- **Refactor: the global taskbar flag folded into MicroW (ticket "03 —
  delete config.ts").** `config.ts` is gone; the taskbar-enabled flag is
  MicroW's private static, and ticket 02's config-change channel is replaced
  by a direct `controlsOf(win).disableMin()` call inside `MicroW.configure`'s
  disable loop — no import cycle, no hidden chain. `labels.ts` deliberately
  kept (two real consumers). Behaviour unchanged.

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
