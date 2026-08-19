import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MicroW } from "../src/index.js";
import { createSeam } from "./support/seam.js";
import type { Seam } from "./support/seam.js";

describe("MicroW state: minimize / maximize / restore / focus / MRU", () => {
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
    seam.document.body.appendChild(el);
    return el;
  }

  function minControl(win: MicroW): HTMLElement {
    return win.element.querySelector(".mcrw-btn-min")!;
  }

  function maxControl(win: MicroW): HTMLElement {
    return win.element.querySelector(".mcrw-btn-max")!;
  }

  it("minimize transitions to min, adds mcrw-min, fires onminimize, returns the instance", () => {
    const onminimize = vi.fn();
    const win = new MicroW({ root: root(), onminimize });

    const result = win.minimize();

    expect(result).toBe(win);
    expect(win.getState().state).toBe("min");
    expect(win.element.classList.contains("mcrw-min")).toBe(true);
    expect(onminimize).toHaveBeenCalledWith(win);
  });

  it("minimize leaves geometry untouched", () => {
    const win = new MicroW({
      root: root(),
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });

    win.minimize();

    expect(win.getState()).toMatchObject({
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });
  });

  it("minimize is a no-op when the min control is disabled", () => {
    const onminimize = vi.fn();
    const win = new MicroW({
      root: root(),
      controls: { left: [], right: ["max", "close"] },
      onminimize,
    });

    win.minimize();

    expect(win.getState().state).toBe("normal");
    expect(win.element.classList.contains("mcrw-min")).toBe(false);
    expect(onminimize).not.toHaveBeenCalled();
  });

  it("minimize of an unfocused window leaves the focused window alone", () => {
    const r = root();
    const a = new MicroW({ root: r });
    const b = new MicroW({ root: r });

    a.focus();
    b.minimize();

    expect(a.getState().focused).toBe(true);
    expect(b.getState()).toMatchObject({ state: "min", focused: false });
  });

  it("minimize blurs the focused window and focuses the next MRU window", () => {
    const r = root();
    const onfocus = vi.fn();
    const onblur = vi.fn();
    const a = new MicroW({ root: r, onfocus });
    const b = new MicroW({ root: r, onblur });

    b.focus();
    b.minimize();

    expect(b.getState()).toMatchObject({ state: "min", focused: false });
    expect(b.element.classList.contains("mcrw-focused")).toBe(false);
    expect(a.getState().focused).toBe(true);
    expect(a.element.classList.contains("mcrw-focused")).toBe(true);
    expect(onblur).toHaveBeenCalledWith(b);
    expect(onfocus).toHaveBeenCalledWith(a);
  });

  it("minimize with no other window leaves nothing focused", () => {
    const r = root();
    const win = new MicroW({ root: r });

    win.focus();
    win.minimize();

    expect(win.getState()).toMatchObject({ state: "min", focused: false });
    expect(MicroW.windows(r).every((w) => !w.getState().focused)).toBe(true);
  });

  it("minimize hand-off skips minimized windows", () => {
    const r = root();
    const a = new MicroW({ root: r });
    const b = new MicroW({ root: r });

    a.minimize();
    b.focus();
    b.minimize();

    expect(a.getState()).toMatchObject({ state: "min", focused: false });
    expect(b.getState()).toMatchObject({ state: "min", focused: false });
  });

  it("minimize from max transitions to min, dropping mcrw-max", () => {
    const win = new MicroW({
      root: root(),
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });

    win.maximize();
    win.minimize();

    expect(win.getState().state).toBe("min");
    expect(win.element.classList.contains("mcrw-max")).toBe(false);
    expect(win.element.classList.contains("mcrw-min")).toBe(true);
  });

  it("maximize fills the work area and remembers the pre-max geometry", () => {
    const onmaximize = vi.fn();
    const win = new MicroW({
      root: root(),
      x: 10,
      y: 20,
      width: 300,
      height: 200,
      onmaximize,
    });

    const result = win.maximize();

    expect(result).toBe(win);
    expect(win.getState()).toMatchObject({
      state: "max",
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
    expect(win.element.classList.contains("mcrw-max")).toBe(true);
    expect(onmaximize).toHaveBeenCalledWith(win);

    win.restore();
    expect(win.getState()).toMatchObject({
      state: "normal",
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });
  });

  it("maximize is a no-op when already max", () => {
    const onmaximize = vi.fn();
    const win = new MicroW({ root: root(), onmaximize });

    win.maximize();
    win.maximize();

    expect(onmaximize).toHaveBeenCalledTimes(1);
  });

  it("restore returns a min window to normal and focuses it", () => {
    const r = root();
    const onrestore = vi.fn();
    const a = new MicroW({ root: r });
    const b = new MicroW({ root: r, onrestore });

    a.focus();
    b.minimize();

    const result = b.restore();

    expect(result).toBe(b);
    expect(b.getState()).toMatchObject({ state: "normal", focused: true });
    expect(b.element.classList.contains("mcrw-min")).toBe(false);
    expect(a.getState().focused).toBe(false);
    expect(onrestore).toHaveBeenCalledWith(b);
  });

  it("restore from min-after-max returns to max, still remembering pre-max geometry", () => {
    const win = new MicroW({
      root: root(),
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });

    win.maximize();
    win.minimize();
    win.restore();

    expect(win.getState()).toMatchObject({
      state: "max",
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
    expect(win.element.classList.contains("mcrw-max")).toBe(true);

    win.restore();
    expect(win.getState()).toMatchObject({
      state: "normal",
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });
    expect(win.element.classList.contains("mcrw-max")).toBe(false);
  });

  it("onrestore fires once on min-after-max restore, with the window in max", () => {
    const onrestore = vi.fn();
    const win = new MicroW({
      root: root(),
      x: 10,
      y: 20,
      width: 300,
      height: 200,
      onrestore,
    });

    win.maximize();
    win.minimize();
    win.restore();

    expect(onrestore).toHaveBeenCalledTimes(1);
    expect(onrestore).toHaveBeenCalledWith(win);
    expect(win.getState().state).toBe("max");
  });

  it("re-maximize after min keeps the original pre-max geometry", () => {
    const win = new MicroW({
      root: root(),
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });

    win.maximize();
    win.minimize();
    win.maximize();
    win.restore();

    expect(win.getState()).toMatchObject({
      state: "normal",
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });
  });

  it("restore from max clamps the pre-max geometry into a shrunken work area", () => {
    const r = root();
    const win = new MicroW({
      root: r,
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });

    win.maximize();
    seam.setLayout(r, { x: 0, y: 0, width: 200, height: 150 });
    win.restore();

    expect(win.getState()).toMatchObject({
      state: "normal",
      x: 0,
      y: 0,
      width: 200,
      height: 150,
    });
  });

  it("restore from min clamps stale geometry into a shrunken work area", () => {
    const r = root();
    const win = new MicroW({
      root: r,
      x: 300,
      y: 200,
      width: 300,
      height: 200,
    });

    win.minimize();
    seam.setLayout(r, { x: 0, y: 0, width: 400, height: 300 });
    win.restore();

    expect(win.getState()).toMatchObject({
      state: "normal",
      x: 100,
      y: 100,
      width: 300,
      height: 200,
    });
  });

  it("restore from normal is a no-op", () => {
    const onrestore = vi.fn();
    const win = new MicroW({ root: root(), onrestore });

    win.restore();

    expect(win.getState().state).toBe("normal");
    expect(onrestore).not.toHaveBeenCalled();
  });

  it("focus raises the window, fires onfocus, and tracks mcrw-focused", () => {
    const r = root();
    const onfocus = vi.fn();
    const a = new MicroW({ root: r, onfocus });
    const b = new MicroW({ root: r });
    const zB = Number(b.element.style.zIndex);

    a.focus();

    expect(a.getState().focused).toBe(true);
    expect(a.element.classList.contains("mcrw-focused")).toBe(true);
    expect(Number(a.element.style.zIndex)).toBeGreaterThan(zB);
    expect(onfocus).toHaveBeenCalledWith(a);
  });

  it("focus blurs the previously focused window", () => {
    const r = root();
    const onblur = vi.fn();
    const a = new MicroW({ root: r });
    const b = new MicroW({ root: r, onblur });

    b.focus();
    a.focus();

    expect(b.getState().focused).toBe(false);
    expect(b.element.classList.contains("mcrw-focused")).toBe(false);
    expect(onblur).toHaveBeenCalledWith(b);
    expect(a.getState().focused).toBe(true);
  });

  it("focus is idempotent when already focused", () => {
    const onfocus = vi.fn();
    const win = new MicroW({ root: root(), onfocus });

    win.focus();
    const z = win.element.style.zIndex;
    win.focus();

    expect(onfocus).toHaveBeenCalledTimes(1);
    expect(win.element.style.zIndex).toBe(z);
  });

  it("pointerdown on a window body focuses it, raises it, and blurs the previous", () => {
    const r = root();
    const onfocus = vi.fn();
    const onblur = vi.fn();
    const a = new MicroW({ root: r, onblur });
    const b = new MicroW({ root: r, onfocus });
    a.focus();
    const zA = Number(a.element.style.zIndex);
    const bodyB = b.element.querySelector(".mcrw-body")!;

    seam.pointerDown(bodyB, { x: 10, y: 10 });

    expect(b.getState().focused).toBe(true);
    expect(b.element.classList.contains("mcrw-focused")).toBe(true);
    expect(a.getState().focused).toBe(false);
    expect(a.element.classList.contains("mcrw-focused")).toBe(false);
    expect(Number(b.element.style.zIndex)).toBeGreaterThan(zA);
    expect(onfocus).toHaveBeenCalledWith(b);
    expect(onblur).toHaveBeenCalledWith(a);
  });

  it("starting a header drag focuses and raises the window", () => {
    const r = root();
    const a = new MicroW({ root: r, x: 10, y: 10, width: 300, height: 200 });
    const b = new MicroW({ root: r, x: 400, y: 10, width: 300, height: 200 });
    a.focus();
    const zA = Number(a.element.style.zIndex);
    const headerB = b.element.querySelector(".mcrw-header")!;

    seam.pointerDown(headerB, { x: 420, y: 30 });
    seam.pointerMove(headerB, { x: 440, y: 50 });
    seam.pointerUp(headerB, { x: 440, y: 50 });

    expect(b.getState().focused).toBe(true);
    expect(a.getState().focused).toBe(false);
    expect(Number(b.element.style.zIndex)).toBeGreaterThan(zA);
    expect(b.getState()).toMatchObject({ x: 420, y: 30 });
  });

  it("a minimized window can still be the focused one", () => {
    const win = new MicroW({ root: root() });

    win.minimize();
    win.focus();

    expect(win.getState()).toMatchObject({ state: "min", focused: true });
    expect(win.element.classList.contains("mcrw-min")).toBe(true);
    expect(win.element.classList.contains("mcrw-focused")).toBe(true);
  });

  it("a maximized window can still be the focused one", () => {
    const win = new MicroW({ root: root() });

    win.focus();
    win.maximize();

    expect(win.getState()).toMatchObject({ state: "max", focused: true });
    expect(win.element.classList.contains("mcrw-max")).toBe(true);
    expect(win.element.classList.contains("mcrw-focused")).toBe(true);
  });

  it("focus is model state, never real DOM focus", () => {
    const win = new MicroW({ root: root() });

    win.focus();

    expect(win.getState().focused).toBe(true);
    expect(seam.document.activeElement).not.toBe(win.element);
    expect(win.element.contains(seam.document.activeElement as Node)).toBe(
      false,
    );
  });

  it("getState reports state and focused across transitions", () => {
    const win = new MicroW({
      root: root(),
      x: 5,
      y: 6,
      width: 100,
      height: 80,
    });

    expect(win.getState()).toMatchObject({ state: "normal", focused: false });
    win.focus();
    expect(win.getState()).toMatchObject({ state: "normal", focused: true });
    win.maximize();
    expect(win.getState()).toMatchObject({ state: "max", focused: true });
    win.restore();
    expect(win.getState()).toMatchObject({ state: "normal", focused: true });
    win.minimize();
    expect(win.getState()).toMatchObject({ state: "min", focused: false });
  });

  it("clicking the min control minimizes the window", () => {
    const win = new MicroW({ root: root() });

    minControl(win).click();

    expect(win.getState().state).toBe("min");
    expect(win.element.classList.contains("mcrw-min")).toBe(true);
  });

  it("the max control toggles normal <-> max", () => {
    const win = new MicroW({
      root: root(),
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });
    const max = maxControl(win);

    max.click();
    expect(win.getState()).toMatchObject({ state: "max", x: 0, y: 0 });

    max.click();
    expect(win.getState()).toMatchObject({
      state: "normal",
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });
  });

  it("pointerdown on a control does not start a drag", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const control = maxControl(win);

    seam.pointerDown(control, { x: 150, y: 110 });
    seam.pointerMove(control, { x: 300, y: 300 });
    seam.pointerUp(control, { x: 300, y: 300 });

    expect(win.getState()).toMatchObject({ x: 100, y: 100 });
  });

  it("pointerdown on a control focuses and raises the window without dragging", () => {
    const r = root();
    const a = new MicroW({ root: r, x: 10, y: 10, width: 300, height: 200 });
    const b = new MicroW({ root: r, x: 400, y: 10, width: 300, height: 200 });
    a.focus();
    const zA = Number(a.element.style.zIndex);
    const control = maxControl(b);

    seam.pointerDown(control, { x: 420, y: 20 });
    seam.pointerMove(control, { x: 500, y: 300 });
    seam.pointerUp(control, { x: 500, y: 300 });

    expect(b.getState().focused).toBe(true);
    expect(a.getState().focused).toBe(false);
    expect(Number(b.element.style.zIndex)).toBeGreaterThan(zA);
    expect(b.getState()).toMatchObject({ x: 400, y: 10 });
  });

  it("moveTo is a no-op when minimized or maximized", () => {
    const win = new MicroW({
      root: root(),
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });

    win.maximize();
    win.moveTo(50, 60);
    expect(win.getState()).toMatchObject({
      state: "max",
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });

    win.restore();
    win.minimize();
    win.moveTo(50, 60);
    expect(win.getState()).toMatchObject({ state: "min", x: 10, y: 20 });
  });

  it("programmatic resize is a no-op outside normal", () => {
    const win = new MicroW({
      root: root(),
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });

    win.maximize();
    win.resizeFrom("e", { dx: 100 });
    win.resizeTo(100, 100);
    expect(win.getState()).toMatchObject({
      state: "max",
      width: 800,
      height: 600,
    });
  });

  it("drag is a no-op when maximized", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    win.maximize();
    const header = win.element.querySelector(".mcrw-header")!;

    seam.pointerDown(header, { x: 100, y: 100 });
    seam.pointerMove(header, { x: 200, y: 200 });
    seam.pointerUp(header, { x: 200, y: 200 });

    expect(win.getState()).toMatchObject({
      state: "max",
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
  });

  it("pointer resize is a no-op when maximized", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    win.maximize();
    const handle = win.element.querySelector(".mcrw-resize-e")!;

    seam.pointerDown(handle, { x: 800, y: 300 });
    seam.pointerMove(handle, { x: 900, y: 300 });
    seam.pointerUp(handle, { x: 900, y: 300 });

    expect(win.getState()).toMatchObject({
      state: "max",
      width: 800,
      height: 600,
    });
  });

  it("state callbacks fire with the window instance only", () => {
    const onminimize = vi.fn();
    const onmaximize = vi.fn();
    const onrestore = vi.fn();
    const win = new MicroW({
      root: root(),
      onminimize,
      onmaximize,
      onrestore,
    });

    win.maximize();
    expect(onmaximize).toHaveBeenCalledWith(win);

    win.minimize();
    expect(onminimize).toHaveBeenCalledWith(win);

    win.restore();
    expect(onrestore).toHaveBeenCalledWith(win);
  });
});
