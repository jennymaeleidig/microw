import { mruOf } from "./registry.js";
import type { MicroW } from "./microw.js";

// The ADR-0010 hand-off chain, written once: when a focused window minimizes
// or closes, focus goes to the most-recently-used non-minimized window of the
// root, else to a registered fallback target, else nowhere (the documented
// no-op). Fallback targets register here — the taskbar per-root on mount, a
// window's `fallbackFocus` per-window at construction — so microw.ts never
// needs to know who the targets are.

const rootTargets = new Map<HTMLElement, HTMLElement>();
const windowTargets = new Map<MicroW, HTMLElement>();

export function registerFallbackTarget(
  root: HTMLElement,
  element: HTMLElement,
): void {
  rootTargets.set(root, element);
}

export function unregisterFallbackTarget(root: HTMLElement): void {
  rootTargets.delete(root);
}

export function registerWindowFallback(
  win: MicroW,
  element: HTMLElement,
): void {
  windowTargets.set(win, element);
}

export function unregisterWindowFallback(win: MicroW): void {
  windowTargets.delete(win);
}

export type FocusTarget =
  { kind: "window"; win: MicroW } | { kind: "element"; element: HTMLElement };

/**
 * The next hand-off target for `root` when `from` gives up focus: an MRU
 * non-minimized window, else the root's registered fallback target (the
 * taskbar), else `from`'s own `fallbackFocus`, else `undefined` (no-op).
 */
export function nextFocusTarget(
  root: HTMLElement,
  from: MicroW,
): FocusTarget | undefined {
  const next = mruOf(root).find(
    (win) => win !== from && win.getState().state !== "min",
  );
  if (next !== undefined) {
    return { kind: "window", win: next };
  }
  const registered = rootTargets.get(root);
  if (registered !== undefined) {
    return { kind: "element", element: registered };
  }
  const fallback = windowTargets.get(from);
  if (fallback !== undefined) {
    return { kind: "element", element: fallback };
  }
  return undefined;
}
