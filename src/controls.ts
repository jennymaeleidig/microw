// SPDX-License-Identifier: CC0-1.0
import { controlLabels } from "./labels.js";
import type { ControlName, WindowState } from "./types.js";
import type { MicroW } from "./microw.js";

/**
 * The per-window Control model (CONTEXT.md) and the single writer of state
 * projection: the header control buttons, their ARIA, the window's state
 * classes, and every registered taskbar item's state ARIA and classes. The
 * window's state methods hand projection over with one `emitState()` call —
 * none of them touch projection DOM, so the DOM never lies about window
 * state.
 *
 * Control behaviour: `min` minimizes, `max` toggles between normal and max,
 * `close` closes. A globally disabled taskbar strips the min control and
 * never restores it to existing windows (documented asymmetry); windows
 * mounted while disabled simply grow no min control.
 */
export class WindowControls {
  /** Header controls, for the window to place around its title element. */
  readonly leftElements: HTMLElement[];
  readonly rightElements: HTMLElement[];

  private readonly win: MicroW;
  private minButton: HTMLButtonElement | null = null;
  private maxButton: HTMLButtonElement | null = null;
  private readonly items = new Set<HTMLElement>();

  constructor(
    win: MicroW,
    doc: Document,
    left: ControlName[],
    right: ControlName[],
    allowMin: boolean,
  ) {
    this.win = win;
    const builtLeft = buildControls(win, doc, left, allowMin);
    const builtRight = buildControls(win, doc, right, allowMin);
    this.leftElements = builtLeft.elements;
    this.rightElements = builtRight.elements;
    this.minButton = builtLeft.min ?? builtRight.min ?? null;
    this.maxButton = builtLeft.max ?? builtRight.max ?? null;
    controlsByWindow.set(win, this);
  }

  // Invariant: a min button exists only if the taskbar was globally enabled
  // at construction and no disable has stripped it since — so the reference
  // alone answers the question.
  get minimizable(): boolean {
    return this.minButton !== null;
  }

  /**
   * Projects the window's current state onto its DOM: the state classes,
   * the max control's `aria-pressed`, and every registered taskbar item.
   */
  project(): void {
    const state = this.win.getState().state;
    const element = this.win.element;
    element.classList.remove("mcrw-min", "mcrw-max");
    if (state === "min") {
      element.classList.add("mcrw-min");
    } else if (state === "max") {
      element.classList.add("mcrw-max");
    }
    this.maxButton?.setAttribute(
      "aria-pressed",
      state === "max" ? "true" : "false",
    );
    for (const item of this.items) {
      this.projectItem(item, state);
    }
  }

  /**
   * Hands a taskbar item to the projection: it is projected immediately
   * (so a freshly mounted item never lacks its state), and again on every
   * later state change.
   */
  registerItem(item: HTMLElement): void {
    this.items.add(item);
    this.projectItem(item, this.win.getState().state);
  }

  unregisterItem(item: HTMLElement): void {
    this.items.delete(item);
  }

  /**
   * Global taskbar disable: the min control poses as operable no longer.
   * Called directly by MicroW.configure's window loop — no event channel.
   * Re-enabling deliberately does not resurrect stripped controls.
   */
  disableMin(): void {
    if (this.minButton === null) {
      return;
    }
    this.minButton.remove();
    this.minButton = null;
    this.project();
  }

  /** Called by the window on destroy. */
  dispose(): void {
    this.items.clear();
  }

  private projectItem(item: HTMLElement, state: WindowState): void {
    item.classList.toggle("mcrw-taskbar-item-min", state === "min");
    item.classList.toggle("mcrw-taskbar-item-max", state === "max");
    item.setAttribute("aria-expanded", state === "min" ? "false" : "true");
    const id = this.win.element.id;
    if (id !== "") {
      item.setAttribute("aria-controls", id);
    }
  }
}

// Disabled controls are not rendered (CONTEXT.md, Control): a min control is
// grown only when the global taskbar is enabled, and it registers itself on
// the projection so `minimizable` stays a model question, not a DOM query.
function buildControls(
  win: MicroW,
  doc: Document,
  names: ControlName[],
  allowMin: boolean,
): {
  elements: HTMLButtonElement[];
  min?: HTMLButtonElement;
  max?: HTMLButtonElement;
} {
  const elements: HTMLButtonElement[] = [];
  let min: HTMLButtonElement | undefined;
  let max: HTMLButtonElement | undefined;
  for (const name of names) {
    if (name === "min" && !allowMin) {
      continue;
    }
    const el = doc.createElement("button");
    el.type = "button";
    el.className = `mcrw-btn-${name}`;
    el.setAttribute("aria-label", controlLabels()[name]);
    el.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      if (event.button === 0) {
        win.focus();
      }
    });
    if (name === "min") {
      el.addEventListener("click", () => win.minimize());
      min = el;
    } else if (name === "max") {
      // The max control's toggle-back is the only in-window control that
      // returns a max window to normal (CONTEXT.md, Control).
      el.addEventListener("click", () => {
        if (win.getState().state === "max") {
          win.restore();
        } else {
          win.maximize();
        }
      });
      max = el;
    } else if (name === "close") {
      el.addEventListener("click", () => win.destroy());
    }
    elements.push(el);
  }
  return { elements, min, max };
}

const controlsByWindow = new WeakMap<MicroW, WindowControls>();

/** The controls projection of a window; every live window has one. */
export function controlsOf(win: MicroW): WindowControls {
  const controls = controlsByWindow.get(win);
  if (controls === undefined) {
    throw new Error("MicroW: window has no controls projection");
  }
  return controls;
}
