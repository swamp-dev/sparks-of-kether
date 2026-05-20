# Journal — #102: fix: audit template-literal className patterns that could lose class separators

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T14:44:32-04:00 — final push

**Pushed:** fix: audit template-literal className patterns that could lose class separators
**Why:** prettier-plugin-tailwindcss strips leading spaces from conditional branches in template literals. Convert to full ternaries (AvatarStack) and conditional interpolation (OrreryBackdrop) to make separators explicit.
**Notes:** pnpm format was applied during implementation — prettier reordered hover:scale-105 to its sorted position in the ternary string.
**Commit(s):** `942b7db`

## 2026-05-20T14:48:53-04:00 — fix push after first review

**Pushed:** fix(presence): apply conditional interpolation to AvatarStack wrapper className
**Why:** Reviewer found SIGNIFICANT: outer wrapper div still used ${className ?? ''} trailing-space pattern. Same fix as OrreryBackdrop applied.
**Notes:** Deferred minors: PeerCursor/ActionToast trailing-space variants, Hand.tsx .trim(), no className prop tests on changed components. Re-review required.
**Commit(s):** `4aa185d`
