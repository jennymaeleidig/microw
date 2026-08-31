import {
  registerFallbackTarget,
  unregisterFallbackTarget,
} from "./focus-fallback.js";
import {
  onMembershipChange,
  onFocusChange,
  onStateChange,
  windowsOf,
} from "./registry.js";
import { controlLabels } from "./labels.js";
import { controlsOf } from "./controls.js";
import { notifyWorkAreaChange, sameRect, setTaskbarBand } from "./work-area.js";
import type { MicroW } from "./microw.js";
import type {
  Rect,
  TaskbarAlign,
  TaskbarGrow,
  TaskbarOptions,
  TaskbarSide,
} from "./types.js";

const SIDES: TaskbarSide[] = ["bottom", "top", "left", "right"];
const ALIGNS: TaskbarAlign[] = ["start", "center", "end"];

function resolveSide(side: TaskbarSide | undefined): TaskbarSide {
  if (side === undefined) {
    return "bottom";
  }
  if (!SIDES.includes(side)) {
    throw new TypeError(`MicroW: unknown taskbar side "${side}"`);
  }
  return side;
}

function resolveGrow(
  side: TaskbarSide,
  grow: TaskbarGrow | undefined,
): TaskbarGrow {
  const horizontal = side === "bottom" || side === "top";
  const fallback: TaskbarGrow = horizontal ? "right" : "down";
  const inAxis: TaskbarGrow[] = horizontal ? ["right", "left"] : ["down", "up"];
  return grow !== undefined && inAxis.includes(grow) ? grow : fallback;
}

function resolveAlign(align: TaskbarAlign | undefined): TaskbarAlign {
  if (align === undefined) {
    return "start";
  }
  if (!ALIGNS.includes(align)) {
    throw new TypeError(`MicroW: unknown taskbar align "${align}"`);
  }
  return align;
}

const taskbars = new Map<HTMLElement, Taskbar>();

export function createTaskbar(
  root: HTMLElement,
  options: TaskbarOptions,
): Taskbar {
  taskbars.get(root)?.destroy();
  const taskbar = new Taskbar(root, options);
  taskbars.set(root, taskbar);
  return taskbar;
}

export function destroyTaskbars(): void {
  for (const taskbar of [...taskbars.values()]) {
    taskbar.destroy();
  }
}

export class Taskbar {
  readonly root: HTMLElement;
  readonly element: HTMLElement;

  private readonly side: TaskbarSide;
  private readonly unsubscribers: Array<() => void>;
  private readonly items = new Map<MicroW, HTMLButtonElement>();
  private lastBand: Rect | null = null;
  private destroyed = false;

  constructor(root: HTMLElement, options: TaskbarOptions = {}) {
    this.root = root;
    this.side = resolveSide(options.side);
    const grow = resolveGrow(this.side, options.grow);
    const align = resolveAlign(options.align);

    const doc = root.ownerDocument;
    this.element = doc.createElement("div");
    this.element.className = [
      "mcrw-taskbar",
      `mcrw-taskbar-${this.side}`,
      `mcrw-taskbar-grow-${grow}`,
      `mcrw-taskbar-align-${align}`,
    ].join(" ");
    // A labeled group in the accessibility tree, and ticket 03's focus
    // fallback: tabindex="-1" makes it focusable without joining the tab
    // sequence.
    this.element.setAttribute("role", "group");
    this.element.setAttribute("aria-label", controlLabels().taskbarLabel);
    this.element.tabIndex = -1;

    root.appendChild(this.element);
    registerFallbackTarget(root, this.element);
    setTaskbarBand(root, this.side, () => this.measureBand());
    // The three channel reactions, declared in one place: membership is the
    // only one that resyncs and re-clamps — a state change cannot change the
    // live set (minimizable is fixed at construction), and a focus move
    // changes no geometry.
    this.unsubscribers = [
      onMembershipChange(() => this.sync()),
      onStateChange((win) => this.updateItem(win)),
      onFocusChange(() => this.updateFocusCue()),
    ];
    this.sync();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    // The window's projection must forget its items, or a later state change
    // would write state ARIA into nodes this bar already removed.
    for (const [win, item] of this.items) {
      controlsOf(win).unregisterItem(item);
    }
    setTaskbarBand(this.root, this.side, null);
    this.element.remove();
    unregisterFallbackTarget(this.root);
    taskbars.delete(this.root);
    this.reclamp();
  }

  private measureBand(): Rect | null {
    if (this.destroyed || this.items.size === 0) {
      return null;
    }
    const rootRect = this.root.getBoundingClientRect();
    const barRect = this.element.getBoundingClientRect();
    const rect = {
      x: barRect.left - rootRect.left - this.root.clientLeft,
      y: barRect.top - rootRect.top - this.root.clientTop,
      width: barRect.width,
      height: barRect.height,
    };
    // A bar with no laid-out extent (or one collapsed to zero) reserves nothing.
    return rect.width <= 0 || rect.height <= 0 ? null : rect;
  }

  private sync(): void {
    if (this.destroyed) {
      return;
    }
    // Re-read on every sync so the group label can't drift from the item
    // names, which re-read the bag here too.
    this.element.setAttribute("aria-label", controlLabels().taskbarLabel);
    const live = windowsOf(this.root).filter((win) => win.minimizable);

    for (const [win, item] of this.items) {
      if (!live.includes(win)) {
        item.remove();
        this.items.delete(win);
        controlsOf(win).unregisterItem(item);
      }
    }

    for (const win of live) {
      let item = this.items.get(win);
      if (item === undefined) {
        item = this.root.ownerDocument.createElement("button");
        item.type = "button";
        item.className = "mcrw-taskbar-item";
        item.addEventListener("click", () => this.handleClick(win));
        this.items.set(win, item);
        this.element.appendChild(item);
        // Register first: the window's projection writes the state classes
        // and ARIA onto the fresh item; the identity pass below then adds
        // text and the focused cue.
        controlsOf(win).registerItem(item);
      }
      // Identity and focus are the taskbar's to write; state projection
      // belongs to the window's controls module.
      this.writeItem(item, win);
    }

    this.reclamp();
  }

  // The state channel's reaction: the affected item's identity and focus
  // cue, only — no item add/remove (the live set cannot have changed) and no
  // re-clamp unless the band moved (syncBand). The item's state classes and
  // ARIA were already projected by the window (emitState precedes the
  // notification); the group label is re-read so it cannot drift from the
  // item names.
  private updateItem(win: MicroW): void {
    this.syncBand();
    const item = this.items.get(win);
    if (item === undefined) {
      return;
    }
    this.writeItem(item, win);
    this.element.setAttribute("aria-label", controlLabels().taskbarLabel);
  }

  // The focus channel's reaction: move the highlight across the items, in
  // place — no resync, and for an unchanged band no re-clamp and no
  // work-area notification. Exactly one window per root is focused, so one
  // pass over the items both sets and clears the right cues. The group
  // label is re-read here for the same anti-drift reason as above.
  private updateFocusCue(): void {
    this.syncBand();
    this.element.setAttribute("aria-label", controlLabels().taskbarLabel);
    for (const [win, item] of this.items) {
      this.setCue(item, win);
    }
  }

  private writeItem(item: HTMLElement, win: MicroW): void {
    item.textContent = win.getState().title ?? controlLabels().untitledWindow;
    this.setCue(item, win);
  }

  private setCue(item: HTMLElement, win: MicroW): void {
    item.classList.toggle("mcrw-taskbar-item-focused", win.getState().focused);
  }

  // The band is the taskbar's to own: when its laid-out extent changes, that
  // is a work-area change and this bar propagates it (re-clamp, then wake
  // the work-area watchers). A reaction whose band is unchanged — a pure
  // focus move, a state flip — costs one band read and nothing else.
  private syncBand(): void {
    const band = this.measureBand();
    const last = this.lastBand;
    const unchanged =
      last === null ? band === null : band !== null && sameRect(last, band);
    if (unchanged) {
      return;
    }
    this.reclamp();
  }

  private handleClick(win: MicroW): void {
    if (win.getState().state === "min") {
      win.restore();
    } else {
      win.focus();
    }
  }

  private reclamp(): void {
    for (const win of windowsOf(this.root)) {
      win.reclamp();
    }
    this.lastBand = this.measureBand();
    notifyWorkAreaChange();
  }
}
