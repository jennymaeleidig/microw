import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MicroW } from "../src/index.js";
import { createListenerHarness } from "./support/listeners.js";

describe("MicroW global listeners: lifecycle", () => {
  const { tracked, setup, cleanup, root } = createListenerHarness();

  beforeEach(setup);

  afterEach(cleanup);

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
  const { tracked, setup, cleanup, root } = createListenerHarness();

  beforeEach(setup);

  afterEach(cleanup);

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
  });

  it("the min-to-max restore path fires one transition carrying max", () => {
    const r = root();
    const states: Array<string> = [];
    tracked(() =>
      MicroW.onState((_win, snapshot) => states.push(snapshot.state)),
    );

    const win = new MicroW({ root: r });
    win.maximize();
    win.minimize(); // preMin is max
    win.restore(); // lands on max, not normal

    expect(states).toEqual(["max", "min", "max"]);
    expect(win.getState().state).toBe("max");
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
    win.maximize();

    expect(order).toEqual([
      "option:minimize",
      "global",
      "option:restore",
      "global",
      "option:maximize",
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

describe("MicroW global listeners: focus", () => {
  const { tracked, setup, cleanup, root } = createListenerHarness();

  beforeEach(setup);

  afterEach(cleanup);

  it("onFocus fires when model focus moves to a window", () => {
    const r = root();
    const focused: MicroW[] = [];
    tracked(() => MicroW.onFocus((win) => focused.push(win)));

    const a = new MicroW({ root: r });
    const b = new MicroW({ root: r });
    a.focus();
    b.focus();

    expect(focused).toEqual([a, b]);
  });

  it("closing a focused window surfaces the hand-off target", () => {
    const r = root();
    const focused: MicroW[] = [];
    tracked(() => MicroW.onFocus((win) => focused.push(win)));

    const a = new MicroW({ root: r });
    const b = new MicroW({ root: r });
    a.focus();
    focused.length = 0; // drop the initial focus event

    a.destroy(); // focus hands off to the MRU sibling

    expect(focused).toEqual([b]);
  });

  it("closing the last focused window fires no spurious focus event", () => {
    const r = root();
    const onFocus = vi.fn();
    tracked(() => MicroW.onFocus(onFocus));

    const win = new MicroW({ root: r });
    win.focus();
    expect(onFocus).toHaveBeenCalledTimes(1);

    win.destroy(); // no window left, no fallback: documented no-op
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it("closing a minimized window with no next target fires no spurious focus event", () => {
    const r = root();
    const onFocus = vi.fn();
    tracked(() => MicroW.onFocus(onFocus));

    const win = new MicroW({ root: r });
    win.focus();
    win.minimize(); // minimize blurs; hand-off runs at minimize time
    expect(onFocus).toHaveBeenCalledTimes(1);

    win.destroy(); // already unfocused: no hand-off, no event
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it("a minimize-driven hand-off surfaces the sibling like any focus change", () => {
    const r = root();
    const focused: MicroW[] = [];
    tracked(() => MicroW.onFocus((win) => focused.push(win)));

    const a = new MicroW({ root: r });
    const b = new MicroW({ root: r });
    a.focus();
    focused.length = 0;

    a.minimize(); // focused window minimizes: sibling wins focus

    expect(focused).toEqual([b]);
  });

  it("an element fallback target wins focus with no public window event", () => {
    const r = root();
    const onFocus = vi.fn();
    tracked(() => MicroW.onFocus(onFocus));

    const doc = r.ownerDocument!;
    const fallback = doc.createElement("button");
    r.appendChild(fallback);
    const win = new MicroW({ root: r, fallbackFocus: fallback });
    win.focus();
    expect(onFocus).toHaveBeenCalledTimes(1);

    win.destroy(); // hands off to the element: not a Window, no event
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(doc.activeElement).toBe(fallback);
  });

  it("re-focusing the focused window (DOM recapture) fires nothing", () => {
    const r = root();
    const onFocus = vi.fn();
    tracked(() => MicroW.onFocus(onFocus));

    const win = new MicroW({ root: r });
    win.focus();
    expect(onFocus).toHaveBeenCalledTimes(1);

    win.focus(); // model already focused: recapture only, no event
    win.element.focus({ preventScroll: true }); // raw DOM focus: never feeds back
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it("the option callbacks fire before the global listener (blur of the old, focus of the new)", () => {
    const r = root();
    const order: string[] = [];
    tracked(() =>
      MicroW.onFocus((win) => order.push(`global:${win.getState().title}`)),
    );

    const a = new MicroW({
      root: r,
      title: "A",
      onblur: () => order.push("option:blur:A"),
    });
    const b = new MicroW({
      root: r,
      title: "B",
      onfocus: () => order.push("option:focus:B"),
    });
    a.focus();
    order.length = 0; // drop A's own focus event pair

    b.focus();

    expect(order).toEqual(["option:blur:A", "option:focus:B", "global:B"]);
  });

  it("unsubscribing stops delivery", () => {
    const r = root();
    const onFocus = vi.fn();
    const unsub = MicroW.onFocus(onFocus);

    new MicroW({ root: r }).focus();
    expect(onFocus).toHaveBeenCalledTimes(1);

    unsub();
    new MicroW({ root: r }).focus();
    expect(onFocus).toHaveBeenCalledTimes(1);
  });
});
