import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MicroW } from "../src/index.js";
import { createSeam } from "./support/seam.js";
import type { Seam } from "./support/seam.js";

describe("MicroW re-clamping on root/viewport resize", () => {
  let seam: Seam;

  beforeEach(() => {
    seam = createSeam();
  });

  afterEach(() => {
    MicroW.destroyAll();
    seam.cleanup();
  });

  function root(width = 800, height = 600): HTMLElement {
    const el = seam.document.createElement("div");
    seam.setLayout(el, { x: 0, y: 0, width, height });
    seam.document.body.appendChild(el);
    return el;
  }

  // Lets the microtask-scheduled re-clamp flush before asserting.
  function tick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  it("re-clamps windows of an element root when it resizes", async () => {
    const r = root();
    const win = new MicroW({
      root: r,
      x: 600,
      y: 400,
      width: 200,
      height: 200,
    });

    seam.setLayout(r, { x: 0, y: 0, width: 500, height: 500 });
    seam.triggerResizeObserver();
    await tick();

    expect(win.getState()).toMatchObject({
      x: 300,
      y: 300,
      width: 200,
      height: 200,
    });
  });

  it("re-clamps windows of document.body on window resize", async () => {
    seam.setLayout(seam.document.body, { x: 0, y: 0, width: 800, height: 600 });
    const win = new MicroW({ x: 600, y: 400, width: 200, height: 200 });

    seam.setLayout(seam.document.body, { x: 0, y: 0, width: 500, height: 500 });
    seam.fireWindowResize();
    await tick();

    expect(win.getState()).toMatchObject({ x: 300, y: 300 });
  });

  it("shrinks oversized windows to fit but never grows them back", async () => {
    const r = root();
    const win = new MicroW({
      root: r,
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });

    seam.setLayout(r, { x: 0, y: 0, width: 500, height: 400 });
    seam.triggerResizeObserver();
    await tick();
    expect(win.getState()).toMatchObject({
      x: 0,
      y: 0,
      width: 500,
      height: 400,
    });

    seam.setLayout(r, { x: 0, y: 0, width: 800, height: 600 });
    seam.triggerResizeObserver();
    await tick();
    expect(win.getState()).toMatchObject({ width: 500, height: 400 });
  });

  it("re-fits a maximized window in both directions", async () => {
    const r = root();
    const win = new MicroW({
      root: r,
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });
    win.maximize();
    expect(win.getState()).toMatchObject({ width: 800, height: 600 });

    seam.setLayout(r, { x: 0, y: 0, width: 400, height: 300 });
    seam.triggerResizeObserver();
    await tick();
    expect(win.getState()).toMatchObject({
      state: "max",
      width: 400,
      height: 300,
    });

    seam.setLayout(r, { x: 0, y: 0, width: 1000, height: 800 });
    seam.triggerResizeObserver();
    await tick();
    expect(win.getState()).toMatchObject({
      state: "max",
      width: 1000,
      height: 800,
    });
  });

  it("leaves minimized windows untouched on resize", async () => {
    const r = root();
    const win = new MicroW({
      root: r,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    win.minimize();

    seam.setLayout(r, { x: 0, y: 0, width: 300, height: 200 });
    seam.triggerResizeObserver();
    await tick();

    expect(win.getState()).toMatchObject({
      state: "min",
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
  });

  it("re-cascades library-owned windows when the root resizes", async () => {
    const r = root();
    MicroW.cascade({ root: r, mode: "cascade" });
    const a = new MicroW({ root: r, width: 100, height: 100 });
    const b = new MicroW({ root: r, width: 100, height: 100 });
    const c = new MicroW({ root: r, width: 100, height: 100 });
    expect(c.getState()).toMatchObject({ x: 26, y: 26 });

    seam.setLayout(r, { x: 0, y: 0, width: 120, height: 120 });
    seam.triggerResizeObserver();
    await tick();

    expect(a.getState()).toMatchObject({ x: 0, y: 0 });
    expect(b.getState()).toMatchObject({ x: 13, y: 13 });
    expect(c.getState()).toMatchObject({ x: 0, y: 0 });
  });

  it("coalesces re-clamp callbacks to once per window per frame", async () => {
    seam.setLayout(seam.document.body, { x: 0, y: 0, width: 800, height: 600 });
    const onmove = vi.fn();
    const win = new MicroW({ x: 600, y: 0, width: 200, height: 200, onmove });

    seam.setLayout(seam.document.body, { x: 0, y: 0, width: 700, height: 600 });
    seam.fireWindowResize();
    seam.setLayout(seam.document.body, { x: 0, y: 0, width: 500, height: 600 });
    seam.fireWindowResize();
    seam.setLayout(seam.document.body, { x: 0, y: 0, width: 400, height: 600 });
    seam.fireWindowResize();
    await tick();

    expect(onmove).toHaveBeenCalledTimes(1);
    expect(win.getState().x).toBe(200);
  });

  it("coalesces re-cascade callbacks on the window-resize path", async () => {
    seam.setLayout(seam.document.body, { x: 0, y: 0, width: 800, height: 600 });
    MicroW.cascade({ mode: "random" });
    const onmove = vi.fn();
    const win = new MicroW({ width: 100, height: 100, onmove });

    seam.setLayout(seam.document.body, { x: 0, y: 0, width: 700, height: 600 });
    seam.fireWindowResize();
    seam.setLayout(seam.document.body, { x: 0, y: 0, width: 500, height: 500 });
    seam.fireWindowResize();
    seam.setLayout(seam.document.body, { x: 0, y: 0, width: 300, height: 300 });
    seam.fireWindowResize();
    await tick();

    expect(onmove).toHaveBeenCalledTimes(1);
    const s = win.getState();
    expect(s.x).toBeGreaterThanOrEqual(0);
    expect(s.y).toBeGreaterThanOrEqual(0);
    expect(s.x + s.width).toBeLessThanOrEqual(300);
    expect(s.y + s.height).toBeLessThanOrEqual(300);
  });

  it("keeps windows inside the work area as a taskbar band moves on resize", async () => {
    const r = root();
    const win = new MicroW({
      root: r,
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
    const bar = MicroW.taskbar(r)!;
    seam.setLayout(bar.element, { x: 0, y: 560, width: 800, height: 40 });
    win.focus();
    expect(win.getState()).toMatchObject({ width: 800, height: 560 });

    seam.setLayout(r, { x: 0, y: 0, width: 800, height: 400 });
    seam.setLayout(bar.element, { x: 0, y: 360, width: 800, height: 40 });
    seam.triggerResizeObserver();
    await tick();

    expect(win.getState()).toMatchObject({
      x: 0,
      y: 0,
      width: 800,
      height: 360,
    });
  });
});
