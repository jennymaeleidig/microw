# Header controls as real buttons (root cause B)

Type: grilling
Status: resolved

## Question

How do the min/max/close controls become operable by keyboard and
screen reader (WCAG 2.1.1 + 4.1.2; audit items 6, 7, 8, 9, 10)?

Decide at minimum:

- Native `<button>` vs `role="button"` + `tabindex="0"` on the existing
  divs. Native buttons give name/activation/focusability for free but
  inject default UA styling consumers must reset — weigh against the
  zero-CSS, consumer-CSS philosophy and the cultivar mapping targets.
- Accessible names: fixed labels ("Minimize", "Maximize", "Close") — i18n
  story (configurable labels in `MicroWConfig`?).
- The max control's toggle exposure: `aria-pressed` with a constant label
  (audit recommendation) vs `aria-expanded`; label vs state trade-off.
- DOM/focus order among header controls, and how this fix closes audit
  item 6 (every window has a focusable descendant) — including windows
  whose consumer content is empty.

Evidence: `docs/aria-conformance-audit.md` root cause B. The CSS impact
note (native-button reset burden) matters most here — it gates the fog item
about cultivar source libraries.

## Answer

Decided 2026-07 (grilling session, all four sub-decisions agreed):

- **Element**: native `<button type="button">`, keeping the `mcrw-btn-*`
  classes. Focusability, Enter/Space, and button semantics come free; UA
  default styling is a documented one-time consumer reset. Native buttons
  also map trivially onto the cultivar source libraries, which style real
  `button` elements — and a bare window shows visible, usable chrome.
- **Names + i18n**: global `MicroW.setControlLabels({ min, max, close,
  moveHint })` with English defaults — control copy is app-wide chrome, not
  per-window content. The header's move/resize instruction label from
  ticket 01 joins the same mechanism.
- **Max toggle**: `aria-pressed="true|false"` with the constant label
  "Maximize". A single `updateControlState()` helper is called from every
  state transition (`toggleMax`, `restore`, minimize hand-off) so the
  attribute can't drift; the same helper pattern serves ticket 04's taskbar
  state exposure.
- **Tab order + item 6**: natural DOM order (header surface, then
  min → max → close), no roving tabindex. The window container always gets
  `tabindex="-1"`, so every window is focusable even with all controls
  disabled and no consumer content — this is also ticket 03's
  `element.focus()` target.
- **CSS impact** (v1.1 additive; class contract unchanged): consumers/
  cultivars must reset native button styling keyed to `mcrw-btn-*`; the
  reset note joins the consumer contract in
  [06-consumer-a11y-contract](06-consumer-a11y-contract.md). Cultivar
  verification spun out as
  [07-cultivar-button-mapping-check](07-cultivar-button-mapping-check.md).
