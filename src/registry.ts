import type { MicroW } from "./microw.js";

const Z_INDEX_BAND_MAX = 999;

const windowsByRoot = new Map<HTMLElement, MicroW[]>();
const mruByRoot = new Map<HTMLElement, MicroW[]>();

let zTop = 0;

let autoIdCounter = 0;

/** Monotonic source for auto-assigned element ids (`mcrw-win-N`, `mcrw-title-N`). */
export function nextAutoId(): number {
  autoIdCounter += 1;
  return autoIdCounter;
}

const changeListeners = new Set<() => void>();

/**
 * Subscribes to window-lifecycle changes — registry membership (register /
 * unregister) and state/focus transitions. Returns an unsubscribe function.
 */
export function onChange(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

export function notifyChange(): void {
  for (const listener of [...changeListeners]) {
    listener();
  }
}

export function register(win: MicroW): void {
  const list = windowsByRoot.get(win.root);
  if (list === undefined) {
    windowsByRoot.set(win.root, [win]);
  } else {
    list.push(win);
  }
  raise(win);
  notifyChange();
}

export function unregister(win: MicroW): void {
  removeFrom(windowsByRoot, win.root, win);
  removeFrom(mruByRoot, win.root, win);
  notifyChange();
}

function removeFrom(
  map: Map<HTMLElement, MicroW[]>,
  root: HTMLElement,
  win: MicroW,
): void {
  const list = map.get(root);
  if (list === undefined) {
    return;
  }
  const index = list.indexOf(win);
  if (index >= 0) {
    list.splice(index, 1);
  }
  if (list.length === 0) {
    map.delete(root);
  }
}

export function windowsOf(root?: HTMLElement): MicroW[] {
  if (root === undefined) {
    return [...windowsByRoot.values()].flat();
  }
  const list = windowsByRoot.get(root);
  return list === undefined ? [] : [...list];
}

export function mruOf(root: HTMLElement): MicroW[] {
  const mru = mruByRoot.get(root);
  return mru === undefined ? [] : [...mru];
}

export function raise(win: MicroW): void {
  const mru = mruByRoot.get(win.root) ?? [];
  const index = mru.indexOf(win);
  if (index >= 0) {
    mru.splice(index, 1);
  }
  mru.unshift(win);
  mruByRoot.set(win.root, mru);
  zTop += 1;
  win.element.style.zIndex = String(Math.min(zTop, Z_INDEX_BAND_MAX));
}
