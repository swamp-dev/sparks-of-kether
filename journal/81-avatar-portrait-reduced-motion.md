# Journal — #81: test(encounter): add reducedMotion threading test to AvatarPortrait

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T19:35:00-04:00 — initial implementation push

**Pushed:** test(encounter): add reducedMotion threading test to AvatarPortrait (#81)
**Why:** AvatarPortrait threads reducedMotion to AvatarSilhouette which uses it to gate transition-all on SVG elements. No test existed to pin this forwarding. Added two tests: one asserting reducedMotion=true suppresses transition-all on all silhouette children, one confirming reducedMotion=false (default) applies it. Used getAttribute('class') instead of el.className.toString() because SVG className is SVGAnimatedString.
**Notes:** none
**Commit(s):** TBD
