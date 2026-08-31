# ARIA conformance criteria for window management (microw audit)

Research checklist for auditing microw's ARIA/WCAG conformance. Every claim is
cited to a primary source: the WAI-ARIA Authoring Practices Guide (APG), the
WAI-ARIA 1.2 specification, or WCAG 2.2. Each checklist item is phrased as a
testable requirement and tagged with its normative weight.

## 1. Sources and normative weight

| Tag | Meaning | Sources |
| --- | --- | --- |
| **[WCAG]** | Hard violation if failed. Normative Success Criteria of a W3C Recommendation. | WCAG 2.2 — <https://www.w3.org/TR/WCAG22/> |
| **[ARIA]** | Normative MUST/SHOULD in the WAI-ARIA 1.2 Recommendation (RFC 2119). ARIA violations surface to users as WCAG 4.1.2 (Name, Role, Value) failures because assistive technologies receive wrong semantics. | WAI-ARIA 1.2 — <https://www.w3.org/TR/wai-aria-1.2/> |
| **[APG]** | Advisory. The APG is a W3C Working Group Note, not a normative standard; its keyboard-interaction and roles/states/properties lists are the de facto best practice, and deviations are advisory gaps — unless the same behavior is independently required by a [WCAG] SC (e.g. keyboard operability). | <https://www.w3.org/WAI/ARIA/apg/> |

Primary sources consulted:

- APG Dialog (Modal) Pattern — <https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/>
- APG Developing a Keyboard Interface — <https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/>
- APG Window Splitter Pattern — <https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/>
- APG Toolbar Pattern — <https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/>
- APG Button Pattern — <https://www.w3.org/WAI/ARIA/apg/patterns/button/>
- WAI-ARIA 1.2 role/property definitions — <https://www.w3.org/TR/wai-aria-1.2/> (`#dialog`, `#separator`, `#aria-modal`, `#aria-expanded`, `#aria-haspopup`, `#aria-pressed`, `#aria-disabled`, `#aria-labelledby`)

## 2. Audited surface (from microw source)

Read from `CONTEXT.md` and `src/microw.ts` / `src/taskbar.ts`; the checklist
covers exactly these surfaces and nothing else:

- **Window container** — `div.mcrw`, absolutely positioned by inline geometry; no role, no `tabindex` is set by the library.
- **Header** — `div.mcrw-header`; the drag surface (pointer events only).
- **Title** — `div.mcrw-title`; plain text div, no heading role.
- **Controls** — `div.mcrw-btn-min` / `-max` / `-close`; plain divs with `click` handlers; disabled controls are not rendered at all; the min control is removed when the taskbar is globally disabled.
- **Resize handles** — eight `div.mcrw-resize-{n,e,s,w,ne,nw,se,sw}` zones; pointer events only; no handles when resizable is off (`mcrw-no-resize`).
- **Taskbar** — `div.mcrw-taskbar`; items are `div.mcrw-taskbar-item` with `click` handlers, `textContent` = window title, and class-only state (`-min`, `-max`, `-focused`); items never reorder.
- **Focus model** — "focus" is library model state only ("Focus is model state — never real DOM focus", `CONTEXT.md`); nothing in the library calls `element.focus()`. Minimize blurs and hands model focus to the next most-recently-used visible window; restore refocuses the window; close hands to the next window or nowhere.

The audit must judge the *rendered result in a consumer application*, since
styling is consumer CSS — but the DOM structure, roles, and event wiring are
the library's, so conformance for those is the library's to own.

## 3. Checklist

### A. The window as a dialog

1. **The window container has `role="dialog"`.** [APG] — "The element that serves as the dialog container has a role of `dialog`" (Dialog Pattern, Roles/States/Properties). ARIA 1.2 defines `dialog` as "a descendant window of the primary window of a web application" — this is the only concrete (non-abstract) window role available (`#dialog`; the `window` superclass is abstract). Microw's plain `div.mcrw` currently exposes no window semantics.
2. **The window has an accessible name.** [ARIA MUST] — "Authors MUST provide an accessible name for a dialog, which can be done with the `aria-label` or `aria-labelledby` attribute" (`#dialog`); the role's characteristics list "Accessible Name Required: True". Test: the container sets `aria-labelledby` to the `mcrw-title` element's id when a title exists, or `aria-label` otherwise; a title-less window still gets some name.
3. **The name comes from the visible title bar text.** [APG] — "The dialog has either: a value set for `aria-labelledby` that refers to a visible dialog title, or a label specified by `aria-label`" (Dialog Pattern). `aria-labelledby` → `mcrw-title` is the preferred mapping; a hidden duplicate label is an advisory gap.
4. **`aria-modal` is not `true`.** [ARIA] + [APG] — Microw windows are non-modal by design (many windows, taskbar interaction, no inert outside). `aria-modal` "indicates whether an element is modal when displayed" and defaults to false (`#aria-modal`). The APG marks a dialog modal "only when both: application code prevents all users from interacting in any way with content outside of it, and visual styling obscures the content outside of it" (Dialog Pattern note) — never true for a microw window.
5. **All controls required to operate the window are DOM descendants of the `role="dialog"` element.** [APG] — Dialog Pattern, Roles/States/Properties; also `#aria-modal`: "when a modal element is displayed, authors MUST ensure the interface can be controlled using only descendants of the modal element" (normative for the modal case; advisory-by-analogy for non-modal windows).
6. **Every window has at least one focusable descendant when rendered.** [ARIA SHOULD] — "Authors SHOULD ensure that all dialogs (both modal and non-modal) have at least one focusable descendant element" (`#dialog`). With keyboard-focusable controls (items 7–9) and taskbar items (item 20) this follows; a window with all controls unrendered and no focusable body content violates it.

### B. Window controls (min / max / close)

7. **Each control is exposed as a button with an accessible name.** [ARIA] + [WCAG] — A div with a `click` handler has no role and no name; screen-reader users cannot discover or operate it (WCAG 4.1.2 Name, Role, Value, Level A). Requirement: `role="button"` (or native `<button>`) plus an accessible name computed from content, `aria-label`, or `aria-labelledby` (Button Pattern; `#button`). Test: the accessible name announces the action ("Close", "Minimize", "Maximize").
8. **Controls are operable by keyboard: Enter and Space activate.** [WCAG] — 2.1.1 Keyboard (Level A): "All functionality of the content is operable through a keyboard interface." The APG Button Pattern specifies "Space: Activates the button. Enter: Activates the button" — a `div` with only a `click` listener satisfies both only if it is focusable and the handlers fire on keydown/keypress for those keys.
9. **Controls are included in the tab sequence.** [WCAG] + [APG] — 2.1.1 (keyboard operability implies reachability); APG Keyboard Interface, "Keyboard Navigation Between Components": "all interactive UI components need to be reachable via the keyboard … best achieved by either including them in the tab sequence" (i.e. `tabindex="0"` or native button).
10. **The max control exposes its two-state nature as a toggle.** [APG] + [ARIA] — The max control toggles normal ↔ max (CONTEXT.md, Control). The Button Pattern: "To tell assistive technologies that a button is a toggle button, specify a value for the attribute `aria-pressed` … it is critical the label on a toggle does not change when its state changes." Requirement: `aria-pressed="true|false"` on the max control reflecting the window state, with a constant label — or `aria-expanded="true|false"` on the button (ARIA 1.2 applies `aria-expanded` to "a focusable, interactive element that toggles visibility of content in another element", `#aria-expanded`; button is a supported role). Note: `aria-expanded` is *not* a supported state of the `dialog` role itself (removed in ARIA 1.2, `#changelog`), so it may only go on the control, never the container.
11. **Min and close are command buttons, not toggles or popups.** [ARIA] — `aria-pressed` is only for two-state buttons (`#aria-pressed`); `aria-haspopup` "indicates the availability and type of interactive popup element" and "authors MUST ensure that the role of the element that serves as the container for the popup content is `menu`, `listbox`, `tree`, `grid`, or `dialog`, and that the value of `aria-haspopup` matches" (`#aria-haspopup`). Minimize/close trigger no popup, so `aria-haspopup` MUST NOT be set on any control.
12. **Controls that are not operable do not pose as operable.** [ARIA] + [APG] — Microw's design removes disabled controls from the DOM (no min control when the taskbar is disabled; no handles when not resizable), which is compliant. If a non-operable control is ever rendered instead, it carries `aria-disabled="true"` ("indicates that the element is perceivable but disabled, so it is not editable or otherwise operable", `#aria-disabled`); the APG adds that disabled elements should be kept focusable only when discoverability matters (Keyboard Interface, "Focusability of disabled controls"). Test: no control exists in the DOM that visually reads as enabled but does nothing, and no control carries a stale `aria-disabled`.

### C. Focus management

13. **Minimizing the focused window moves real DOM focus to a logical, visible, focusable element.** [WCAG] + [APG] — Microw already hands *model* focus to the next most-recently-used visible window (CONTEXT.md, Minimize); the requirement is that real DOM focus follows it (e.g. `element.focus()` into that window, or onto its taskbar item). APG Keyboard Interface, "Persistence of focus": "if the user closes a dialog or performs a destructive operation … the active element may be hidden or removed from the DOM. If such events are not managed … browsers move focus to the body element, effectively causing a loss of focus." WCAG 2.4.3 Focus Order (A): focus moves "in an order that preserves meaning and operability." Test: after minimize, `document.activeElement` is not `body` and is an element that affords getting back.
14. **Restore moves real DOM focus into the restored window.** [WCAG] + [APG] — Microw's `restore()` focuses the window (CONTEXT.md, Restore); the requirement is real DOM focus on a descendant of the restored window (the container with `tabindex="-1"` or its title, per Dialog Pattern's initial-focus guidance). Dialog Pattern: "When a dialog opens, focus moves to an element contained in the dialog." WCAG 2.4.3.
15. **Closing the focused window never leaves focus lost to `body`.** [WCAG] + [APG] — Microw hands focus to the next most-recently-used window "or nowhere" (CONTEXT.md, Close). The "nowhere" branch must land real DOM focus on a logical element (e.g. the taskbar or document-level affordance), per the APG persistence-of-focus rule (as item 13) and WCAG 2.4.3. Test: destroy the focused last window; `document.activeElement` is a deliberate target, not `body` by accident.
16. **Keyboard focus remains visible wherever the library moves it.** [WCAG] — 2.4.7 Focus Visible (AA). The library sets no styles (consumer CSS), so this binds the consumer — but the library must not defeat it: any `outline: none` in consumer CSS on the controls/items the library created is the audit finding to look for. APG: "the visual focus indicator must always be visible" (Keyboard Interface).
17. **The library's visual "-focused" highlight is not the only cue for active-window identity, and is distinguishable from keyboard focus.** [APG] — Microw's "Focus" is model state, not DOM focus (CONTEXT.md); the APG's "Focus VS Selection" section warns that "the visual focus indicator must always be visible" and "the selected state must be visually distinct from the focus indicator" — a model-active highlight that *looks like* keyboard focus while real focus is elsewhere is an advisory gap to flag. Optional remediation to check for: `aria-activedescendant`-style exposure or documenting that the `-focused` class is a selection-like state.
18. **Non-modal windows do not create a keyboard trap.** [WCAG] — 2.1.2 No Keyboard Trap (A): keyboard focus can always move away using keyboard alone. Since microw windows are non-modal (item 4), Tab must be able to leave any window; a consumer implementation that cycles Tab within a window must still provide an exit.

### D. Taskbar and taskbar items

19. **The taskbar is exposed as a labeled toolbar when it groups 3+ controls.** [APG] — Toolbar Pattern: "the element that serves as the toolbar container has role `toolbar`", labeled via `aria-label` or `aria-labelledby`; "use `toolbar` as a grouping element only if the group contains 3 or more controls." With fewer items, a plain group or list is acceptable — the advisory gap is an unlabeled container of buttons, not the absence of `toolbar` on a 1-item bar. If `toolbar` is used, arrow-key navigation among items is expected (advisory).
20. **Each taskbar item is a keyboard-focusable button named after its window.** [WCAG] + [ARIA] — Items are currently divs with `click` handlers and class-only state. Requirement: `role="button"` (or native button) with accessible name = window title (item text already carries it; WCAG 4.1.2), `tabindex` in the tab sequence (WCAG 2.1.1), and Enter/Space activation firing the same handler as click (Button Pattern keyboard interaction).
21. **Each taskbar item exposes the window's state semantically, not only via classes.** [WCAG] + [ARIA] — State classes (`-min`, `-max`, `-focused`) are invisible to assistive technology. Testable requirement, with two acceptable mappings: (a) a minimized item's restore affordance exposed via `aria-expanded="false"` + `aria-controls` pointing at the window element ("toggles visibility of content in another element", `#aria-expanded`; `dialog` is an allowed popup container under `#aria-haspopup`'s container rule), flipping to `true` on restore; or (b) `aria-pressed` as a toggle reflecting the minimized state (Button Pattern). A `-max` indication may additionally use text or a description; class-only state is the failure condition (WCAG 4.1.2).
22. **Taskbar items are not tabs.** [APG] — CONTEXT.md itself avoids "tab" for taskbar items: the Tabs pattern requires a `tablist`/`tab`/`tabpanel` relationship where tabs control visibility of panels and selection follows focus rules that microw does not implement (items never reorder and never hide their window's content in a tabpanel sense). Using `role="tab"` here would be a misuse; the audit flags it if found.
23. **Keyboard activation of an item matches its click behavior: restore a minimized window, focus a visible one.** [WCAG] — 2.1.1; the click semantics in `taskbar.ts` (`handleClick`) must hold for keyboard activation on the same element.

### E. Keyboard alternatives for pointer-only interactions (drag, resize)

24. **Window drag (move) has a keyboard alternative.** [WCAG] + [APG] — 2.1.1 Keyboard (A): moving a window is functionality and must be operable via keyboard. The APG Keyboard Interface is explicit: "for a web page to be accessible, all interactive elements must be operable via the keyboard" and "do not use keyboard shortcuts as a substitute for access via navigation" — the drag surface (header) must be focusable and keys (conventionally arrow keys, matching desktop window managers per the APG's stated borrowing of "user expectations and keyboard conventions from those platforms") must move the window. Test: focus the header, press arrow keys, the window moves.
25. **Resize has a keyboard alternative, ideally via the Window Splitter pattern.** [APG] + [WCAG] — 2.1.1 applies to resizing too. The APG's Window Splitter Pattern is the prescribed shape: "the element that serves as the focusable splitter has role `separator`", with Left/Right/Up/Down arrows resizing, and Enter as collapse/restore. The ARIA spec makes the role normative once the handle is focusable: "if the separator is focusable, authors MUST set the value of `aria-valuenow` to a number reflecting the current position" (`#separator`). A simpler conforming alternative (e.g. arrow-key resize on the focused header) satisfies 2.1.1; the splitter semantics are the advisory best practice for exposing it.
26. **Every resize handle that is interactive is either focusable with splitter semantics or mirrored by a keyboard mechanism.** [ARIA] + [APG] — The eight pointer zones (`mcrw-resize-*`) are pure pointer targets today. If they remain pointer-only, items 24–25's alternatives carry the functionality; if they are made focusable separators, each needs an accessible name ("authors SHOULD provide an accessible name for each one", `#separator`) and `aria-valuenow`/`aria-valuemin`/`aria-valuemax` reflecting size within constraints.
27. **Dragging is not the only pointer path: any drag-operated action works by single pointer without dragging.** [WCAG] — 2.5.7 Dragging Movements (AA, WCAG 2.2 only): "all functionality that uses a dragging movement for operation can be achieved by a single pointer without dragging." Applies to both window move and resize (e.g. click-to-focus + keyboard move, or alternate pointer affordances). Out of scope for WCAG 2.1 audits — tag as version-dependent.

### F. Audit protocol

28. **Distinguish hard violations from advisory gaps in the verdict.** [WCAG]/[ARIA] vs [APG] — Items tagged [WCAG] or [ARIA] (normative Recommendations) are conformance failures; [APG]-only items are advisory gaps. A single root cause (e.g. controls are bare `div`s) typically fails several normative items at once (4.1.2, 2.1.1) — report the root cause once with the items it fails. Behavior that is consumer-CSS-owned (item 16's outline) is attributed to the consumer, but the library is attributed the DOM/roles/event wiring it creates.

## 4. Highest-risk items for a pointer-first windowing library

Ranked by expected severity for microw specifically (model focus, div-based controls, pointer events only):

1. **Item 8/9 — controls not keyboard operable or reachable** (WCAG 2.1.1, A): `mcrw-btn-*` divs have no `tabindex`, no role, no key handling.
2. **Item 24/25 — no keyboard alternative for drag/resize** (WCAG 2.1.1, A): the header and all eight handles are pointer-only.
3. **Item 2 — windows lack accessible names** (ARIA MUST → WCAG 4.1.2, A): `role="dialog"` is absent, and even with it, nothing wires `aria-labelledby` to `mcrw-title`.
4. **Item 13/15 — focus lost on minimize/close** (WCAG 2.4.3, A): "focus is model state — never real DOM focus" means minimize/close hand-off never moves DOM focus, landing on `body`.
5. **Item 21 — taskbar item state is class-only** (WCAG 4.1.2, A): minimized/maximized/focused state is invisible to assistive technology.
