import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MicroW } from "../src/index.js";
import { createSeam } from "./support/seam.js";
import type { Seam } from "./support/seam.js";

describe("MicroW resize", () => {
  let seam: Seam;

  beforeEach(() => {
    seam = createSeam();
  });

  afterEach(() => {
    seam.cleanup();
  });

  function root(width = 800, height = 600): HTMLElement {
    const el = seam.document.createElement("div");
    seam.setLayout(el, { x: 0, y: 0, width, height });
    seam.document.body.appendChild(el);
    return el;
  }

  function handleOf(win: MicroW, dir: string): HTMLElement {
    return win.element.querySelector(`.mcrw-resize-${dir}`)!;
  }

  it("mounts eight compass handles as direct children in order", () => {
    const win = new MicroW({ root: root() });
    const classes = [...win.element.children].map((el) => el.className);
    expect(classes).toEqual([
      "mcrw-header",
      "mcrw-body",
      "mcrw-resize-n",
      "mcrw-resize-e",
      "mcrw-resize-s",
      "mcrw-resize-w",
      "mcrw-resize-ne",
      "mcrw-resize-nw",
      "mcrw-resize-se",
      "mcrw-resize-sw",
    ]);
  });

  it("omits handles and adds mcrw-no-resize when resizable is false", () => {
    const win = new MicroW({ root: root(), resizable: false });
    expect(win.element.querySelector(".mcrw-resize-n")).toBeNull();
    expect(win.element.querySelectorAll("[class^='mcrw-resize-']").length).toBe(
      0,
    );
    expect(win.element.classList.contains("mcrw-no-resize")).toBe(true);
  });

  it("resizes from the east handle with the west edge fixed", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const handle = handleOf(win, "e");

    seam.pointerDown(handle, { x: 300, y: 175 });
    seam.pointerMove(handle, { x: 360, y: 175 });
    seam.pointerUp(handle, { x: 360, y: 175 });

    expect(win.getState()).toMatchObject({
      x: 100,
      y: 100,
      width: 260,
      height: 150,
    });
  });

  it("resizes from the west handle with the east edge fixed", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const handle = handleOf(win, "w");

    seam.pointerDown(handle, { x: 100, y: 175 });
    seam.pointerMove(handle, { x: 40, y: 175 });
    seam.pointerUp(handle, { x: 40, y: 175 });

    expect(win.getState()).toMatchObject({
      x: 40,
      y: 100,
      width: 260,
      height: 150,
    });
  });

  it("resizes from the north handle with the south edge fixed", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const handle = handleOf(win, "n");

    seam.pointerDown(handle, { x: 200, y: 100 });
    seam.pointerMove(handle, { x: 200, y: 60 });
    seam.pointerUp(handle, { x: 200, y: 60 });

    expect(win.getState()).toMatchObject({
      x: 100,
      y: 60,
      width: 200,
      height: 190,
    });
  });

  it("resizes from the south handle with the north edge fixed", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const handle = handleOf(win, "s");

    seam.pointerDown(handle, { x: 200, y: 250 });
    seam.pointerMove(handle, { x: 200, y: 300 });
    seam.pointerUp(handle, { x: 200, y: 300 });

    expect(win.getState()).toMatchObject({
      x: 100,
      y: 100,
      width: 200,
      height: 200,
    });
  });

  it("resizes the south-east corner on both axes at once", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const handle = handleOf(win, "se");

    seam.pointerDown(handle, { x: 300, y: 250 });
    seam.pointerMove(handle, { x: 340, y: 280 });
    seam.pointerUp(handle, { x: 340, y: 280 });

    expect(win.getState()).toMatchObject({
      x: 100,
      y: 100,
      width: 240,
      height: 180,
    });
  });

  it("resizes the north-east corner on both axes at once", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const handle = handleOf(win, "ne");

    seam.pointerDown(handle, { x: 300, y: 100 });
    seam.pointerMove(handle, { x: 340, y: 70 });
    seam.pointerUp(handle, { x: 340, y: 70 });

    expect(win.getState()).toMatchObject({
      x: 100,
      y: 70,
      width: 240,
      height: 180,
    });
  });

  it("resizes the north-west corner on both axes at once", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const handle = handleOf(win, "nw");

    seam.pointerDown(handle, { x: 100, y: 100 });
    seam.pointerMove(handle, { x: 60, y: 70 });
    seam.pointerUp(handle, { x: 60, y: 70 });

    expect(win.getState()).toMatchObject({
      x: 60,
      y: 70,
      width: 240,
      height: 180,
    });
  });

  it("resizes the south-west corner on both axes at once", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const handle = handleOf(win, "sw");

    seam.pointerDown(handle, { x: 100, y: 250 });
    seam.pointerMove(handle, { x: 60, y: 280 });
    seam.pointerUp(handle, { x: 60, y: 280 });

    expect(win.getState()).toMatchObject({
      x: 60,
      y: 100,
      width: 240,
      height: 180,
    });
  });

  it("pins a dragged east edge at the work-area bound", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const handle = handleOf(win, "e");

    seam.pointerDown(handle, { x: 300, y: 175 });
    seam.pointerMove(handle, { x: 10000, y: 175 });
    seam.pointerUp(handle, { x: 10000, y: 175 });

    expect(win.getState()).toMatchObject({ x: 100, width: 700 });
  });

  it("pins a dragged west edge at the origin bound", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const handle = handleOf(win, "w");

    seam.pointerDown(handle, { x: 100, y: 175 });
    seam.pointerMove(handle, { x: -10000, y: 175 });
    seam.pointerUp(handle, { x: -10000, y: 175 });

    expect(win.getState()).toMatchObject({ x: 0, width: 300 });
  });

  it("never shrinks past minWidth on the east handle", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      minWidth: 50,
    });
    const handle = handleOf(win, "e");

    seam.pointerDown(handle, { x: 300, y: 175 });
    seam.pointerMove(handle, { x: 100, y: 175 });
    seam.pointerUp(handle, { x: 100, y: 175 });

    expect(win.getState()).toMatchObject({ x: 100, width: 50 });
  });

  it("never shrinks past minWidth on the west handle", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      minWidth: 50,
    });
    const handle = handleOf(win, "w");

    seam.pointerDown(handle, { x: 100, y: 175 });
    seam.pointerMove(handle, { x: 300, y: 175 });
    seam.pointerUp(handle, { x: 300, y: 175 });

    expect(win.getState()).toMatchObject({ x: 250, width: 50 });
  });

  it("never shrinks past minHeight on the north handle", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      minHeight: 40,
    });
    const handle = handleOf(win, "n");

    seam.pointerDown(handle, { x: 200, y: 100 });
    seam.pointerMove(handle, { x: 200, y: 250 });
    seam.pointerUp(handle, { x: 200, y: 250 });

    expect(win.getState()).toMatchObject({ y: 210, height: 40 });
  });

  it("never shrinks past minHeight on the south handle", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      minHeight: 40,
    });
    const handle = handleOf(win, "s");

    seam.pointerDown(handle, { x: 200, y: 250 });
    seam.pointerMove(handle, { x: 200, y: 100 });
    seam.pointerUp(handle, { x: 200, y: 100 });

    expect(win.getState()).toMatchObject({ y: 100, height: 40 });
  });

  it("lets the work area beat the min size", () => {
    const r = root(300, 600);
    const win = new MicroW({
      root: r,
      x: 0,
      y: 0,
      width: 200,
      height: 150,
      minWidth: 500,
    });
    const handle = handleOf(win, "e");

    seam.pointerDown(handle, { x: 200, y: 175 });
    seam.pointerMove(handle, { x: 10000, y: 175 });
    seam.pointerUp(handle, { x: 10000, y: 175 });

    expect(win.getState()).toMatchObject({ x: 0, width: 300 });
  });

  it("resizeFrom applies directional deltas", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });

    const result = win.resizeFrom("se", { dx: 40, dy: 30 });

    expect(result).toBe(win);
    expect(win.getState()).toMatchObject({
      x: 100,
      y: 100,
      width: 240,
      height: 180,
    });
  });

  it("resizeTo sizes to the given dimensions anchored at the top-left", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });

    win.resizeTo(300, 250);

    expect(win.getState()).toMatchObject({
      x: 100,
      y: 100,
      width: 300,
      height: 250,
    });
  });

  it("clamps programmatic resize through the same path", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      minWidth: 50,
    });

    win.resizeFrom("e", { dx: -10000 });

    expect(win.getState()).toMatchObject({ x: 100, width: 50 });
  });

  it("honors a consumer-applied mcrw-no-resize as a resize gate", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    win.element.classList.add("mcrw-no-resize");
    const handle = handleOf(win, "e");

    seam.pointerDown(handle, { x: 300, y: 175 });
    seam.pointerMove(handle, { x: 360, y: 175 });
    seam.pointerUp(handle, { x: 360, y: 175 });
    expect(win.getState()).toMatchObject({ x: 100, width: 200 });

    win.resizeFrom("e", { dx: 100 });
    expect(win.getState()).toMatchObject({ width: 200 });
  });

  it("no-ops resizeFrom on a non-resizable window", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      resizable: false,
    });

    win.resizeFrom("e", { dx: 100 });
    expect(win.getState()).toMatchObject({ width: 200 });
  });

  it("fires onresize with the full new rect on each landing", () => {
    const onresize = vi.fn();
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      onresize,
    });
    const handle = handleOf(win, "se");

    seam.pointerDown(handle, { x: 300, y: 250 });
    seam.pointerMove(handle, { x: 340, y: 280 });
    seam.pointerMove(handle, { x: 350, y: 290 });
    seam.pointerUp(handle, { x: 350, y: 290 });

    expect(onresize).toHaveBeenCalledTimes(2);
    expect(onresize).toHaveBeenNthCalledWith(1, win, {
      x: 100,
      y: 100,
      width: 240,
      height: 180,
    });
    expect(onresize).toHaveBeenNthCalledWith(2, win, {
      x: 100,
      y: 100,
      width: 250,
      height: 190,
    });
  });

  it("carries the new x/y when a west or north edge moves", () => {
    const onresize = vi.fn();
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      onresize,
    });
    const handle = handleOf(win, "nw");

    seam.pointerDown(handle, { x: 100, y: 100 });
    seam.pointerMove(handle, { x: 60, y: 70 });
    seam.pointerUp(handle, { x: 60, y: 70 });

    expect(onresize).toHaveBeenCalledWith(win, {
      x: 60,
      y: 70,
      width: 240,
      height: 180,
    });
  });

  it("keeps fractional resize deltas and rounds only the style write", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const handle = handleOf(win, "e");

    seam.pointerDown(handle, { x: 300, y: 175 });
    seam.pointerMove(handle, { x: 360.5, y: 175 });
    seam.pointerUp(handle, { x: 360.5, y: 175 });

    expect(win.getState().width).toBe(260.5);
    expect(win.element.style.width).toBe("261px");
  });

  it("stops resizing after pointerup", () => {
    const win = new MicroW({
      root: root(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });
    const handle = handleOf(win, "e");

    seam.pointerDown(handle, { x: 300, y: 175 });
    seam.pointerMove(handle, { x: 360, y: 175 });
    seam.pointerUp(handle, { x: 360, y: 175 });
    seam.pointerMove(handle, { x: 10000, y: 175 });

    expect(win.getState()).toMatchObject({ width: 260 });
  });
});
