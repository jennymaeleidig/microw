import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MicroW } from "../src/index.js";
import type { Taskbar } from "../src/index.js";
import { createSeam } from "./support/seam.js";
import type { Seam } from "./support/seam.js";

// The ADR-0010 hand-off chain, exercised end to end: the MRU non-min window
// first, then registered fallback targets (taskbar, then the per-window
// fallbackFocus), else a documented no-op.
describe("focus hand-off fallback chain", () => {
  let seam: Seam;

  beforeEach(() => {
    seam = createSeam();
  });

  afterEach(() => {
    MicroW.configure({ taskbar: true });
    MicroW.destroyAll();
    seam.cleanup();
  });

  function root(): HTMLElement {
    const el = seam.document.createElement("div");
    seam.setLayout(el, { x: 0, y: 0, width: 800, height: 600 });
    seam.document.body.appendChild(el);
    return el;
  }

  function fallbackElement(): HTMLElement {
    const el = seam.document.createElement("div");
    el.tabIndex = -1;
    seam.document.body.appendChild(el);
    return el;
  }

  it("an MRU non-min window is the first tier, ahead of the taskbar and fallbackFocus", () => {
    const r = root();
    const fallback = fallbackElement();
    const a = new MicroW({ root: r, title: "A", fallbackFocus: fallback });
    const b = new MicroW({ root: r, title: "B" });
    // A registered taskbar is present as a competing tier.
    MicroW.taskbar(r);

    a.focus();
    b.focus();
    a.minimize();

    expect(seam.document.activeElement).toBe(b.element);
  });

  it("the taskbar is the second tier even when it mounts after the fallbackFocus registered", () => {
    const r = root();
    const fallback = fallbackElement();
    const win = new MicroW({ root: r, title: "A", fallbackFocus: fallback });
    const bar = MicroW.taskbar(r)!;

    win.focus();
    win.minimize();

    expect(seam.document.activeElement).toBe(bar.element);
  });

  it("a destroyed taskbar is unregistered — hand-off falls through to the fallbackFocus", () => {
    const r = root();
    const fallback = fallbackElement();
    const win = new MicroW({ root: r, title: "A", fallbackFocus: fallback });
    const bar: Taskbar = MicroW.taskbar(r)!;

    bar.destroy();
    win.focus();
    win.minimize();

    expect(seam.document.activeElement).toBe(fallback);
  });

  it("no window can take focus and no registered target: the documented no-op keeps focus on the minimized container", () => {
    const r = root();
    const win = new MicroW({ root: r, title: "A" });

    win.focus();
    win.minimize();

    expect(seam.document.activeElement).toBe(win.element);
  });
});
