# Journal — #145: test(encounter): guard reducedMotion forEach loop against empty querySelectorAll

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T21:38:00-04:00 — initial implementation

**Pushed:** test(encounter): guard reducedMotion forEach loop against empty querySelectorAll (#145)
**Why:** The AvatarPortrait reducedMotion=true test used `silhouette?.querySelectorAll('*').forEach(...)` — if the silhouette ever rendered with zero children, all assertions would pass vacuously (empty forEach). Strengthened to capture the NodeList first, assert length > 0, then iterate — making the test self-defending against a future refactor that empties the SVG.
**Notes:** No behavior change; one extra assertion (length > 0) and a local variable added.
**Commit(s):** `4f3e82e351a49e12d0d6310887c422786953711e`
