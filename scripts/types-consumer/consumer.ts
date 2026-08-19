// A TypeScript consumer exercising the shipped public surface. This file is
// compiled (type-checked only) against dist/types/index.d.ts — the same
// declaration a real consumer resolves through the `exports` map's `types`
// condition — to prove every option, callback, and static has an exported type
// and the API compiles end to end.

import { MicroW } from "microw";
import type {
  CascadeMode,
  CascadeOptions,
  ControlName,
  ControlsOptions,
  MicroWGlobalOptions,
  MicroWOptions,
  Rect,
  ResizeDirection,
  Taskbar,
  TaskbarAlign,
  TaskbarGrow,
  TaskbarOptions,
  TaskbarSide,
  WindowEventCallback,
  WindowGeometryCallback,
  WindowSnapshot,
  WindowState,
  WorkArea,
} from "microw";

// ---- Every named option type is importable and assignable ----------------

const controls: ControlsOptions = { left: ["close"], right: ["min", "max"] };
const taskbarOptions: TaskbarOptions = {
  side: "bottom",
  grow: "right",
  align: "start",
};
const globalOptions: MicroWGlobalOptions = { taskbar: false };
const cascadeOptions: CascadeOptions = {
  root: document.body,
  mode: "cascade",
};

const onEvent: WindowEventCallback = (win) => {
  const typed: MicroW = win;
  void typed;
};

const onGeometry: WindowGeometryCallback = (_win, rect) => {
  const typed: Rect = rect;
  const x: number = typed.x;
  const y: number = typed.y;
  const width: number = typed.width;
  const height: number = typed.height;
  void [x, y, width, height];
};

// ---- Every option in MicroWOptions is accepted ---------------------------

const options: MicroWOptions = {
  root: document.body,
  x: 8,
  y: 16,
  width: 480,
  height: 320,
  minWidth: 120,
  minHeight: 96,
  title: "Consumer",
  html: "<p>body</p>",
  controls,
  resizable: true,
  taskbar: true,
  class: "my-window",
  id: "window-1",
  oncreate: onEvent,
  onmaximize: onEvent,
  onminimize: onEvent,
  onrestore: onEvent,
  onclose: onEvent,
  onfocus: onEvent,
  onblur: onEvent,
  onmove: onGeometry,
  onresize: onGeometry,
};

const win = new MicroW(options);

// ---- Instance surface: methods are chainable, properties typed ------------

const chained: MicroW = win
  .minimize()
  .maximize()
  .restore()
  .moveTo(10, 10)
  .resizeTo(200, 150)
  .resizeFrom("se", { dx: 5, dy: 5 })
  .focus();
void chained;

const element: HTMLElement = win.element;
const root: HTMLElement = win.root;
const minimizable: boolean = win.minimizable;

const snapshot: WindowSnapshot = win.getState();
const state: WindowState = snapshot.state;
const focused: boolean = snapshot.focused;
const workArea: WorkArea = snapshot.workArea;
const minWidth: number | undefined = snapshot.minWidth;
const minHeight: number | undefined = snapshot.minHeight;
const title: string | undefined = snapshot.title;

// ---- Statics -------------------------------------------------------------

const all: MicroW[] = MicroW.windows();
const inRoot: MicroW[] = MicroW.windows(document.body);

MicroW.cascade({ root: document.body, mode: "cascade" });
MicroW.cascade(cascadeOptions);

const bar: Taskbar | null = MicroW.taskbar(document.body, taskbarOptions);
bar?.destroy();

MicroW.configure({ taskbar: true });
MicroW.configure(globalOptions);

const closed: number = MicroW.destroyAll();

// ---- Scalar option types -------------------------------------------------

const direction: ResizeDirection = "ne";
const mode: CascadeMode = "random";
const side: TaskbarSide = "left";
const grow: TaskbarGrow = "up";
const align: TaskbarAlign = "end";
const control: ControlName = "max";
const rect: Rect = { x: 0, y: 0, width: 1, height: 1 };

void [
  all,
  inRoot,
  closed,
  element,
  root,
  minimizable,
  state,
  focused,
  workArea,
  minWidth,
  minHeight,
  title,
  direction,
  mode,
  side,
  grow,
  align,
  control,
  rect,
];
