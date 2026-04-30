# Typography

The type stack for Sparks of Kether. Three families, three jobs. All
self-hosted via `next/font/google`; all OFL-licensed; no runtime CDN
fetch.

| Token | Family | Role |
|---|---|---|
| `font-display` | **Fraunces** | All display copy: page titles, Sefirah names, card names, large quotes, dramatic numerals. Optical-size axis (`opsz`) enabled. |
| `font-sans` | **Inter** | Body text, UI labels, buttons, captions. Disappears at small sizes. |
| `font-hebrew` | **Frank Ruhl Libre** | All Hebrew. The face Sefaria uses for digital Hebrew reading. |

The CSS variables come from `app/layout.tsx`; the Tailwind aliases live
in `tailwind.config.ts`. Components use the utility classes
(`font-display` / `font-sans` / `font-hebrew`); they should never
import `next/font` directly.

## When to use display vs body

Rule of thumb: **anything 24px or larger, or set in display contexts
(card titles, Sefirah names, ritual quotes), gets `font-display`.
Everything else stays in `font-sans`.** A few specific cases:

- Page hero titles, section headers (`h1`, `h2`): always display.
- Card names, Sefirah names, Roman numerals on cards: display.
- Quotes inside the Blessing Ritual / Encounter narration: display
  (italic if available — Fraunces has expressive italics).
- Stat readouts inside the encounter modal: display at large sizes.
- Body copy on the Codex pages, About page, tooltips: sans.
- All UI controls (buttons, inputs, toggles): sans.

When in doubt, set in sans first; only promote to display if the
surface needs the extra weight.

## Optical sizing for Fraunces

Fraunces ships with an `opsz` axis (~9–144). Larger optical sizes
have higher contrast and more dramatic detail; smaller sizes mellow
toward neutrality. Browsers pick `opsz` automatically based on the
rendered size when `font-optical-sizing: auto` is the default — which
it is for `next/font/google` variable fonts.

If you need to override (rarely), use the CSS:

```css
font-variation-settings: 'opsz' 144;
```

Use this only when you need display-grade contrast at a small size
(e.g. a deliberately dramatic micro-caption); don't reach for it
casually.

## Hebrew sizing rule

Hebrew letters render visually shorter than Latin at the same nominal
font-size — the cap-height and ascender geometry differ. The rule
depends on the role Hebrew plays in the layout:

- **Hebrew at parity with English** (same line, same conceptual
  weight, e.g. `Crown / כתר` together as a heading): bump Hebrew **+1
  size step**. If English is `text-base` (16px), set Hebrew to
  `text-lg` (18px); they'll then read as equivalent visual weight.
- **Hebrew as subordinate label below English** (e.g. `BlessingRitual`
  renders the English Sefirah name at `text-3xl` with the Hebrew name
  on its own line beneath as a romanisation-style label): leave Hebrew
  one step smaller than the English, so the visual hierarchy reads
  primary → secondary. `BlessingRitual.tsx:164–172` ships this
  pattern; don't change it without a deliberate hierarchy decision.

In short: the rule depends on whether Hebrew is competing for the
reader's eye or following it. Match the existing pattern when
possible; only break parity intentionally.

## Decision history

The original stack was Cinzel + Inter + Noto Sans Hebrew. Cinzel was
swapped to Fraunces in **#324** because Cinzel reads as
Trajan-inscription / Roman-fantasy, and the project's voice is closer
to a 1920s occult journal — Fraunces (Undercase Type Foundry) carries
that voice better with its high-contrast didone-adjacent character
and optical-size axis.

Backup option considered: **Cormorant Garamond**. More conservative
Garamond-elegance, ship-it-safe. We went with Fraunces; if a future
review finds Fraunces too expressive in body-of-card contexts, swap to
Cormorant Garamond — same OFL, same `next/font/google` ergonomics —
and update this doc.

Hebrew was swapped from Noto Sans Hebrew to Frank Ruhl Libre in the
same ticket. Noto Sans Hebrew is a workhorse but not optimised for
digital body reading; Frank Ruhl Libre was designed for it and is
what Sefaria ships in production.

## What NOT to do

- Don't import a font from `next/font/google` outside `app/layout.tsx`.
  The CSS variables on the `<html>` tag are the single source of
  truth.
- Don't hard-code font family names in `style={}` inline. Use the
  Tailwind utility (`font-display`).
- Don't add a fourth family without updating this doc and adding the
  Tailwind alias in lockstep with the `next/font` import.
- Don't pull a foundry-licensed face (Klim, Pangram, Production Type)
  unless we have an explicit license. The current stack is OFL across
  the board so the project ships without a foundry decision blocking
  it.
