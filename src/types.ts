import type { MicroW } from "./microw.js";

export type WindowState = "normal" | "min" | "max";

export type ControlName = "min" | "max" | "close";

export type ResizeDirection = "n" | "e" | "s" | "w" | "ne" | "nw" | "se" | "sw";

export type TaskbarSide = "bottom" | "top" | "left" | "right";

export type TaskbarGrow = "right" | "left" | "down" | "up";

export type TaskbarAlign = "start" | "center" | "end";

export type CascadeMode = "cascade" | "random";

export interface ControlsOptions {
  left?: ControlName[];
  right?: ControlName[];
}

export interface ControlLabels {
  min: string;
  max: string;
  close: string;
  moveHint: string;
  taskbarLabel: string;
  untitledWindow: string;
}

export interface TaskbarOptions {
  side?: TaskbarSide;
  grow?: TaskbarGrow;
  align?: TaskbarAlign;
}

export interface MicroWGlobalOptions {
  taskbar?: boolean;
}

export interface CascadeOptions {
  root?: HTMLElement;
  mode: CascadeMode;
}

export interface WorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowSnapshot {
  state: WindowState;
  focused: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number | undefined;
  minHeight: number | undefined;
  title: string | undefined;
  workArea: WorkArea;
}

export type WindowEventCallback = (win: MicroW) => void;

export type WindowGeometryCallback = (win: MicroW, rect: Rect) => void;

export interface MicroWOptions {
  root?: HTMLElement;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  title?: string;
  html?: string;
  controls?: ControlsOptions;
  resizable?: boolean;
  taskbar?: boolean;
  fallbackFocus?: HTMLElement;
  class?: string;
  id?: string;
  oncreate?: WindowEventCallback;
  onmaximize?: WindowEventCallback;
  onminimize?: WindowEventCallback;
  onrestore?: WindowEventCallback;
  onclose?: WindowEventCallback;
  onfocus?: WindowEventCallback;
  onblur?: WindowEventCallback;
  onmove?: WindowGeometryCallback;
  onresize?: WindowGeometryCallback;
}
