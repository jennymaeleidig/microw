import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MicroW } from "../src/index.js";
import { createSeam } from "./support/seam.js";
import type { Seam } from "./support/seam.js";

describe("MicroW moveTo and header drag", () => {
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

  function headerOf(win: MicroW): HTMLElement {
    return win.element.querySelector(".mcrw-header")!;
  }

  it("moveTo moves to container-relative coordinates and fires onmove", () => {
    const onmove = vi.fn();
    const win = new MicroW({
      root: root(),
      x: 10,
      y: 20,
      width: 300,
      height: 200,
      onmove,
    });

    const result = win.moveTo(50, 60);

    expect(result).toBe(win);
    expect(win.getState()).toMatchObject({
      x: 50,
      y: 60,
      width: 300,
      height: 200,
    });
    expect(onmove).toHaveBeenCalledWith(win, {
      x: 50,
      y: 60,
      width: 300,
      height: 200,
    });
  });

  it("moveTo clamps the window wholly inside the work area", () => {
    const win = new MicroW({
      root: root(),
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });

    win.moveTo(-100, -50);
    expect(win.getState()).toMatchObject({ x: 0, y: 0 });

    win.moveTo(10000, 10000);
    expect(win.getState()).toMatchObject({ x: 500, y: 400 });
  });

  it("moveTo keeps fractional coordinates and rounds only the style write", () => {
    const win = new MicroW({
      root: root(),
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });

    win.moveTo(12.5, 33.7);

    expect(win.getState().x).toBe(12.5);
    expect(win.getState().y).toBe(33.7);
    expect(win.element.style.left).toBe("13px");
    expect(win.element.style.top).toBe("34px");
  });

  it("drags the header with the pointer by the delta", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const header = headerOf(win);

    seam.pointerDown(header, { x: 150, y: 150 });
    seam.pointerMove(header, { x: 200, y: 220 });
    seam.pointerUp(header, { x: 200, y: 220 });

    expect(win.getState()).toMatchObject({ x: 150, y: 170 });
  });

  it("clamps the window at the work-area bound while dragging", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const header = headerOf(win);

    seam.pointerDown(header, { x: 150, y: 150 });
    seam.pointerMove(header, { x: 10000, y: 10000 });
    seam.pointerUp(header, { x: 10000, y: 10000 });

    expect(win.getState()).toMatchObject({ x: 600, y: 450 });
  });

  it("converts pointer coordinates under a bordered, offset root", () => {
    const r = seam.document.createElement("div");
    seam.setLayout(r, {
      x: 100,
      y: 50,
      width: 800,
      height: 600,
      borderLeft: 20,
      borderTop: 10,
    });
    seam.document.body.appendChild(r);
    const win = new MicroW({ root: r, x: 10, y: 20, width: 200, height: 150 });
    const header = headerOf(win);

    // The window's top-left sits at viewport (100 + 20 + 10, 50 + 10 + 20).
    seam.pointerDown(header, { x: 130, y: 80 });
    seam.pointerMove(header, { x: 200, y: 110 });
    seam.pointerUp(header, { x: 200, y: 110 });

    expect(win.getState()).toMatchObject({ x: 80, y: 50 });
  });

  it("tracks the pointer under a translation-only-transformed root", () => {
    const r = seam.document.createElement("div");
    seam.setLayout(r, { x: 40, y: 30, width: 800, height: 600 });
    seam.document.body.appendChild(r);
    const win = new MicroW({
      root: r,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const header = headerOf(win);

    // The window's top-left sits at viewport (40 + 100, 30 + 100).
    seam.pointerDown(header, { x: 140, y: 130 });
    seam.pointerMove(header, { x: 200, y: 210 });
    seam.pointerUp(header, { x: 200, y: 210 });

    expect(win.getState()).toMatchObject({ x: 160, y: 180 });
  });

  it("never adds scroll to the conversion (mid-drag scroll leaves geometry alone)", () => {
    const r = root();
    const win = new MicroW({
      root: r,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const header = headerOf(win);

    seam.pointerDown(header, { x: 150, y: 150 }); // grab offset 50,50
    r.scrollLeft = 60;
    r.scrollTop = 40;
    seam.pointerMove(header, { x: 150, y: 150 }); // pointer stays put
    seam.pointerUp(header, { x: 150, y: 150 });

    expect(win.getState()).toMatchObject({ x: 100, y: 100 });
  });

  it("re-reads the root rect per event rather than caching it", () => {
    const r = root();
    const win = new MicroW({
      root: r,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const header = headerOf(win);

    seam.pointerDown(header, { x: 150, y: 150 });
    // The root shifts between events (a translation transform or ancestor
    // scroll): a cached rect would place the window at x 100 again.
    seam.setLayout(r, { x: 100, y: 0, width: 800, height: 600 });
    seam.pointerMove(header, { x: 150, y: 150 });
    seam.pointerUp(header, { x: 150, y: 150 });

    expect(win.getState()).toMatchObject({ x: 0, y: 100 });
  });

  it("drags only from the header, not the body or the window element", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const body = win.element.querySelector(".mcrw-body")!;

    seam.pointerDown(body, { x: 150, y: 200 });
    seam.pointerMove(body, { x: 250, y: 300 });
    seam.pointerUp(body, { x: 250, y: 300 });
    expect(win.getState()).toMatchObject({ x: 100, y: 100 });

    seam.pointerDown(win.element, { x: 50, y: 50 });
    seam.pointerMove(win.element, { x: 150, y: 150 });
    seam.pointerUp(win.element, { x: 150, y: 150 });
    expect(win.getState()).toMatchObject({ x: 100, y: 100 });
  });

  it("stops tracking after pointerup", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const header = headerOf(win);

    seam.pointerDown(header, { x: 150, y: 150 });
    seam.pointerMove(header, { x: 200, y: 200 });
    seam.pointerUp(header, { x: 200, y: 200 });
    seam.pointerMove(header, { x: 300, y: 300 });

    expect(win.getState()).toMatchObject({ x: 150, y: 150 });
  });

  it("keeps fractional drag deltas and rounds only the style write", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const header = headerOf(win);

    seam.pointerDown(header, { x: 150, y: 150 });
    seam.pointerMove(header, { x: 160.5, y: 180.25 });
    seam.pointerUp(header, { x: 160.5, y: 180.25 });

    expect(win.getState().x).toBe(110.5);
    expect(win.getState().y).toBe(130.25);
    expect(win.element.style.left).toBe("111px");
    expect(win.element.style.top).toBe("130px");
  });

  it("fires onmove on each drag move with the current rect", () => {
    const onmove = vi.fn();
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      onmove,
    });
    const header = headerOf(win);

    seam.pointerDown(header, { x: 150, y: 150 });
    seam.pointerMove(header, { x: 200, y: 200 });
    seam.pointerMove(header, { x: 210, y: 210 });
    seam.pointerUp(header, { x: 210, y: 210 });

    expect(onmove).toHaveBeenCalledTimes(2);
    expect(onmove).toHaveBeenNthCalledWith(1, win, {
      x: 150,
      y: 150,
      width: 200,
      height: 150,
    });
    expect(onmove).toHaveBeenNthCalledWith(2, win, {
      x: 160,
      y: 160,
      width: 200,
      height: 150,
    });
  });

  it("writes geometry without introducing a position style", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const header = headerOf(win);

    seam.pointerDown(header, { x: 150, y: 150 });
    seam.pointerMove(header, { x: 200, y: 200 });
    seam.pointerUp(header, { x: 200, y: 200 });

    expect(win.element.style.position).toBe("");
    expect(win.element.style.left).toBe("150px");
    expect(win.element.style.top).toBe("150px");
  });

  it("arrow keys on the focused header move the window in 10px steps", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const header = headerOf(win);

    seam.fireKeydown(header, "ArrowLeft");
    seam.fireKeydown(header, "ArrowUp");
    expect(win.getState()).toMatchObject({ x: 90, y: 90 });

    seam.fireKeydown(header, "ArrowRight");
    seam.fireKeydown(header, "ArrowDown");
    expect(win.getState()).toMatchObject({ x: 100, y: 100 });
  });

  it("shift multiplies keyboard move steps to 100px", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const header = headerOf(win);

    seam.fireKeydown(header, "ArrowRight", { shiftKey: true });
    seam.fireKeydown(header, "ArrowDown", { shiftKey: true });

    expect(win.getState()).toMatchObject({ x: 200, y: 200 });
  });

  it("keyboard moves clamp into the work area like pointer drags", () => {
    const win = new MicroW({
      root: root(),
      x: 600,
      y: 450,
      width: 200,
      height: 150,
    });
    const header = headerOf(win);

    seam.fireKeydown(header, "ArrowRight");
    seam.fireKeydown(header, "ArrowDown");
    expect(win.getState()).toMatchObject({ x: 600, y: 450 });

    seam.fireKeydown(header, "ArrowLeft");
    seam.fireKeydown(header, "ArrowUp");
    expect(win.getState()).toMatchObject({ x: 590, y: 440 });
  });

  it("keyboard moves fire onmove with the same rect as pointer drags", () => {
    const onmove = vi.fn();
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      onmove,
    });

    seam.fireKeydown(win.element.querySelector(".mcrw-header")!, "ArrowRight");

    expect(onmove).toHaveBeenCalledTimes(1);
    expect(onmove).toHaveBeenCalledWith(win, {
      x: 110,
      y: 100,
      width: 200,
      height: 150,
    });
  });

  it("keyboard moves are gated for minimized and maximized windows like pointer paths", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const header = headerOf(win);

    win.maximize();
    seam.fireKeydown(header, "ArrowLeft");
    expect(win.getState()).toMatchObject({
      state: "max",
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });

    win.restore();
    win.minimize();
    seam.fireKeydown(header, "ArrowLeft");
    expect(win.getState()).toMatchObject({ state: "min", x: 100, y: 100 });
  });

  it("arrow keys bubbling from a header control do not move the window", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const max = win.element.querySelector(".mcrw-btn-max")!;

    seam.fireKeydown(max, "ArrowRight");

    expect(win.getState()).toMatchObject({ x: 100, y: 100 });
  });

  it("keys other than the arrows do not move the window", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const header = headerOf(win);

    seam.fireKeydown(header, "Enter");
    seam.fireKeydown(header, "Home");
    seam.fireKeydown(header, "a");

    expect(win.getState()).toMatchObject({ x: 100, y: 100 });
  });
});
