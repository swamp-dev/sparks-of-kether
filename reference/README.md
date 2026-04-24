# Reference Material

The symbolic source of truth. These files describe the Kabbalistic system the
game is built on, not the game itself. Rules live in `../design/`.

## Files

| File | What's in it |
|---|---|
| [`sefirot.md`](sefirot.md) | The 10 nodes of the Tree. One row per Sefirah plus a short block (game role, stat, Shell). |
| [`hebrew-letters.md`](hebrew-letters.md) | The 22 Hebrew letters. Grouped by Sepher Yetzirah classification (3 Mothers, 7 Doubles, 12 Simples). |
| [`arcana.md`](arcana.md) | The 22 Major Arcana as path-keys. Each card unlocks one path. |
| [`paths.md`](paths.md) | The network — one table mapping every path to its endpoints, letter, arcanum, and attribution. Open this first to answer "what card unlocks path X?". |
| [`correspondences.md`](correspondences.md) | Cross-system tables: Sefirot ↔ planet/color/body, Letters ↔ astrology, Tarot ↔ letter ↔ astrology, Four Worlds ↔ suits. |

## How the data interlinks

```
  Sefirah (10)  ──┐
                  ├──  Path (22)  ──┬──  Hebrew letter (22)
                  │                 ├──  Major Arcanum (22)
  Sefirah (10)  ──┘                 └──  Astrological attribution
```

Each **path** connects two **Sefirot** and *is* one **Hebrew letter**, which
*is* one **Major Arcanum**, which carries one **astrological attribution**
(element, planet, or zodiac sign). This fourfold identity is the backbone of
the game's card economy: to travel a path, you play the arcanum it belongs to.

## Authority

Where traditions disagree, these files follow the **Golden Dawn / Hermetic**
attributions (e.g. Tzaddi = The Star, He = The Emperor). This is the
mainstream contemporary mapping and matches the ideation archive.
