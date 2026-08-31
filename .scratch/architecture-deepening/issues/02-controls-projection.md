# 02 — Give the Control a model home (active projection)

Candidate 1 of the architecture review (Strong) — top recommendation. Spec: `.scratch/architecture-deepening/spec.md`.

Status: ready-for-agent
Blocked by: 01

## Files

New `src/controls.ts`. Modified: `src/microw.ts`, `src/taskbar.ts`, `src/config.ts`. Deleted: `src/control-state.ts`.

## Problem

The Control (CONTEXT.md) has no model home — it exists only as DOM nodes. `MicroW.minimizable` is a `querySelector` against the window's own implementation; `control-state.ts` is a shallow 20-line module whose "single writer of state ARIA" invariant is enforced by caller discipline across five call sites in two modules.

## Design (decided — Way B, active projection)

Design-it-twice ran two alternatives; Way B chosen because it passes the deletion test (Way A self-assessed as a lateral move: same call-site discipline, relocated).

```ts
export class WindowControls {
  constructor(
    win: MicroW,
    doc: Document,
    header: HTMLElement,
    left: ControlName[],
    right: ControlName[],
  ); // creates buttons, subscribes to the state + taskbar-config channels, projects once

  get minimizable(): boolean; // hasMin && taskbar enabled — no DOM query
  project(): void;            // mcrw-min/-max classes, max aria-pressed,
                              // every registered item's aria-expanded/aria-controls, -min/-max classes
  registerItem(item: HTMLElement): void;
  unregisterItem(item: HTMLElement): void;
  dispose(): void;            // unsubscribe, drop items
}
export function controlsOf(win: MicroW): WindowControls; // WeakMap lookup
```

Wiring:

- `MicroW` ctor: constructs `WindowControls` (absorbs `appendControls` + initial `updateControlState`); auto-id decision reads `controls.minimizable`.
- `minimize`/`maximize`/`restore`: mutate model, then `this.emitState()` (one private method calling `controls.project()`) BEFORE user callbacks. **One line per transition** — omitting it fails ARIA/class tests loudly (no fallback writer).
- `Taskbar.sync`: membership only — create/remove item buttons, `registerItem`/`unregisterItem`; owns `textContent` and `-focused`. Order rule: register first, then the taskbar identity pass — no drift window on the shared item node.
- `MicroW.configure({taskbar: false})`: `config.ts` gains `onTaskbarConfigChange(fn)` fired from `setTaskbarEnabled`; each `WindowControls` strips its min button, clears `hasMin`, re-projects. `configure` keeps only the model loop (restoring minimized windows). Re-enabling does NOT restore min buttons to existing windows — today's behaviour, preserved deliberately.
- `MicroW.destroy`: `controls.dispose()`.
- `MicroW.minimizable` getter: `this.taskbarOptIn && this.controls.minimizable`.

Deletions: `control-state.ts` (entire); `appendControls`, `applyStateClasses`, `stripMinControl` from `microw.ts`; the `updateControlState` import/calls from `taskbar.ts`.

## Accepted weaknesses

- The taskbar-config channel is a hidden event chain — accepted, documented, single subscriber. Ticket 05's channel work gives it a proper home later.
- Two writers per item node (controls: state attrs/classes; taskbar: text/`-focused`) — handled by the sync ordering rule.
- Double projection per transition (`emitState` + taskbar sync's `notifyChange`) — harmless; do not "optimize" into full event-driven diffing (rejected: re-runs on focus/lifecycle noise and deepens the hidden-chain problem).

## Acceptance

- A new state transition cannot forget its ARIA without a loud test failure.
- `minimizable` performs no DOM query.
- Existing 222 tests pass unchanged; new tests: item `aria-expanded`/`aria-controls` via `MicroW.taskbar(root)` + minimize; global-disable path via `MicroW.configure({taskbar: false})`.

## Comments
