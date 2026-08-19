# 06 — Close / destroy / destroyAll

**What to build:** Closing a window is total and leak-free from any state — the element, its registry and MRU entries, and focus are all handled — and the whole desktop can be torn down in one call, so that an application's windows never linger or strand focus.

**Blocked by:** 02 — Constructor, mount, DOM contract, work-area defaults, registry; 05 — State: minimize / maximize / restore / focus / MRU.

**Status:** resolved

- [x] `destroy()` removes the window's element and its taskbar item (the bar's gap collapses, order preserved), splices it from the registry and the focus MRU order, fires `onclose`, and works identically from `normal`, `min`, or `max`.
- [x] Destroy hands focus to the next most-recently-used non-minimized window (or, if none, leaves nothing focused); if the destroyed window was focused it blurs first.
- [x] Closing the last window leaves the registry empty and nothing mounted — a clean empty desktop, with no timer, listener, or observer left behind.
- [x] `MicroW.destroyAll()` destroys every window, returns the count, and empties the registry.
- [x] The registry returned by `MicroW.windows(root?)` reflects removals and the MRU order both during and after close, so the taskbar and z-order stay truthful.

## Answer

Close lands as one slice. `destroy()` is the window's terminal op: it removes the element, splices the window from the registry (creation order) and the focus-MRU order via the shared `unregister`, and — when the window was focused — blurs it (`onblur`) then hands focus to the next most-recently-used non-minimized window (`onfocus`) or to nobody, reusing the `blur`/`handOffFocus` primitives from 05. `onclose` fires last, after the registry already reflects the removal, so `MicroW.windows(root)` stays truthful both during and after close. `destroy()` works identically from `normal`, `min`, and `max` (no gating), is idempotent (a second call is a no-op), and cleans up an in-flight drag's document listeners so nothing leaks. The header's `mcrw-btn-close` control now calls `destroy()`. `MicroW.destroyAll()` destroys every live window across roots, returns the count, and empties the registry. 14 tests cover the slice in `test/destroy.test.ts`.

Notes for later tickets: the taskbar-item-removal half of the close contract lands with 07 (the taskbar doesn't exist yet — `unregister` is the registry hook the taskbar syncs against); `onclose` was added to `MicroWOptions` and is the exported `WindowEventCallback` type.
