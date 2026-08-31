import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MicroW } from "../src/index.js";
import { createSeam } from "./support/seam.js";
import type { Seam } from "./support/seam.js";

describe("MicroW global listeners: lifecycle", () => {
  let seam: Seam;
  let unsubscribers: Array<() => void>;

  // Every subscription in a test is collected here so afterEach tears them
  // all down — no listener outlives its test.
  function subscribe(subscribe: () => () => void): () => void {
    const unsub = subscribe();
    unsubscribers.push(unsub);
    return unsub;
  }

  beforeEach(() => {
    seam = createSeam();
    unsubscribers = [];
  });

  afterEach(() => {
    for (const unsub of unsubscribers.splice(0)) {
      unsub();
    }
    MicroW.destroyAll();
    seam.cleanup();
  });

  function root(): HTMLElement {
    const el = seam.document.createElement("div");
    seam.setLayout(el, { x: 0, y: 0, width: 800, height: 600 });
    seam.document.body.appendChild(el);
    return el;
  }

  it("onCreate fires after the oncreate option callback, with the window registered and mounted", () => {
    const r = root();
    const calls: Array<{
      phase: string;
      registered: boolean;
      mounted: boolean;
    }> = [];
    subscribe(() =>
      MicroW.onCreate((win) =>
        calls.push({
          phase: "global",
          registered: MicroW.windows(r).includes(win),
          mounted: win.element.isConnected,
        }),
      ),
    );

    const win = new MicroW({
      root: r,
      oncreate: (w) =>
        calls.push({
          phase: "option",
          registered: MicroW.windows(r).includes(w),
          mounted: w.element.isConnected,
        }),
    });

    expect(calls.map((c) => c.phase)).toEqual(["option", "global"]);
    expect(calls[0].registered).toBe(true);
    expect(calls[0].mounted).toBe(true);
    expect(calls[1].registered).toBe(true);
    expect(calls[1].mounted).toBe(true);
    void win;
  });

  it("a listener subscribed before any window exists captures the first creation", () => {
    const created: MicroW[] = [];
    subscribe(() => MicroW.onCreate((win) => created.push(win)));

    const win = new MicroW({ root: root() });

    expect(created).toEqual([win]);
  });

  it("onClose fires after the onclose option callback, once, with the window", () => {
    const r = root();
    const order: Array<{ phase: string; win?: MicroW }> = [];
    subscribe(() =>
      MicroW.onClose((win) => order.push({ phase: "global", win })),
    );

    const win = new MicroW({
      root: r,
      onclose: () => order.push({ phase: "option" }),
    });
    win.destroy();

    expect(order.map((o) => o.phase)).toEqual(["option", "global"]);
    expect(order[1].win).toBe(win);
  });

  it("destroyAll fires the same per-window onClose sequence as individual destroys", () => {
    const r = root();
    const closed: MicroW[] = [];
    subscribe(() => MicroW.onClose((win) => closed.push(win)));

    const a = new MicroW({ root: r });
    const b = new MicroW({ root: r });
    const count = MicroW.destroyAll();

    expect(count).toBe(2);
    expect(closed).toEqual([a, b]);
    expect(MicroW.windows(r)).toEqual([]);
  });

  it("multiple listeners all fire; unsubscribing stops delivery; double-unsubscribe is inert", () => {
    const r = root();
    const first = vi.fn();
    const second = vi.fn();
    const unsubFirst = subscribe(() => MicroW.onCreate(first));
    subscribe(() => MicroW.onCreate(second));

    new MicroW({ root: r });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    unsubFirst();
    unsubFirst();

    new MicroW({ root: r });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });

  it("a throwing listener propagates out of the constructor and out of destroy", () => {
    const r = root();
    const boom = () => {
      throw new Error("boom");
    };
    const unsubCreate = MicroW.onCreate(boom);
    expect(() => new MicroW({ root: r })).toThrow("boom");
    unsubCreate();

    const unsubClose = MicroW.onClose(() => {
      throw new Error("bang");
    });
    const win = new MicroW({ root: r });
    expect(() => win.destroy()).toThrow("bang");
    unsubClose();

    // The listener is gone: teardown in afterEach must run clean.
    expect(() => win.destroy()).not.toThrow();
  });
});
