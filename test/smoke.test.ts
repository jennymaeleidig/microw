import { afterEach, describe, expect, it } from "vitest";
import { MicroW } from "../src/index.js";
import { createSeam } from "./support/seam.js";
import type { Seam } from "./support/seam.js";

describe("MicroW construction", () => {
  let seam: Seam;

  afterEach(() => {
    seam?.cleanup();
  });

  it("mounts a .mcrw element into document.body when constructed without geometry", () => {
    seam = createSeam();
    new MicroW();
    const mounted = seam.document.body.querySelector(".mcrw");
    expect(mounted).not.toBeNull();
    expect(mounted?.tagName).toBe("DIV");
  });
});
