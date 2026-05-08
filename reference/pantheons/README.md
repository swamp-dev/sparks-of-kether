# Per-pantheon avatar mappings

This directory holds the canonical deity-to-Sefirah mapping for each
playable pantheon, plus the per-deity voice spec that drives the
verdict / blessing / framing copy in `data/pantheons/<id>/`.

The mapping for the **Greco-Roman** pantheon (the MVP avatar set) lives
in [`design/avatars.md`](../../design/avatars.md) § 1; that file has
locked status and is the source of truth for the other content
(verdicts, blessings, framing).

Alternate pantheons drop their canonical mapping in this directory.
Each file is the per-pantheon analogue of `design/avatars.md` § 1 —
the locked deity table, per-deity voice spec, calibration notes
against the zodiac dignities, and source citations for the canonical
primary texts the voice draws from.

## Files

| File | Pantheon | Status |
|---|---|---|
| [`egyptian.md`](egyptian.md) | Egyptian | locked (see file for source citations) |

## Adding a new pantheon

1. Land a per-pantheon mapping doc here following the shape of
   `egyptian.md` — full deity table + voice specs + calibration +
   example verdicts.
2. Open the per-pantheon ticket set under Epic #293 (template:
   "feat(pantheon): \<pantheon\> \<aspect\>").
3. Wire the data files under `data/pantheons/<id>/` (mirroring
   `data/pantheons/greco-roman/`).
4. Extend the `PantheonId` union and add a registry entry in
   `data/pantheons/index.ts`.

The Phase A refactors (#547–#550) made the registry self-contained
per-pantheon; Phase B is what fills the `<pantheon>` slot with
actual content.
