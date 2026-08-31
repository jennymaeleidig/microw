import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MicroW } from "../src/index.js";
import { DEFAULT_CONTROL_LABELS } from "../src/labels.js";
import type { Taskbar, TaskbarAlign, TaskbarSide } from "../src/index.js";
import { createSeam } from "./support/seam.js";
import type { Seam } from "./support/seam.js";

describe("MicroW taskbar", () => {
  let seam: Seam;

  beforeEach(() => {
    seam = createSeam();
  });

  afterEach(() => {
    MicroW.configure({ taskbar: true });
    MicroW.destroyAll();
    seam.cleanup();
  });

  function root(): HTMLElement {
    const el = seam.document.createElement("div");
    seam.setLayout(el, { x: 0, y: 0, width: 800, height: 600 });
    seam.document.body.appendChild(el);
    return el;
  }

  function items(bar: Taskbar): HTMLElement[] {
    return [
      ...bar.element.querySelectorAll(".mcrw-taskbar-item"),
    ] as HTMLElement[];
  }

  it("mounts a .mcrw-taskbar sibling and returns a destroyable instance", () => {
    const r = root();
    const bar = MicroW.taskbar(r)!;

    expect(bar.element.classList.contains("mcrw-taskbar")).toBe(true);
    expect(r.contains(bar.element)).toBe(true);
    expect(r.querySelector(".mcrw-taskbar")).toBe(bar.element);
  });

  it("lists one item per minimizable live window with its title, in creation order", () => {
    const r = root();
    new MicroW({ root: r, title: "A" });
    new MicroW({ root: r, title: "B" });
    new MicroW({ root: r, title: "C" });
    const bar = MicroW.taskbar(r)!;

    expect(items(bar).map((el) => el.textContent)).toEqual(["A", "B", "C"]);
  });

  it("lists an item only for minimizable windows", () => {
    const r = root();
    new MicroW({ root: r, title: "minimizable" });
    new MicroW({
      root: r,
      title: "not",
      controls: { left: [], right: ["max", "close"] },
    });
    const bar = MicroW.taskbar(r)!;

    expect(items(bar).map((el) => el.textContent)).toEqual(["minimizable"]);
  });

  it("never reorders items on focus; the focused highlight moves in place", () => {
    const r = root();
    new MicroW({ root: r, title: "A" });
    const b = new MicroW({ root: r, title: "B" });
    new MicroW({ root: r, title: "C" });
    const bar = MicroW.taskbar(r)!;

    b.focus();

    expect(items(bar).map((el) => el.textContent)).toEqual(["A", "B", "C"]);
    expect(items(bar)[1].classList.contains("mcrw-taskbar-item-focused")).toBe(
      true,
    );
    expect(items(bar)[0].classList.contains("mcrw-taskbar-item-focused")).toBe(
      false,
    );
  });

  it("pointerdown on a window body moves the taskbar highlight in place", () => {
    const r = root();
    new MicroW({ root: r, title: "A" });
    const b = new MicroW({ root: r, title: "B" });
    new MicroW({ root: r, title: "C" });
    const bar = MicroW.taskbar(r)!;

    seam.pointerDown(b.element.querySelector(".mcrw-body")!, { x: 10, y: 10 });

    expect(items(bar).map((el) => el.textContent)).toEqual(["A", "B", "C"]);
    expect(items(bar)[1].classList.contains("mcrw-taskbar-item-focused")).toBe(
      true,
    );
    expect(items(bar)[0].classList.contains("mcrw-taskbar-item-focused")).toBe(
      false,
    );
  });

  it("tracks item state classes as a window minimizes and maximizes", () => {
    const r = root();
    const a = new MicroW({ root: r, title: "A" });
    const bar = MicroW.taskbar(r)!;
    const item = items(bar)[0];

    a.minimize();
    expect(item.classList.contains("mcrw-taskbar-item-min")).toBe(true);

    a.restore();
    expect(item.classList.contains("mcrw-taskbar-item-min")).toBe(false);

    a.maximize();
    expect(item.classList.contains("mcrw-taskbar-item-max")).toBe(true);
  });

  it("clicking a min item restores the window", () => {
    const r = root();
    const a = new MicroW({ root: r, title: "A" });
    const b = new MicroW({ root: r, title: "B" });
    const bar = MicroW.taskbar(r)!;

    a.focus();
    b.focus();
    b.minimize();

    items(bar)[1].click();

    expect(b.getState()).toMatchObject({ state: "normal", focused: true });
    expect(a.getState().focused).toBe(false);
  });

  it("clicking a max item focuses the window and leaves it maximized", () => {
    const r = root();
    const a = new MicroW({
      root: r,
      title: "A",
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });
    const b = new MicroW({ root: r, title: "B" });
    const bar = MicroW.taskbar(r)!;

    a.maximize();
    b.focus();
    items(bar)[0].click();

    expect(a.getState()).toMatchObject({
      state: "max",
      focused: true,
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
    expect(a.element.classList.contains("mcrw-max")).toBe(true);
    expect(b.getState().focused).toBe(false);
  });

  it("clicking a normal item focuses the window", () => {
    const r = root();
    const a = new MicroW({ root: r, title: "A" });
    const b = new MicroW({ root: r, title: "B" });
    const bar = MicroW.taskbar(r)!;

    a.focus();
    items(bar)[1].click();

    expect(b.getState().focused).toBe(true);
    expect(a.getState().focused).toBe(false);
  });

  it("collapses the gap on close and appends new windows, preserving creation order", () => {
    const r = root();
    new MicroW({ root: r, title: "A" });
    const b = new MicroW({ root: r, title: "B" });
    new MicroW({ root: r, title: "C" });
    const bar = MicroW.taskbar(r)!;

    b.destroy();
    expect(items(bar).map((el) => el.textContent)).toEqual(["A", "C"]);

    new MicroW({ root: r, title: "D" });
    expect(items(bar).map((el) => el.textContent)).toEqual(["A", "C", "D"]);
  });

  it("reserves the bar's band in getState().workArea", () => {
    const r = root();
    const win = new MicroW({ root: r });
    const bar = MicroW.taskbar(r)!;
    seam.setLayout(bar.element, { x: 0, y: 560, width: 800, height: 40 });

    expect(win.getState().workArea).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 560,
    });
  });

  it("reserves the configured side", () => {
    const r = root();
    const win = new MicroW({ root: r });
    const bar = MicroW.taskbar(r, { side: "left" })!;
    seam.setLayout(bar.element, { x: 0, y: 0, width: 40, height: 600 });

    expect(win.getState().workArea).toEqual({
      x: 40,
      y: 0,
      width: 760,
      height: 600,
    });
  });

  it("an empty bar reserves nothing", () => {
    const r = root();
    const bar = MicroW.taskbar(r)!;
    seam.setLayout(bar.element, { x: 0, y: 560, width: 800, height: 40 });
    const probe = new MicroW({ root: r, taskbar: false });

    expect(probe.getState().workArea).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
  });

  it("re-clamps a window into the reserved band when the first item appears", () => {
    const r = root();
    const bar = MicroW.taskbar(r)!;
    seam.setLayout(bar.element, { x: 0, y: 560, width: 800, height: 40 });

    const win = new MicroW({ root: r, x: 0, y: 0, width: 800, height: 600 });

    expect(win.getState()).toMatchObject({ width: 800, height: 560 });
  });

  it("re-clamps existing windows once the bar's band is laid out", () => {
    const r = root();
    const win = new MicroW({ root: r, x: 0, y: 0, width: 800, height: 600 });
    const bar = MicroW.taskbar(r)!;
    seam.setLayout(bar.element, { x: 0, y: 560, width: 800, height: 40 });

    win.focus();

    expect(win.getState()).toMatchObject({ width: 800, height: 560 });
  });

  it("destroy re-clamps maximized windows back to the full work area", () => {
    const r = root();
    const win = new MicroW({ root: r });
    win.maximize();
    const bar = MicroW.taskbar(r)!;
    seam.setLayout(bar.element, { x: 0, y: 560, width: 800, height: 40 });

    win.focus();
    expect(win.getState()).toMatchObject({ width: 800, height: 560 });

    bar.destroy();
    expect(r.querySelector(".mcrw-taskbar")).toBeNull();
    expect(win.getState()).toMatchObject({ width: 800, height: 600 });
  });

  it("sets the side, grow, and align class hooks", () => {
    const r = root();
    const bar = MicroW.taskbar(r, {
      side: "left",
      grow: "down",
      align: "end",
    })!;

    expect(bar.element.classList.contains("mcrw-taskbar-left")).toBe(true);
    expect(bar.element.classList.contains("mcrw-taskbar-grow-down")).toBe(true);
    expect(bar.element.classList.contains("mcrw-taskbar-align-end")).toBe(true);
  });

  it("emits the default side, grow, and align class hooks", () => {
    const r = root();
    const bar = MicroW.taskbar(r)!;

    expect(bar.element.classList.contains("mcrw-taskbar")).toBe(true);
    expect(bar.element.classList.contains("mcrw-taskbar-bottom")).toBe(true);
    expect(bar.element.classList.contains("mcrw-taskbar-grow-right")).toBe(
      true,
    );
    expect(bar.element.classList.contains("mcrw-taskbar-align-start")).toBe(
      true,
    );
  });

  it("defaults grow to the bar's axis", () => {
    const r = root();
    const bar = MicroW.taskbar(r, { side: "left" })!;

    expect(bar.element.classList.contains("mcrw-taskbar-grow-down")).toBe(true);
  });

  it("falls back to the in-axis grow default for an out-of-axis direction", () => {
    const r = root();
    const bar = MicroW.taskbar(r, { side: "bottom", grow: "up" })!;

    expect(bar.element.classList.contains("mcrw-taskbar-grow-right")).toBe(
      true,
    );
  });

  it("throws on an invalid side", () => {
    const r = root();
    expect(() =>
      MicroW.taskbar(r, { side: "diagonal" as TaskbarSide }),
    ).toThrow(TypeError);
  });

  it("throws on an invalid align", () => {
    const r = root();
    expect(() =>
      MicroW.taskbar(r, { align: "middle" as TaskbarAlign }),
    ).toThrow(TypeError);
  });

  it("writes no inline z-index on the bar (reference z-index is consumer CSS)", () => {
    const r = root();
    const bar = MicroW.taskbar(r)!;

    expect(bar.element.style.zIndex).toBe("");
  });

  it("per-window taskbar:false opt-out gives no item and disables minimize", () => {
    const r = root();
    new MicroW({ root: r, title: "A" });
    const b = new MicroW({ root: r, title: "B", taskbar: false });
    const bar = MicroW.taskbar(r)!;

    expect(items(bar).map((el) => el.textContent)).toEqual(["A"]);

    b.minimize();
    expect(b.getState().state).toBe("normal");
  });

  it("global disable strips min controls, restores min windows, and disables minimize", () => {
    const r = root();
    const a = new MicroW({ root: r });
    const b = new MicroW({ root: r });
    b.minimize();

    MicroW.configure({ taskbar: false });

    expect(a.element.querySelector(".mcrw-btn-min")).toBeNull();
    expect(b.element.querySelector(".mcrw-btn-min")).toBeNull();
    expect(b.getState().state).toBe("normal");

    a.minimize();
    expect(a.getState().state).toBe("normal");
  });

  it("global disable restores a min-after-max window to max, not normal", () => {
    const r = root();
    const win = new MicroW({
      root: r,
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });

    win.maximize();
    win.minimize();
    MicroW.configure({ taskbar: false });

    expect(win.getState()).toMatchObject({
      state: "max",
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
    expect(win.element.classList.contains("mcrw-max")).toBe(true);
  });

  it("global disable makes taskbar() create nothing", () => {
    const r = root();
    MicroW.configure({ taskbar: false });

    expect(MicroW.taskbar(r)).toBeNull();
    expect(r.querySelector(".mcrw-taskbar")).toBeNull();
  });

  it("global disable removes an existing taskbar", () => {
    const r = root();
    new MicroW({ root: r });
    MicroW.taskbar(r);
    expect(r.querySelector(".mcrw-taskbar")).not.toBeNull();

    MicroW.configure({ taskbar: false });

    expect(r.querySelector(".mcrw-taskbar")).toBeNull();
  });

  it("windows constructed under global disable carry no min control", () => {
    const r = root();
    MicroW.configure({ taskbar: false });

    const win = new MicroW({ root: r });

    expect(win.element.querySelector(".mcrw-btn-min")).toBeNull();
    win.minimize();
    expect(win.getState().state).toBe("normal");
  });

  it("global re-enable does not restore min controls to existing windows", () => {
    const r = root();
    const a = new MicroW({ root: r });
    MicroW.configure({ taskbar: false });
    MicroW.configure({ taskbar: true });

    expect(a.element.querySelector(".mcrw-btn-min")).toBeNull();
    a.minimize();
    expect(a.getState().state).toBe("normal");

    // Windows mounted after the re-enable get the min control back.
    const b = new MicroW({ root: r });
    expect(b.element.querySelector(".mcrw-btn-min")).not.toBeNull();
  });

  it("projects an item mounted after its window already minimized", () => {
    const r = root();
    const win = new MicroW({ root: r, title: "Late" });
    win.minimize();

    // The bar mounts into a world that already holds a minimized window;
    // its very first item must be born truthful, not wait for a transition.
    const bar = MicroW.taskbar(r)!;
    const item = items(bar)[0];
    expect(item.getAttribute("aria-expanded")).toBe("false");
    expect(item.getAttribute("aria-controls")).toBe(win.element.id);
    expect(item.classList.contains("mcrw-taskbar-item-min")).toBe(true);
  });

  it("destroyAll removes mounted taskbars", () => {
    const r = root();
    new MicroW({ root: r });
    MicroW.taskbar(r);
    expect(r.querySelector(".mcrw-taskbar")).not.toBeNull();

    MicroW.destroyAll();

    expect(r.querySelector(".mcrw-taskbar")).toBeNull();
  });
});

describe("MicroW taskbar semantics", () => {
  let seam: Seam;

  beforeEach(() => {
    seam = createSeam();
  });

  afterEach(() => {
    MicroW.setControlLabels({ ...DEFAULT_CONTROL_LABELS });
    MicroW.configure({ taskbar: true });
    MicroW.destroyAll();
    seam.cleanup();
  });

  function root(): HTMLElement {
    const el = seam.document.createElement("div");
    seam.setLayout(el, { x: 0, y: 0, width: 800, height: 600 });
    seam.document.body.appendChild(el);
    return el;
  }

  function items(bar: Taskbar): HTMLElement[] {
    return [
      ...bar.element.querySelectorAll(".mcrw-taskbar-item"),
    ] as HTMLElement[];
  }

  it("is a labeled group and the focus fallback target", () => {
    const bar = MicroW.taskbar(root())!;

    expect(bar.element.getAttribute("role")).toBe("group");
    expect(bar.element.getAttribute("aria-label")).toBe("Taskbar");
    expect(bar.element.getAttribute("tabindex")).toBe("-1");
  });

  it("labels the group from the bag at render time", () => {
    MicroW.setControlLabels({ taskbarLabel: "Window list" });
    const bar = MicroW.taskbar(root())!;

    expect(bar.element.getAttribute("aria-label")).toBe("Window list");
  });

  it("re-reads the group label on sync, so it cannot drift from item names", () => {
    const r = root();
    const win = new MicroW({ root: r, title: "A" });
    const bar = MicroW.taskbar(r)!;

    MicroW.setControlLabels({ taskbarLabel: "Window list" });
    win.focus(); // any registry change triggers a sync

    expect(bar.element.getAttribute("aria-label")).toBe("Window list");
  });

  it("renders items as native buttons", () => {
    const r = root();
    new MicroW({ root: r, title: "A" });
    const bar = MicroW.taskbar(r)!;

    for (const item of items(bar)) {
      expect(item).toBeInstanceOf(seam.window.HTMLButtonElement);
      expect((item as HTMLButtonElement).type).toBe("button");
      expect(item.hasAttribute("tabindex")).toBe(false);
    }
  });

  it("names items by the window title, or untitledWindow for title-less windows", () => {
    const r = root();
    new MicroW({ root: r, title: "A" });
    new MicroW({ root: r });
    const bar = MicroW.taskbar(r)!;

    expect(items(bar).map((el) => el.textContent)).toEqual([
      "A",
      "Untitled window",
    ]);
  });

  it("reads item names from the bag at render time", () => {
    MicroW.setControlLabels({ untitledWindow: "Unnamed window" });
    const r = root();
    new MicroW({ root: r });
    const bar = MicroW.taskbar(r)!;

    expect(items(bar)[0].textContent).toBe("Unnamed window");
  });

  it("exposes aria-expanded and aria-controls, synced across minimize and restore", () => {
    const r = root();
    const win = new MicroW({ root: r, title: "A" });
    const bar = MicroW.taskbar(r)!;
    const item = items(bar)[0];

    expect(item.getAttribute("aria-expanded")).toBe("true");
    expect(item.getAttribute("aria-controls")).toBe(win.element.id);

    win.minimize();
    expect(item.getAttribute("aria-expanded")).toBe("false");

    win.restore();
    expect(item.getAttribute("aria-expanded")).toBe("true");
  });

  it("drops the item and its aria-controls when the window is destroyed", () => {
    const r = root();
    const win = new MicroW({ root: r, title: "A" });
    const bar = MicroW.taskbar(r)!;

    win.destroy();

    expect(items(bar)).toEqual([]);
    expect(
      bar.element.querySelector(`[aria-controls="${win.element.id}"]`),
    ).toBeNull();
  });

  it("keyboard activation restores a minimized window like a click", () => {
    const r = root();
    const a = new MicroW({ root: r, title: "A" });
    const b = new MicroW({ root: r, title: "B" });
    const bar = MicroW.taskbar(r)!;

    a.focus();
    b.focus();
    b.minimize();

    // jsdom does not synthesize clicks from Enter/Space keydown; real
    // browsers do that for native buttons. Dispatching a click is exactly
    // what keyboard activation produces.
    const item = items(bar)[1];
    item.dispatchEvent(new seam.window.MouseEvent("click", { bubbles: true }));

    expect(b.getState()).toMatchObject({ state: "normal", focused: true });
  });

  it("minimizing the focused only window moves DOM focus to the taskbar", () => {
    const r = root();
    const win = new MicroW({ root: r, title: "A" });
    const bar = MicroW.taskbar(r)!;

    win.focus();
    win.minimize();

    expect(seam.document.activeElement).toBe(bar.element);
  });

  it("closing the focused last window moves DOM focus to the taskbar", () => {
    const r = root();
    const win = new MicroW({ root: r, title: "A" });
    const bar = MicroW.taskbar(r)!;

    win.focus();
    win.destroy();

    expect(seam.document.activeElement).toBe(bar.element);
  });

  it("the taskbar takes precedence over fallbackFocus in the hand-off chain", () => {
    const r = root();
    const fallback = seam.document.createElement("div");
    fallback.tabIndex = -1;
    seam.document.body.appendChild(fallback);
    const win = new MicroW({ root: r, title: "A", fallbackFocus: fallback });
    const bar = MicroW.taskbar(r)!;

    win.focus();
    win.minimize();

    expect(seam.document.activeElement).toBe(bar.element);
  });
});
