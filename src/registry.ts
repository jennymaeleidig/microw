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

// Three change channels — membership (register / unregister), state
// (minimize / maximize / restore), focus (model focus moves) — so reactions
// can be declared per channel: the taskbar resyncs on membership, and updates
// one item or the highlight on state / focus without re-clamping the root.
type ChannelListener = (win: MicroW) => void;

const membershipListeners = new Set<ChannelListener>();
const stateListeners = new Set<ChannelListener>();
const focusListeners = new Set<ChannelListener>();

export function onMembershipChange(listener: ChannelListener): () => void {
  membershipListeners.add(listener);
  return () => {
    membershipListeners.delete(listener);
  };
}

export function onStateChange(listener: ChannelListener): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

export function onFocusChange(listener: ChannelListener): () => void {
  focusListeners.add(listener);
  return () => {
    focusListeners.delete(listener);
  };
}

function notify(listeners: Set<ChannelListener>, win: MicroW): void {
  for (const listener of [...listeners]) {
    listener(win);
  }
}

export function notifyStateChange(win: MicroW): void {
  notify(stateListeners, win);
}

export function notifyFocusChange(win: MicroW): void {
  notify(focusListeners, win);
}

function notifyMembershipChange(win: MicroW): void {
  notify(membershipListeners, win);
}

// The public lifecycle listeners (global-listeners ticket 01). They fire at
// the same two events as the membership channel, but at their own emit
// points — after the window's option callback — so a public listener never
// fires before the window's own observer. Library reactions settle first:
// the taskbar's channel notifies before these.
const createdListeners = new Set<ChannelListener>();
const closedListeners = new Set<ChannelListener>();

export function onCreated(listener: ChannelListener): () => void {
  createdListeners.add(listener);
  return () => {
    createdListeners.delete(listener);
  };
}

export function onClosed(listener: ChannelListener): () => void {
  closedListeners.add(listener);
  return () => {
    closedListeners.delete(listener);
  };
}

// Bookkeeping only — no notification. The constructor calls notifyRegistered
// once the option oncreate callback has run.
export function register(win: MicroW): void {
  const list = windowsByRoot.get(win.root);
  if (list === undefined) {
    windowsByRoot.set(win.root, [win]);
  } else {
    list.push(win);
  }
  raise(win);
}

// The membership emit point for a mount, after the option oncreate callback:
// the taskbar reacts first (its channel), then the public listeners.
export function notifyRegistered(win: MicroW): void {
  notifyMembershipChange(win);
  notify(createdListeners, win);
}

// Bookkeeping only — no notification. destroy calls notifyUnregistered once
// the option onclose callback has run.
export function unregister(win: MicroW): void {
  removeFrom(windowsByRoot, win.root, win);
  removeFrom(mruByRoot, win.root, win);
}

// The membership emit point for a close, after the option onclose callback:
// the taskbar reacts first (its channel), then the public listeners.
export function notifyUnregistered(win: MicroW): void {
  notifyMembershipChange(win);
  notify(closedListeners, win);
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
