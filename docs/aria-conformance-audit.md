# microw ARIA Conformance Audit — 28-item checklist

_Audit snapshot taken 2026-07 by a read-only reviewer pass against
`aria-conformance-criteria.md` (this repo, `research/aria-conformance`
branch). Line numbers refer to `src/` as of that commit._

**Criteria:** `docs/aria-conformance-criteria.md` (resolved in full — 28 items, six sections, [WCAG]/[ARIA]/[APG] tags).
**Artifacts:** all of `src/` read (microw.ts, taskbar.ts, config.ts, cascade.ts, clamp.ts, observe.ts, registry.ts, work-area.ts, types.ts, index.ts), plus `CONTEXT.md`, `docs/reference.md`, `docs/adr/0005`. A whole-tree grep for `aria-|role|tabindex|.focus(|inert|hidden` returns **zero** semantic-attribute hits in `src/` — the only `focus()` calls are the library's own model-focus method, never `element.focus()`. `src/` ships no CSS at all.
**Delegation check:** `reference.md` §1 delegates _visuals_ to consumer CSS ("Everything visual is consumer CSS, keyed to the `mcrw-*` class contract") but delegates **no semantics** — no doc anywhere hands ARIA roles, keyboard operation, or focus management to the consumer. ADR 0005 even names "accessibility tree" as a cost the library consciously accepts. Per the checklist's own §2 ruling ("the DOM structure, roles, and event wiring are the library's, so conformance for those is the library's to own"), almost nothing qualifies as consumer scope.

---

## MET (8)

1. **`aria-modal` is not `true`** — met. `grep aria- src/` → zero hits; `aria-modal` defaults to false (microw.ts sets no attributes at all, e.g. element creation at microw.ts:170–171), which is correct for the non-modal design (CONTEXT.md, _Window_/_Taskbar_).
2. **Controls required to operate the window are DOM descendants of the window container** — met. Header controls are appended to `.mcrw-header` (microw.ts:549), which is a child of `.mcrw` (microw.ts:198); the eight resize handles are appended directly to `.mcrw` (microw.ts:587). (The taskbar restore affordance lives outside by design — CONTEXT.md, _Restore affordance_ — acceptable for a non-modal window.)
3. **Min and close are command buttons, not toggles or popups** — met (vacuously). No `aria-pressed` or `aria-haspopup` is ever set anywhere in src/ (grep: zero); min maps to `this.minimize()` and close to `this.destroy()` (microw.ts:540, 544) — neither opens a popup.
4. **Non-operable controls do not pose as operable** — met. Disabled controls are absent, never rendered-disabled: the min control is skipped when the taskbar is globally disabled (growth-time check in the controls module), stripped globally via the taskbar-config change channel, and resize handles are omitted entirely when `resizable: false`. No stale `aria-disabled` exists (grep: zero).
5. **Taskbar items are not tabs** — met (vacuously). No `role="tab"`/`tablist` anywhere (grep: zero); items are plain divs with stable creation order (taskbar.ts:137–141), and CONTEXT.md _Taskbar item_ explicitly lists "tab" as an avoided term.
6. **No keyboard trap is created** — met (vacuously). The library attaches no key listeners at all (grep `keydown|keypress` → zero) and no focus-capture logic; all interaction is `pointerdown`/`click` (microw.ts:207–208, 533, 540–544, 585; taskbar.ts:139).
7. **Focus-visible outline not defeated by the library** — consumer scope. The library ships zero CSS (no `.css` in `src/`; reference.md §1: "microw renders **structure only**. It never injects a stylesheet"), so no `outline: none` can come from it; the criterion binds the consumer. (Moot in practice until items 7–9 make the controls focusable.)
8. **Audit protocol: hard violations distinguished from advisory gaps** — met. This report tags every verdict per the checklist's §28, and root causes are reported once with the items they fail (see root-cause notes under violations).

## PARTIAL (2)

9. **Item 27 — drag-operated actions work by single pointer without dragging (WCAG 2.5.7 AA, WCAG 2.2-only).** Evidence: programmatic paths exist — `moveTo` (microw.ts:226–247) and `resizeFrom`/`resizeTo` (microw.ts:249–281) — so a consumer _can_ wire non-drag affordances; but the library itself ships no single-pointer non-drag affordance for move or resize (header and handles are `pointerdown`-drag only, microw.ts:207, 585). Classification: **consumer scope**-leaning partial — the API means exist, the composed page decides 2.5.7. Conformance would require the consumer to expose e.g. arrow-key or click-to-position controls built on `moveTo`/`resizeFrom`, or the library to ship one.
10. **Item 6 — every window has at least one focusable descendant when rendered.** Evidence: the library-rendered subtree contains zero focusable elements — controls are bare divs with no `tabindex` (microw.ts:531–532) and no key handling (540–544); the window is only focusable if the consumer puts focusable content in `options.html` (microw.ts:192–195), which is not guaranteed. Classification: **violation** of the ARIA SHOULD (as the checklist tags it). Conformance would require the library-rendered controls (or the container with `tabindex="-1"`) to be focusable.

## MISSING (18)

**Root cause A — no `role="dialog"` / accessible name on the window container** (fails items 1–3; gates 6):

11. **Item 1 — container has `role="dialog"`.** Evidence: microw.ts:170–171 — the window is a plain `div.mcrw` with only `class` and optional `id`; grep confirms no `role` attribute is ever set. Classification: **advisory gap** ([APG]-tagged), but it is the vehicle for the normative item 2. Would require setting `role="dialog"` on the container at creation.
12. **Item 2 — window has an accessible name.** Evidence: the title is written as text into a plain div (microw.ts:183–186) and never linked — no `aria-labelledby`, no `aria-label` anywhere (grep: zero); a `title`-less window has no name source at all. Classification: **violation** ([ARIA MUST] → WCAG 4.1.2, Level A). Would require `aria-labelledby` → the title element's id (or `aria-label`) whenever a title exists.
13. **Item 3 — the name comes from the visible title bar text.** Evidence: same as item 2 — microw.ts:183–186 creates `.mcrw-title` with the title text, but nothing references it. Classification: **advisory gap**. Would follow automatically once item 2 wires `aria-labelledby`.

**Root cause B — header controls are bare, click-only divs** (fails items 7–9; also feeds 6, 16):

14. **Item 7 — each control is a button with an accessible name.** Evidence: microw.ts:531–544 — `div.mcrw-btn-{min,max,close}` with class only, no text content, no `role`, no `aria-label`; a click handler is the entire interactivity. Classification: **violation** (WCAG 4.1.2, Level A; screen-reader users cannot discover or operate any window control). Would require `role="button"` (or native `<button>`) plus an accessible name ("Minimize"/"Maximize"/"Close").
15. **Item 8 — Enter/Space activation.** Evidence: microw.ts:540–544 — only `click` listeners; no keydown handling anywhere in src/ (grep: zero), and the divs aren't focusable so keys never reach them. Classification: **violation** (WCAG 2.1.1, Level A). Would require keyboard activation firing the same handlers.
16. **Item 9 — controls in the tab sequence.** Evidence: no `tabindex` anywhere (grep: zero); divs are not natively focusable. Classification: **violation** (WCAG 2.1.1). Would require `tabindex="0"` or native buttons.

17. **Item 10 — max control exposes its two-state toggle nature.** Evidence: `toggleMax` flips normal↔max (microw.ts:514–520, wired at 541–542) with no `aria-pressed`/`aria-expanded` on the control (grep: zero). Classification: **advisory gap** ([APG]-tagged; `aria-pressed` is best practice, not a MUST). Would require `aria-pressed="true|false"` with a constant label on `.mcrw-btn-max`.

**Root cause C — "focus is model state — never real DOM focus"** (CONTEXT.md, _Focus_; fails items 13–15):

18. **Item 13 — minimize moves real DOM focus to a logical element.** Evidence: `minimize()` (microw.ts:327–344) calls model `blur()` (498–505: class toggle + callback only) and `handOffFocus()` (507–512), which calls the next window's `focus()` (302–312) — that method only toggles `mcrw-focused` (312), raises z-index (registry.ts:50–56), and fires callbacks. Nothing ever calls `element.focus()` (grep confirms). Classification: **violation** (WCAG 2.4.3, Level A; focus effectively strands on `body`). Would require DOM focus to follow the model hand-off (e.g. into the next window's container or its taskbar item).
19. **Item 14 — restore moves real DOM focus into the restored window.** Evidence: `restore()` (microw.ts:364–397) ends in `this.focus()` (398) — the same model-only method (302–312). Classification: **violation** (WCAG 2.4.3). Would require `element.focus()` on a `tabindex="-1"` container or a descendant.
20. **Item 15 — closing the focused last window never strands focus on `body`.** Evidence: `destroy()` (microw.ts:465–490) removes the element (471) and calls `handOffFocus()` (483); when no next window exists ("or nowhere", CONTEXT.md _Close_), nothing receives DOM focus. Classification: **violation** (WCAG 2.4.3). Would require a deliberate fallback target (taskbar/document-level affordance).

21. **Item 17 — the `-focused` highlight is not the only cue and is distinguishable from keyboard focus.** Evidence: `mcrw-focused` class toggle is the entire exposure (microw.ts:312; taskbar item class at taskbar.ts:147); no `aria-activedescendant`-style exposure, and neither CONTEXT.md (_Focus_) nor reference.md §3 documents that consumers must visually distinguish model-focus from keyboard focus or expose it semantically. Classification: **advisory gap** ([APG]-tagged). Would require documenting the distinction as a consumer contract and/or a semantic exposure of the active window.

**Root cause D — taskbar items are bare, click-only divs with class-only state** (fails items 20, 21, 23):

22. **Item 19 — taskbar labeled toolbar exposure.** Evidence: taskbar.ts:79–86 — the bar is a plain `div.mcrw-taskbar` + side/grow/align classes; no `role`, no `aria-label`. Classification: **advisory gap** ([APG]-tagged). Would require a `toolbar` (3+ items) or at minimum a labeled group container.
23. **Item 20 — items are focusable buttons named after their window.** Evidence: taskbar.ts:137–141 — `div.mcrw-taskbar-item` with a `click` listener and no `role`/`tabindex`; the title _is_ the textContent (144, so a name is one attribute away) but a div exposes neither role nor focusability. Classification: **violation** (WCAG 4.1.2 + 2.1.1). Would require `role="button"`/native button + `tabindex="0"` + Enter/Space → `handleClick`.
24. **Item 21 — item state exposed semantically, not class-only.** Evidence: taskbar.ts:145–147 — `classList.toggle` of `-min`/`-max`/`-focused` is the only state channel; no `aria-expanded`, `aria-pressed`, or `aria-controls` exists (grep: zero). Classification: **violation** (WCAG 4.1.2 — a minimized window is invisible to AT users with no recoverable affordance). Would require mapping (a) `aria-expanded`+`aria-controls` or (b) `aria-pressed` onto each item.
25. **Item 23 — keyboard activation matches click behavior.** Evidence: `handleClick` semantics exist (taskbar.ts:152–158: min → `restore()`, else `focus()`) but no keyboard path can reach them (click-only listener at 139, item not focusable). Classification: **violation** (WCAG 2.1.1). Would follow from item 20's fix.

**Root cause E — header drag and all eight resize handles are pointer-only** (fails items 24–26):

26. **Item 24 — keyboard alternative for window drag/move.** Evidence: the header is the drag surface via `pointerdown` only (microw.ts:207, 652–666); it has no `tabindex`, no role, no key handling (grep: zero). Classification: **violation** (WCAG 2.1.1, Level A — keyboard users cannot move any window). Would require a focusable header with arrow-key move.
27. **Item 25 — keyboard alternative for resize (Window Splitter pattern).** Evidence: resize is `pointerdown` on `.mcrw-resize-*` divs only (microw.ts:583–586); no `role="separator"`, no `aria-valuenow` (grep: zero). Classification: **violation** as to WCAG 2.1.1 (keyboard users cannot resize any window); the splitter semantics themselves are the advisory layer. Would require arrow-key resize (focused header or focusable handles).
28. **Item 26 — each interactive handle is focusable-with-splitter-semantics or mirrored by a keyboard mechanism.** Evidence: the eight handles (microw.ts:582–587) are pure pointer targets; the only keyboard mirror would be item 25's, which doesn't exist. Classification: **violation** (via 2.1.1) with the splitter-naming layer advisory. Would require either splitter semantics per handle or a shared keyboard resize mechanism.

---

## Summary counts

**Verdicts:** met 8 · partial 2 · missing 18 · n/a 0
**Classifications:** violation 14 · advisory gap 6 (items 1, 3, 10, 17, 19, 22) · consumer scope 1 outright (item 16) + 1 leaning (item 27) · vacuous-met items noted inline
**Root causes behind all 14 violations:** (A) unnamed, role-less window (items 2, 3, 6) · (B) bare click-only control divs (7, 8, 9) · (C) model-only focus, never `element.focus()` (13, 14, 15) · (D) bare class-only taskbar items (20, 21, 23) · (E) pointer-only drag/resize (24, 25, 26).

## Top 5 gaps by real-user impact

1. **Items 24–26 (E): no keyboard move or resize** — WCAG 2.1.1, Level A. A keyboard-only user cannot perform the two operations that define a window: move it or resize it. Total functional exclusion, not degradation.
2. **Items 7–9 (B): header controls invisible/inoperable to keyboard and AT** — WCAG 2.1.1 + 4.1.2, Level A. Close/minimize/maximize are undiscoverable and unoperable without sight and a mouse; a mouse-less user cannot even close a window.
3. **Items 13–15 (C): focus stranded on model state, DOM focus lost** — WCAG 2.4.3, Level A. After minimize or close, real focus dies on `body`; keyboard and screen-reader users lose their place with no path back to the window they were just in.
4. **Item 2 (A): windows have no accessible name** — ARIA MUST → WCAG 4.1.2, Level A. Every window is an unnamed region; screen-reader users get no context for whatever content lands inside it.
5. **Items 20–21 (D): taskbar items not focusable, state class-only** — WCAG 2.1.1 + 4.1.2, Level A. The taskbar is the _only_ restore affordance for minimized windows (CONTEXT.md, _Restore affordance_); as implemented, a minimized window is permanently unrecoverable for keyboard and AT users — the harshest consequence in the set.

## Recommendation

Fix in the library, not the consumer contract, for four of the five: all five gaps are DOM/behavior the library itself creates, and the headless contract (`reference.md` §1) explicitly reserves only _visuals_ to the consumer while the checklist's §2 assigns the library the DOM, roles, and event wiring — so a "consumer adds ARIA" escape hatch would contradict microw's own headless rule that "a bare window is usable" (ADR 0005). Concretely: (1) render controls as native `<button>`s with `aria-label`s and give taskbar items `role="button"` + `tabindex="0"` + key activation mapping to the existing `handleClick` — this closes items 6–9, 20, 23 at near-zero cost because the click handlers already exist; (2) wire `aria-labelledby` to the title element and `role="dialog"` on the container at construction (items 1–3, 6); (3) add real DOM focus following the existing model hand-offs — `element.focus()` on a `tabindex="-1"` container on restore/hand-off, with a taskbar fallback on last-close (items 13–15), since the model already computes the right target; (4) add arrow-key move on a focusable header and arrow-key resize (simplest: on the focused header, direction-agnostic; splitter roles on handles as the follow-up, items 24–26). Document-as-consumer-contract only for items 16, 17, and 27 — focus-visible styling, visual distinction of model-focus from keyboard focus, and non-drag pointer affordances composed from the public `moveTo`/`resizeFrom` APIs — and say so explicitly in `reference.md` §1, which today delegates nothing about accessibility at all.
