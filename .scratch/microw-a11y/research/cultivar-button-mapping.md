# Cultivar button mapping impact — window/title-bar controls

Research for [ticket 07](../issues/07-cultivar-button-mapping-check.md), feeding
[ticket 06](../issues/06-consumer-a11y-contract.md) (consumer-contract reset note).
Ticket 02 decided microw v1.1 renders header controls as native
`<button type="button" class="mcrw-btn-min|max|close">` inside `div.mcrw-header`
inside `div.mcrw`. Microw ships zero CSS; cultivars map `mcrw-*` classes onto
retro-CSS libraries that remain the source of truth.

**Question answered here:** is a class mapping alone enough once the controls are
real `<button>`s, or does UA default button styling (`background`, `border`,
`padding`, `font`, `appearance`) leak through because the library's selectors
never reset those properties?

**Method:** all claims below were verified against the libraries' actual source
CSS fetched from `raw.githubusercontent.com` at each repo's default branch
(`main`) on 2025 research date. Note: the published `dist/` files of 98.css,
7.css, system.css, and XP.css are **gitignored build artifacts** — the tracked
source of truth is `style.css` (98.css, system.css) or the `gui/`/`themes/`
SCSS (7.css, XP.css, classicy). Line numbers refer to the fetched files.

---

## 98.css (jdan/98.css @ main, `style.css`)

**(1) Selector shape.** Title-bar controls are selected as
`.title-bar-controls button` — bare element, scoped under a wrapper class
(style.css:255, 259). Per-button variants are
`.title-bar-controls button[aria-label="Minimize"], .title-bar-controls button[aria-label].minimize`
(274–275) and the same dual pattern for `Maximize`, `Restore`, `Close`
(309–310). Two properties of that shape:

- The icon variants work **only if the button also carries `aria-label`** —
  `.minimize` alone never matches; it is always compounded with `[aria-label]`.
- The buttons must sit under `.title-bar-controls`. Microw has no controls
  wrapper; the cultivar must map both `title-bar` and `title-bar-controls`
  onto `mcrw-header` (one element carrying two mapped classes), which works
  because 98.css uses descendant selectors.

**(2) Does the library itself reset UA button styles?** Yes, unconditionally:
a global bare-`button` rule (style.css:107–121) sets `border: none`,
`background: var(--surface)`, `box-shadow` (bevel via variables),
`border-radius: 0`, `min-width: 75px`, `min-height: 23px`,
`padding: 0 12px`, `box-sizing: border-box`. `.title-bar-controls button`
then re-overrides `padding: 0`, `display: block`, `min-width: 16px`,
`min-height: 14px` (259–263) and `:focus { outline: none }` (270). No UA
`background`/`border`/`padding` leaks through.

**(3) Global `button` styling — help or hazard?** Both. Help: it is what
removes UA styles. Hazard: microw's buttons get the full 98.css *form* button
treatment (75×23 beveled push-button) wherever they are **not** inside the
mapped `.title-bar-controls` scope — including any pre-mapping flash and any
microw button the cultivar forgot to scope.

**Verdict: needs-vendor-adjustments** — no reset needed (the global `button`
rule does that work), but the mapping must (a) put `title-bar-controls` on
`mcrw-header` in addition to `title-bar`, and (b) rely on `aria-label`
attributes being present, which microw v1.1 supplies anyway.

## 7.css (khang-nd/7.css @ main, `gui/_button.scss` + `gui/_window.scss`)

**(1) Selector shape.** Same architecture as 98.css (7.css is XP.css's
ancestor): global reset on `button, [role="button"],
input[type="file"]::file-selector-button` (_button.scss:1–16) sets `font`,
`border`, `border-radius`, `box-shadow`, `min-width: 75px`,
`min-height: 23px`, `padding: 0 12px`, `background` gradient. Title-bar
buttons are nested `.title-bar { &-controls { button { … } } }`
(_window.scss:204+, controls block from ~337). Per-button variants are
`&[aria-label="Minimize"], &.is-minimize` (280), likewise `is-maximize`,
`is-help`, `is-restore`, and `is-close` (308, which also widens the button to
`min-width: 48px`, 309). Class variants (`is-*`) exist independently of
`aria-label` — either one pulls the icon.

**(2) Library-side UA reset?** Yes — and, unlike 98.css, 7.css *explicitly
re-neutralizes its own global button styles* inside the title bar:
`background: none`, `border: 0`, `border-radius: 0`, `box-shadow: none`,
`padding: 0`, `min-width: 29px`, `min-height: 19px`, plus
`&::after { content: none }` and a comment at _window.scss:252:
`/* resolve the conflict with button styles */`. The design presumes the
global reset is loaded; the scoped rules handle the rest. No UA leak.

**(3) Global `button` — help or hazard?** Same as 98.css: help (UA styles
gone), hazard (unscoped microw buttons render as Aero-style form buttons, and
the `::before`/`::after` hover/press overlay elements apply to *any* button).

**Verdict: needs-vendor-adjustments** — no reset needed; the cultivar must map
`title-bar-controls` onto `mcrw-header` and choose between `is-*` variant
classes (map `mcrw-btn-min` → `is-minimize` … `mcrw-btn-close` → `is-close`)
or rely on microw's `aria-label`s.

## system.css (sakofchit/system.css @ main, `style.css`)

**(1) Selector shape.** Title-bar buttons are `.title-bar button`
(style.css:266–275) with per-button classes `.title-bar button.close` (283)
and `.title-bar button.resize` (306), plus `.title-bar button.hidden` (315).
Only `close` and `resize` exist — there is **no `minimize`/`maximize`/`zoom`
variant** (classic-Mac chrome: close box + zoom/resize box only). No
`aria-label` variant exists; the accessible name is expected in a
`.title-bar button span` that is visually clipped (277–282) — system.css
assumes a labelled button, microw's are empty.

**(2) Library-side UA reset?** **No.** system.css has **no global `button`
rule at all** — form buttons are styled by the class `.btn` (381+), and the
only other `button` element selectors are menu-scoped
(`ul[role="menu"] > [role="menu-item"] > button`, 668). The scoped
`.title-bar button` rule sets `background-color: var(--primary)`,
`border: 4px solid var(--secondary)`, fixed `width/height: 40px`,
`display: block`, `transform: scale(0.5)` — but never sets `padding`, `font`,
or `box-sizing` (the file's one `box-sizing` is on scrollbar thumbs, 90).
Under UA default `box-sizing: content-box`, UA button padding (~1px 6px in
Chrome) *adds to* the declared 40×40, and UA `appearance`/font can bleed in.
Setting `background-color` and `border` does suppress the native widget paint
in modern browsers, but the metric leak is real.

**(3) Global `button` — hazard?** No bare-element `button` styling exists, so
there is no unintended-hit hazard; the flip side is there is also no reset to
borrow. (`.btn` is opt-in and cannot hit microw's buttons.)

**Verdict: needs-reset-first** — a light reset (`box-sizing: border-box`,
`padding: 0`, `font: inherit`, `appearance: none`) must precede the class
mapping; the mapping itself must also invent minimize/maximize placements
system.css does not define.

## XP.css (botoxparty/XP.css @ main; published `dist/XP.css` = `themes/XP/index.scss`)

**(1) Selector shape.** The published file is `gui/*` (7.css-derived base)
plus `themes/XP/*` overrides (themes/XP/index.scss). Title-bar buttons:
`.title-bar-controls button` in gui/_window.scss (padding 0, display block,
min 16×14, `:focus { outline: none }`), re-specified in
themes/XP/_window.scss (~line 40s: `min-width/min-height: 21px`,
`background-color: #0050ee`, `border: none`, `box-shadow: none`,
`transition: background 100ms`). Per-button icons exist **only as
`button[aria-label="Minimize"|"Maximize"|"Restore"|"Help"|"Close"]`**
(themes/XP/_window.scss:59+) with hover/active SVG swaps — grep confirms
**no `.minimize`/`.close` class fallback** in the XP theme, unlike 98.css and
7.css. The `aria-label` is therefore mandatory, and the
`.title-bar-controls` wrapper class must land on `mcrw-header`.

**(2) Library-side UA reset?** Yes, twice over: a global bare-`button` rule in
gui/_buttons.scss:5+ (`border: none`, `background: var(--surface)`,
`min-width: 75px`, `min-height: 23px`, `padding: 0 12px`,
`box-sizing: border-box`, dotted focus outline) is then fully overridden by
the XP-theme bare-`button` rule in themes/XP/_buttons.scss:5+ (XP gradient
background, `border: 1px solid #003c74`, radius 3px, hover/active/focus
shadows). No UA leak anywhere.

**(3) Global `button` — help or hazard?** Help for the reset, hazard for
scope: every unscoped microw button renders as an XP push-button with the
orange hover glow. Note the theme rule also `box-shadow: none !important` on
`.title-bar-controls button:active/:hover/:focus` — evidence the author
fought the global rule inside the title bar; the global rule is load-bearing.

**Verdict: needs-vendor-adjustments** — no reset needed; mapping must add
`title-bar-controls` to `mcrw-header` and must ship `aria-label`s on the
buttons (classes alone match nothing in the XP theme).

## classicy (robbiebyrd/classicy @ main, `src/SystemFolder/SystemResources/*`)

**(1) Selector shape.** Classicy's window control boxes are **not `<button>`
elements at all**: `ClassicyWindow.tsx` renders them as
`<div className="classicyWindowCloseBox" role="button" tabIndex={0}>`
(lines ~1104–1118, zoom ~1148, collapse ~1162) with an explicit
`biome-ignore lint/a11y/useSemanticElements: custom window control styled as
pixel-precise box` comment. Styling is purely descendant-class based:
`.classicyWindow .classicyWindowTitleBar .classicyWindowControlBox`
(ClassicyWindow.scss:323 — container, `opacity: 0`, fixed w/h) and
`.classicyWindowCollapseBox / .classicyWindowZoomBox / .classicyWindowCloseBox`
(332–355) via the `platinumWindowControlBoxDepressable` mixin
(AppearanceManager/styles/appearance.scss:76+), which sets width/height, a
gradient `background`, `border` + inset bevels, and an `::after` icon.
Active/inactive state toggles the same classes under `.classicyWindowActive`
(87–92). No element-type selector is involved, so the mixin's rules would
apply equally to a `<button>` with the mapped classes.

**(2) Library-side UA reset?** **No.** Classicy never resets bare `button`:
`ClassicyButton.tsx` renders a native `<button>` but styles it purely by the
`.classicyButton` class (ClassicyButton.scss:1+), and the control-box mixin
sets `background`/`border`/size but **not** `padding`, `font`, `line-height`,
or `box-sizing` (width/height are `!important` but under content-box UA
padding inflates them; UA `font`/`appearance` are untouched). Mapped onto
`<button class="mcrw-btn-min">`, the bevel and icon would arrive while UA
padding/font metrics shift geometry — an `all: unset`-style reset (or at
minimum `box-sizing`, `padding: 0`, `font: inherit`) must come first.

**(3) Global `button` — hazard?** None — there is no bare-`button` selector
anywhere in the window or button styles, so classicy cannot unintentionally
hit (or pre-reset) microw's buttons. The mirror hazard: nothing protects
against UA styles either.

**Verdict: needs-reset-first** — class-based descendant selectors are
element-agnostic (good), but the library assumes `div[role="button"]` markup
and supplies no element-level reset; the cultivar must neutralize UA button
styling before the class mapping, and map `mcrw-btn-close` →
`classicyWindowCloseBox` (collapse/zoom variants have no microw counterpart;
min has no native icon — needs a vendor-side decision).

---

## Verdict table

| Library | Global bare-`button` rule? | UA leak through title-bar selectors? | Extra mapping requirements | Verdict |
| --- | --- | --- | --- | --- |
| 98.css | Yes (`button`, style.css:107) | None — global rule resets bg/border/padding/min-size | `title-bar-controls` on `mcrw-header`; `aria-label` required for icons (`[aria-label].minimize` compound) | needs-vendor-adjustments |
| 7.css | Yes (`button, [role=button]`, _button.scss:1) | None — scoped rules explicitly undo the global styles (_window.scss:252) | `title-bar-controls` on `mcrw-header`; `is-*` variant classes or `aria-label` | needs-vendor-adjustments |
| system.css | **No** (form buttons are `.btn`) | **Yes** — `.title-bar button` sets bg/border/size but not padding/font/box-sizing | light reset first; `close`/`resize` only — no minimize/maximize concept | **needs-reset-first** |
| XP.css | Yes, ×2 (gui base + XP theme) | None | `title-bar-controls` on `mcrw-header`; **`aria-label` mandatory** (no class fallback in XP theme) | needs-vendor-adjustments |
| classicy | **No** (control boxes are `div[role=button]`; form buttons class-styled) | **Yes** — mixin sets bg/border/size, not padding/font/box-sizing; markup assumes divs | `all: unset`-style reset first; close maps cleanly, min/zoom need vendor decisions | **needs-reset-first** |

## What the microw consumer-contract reset note should say

The reset note in ticket 06 should state: because microw ships zero CSS and
v1.1 renders header controls as native `<button>` elements, consumers styling
windows against a retro-CSS library must neutralize user-agent button styling
before (or as part of) the cultivar's class mapping. Which properties need
resetting is decided by the target library, not by microw: libraries with a
global bare-`button` reset (98.css, 7.css, XP.css) already wipe UA styles and
need no extra reset — their hazard is the inverse, that microw's buttons
inherit the library's *form* push-button look wherever the title-bar scope
doesn't reach, so the mapping must keep the controls inside the library's
scoped wrapper (e.g. `title-bar-controls` on `mcrw-header`). Libraries without
any bare-`button` rule (system.css, classicy) leave UA `padding`, `font`, and
`box-sizing: content-box` metrics intact even where their own selectors set
`background`/`border`, so the cultivar must apply a small reset —
`box-sizing: border-box; padding: 0; font: inherit;` (an `all: unset` reset
plus re-applied focus affordances is the safe form) — before the class
mapping. In all cases the note should require `aria-label` attributes on the
controls: 98.css and XP.css match their icon variants only through
`button[aria-label=…]`, and it is the accessible name ticket 02/05 expect
anyway. Microw itself should document the requirement but ship no reset —
the reset belongs to the consumer's CSS, keeping the zero-CSS contract intact.
