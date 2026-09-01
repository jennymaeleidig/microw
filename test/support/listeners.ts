import { MicroW } from "../../src/index.js";
import { createSeam } from "./seam.js";
import type { Seam } from "./seam.js";

// Shared harness for the global-listener test blocks: a fresh seam per test
// (created in setup, torn down in cleanup — the seam installs the stubbed
// document globals, so it cannot outlive a test), a tracked subscribe that
// tears every listener down in cleanup, and a laid-out root. Each channel's
// describe block adds only its own tests.
export function createListenerHarness() {
  let seam: Seam;
  let unsubscribers: Array<() => void>;

  function tracked(subscribe: () => () => void): () => void {
    const unsub = subscribe();
    unsubscribers.push(unsub);
    return unsub;
  }

  function setup(): void {
    seam = createSeam();
    unsubscribers = [];
  }

  function cleanup(): void {
    for (const unsub of unsubscribers.splice(0)) {
      unsub();
    }
    MicroW.destroyAll();
    seam.cleanup();
  }

  function root(): HTMLElement {
    const el = seam.document.createElement("div");
    seam.setLayout(el, { x: 0, y: 0, width: 800, height: 600 });
    seam.document.body.appendChild(el);
    return el;
  }

  return { tracked, setup, cleanup, root };
}
