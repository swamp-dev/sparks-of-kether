# Sparks of Kether

A cooperative ascent up the Kabbalistic Tree of Life.

2–4 players journey together from Malkuth (the material world) to Kether (the
Crown). Along the way, each Sefirah you visit grants you a **Spark** — a
lesson and a one-use ability — and each Spark brightens the team's shared
**Illumination**. Fail a challenge, hoard resources, or take the wrong
shortcut, and **Separation** rises instead; the **Shells** awaken and the
Tree begins to dim.

You win by reaching the Crown together with more Illumination than
Separation. You lose by letting the Shells swallow the Tree. Evil here is
separation and ignorance. Good is illumination and unity. The mechanics
aren't decoration — they teach the thing.

This repo is a **game-design document**, medium-agnostic. It could be
realized as a board game, a card game, a web app, or a computer game. The
soul of the game lives here; any implementation is downstream.

## Where to look

| If you want... | Read |
|---|---|
| The rules of play | [`design/mechanics.md`](design/mechanics.md) |
| The shadow mechanic | [`design/shells.md`](design/shells.md) |
| What each Sefirah is and does | [`reference/sefirot.md`](reference/sefirot.md) |
| The 22 Hebrew letters and their paths | [`reference/hebrew-letters.md`](reference/hebrew-letters.md) |
| The 22 Major Arcana as path-keys | [`reference/arcana.md`](reference/arcana.md) |
| The path network at a glance | [`reference/paths.md`](reference/paths.md) |
| Cross-system correspondences | [`reference/correspondences.md`](reference/correspondences.md) |
| The long-form ideation that started all this | [`KabballahGame.md`](KabballahGame.md) |

The `reference/` files are the raw source of truth for the symbolic system;
the `design/` files describe how the game uses them.

## Running the web app

The web implementation is a Next.js 14 (App Router) project using
TypeScript strict mode and pnpm. Node 20+ required.

```bash
# one-time setup — enables pnpm via Node's corepack
corepack enable

# install dependencies
pnpm install

# dev server on http://localhost:3000
pnpm dev

# production build
pnpm build

# gate commands (run before every push)
pnpm typecheck && pnpm lint
```

Directory layout:

| Path | Purpose |
|---|---|
| `app/` | Next.js App Router routes |
| `components/` | React components |
| `engine/` | Pure game logic (no React, no side effects) |
| `data/` | Typed data derived from `reference/*.md` |
| `lib/` | Utilities and hooks |
| `test/` | Test helpers (fixtures, mocks) |

See [`CLAUDE.md`](CLAUDE.md) for the working agreement, and the
[Epic issue](https://github.com/swamp-dev/sparks-of-kether/issues/1) for
implementation tracking.
