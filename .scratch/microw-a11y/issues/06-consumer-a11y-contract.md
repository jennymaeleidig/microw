# Consumer a11y contract in reference.md

Type: grilling
Status: resolved
Blocked by: 02, 03

## Question

`reference.md` §1 delegates only visuals to the consumer and says nothing
about accessibility — the audit flagged this as the reason several gaps
count as violations rather than documented non-goals. Decide what the
consumer a11y contract section says, covering the three items the audit
assigned to consumer scope plus anything the fix decisions push outward:

- Focus-visible styling expectations once controls/containers are
  focusable (audit item 16).
- Visual distinction of model-focus (`mcrw-focused`) from keyboard focus,
  and that model-focus is not DOM focus (audit item 17 — wording depends
  on the root-cause-C decision).
- Non-drag pointer/keyboard affordances composed from the public
  `moveTo`/`resizeFrom` APIs (audit item 27).

Also decide whether ADR-0005's "accessibility tree as accepted cost"
language needs superseding or amending — the audit shows the library now
owns semantics, so the ADR's framing may contradict v1.1. Blocked by the
header-controls and DOM-focus decisions, since the contract's content
depends on where the library/consumer line lands.

## Answer

Decided 2026-07 (grilling session, all three sub-decisions agreed):

- **Contract content — exactly five items**, each sourced from a decided
  ticket or the audit: (1) focus-visible styling required on `mcrw`,
  `mcrw-header`, `mcrw-btn-*`, `mcrw-taskbar-item`; (2) `mcrw-focused` is a
  visual cue only — semantic focus is DOM focus per ADR-0010; (3)
  non-drag affordances compose from the public `moveTo`/`resizeFrom`
  (WCAG 2.5.7, audit item 27) — the library ships the API, the page
  composes; (4) native-button reset keyed to `mcrw-btn-*`/
  `mcrw-taskbar-item` — required before system.css/classicy-tier mapping,
  harmless elsewhere (ticket 07 verdicts); (5) `setControlLabels` as the
  i18n surface for all a11y copy.
- **ADR-0005 stands unamended** — its accessibility-tree phrase is about
  chrome configurability costs, not delegation; the contract section adds
  what was missing rather than rewriting what's there.
- **Placement**: new top-level **"Accessibility contract"** section in
  `reference.md` (after the headless contract — the second half of the same
  ownership story), condensed to one paragraph + pointer in the README.
- **CSS impact**: the contract itself is the CSS-impact summary for the
  whole v1.1 effort.
- Writing the section is `/to-spec`'s implementation work, not this map's.
