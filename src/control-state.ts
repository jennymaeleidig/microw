// SPDX-License-Identifier: CC0-1.0
import type { MicroW } from "./microw.js";

/**
 * The single writer of state-exposure ARIA. Every state transition funnels
 * the window through here (max control `aria-pressed`), and the taskbar's
 * sync funnels each item through here (`aria-expanded`/`aria-controls`), so
 * the DOM never lies about window state.
 */
export function updateControlState(win: MicroW, item?: HTMLElement): void {
  const state = win.getState().state;
  const max = win.element.querySelector(".mcrw-btn-max");
  max?.setAttribute("aria-pressed", state === "max" ? "true" : "false");
  if (item !== undefined) {
    item.setAttribute("aria-expanded", state === "min" ? "false" : "true");
    if (win.element.id !== "") {
      item.setAttribute("aria-controls", win.element.id);
    }
  }
}
