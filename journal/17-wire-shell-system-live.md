# Journal — #17: fix(shells): wire dormant Shell system into live gameplay (awakening, banishment, all 10 effects)

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-15T18:19:35-04:00 — initial push: Shell system wired end-to-end

**Pushed:** test(shells): add integration tests for awakening + banishment hooks; feat(shells): wire all 10 Shell effects into live gameplay; test(shells): unit tests + integration for all 10 Shell effects; fix(shells): address code-review findings
**Why:** Wires the dormant Shell system into live gameplay — all 10 Sefirah pressure mechanics (Inertia, Hoarding, Cruelty, Vanity, Obsession, Deception, Illusion, Fragmentation, Paralysis, Despair) with awakening hooks in `acceptSetback` and `applyMove`, banishment wired through `resolveChallenge`. Review fixes: `deceptiveTopCard` formula corrected (separation%deck.length only); `banishShell` now clears `illusoryPath` when Yesod is banished.
**Notes:** Code-reviewed pre-push via code-reviewer agent; 2 significant findings fixed in `8b7e75c`; 4 minor findings deferred to tech-debt issues
**Commit(s):** `4394065..8b7e75c`
