# 03: Focus listener — `onFocus`

**What to build:** A consumer subscribes once and observes model Focus moving to a Window, per ADR-0010's frozen semantics: listeners fire when model focus moves (including the hand-off events when a focused minimized window closes and focus falls to the next target), and never fire when DOM focus merely moves inside the focused window. The fallback chain itself is untouched — this ticket observes existing transitions, it does not change them. Spec: `.scratch/global-listeners/spec.md`.

**Blocked by:** 01 — Lifecycle listeners (the facade pattern, subscription mechanics, and throwing-listener contract land there)

**Status:** ready-for-agent

- [ ] `MicroW.onFocus(listener)` fires when model Focus moves to a Window; the listener receives that Window.
- [ ] Focus hand-off on close of a focused/minimized window surfaces through the listener exactly like any other Focus change; closing a minimized window with no next target fires no spurious focus event.
- [ ] Moving DOM focus within the focused window fires nothing (DOM focus never feeds back, ADR-0010).
- [ ] The window's own `onfocus`/`onblur` option callbacks fire before the global listener for the same transition (the spec's uniform timing rule holds here today — pinned so it stays true).
- [ ] Subscription mechanics behave as established by ticket 01.
- [ ] Existing 222 tests pass unchanged; new tests subscribe through the public static and drive real windows (focus(), restore(), close flows).
- [ ] Reference-doc entry for the static and a changelog entry under Unreleased.
