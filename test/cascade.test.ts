import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MicroW } from "../src/index.js";
import type { CascadeMode } from "../src/index.js";
import { createSeam } from "./support/seam.js";
import type { Seam } from "./support/seam.js";

describe("MicroW cascade", () => {
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

  it("cascade mode steps new windows by ⌈w/8⌉ × ⌈h/8⌉ from the top-left", () => {
    const r = root();
    MicroW.cascade({ root: r, mode: "cascade" });

    const a = new MicroW({ root: r, width: 200, height: 150 });
    const b = new MicroW({ root: r, width: 200, height: 150 });
    const c = new MicroW({ root: r, width: 200, height: 150 });

    expect(a.getState()).toMatchObject({ x: 0, y: 0 });
    expect(b.getState()).toMatchObject({ x: 25, y: 19 });
    expect(c.getState()).toMatchObject({ x: 50, y: 38 });
  });

  it("cascade restarts at the top-left when the staircase walks past an edge", () => {
    const r = root(300, 200);
    MicroW.cascade({ root: r, mode: "cascade" });

    const wins = Array.from(
      { length: 9 },
      () => new MicroW({ root: r, width: 100, height: 100 }),
    );

    expect(wins[0].getState()).toMatchObject({ x: 0, y: 0 });
    expect(wins[1].getState()).toMatchObject({ x: 13, y: 13 });
    expect(wins[8].getState()).toMatchObject({ x: 0, y: 0 });
  });

  it("random mode lands windows at seeded, in-bounds offsets", () => {
    const r = root();
    MicroW.cascade({ root: r, mode: "random" });

    const a = new MicroW({ root: r, width: 200, height: 150 });
    const b = new MicroW({ root: r, width: 200, height: 150 });

    for (const win of [a, b]) {
      const s = win.getState();
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.x + s.width).toBeLessThanOrEqual(800);
      expect(s.y + s.height).toBeLessThanOrEqual(600);
    }
    expect({ x: a.getState().x, y: a.getState().y }).not.toEqual({
      x: b.getState().x,
      y: b.getState().y,
    });
  });

  it("keeps a root's random sequence stable across re-calls", () => {
    const r = root();
    MicroW.cascade({ root: r, mode: "random" });
    const a = new MicroW({ root: r, width: 200, height: 150 });
    const b = new MicroW({ root: r, width: 200, height: 150 });
    const before = [a, b].map((w) => ({
      x: w.getState().x,
      y: w.getState().y,
    }));

    MicroW.cascade({ root: r, mode: "random" });

    const after = [a, b].map((w) => ({
      x: w.getState().x,
      y: w.getState().y,
    }));
    expect(after).toEqual(before);
  });

  it("gives distinct sequences across roots", () => {
    const r1 = root();
    const r2 = root();
    MicroW.cascade({ root: r1, mode: "random" });
    MicroW.cascade({ root: r2, mode: "random" });

    const w1 = new MicroW({ root: r1, width: 200, height: 150 });
    const w2 = new MicroW({ root: r2, width: 200, height: 150 });

    expect({ x: w1.getState().x, y: w1.getState().y }).not.toEqual({
      x: w2.getState().x,
      y: w2.getState().y,
    });
  });

  it("does not re-roll a handed-off window's offset for a later mount", () => {
    const r = root();
    MicroW.cascade({ root: r, mode: "random" });
    new MicroW({ root: r, width: 200, height: 150 }); // index 0
    const b = new MicroW({ root: r, width: 200, height: 150 });
    const c = new MicroW({ root: r, width: 200, height: 150 });

    b.moveTo(400, 400);
    const d = new MicroW({ root: r, width: 200, height: 150 });

    expect({ x: d.getState().x, y: d.getState().y }).not.toEqual({
      x: c.getState().x,
      y: c.getState().y,
    });
  });

  it("never cascade-places an explicitly positioned window and fires no onmove at mount", () => {
    const r = root();
    MicroW.cascade({ root: r, mode: "cascade" });
    const onmove = vi.fn();

    const explicit = new MicroW({
      root: r,
      x: 500,
      y: 400,
      width: 200,
      height: 150,
      onmove,
    });
    expect(explicit.getState()).toMatchObject({ x: 500, y: 400 });
    expect(onmove).not.toHaveBeenCalled();

    const onmove2 = vi.fn();
    const placed = new MicroW({
      root: r,
      width: 200,
      height: 150,
      onmove: onmove2,
    });
    // The explicit window consumed no slot, and mount fires no onmove.
    expect(placed.getState()).toMatchObject({ x: 0, y: 0 });
    expect(onmove2).not.toHaveBeenCalled();
  });

  it("hands ownership to the consumer on moveTo and never re-places it", () => {
    const r = root();
    MicroW.cascade({ root: r, mode: "cascade" });
    const a = new MicroW({ root: r, width: 100, height: 100 });
    const b = new MicroW({ root: r, width: 100, height: 100 });
    expect(b.getState()).toMatchObject({ x: 13, y: 13 });

    a.moveTo(100, 100);

    MicroW.cascade({ root: r, mode: "cascade" });

    expect(a.getState()).toMatchObject({ x: 100, y: 100 });
    expect(b.getState()).toMatchObject({ x: 0, y: 0 });
  });

  it("hands ownership to the consumer on drag", () => {
    const r = root();
    MicroW.cascade({ root: r, mode: "cascade" });
    const a = new MicroW({ root: r, width: 100, height: 100 });
    const b = new MicroW({ root: r, width: 100, height: 100 });

    const header = a.element.querySelector(".mcrw-header")!;
    seam.pointerDown(header, { x: 10, y: 10 });
    seam.pointerMove(header, { x: 60, y: 60 });
    seam.pointerUp(header, { x: 60, y: 60 });
    expect(a.getState()).toMatchObject({ x: 50, y: 50 });

    MicroW.cascade({ root: r, mode: "cascade" });

    expect(a.getState()).toMatchObject({ x: 50, y: 50 });
    expect(b.getState()).toMatchObject({ x: 0, y: 0 });
  });

  it("hands ownership to the consumer on resize", () => {
    const r = root();
    MicroW.cascade({ root: r, mode: "cascade" });
    const a = new MicroW({ root: r, width: 100, height: 100 });
    const b = new MicroW({ root: r, width: 100, height: 100 });

    a.resizeTo(150, 120);

    MicroW.cascade({ root: r, mode: "cascade" });

    expect(a.getState()).toMatchObject({ width: 150, height: 120 });
    expect(b.getState()).toMatchObject({ x: 0, y: 0 });
  });

  it("re-places only its owned windows when the work area shrinks", () => {
    const r = root();
    MicroW.cascade({ root: r, mode: "cascade" });
    const a = new MicroW({ root: r, width: 100, height: 100 });
    const b = new MicroW({ root: r, width: 100, height: 100 });
    expect(b.getState()).toMatchObject({ x: 13, y: 13 });

    const bar = MicroW.taskbar(r)!;
    seam.setLayout(bar.element, { x: 0, y: 100, width: 800, height: 500 });
    a.focus();

    expect(a.getState()).toMatchObject({ x: 0, y: 0, height: 100 });
    expect(b.getState()).toMatchObject({ x: 0, y: 0, height: 100 });
  });

  it("reconfigures the mode and re-places on re-call", () => {
    const r = root();
    MicroW.cascade({ root: r, mode: "cascade" });
    const a = new MicroW({ root: r, width: 200, height: 150 });
    const b = new MicroW({ root: r, width: 200, height: 150 });
    expect(b.getState()).toMatchObject({ x: 25, y: 19 });

    MicroW.cascade({ root: r, mode: "random" });

    for (const win of [a, b]) {
      const s = win.getState();
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.x + s.width).toBeLessThanOrEqual(800);
      expect(s.y + s.height).toBeLessThanOrEqual(600);
    }
    expect(b.getState()).not.toMatchObject({ x: 25, y: 19 });
  });

  it("throws on an unknown mode", () => {
    const r = root();
    expect(() =>
      MicroW.cascade({ root: r, mode: "bogus" as CascadeMode }),
    ).toThrow(TypeError);
  });
});
