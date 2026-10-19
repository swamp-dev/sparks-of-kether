# Journal — #369: Replace unknown-provenance Rider-Waite JPEGs with public-domain Pam-A scans

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

Context: the 22 card JPEGs shipped since #208 (`public/rider-waite-cards/`,
199×340, 12–18 KB) had no recorded source and a colourway matching the
US Games 1971 recolour, which US Games claims copyright on. The 1909/1910
Pamela Colman Smith art itself is public domain everywhere (US: pre-1931
publication; UK/EU: Smith d. 1951 → PD 2022-01-01). This branch swaps in
SHA-1-verified Wikimedia Commons scans of the 1910 "Pam-A" printing and
derives runtime WebPs from them.

---

## 2026-10-19T18:56:32-04:00 — push 1: PD scans in, runtime WebPs, review fixes

**Pushed:** chore(assets): add public-domain 1910 Pam-A Rider-Waite-Smith major arcana scans; feat(cards): serve WebPs derived from the public-domain Pam-A scans; fix(cards): address review — regenerate marketing shots, guard the image map, soften licence wording; docs(assets): link marketing-cap follow-up #370.
**Why:** The 22 card JPEGs shipped since #208 had no recorded source and matched the US Games 1971 recolour. Swap to SHA-1-verified Commons scans of the 1910 Pam-A printing (PD everywhere) and derive 400px WebPs for runtime.
**Notes:** The `assets/` copy turned out to be a byte-identical duplicate of `public/rider-waite-cards/`, so scope widened from "swap a source folder" to the shipped images, `rw-image-map.ts`, and baselines. ArcanumCard's crop/filter needed no change (checked by rendering /demo/cards). A dev server from the main checkout was already on :3000, which Playwright would have reused and screenshotted the *old* art — ran e2e and re-captures against a worktree server on :3010 via `PLAYWRIGHT_BASE_URL`. Only card-bearing baselines (demo-cards, demo-hand, play-mid-game, arcana-13) plus about/home (they embed the marketing PNGs) were re-captured; the other 25 drift locally from atmosphere noise (PSNR 27–40 dB) and were deliberately reverted. Plain `--update-snapshots` rewrote nothing because the new art sits inside the 3.5 % threshold; needed `--update-snapshots=all`. Marketing pack was already ~2.8 MiB against its 1.5 MiB cap before this branch (→ #370). code-reviewer pass 1: Fix (stale marketing shots; forward-only removal caveat; legal wording; existence test). Pass 2 on cc152d7: Ship, three minors (one fixed in 7e2a9f4, #370/#371 filed). Full local gate: verify + build via `SKIP_E2E=1 pnpm ci:local`; e2e 104 passed / 66 env-gated skipped against :3010; integration auto-skipped by path filter (same filter as hosted CI).
**Commit(s):** `3f550ba..7e2a9f4` plus this journal commit
