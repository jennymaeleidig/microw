import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MicroW } from "../src/index.js";
import { DEFAULT_CONTROL_LABELS } from "../src/labels.js";
import type { ControlName } from "../src/types.js";
import { createSeam } from "./support/seam.js";
import type { Seam } from "./support/seam.js";

describe("MicroW construction", () => {
  let seam: Seam;

  beforeEach(() => {
    seam = createSeam();
  });

  afterEach(() => {
    seam.cleanup();
  });

  function root(): HTMLElement {
    const el = seam.document.createElement("div");
    seam.setLayout(el, { x: 0, y: 0, width: 800, height: 600 });
    return el;
  }

  it("mounts into document.body by default", () => {
    const win = new MicroW();
    expect(win.root).toBe(seam.document.body);
    expect(seam.document.body.querySelector(".mcrw")).toBe(win.element);
  });

  it("mounts into an explicit root and keeps it fixed", () => {
    const r = root();
    const win = new MicroW({ root: r });
    expect(win.root).toBe(r);
    expect(r.querySelector(".mcrw")).toBe(win.element);
  });

  it("builds .mcrw-header then .mcrw-body in order", () => {
    const win = new MicroW({ root: root(), resizable: false });
    const children = [...win.element.children].map((el) => el.className);
    expect(children).toEqual(["mcrw-header", "mcrw-body"]);
  });

  it("header contains title then min/max/close controls by default", () => {
    const win = new MicroW({ root: root() });
    const header = win.element.querySelector(".mcrw-header");
    expect(header).not.toBeNull();
    const children = [...header!.children].map((el) => el.className);
    expect(children).toEqual([
      "mcrw-title",
      "mcrw-btn-min",
      "mcrw-btn-max",
      "mcrw-btn-close",
    ]);
  });

  it("renders controls per the controls option", () => {
    const win = new MicroW({
      root: root(),
      controls: { left: ["close"], right: ["min"] },
    });
    const header = win.element.querySelector(".mcrw-header")!;
    const children = [...header.children].map((el) => el.className);
    expect(children).toEqual(["mcrw-btn-close", "mcrw-title", "mcrw-btn-min"]);
  });

  it("renders only the title when controls are empty", () => {
    const win = new MicroW({
      root: root(),
      controls: { left: [], right: [] },
    });
    const header = win.element.querySelector(".mcrw-header")!;
    const children = [...header.children].map((el) => el.className);
    expect(children).toEqual(["mcrw-title"]);
  });

  it("rejects an unknown control", () => {
    expect(
      () =>
        new MicroW({
          root: root(),
          controls: { right: ["bogus" as ControlName] },
        }),
    ).toThrow(TypeError);
  });

  it("places a window at explicit geometry", () => {
    const win = new MicroW({
      root: root(),
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });
    expect(win.getState()).toMatchObject({
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });
  });

  it("clamps explicit geometry into the work area", () => {
    const win = new MicroW({
      root: root(),
      x: -100,
      y: -50,
      width: 300,
      height: 200,
    });
    expect(win.getState()).toMatchObject({
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
  });

  it("clamps explicit geometry past the far edge of the work area", () => {
    const win = new MicroW({
      root: root(),
      x: 700,
      y: 550,
      width: 300,
      height: 200,
    });
    expect(win.getState()).toMatchObject({
      x: 500,
      y: 400,
      width: 300,
      height: 200,
    });
  });

  it("shrinks an oversized window to fit the work area", () => {
    const win = new MicroW({
      root: root(),
      x: 0,
      y: 0,
      width: 2000,
      height: 1500,
    });
    expect(win.getState()).toMatchObject({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
  });

  it("clamps a centered window whose default size exceeds the work area", () => {
    const win = new MicroW({ root: root(), width: 2000 });
    expect(win.getState()).toMatchObject({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
  });

  it("defaults to 25% width at 4:3, centered in the work area", () => {
    const win = new MicroW({ root: root() });
    expect(win.getState()).toMatchObject({
      x: 300,
      y: 225,
      width: 200,
      height: 150,
    });
  });

  it("writes geometry as inline left/top/width/height", () => {
    const win = new MicroW({
      root: root(),
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });
    expect(win.element.style.left).toBe("10px");
    expect(win.element.style.top).toBe("20px");
    expect(win.element.style.width).toBe("300px");
    expect(win.element.style.height).toBe("200px");
  });

  it("does not inject appearance styles inline", () => {
    const win = new MicroW({ root: root() });
    expect(win.element.style.position).toBe("");
    expect(win.element.style.isolation).toBe("");
    expect(win.element.style.display).toBe("");
  });

  it("carries minWidth/minHeight in getState", () => {
    const win = new MicroW({ root: root(), minWidth: 100, minHeight: 80 });
    expect(win.getState()).toMatchObject({ minWidth: 100, minHeight: 80 });
  });

  it("leaves minWidth/minHeight unset by default", () => {
    const win = new MicroW({ root: root() });
    expect(win.getState().minWidth).toBeUndefined();
    expect(win.getState().minHeight).toBeUndefined();
  });

  it("passes class and id onto the .mcrw element", () => {
    const win = new MicroW({ root: root(), class: "panel foo", id: "win-1" });
    expect(win.element.id).toBe("win-1");
    expect(win.element.classList.contains("mcrw")).toBe(true);
    expect(win.element.classList.contains("panel")).toBe(true);
    expect(win.element.classList.contains("foo")).toBe(true);
  });

  it("sets title and html at construction", () => {
    const win = new MicroW({
      root: root(),
      title: "Hello",
      html: "<p>body</p>",
    });
    expect(win.element.querySelector(".mcrw-title")?.textContent).toBe("Hello");
    expect(win.element.querySelector(".mcrw-body")?.innerHTML).toBe(
      "<p>body</p>",
    );
    expect(win.getState().title).toBe("Hello");
  });

  it("leaves title and html empty when not provided", () => {
    const win = new MicroW({ root: root() });
    expect(win.element.querySelector(".mcrw-title")?.textContent).toBe("");
    expect(win.element.querySelector(".mcrw-body")?.innerHTML).toBe("");
  });

  it("measures the work area as the root's padding edge", () => {
    const r = seam.document.createElement("div");
    seam.setLayout(r, {
      x: 0,
      y: 0,
      width: 1000,
      height: 800,
      borderLeft: 20,
      borderTop: 10,
    });
    const win = new MicroW({ root: r });
    expect(win.getState().workArea).toEqual({
      x: 0,
      y: 0,
      width: 960,
      height: 780,
    });
  });

  it("defaults geometry against the border-corrected work area", () => {
    const r = seam.document.createElement("div");
    seam.setLayout(r, {
      x: 0,
      y: 0,
      width: 1000,
      height: 800,
      borderLeft: 20,
      borderTop: 10,
    });
    const win = new MicroW({ root: r });
    expect(win.getState()).toMatchObject({
      x: 360,
      y: 300,
      width: 240,
      height: 180,
    });
  });

  it("registers windows per root", () => {
    const a = root();
    const b = root();
    const winA = new MicroW({ root: a });
    const winB = new MicroW({ root: b });
    expect(MicroW.windows(a)).toEqual([winA]);
    expect(MicroW.windows(b)).toEqual([winB]);
  });

  it("windows() without a root returns every window", () => {
    const a = root();
    const winA = new MicroW({ root: a });
    expect(MicroW.windows()).toContain(winA);
  });

  it("stamps windows with a monotonic z-index in the band", () => {
    const r = root();
    const win1 = new MicroW({ root: r });
    const win2 = new MicroW({ root: r });
    const z1 = Number(win1.element.style.zIndex);
    const z2 = Number(win2.element.style.zIndex);
    expect(z2).toBeGreaterThan(z1);
    expect(z1).toBeGreaterThanOrEqual(1);
    expect(z2).toBeLessThanOrEqual(999);
  });

  it("fires oncreate once after the window is mounted and registered", () => {
    const oncreate = vi.fn();
    const r = root();
    const win = new MicroW({ root: r, oncreate });
    expect(oncreate).toHaveBeenCalledTimes(1);
    expect(oncreate).toHaveBeenCalledWith(win);
    expect(MicroW.windows(r)).toContain(win);
  });
});

describe("MicroW control labels", () => {
  let seam: Seam;

  beforeEach(() => {
    seam = createSeam();
  });

  afterEach(() => {
    MicroW.setControlLabels({ ...DEFAULT_CONTROL_LABELS });
    seam.cleanup();
  });

  function root(): HTMLElement {
    const el = seam.document.createElement("div");
    seam.setLayout(el, { x: 0, y: 0, width: 800, height: 600 });
    return el;
  }

  it("renders header controls as native buttons", () => {
    const win = new MicroW({ root: root() });
    for (const name of ["min", "max", "close"]) {
      const el = win.element.querySelector(`.mcrw-btn-${name}`);
      expect(el).toBeInstanceOf(seam.window.HTMLButtonElement);
      expect((el as HTMLButtonElement).type).toBe("button");
    }
  });

  it("labels controls with English defaults", () => {
    const win = new MicroW({ root: root() });
    expect(
      win.element.querySelector(".mcrw-btn-min")?.getAttribute("aria-label"),
    ).toBe("Minimize");
    expect(
      win.element.querySelector(".mcrw-btn-max")?.getAttribute("aria-label"),
    ).toBe("Maximize");
    expect(
      win.element.querySelector(".mcrw-btn-close")?.getAttribute("aria-label"),
    ).toBe("Close");
  });

  it("labels controls from the bag at render time", () => {
    MicroW.setControlLabels({ min: "Iconify", close: "Destroy" });
    const win = new MicroW({ root: root() });
    expect(
      win.element.querySelector(".mcrw-btn-min")?.getAttribute("aria-label"),
    ).toBe("Iconify");
    expect(
      win.element.querySelector(".mcrw-btn-max")?.getAttribute("aria-label"),
    ).toBe("Maximize");
    expect(
      win.element.querySelector(".mcrw-btn-close")?.getAttribute("aria-label"),
    ).toBe("Destroy");
  });

  it("labels are read at render time, not retroactively", () => {
    const before = new MicroW({ root: root() });
    MicroW.setControlLabels({ min: "Iconify" });
    const after = new MicroW({ root: root() });
    expect(
      before.element.querySelector(".mcrw-btn-min")?.getAttribute("aria-label"),
    ).toBe("Minimize");
    expect(
      after.element.querySelector(".mcrw-btn-min")?.getAttribute("aria-label"),
    ).toBe("Iconify");
  });

  it("rejects non-string label values", () => {
    expect(() =>
      MicroW.setControlLabels({ close: 42 as unknown as string }),
    ).toThrow(TypeError);
  });
});

describe("MicroW window role, name, and focusability", () => {
  let seam: Seam;

  beforeEach(() => {
    seam = createSeam();
  });

  afterEach(() => {
    MicroW.setControlLabels({ ...DEFAULT_CONTROL_LABELS });
    seam.cleanup();
  });

  function root(): HTMLElement {
    const el = seam.document.createElement("div");
    seam.setLayout(el, { x: 0, y: 0, width: 800, height: 600 });
    return el;
  }

  it("exposes role=dialog and unconditional tabindex=-1 on the container", () => {
    const win = new MicroW({ root: root() });
    expect(win.element.getAttribute("role")).toBe("dialog");
    expect(win.element.getAttribute("tabindex")).toBe("-1");
  });

  it("names a titled window via aria-labelledby pointing at the title element", () => {
    const win = new MicroW({ root: root(), title: "Hello" });
    const title = win.element.querySelector(".mcrw-title")!;
    expect(title.id).toMatch(/^mcrw-title-\d+$/);
    expect(win.element.getAttribute("aria-labelledby")).toBe(title.id);
    expect(win.element.hasAttribute("aria-label")).toBe(false);
  });

  it("auto-assigns distinct title ids to distinct windows", () => {
    const a = new MicroW({ root: root(), title: "A" });
    const b = new MicroW({ root: root(), title: "B" });
    const idA = a.element.querySelector(".mcrw-title")!.id;
    const idB = b.element.querySelector(".mcrw-title")!.id;
    expect(idA).not.toBe(idB);
  });

  it("names a title-less window from the bag's untitledWindow", () => {
    const win = new MicroW({ root: root() });
    expect(win.element.getAttribute("aria-label")).toBe("Untitled window");
    expect(win.element.hasAttribute("aria-labelledby")).toBe(false);
  });

  it("reads untitledWindow from the bag at render time", () => {
    MicroW.setControlLabels({ untitledWindow: "Unnamed window" });
    const win = new MicroW({ root: root() });
    expect(win.element.getAttribute("aria-label")).toBe("Unnamed window");
  });

  it("never overrides a consumer-supplied container id", () => {
    const win = new MicroW({ root: root(), id: "win-1", title: "Hello" });
    expect(win.element.id).toBe("win-1");
  });

  it("gives minimizable windows an auto mcrw-win id for the taskbar", () => {
    const win = new MicroW({ root: root() });
    expect(win.element.id).toMatch(/^mcrw-win-\d+$/);
  });

  it("does not give non-minimizable windows an auto mcrw-win id", () => {
    const win = new MicroW({ root: root(), taskbar: false });
    expect(win.element.id).toBe("");
  });

  it("auto ids never collide across windows", () => {
    const r = root();
    const a = new MicroW({ root: r, title: "A" });
    const b = new MicroW({ root: r, title: "B" });
    const c = new MicroW({ root: r });
    const ids = [a.element.id, b.element.id, c.element.id];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the container can receive DOM focus as a -1 tab stop", () => {
    const r = root();
    seam.document.body.appendChild(r);
    const win = new MicroW({ root: r });
    win.element.focus();
    expect(seam.document.activeElement).toBe(win.element);
  });

  it("rejects a non-element fallbackFocus", () => {
    expect(
      () =>
        new MicroW({
          root: root(),
          fallbackFocus: "not-an-element" as unknown as HTMLElement,
        }),
    ).toThrow(TypeError);
  });
});
