# Journal — #551: docs(pantheon): Egyptian deity mapping + voice spec

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T14:18:20-04:00 — push 1: Egyptian deity mapping + voice spec

**Pushed:** docs(pantheon): Egyptian deity mapping + voice spec (#551)
**Why:** Phase B1 of Epic #293. Locks the deity-to-Sefirah mapping (Amun→Chokmah, Isis→Binah, Ra→Chesed, Horus→Gevurah, Osiris→Tiferet, Hathor→Netzach, Thoth→Hod, Khonsu→Yesod, Bastet→Malkuth) in `reference/pantheons/egyptian.md` with per-deity voice specs, source citations from canonical primary texts, zodiac dignity calibration, and example pass/fail verdict lines (≤25 words). Adds `reference/pantheons/README.md` index and links it from `reference/README.md`. No code; foundation for B3/B4/B5 voice authoring.
**Notes:** Skipped `pnpm test` — docs-only diff, no production code touched; typecheck + lint clean.
**Commit(s):** `3977184`

## 2026-05-08T14:26:31-04:00 — push 2: address review (source citation corrections; voice-distinctness clarifications)

**Pushed:** docs(pantheon): refine Egyptian voice specs and source citations (#551)
**Why:** Code-reviewer (verdict: ship) flagged one SIGNIFICANT and several IMPROVEMENTS. Applied:
- **SIGNIFICANT** — Bastet's § 2 voice-spec preview now matches the § 6 example lines verbatim (other deities' specs anchor to their § 6 lines; Bastet was paraphrasing).
- **Source citations** — softened the Isis CT 148 pin to "Faulkner Osiris-myth grouping" (CT 148 isn't the standard number for the Isis-Horus conception); corrected the Book of the Heavenly Cow primary location from the Osireion to KV17 (Seti I); added Papyrus Harris 500 + Turin 1966 as the primary New Kingdom love-poetry sources, with Chester Beatty I as one of several (it's not the canonical home).
- **Voice-distinctness clarifications** — added a note to Horus's spec calling out divergence from Greek Ares (legal-claim / Contendings register vs. martial-visceral); added a note to Ra's spec calling out the imagery-anchor distinction from Hathor (both can use overflow-language; the imagery — sky/throne vs. cup/body — is what separates them).
**Notes:** Re-review fires per step 8a (fixes touched the SIGNIFICANT-flagged area). Local typecheck + lint clean. Net diff small (~15 lines).
**Commit(s):** `17990c5` (fix); journal entry committed alongside.
