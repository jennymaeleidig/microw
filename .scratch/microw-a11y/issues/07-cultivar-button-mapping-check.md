# Research — cultivar mapping impact of native buttons

Type: research
Status: resolved

## Question

Ticket 02 decided the header controls become native `<button type="button">`
elements (classes unchanged). Cultivars will map `mcrw-btn-*` onto
retro-CSS libraries whose window chrome is built on real buttons — but some
libraries assume markup that differs from microw's (button inside a title
bar, specific wrappers), and microw's consumer-CSS philosophy means the
library ships no reset. Verify, against the libraries' actual source:

- For 98.css, 7.css, system.css, XP.css, and classicy (vendor tier): how do
  their title-bar/window button styles select elements (`button.foo`?
  bare `button`? scoped classes)? Does microw's `<button class="mcrw-btn-min">`
  inherit the intended look with a class mapping alone, or does it need an
  `all: unset` reset first to escape UA styles the library's selectors
  don't override?
- Any UA-style conflicts that would make the mapping layer ugly (e.g.
  libraries styling `button` globally, which would hit microw's buttons
  unintentionally — a help or a hazard?).

Goal: a per-library verdict (mapping-clean / needs-reset-first / needs
vendor adjustments) so the consumer-contract reset note in ticket 06 and
the future cultivar mapping specs can cite facts.

Findings: `research/cultivar-button-mapping.md` on the
`research/cultivar-buttons` branch.

## Answer

Verified against each library's source CSS on `main` (dist files are
gitignored; the tracked SCSS/style.css is the source of truth).

- **98.css** — needs-vendor-adjustments. Global bare-`button` rule wipes UA
  styles; mapping must put `title-bar-controls` on `mcrw-header` and needs
  `aria-label` on buttons (`[aria-label].minimize` compound selectors).
- **7.css** — needs-vendor-adjustments. Same global reset; scoped rules
  explicitly undo it inside the title bar; map `is-minimize`/`is-close`
  classes (or aria-labels) + `title-bar-controls` wrapper.
- **system.css** — **needs-reset-first**. No bare-`button` rule exists;
  `.title-bar button` sets bg/border/size but leaks UA padding/font/box-sizing.
  Also has no minimize/maximize concept (close + resize only).
- **XP.css** — needs-vendor-adjustments. Global `button` reset twice (base +
  XP theme); icons match **only** `button[aria-label=…]` — no class fallback —
  plus the `title-bar-controls` wrapper requirement.
- **classicy** — **needs-reset-first**. Control boxes are
  `div[role="button"]`, styled by descendant classes only; no element reset
  anywhere, so UA button metrics leak unless the cultivar resets first.

Consumer-contract takeaway for ticket 06: microw stays zero-CSS; the reset
belongs to the consumer — unnecessary for 98/7/XP (their global `button` rule
does it, at the cost of the form-button look leaking outside the title-bar
scope), required (box-sizing/padding/font, or `all: unset`) for system.css
and classicy; `aria-label`s on the controls are mandatory in every mapping.

Full findings with citations:
`research/cultivar-button-mapping.md` on branch `research/cultivar-buttons`.
