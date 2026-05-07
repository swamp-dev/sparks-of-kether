# Journal — #445: fix(lobby): brighten Scorpio + Capricorn ready-row glow

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T15:30:34-04:00 — push 1: signGlowColor helper for dark-sign halos

**Pushed:** fix(lobby): brighten Scorpio + Capricorn ready-row glow via signGlowColor helper (#445)
**Why:** The per-row ready-glow on the Lobby (added in #403) tints the halo by the player's chosen zodiac sign. Scorpio (`#5e2a4a`, luminance ≈ 0.24) and Capricorn (`#2a3a4a`, luminance ≈ 0.22) are dark enough that their halos at the canonical `0.50 / 0.30 / 0.16` alpha stack are barely perceptible on the indigo `bg-void` substrate — so a Scorpio player gets a noticeably weaker ready-halo than a fire-sign player. Cosmetic, real, not blocking. Fix mirrors the helper-substitution pattern the per-Sefirah glow recipes already use for Binah (substitutes `#4b0082`) and Malkuth (substitutes `#b87333`) in `tailwind.config.ts § boxShadow` for the same readability reason. New `signGlowColor(sign)` helper in `data/attribution-colors.ts` returns the brightened stand-ins (Scorpio → `#a04374`, Capricorn → `#5a7a9c`) for those two signs and the raw `SIGN_COLORS` hex for the other ten. Lobby's `signGlowShadow` now routes through `signGlowColor` instead of `attributionColor` — so the glow channel sees brighter hex while card surfaces / chips / non-glow attribution swatches continue to render the original `SIGN_COLORS` directly.
**Notes:** TDD red→green pure-helper change, single source of truth (`SIGN_COLORS` table left untouched per ticket scope; `SIGN_GLOW_OVERRIDES` is the override map, not a parallel table). Two new test files: 17 unit tests on `signGlowColor` itself (2 substitutions, 10 pass-throughs, 12 shape checks) plus 2 integration tests on the Lobby's rendered `boxShadow` style asserting Scorpio / Capricorn rows now reference the brightened RGB triplets and NOT the raw card-surface RGB triplets.
**Commit(s):** single commit, this push