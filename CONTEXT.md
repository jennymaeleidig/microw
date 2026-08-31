# microw

A zero-dependency, headless, framework-agnostic window management microframework (v1.0 in spec; a clean-room rewrite). The context covers the v1 window model: states, stacking, the taskbar, and the consumer-side contract.

## Language

### The window

**Window**:
A movable, resizable panel rendered by the library inside a root. The library manages position, state, and DOM structure only; all styling is consumer CSS.
_Avoid_: box, panel

**State**:
The window's mutually-exclusive state: `normal`, `min`, or `max`. Focus is the only orthogonal state.
_Avoid_: mode, status

**Minimize**:
The state transition to `min`: class-only (`.mcrw-min`), geometry untouched, plus `onminimize`, and remembers the state it left (`normal` or `max`). Minimize blurs the window and focuses the next most-recently-used non-minimized window; if none exists, no window is focused. Minimize is the only way a window leaves view — v1 has no separate hidden state. Only **minimizable** windows can minimize: minimize is a no-op when the window's min control is disabled or the taskbar is globally disabled, and a globally-disabled taskbar restores any minimized window to the state it held before minimizing.
_Avoid_: collapse, shade, hide

**Maximize**:
The state transition to `max`: fills the root's work area (root minus any taskbar strip), remembering the pre-max geometry for restore.
_Avoid_: fullscreen, expand

**Restore**:
The transition back from `min` or `max`: a `min` window returns to the state it held before minimizing (`normal → min → restore` lands on `normal`; `max → min → restore` lands on `max`, re-filling the work area and keeping the pre-max memory), while a `max` window returns to `normal` with its pre-max geometry restored and cleared. Restore also focuses the window.
_Avoid_: unminimize, unmaximize

**Close**:
The destruction of a window: its element and registry entry are removed, its taskbar item collapses, and focus hands to the next most-recently-used window or nowhere. Fires `onclose`. `MicroW.destroyAll()` closes every window at once.
_Avoid_: remove, kill, destroy, delete

**Control**:
A configurable button in the window header (`min` / `max` / `close`), arranged per side by the `controls` configuration. `min` minimizes, `max` toggles between normal and max, `close` closes. A control's class is structural when the control is enabled; disabled controls are not rendered. The `max` control's toggle-back is the only in-window control that returns a `max` window to `normal` — the taskbar is still the only restore affordance for minimized windows.
_Avoid_: button, icon, header action

**Mount**:
Attaching the window's DOM into its root. A window mounts at construction and unmounts when it closes; its root is fixed at construction.
_Avoid_: append, attach, teleport

### Geometry

**Root**:
The bounding element a window lives in — a `position: relative`, `isolation: isolate` container; the window's coordinates, bounds, and stacking are always relative to it. Defaults to `document.body`, where the initial containing block serves as root.
_Avoid_: container, parent, desktop, bounding element

**Work area**:
The region of the root available to windows: the root's rect (padding edge) minus the band reserved by its taskbar — measured live per event. Windows clamp to it — drag/resize stop at the bar's edge and maximize fills the work area, so a window never goes behind or in front of the taskbar. When the root or viewport resizes, the library re-clamps every window into it.
_Avoid_: usable area, desktop minus taskbar

**Clamp**:
The enforcement of a window's bounds: drag and resize positions and sizes are clamped to the intersection of the work area and the window's size constraints. Where the work area is smaller than a size constraint, the work area wins — the constraint yields.
_Avoid_: limit, constrain, bound

**Drag**:
Moving a window with the pointer via the header — the drag surface; coordinates are translated per pointer event, so dragging tracks under scroll. Distinct from programmatic moves.
_Avoid_: pull, move

**Resize handle**:
One of eight compass-direction zones on a window's edges and corners (`mcrw-resize-n` … `mcrw-resize-se`) that drag-resizes it. Resize is a per-window toggle (`resizable`, default on); disabled windows get no handles in the DOM and carry `mcrw-no-resize`, which also works as a consumer-applied class. Handles live inside the window's own stacking context.
_Avoid_: grip, thumb, knob

**Cascade**:
An opt-in, per-root arrangement of windows into offset slots, configured via `MicroW.cascade()` in one of two modes: `cascade` (a stepped staircase) or `random` (seeded). Cascade supplies the default placement only — a window the consumer positions (explicit `x`/`y`, drag, resize, `moveTo`) is never rearranged; when the root's work area changes, cascade re-places the windows it still owns.
_Avoid_: tile, arrange

**Slot**:
The offset position a cascade-placed window takes within its root's work area — the nth step of the staircase, or a rolled offset in random mode. Slots advance per cascade-placed mount and the staircase restarts when it would walk past the work-area edge.
_Avoid_: step, index

### Stacking and focus

**Focus**:
The window that is active in the library's model: its taskbar item is `-focused` and its element is topmost within its root. Focus is the only orthogonal state, and is model state — model focus directs real DOM focus to the focused window's container (ADR-0010), but DOM focus never feeds back into the model.
_Avoid_: activation, selection

**DOM focus**:
Where the browser's focus actually sits (the focused window's container, or the fallback target when no window can take it). Follows model focus one-way; never the source of model state.
_Avoid_: real focus, keyboard focus
_Avoid_: active, selected

**Z-order**:
The stacking of windows within their root: the focused window is topmost, the rest ordered by most-recent interaction (MRU). Z-order is root-scoped — windows of different roots never interleave; a root's windows stack as a unit against the rest of the document, ordered by consumer composition.
_Avoid_: z-index, stacking, z-band

### Taskbar

**Taskbar**:
A shipped headless component — `MicroW.taskbar(root)` — one per root, that lists that root's windows and restores them. DOM structure and state wiring only; styling is consumer CSS (see **Cultivar**). It reserves a strip of its root and stacks above its root's windows: windows are bounded to the remaining work area. A library-level global disable turns it off everywhere, removing minimize from all windows; a per-window opt-out (`taskbar: false`) hides just that window's item.
_Avoid_: dock, minimize stack

**Taskbar item**:
One element in a taskbar per minimizable live window of that root: a native button whose accessible name is the window's title (fallback "Untitled window"), state classes (`mcrw-taskbar-item-min`/`-max`), and `-focused` when the window is focused — a visual cue only, since DOM focus carries the semantic announcement. Exposes `aria-expanded` (minimized) and `aria-controls` (the window container). Clicking restores a minimized item or focuses a visible item (normal/max). Items are ordered by creation and never reorder on focus — the `-focused` highlight moves in place.
_Avoid_: tab

**Cultivar**:
A named consumer-side configuration recipe grown from the headless class contract — e.g. a bottom taskbar growing right, a centered dock, a vertical rail. The strip's side, growth, and alignment are class hooks (`mcrw-taskbar-*`) with documented semantics; a cultivar is the consumer CSS that turns a combination into a look. v1 ships the contract, not cultivars; they collect in the future recipe book.
_Avoid_: theme, preset, template

**Restore affordance**:
A consumer-visible control that triggers `restore()` on a window. In v1 the only restore affordance is the taskbar; the window header never contains one, though its max control toggles between normal and max.
_Avoid_: restore button, in-window restore
