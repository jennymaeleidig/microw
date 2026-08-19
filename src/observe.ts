import { windowsOf } from "./registry.js";
import { notifyWorkAreaChange } from "./work-area.js";
import type { MicroW } from "./microw.js";

interface Observation {
  observer: ResizeObserver | null;
  onResize: (() => void) | null;
  view: Window | null;
}

const observations = new WeakMap<HTMLElement, Observation>();
const pending = new Set<MicroW>();
let flushScheduled = false;

/**
 * Starts watching a root so its windows re-clamp when the root's box changes.
 * Element roots use a ResizeObserver; `document.body` roots listen for the
 * window resize event (RO observes element boxes, not the viewport). Both are
 * platform APIs, so the zero-dependency claim holds.
 */
export function observeRoot(root: HTMLElement): void {
  if (observations.has(root)) {
    return;
  }
  const doc = root.ownerDocument;
  if (root === doc.body) {
    const view = doc.defaultView;
    if (view === null) {
      return;
    }
    const onResize = (): void => handleResize(root);
    view.addEventListener("resize", onResize);
    observations.set(root, { observer: null, onResize, view });
  } else {
    const observer = new ResizeObserver((entries) => {
      if (entries.some((entry) => entry.target === root)) {
        handleResize(root);
      }
    });
    observer.observe(root);
    observations.set(root, { observer, onResize: null, view: null });
  }
}

export function unobserveRoot(root: HTMLElement): void {
  const observation = observations.get(root);
  if (observation === undefined) {
    return;
  }
  observation.observer?.disconnect();
  if (observation.onResize !== null) {
    observation.view?.removeEventListener("resize", observation.onResize);
  }
  observations.delete(root);
}

function handleResize(root: HTMLElement): void {
  for (const win of windowsOf(root)) {
    pending.add(win);
  }
  scheduleFlush();
}

// Coalesces the whole resize response to one flush per delivery burst: the
// browser already delivers ResizeObserver and window-resize at most once per
// frame, so deduplicating pending work across one microtask collapses any
// same-tick duplicates without an rAF layer.
function scheduleFlush(): void {
  if (flushScheduled) {
    return;
  }
  flushScheduled = true;
  queueMicrotask(flush);
}

function flush(): void {
  flushScheduled = false;
  // Re-cascade before re-clamp so library-owned windows land in fresh slots
  // first; the re-clamp then finds them already in-bounds and stays silent.
  notifyWorkAreaChange();
  const wins = [...pending];
  pending.clear();
  for (const win of wins) {
    if (windowsOf(win.root).includes(win)) {
      win.reclamp();
    }
  }
}
