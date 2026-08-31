# Reference

The complete microw contract, in one place. This is the document to read end to
end when integrating microw: the `mcrw-*` class contract, the root-geometry and
work-area rules, the state model, the taskbar's class hooks, the accessibility
contract, and the full API
surface.

The [README](../README.md) is the entry point — install, quick start, and a
condensed version of everything here. This reference is the authoritative
detail.

## 1. The headless contract

microw renders **structure only**. It never injects a stylesheet, never ships a
theme, and never writes static CSS. The library writes exactly two kinds of
dynamic values onto each window's `style` attribute:

- **Geometry** — `left` / `top` / `width` / `height`, rounded to whole pixels.
- **Stacking** — `z-index`, in the band `[1, 999]`.

Everything visual is consumer CSS, keyed to the `mcrw-*` class contract. The
only styling the library _requires_ you to write is the root contract (see
[Root geometry](#3-root-geometry-and-work-area)) plus `position: absolute` and
`isolation: isolate` on `.mcrw` — those two are structural, so the library
leaves them to you rather than repeating them inline.

### The `mcrw-*` class contract

A window's DOM is:

```
.mcrw                                        window root; role="dialog", tabindex="-1"; position: absolute in its root
├── .mcrw-header                             the drag surface; the window's single keyboard tab stop (tabindex="0")
│   ├── .mcrw-btn-* …                        enabled left controls, in configured order — native buttons
│   ├── .mcrw-title                          the title text
│   └── .mcrw-btn-* …                        enabled right controls, in configured order — native buttons
├── .mcrw-body                               the content area
└── .mcrw-resize-n/-e/-s/-w/-ne/-nw/-se/-sw  the eight resize handles (present iff resizable)
```

The handles are direct children of `.mcrw`, in exactly that compass order:
`n`, `e`, `s`, `w`, `ne`, `nw`, `se`, `sw`. You position them with your CSS.

**Structural versus presentational.** Every class in the tree above is
structural except one:

| Class                                                 | Kind           | Role                                         |
| ----------------------------------------------------- | -------------- | -------------------------------------------- |
| `.mcrw`                                               | structural     | the window; `position: absolute` in its root |
| `.mcrw-header`                                        | structural     | the drag surface                             |
| `.mcrw-title`                                         | presentational | title text — restyle or hide freely          |
| `.mcrw-body`                                          | structural     | the content area                             |
| `.mcrw-resize-*` (eight)                              | structural     | resize handles; present iff `resizable`      |
| `.mcrw-btn-min` / `.mcrw-btn-max` / `.mcrw-btn-close` | structural     | header controls; present iff enabled         |

"Structural" means the element is part of the library's behavior — drag,
resize, state, stacking — and must remain in global consumer CSS so the
behavior keeps working. "Presentational" means the element exists only as a
convenience; it carries no behavior and you may restyle or hide it freely. Only
`.mcrw-title` is presentational.

**Controls.** The three controls are `min`, `max`, and `close`. A control is
structural _iff_ it is enabled; a disabled control is simply absent from the
DOM. Controls are arranged per side via the `controls` option (see
[Construction](#construction)). Controls are native `<button type="button">`
elements carrying `aria-label`s from the labels bag (see
[The accessibility contract](#2-the-accessibility-contract)). The `min`
control is also omitted when the taskbar is globally disabled. An unknown
control name throws a `TypeError`.

**State classes.** The library toggles these; `normal` carries no class — the
base `.mcrw` rules _are_ normal styling:

| Class            | Meaning                                                                             |
| ---------------- | ----------------------------------------------------------------------------------- |
| `mcrw-min`       | minimized — the only hiding class; hide it with your CSS                            |
| `mcrw-max`       | maximized (fills the work area)                                                     |
| `mcrw-focused`   | the focused window — visual-only; semantic focus is DOM focus (see [Focus](#focus)) |
| `mcrw-no-resize` | resize disabled — added by `resizable: false`, or applied by you as a gate          |

**The resize gate.** `resizable: true` (the default) mounts the eight handles;
`resizable: false` omits them and adds `mcrw-no-resize`. The class also works as
a consumer-applied behavior gate: if you add `mcrw-no-resize` yourself (say,
from a media query), the handles stay in the DOM but the library checks the
class at drag time and refuses to resize.

## 2. The accessibility contract

v1.1 ships WCAG Level A conformance for the DOM the library creates. Windows
are named, role-correct dialogs: the container is `role="dialog"` with
`tabindex="-1"`, named by its visible title (`aria-labelledby` → the
`.mcrw-title` element's auto-assigned `mcrw-title-N` id) or — when title-less —
by `aria-label` from the `untitledWindow` label. Auto-assigned ids
(`mcrw-title-N`, and `mcrw-win-N` on minimizable windows for taskbar
`aria-controls`) fill gaps only: a consumer-supplied `id` always wins. Header
controls and taskbar items are native `<button type="button">` elements —
tab-reachable, activated by Enter/Space, with no key handling added by the
library — and the max control exposes `aria-pressed` while its label stays the
constant "Maximize".

The `.mcrw-header` is the window's single keyboard tab stop (`tabindex="0"`):
focused there, the arrow keys move the window in 10 px steps (Shift: 100 px)
and
Alt+arrow keys resize it from its bottom-right corner — clamped, gated, and
callback-fired exactly like pointer drags, through the same public
`moveTo`/`resizeFrom` APIs. Its accessible name pairs identity with the
affordance: `"{title}. {moveHint}"`.

Model focus directs DOM focus one-way
([ADR-0010](adr/0010-model-focus-directs-dom-focus.md)): `focus()` moves real
DOM focus to the container with scrolling suppressed — on every call, even
when the window is already model-focused, so DOM focus that drifted away is
recaptured — and a minimize/close
hand-off with no window to receive it falls to the root's taskbar element,
then to the window's `fallbackFocus` option, then does nothing. DOM focus
never feeds back into the model.

Five responsibilities stay with you — the consumer side of the conformance
deal:

1. **Focus-visible styling.** The library ships zero CSS, so focus indication
   is yours: style `:focus-visible` on `.mcrw` (the focused container), the
   `.mcrw-header` tab stop, `.mcrw-btn-*` controls, `.mcrw-taskbar`, and
   `.mcrw-taskbar-item` — plus any element you supply as a `fallbackFocus`
   target. Without it, keyboard users cannot see where they are.
2. **`mcrw-focused` is visual-only.** Semantic focus is real DOM focus on the
   container (ADR-0010); the class is a styling channel for your CSS, not an
   announcement. Don't derive behavior from it.
3. **Non-drag affordances.** Anything beyond the built-in drag, resize, and
   header keyboard support — snapping, tiling, custom movers — must be
   composed from the public `moveTo()`/`resizeFrom()`, so it stays reachable
   without a pointer (WCAG 2.5.7, Dragging Movement).
4. **The native-button reset.** Because controls and taskbar items are real
   buttons, user-agent button styling applies until you neutralize it, keyed
   to `.mcrw-btn-*` and `.mcrw-taskbar-item`. A reset is **required before**
   system.css- or classicy-tier cultivar mapping (they ship no bare-`button`
   rule, so UA `padding` / `font` / `box-sizing` leak through their scoped
   selectors) and **unnecessary** where the source library resets `button`
   globally (98.css, 7.css, XP.css — whose inverse hazard is that microw's
   buttons inherit the library's form push-button look wherever the title-bar
   scope doesn't reach, so keep the controls inside the library's scoped
   wrapper, e.g. `title-bar-controls` on `.mcrw-header`). `aria-label` on the
   controls is mandatory in every mapping — microw supplies it from the
   labels bag; never strip it. microw ships no reset — the reset belongs to
   your CSS, keeping the zero-CSS contract intact.
5. **`setControlLabels` is the i18n surface.** Every string microw renders
   for accessibility — the control names ("Minimize", "Maximize", "Close"),
   the header move hint, the taskbar's group label, and the untitled-window
   fallback — is read from one global bag:
   `MicroW.setControlLabels({ min, max, close, moveHint, taskbarLabel, untitledWindow })`.
   English defaults ship, a call merges over them, and labels are read at
   render time.

## 3. Root geometry and work area

### Root requirements

A root is the element windows live in. It must:

- be `position: relative` — windows are `position: absolute` inside it, so this
  is what makes their coordinates root-relative;
- have `isolation: isolate` — this establishes the root's stacking context
  (two-level isolation, one per root and one per window);
- have a box — `display: contents` or `display: none` yields zero rects and
  nothing works.

The root defaults to `document.body`, whose initial containing block serves the
same role.

### Coordinates

All coordinates and sizes are **container-relative**: `x`, `y`, `width`, and
`height` are measured in pixels from the root's padding edge (the
containing-block origin). There is no document-relative or `position: fixed`
placement, and a window's root is fixed at construction — it never re-parents.

**Border correction.** Every pointer event reads the root's
`getBoundingClientRect()` and subtracts `clientLeft` / `clientTop`, so a
bordered root yields correct placement: the window's origin is inside the
border, at the padding edge. Padding needs no correction.

**Transforms.** Translation-only transforms (`translate`, `translateZ(0)`) are
safe on the root — the vector cancels out of the per-event conversion. `scale`
and `rotate` (either syntax) are forbidden: post-transform pixels can't round
back to container coordinates. `contain: paint` clips and is harmless under the
work-area invariant. These rules are documented, not enforced — there is no
runtime CSS police.

### Work area

The work area is the region of the root available to windows: the root's
padding box (`clientWidth` × `clientHeight`) minus the band reserved by a
mounted taskbar (see [The taskbar](#5-the-taskbar)). It is measured live per
event, never cached, so a taskbar's current rect is always reflected.

### The invariant

A window is **always wholly inside its work area**. Drag and resize clamp to it;
maximize fills it; a window created larger than the work area shrinks to fit.
When the root or the viewport resizes, every window re-clamps into the (new)
work area — `max` windows re-fit it, `min` windows are left untouched, and
library-owned cascade windows re-place (see [Cascade](#6-cascade)). The
re-clamp fires `onmove` / `onresize` coalesced to at most once per window per
frame.

## 4. State model

### States

A window has one of three **mutually exclusive** states — `normal`, `min`, or
`max` — and one **orthogonal** state, focus. There is no separate "hidden"
state: minimize is the only way a window leaves view.

| State    | Class      | Meaning                                               |
| -------- | ---------- | ----------------------------------------------------- |
| `normal` | _(none)_   | the base state; base `.mcrw` rules are normal styling |
| `min`    | `mcrw-min` | class-only: geometry untouched, the only hiding class |
| `max`    | `mcrw-max` | fills the work area, remembering the pre-max geometry |

### Focus

Focus is model state, and model focus directs DOM focus one-way
([ADR-0010 — model focus directs DOM focus](adr/0010-model-focus-directs-dom-focus.md)):
the focused window is topmost in its root, its container holds real DOM focus
(`focus({ preventScroll: true })` — the container is `tabindex="-1"`), and
consumer-driven DOM focus changes never feed back into the model. A newly
created window mounts on top but is not focused until something focuses it.
Because focus is orthogonal to the three states, a minimized or maximized
window can still be the focused one.

### Transitions

**`minimize()`** — transition to `min`: adds `mcrw-min`, leaves geometry
untouched, **remembers the state it left** (`normal` or `max`), and fires
`onminimize`. If the window was focused, it blurs (`onblur`) and hands focus to
the next most-recently-used **non-minimized** window (`onfocus`); if none
exists, DOM focus falls to the taskbar element, the window's `fallbackFocus`,
or stays put (see [Focus hand-off](#focus-hand-off)). Minimize is a **no-op**
on a non-minimizable
window (see [Minimizable](#minimizable)), so nothing can be stranded in a state
with no way back.

**`maximize()`** — fill the work area, remembering the pre-max geometry; fires
`onmaximize`. The header's `mcrw-btn-max` control toggles `normal ↔ max` — the
only in-window control that returns a `max` window to `normal`.

**`restore()`** — returns a `min` window to the state it held before
minimizing: `normal → min → restore` lands on `normal`, while
`max → min → restore` lands on `max` (re-filling the work area and still
remembering the pre-max geometry). Restoring from `max` returns to `normal`,
restoring and clearing the pre-max geometry. `onrestore` fires once per
restore, with the window already in its restored state — do not assume restore
always lands on `normal`. Restore also focuses the window, returns the
instance, and clamps the window wholly into the current work area (which may
have shrunk while `min`/`max`).

### Gating

Drag, `moveTo`, and resize — pointer and programmatic — are all **no-ops
outside `normal`**. A `max` window's geometry is owned by maximize; a `min`
window's geometry stays frozen. (Resize is additionally a no-op when
`mcrw-no-resize` is present.)

### Minimizable

A window is minimizable only when all three hold:

1. it opts into the taskbar (`taskbar` is not `false`),
2. the taskbar is globally enabled, and
3. its `min` control is enabled.

Otherwise `minimize()` is a no-op. The `minimizable` readonly property reports
the result.

### Focus hand-off

Close and minimize share one hand-off: focus goes to the next
most-recently-interacted non-minimized window in the root. When no window can
take it — minimize of the focused only window, or close of the focused last
window — DOM focus falls to the root's taskbar element (the restore
affordance), then to the window's `fallbackFocus` option, then does nothing:
with no taskbar and no fallback, DOM focus stays where it is (on the minimized
container, which is still focusable) or, after close removes the element, on
`body`. Focus never lands on a hidden window.

## 5. The taskbar

The taskbar is a shipped **headless** component — `MicroW.taskbar(root)` — one
per root, that lists that root's windows and restores them. It ships DOM
structure and state wiring only; all styling is consumer CSS.

### Mounting

```js
const taskbar = MicroW.taskbar(root, {
  side: "bottom",
  grow: "right",
  align: "start",
});
```

`MicroW.taskbar` returns a `Taskbar` (with `destroy()`) or `null` when taskbars
are globally disabled. Calling it again for the same root destroys the previous
bar and mounts a fresh one.

### Class hooks

The bar element is `.mcrw-taskbar`. Its `side`, `grow`, and `align` are class
hooks — always present, one per option, reflecting the resolved value (defaults
`bottom`, `right`/`down` by axis, `start`):

| Option  | Values                        | Default      | Class hook                      |
| ------- | ----------------------------- | ------------ | ------------------------------- |
| `side`  | `bottom` `top` `left` `right` | `bottom`     | `mcrw-taskbar-bottom` etc.      |
| `grow`  | in-axis only (below)          | axis default | `mcrw-taskbar-grow-right` etc.  |
| `align` | `start` `center` `end`        | `start`      | `mcrw-taskbar-align-start` etc. |

`grow` is constrained to the bar's axis: `right` / `left` for a `bottom` or
`top` bar (default `right`), `down` / `up` for a `left` or `right` bar (default
`down`). An out-of-axis grow falls back to the axis default. `side` and `align`
are validated strictly and throw on an unknown value.

The hooks are semantics only — _you_ map them to layout in your CSS. For a
flexbox bar, `grow` is the main-axis direction and `align` maps to
`justify-content` (or the cross-axis). See the recipe below.

### Items

One `.mcrw-taskbar-item` per **minimizable** live window of the root, in
creation order, and never reordered on focus. Items are native
`<button type="button">` elements — tab-reachable in creation order (no
roving tabindex), activated by Enter/Space like any button. Each item carries:

- the window's title as its accessible name (its text content), with the
  labels bag's `untitledWindow` as the fallback for title-less windows,
- `aria-expanded` — `false` exactly when the window is minimized — and
  `aria-controls` pointing at the window container's id,
- `mcrw-taskbar-item-min` / `mcrw-taskbar-item-max` state classes,
- `mcrw-taskbar-item-focused` when the window is focused — a visual cue only,
  since DOM focus carries the semantic announcement (the highlight moves in
  place; the item order is stable).

The bar itself is a labeled group: `role="group"` with `aria-label` from the
labels bag's `taskbarLabel`, and `tabindex="-1"` so it can receive DOM focus
as the focus-fallback target.

Clicking a `min` item calls `restore()`; clicking a `normal` or `max` item calls
`focus()` — the taskbar is a switcher, not just a restore affordance. Closing a
window collapses the gap; new windows mount at the end.

### Work-area band

The bar reserves its side of the root, and windows clamp to the remaining work
area. The band is measured live from the bar's `getBoundingClientRect()` on
every event — an empty bar reserves nothing, and `taskbar.destroy()` removes the
reservation and re-clamps windows to the full root.

### Per-window opt-out

`taskbar: false` on a window hides just that window's item and makes it
non-minimizable — `minimize()` is a no-op. A window is never stranded without a
restore affordance.

### Global disable

`MicroW.configure({ taskbar: false })` turns the taskbar off everywhere: it
strips the `min` control from every header, makes `minimize()` a no-op, and
restores any currently-minimized window to the state it held before minimizing
(rather than stranding it). `MicroW.taskbar(root)` then creates nothing and any
existing bars are destroyed.

### Reference recipe

A bottom bar that grows right, items aligned to the start — the contract, not a
shipped theme:

```css
.mcrw-taskbar {
  position: absolute;
  bottom: 0; /* side: bottom */
  left: 0;
  right: 0;
  display: flex; /* items in a row; grow-right is the main axis */
  gap: 4px;
  padding: 8px;
  z-index: 1000; /* above its root's windows (band [1, 999]) */
}

.mcrw-taskbar-item {
  padding: 4px 10px;
  cursor: pointer;
}

.mcrw-taskbar-item-focused {
  /* the focused window's item */
}
```

For the other sides and alignments, reposition the bar and map the hooks in
your own CSS — e.g. `mcrw-taskbar-grow-left` reverses the row,
`mcrw-taskbar-align-center`/`-end` shift `justify-content`, and a `left` /
`right` bar becomes a vertical rail whose `grow` is `down` / `up`.

## 6. Cascade

`MicroW.cascade({ root?, mode })` auto-places _new_ windows of a root into
offset slots, so windows don't open dead-on top of each other. `root` defaults
to `document.body`; `mode` is `"cascade"` or `"random"`.

- **`cascade`** — a stepped staircase: each library-placed window advances a
  per-root slot counter by `⌈w/8⌉ × ⌈h/8⌉` offsets from the work area's
  top-left, restarting at the origin when the next step would walk past the
  right or bottom edge.
- **`random`** — a seeded, deterministic offset within the work area: distinct
  sequences across roots, stable and reproducible within a root. Containment
  only — no overlap avoidance (focus/MRU resolves overlaps).

Cascade supplies **default placement only**. A window constructed with explicit
`x` / `y` is never cascade-placed; and a cascade-placed window becomes
consumer-owned the moment you drag, resize, or `moveTo` it — never rearranged
after that. When the work area changes, the library re-places only the windows
it still owns. Re-calling `MicroW.cascade` reconfigures the mode and re-places
library-owned windows. An unknown `mode` throws a `TypeError`.

## 7. API reference

### Construction

```js
new MicroW(options);
```

All options are optional. The window mounts at construction and unmounts only
when it closes.

| Option          | Type                        | Default                                        | Meaning                                                                                                                         |
| --------------- | --------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `root`          | `HTMLElement`               | `document.body`                                | the window's root; fixed at construction                                                                                        |
| `x`, `y`        | `number`                    | centered in the work area                      | container-relative position                                                                                                     |
| `width`         | `number`                    | 25% of work-area width                         | window width                                                                                                                    |
| `height`        | `number`                    | ¾ × `width` (4:3)                              | window height                                                                                                                   |
| `minWidth`      | `number`                    | —                                              | soft minimum width (the work area wins)                                                                                         |
| `minHeight`     | `number`                    | —                                              | soft minimum height (the work area wins)                                                                                        |
| `title`         | `string`                    | —                                              | header title text                                                                                                               |
| `html`          | `string`                    | —                                              | body inner HTML                                                                                                                 |
| `controls`      | `{ left, right }`           | `{ left: [], right: ["min", "max", "close"] }` | header controls, each over `min` / `max` / `close`                                                                              |
| `resizable`     | `boolean`                   | `true`                                         | `false` omits handles and adds `mcrw-no-resize`                                                                                 |
| `taskbar`       | `boolean`                   | `true`                                         | `false` opts this window out (non-minimizable)                                                                                  |
| `fallbackFocus` | `HTMLElement`               | —                                              | receives stranded DOM focus when no window and no taskbar can (see [The accessibility contract](#2-the-accessibility-contract)) |
| `class`, `id`   | `string`                    | —                                              | passed onto the `.mcrw` element                                                                                                 |
| callbacks       | see [Callbacks](#callbacks) | —                                              | lifecycle and geometry hooks                                                                                                    |

`title` and `html` are construction-only: after mount you own the header and
body content through the DOM.

A window created without `width` / `height` defaults to 25% of the work-area
width at 4:3 (height = ¾ × width). A window created with neither `x` nor `y` is
centered in the work area — unless cascade is configured for its root, in which
case cascade supplies the placement. The two defaults are independent: an
explicit size still centers (or cascades), and an explicit position still gets
the default size.

### Instance methods

All chainable (return the instance) unless noted.

| Method                        | Meaning                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `minimize()`                  | transition to `min`; if focused, blurs and hands focus to the next MRU window. No-op when non-minimizable or already `min`.                                                    |
| `maximize()`                  | fill the work area, remembering pre-max geometry. No-op when already `max`.                                                                                                    |
| `restore()`                   | return to the pre-minimize state, or `max → normal`; focuses and fires `onrestore`.                                                                                            |
| `moveTo(x, y)`                | move programmatically. No-op outside `normal`.                                                                                                                                 |
| `resizeTo(width, height)`     | resize to an absolute size (anchored `se`). No-op outside `normal` / under `mcrw-no-resize`.                                                                                   |
| `resizeFrom(dir, { dx, dy })` | resize from one of the eight directions (`n` … `sw`). No-op outside `normal` / under `mcrw-no-resize`.                                                                         |
| `focus()`                     | make this the focused, topmost window; moves real DOM focus to the container (one-way, ADR-0010).                                                                              |
| `getState()`                  | read live state (below).                                                                                                                                                       |
| `destroy()`                   | remove the window, its registry entry, and its taskbar item; hand focus to the next MRU window, or the fallback chain (see [Focus hand-off](#focus-hand-off)). Returns `void`. |

Readonly properties: `root`, `element`, and `minimizable`.

`reclamp()` also exists on the instance type — it is the library's re-clamp
entry point (used by the taskbar and the resize observer), not part of the
consumer contract; you normally won't call it.

### `getState()`

Returns the window's live snapshot:

```ts
{
  state: "normal" | "min" | "max";
  focused: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number | undefined;
  minHeight: number | undefined;
  title: string | undefined;
  workArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  } // current taskbar reservation
}
```

### Callbacks

State and lifecycle callbacks receive the window instance:

```ts
type WindowEventCallback = (win: MicroW) => void;
// oncreate, onmaximize, onminimize, onrestore, onclose, onfocus, onblur
```

Geometry callbacks receive the window instance **and the full new rect**:

```ts
type WindowGeometryCallback = (win: MicroW, rect: Rect) => void;
// onmove, onresize — rect is { x, y, width, height }
```

You never need to call `getState()` after a move or resize to learn the new
geometry — the callback carries it.

### Statics

| Static                                                                                 | Returns           | Meaning                                                                                                                                                 |
| -------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MicroW.taskbar(root?, options?)`                                                      | `Taskbar \| null` | mount a headless taskbar for a root; `null` when globally disabled.                                                                                     |
| `MicroW.windows(root?)`                                                                | `MicroW[]`        | the live windows of a root (or every window when no root is given).                                                                                     |
| `MicroW.destroyAll()`                                                                  | `number`          | destroy every window (and every taskbar); returns the count.                                                                                            |
| `MicroW.setControlLabels({ min, max, close, moveHint, taskbarLabel, untitledWindow })` | `void`            | the i18n surface for all accessibility copy; a partial call merges over the English defaults, read at render time.                                      |
| `MicroW.configure({ taskbar })`                                                        | `void`            | global taskbar disable; restores any minimized windows rather than stranding them.                                                                      |
| `MicroW.cascade({ root?, mode })`                                                      | `void`            | auto-place new windows of a root in `"cascade"` or `"random"` slots.                                                                                    |
| `MicroW.onCreate(listener)`                                                            | `() => void`      | global listener: fires once per created window, after its `oncreate` callback, with the window registered and mounted. Returns an unsubscribe function. |
| `MicroW.onClose(listener)`                                                             | `() => void`      | global listener: fires once per closed window (including via `destroyAll()`), after its `onclose` callback. Returns an unsubscribe function.            |

### Global listeners

Where the per-window callbacks above are set once at construction, the
statics `MicroW.onCreate(listener)` and `MicroW.onClose(listener)` subscribe
to _every_ window in the library — including windows created by other code.
Each returns an unsubscribe function; multiple listeners all fire, in
subscription order. A throwing listener propagates (fail loudly) — guard
your own callbacks, since a throw during construction or `destroy()`
aborts mid-way (a throwing listener inside `destroyAll()` leaves the
remaining windows alive).

Timing per event: the window's own option callback fires first, then the
library's reactions (projection, taskbar), then your global listener. The
`onCreate` listener sees the window registered and mounted; the `onClose`
listener runs after the window has left the registry. `destroyAll()` fires
the same per-window sequence as individual `destroy()` calls.

Geometry is deliberately _not_ observable globally — the per-window
`onmove`/`onresize` callbacks remain the only geometry observers.

### Exported types

Every option, callback, and static has an exported type:
`MicroWOptions`, `MicroWGlobalOptions`, `ControlsOptions`, `ControlLabels`,
`TaskbarOptions`,
`CascadeOptions`, `ControlName`, `ResizeDirection`, `TaskbarSide`,
`TaskbarGrow`, `TaskbarAlign`, `CascadeMode`, `Rect`, `WorkArea`,
`WindowSnapshot`, `WindowState`, `WindowEventCallback`, `WindowGeometryCallback`,
and `Taskbar`.
