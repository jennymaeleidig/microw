import { clampPosition, clampResize } from "./clamp.js";
import {
  configureCascade,
  placeWindow,
  recascadeRoot,
  releaseOwned,
} from "./cascade.js";
import { WindowControls, controlsOf } from "./controls.js";
import {
  nextFocusTarget,
  registerWindowFallback,
  unregisterWindowFallback,
} from "./focus-fallback.js";
import { controlLabels, setControlLabels as patchLabels } from "./labels.js";
import { observeRoot, unobserveRoot } from "./observe.js";
import {
  nextAutoId,
  notifyFocusChange,
  notifyFocused,
  notifyRegistered,
  notifyStateChanged,
  notifyStateChange,
  notifyUnregistered,
  onClosed,
  onCreated,
  onFocused,
  onStateChanged,
  raise,
  register,
  unregister,
  windowsOf,
} from "./registry.js";
import { createTaskbar, destroyTaskbars } from "./taskbar.js";
import type { Taskbar } from "./taskbar.js";
import type {
  CascadeOptions,
  ControlLabels,
  ControlName,
  ControlsOptions,
  MicroWGlobalOptions,
  MicroWOptions,
  Rect,
  ResizeDirection,
  TaskbarOptions,
  WindowEventCallback,
  WindowGeometryCallback,
  WindowSnapshot,
  WindowState,
  WorkArea,
} from "./types.js";
import { measureWorkArea } from "./work-area.js";

const DEFAULT_WIDTH_RATIO = 0.25;
const DEFAULT_ASPECT_RATIO = 0.75;
const CONTROL_NAMES = new Set(["min", "max", "close"] as const);
const RESIZE_DIRECTIONS: ResizeDirection[] = [
  "n",
  "e",
  "s",
  "w",
  "ne",
  "nw",
  "se",
  "sw",
];

const ARROW_DELTAS: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

interface NormalizedControls {
  left: ControlName[];
  right: ControlName[];
}

function resolveRoot(root: HTMLElement | undefined): HTMLElement {
  if (root === undefined) {
    return document.body;
  }
  if (!isElement(root)) {
    throw new TypeError("MicroW: `root` must be a DOM element");
  }
  return root;
}

function isElement(value: unknown): value is HTMLElement {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { nodeType?: unknown }).nodeType === 1
  );
}

function normalizeControls(
  controls: ControlsOptions | undefined,
): NormalizedControls {
  const left = controls?.left ?? [];
  const right = controls?.right ?? ["min", "max", "close"];
  for (const name of [...left, ...right]) {
    if (!CONTROL_NAMES.has(name)) {
      throw new TypeError(`MicroW: unknown control "${name}"`);
    }
  }
  return { left, right };
}

export class MicroW {
  readonly root: HTMLElement;
  readonly element: HTMLElement;

  private readonly header: HTMLElement;
  private readonly title: string | undefined;
  private readonly minWidth: number | undefined;
  private readonly minHeight: number | undefined;
  private readonly onmove: WindowGeometryCallback | undefined;
  private readonly onresize: WindowGeometryCallback | undefined;
  private readonly taskbarOptIn: boolean;
  private readonly onmaximize: WindowEventCallback | undefined;
  private readonly onminimize: WindowEventCallback | undefined;
  private readonly onrestore: WindowEventCallback | undefined;
  private readonly onclose: WindowEventCallback | undefined;
  private readonly onfocus: WindowEventCallback | undefined;
  private readonly onblur: WindowEventCallback | undefined;
  private readonly fallbackFocus: HTMLElement | undefined;
  private readonly controls: WindowControls;
  private preMax: Rect | undefined;
  // Restore needs to know whether a minimized window was max or normal.
  private preMin: Exclude<WindowState, "min"> | undefined;
  private state: WindowState = "normal";
  private focused = false;
  private destroyed = false;
  private dragCleanup: (() => void) | null = null;
  private x: number;
  private y: number;
  private width: number;
  private height: number;

  constructor(options: MicroWOptions = {}) {
    this.root = resolveRoot(options.root);
    const workArea = measureWorkArea(this.root);

    this.width = options.width ?? workArea.width * DEFAULT_WIDTH_RATIO;
    this.height = options.height ?? this.width * DEFAULT_ASPECT_RATIO;

    let x: number;
    let y: number;
    if (options.x === undefined && options.y === undefined) {
      const placed = this.placeCascade(workArea);
      if (placed !== null) {
        x = placed.x;
        y = placed.y;
        this.width = placed.width;
        this.height = placed.height;
      } else {
        x = workArea.x + (workArea.width - this.width) / 2;
        y = workArea.y + (workArea.height - this.height) / 2;
      }
    } else {
      x = options.x ?? workArea.x + (workArea.width - this.width) / 2;
      y = options.y ?? workArea.y + (workArea.height - this.height) / 2;
    }

    // Placement shares the one clamp: a window is always wholly inside its
    // work area, so construction shrinks an oversized size and pulls an
    // out-of-range position back into bounds (idempotent for cascade slots).
    const clamped = clampRect(
      { x, y, width: this.width, height: this.height },
      workArea,
    );
    this.x = clamped.x;
    this.y = clamped.y;
    this.width = clamped.width;
    this.height = clamped.height;

    this.minWidth = options.minWidth;
    this.minHeight = options.minHeight;
    this.title = options.title;
    this.onmove = options.onmove;
    this.onresize = options.onresize;
    this.onmaximize = options.onmaximize;
    this.onminimize = options.onminimize;
    this.onrestore = options.onrestore;
    this.onclose = options.onclose;
    this.onfocus = options.onfocus;
    this.onblur = options.onblur;
    if (
      options.fallbackFocus !== undefined &&
      !isElement(options.fallbackFocus)
    ) {
      throw new TypeError("MicroW: `fallbackFocus` must be a DOM element");
    }
    this.fallbackFocus = options.fallbackFocus;

    const doc = this.root.ownerDocument;
    this.element = doc.createElement("div");
    this.element.className = ["mcrw", options.class].filter(Boolean).join(" ");
    if (options.id !== undefined) {
      this.element.id = options.id;
    }
    // A dialog needs a role and a focusable container: tabindex="-1" keeps it
    // out of the tab sequence but lets focus() direct real DOM focus here.
    this.element.setAttribute("role", "dialog");
    this.element.tabIndex = -1;

    this.header = doc.createElement("div");
    this.header.className = "mcrw-header";
    // The header is the window's single keyboard surface: one tab stop whose
    // label pairs identity (title) with affordance (move hint). It hosts the
    // control buttons, so it takes no role of its own.
    this.header.tabIndex = 0;
    const labels = controlLabels();
    const headerLabel =
      options.title !== undefined ? options.title : labels.untitledWindow;
    this.header.setAttribute(
      "aria-label",
      `${headerLabel}. ${labels.moveHint}`,
    );

    const controls = normalizeControls(options.controls);
    this.taskbarOptIn = options.taskbar !== false;
    this.controls = new WindowControls(
      this,
      doc,
      controls.left,
      controls.right,
      MicroW.taskbarEnabled,
    );
    for (const el of this.controls.leftElements) {
      this.header.appendChild(el);
    }

    const titleEl = doc.createElement("div");
    titleEl.className = "mcrw-title";
    if (options.title !== undefined) {
      titleEl.textContent = options.title;
      // The accessible name comes from the visible title text.
      titleEl.id = `mcrw-title-${nextAutoId()}`;
      this.element.setAttribute("aria-labelledby", titleEl.id);
    } else {
      this.element.setAttribute("aria-label", controlLabels().untitledWindow);
    }
    this.header.appendChild(titleEl);

    for (const el of this.controls.rightElements) {
      this.header.appendChild(el);
    }
    // The initial projection: state classes, max-control ARIA — the DOM is
    // born truthful.
    this.controls.project();

    const body = doc.createElement("div");
    body.className = "mcrw-body";
    if (options.html !== undefined) {
      body.innerHTML = options.html;
    }

    this.element.appendChild(this.header);
    this.element.appendChild(body);
    this.mountResizeHandles(doc, options.resizable !== false);
    // Ticket 05's taskbar items point aria-controls here, so only windows the
    // taskbar can actually restore get the auto id; consumer ids always win.
    if (options.id === undefined && this.minimizable) {
      this.element.id = `mcrw-win-${nextAutoId()}`;
    }

    this.writeGeometry();

    this.root.appendChild(this.element);
    register(this);
    if (this.fallbackFocus !== undefined) {
      registerWindowFallback(this, this.fallbackFocus);
    }
    observeRoot(this.root);
    this.header.addEventListener("pointerdown", this.onPointerDown);
    this.header.addEventListener("keydown", this.onHeaderKeydown);
    this.element.addEventListener("pointerdown", this.onFocusPointerDown);

    options.oncreate?.(this);
    // The membership emit point: library reactions and the public lifecycle
    // listeners run only after the window's own oncreate has run.
    notifyRegistered(this);
  }

  private placeCascade(workArea: WorkArea): Rect | null {
    const pos = placeWindow(this, workArea, this.width, this.height);
    if (pos === null) {
      return null;
    }
    return clampRect(
      { ...pos, width: this.width, height: this.height },
      workArea,
    );
  }

  // The window's current geometry as a rect, so callers hand applyRect the
  // whole thing instead of rebuilding the four fields at every call site.
  private get rect(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  moveTo(x: number, y: number): this {
    if (this.isStateGated()) {
      return this;
    }
    releaseOwned(this);
    this.applyRect({ ...this.rect, x, y });
    return this;
  }

  resizeFrom(dir: ResizeDirection, delta: { dx?: number; dy?: number }): this {
    if (this.isResizeGated()) {
      return this;
    }
    releaseOwned(this);
    const rect = clampResize(
      dir,
      this.rect,
      delta.dx ?? 0,
      delta.dy ?? 0,
      measureWorkArea(this.root),
      this.minWidth,
      this.minHeight,
    );
    this.applyRect(rect);
    return this;
  }

  resizeTo(width: number, height: number): this {
    return this.resizeFrom("se", {
      dx: width - this.width,
      dy: height - this.height,
    });
  }

  getState(): WindowSnapshot {
    return {
      state: this.state,
      focused: this.focused,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      minWidth: this.minWidth,
      minHeight: this.minHeight,
      title: this.title,
      workArea: measureWorkArea(this.root),
    };
  }

  focus(): this {
    // Model focus directs DOM focus one-way (ADR-0010). Runs even when the
    // model is already focused, so drifted DOM focus is recaptured.
    this.element.focus({ preventScroll: true });
    if (this.focused) {
      return this;
    }
    for (const other of windowsOf(this.root)) {
      if (other !== this && other.focused) {
        other.blur();
      }
    }
    this.focused = true;
    this.element.classList.add("mcrw-focused");
    raise(this);
    this.onfocus?.(this);
    // The focus emit point: the taskbar reacts first, then the public
    // listeners — the window's own onfocus has already run by then.
    notifyFocusChange(this);
    notifyFocused(this);
    return this;
  }

  get minimizable(): boolean {
    return this.taskbarOptIn && this.controls.minimizable;
  }

  minimize(): this {
    if (!this.minimizable || this.state === "min") {
      return this;
    }
    this.preMin = this.state;
    this.state = "min";
    this.emitState();
    this.onminimize?.(this);
    if (this.focused) {
      this.blur();
      this.handOffFocus();
    }
    this.notifyStateSettled();
    return this;
  }

  maximize(): this {
    if (this.state === "max") {
      return this;
    }
    if (this.preMax === undefined) {
      this.preMax = {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
      };
    }
    this.fillWorkArea();
    this.state = "max";
    this.preMin = undefined;
    this.emitState();
    this.onmaximize?.(this);
    this.notifyStateSettled();
    return this;
  }

  restore(): this {
    if (this.state === "normal") {
      return this;
    }
    if (this.state === "min" && this.preMin === "max") {
      this.fillWorkArea();
      this.state = "max";
    } else {
      if (this.preMax !== undefined) {
        this.x = this.preMax.x;
        this.y = this.preMax.y;
        this.width = this.preMax.width;
        this.height = this.preMax.height;
        this.preMax = undefined;
      }
      // The invariant holds at every boundary: clamp the restored geometry
      // into the current work area, which may have shrunk while min/max.
      // Deliberately not applyRect: restore fires onrestore, never geometry
      // callbacks (ADR-0009).
      const rect = clampRect(this.rect, measureWorkArea(this.root));
      this.x = rect.x;
      this.y = rect.y;
      this.width = rect.width;
      this.height = rect.height;
      this.writeGeometry();
      this.state = "normal";
    }
    this.preMin = undefined;
    this.emitState();
    this.onrestore?.(this);
    this.focus();
    this.notifyStateSettled();
    return this;
  }

  private fillWorkArea(): void {
    const workArea = measureWorkArea(this.root);
    this.x = workArea.x;
    this.y = workArea.y;
    this.width = workArea.width;
    this.height = workArea.height;
    this.writeGeometry();
  }

  reclamp(): this {
    if (this.state === "min") {
      return this;
    }
    const workArea = measureWorkArea(this.root);
    this.applyRect({
      ...this.rect,
      width: this.state === "max" ? workArea.width : this.width,
      height: this.state === "max" ? workArea.height : this.height,
    });
    return this;
  }

  // The one placement writer: clamp into the current work area, write the
  // geometry, then fire onresize before onmove for the axes that changed.
  // moveTo, resizeFrom, reclamp, and cascade re-placement all route through
  // here, so the event order has exactly one home.
  //
  // Cascade re-placement (src/cascade.ts, type-only import discipline)
  // applies new positions through this method, so it cannot be private.
  // It is not consumer API: @internal keeps it out of the shipped .d.ts.
  /** @internal */
  applyRect(rect: Rect): void {
    const clamped = clampRect(rect, measureWorkArea(this.root));
    const moved = clamped.x !== this.x || clamped.y !== this.y;
    const resized =
      clamped.width !== this.width || clamped.height !== this.height;
    this.x = clamped.x;
    this.y = clamped.y;
    this.width = clamped.width;
    this.height = clamped.height;
    if (moved || resized) {
      this.writeGeometry();
      const fired: Rect = {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
      };
      if (resized) {
        this.onresize?.(this, fired);
      }
      if (moved) {
        this.onmove?.(this, fired);
      }
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    this.controls.dispose();
    releaseOwned(this);
    this.dragCleanup?.();
    this.dragCleanup = null;

    this.element.remove();
    unregister(this);
    if (windowsOf(this.root).length === 0) {
      unobserveRoot(this.root);
    }

    if (this.focused) {
      this.blur();
      this.handOffFocus();
    }
    // After the hand-off: it may need this window's own fallbackFocus.
    unregisterWindowFallback(this);

    this.onclose?.(this);
    // The membership emit point: library reactions and the public lifecycle
    // listeners run only after the window's own onclose has run.
    notifyUnregistered(this);
  }

  private emitState(): void {
    // One call per state transition hands projection to the controls module:
    // classes, control ARIA, and every registered taskbar item.
    this.controls.project();
  }

  // The state emit point, called last by every state transition: the taskbar
  // reacts first (its channel), then the public listeners receive the settled
  // snapshot — the window's own option callback has already run by then.
  private notifyStateSettled(): void {
    notifyStateChange(this);
    notifyStateChanged(this, this.getState());
  }

  private blur(): void {
    if (!this.focused) {
      return;
    }
    this.focused = false;
    this.element.classList.remove("mcrw-focused");
    this.onblur?.(this);
  }

  private handOffFocus(): void {
    const target = nextFocusTarget(this.root, this);
    if (target === undefined) {
      // No window and no registered fallback: the documented no-op (ADR-0010).
      return;
    }
    if (target.kind === "window") {
      target.win.focus();
      return;
    }
    target.element.focus({ preventScroll: true });
  }

  private toContainer(
    clientX: number,
    clientY: number,
  ): {
    x: number;
    y: number;
  } {
    // Per-event read: the root's rect is viewport-relative (scroll and
    // translation-only transforms cancel out); the border is subtracted so the
    // result is padding-edge-relative (container) coordinates.
    const rect = this.root.getBoundingClientRect();
    return {
      x: clientX - rect.left - this.root.clientLeft,
      y: clientY - rect.top - this.root.clientTop,
    };
  }

  private isResizeGated(): boolean {
    return (
      this.isStateGated() || this.element.classList.contains("mcrw-no-resize")
    );
  }

  private isStateGated(): boolean {
    return this.state !== "normal";
  }

  private mountResizeHandles(doc: Document, resizable: boolean): void {
    if (!resizable) {
      this.element.classList.add("mcrw-no-resize");
      return;
    }
    for (const dir of RESIZE_DIRECTIONS) {
      const handle = doc.createElement("div");
      handle.className = `mcrw-resize-${dir}`;
      handle.addEventListener("pointerdown", (event) =>
        this.onResizePointerDown(event, dir),
      );
      this.element.appendChild(handle);
    }
  }

  private startPointerDrag(
    event: PointerEvent,
    onMove: (point: { x: number; y: number }) => void,
  ): void {
    event.preventDefault();
    const doc = this.root.ownerDocument;
    const onPointerMove = (e: PointerEvent): void => {
      onMove(this.toContainer(e.clientX, e.clientY));
    };
    const onEnd = (): void => {
      doc.removeEventListener("pointermove", onPointerMove);
      doc.removeEventListener("pointerup", onEnd);
      doc.removeEventListener("pointercancel", onEnd);
      if (this.dragCleanup === onEnd) {
        this.dragCleanup = null;
      }
    };
    doc.addEventListener("pointermove", onPointerMove);
    doc.addEventListener("pointerup", onEnd);
    doc.addEventListener("pointercancel", onEnd);
    this.dragCleanup = onEnd;
  }

  // Keyboard move/resize routes through the same programmatic APIs as the
  // pointer, so clamping, state gating, resizable, and callbacks come free.
  // Only the header itself responds: keydowns bubbling from a focused control
  // button must not move the window.
  private readonly onHeaderKeydown = (event: KeyboardEvent): void => {
    if (event.target !== this.header) {
      return;
    }
    const delta = ARROW_DELTAS[event.key];
    if (delta === undefined) {
      return;
    }
    event.preventDefault();
    const step = event.shiftKey ? 100 : 10;
    const [sx, sy] = delta;
    if (event.altKey) {
      this.resizeFrom("se", { dx: sx * step, dy: sy * step });
    } else {
      this.moveTo(this.x + sx * step, this.y + sy * step);
    }
  };

  private readonly onResizePointerDown = (
    event: PointerEvent,
    dir: ResizeDirection,
  ): void => {
    if (event.button !== 0 || this.isResizeGated()) {
      return;
    }
    let last = this.toContainer(event.clientX, event.clientY);
    this.startPointerDrag(event, (point) => {
      this.resizeFrom(dir, { dx: point.x - last.x, dy: point.y - last.y });
      last = point;
    });
  };

  // Focus on the element (not just the header) so clicking the body or
  // starting any drag/resize focuses and raises the window. The controls
  // stopPropagation and focus themselves, so they don't reach this handler.
  private readonly onFocusPointerDown = (event: PointerEvent): void => {
    if (event.button === 0) {
      this.focus();
    }
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.isStateGated() || event.button !== 0) {
      return;
    }
    const start = this.toContainer(event.clientX, event.clientY);
    const offsetX = start.x - this.x;
    const offsetY = start.y - this.y;
    this.startPointerDrag(event, (point) => {
      this.moveTo(point.x - offsetX, point.y - offsetY);
    });
  };

  private writeGeometry(): void {
    // Geometry is placement, not styling: left/top/width/height are the
    // library's to write, while `position: absolute` and `isolation: isolate`
    // stay consumer CSS (the headless rule reserves inline styling for z-index).
    const style = this.element.style;
    style.left = `${Math.round(this.x)}px`;
    style.top = `${Math.round(this.y)}px`;
    style.width = `${Math.round(this.width)}px`;
    style.height = `${Math.round(this.height)}px`;
  }

  static windows(root?: HTMLElement): MicroW[] {
    return windowsOf(root);
  }

  /**
   * Subscribes to every window mount: the listener fires once per created
   * window, after the window's own `oncreate` callback, with the window
   * registered and mounted. Returns an unsubscribe function.
   */
  static onCreate(listener: (win: MicroW) => void): () => void {
    return onCreated(listener);
  }

  /**
   * Subscribes to every window close, including through `destroyAll()`: the
   * listener fires once per closed window, after the window's own `onclose`
   * callback. Returns an unsubscribe function. A throwing listener
   * propagates and aborts the destroy mid-way.
   */
  static onClose(listener: (win: MicroW) => void): () => void {
    return onClosed(listener);
  }

  /**
   * Subscribes to every state transition (minimize, maximize, restore) of
   * every window: the listener receives the window and its settled snapshot,
   * equal to `getState()` at listener time, after the window's own
   * `onminimize`/`onmaximize`/`onrestore` callback. Returns an unsubscribe
   * function.
   */
  static onState(
    listener: (win: MicroW, snapshot: WindowSnapshot) => void,
  ): () => void {
    return onStateChanged(listener);
  }

  /**
   * Subscribes to model Focus moving to every window: the listener fires
   * after the window's own `onfocus` callback (and the previous window's
   * `onblur`). Blur alone — focus moved to nothing — fires nothing, and DOM
   * focus never feeds back (ADR-0010). Returns an unsubscribe function.
   */
  static onFocus(listener: (win: MicroW) => void): () => void {
    return onFocused(listener);
  }

  // Validation-and-dispatch facade: the mode check is the consumer contract;
  // placement policy (slots, rolls, ownership, re-placement, the work-area
  // watcher) lives in cascade.ts.
  static cascade(options: CascadeOptions): void {
    const root = resolveRoot(options.root);
    if (options.mode !== "cascade" && options.mode !== "random") {
      throw new TypeError(
        `MicroW: unknown cascade mode "${String(options.mode)}"`,
      );
    }
    configureCascade(root, options.mode);
    recascadeRoot(root);
  }

  static taskbar(root?: HTMLElement, options?: TaskbarOptions): Taskbar | null {
    if (!MicroW.taskbarEnabled) {
      return null;
    }
    return createTaskbar(resolveRoot(root), options ?? {});
  }

  static setControlLabels(labels: Partial<ControlLabels>): void {
    patchLabels(labels);
  }

  static configure(options: MicroWGlobalOptions): void {
    if (options.taskbar === undefined) {
      return;
    }
    MicroW.taskbarEnabled = options.taskbar;
    if (!options.taskbar) {
      destroyTaskbars();
      for (const win of windowsOf()) {
        // Direct call, not an event channel: disable is a rare, explicit,
        // globally-scoped act, so this loop is the one honest place where
        // it reaches every window.
        controlsOf(win).disableMin();
        if (win.getState().state === "min") {
          win.restore();
        }
      }
    }
  }

  // The one global configuration: a disabled taskbar removes minimize
  // everywhere (ADR-0004 keeps it the restore affordance).
  private static taskbarEnabled = true;

  static destroyAll(): number {
    const all = windowsOf();
    for (const win of all) {
      win.destroy();
    }
    destroyTaskbars();
    return all.length;
  }
}

function clampRect(rect: Rect, workArea: WorkArea): Rect {
  const w = Math.min(rect.width, workArea.width);
  const h = Math.min(rect.height, workArea.height);
  const { x, y } = clampPosition(rect.x, rect.y, w, h, workArea);
  return { x, y, width: w, height: h };
}
