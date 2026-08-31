# 01: Lifecycle listeners — `onCreate` & `onClose`

**What to build:** A consumer subscribes once (statically, on `MicroW`) and hears every Window in the library mount and every Window close — including windows created by other parties and windows closed via `destroyAll()`. Each subscription returns an unsubscribe function; multiple listeners per event all fire. This ticket establishes the whole public-facade pattern the later listener tickets extend, plus the lifecycle timing guarantees. Spec: `.scratch/global-listeners/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human (implemented, reviewed, committed)

- [x] `MicroW.onCreate(listener)` fires after the construction-time `oncreate` option callback, with a Window that is registered and mounted (the listener can immediately call public methods on it).
- [x] `MicroW.onClose(listener)` fires when a Window closes via `destroy()` and via `destroyAll()`; `destroyAll()` fires the same per-window sequence as individual destroys.
- [x] For a given close, the window's own `onclose` option callback fires before the global listener.
- [x] Each static returns an unsubscribe function; unsubscribing stops delivery, double-unsubscribe is inert, multiple listeners all fire.
- [x] The membership channel's emit points are reordered to after the option callbacks (register after `oncreate`, unregister after `onclose`) — the one sanctioned change to existing code, per the spec; the taskbar's behaviour is verified unchanged by the existing suite.
- [x] Subscribing before any window exists captures the first creation event (no missed initial event).
- [x] A throwing listener propagates (fail loudly); the behavior is pinned by a test and documented, including that a throw during `destroy()` or construction aborts teardown mid-way.
- [x] Existing 222 tests pass unchanged; new seam-level tests subscribe through the public statics and drive real windows (no registry-internals assertions).
- [x] Reference-doc entries for the two statics (stub is fine; the full "Global listeners" section is ticket 04) and a changelog entry under Unreleased.

## Comments

- 2026-08-31: Implemented. Design delta on the reorder AC: the membership
  *bookkeeping* (z-index raise, MRU, unobserve accounting) stays at its
  original call sites — moving it would have entangled the focus hand-off
  and the unobserveRoot check with the notification order. Only the *emit
  point* moved: registry's `register`/`unregister` now do bookkeeping only,
  and the constructor/destroy call `notifyRegistered`/`notifyUnregistered`
  after the option callbacks. The membership channel (taskbar) and the new
  public lifecycle listeners are notified at those emit points, library
  reactions first, public listeners last. The full suite (239 tests,
  including every taskbar sync test) passes unchanged. New tests in
  `test/global-listeners.test.ts` drive the public statics only.

## Comments

- [ ] `MicroW.onCreate(listener)` fires after the construction-time `oncreate` option callback, with a Window that is registered and mounted (the listener can immediately call public methods on it).
- [ ] `MicroW.onClose(listener)` fires when a Window closes via `destroy()` and via `destroyAll()`; `destroyAll()` fires the same per-window sequence as individual destroys.
- [ ] For a given close, the window's own `onclose` option callback fires before the global listener.
- [ ] Each static returns an unsubscribe function; unsubscribing stops delivery, double-unsubscribe is inert, multiple listeners all fire.
- [ ] The membership channel's emit points are reordered to after the option callbacks (register after `oncreate`, unregister after `onclose`) — the one sanctioned change to existing code, per the spec; the taskbar's behaviour is verified unchanged by the existing suite.
- [ ] Subscribing before any window exists captures the first creation event (no missed initial event).
- [ ] A throwing listener propagates (fail loudly); the behavior is pinned by a test and documented, including that a throw during `destroy()` or construction aborts teardown mid-way.
- [ ] Existing 222 tests pass unchanged; new seam-level tests subscribe through the public statics and drive real windows (no registry-internals assertions).
- [ ] Reference-doc entries for the two statics (stub is fine; the full "Global listeners" section is ticket 04) and a changelog entry under Unreleased.
