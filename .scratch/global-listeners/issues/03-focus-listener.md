# 03: Focus listener — `onFocus`

**What to build:** A consumer subscribes once and observes model Focus moving to a Window, per ADR-0010's frozen semantics: listeners fire when model focus moves (including the hand-off events when a focused minimized window closes and focus falls to the next target), and never fire when DOM focus merely moves inside the focused window. The fallback chain itself is untouched — this ticket observes existing transitions, it does not change them. Spec: `.scratch/global-listeners/spec.md`.

**Blocked by:** 01 — Lifecycle listeners (the facade pattern, subscription mechanics, and throwing-listener contract land there)

**Status:** ready-for-human (implemented, reviewed, committed)

- [x] `MicroW.onFocus(listener)` fires when model Focus moves to a Window; the listener receives that Window.
- [x] Focus hand-off on close of a focused/minimized window surfaces through the listener exactly like any other Focus change; closing a minimized window with no next target fires no spurious focus event.
- [x] Moving DOM focus within the focused window fires nothing (DOM focus never feeds back, ADR-0010).
- [x] The window's own `onfocus`/`onblur` option callbacks fire before the global listener for the same transition (the spec's uniform timing rule holds here today — pinned so it stays true).
- [x] Subscription mechanics behave as established by ticket "01 — lifecycle listeners".
- [x] Existing 222 tests pass unchanged; new tests subscribe through the public static and drive real windows (focus(), restore(), close flows).
- [x] Reference-doc entry for the static and a changelog entry under Unreleased.

## Comments

- 2026-08-31: Implemented. No emit reorder needed: `focus()` already
  notified after the `onfocus` option callback, so the public emit point
  just extends the sequence — `notifyFocusChange` (taskbar) then
  `notifyFocused` (public) at the end of `focus()`. Blur alone emits
  nothing; the subsequent focus of another window does. Element-target
  hand-offs (taskbar band fallback, a window's `fallbackFocus`) route
  through `element.focus()` and produce no public window event — an
  element is not a Window, consistent with the reference doc.
- 2026-08-31: Two-axis review: standards found the three new hunks citing
  ADR-0010 bare (fixed — title added) and the test harness triplicated
  (fixed — shared `createListenerHarness` in test support, commit
  "refactor: shared harness for the global-listener test blocks; name
  ADR-0010"). Spec review confirmed behaviour correct but unpinned on
  three edges — minimize-driven hand-off, minimized-close no-event,
  element-fallback no-event — all pinned now (commit "test: pin the
  unpinned focus edges of onFocus").

- [ ] `MicroW.onFocus(listener)` fires when model Focus moves to a Window; the listener receives that Window.
- [ ] Focus hand-off on close of a focused/minimized window surfaces through the listener exactly like any other Focus change; closing a minimized window with no next target fires no spurious focus event.
- [ ] Moving DOM focus within the focused window fires nothing (DOM focus never feeds back, ADR-0010).
- [ ] The window's own `onfocus`/`onblur` option callbacks fire before the global listener for the same transition (the spec's uniform timing rule holds here today — pinned so it stays true).
- [ ] Subscription mechanics behave as established by ticket 01.
- [ ] Existing 222 tests pass unchanged; new tests subscribe through the public static and drive real windows (focus(), restore(), close flows).
- [ ] Reference-doc entry for the static and a changelog entry under Unreleased.
