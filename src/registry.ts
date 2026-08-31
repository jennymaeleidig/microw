import type { MicroW } from "./microw.js";
import type { WindowSnapshot } from "./types.js";

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

// One channel = one listener set, a subscribe function returning an
// unsubscribe function, and a notify that walks a snapshot (so a listener
// may unsubscribe mid-notification).
type ChannelListener = (win: MicroW) => void;

interface Channel<Args extends unknown[]> {
  subscribe(listener: (...args: Args) => void): () => void;
  notify(...args: Args): void;
}

function makeChannel<Args extends unknown[]>(): Channel<Args> {
  const listeners = new Set<(...args: Args) => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify(...args) {
      for (const listener of [...listeners]) {
        listener(...args);
      }
    },
  };
}

// Three change channels — membership (register / unregister), state
// (minimize / maximize / restore), focus (model focus moves) — so reactions
// can be declared per channel: the taskbar resyncs on membership, and updates
// one item or the highlight on state / focus without re-clamping the root.
const membership = makeChannel<[MicroW]>();
const state = makeChannel<[MicroW]>();
const focus = makeChannel<[MicroW]>();

export function onMembershipChange(listener: ChannelListener): () => void {
  return membership.subscribe(listener);
}

export function onStateChange(listener: ChannelListener): () => void {
  return state.subscribe(listener);
}

export function onFocusChange(listener: ChannelListener): () => void {
  return focus.subscribe(listener);
}

export function notifyStateChange(win: MicroW): void {
  state.notify(win);
}

export function notifyFocusChange(win: MicroW): void {
  focus.notify(win);
}

// The public lifecycle listeners (ticket "01 — lifecycle listeners"). They
// fire at the same two events as the membership channel, but at their own
// emit points — after the window's option callback — so a public listener
// never fires before the window's own observer. Library reactions settle
// first: the taskbar's channel notifies before these.
const created = makeChannel<[MicroW]>();
const closed = makeChannel<[MicroW]>();

// The public state listeners fire at the same transitions as the state
// channel, but at their own emit point — after the window's option callback
// and the taskbar's reaction — carrying the settled snapshot so a listener
// never reads a half-applied transition.
const stateSettled = makeChannel<[MicroW, WindowSnapshot]>();

export function onStateChanged(
  listener: (win: MicroW, snapshot: WindowSnapshot) => void,
): () => void {
  return stateSettled.subscribe(listener);
}

export function notifyStateChanged(
  win: MicroW,
  snapshot: WindowSnapshot,
): void {
  stateSettled.notify(win, snapshot);
}

export function onCreated(listener: ChannelListener): () => void {
  return created.subscribe(listener);
}

export function onClosed(listener: ChannelListener): () => void {
  return closed.subscribe(listener);
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
  membership.notify(win);
  created.notify(win);
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
  membership.notify(win);
  closed.notify(win);
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
