import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MicroW } from "../src/index.js";
import type { Taskbar } from "../src/index.js";
import { createSeam } from "./support/seam.js";
import type { Seam } from "./support/seam.js";

// The registry's change channels — membership, state, focus — and the
// taskbar's declared reaction to each: a focus move moves the highlight in
// place, a membership change resyncs the items, a state change updates the
// affected item. Only the membership reaction re-clamps the root.
describe("registry change channels", () => {
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

  function items(bar: Taskbar): HTMLButtonElement[] {
    return [
      ...bar.element.querySelectorAll(".mcrw-taskbar-item"),
    ] as HTMLButtonElement[];
  }

  function cue(bar: Taskbar, index: number): boolean {
    return items(bar)[index].classList.contains("mcrw-taskbar-item-focused");
  }

  it("a focus move updates the -focused highlight in place, without resyncing the items", () => {
    const r = root();
    new MicroW({ root: r, title: "A" });
    new MicroW({ root: r, title: "B" });
    const bar = MicroW.taskbar(r)!;

    new MicroW({ root: r, title: "C" }).focus();
    const afterCreation = items(bar);
    expect(afterCreation.map((el) => el.textContent)).toEqual(["A", "B", "C"]);
    expect(cue(bar, 2)).toBe(true);

    items(bar)[1].click(); // focus B through the taskbar

    // The same item nodes, same order, same names — only the cue moved.
    expect(items(bar)).toEqual(afterCreation);
    expect(items(bar).map((el) => el.textContent)).toEqual(["A", "B", "C"]);
    expect(cue(bar, 1)).toBe(true);
    expect(cue(bar, 2)).toBe(false);
    expect(cue(bar, 0)).toBe(false);
  });

  it("a membership change resyncs the items", () => {
    const r = root();
    const a = new MicroW({ root: r, title: "A" });
    a.focus();
    const bar = MicroW.taskbar(r)!;

    const b = new MicroW({ root: r, title: "B" });

    expect(items(bar).map((el) => el.textContent)).toEqual(["A", "B"]);
    expect(items(bar)[1].getAttribute("aria-controls")).toBe(b.element.id);

    b.destroy();

    expect(items(bar).map((el) => el.textContent)).toEqual(["A"]);
    expect(cue(bar, 0)).toBe(true);
  });

  it("a state change updates the affected item even when no window takes focus", () => {
    const r = root();
    const win = new MicroW({ root: r, title: "A" });
    const bar = MicroW.taskbar(r)!;
    const item = items(bar)[0];

    win.focus();
    expect(item.classList.contains("mcrw-taskbar-item-focused")).toBe(true);

    // Minimizing the only focused window hands DOM focus to the taskbar; no
    // window takes model focus, so only the state channel fires.
    win.minimize();

    expect(item.classList.contains("mcrw-taskbar-item-min")).toBe(true);
    expect(item.classList.contains("mcrw-taskbar-item-focused")).toBe(false);
    expect(items(bar)).toEqual([item]);

    win.restore();

    expect(item.classList.contains("mcrw-taskbar-item-min")).toBe(false);
    expect(item.classList.contains("mcrw-taskbar-item-focused")).toBe(true);
  });
});
