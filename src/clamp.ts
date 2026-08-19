import type { Rect, ResizeDirection, WorkArea } from "./types.js";

/**
 * Clamps a window position so the window sits wholly inside the work area.
 * Both drag and `moveTo` route through here so they never diverge.
 */
export function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  workArea: WorkArea,
): { x: number; y: number } {
  return {
    x: clampAxis(x, workArea.x, workArea.x + workArea.width - width),
    y: clampAxis(y, workArea.y, workArea.y + workArea.height - height),
  };
}

export function clampAxis(value: number, min: number, max: number): number {
  // When the window exceeds the work area on an axis, no position keeps it
  // inside; pin it to the origin edge. Shrinking an oversized window is the
  // resize clamp's job, not the position clamp's.
  if (max < min) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

/**
 * Applies a directional delta to a rect and clamps the moved edges. This is
 * the one resize path: pointer-resize and `resizeFrom` both route through it
 * so they can never diverge. The opposite edge of each moved edge stays fixed;
 * a moved edge stops at the work-area bound on its side and at the opposite
 * edge ± the minimum size on its shrink side. When the work area is smaller
 * than the minimum, the work area wins.
 */
export function clampResize(
  dir: ResizeDirection,
  rect: Rect,
  dx: number,
  dy: number,
  workArea: WorkArea,
  minWidth: number | undefined,
  minHeight: number | undefined,
): Rect {
  const minW = minWidth ?? 0;
  const minH = minHeight ?? 0;
  const left = rect.x;
  const top = rect.y;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  const workRight = workArea.x + workArea.width;
  const workBottom = workArea.y + workArea.height;

  const result: Rect = { ...rect };

  if (dir.includes("e")) {
    const newRight = clampGrowingEdge(right + dx, left, minW, workRight);
    result.width = newRight - left;
  } else if (dir.includes("w")) {
    const newLeft = clampShrinkingEdge(left + dx, right, minW, workArea.x);
    result.x = newLeft;
    result.width = right - newLeft;
  }

  if (dir.includes("s")) {
    const newBottom = clampGrowingEdge(bottom + dy, top, minH, workBottom);
    result.height = newBottom - top;
  } else if (dir.includes("n")) {
    const newTop = clampShrinkingEdge(top + dy, bottom, minH, workArea.y);
    result.y = newTop;
    result.height = bottom - newTop;
  }

  return result;
}

// Clamps an edge that grows toward +infinity (right/bottom): it must not pass
// the work-area bound on its side, nor shrink past `opposite + minSize`.
function clampGrowingEdge(
  moving: number,
  opposite: number,
  minSize: number,
  bound: number,
): number {
  return clampAxis(moving, Math.min(opposite + minSize, bound), bound);
}

// Clamps an edge that grows toward -infinity (left/top): it must not pass the
// work-area bound on its side, nor shrink past `opposite - minSize`.
function clampShrinkingEdge(
  moving: number,
  opposite: number,
  minSize: number,
  bound: number,
): number {
  return clampAxis(moving, bound, Math.max(opposite - minSize, bound));
}
