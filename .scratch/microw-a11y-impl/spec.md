# microw v1.1 spec — accessibility conformance

Type: spec
Status: ready-for-agent

Decisions sourced from the microw-a11y wayfinder map (`.scratch/microw-a11y/`),
the 28-item ARIA conformance checklist (`docs/aria-conformance-criteria.md`),
and the audit (`docs/aria-conformance-audit.md`). Implementation tickets live
in `.scratch/microw-a11y-impl/issues/`.

## Problem Statement

A keyboard-only or screen-reader user cannot use microw windows at all. The
14 WCAG Level A findings reduce to: windows are unnamed regions a screen
reader cannot identify; the close/minimize/maximize controls and taskbar
items are undiscoverable, unlabeled, click-only divs; focus is model state
only — after minimize, restore, or closing the last window, real focus
strands on `body` and the user loses their place; and moving or resizing a
window is pointer-only, excluding keyboard users from the two operations
that define a window. Because the minimized window's only recovery affordance
is the taskbar, a minimized window is permanently unrecoverable without a
mouse. The headless contract reserves only visuals to the consumer, so none
of this is delegable — the library creates the DOM, roles, and event wiring,
so conformance for those is the library's to own.

## Solution

microw v1.1 ships full WCAG Level A conformance as additive semantics: the
`mcrw-*` class contract is unchanged, so nothing breaks for v1.0 consumers.
Windows become named, role-correct dialog containers with real focusable
controls and keyboard move/resize; model focus now directs real DOM focus
(with a taskbar fallback when no window can take it); taskbar items become
real buttons that expose minimized state; all new UI copy flows through one
global labels bag for i18n; and `reference.md` gains an Accessibility
contract section documenting the small, explicit set of responsibilities
that stay with the consumer. Cultivar authors get a per-library mapping
verdict so themes keep working against native buttons.

## User Stories

### Windows and their identity

1. As a screen-reader user, I want each window container to have `role="dialog"`, so that my AT announces it as a window.
2. As a screen-reader user, I want a window with a title to expose that title as its accessible name via `aria-labelledby`, so that I know which window I am in.
3. As a screen-reader user, I want a window without a title to be announced as "Untitled window", so that even unnamed windows are never silent regions.
4. As an app developer, I want `title` to remain optional with no new validation, so that v1.0 usage keeps working unchanged.
5. As an app developer, I want auto-assigned ids (`mcrw-win-N`, `mcrw-title-N`) only when I have not supplied my own, so that my existing ids and CSS selectors are never overridden.
6. As a screen-reader user, I want the accessible name to come from the visible title text, so that what I hear matches what I see.

### Window controls

7. As a keyboard user, I want the min/max/close controls to be real buttons in the tab order, so that I can reach and operate every window control.
8. As a screen-reader user, I want each control to announce "Minimize", "Maximize", or "Close", so that I can tell them apart.
9. As a keyboard user, I want Enter and Space to activate the focused control exactly as a click would, so that keyboard and mouse behavior never diverge.
10. As a screen-reader user, I want the max control to expose `aria-pressed` with a constant "Maximize" label, so that I can tell whether the window is maximized.
11. As an app developer, I want the pressed state to update on every state transition (toggle, restore, minimize hand-off), so that the DOM never lies about window state.
12. As an app developer localizing their app, I want to set all control and hint copy through one global `MicroW.setControlLabels({ min, max, close, moveHint, taskbarLabel, untitledWindow })` call with English defaults, so that zero-config works and i18n is a single call.
13. As a screen-reader user, I want windows with every control disabled to still contain a focusable element (the `tabindex="-1"` container), so that no window is a focus void.

### Focus

14. As a keyboard user, I want real DOM focus to follow the library's model focus — the focused window's container receives focus with scrolling suppressed — so that my place is never lost when focus moves between windows.
15. As a keyboard user, I want minimizing the focused window to move DOM focus to the next most-recently-used visible window's container, so that minimize never strands me on `body`.
16. As a keyboard user, I want restoring a minimized window to move DOM focus into the restored window, so that restore puts me where the content is.
17. As a keyboard user, I want closing the focused last window to move DOM focus to the taskbar element, so that the restore affordance is where focus lands.
18. As an app developer with a taskbar-less root, I want to supply a `fallbackFocus` element that receives stranded focus, so that I control the last resort.
19. As an app developer, I want DOM focus to follow model focus one-way and never feed back into the model, so that consumer-driven DOM focus changes cannot corrupt window state.
20. As an app developer embedding microw in a page with its own focus behavior, I want v1.1 to ship no opt-out from focus direction (documented), so that the behavior is predictable and testable.

### Keyboard move and resize

21. As a keyboard user, I want each window's header to be a single tab stop, so that moving/resizing a window costs one Tab press, not nine.
22. As a keyboard user, I want arrow keys on the focused header to move the window in 10px steps, clamped to the work area exactly as pointer drags are, so that keyboard and pointer movement obey the same rules.
23. As a keyboard user, I want Alt+arrow keys to resize the window from its bottom-right corner in 10px steps, so that I can resize without a mouse.
24. As a keyboard user, I want Shift to multiply steps to 100px, so that I can make large moves quickly and fine ones precisely.
25. As a keyboard user, I want keyboard move/resize to be gated by the same state rules as pointer interaction (normal windows only, `resizable` respected), so that behavior never surprises.
26. As a screen-reader user, I want the focused header to announce "{title}. Arrow keys to move, Alt+arrow keys to resize.", so that the affordance is discoverable without documentation.
27. As an app developer, I want keyboard moves and resizes to fire the same `onmove`/`onresize` callbacks as pointer interaction, so that consumer logic cannot tell them apart.
28. As an app developer, I want pointer drag/resize behavior to be completely unchanged, so that v1.0 integrations keep working.

### Taskbar

29. As a keyboard user, I want each taskbar item to be a real button in the tab sequence (creation order, no reordering), so that I can restore any minimized window without a mouse.
30. As a screen-reader user, I want a taskbar item to be named by its window's title ("Untitled window" when title-less), so that items are distinguishable.
31. As a screen-reader user, I want a minimized window's item to expose `aria-expanded="false"` and `aria-controls` pointing at the window container, so that the collapsed window is discoverable and restorable.
32. As a screen-reader user, I want the taskbar element to be a labeled group ("Taskbar" by default), so that items are announced in context.
33. As an app developer, I want the `-focused`/`-max` classes to remain visual-only state channels, so that my CSS keeps working and semantic announcements come from DOM focus instead.

### Consumer and cultivar contract

34. As an app developer, I want an Accessibility contract section in `reference.md` that lists exactly what stays mine — focus-visible styling on containers, header, controls, taskbar element, and taskbar items (plus my own `fallbackFocus` targets); treating `mcrw-focused` as visual-only; composing non-drag affordances from `moveTo`/`resizeFrom`; the native-button reset — so that I know my side of the conformance deal.
35. As a cultivar author, I want the native-button reset requirement documented per mapping tier (required before system.css/classicy-tier mapping; unnecessary where the source library resets `button` globally), so that my theme works without guesswork.
36. As an app developer, I want the README to carry a one-paragraph a11y summary pointing at the full contract, so that the surface is discoverable without reading the whole reference.
37. As an app developer upgrading from v1.0, I want the `mcrw-*` class contract unchanged and all additions to be additive attributes/elements, so that the upgrade is semver-minor.

## Implementation Decisions

- **Native `<button type="button">` for header controls and taskbar items**, keeping `mcrw-btn-*` / `mcrw-taskbar-item` classes. The library ships no reset (zero-CSS rule); the consumer contract documents the reset.
- **Global labels bag**: `MicroW.setControlLabels({ min, max, close, moveHint, taskbarLabel, untitledWindow })`, English defaults, consumed at render time by headers, taskbar items, and the header's instruction label.
- **Window container**: `role="dialog"`, always `tabindex="-1"`; `aria-labelledby` → auto-id `mcrw-title-N` on the title element when titled, else `aria-label` = `untitledWindow`. Auto-ids (`mcrw-win-N` on minimizable windows for `aria-controls`) fill gaps only; consumer-supplied ids win.
- **State exposure via one `updateControlState()` helper** called from every state transition: max control `aria-pressed`; taskbar item `aria-expanded` (minimized) + `aria-controls`. `-focused`/`-max` remain class-only.
- **Model focus directs DOM focus one-way** (ADR-0010, superseding the isolation stance of ADR-0009): `focus()` paths call `element.focus({ preventScroll: true })` on the target container. When no window can take focus (minimize of the only window, close of the focused last window), focus falls to the taskbar element (`tabindex="-1"`), overridable via a new `fallbackFocus?: HTMLElement` window option; no taskbar and no fallback = documented no-op. No opt-out in v1.1.
- **Keyboard move/resize on the header** (one `tabindex="0"` stop per window): plain arrows move 10px via `moveTo`; Alt+arrows resize from the bottom-right corner via `resizeFrom`; Shift multiplies ×10. Inheriting the programmatic APIs means clamping, state gating, `onmove`/`onresize`, and pointer behavior come free. Splitter roles (`role="separator"` + `aria-valuenow`) on the eight resize handles are deferred as advisory.
- **Taskbar element**: `role="group"` + `aria-label` from `taskbarLabel`; plain tab sequence in creation order; `role="toolbar"` + roving tabindex deferred.
- **GLOSSARY/ADR**: CONTEXT.md *Focus* reworded, **DOM focus** term added, ADR-0010 written — already landed on the wayfinder branch; implementation must not contradict them.
- **Docs**: new top-level "Accessibility contract" section in `reference.md` (after the headless contract) with the five consumer-side items; README gains a one-paragraph condensation + pointer; v1.1 changelog/migration notes cover the new focusable elements and the reset requirement.

## Testing Decisions

- **One seam, the existing one**: the headless harness (`test/support/seam.ts` — jsdom, stubbed layout doubles, injectable ResizeObserver/resize signals, pointer helpers) tests everything; the only addition is a `fireKeydown` keyboard helper in the same file, following the pointer-helper pattern. No browser or screen-reader automation is introduced.
- **Good tests assert external behavior only**: DOM attributes (`role`, `aria-*`, `tabindex`, ids), `document.activeElement` after model hand-offs, class presence, and callback invocations — never internal helpers or call counts.
- **Coverage lands in the existing per-module files**: `constructor.test.ts` (role, name paths, ids, container tabindex), `state.test.ts` (`aria-pressed`/`aria-expanded` sync across toggle/restore/minimize paths), `move-drag.test.ts` and `resize.test.ts` (arrow/Alt+arrow/Shift steps, clamping via the existing doubles, callback parity with pointer), `destroy.test.ts` (last-close fallback), `taskbar.test.ts` (buttons, `aria-controls`, group label, keyboard activation). Prior art: every existing test file's use of the seam.
- **Keyboard-focus assertions** use jsdom's real focus machinery; `preventScroll` is asserted as a non-throwing call (jsdom ignores scroll), with the no-scroll guarantee documented rather than tested.

## Out of Scope

- **Minimized windows remain in the accessibility tree** (class-only hiding; the element stays in the DOM). Deliberately left outside the audit's 28 criteria; hiding via `aria-hidden`/`inert` is a future decision, not v1.1.
- **Splitter semantics on resize handles** (`role="separator"`, `aria-valuenow`) — deferred advisory layer.
- **`role="toolbar"` + roving tabindex** on the taskbar — deferred.
- **Live geometry announcements** (`aria-live`, `aria-valuenow` during move/resize) — deferred; position is visually evident and announcements are noise.
- **A DOM-focus opt-out option** — recorded as a possible future option, not v1.1.
- **Visual focus styling** — the library ships no CSS; focus-visible styling is the consumer contract.

## Further Notes

- All work sits on the `research/aria-conformance` branch lineage; merge to `main` happens after the spec's tickets land.
- Cultivar mapping verdicts (98.css / 7.css / XP.css / system.css / classicy) live in `.scratch/microw-a11y/research/cultivar-button-mapping.md` and are cited by the reset guidance.
- Ticket order in `.scratch/microw-a11y-impl/issues/` follows the dependency chain, not audit impact; 01 gates the labels bag everything else consumes.
