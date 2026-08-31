# 01 — Labels bag and real header buttons

**What to build:** The global i18n surface and the header controls that consume it, so every later ticket has its copy source and the click-only divs become operable buttons.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `MicroW.setControlLabels({ min, max, close, moveHint, taskbarLabel, untitledWindow })` with English defaults ("Minimize", "Maximize", "Close", "Arrow keys to move, Alt+arrow keys to resize.", "Taskbar", "Untitled window"), read at render time.
- [x] Header controls render as native `<button type="button" class="mcrw-btn-*">` with `aria-label` from the bag; `click` handlers unchanged; pointerdown focus behavior unchanged.
- [x] Each control gets an accessible name and keyboard activation purely from being a button (no custom key handling).
- [x] The max control exposes `aria-pressed` (constant "Maximize" label) written by a single `updateControlState()` helper that every state transition calls.
- [x] Existing tests stay green; new `constructor`/`state` tests assert element type, labels, activation parity, and pressed-state sync across toggle/restore/minimize paths.
