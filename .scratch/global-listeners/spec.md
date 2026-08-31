# Global listeners: a public, global event API on MicroW

Status: ready-for-agent

Outcome of the 2026-08-31 consumer survey (repos `microft` and `yarn-spinner-runner-ts`, read with the user's approval). Vocabulary per CONTEXT.md (Window, State, Focus, Root, Mount); ADRs 0001–0010 respected, none contradicted.

## Problem Statement

Consumers who drive microw from a long-lived session — a dialogue runtime spawning windows as narrative beats, a desktop shell booting applets — cannot observe what happens to windows they did not create. Per-window callbacks are set once in the construction options: a consumer that constructs the window can hear its own `onclose`, but a consumer that must *react* to any window closing, changing State, or gaining Focus has no way to subscribe. Holding every `MicroW` instance and re-wiring options per window is construction-site plumbing that breaks the moment another party (the shell, a desktop icon, another app) creates a Window.

## Solution

Static subscription methods on `MicroW` — the class consumers already use — that fire for every Window in the library, each returning an unsubscribe function:

- `MicroW.onCreate(listener)` — a Window mounted.
- `MicroW.onState(listener)` — a Window's State changed (`win` plus its snapshot; the listener reads the settled model, never the DOM).
- `MicroW.onFocus(listener)` — model Focus moved to (or within) a Window.
- `MicroW.onClose(listener)` — a Window closed.

Listeners are plain functions receiving the affected Window; consumers filter by `win.root` if they are Root-scoped. Geometry is deliberately not observable globally — narrative and shell consumers need lifecycle, not layout.

## User Stories

1. As a dialogue-runtime author, I want to subscribe once to window creation, so that I can register narrative windows as they appear without wiring callbacks at each construction site.
2. As a dialogue-runtime author, I want to subscribe once to window close, so that a story node can advance when the player closes the note window, regardless of who created it.
3. As a dialogue-runtime author, I want to know when a window is minimized or restored, so that narrative state can track which story elements the player has set aside.
4. As a dialogue-runtime author, I want the listener to receive the affected window, so that I can correlate events with the windows my session spawned.
5. As a shell author, I want to observe all window lifecycle without wrapping or proxying the MicroW API, so that microft's Handle principle (the shell exposes the real instance) stays intact.
6. As a shell author, I want to listen globally rather than per-Root, so that I do not need one subscription per desktop Root I compose.
7. As a multi-Root consumer, I want the listener to hand me the window so I can filter by its Root, so that per-desktop logic stays in my code, not the library.
8. As a consumer, I want each subscription call to return an unsubscribe function, so that I can tear down a dialogue session's listeners cleanly.
9. As a consumer, I want to subscribe multiple listeners to the same event, so that independent subsystems (narrative, analytics, achievements) do not fight over one slot.
10. As a consumer, I want listeners to run after the model has settled, so that reading `win.getState()` inside a listener never shows a half-applied transition.
11. As a consumer, I want to know whether the window's own option callback runs before or after the global listener, so that I can reason about side effects that interact.
12. As a consumer, I want `onClose` listeners to fire during `destroyAll()` exactly as for a single `destroy()`, so that bulk teardown cannot silently skip my session cleanup.
13. As a consumer, I want to subscribe before any window exists, so that I never miss the first creation event.
14. As a consumer, I want Focus events to reflect model Focus (ADR-0010), so that listeners fire even when DOM focus went to a fallback target and never spuriously when DOM focus moves inside the focused window.
15. As a consumer, I want a State listener to distinguish `normal`, `min`, and `max` transitions, so that narrative logic can react specifically to maximize-vs-restore.
16. As a consumer, I want a documented, small listener API, so that I can hold the whole contract in my head — nine option callbacks at construction, four global statics everywhere else.
17. As a TypeScript consumer, I want listener signatures typed against the exported Window types, so that my callbacks are checked without casts.
18. As a consumer of the demo, I want the API demonstrated once, so that I can copy a working pattern rather than guess at the semantics.

## Implementation Decisions

- **Promote the registry's channels; build nothing new — except one sanctioned emit reorder.** The three channels created by ticket "06 — split the registry's change channel" (membership, state, focus) are the mechanism; the new statics are a thin public facade over them. No new events module (Q8's decision stands). `onClose` maps to unregister on the membership channel; `onCreate` to register; `onState` to the state channel; `onFocus` to the focus channel. The 2026-08-31 review found the membership channel's emit points fire before the option callbacks (register before `oncreate` in the constructor, unregister before `onclose` in destroy) — the inverse of the timing contract below. Honoring one uniform rule is worth more than a strict "no reordering": the emit points move after the option callbacks, and the taskbar (the only current membership subscriber) is verified behaviour-unchanged. This is the whole sanctioned change to existing code.
- **The statics live on `MicroW`**, matching the existing static style (`windows`, `taskbar`, `configure`, `destroyAll`). Names are camelCase multiword: `onCreate`, `onState`, `onFocus`, `onClose`.
- **Listener signature**: `(win: MicroW) => void`, except `onState`, which additionally receives the settled `WindowSnapshot`. Consumers filter by Root themselves; the library stays Root-agnostic here.
- **Each static returns an unsubscribe function**, mirroring the internal channels' shape. Multiple listeners per channel are supported; unsubscribing an already-unsubscribed function is a no-op.
- **`onClose` is its own channel**, not folded into membership: "a window closed" is the dominant narrative event and deserves a named subscription, even though it shares the unregister trigger.
- **Geometry excluded.** No global `onmove`/`onresize`. The per-window option callbacks remain the only geometry observers. Recorded as a deliberate omission, not an oversight.
- **Timing guarantees (part of the contract):**
  - Listeners fire after the model and Projection have settled for the event.
  - For a given event, the window's own option callback (`onminimize`, `onclose`, …) fires *before* the global listener — local observers see it first, the ambient layer reacts second.
  - `onCreate` fires after the construction-time `oncreate` option callback and after the Window is registered and mounted, so a listener may immediately call public methods on `win`.
  - `destroyAll()` closes windows in the same per-window order and fires the same listener sequence as individual `destroy()` calls.
  - Closing a minimized window still fires `onFocus` hand-off events exactly as today; global listeners observe them like any other Focus change.
- **Listener errors are the listener's problem.** A throwing listener propagates (fail loudly, per CODING_STANDARDS); the library neither swallows nor isolates. Documented so consumers know to guard their own callbacks — including that a throw inside `destroy()` or the constructor aborts teardown mid-way and state may be inconsistent.
- **Taskbar vs. public listener ordering is documented as subscription order.** Listeners on a channel fire in subscription order; the taskbar subscribes at its creation. Deterministic, documented, no stronger promise.
- **Subscription state is module-level, zero-dependency** — the channels already are; the facade adds no storage beyond listener lists.
- **ADR compliance**: no DOM-class contract change (ADR-0008); Focus semantics untouched (ADR-0010 — the focus channel observes the existing model-focus transitions); State model untouched (ADR-0009). The headless class contract gains statics only — additive, semver-minor.
- **Docs**: `docs/reference.md` and `README.md` gain one section ("Global listeners") with the timing guarantees spelled out; CHANGELOG entry under Unreleased.

## Testing Decisions

- **Test external behavior only**: subscribe through the public statics, drive windows through public methods, assert what listeners received and in what order. Never assert on registry internals, listener-list internals, or channel call order below the facade.
- **One seam: the public `MicroW` class contract** — the same seam the existing suite uses. No new seam is introduced; the registry channels stay private and untested directly.
- **Seam-level tests to add**:
  - Each static fires for the corresponding action (create / state transitions covering normal↔min↔max / focus move / close).
  - Unsubscribe functions stop delivery; double-unsubscribe is inert; multiple listeners all fire.
  - Ordering: option callback before global listener; `onCreate` sees a registered, mountable window; `onState` snapshot matches `getState()` at listener time.
  - `destroyAll()` equivalence with per-window `destroy()` listener sequences.
  - A throwing listener propagates (documented behavior pinned by test).
- **Prior art**: the existing callback-order and cascade-determinism tests (listener ordering with real windows); the ticket-06 seam tests (per-channel reactions driven through real windows).

## Out of Scope

- Geometry events (global `onmove`/`onresize`) — deliberately omitted.
- Root-scoped subscriptions — consumers filter by `win.root`.
- Promoting the work-area watcher or `observe.ts` to public API.
- Any change to per-window option callbacks, their signatures, or their firing order relative to Projection.
- Consumers' framework adapters (React `useMicrowEvents` etc. live in the consumer repos).
- microft/yarn-spinner integration work — their repos adopt this when it ships.

## Further Notes

- Motivating consumers (surveyed 2026-08-31): `microft` composes microw behind its Handle principle — dialogue-driven commands call the real `MicroW` API, so a standing subscription beats construction-site wiring; `yarn-spinner-runner-ts` (Yarn Spinner 3.x runtime, React adapter) drives windows as narrative beats and must branch dialogue on player-initiated closes of windows it did not create at subscription time.
- If a future consumer needs a raw "anything changed" bus, the three channels can back one without a contract change; do not add one speculatively.
- The demo is out of scope; the README example is the consumer-facing pattern.
