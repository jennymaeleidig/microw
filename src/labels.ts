// SPDX-License-Identifier: CC0-1.0
import type { ControlLabels } from "./types.js";

export const DEFAULT_CONTROL_LABELS: ControlLabels = {
  min: "Minimize",
  max: "Maximize",
  close: "Close",
  moveHint: "Arrow keys to move, Alt+arrow keys to resize.",
  taskbarLabel: "Taskbar",
  untitledWindow: "Untitled window",
};

let labels: ControlLabels = { ...DEFAULT_CONTROL_LABELS };

export function controlLabels(): ControlLabels {
  return labels;
}

export function setControlLabels(patch: Partial<ControlLabels>): void {
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value !== "string") {
      throw new TypeError(`MicroW: label "${key}" must be a string`);
    }
  }
  labels = { ...labels, ...patch };
}
