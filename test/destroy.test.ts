import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MicroW } from "../src/index.js";
import { createSeam } from "./support/seam.js";
import type { Seam } from "./support/seam.js";

describe("MicroW close: destroy / destroyAll", () => {
  let seam: Seam;

  beforeEach(() => {
    seam = createSeam();
  });

  afterEach(() => {
    MicroW.destroyAll();
    seam.cleanup();
  });

  function root(): HTMLElement {
    const el = seam.document.createElement("div");
    seam.setLayout(el, { x: 0, y: 0, width: 800, height: 600 });
    seam.document.body.appendChild(el);
    return el;
  }

  it("destroy removes the element and the registry entry", () => {
    const r = root();
    const win = new MicroW({ root: r });

    win.destroy();

    expect(r.querySelector(".mcrw")).toBeNull();
    expect(MicroW.windows(r)).toEqual([]);
  });

  it("destroy fires onclose once with the window", () => {
    const onclose = vi.fn();
    const win = new MicroW({ root: root(), onclose });

    win.destroy();

    expect(onclose).toHaveBeenCalledTimes(1);
    expect(onclose).toHaveBeenCalledWith(win);
  });

  it("destroy works identically from normal, min, and max", () => {
    const r = root();
    const a = new MicroW({ root: r });
    a.minimize();
    a.destroy();
    expect(r.querySelector(".mcrw")).toBeNull();
    expect(MicroW.windows(r)).toEqual([]);

    const b = new MicroW({ root: r });
    b.maximize();
    b.destroy();
    expect(MicroW.windows(r)).toEqual([]);
  });

  it("destroy of the focused window blurs first, then hands focus to the next MRU non-minimized window", () => {
    const r = root();
    const onblur = vi.fn();
    const onfocus = vi.fn();
    const a = new MicroW({ root: r, onfocus });
    const b = new MicroW({ root: r, onblur });

    b.focus();
    b.destroy();

    expect(onblur).toHaveBeenCalledWith(b);
    expect(onfocus).toHaveBeenCalledWith(a);
    expect(a.getState().focused).toBe(true);
    expect(a.element.classList.contains("mcrw-focused")).toBe(true);
  });

  it("fires onblur, onfocus, then onclose in that order", () => {
    const r = root();
    const order: string[] = [];
    const a = new MicroW({ root: r, onfocus: () => order.push("focus") });
    const b = new MicroW({
      root: r,
      onblur: () => order.push("blur"),
      onclose: () => order.push("close"),
    });

    b.focus();
    b.destroy();

    expect(order).toEqual(["blur", "focus", "close"]);
  });

  it("destroy of an unfocused window leaves the focused window alone", () => {
    const r = root();
    const a = new MicroW({ root: r });
    const b = new MicroW({ root: r });

    a.focus();
    b.destroy();

    expect(a.getState().focused).toBe(true);
    expect(MicroW.windows(r)).toEqual([a]);
  });

  it("destroy hands focus past minimized windows to the next MRU non-minimized window", () => {
    const r = root();
    const a = new MicroW({ root: r });
    const b = new MicroW({ root: r });
    const c = new MicroW({ root: r });

    c.focus();
    b.focus();
    a.minimize();
    b.destroy();

    expect(c.getState().focused).toBe(true);
    expect(a.getState()).toMatchObject({ state: "min", focused: false });
  });

  it("destroy of the last window leaves the registry empty and nothing mounted", () => {
    const r = root();
    const win = new MicroW({ root: r });

    win.destroy();

    expect(MicroW.windows(r)).toEqual([]);
    expect(MicroW.windows()).toEqual([]);
    expect(r.children).toHaveLength(0);
  });

  it("destroyAll destroys every window across roots and returns the count", () => {
    const r1 = root();
    const r2 = root();
    new MicroW({ root: r1 });
    new MicroW({ root: r1 });
    new MicroW({ root: r2 });

    expect(MicroW.destroyAll()).toBe(3);
    expect(MicroW.windows()).toEqual([]);
    expect(r1.children).toHaveLength(0);
    expect(r2.children).toHaveLength(0);
  });

  it("destroyAll returns zero when nothing is open", () => {
    expect(MicroW.destroyAll()).toBe(0);
  });

  it("the registry reflects the removal during and after onclose", () => {
    const r = root();
    let during: MicroW[] | null = null;
    const a = new MicroW({ root: r });
    const b = new MicroW({
      root: r,
      onclose: () => {
        during = MicroW.windows(r);
      },
    });

    b.destroy();

    expect(during).toEqual([a]);
    expect(MicroW.windows(r)).toEqual([a]);
  });

  it("destroy preserves the creation order of the remaining windows", () => {
    const r = root();
    const a = new MicroW({ root: r });
    const b = new MicroW({ root: r });
    const c = new MicroW({ root: r });

    b.destroy();

    expect(MicroW.windows(r)).toEqual([a, c]);
  });

  it("destroy is idempotent and does not double-fire onclose", () => {
    const onclose = vi.fn();
    const r = root();
    const win = new MicroW({ root: r, onclose });

    win.destroy();
    win.destroy();

    expect(onclose).toHaveBeenCalledTimes(1);
    expect(MicroW.windows(r)).toEqual([]);
  });

  it("the close control destroys the window", () => {
    const r = root();
    const win = new MicroW({ root: r });

    (win.element.querySelector(".mcrw-btn-close") as HTMLElement).click();

    expect(r.querySelector(".mcrw")).toBeNull();
    expect(MicroW.windows(r)).toEqual([]);
  });
});
