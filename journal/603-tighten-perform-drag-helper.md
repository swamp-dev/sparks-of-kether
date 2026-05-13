# Journal — #603: test(play): tighten performDragWithDropTarget — hoist DocWithEFP, delete elementFromPoint on teardown

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-13T12:38:21-04:00 — push 1: hoist DocWithEFP + clean elementFromPoint teardown

**Pushed:** test(play): tighten performDragWithDropTarget — hoist DocWithEFP, delete elementFromPoint on teardown (#603)
**Why:** Deferred from #586 review. Two micro-cleanups on the `performDragWithDropTarget` helper that #586 hoisted to module scope but didn't tidy. (1) The `DocWithEFP` type alias was still declared inside the function body — pointless re-declaration on every call now that the function isn't nested; moved to module scope above the function. (2) The `finally` block was assigning `originalEFP` back unconditionally — when `originalEFP === undefined` (jsdom default) that left `elementFromPoint` as an own-property set to `undefined`, not restoring the original "property never assigned" shape. Branch on `originalEFP === undefined` and `delete` in that case. Required tweaking the `DocWithEFP` alias from `Document & { elementFromPoint?: ... }` to `Omit<Document, 'elementFromPoint'> & { elementFromPoint?: ... }` so TypeScript's strict-mode `delete`-of-required-property rule doesn't reject the teardown (lib.dom.d.ts declares `Document.elementFromPoint` as required).
**Notes:** none
**Commit(s):** single edit to `components/game/__tests__/PlayScreen.drag.test.tsx` + this entry
