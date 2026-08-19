# microw

A zero-dependency, headless, framework-agnostic window management microframework for the web.

microw manages the **behavior** of desktop-style windows — state, z-order, drag, resize, and DOM structure — inside a consumer-supplied **root**. Every pixel of styling is your CSS. The library never injects styles, never ships a look, and has zero runtime dependencies.

> The full contract — the `mcrw-*` class contract, root-geometry and work-area rules, the state model, the taskbar's class hooks, and the complete API reference — is in [**docs/reference.md**](docs/reference.md).

## Install

```sh
npm install microw
```

Plain JavaScript and TypeScript both import the same package; types ship first-class.

## Quick start

```js
import { MicroW } from "microw";

const win = new MicroW({
  root: document.getElementById("desktop"),
  title: "Hello",
  html: "<p>window body</p>",
});
```

A window mounts at construction: a `.mcrw` element is appended to the root, ready for your CSS. The only styling the library requires from you is the root contract:

```css
#desktop {
  position: relative; /* windows are absolutely positioned inside it */
  isolation: isolate; /* root-scoped stacking (two-level isolation) */
}

.mcrw {
  position: absolute;
  isolation: isolate;
  /* everything visual — background, border, radius, shadow — is yours */
}
```

## The headless contract

microw renders **structure only**. It writes dynamic geometry (`left` / `top` / `width` / `height`) and the stacking `z-index` onto each window, and nothing else. Everything visual is consumer CSS, keyed to the `mcrw-*` class contract.

### Structure

| Class                                               | Role                                                        |
| --------------------------------------------------- | ----------------------------------------------------------- |
| `.mcrw`                                             | the window; `position: absolute` in its root                |
| `.mcrw-header`                                      | the drag surface                                            |
| `.mcrw-title`                                       | the title text — **presentational**, restyle or hide freely |
| `.mcrw-body`                                        | the content area                                            |
| `.mcrw-resize-n/-e/-s/-w/-ne/-nw/-se/-sw`           | the eight resize handles (present iff `resizable`)          |
| `.mcrw-btn-min`, `.mcrw-btn-max`, `.mcrw-btn-close` | header controls (present iff enabled)                       |

### State classes

The library toggles these; `normal` carries no class (base `.mcrw` rules **are** normal styling):

| Class            | Meaning                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| `mcrw-min`       | minimized — the only hiding class; hide it with your CSS                   |
| `mcrw-max`       | maximized (fills the work area)                                            |
| `mcrw-focused`   | the focused window                                                         |
| `mcrw-no-resize` | resize disabled (added by `resizable: false`, or applied by you as a gate) |

### Root geometry

- The root must be `position: relative` with `isolation: isolate`. It must have a box — not `display: contents` or `display: none`.
- Coordinates are **container-relative** and measured at the root's padding edge, so a bordered root yields correct placement (borders are corrected automatically).
- Translation-only transforms (`translate`, `translateZ(0)`) are safe on the root; `scale` and `rotate` are not supported.
- Windows are always clamped **wholly inside the root's work area** — the root minus any taskbar strip — and re-clamp when the root or viewport resizes.

## API

### Construction

```js
new MicroW(options);
```

All options are optional.

| Option                                                                              | Type                  | Default                                        | Meaning                                                            |
| ----------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| `root`                                                                              | `HTMLElement`         | `document.body`                                | the window's root; fixed at construction                           |
| `x`, `y`                                                                            | `number`              | centered                                       | container-relative position                                        |
| `width`, `height`                                                                   | `number`              | 25% of work-area width, 4:3                    | window size                                                        |
| `minWidth`, `minHeight`                                                             | `number`              | —                                              | soft minimum size (the work area wins)                             |
| `title`                                                                             | `string`              | —                                              | header title text                                                  |
| `html`                                                                              | `string`              | —                                              | body inner HTML                                                    |
| `controls`                                                                          | `{ left, right }`     | `{ left: [], right: ["min", "max", "close"] }` | header controls                                                    |
| `resizable`                                                                         | `boolean`             | `true`                                         | add handles or the `mcrw-no-resize` gate                           |
| `taskbar`                                                                           | `boolean`             | `true`                                         | `false` opts this window out (and makes it non-minimizable)        |
| `class`, `id`                                                                       | `string`              | —                                              | passed onto the `.mcrw` element                                    |
| `oncreate`, `onmaximize`, `onminimize`, `onrestore`, `onclose`, `onfocus`, `onblur` | `(win) => void`       | —                                              | lifecycle callbacks                                                |
| `onmove`, `onresize`                                                                | `(win, rect) => void` | —                                              | geometry callbacks, receive the full new `{ x, y, width, height }` |

### Instance methods

All chainable (return the instance) unless noted.

- `minimize()` — transition to `min`; if focused, blurs and hands focus to the next MRU window. No-op when the window is not minimizable.
- `maximize()` — fill the work area, remembering pre-max geometry.
- `restore()` — return to the pre-minimize state (`max → min → restore` lands on `max`, still remembering pre-max geometry), or `max → normal` with the pre-max geometry restored; fires `onrestore` and focuses.
- `moveTo(x, y)` — move programmatically (no-op outside `normal`).
- `resizeTo(width, height)` — resize to an absolute size.
- `resizeFrom(dir, { dx, dy })` — resize from one of the eight directions.
- `focus()` — make this the focused, topmost window.
- `getState()` — read live state (below).
- `destroy()` — remove the window, its registry entry, and its taskbar item; hands focus to the next MRU window.

Readonly properties: `root`, `element`, and `minimizable`.

`getState()` returns:

```ts
{
  state,        // "normal" | "min" | "max"
  focused,      // boolean
  x, y, width, height,
  minWidth, minHeight,
  title,
  workArea,     // { x, y, width, height } — reflects the current taskbar band
}
```

### Statics

- `MicroW.taskbar(root?, options?)` — mount a headless taskbar for a root. Returns a `Taskbar` (with `destroy()`) or `null` when taskbars are globally disabled.
- `MicroW.windows(root?)` — the live windows of a root (or every window when no root is given).
- `MicroW.destroyAll()` — destroy every window and return the count.
- `MicroW.configure({ taskbar: false })` — disable minimize/taskbar globally; restores any minimized windows rather than stranding them.
- `MicroW.cascade({ root?, mode })` — auto-place new windows in `"cascade"` (stepped staircase) or `"random"` (seeded) slots. Default placement only: a window you position explicitly is never rearranged.

## The taskbar

`MicroW.taskbar(root, { side, grow, align })` mounts a `.mcrw-taskbar` as a sibling of the windows in the root. It lists one `.mcrw-taskbar-item` per minimizable live window, in creation order, with `mcrw-taskbar-item-min` / `-max` state classes and `mcrw-taskbar-item-focused` tracking focus in place. Clicking a minimized item restores it; clicking a normal or maximized item focuses it. The bar reserves its side of the root as the work area, so windows never sit behind it.

The class hooks are `mcrw-taskbar-bottom/-top/-left/-right`, `mcrw-taskbar-grow-right/-left/-down/-up`, and `mcrw-taskbar-align-start/-center/-end`; one of each is always present, defaulting to `bottom`, the axis default (`right`/`down`), and `start`. Positioning and appearance are yours — for example, a bottom bar growing right:

```css
.mcrw-taskbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 4px;
  z-index: 1000; /* above its root's windows */
}
.mcrw-taskbar-item {
  padding: 4px 8px;
  cursor: pointer;
}
```

## TypeScript

Types ship first-class and are exported for every option, callback, and static — `MicroWOptions`, the callback types, the `Taskbar` shape, and every option union. Everything a TypeScript consumer imports is compile-checked against the shipped `.d.ts`.

## Frameworks

microw owns only its own DOM and state. Give it a ref-managed node your framework renders once and never reconciles over; re-renders and change detection pass around it untouched. Style `mcrw-*` globally — framework-scoped styles can't be relied on for the window's structure.

## Development

```sh
npm install
npm test              # headless suite (jsdom + stubbed layout)
npm run build         # tsc: ESM + CJS + .d.ts + source maps into dist/
npm run verify:dist   # both dist formats construct a window, exports map, residue
npm run verify:types  # a TS consumer compiles against the shipped .d.ts
npm run verify:framework  # a React re-render leaves a window intact
npm run demo          # live user-testing demo (builds, serves, and opens a browser)
npm run format        # prettier --write .
```

## License

CC0-1.0 — public domain dedication. Use it anywhere, for anything.
