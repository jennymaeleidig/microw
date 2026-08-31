import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MicroW } from "../src/index.js";
import { createSeam } from "./support/seam.js";
import type { Seam } from "./support/seam.js";

describe("MicroW global listeners: lifecycle", () => {
  let seam: Seam;
  let unsubscribers: Array<() => void>;

  // Every subscription in a test is collected here so afterEach tears them
  // all down — no listener outlives its test.
  function tracked(subscribe: () => () => void): () => void {
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
    tracked(() =>
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
    expect(win.getState().state).toBe("normal");
  });

  it("a listener subscribed before any window exists captures the first creation", () => {
    const created: MicroW[] = [];
    tracked(() => MicroW.onCreate((win) => created.push(win)));

    const win = new MicroW({ root: root() });

    expect(created).toEqual([win]);
  });

  it("onClose fires after the onclose option callback, once, with the window", () => {
    const r = root();
    const order: Array<{ phase: string; win?: MicroW }> = [];
    tracked(() =>
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
    tracked(() => MicroW.onClose((win) => closed.push(win)));

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
    const unsubFirst = tracked(() => MicroW.onCreate(first));
    tracked(() => MicroW.onCreate(second));

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

  it("a throwing listener during destroyAll aborts the loop mid-way", () => {
    const r = root();
    const first = new MicroW({ root: r });
    new MicroW({ root: r });
    const unsub = MicroW.onClose((win) => {
      if (win === first) {
        throw new Error("bang");
      }
    });

    expect(() => MicroW.destroyAll()).toThrow("bang");
    // The second window was never destroyed: the loop died on the first.
    expect(MicroW.windows(r)).toHaveLength(1);
    unsub();
  });
});

describe("MicroW global listeners: state", () => {
  let seam: Seam;
  let unsubscribers: Array<() => void>;

  function tracked(subscribe: () => () => void): () => void {
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

  it("onState fires for every transition: min, restore, maximize, restore", () => {
    const r = root();
    const states: Array<string> = [];
    tracked(() =>
      MicroW.onState((win, snapshot) => states.push(snapshot.state)),
    );

    const win = new MicroW({ root: r });
    win.minimize();
    win.restore();
    win.maximize();
    win.restore();

    expect(states).toEqual(["min", "normal", "max", "normal"]);
    void win;
  });

  it("the listener receives the window and its settled snapshot", () => {
    const r = root();
    const seen: Array<{ win: MicroW; snapshot: unknown }> = [];
    tracked(() =>
      MicroW.onState((win, snapshot) => seen.push({ win, snapshot })),
    );

    const win = new MicroW({ root: r });
    win.minimize();

    expect(seen).toHaveLength(1);
    expect(seen[0].win).toBe(win);
    expect(seen[0].snapshot).toEqual(win.getState());
    expect(win.getState().state).toBe("min");
  });

  it("the window's own option callback fires before the global listener", () => {
    const r = root();
    const order: string[] = [];
    tracked(() => MicroW.onState(() => order.push("global")));

    const win = new MicroW({
      root: r,
      onminimize: () => order.push("option:minimize"),
      onrestore: () => order.push("option:restore"),
      onmaximize: () => order.push("option:maximize"),
    });
    win.minimize();
    win.restore();

    expect(order).toEqual([
      "option:minimize",
      "global",
      "option:restore",
      "global",
    ]);
  });

  it("no-op transitions and gated windows fire nothing", () => {
    const r = root();
    const onState = vi.fn();
    tracked(() => MicroW.onState(onState));

    const win = new MicroW({ root: r });
    win.minimize();
    win.minimize(); // already min: no transition
    win.maximize();
    win.maximize(); // already max: no transition
    expect(onState).toHaveBeenCalledTimes(2);

    const gated = new MicroW({ root: r, taskbar: false });
    gated.minimize(); // no restore affordance: no transition
    expect(onState).toHaveBeenCalledTimes(2);
  });

  it("unsubscribing stops delivery", () => {
    const r = root();
    const onState = vi.fn();
    const unsub = MicroW.onState(onState);

    new MicroW({ root: r }).minimize();
    expect(onState).toHaveBeenCalledTimes(1);

    unsub();
    new MicroW({ root: r }).minimize();
    expect(onState).toHaveBeenCalledTimes(1);
  });
});
