# Real DOM focus follows the model (root cause C)

Type: grilling
Status: resolved

## Question

"Focus is model state — never real DOM focus" (CONTEXT.md, *Focus*) strands
DOM focus on `body` after minimize, restore, and last-close (WCAG 2.4.3;
audit items 13, 14, 15). Decide how real DOM focus follows the existing
model hand-offs without breaking the model-focus semantics consumers build
on:

- What element receives DOM focus: a `tabindex="-1"` window container, the
  newly focused window's first control, or the taskbar item?
- Minimize: focus follows the hand-off target (audit rec: next window's
  container or its taskbar item) — which, and what when no next window
  exists?
- Restore: into the restored window — container or first focusable
  descendant?
- Last-close fallback target (taskbar? document-level? consumer-supplied
  element?) — and whether the consumer can override targets via options.
- Does CONTEXT.md's *Focus* entry need rewording, and does a term like
  "DOM focus" vs "model focus" need to enter the glossary?

Evidence: `docs/aria-conformance-audit.md` root cause C, including the
exact hand-off call sites. Record the CSS impact note (focus-visible on
newly focusable containers).

## Answer

Decided 2026-07 (grilling session, all three sub-decisions agreed):

- **Target**: model focus now *drives* real DOM focus, one-way — whenever
  the model focuses a window, `element.focus({ preventScroll: true })` goes
  to that window's container (`tabindex="-1"`, decided in ticket 02). Not
  the first focusable descendant (content-dependent, fragile). DOM focus
  never feeds back into the model. No opt-out in v1.1; noted as a possible
  future option if embedding conflicts appear.
- **Fallback**: one mechanism for both stranded cases (minimize of the only
  window, close of the focused last window) — DOM focus goes to the
  **taskbar element** (`tabindex="-1"`), the semantic restore affordance
  (ADR-0004). Consumer override via a `fallbackFocus?: HTMLElement` option
  for taskbar-less roots; degrades to a documented no-op there. Contract
  wording lands in
  [06-consumer-a11y-contract](06-consumer-a11y-contract.md).
- **Glossary + ADR**: CONTEXT.md *Focus* reworded (model focus directs DOM
  focus) and a contrasting **DOM focus** term added; ADR-0010
  (`docs/adr/0010-model-focus-directs-dom-focus.md`) records the contract
  change, superseding the focus-isolation stance of ADR-0009.
- **CSS impact**: containers, taskbar element, and any `fallbackFocus`
  target are focusable — focus-visible styling joins the consumer contract.
