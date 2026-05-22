# Journal — #93: feat(hand): enforce discardMode+onDiscard coupling at type level

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T01:25:00Z — push 1 discriminated union on HandProps

**Pushed:** Replace the flat `interface HandProps` with `interface HandBaseProps` + `type HandProps = HandBaseProps & (discriminated union)`. When `discardMode: true`, `onDiscard` is required; when `discardMode?: false`, `onDiscard?: never`. The render guard `discardMode && onDiscard && visible` is kept because `@typescript-eslint/no-non-null-assertion` forbids `!`, and the destructuring default `discardMode = false` loses the discriminant narrowing — the guard is what lets TypeScript see `onDiscard` as non-null in the render branch. Added comment explaining this.
**Why:** `HandProps` previously allowed `discardMode={true}` without `onDiscard`, silently no-oping every discard-icon click. The discriminated union makes it a compile-time error at all call sites.
**Notes:** All call sites (PlayScreen, EncounterScreen, tests) already provided both props together; no call-site changes needed. Pre-existing `synth.test.ts` PRNG flake confirmed on main — not related.
**Commit(s):** `f2710a5`
