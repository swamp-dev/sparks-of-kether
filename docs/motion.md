# Motion & atmosphere

How motion and visual atmosphere work in Sparks of Kether. Two reserved
easings, one slow `breath` cadence, a per-Sefirah glow scale, and a
three-layer substrate. All Tailwind-token-backed; all reduced-motion
friendly.

The tokens in this document are defined in
[`tailwind.config.ts`](../tailwind.config.ts). The substrate component
lives at [`components/atmosphere/Substrate.tsx`](../components/atmosphere/Substrate.tsx).

---

## Substrate

Every route renders a three-layer atmospheric stack behind the page
content. It's wired once at `app/layout.tsx`; routes opt out by not
rendering pages on top of it (rare).

| Layer | z-index | What it is |
|---|---|---|
| **Void** | (body) | Deep-indigo body colour (`bg-void`, `#0b0a1f`). |
| **Bloom** | -z-20 (within Substrate) | Centred Tiferet-gold radial gradient at ~6% alpha. |
| **Grain** | -z-20 (within Substrate, atop bloom) | Procedural SVG-noise tile, `mix-blend-mode: screen`, ~5% opacity. |
| **ColorBloom** | -z-10 | Per-Sefirah colour wash (`ColorBloom.tsx`). |
| **GlyphWash** | -z-10 | Decorative glyph wash (`GlyphWash.tsx`). |
| **Starfield** | -z-10 | Pre-baked star scatter (`Starfield.tsx`). |

The four `-z-10` layers (ColorBloom / GlyphWash / Starfield + any new
sibling) all sit between the Substrate (`-z-20`) and page content
(`z-0+`). Adding a new atmosphere layer? Default it to `-z-10` and
update this table.

`Substrate` is `aria-hidden`, `pointer-events-none`. It lives at
`-z-20` so the existing `Starfield` component (`-z-10`) renders on
top of it, layering stars over the indigo wash.

The bloom uses `color-mix(in srgb, ...)` to compose alpha; same
convention as `ColorBloom.tsx`. Modern-browser CSS only (Chrome 111+,
Firefox 113+, Safari 16.2+).

The grain is an inline-SVG `feTurbulence` filter encoded as a data URL
inside the component. No external asset; no separate HTTP request. The
SVG renders at 200×200 CSS pixels and tiles. `feColorMatrix` tints the
noise toward off-white so `mix-blend-mode: screen` brightens midtones
rather than just adding pepper.

### Why this composition

The brief in Epic #310 was "atmosphere over flatness". A flat black
body with line art on top reads as clinical regardless of how good the
line art is. The void + bloom + grain stack gives every route a free
warmth pass: the page feels lit from somewhere, even before any
component thinks about its own glow.

---

## Easings

Two reserved cubic-beziers. **Pick one of these before reaching for a
custom easing.** They are documented and tested; new custom easings
are not.

| Token | Curve | Use for |
|---|---|---|
| `ease-emerge` | `cubic-bezier(0.22, 1, 0.36, 1)` (out-expo) | Things appearing on screen. Mounts, modals opening, halos lighting up, cards arriving in the hand. The fast initial settle reads as "arrived". |
| `ease-flow` | `cubic-bezier(0.65, 0, 0.35, 1)` (in-out-quart) | State transitions between visible elements. Meter fill changing, stat counter ticking, panel content swapping. The symmetric ease reads as "moved". |

Quick test if you're unsure: did the thing appear from nothing
(emerge), or did an existing thing change state (flow)? The fade-in
of the Hand on mount is **emerge**. The crossfade between two
encounter responses is **flow**.

```tsx
// Emerging
<div className="transition-opacity duration-300 ease-emerge data-[shown=true]:opacity-100" />

// Flowing
<div className="transition-all duration-200 ease-flow" />
```

---

## Durations

Tailwind's defaults (`duration-150`, `duration-200`, `duration-300`,
`duration-500`, `duration-700`, `duration-1000`) cover almost every UI
case. We add **one** new duration:

| Token | Value | Use for |
|---|---|---|
| `duration-breath` | `6000ms` | Slow atmospheric loops on `transition-*` utilities. |

`duration-breath` works for **transitions only** — Tailwind v3 has no
`animationDuration` theme key, so `duration-*` utilities never affect
`animation-duration`. For breathing **keyframe animations**, reach for
either:

1. The named `animate-breath` animation (preferred): a 6 s symmetric
   opacity in/out using the `flow` easing. See "Glow scale →
   Composition guide" below.
2. The arbitrary-value escape hatch: `[animation-duration:6000ms]`
   alongside whatever keyframe you're driving.

Don't reach for `duration-breath` (or `animate-breath`) for UI
feedback — it's too slow. 600ms is already at the edge of "did
anything happen?" territory.

### Named one-shot animations

Use these named utilities (defined in `tailwind.config.ts`) instead
of authoring new keyframes per call site:

| Token | Recipe | Use for |
|---|---|---|
| `animate-avatar-emerge` | 600ms `ease-emerge` `forwards` — opacity 0→1 + 12px slide-up + scale 0.92→1 | Encounter prep stage avatar entrance (#481). Settles confidently; the `forwards` fill-mode keeps the wrapper at the 100% keyframe state after the 600ms — without it the element would snap back to the 0% frame when the animation ends. The breath halo on the inner frame is on a separate element and is unaffected. |
| `animate-idle-jitter` | 10s `linear` `infinite` — 4-frame micro translate (±1.5px) + micro rotate (±0.3°) | Hermes (hod) idle body motion (#22). Quicksilver, restless, never-quite-still. Applied under `motion-safe:` with `[animation-delay:600ms]` so the emerge settles first. |
| `animate-idle-drift` | 10s `ease-flow` `infinite` — 3-keyframe slow lateral drift (±3px) + micro rotate (±0.5°) | Selene (yesod) idle body motion (#22). Lunar pull, tidal sway. Same delay/gating as `animate-idle-jitter`. |
| `animate-shell-awaken` | 500ms `cubic-bezier(0.22, 1, 0.36, 1)` `both` — opacity 0→1 + scale 0.92→1 | Shell sigil awakening transition (#317). |
| `animate-shell-banish` | 600ms `ease-flow` `both` — three-stop opacity + scale | Shell sigil banishing transition (#317). |

All are gated under `motion-safe:` at the call site so
reduced-motion users see the static end-state.

---

## Per-Sefirah idle motion catalogue

Applied to the stage-size `AvatarPortrait` body (the portrait `<img>` or
`AvatarSilhouette` fallback) when `pose === 'idle'`. Derived from each
avatar's voice character in `design/avatars.md` § 2.

| Sefirah | Avatar | Idle motion | Rationale |
|---|---|---|---|
| Hod | Hermes | `animate-idle-jitter` (10s micro-jitter) | Quicksilver, restless — never fully still |
| Yesod | Selene | `animate-idle-drift` (10s slow lateral drift) | Lunar pull, cool tidal sway |
| Gevurah | Ares | **None** (breath suppressed) | Martial austerity — dead still is a choice |
| Netzach | Aphrodite | `animate-breath` (6s halo, default) | Long slow breath; frame breath is her idle |
| Tiferet | Apollo | `animate-breath` (6s halo, default) | Balanced, harmonious — clean rhythmic breath |
| Chesed | Zeus | `animate-breath` (6s halo, default) | Magnanimous, abundant — generous breath |
| Binah | Demeter | `animate-breath` (6s halo, default) | Few words, weighed — breath like the earth turning |
| Chokmah | Athena | `animate-breath` (6s halo, default) | Strategic stillness — breath is her only tell |

All idle body animations start with `[animation-delay:600ms]` so the
`animate-avatar-emerge` entrance (600ms) settles before idle begins.

---

## Glow scale

Per-Sefirah `box-shadow.glow-{sefirah}` recipes. One per Sefirah, ten
total: `glow-kether`, `glow-chokmah`, `glow-binah`, `glow-chesed`,
`glow-gevurah`, `glow-tiferet`, `glow-netzach`, `glow-hod`,
`glow-yesod`, `glow-malkuth`.

Each recipe is **three stacked box-shadows** in the Sefirah's colour
at increasing radii — small/sharp, medium, large — so the halo reads
as warmth rather than a hard ring:

```css
/* Recipe shape (concrete values vary per Sefirah) */
box-shadow:
  0 0 8px  rgba(R,G,B, 0.45 - 0.55),
  0 0 18px rgba(R,G,B, 0.28 - 0.32),
  0 0 36px rgba(R,G,B, 0.16 - 0.18);
```

Two notable substitutions:

- **Binah's glow uses indigo (`#4b0082`), not Binah's canonical
  near-black.** A literal Binah-colour halo on the void would be
  invisible. The indigo halo references Binah-the-form-giver
  (saturnian, dark-blue) without disappearing.
- **Malkuth's glow uses an earthy amber (`#b87333`), not the canonical
  brown.** Same reasoning: low-chroma brown reads as nothing on the
  void; copper-amber stays in the Malkuth-earth/material correspondence
  while still rendering as a halo.

### Why box-shadow, not `filter: blur`

Mobile cost. `filter: blur` is paint-bound — every pixel within the
filter region gets sampled and convolved every frame, even when
nothing else is changing. On low-end mobile GPUs that's a budget
crusher; we have visible jank on a Pixel 4a-class device when blur
filters land in scrollable regions.

`box-shadow` is GPU-composited. The browser caches the shadow as a
texture and composites it; multiple stacked shadows still hit one
texture upload per element. We measured both (#311 review) — three
stacked shadows on a Sefirah node added ~0.3ms per frame on a Pixel
4a; the equivalent `filter: blur(8px)` added ~6ms.

**Rule:** if you're tempted to `filter: blur(...)`, stop. Compose
the same effect with stacked `box-shadow`s in the colour, or use a
radial-gradient pseudo-element with no filter.

### Composition guide

The recipes are tuned for dark surfaces (the substrate). To compose
a halo that lights up from `data-` state:

```tsx
<div
  data-active={isActive}
  className="
    rounded-full transition-all duration-700 ease-emerge
    data-[active=true]:shadow-glow-tiferet
  "
/>
```

For a slow breathing halo (Tree node at rest):

```tsx
<div className="rounded-full shadow-glow-yesod motion-safe:animate-breath" />
```

`animate-breath` is the named 6 s symmetric in/out opacity loop
(keyframe + animation defined in `tailwind.config.ts`). Always
author it under `motion-safe:` so reduced-motion users see the
static halo instead of the cycling animation.

---

## Mobile cost guidance

A short list of patterns we've measured costly enough to avoid:

- `filter: blur(...)` of any radius, anywhere in scrollable content.
- More than three layered `box-shadow`s on the same element (caching
  helps but the texture upload bandwidth still scales).
- Animated `filter: brightness(...)` over large viewport-sized layers
  (the Substrate, the Starfield container). Per-element brightness
  animation is fine — the Starfield twinkle uses it intentionally.
- Animated `background-position` on tiled SVG-noise grain (re-paints
  the entire substrate every frame).

The substrate is **static**. The starfield twinkle is **opt-in and
per-element**. The glow scale is **shadow-only, no filters**. These
three rules together keep mobile paint cost at parity with the flat-
black baseline before #311.

---

## Reduced motion

Every motion in this system is opt-in via Tailwind's `motion-safe:`
variant or already static.

- The Substrate is static — no animation to suppress.
- The Starfield twinkle uses `motion-safe:animate-atmosphere-twinkle`,
  so reduced-motion users get the static star scatter.
- New `duration-breath` animations should be authored under the
  `motion-safe:` variant by default. A reduced-motion user should
  see the halo at its mid-cycle alpha (or its baseline shadow), not
  the animated cycle.

```tsx
// GOOD — static halo for reduced-motion, breathing halo for everyone else.
<div className="shadow-glow-tiferet motion-safe:animate-breath" />
```

```tsx
// BAD — forces the breathing animation regardless of preference.
<div className="shadow-glow-tiferet animate-breath" />
```

If a designer asks for a motion that cannot be suppressed (the
victory crescendo, the Final Threshold reveal), surface it on the
ticket — those are content moments, not chrome, and the reduced-
motion call is per-feature.

---

## Related

- [`docs/typography.md`](typography.md) — type stack (Fraunces / Inter
  / Frank Ruhl Libre).
- [`tailwind.config.ts`](../tailwind.config.ts) — token source of truth.
- [`components/atmosphere/Substrate.tsx`](../components/atmosphere/Substrate.tsx)
  — the layout-level atmospheric layer.
- [`components/atmosphere/Starfield.tsx`](../components/atmosphere/Starfield.tsx),
  [`components/atmosphere/ColorBloom.tsx`](../components/atmosphere/ColorBloom.tsx),
  [`components/atmosphere/GlyphWash.tsx`](../components/atmosphere/GlyphWash.tsx)
  — sibling atmospheric layers; Substrate sits behind all of them.
