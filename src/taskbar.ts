import { onChange, windowsOf } from "./registry.js";
import { notifyWorkAreaChange, setTaskbarBand } from "./work-area.js";
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
  private readonly unsubscribe: () => void;
  private readonly items = new Map<MicroW, HTMLElement>();
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

    root.appendChild(this.element);
    setTaskbarBand(root, this.side, () => this.measureBand());
    this.unsubscribe = onChange(() => this.sync());
    this.sync();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.unsubscribe();
    setTaskbarBand(this.root, this.side, null);
    this.element.remove();
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
    const live = windowsOf(this.root).filter((win) => win.minimizable);

    for (const [win, item] of this.items) {
      if (!live.includes(win)) {
        item.remove();
        this.items.delete(win);
      }
    }

    for (const win of live) {
      let item = this.items.get(win);
      if (item === undefined) {
        item = this.root.ownerDocument.createElement("div");
        item.className = "mcrw-taskbar-item";
        item.addEventListener("click", () => this.handleClick(win));
        this.items.set(win, item);
        this.element.appendChild(item);
      }
      const state = win.getState();
      item.textContent = state.title ?? "";
      item.classList.toggle("mcrw-taskbar-item-min", state.state === "min");
      item.classList.toggle("mcrw-taskbar-item-max", state.state === "max");
      item.classList.toggle("mcrw-taskbar-item-focused", state.focused);
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
    notifyWorkAreaChange();
  }
}
