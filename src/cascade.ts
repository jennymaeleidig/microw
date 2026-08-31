import { windowsOf } from "./registry.js";
import { measureWorkArea, onWorkAreaChange } from "./work-area.js";
import type { MicroW } from "./microw.js";
import type { CascadeMode, WorkArea } from "./types.js";

interface CascadeConfig {
  mode: CascadeMode;
  seed: number;
  counter: number;
}

const configs = new Map<HTMLElement, CascadeConfig>();
const owned = new Map<HTMLElement, Set<MicroW>>();
let nextSeed = 1;

export function configureCascade(root: HTMLElement, mode: CascadeMode): void {
  const existing = configs.get(root);
  if (existing === undefined) {
    configs.set(root, { mode, seed: nextSeed++, counter: 0 });
  } else {
    existing.mode = mode;
    existing.counter = 0;
  }
  // Baseline for the re-placement watcher: the configure-time re-placement
  // the facade dispatches right after this is not itself a work-area change.
  lastWorkArea.set(root, measureWorkArea(root));
}

export function configOf(root: HTMLElement): CascadeConfig | undefined {
  return configs.get(root);
}

export function configuredRoots(): HTMLElement[] {
  return [...configs.keys()];
}

export function markOwned(win: MicroW): void {
  let set = owned.get(win.root);
  if (set === undefined) {
    set = new Set();
    owned.set(win.root, set);
  }
  set.add(win);
}

export function releaseOwned(win: MicroW): void {
  const set = owned.get(win.root);
  if (set === undefined) {
    return;
  }
  set.delete(win);
  if (set.size === 0) {
    owned.delete(win.root);
    resetCounter(win.root);
  }
}

export function ownedWindows(root: HTMLElement): MicroW[] {
  const set = owned.get(root);
  if (set === undefined) {
    return [];
  }
  return windowsOf(root).filter((win) => set.has(win));
}

export function resetCounter(root: HTMLElement): void {
  const cfg = configs.get(root);
  if (cfg !== undefined) {
    cfg.counter = 0;
  }
}

/**
 * The nth slot of a stepped staircase: ⌈w/8⌉ × ⌈h/8⌉ offsets from the work
 * area's top-left. When the slot would walk past the right or bottom edge the
 * staircase restarts at the origin. The per-root counter advances only for
 * cascade-placed windows.
 */
export function nextCascadeSlot(
  root: HTMLElement,
  workArea: WorkArea,
  width: number,
  height: number,
): { x: number; y: number } {
  const cfg = configs.get(root)!;
  const stepX = Math.ceil(width / 8);
  const stepY = Math.ceil(height / 8);
  let x = workArea.x + cfg.counter * stepX;
  let y = workArea.y + cfg.counter * stepY;
  const overflows =
    x + width > workArea.x + workArea.width ||
    y + height > workArea.y + workArea.height;
  if (overflows && cfg.counter !== 0) {
    cfg.counter = 0;
    x = workArea.x;
    y = workArea.y;
  }
  cfg.counter += 1;
  return { x, y };
}

/**
 * The nth offset roll in a root's seeded random sequence: advances the
 * per-root counter only for cascade-placed windows, mirroring the staircase's
 * slot counter so handoffs leave no gap that a later mount could re-roll into.
 */
export function nextRandomIndex(root: HTMLElement): number {
  const cfg = configs.get(root)!;
  const index = cfg.counter;
  cfg.counter += 1;
  return index;
}

/**
 * A seeded, deterministic offset for the index-th placed window. Rolling two
 * values per index keeps each window's placement reproducible from the seed
 * alone; replaying in creation order re-derives the same arrangement.
 */
export function randomOffset(
  seed: number,
  index: number,
  workArea: WorkArea,
  width: number,
  height: number,
): { x: number; y: number } {
  const rng = mulberry32(seed);
  for (let i = 0; i < index; i++) {
    rng();
    rng();
  }
  const maxX = Math.max(0, workArea.width - width);
  const maxY = Math.max(0, workArea.height - height);
  return {
    x: workArea.x + rng() * maxX,
    y: workArea.y + rng() * maxY,
  };
}

/**
 * The configured slot or roll for the nth cascade-placed window of a root:
 * the staircase step in cascade mode, the seeded offset in random mode.
 */
function slotFor(
  root: HTMLElement,
  cfg: CascadeConfig,
  workArea: WorkArea,
  width: number,
  height: number,
): { x: number; y: number } {
  return cfg.mode === "cascade"
    ? nextCascadeSlot(root, workArea, width, height)
    : randomOffset(cfg.seed, nextRandomIndex(root), workArea, width, height);
}

/**
 * "Place this window": the configured slot or roll for a cascade-placed
 * window, marking it owned. Returns null when the root has no cascade
 * configuration — the caller's signal to fall back to its own placement.
 */
export function placeWindow(
  win: MicroW,
  workArea: WorkArea,
  width: number,
  height: number,
): { x: number; y: number } | null {
  const cfg = configOf(win.root);
  if (cfg === undefined) {
    return null;
  }
  markOwned(win);
  return slotFor(win.root, cfg, workArea, width, height);
}

/**
 * "Re-place the windows you own": reset the slot counter and walk the root's
 * owned, normal-state windows through placement again, applying each new
 * position through the window's one geometry writer. Minimized and maximized
 * windows, and windows the consumer has taken over, are left alone.
 */
export function recascadeRoot(root: HTMLElement): void {
  const cfg = configOf(root);
  if (cfg === undefined) {
    return;
  }
  const workArea = measureWorkArea(root);
  resetCounter(root);
  for (const win of ownedWindows(root)) {
    const snap = win.getState();
    if (snap.state !== "normal") {
      continue;
    }
    const pos = slotFor(root, cfg, workArea, snap.width, snap.height);
    win.applyRect({
      x: pos.x,
      y: pos.y,
      width: snap.width,
      height: snap.height,
    });
  }
}

// The watcher lives here with the policy it serves: a work-area change on a
// configured root re-places the windows cascade still owns.
const lastWorkArea = new Map<HTMLElement, WorkArea>();

onWorkAreaChange(() => {
  for (const root of configuredRoots()) {
    const workArea = measureWorkArea(root);
    const last = lastWorkArea.get(root);
    if (
      last !== undefined &&
      last.x === workArea.x &&
      last.y === workArea.y &&
      last.width === workArea.width &&
      last.height === workArea.height
    ) {
      continue;
    }
    lastWorkArea.set(root, workArea);
    recascadeRoot(root);
  }
});

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
