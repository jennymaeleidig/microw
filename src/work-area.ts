import { clampAxis } from "./clamp.js";
import type { Rect, TaskbarSide, WorkArea } from "./types.js";

interface Band {
  side: TaskbarSide;
  reader: () => Rect | null;
}

const bands = new Map<HTMLElement, Band>();

const workAreaListeners = new Set<() => void>();

/**
 * Subscribes to work-area changes (taskbar band add/remove, and later root/
 * viewport resize). Returns an unsubscribe function.
 */
export function onWorkAreaChange(listener: () => void): () => void {
  workAreaListeners.add(listener);
  return () => {
    workAreaListeners.delete(listener);
  };
}

export function notifyWorkAreaChange(): void {
  for (const listener of [...workAreaListeners]) {
    listener();
  }
}

/**
 * Registers (or clears) the taskbar band a root's work area is reduced by.
 * The band is read live on every work-area measurement, so it always reflects
 * the bar's current rect; a reader returning `null` reserves nothing.
 */
export function setTaskbarBand(
  root: HTMLElement,
  side: TaskbarSide,
  reader: (() => Rect | null) | null,
): void {
  if (reader === null) {
    bands.delete(root);
  } else {
    bands.set(root, { side, reader });
  }
}

/**
 * Field-wise equality for two rects (a WorkArea is structurally a Rect).
 * Change detection — the work-area watcher, the taskbar's band poll — is
 * always "measured rect vs last applied rect", so the comparison lives with
 * the measurement.
 */
export function sameRect(a: Rect, b: Rect): boolean {
  return (
    a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
  );
}

/**
 * The region of the root available to windows: its padding box, expressed in
 * container-relative coordinates (the padding edge is the containing-block
 * origin). Using `clientWidth`/`clientHeight` yields the padding box directly,
 * so a bordered root contributes no offset to window placement. A mounted
 * taskbar reduces the box on its side by the band's live rect.
 */
export function measureWorkArea(root: HTMLElement): WorkArea {
  const work: WorkArea = {
    x: 0,
    y: 0,
    width: root.clientWidth,
    height: root.clientHeight,
  };
  const band = bands.get(root);
  if (band === undefined) {
    return work;
  }
  const rect = band.reader();
  if (rect === null) {
    return work;
  }
  switch (band.side) {
    case "bottom":
      work.height = clampAxis(rect.y, 0, work.height);
      break;
    case "top":
      work.y = clampAxis(rect.y + rect.height, 0, work.height);
      work.height -= work.y;
      break;
    case "left":
      work.x = clampAxis(rect.x + rect.width, 0, work.width);
      work.width -= work.x;
      break;
    case "right":
      work.width = clampAxis(rect.x, 0, work.width);
      break;
  }
  return work;
}
