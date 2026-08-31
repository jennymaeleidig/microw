# Wayfinder map — microw-a11y

Label: wayfinder:map

## Destination

Every decision needed to fix microw's 14 ARIA/WCAG Level A violations is
resolved and recorded in Decisions-so-far: a decided fix approach per root
cause, a verdict on each advisory gap, and the consumer a11y contract for
what stays delegated. The next session runs `/to-spec` on this repo — it
reads this map plus the closed tickets and writes the microw v1.1
accessibility spec. Decisions complete, then hand off; the map writes no
code and no spec.

## Notes

- **Domain**: microw is a zero-dependency, headless window-management
  microframework. The audit found 14 Level A violations across five root
  causes (A unnamed window, B bare control divs, C model-only focus,
  D class-only taskbar items, E pointer-only drag/resize).
- **Read before working**: `docs/aria-conformance-audit.md` (the verdict
  table with evidence and line numbers — the starting point for every
  ticket), `docs/aria-conformance-criteria.md` (the 28-item checklist,
  branch `research/aria-conformance`), `CONTEXT.md`, `docs/reference.md`,
  `docs/adr/0005`.
- **Skills every session should consult**: call the Skill tool twice, for
  "grilling" and "domain-modeling". Update `CONTEXT.md` when focus/semantics
  terms shift meaning.
- **Standing preferences**: target **v1.1** — the `mcrw-*` class contract is
  unchanged, so semantics are additive, not breaking; every decision still
  records a **CSS impact** note for cultivar authors. Fix violations
  in-library (the headless rule reserves only *visuals* to the consumer);
  document the three consumer-scope items explicitly in `reference.md` §1.
  Ticket order follows audit impact: E, B, C, D, A.

## Decisions so far

<!-- the index: one line per closed ticket -->

- [Keyboard move and resize (root cause E)](issues/01-keyboard-move-resize.md): header = one keyboard surface (tabindex 0, instruction-bearing aria-label); arrows move 10px, Alt+arrows resize from SE, Shift ×10; splitter roles on handles deferred; label i18n shares ticket 02's mechanism
- [Header controls as real buttons (root cause B)](issues/02-header-controls-buttons.md): native `<button type="button">` keeping `mcrw-btn-*`; global `MicroW.setControlLabels({min,max,close,moveHint})` with English defaults; max = `aria-pressed` via a single `updateControlState()` helper; natural DOM order; container always `tabindex="-1"` (closes item 6)
- [Cultivar mapping impact of native buttons](issues/07-cultivar-button-mapping-check.md): 98/7/XP.css mapping-clean-ish (their global `button` rule does the reset, but need wrapper-class/aria-label hooks); system.css and classicy need a reset-first rule; `aria-label` on controls mandatory in every mapping — reset stays consumer-side per the zero-CSS rule
- [Real DOM focus follows the model (root cause C)](issues/03-dom-focus-follows-model.md): model focus drives `element.focus({preventScroll})` on the `tabindex="-1"` container; stranded cases fall to the taskbar (`fallbackFocus` option overrides); no opt-out in v1.1; glossary reworded, ADR-0010 supersedes ADR-0009's isolation stance
- [Taskbar items as semantic buttons (root cause D)](issues/04-taskbar-item-semantics.md): native `<button>` items named by title ("Untitled window" fallback); `aria-expanded`+`aria-controls` (auto-id `mcrw-win-N`); `-focused`/`-max` stay class-only; bar = `role="group"` + `taskbarLabel`, plain tab sequence, toolbar deferred
- [Window name and role (root cause A)](issues/05-window-name-and-role.md): `role="dialog"` on the container; `aria-labelledby` → auto-id `mcrw-title-N` when titled, `aria-label` = `untitledWindow` fallback when not; `title` stays optional; pure attributes, no CSS impact
- [Consumer a11y contract](issues/06-consumer-a11y-contract.md): five-item contract (focus-visible, mcrw-focused visual-only, non-drag affordances via moveTo/resizeFrom, native-button reset, labels bag); ADR-0005 unamended; new top-level reference.md section + README condensation; writing it is /to-spec's work

## Not yet specified

- Minimized windows stay in the accessibility tree (class-only hiding, the
  element remains in the DOM) — outside the 28-item audit's scope, so
  `/to-spec` should scope it deliberately: hide via `aria-hidden`/`inert`,
  or leave exposed.
- Changelog/migration-notes and README updates for v1.1 — the shape depends
  on what the fix decisions change.
- Whether `aria-conformance-criteria.md` graduates from a research branch
  into `docs/` on main — a repo-hygiene call once the effort lands.

## Out of scope

- Implementing the fixes — this effort produces decisions for `/to-spec`,
  not code.
- microp's and microft's accessibility — separate efforts on their own maps.
