# 02: State listener — `onState`

**What to build:** A consumer subscribes once and observes every State transition of every Window — minimize, maximize, restore — receiving the affected Window plus its settled `WindowSnapshot` at listener time, so narrative logic can react specifically to maximize-vs-restore without holding instances or wiring per-construction callbacks. Spec: `.scratch/global-listeners/spec.md`.

**Blocked by:** 01 — Lifecycle listeners (the facade pattern, subscription mechanics, and throwing-listener contract land there)

**Status:** claimed

## Comments

- 2026-08-31: Implemented. No emit reorder was needed here: the state
  transitions already fired the taskbar's channel after the option
  callbacks, so the public emit point just extends that sequence — the
  three transitions now end in one private `notifyStateSettled()` that
  notifies the taskbar's channel, then the public listeners with the
  settled snapshot. The registry's `makeChannel` was generalized to carry
  arbitrary listener arguments so the state channel can deliver
  `(win, snapshot)`. No-op transitions (early returns) and gated windows
  (`taskbar: false`) fire nothing, pinned by test.

- [ ] `MicroW.onState(listener)` fires on every transition among `normal`, `min`, and `max`, for every Window regardless of who created it.
- [ ] The listener receives the Window and its snapshot; the snapshot equals `win.getState()` read at listener time (model and Projection settled — never a half-applied transition).
- [ ] The window's own option callback (`onminimize`/`onmaximize`/`onrestore`) fires before the global listener for the same transition.
- [ ] Subscription mechanics (unsubscribe, multi-listener, unsubscribe-function return) behave as established by ticket 01 — covered by reusing its test pattern, not re-proven exhaustively.
- [ ] Existing 222 tests pass unchanged; new tests subscribe through the public static and drive real windows.
- [ ] Reference-doc entry for the static and a changelog entry under Unreleased.
