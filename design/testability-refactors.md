# Testability-refactor audit

Captured: 2026-04-27 against commit `ace5fd4` (the doc itself adds a follow-on commit; cite that range when navigating). All file:line references in this document are pinned to the captured commit — they will drift as code lands. Scope: `engine/`, `lib/`, `components/game/`, `app/rooms/[code]/lobby/page.tsx`. Driven by:

- The mutation pilot (T4 / #90): `engine/setup.ts` at 72.73% surfaces missing fixture coverage of the empty-players guard from #35.
- The coverage baseline (T1a / #86): `lib/use-turn.ts` (67% lines / 41% branches), `lib/presence.ts` (86% / 47% branches), `lib/supabase.ts` (79% / 60%) are the lowest-coverage non-app files.
- The property-based pilot (T7 / #93): properties on engine reducers run cleanly; equivalent properties on hooks would require either a React-test-bed wrapper or a refactor that exposes the pure core.

> [!IMPORTANT]
> This document is descriptive, not prescriptive. Each candidate ships as its own sub-ticket linked to Epic #84. The audit's job is to identify the seams worth refactoring AND argue why; the implementation tickets own the work.

---

## Candidate 1 — `lib/use-turn.ts`: extract pure turn reducer

**Files:** `lib/use-turn.ts:89-274`

**Why:** Coverage is 67% lines / 41% branches — the worst load-bearing module in the repo. The hook mixes pure phase-machine logic (`move → challenge → draw → end → move`) with React lifecycle (`useState`, `useCallback`). Properties from T7 cannot reach the phase logic without a `renderHook` harness; mutation testing on the file (when scope expands beyond `engine/`) will report many surviving mutants in the unreachable branches.

**Before** (lines 89-100, abbreviated):
```ts
export function useTurn(opts: UseTurnOptions): UseTurnReturn {
  const [state, setState] = useState<GameState>(opts.initialState);
  const [phase, setPhase] = useState<TurnPhase>('move');
  // ...derives activePlayerIndex, builds 8 useCallbacks that mutate
  // state + phase via setState/setPhase...
}
```

**After:**
```ts
// New: lib/turn-machine.ts (pure)
export type TurnEvent =
  | { kind: 'move'; pathNumber: number }
  | { kind: 'meditate' }
  | { kind: 'submit-challenge'; ... }
  | ...;
export interface TurnSnapshot {
  readonly state: GameState;
  readonly phase: TurnPhase;
}
export function turnReducer(
  snapshot: TurnSnapshot,
  event: TurnEvent,
  rng: Rng,
): Result<TurnSnapshot, ...>;

// lib/use-turn.ts becomes a thin React wrapper around useReducer.
```

**Win:** `turnReducer` becomes property-testable, mutation-testable, and reusable by the multiplayer flow once the game UI lands. The hook keeps its existing API so call sites (`PlayScreen`) need no changes.

**Filing as a sub-ticket.**

---

## Candidate 2 — `lib/presence.ts`: extract presence observable

**Files:** `lib/presence.ts:34-98`

**Why:** Branch coverage is 47%. The hook conflates Supabase channel lifecycle (subscribe / track / untrack / removeChannel) with React state (`onlinePlayerIds`, `connected`, `error`). The four channel-status branches (`SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`) are reached only via the integration test, which mocks the channel.

**Before:** `usePresence(roomId, selfId)` returns React state directly.

**After:**
```ts
// New: lib/presence-observable.ts (pure-ish — wraps Supabase but
// returns plain callbacks/snapshots, no React).
export interface PresenceSubscription {
  readonly subscribe: (
    onSnapshot: (ids: ReadonlySet<string>) => void,
    onStatus: (s: PresenceStatus) => void,
  ) => () => void; // unsubscribe
}
export function presenceSubscription(
  client: SupabaseClient,
  roomId: string,
  selfId: string,
): PresenceSubscription;

// lib/presence.ts becomes the React adapter.
```

**Win:** The status-transition logic (CHANNEL_ERROR → connected:false, etc.) becomes unit-testable without `renderHook`. Mocking is one level deeper but only the channel-shape mock is needed, not React testing-library plumbing.

**Filing as a sub-ticket.**

---

## Candidate 3 — `app/rooms/[code]/lobby/page.tsx`: extract `useLobby(code)`

**Files:** `app/rooms/[code]/lobby/page.tsx:1-182`

**Why:** Coverage of this page is **0%** (per T1a baseline). It mixes:
- Data fetching (`getSupabaseBrowserClient`, `from('rooms')`, `from('players')`).
- Local state machine (`refresh`, `beginning`, `error`).
- Side effects (the begin-game POST).
- UI rendering (`<Lobby />`).

The `Lobby` component itself is at 100% coverage. The page wrapping it is the gap. A future bug in the begin-game flow or the players-fetch error path will not be caught by any test.

**Before:** A 182-line client component with three `useState` calls and one `useEffect` doing all of the above.

**After:**
```ts
// New: lib/use-lobby.ts
export function useLobby(code: string): {
  room: RoomRow | null;
  players: readonly PlayerRow[];
  currentPlayerId: string | null;
  error: string | null;
  beginning: boolean;
  refresh: () => void;
  beginGame: () => void;
};

// app/rooms/[code]/lobby/page.tsx becomes a thin renderer.
```

**Win:** The hook is testable via `renderHook` with a mocked browser client (we already have the `in-memory-supabase` shim that T2 will produce for #88). The error-path coverage gap closes because the hook's branches become reachable.

**Filing as a sub-ticket.**

---

## Candidate 4 — `lib/supabase.ts`: typed query helper

**Files:** `lib/supabase.ts:84-200`, plus the type-alias / cast sites:
- `lib/rooms.ts:13` — `type Client = SupabaseClient` (the function-arg type alias used throughout)
- `app/api/rooms/[code]/events/route.ts:105` — `const writeClient: SupabaseClient = client`
- `app/api/rooms/[code]/start/route.ts:123` — `const serviceClient: SupabaseClient = createSupabaseServiceClient()`
- `app/api/rooms/[code]/events/route.ts:219` — also `serviceClient: SupabaseClient`

**Why:** Branch coverage 60%. The `Database` generic collapses Insert overloads to `never` for any readonly Row shape — the workaround in production code is to cast the client surface to plain `SupabaseClient` (no Database parameter) and rely on `.single<RowType>()` on reads. That cast appears in three call sites with comments referring to the same gotcha, and the repeated pattern makes it easy to forget the cast on a new route.

**Before:** Each route file aliases the typed client to plain `SupabaseClient` for writes:
```ts
const writeClient: SupabaseClient = client;
```

**After:** A `query<T>(table: string)` builder wraps the cast once. Routes call `query('game_events').insert({...})` and don't see the type collapse.

**Win:** The cast burden moves from N call sites to 1. The 60% branch coverage on `lib/supabase.ts` likely improves once `query()` is exercised by every route. Adding a new route doesn't require knowing the gotcha.

**Filing as a sub-ticket.**

---

## Candidate 5 — `engine/setup.ts`: empty-players guard fixture coverage

**Files:** `engine/setup.ts:131-150`, `test/__tests__/fixtures.test.ts`

**Why:** Mutation pilot reported `engine/setup.ts` at 72.73% — the lowest score. The empty-players guard added in #35 (`if (!firstPlayer) throw`) is an inert branch as far as the existing fixtures go: every `makeFullGame` call passes 2..4 players, and `initializeGame` is never called directly with an empty list in any test. A future regression that broke the guard (e.g. flipped `!firstPlayer` to `firstPlayer`) would survive.

**Not a refactor — a test addition.** This one doesn't fit the "refactor for testability" frame, but the audit is the right place to surface it. **Filing as a sub-ticket** with a small scope: add a fixture/test that explicitly hits the guard.

---

## Not in this audit

**`components/game/FinalThreshold.tsx`** (298 lines, 5 hooks, ~82% line / 76% branch coverage from the T1a baseline). It's larger than the lobby page, so it merits explicit consideration. Excluded because:

1. Its coverage is already much better than the lobby page (82% vs 0%) — the `__tests__/FinalThreshold.test.tsx` suite covers most state transitions.
2. The component's complexity is intrinsic to the ritual UX (per-player reflection, card play, spark burn) — it's hard to split without making the user-facing flow harder to follow. The pure logic that could be lifted out (`resolveFinalThreshold`) already lives in `engine/endgame.ts` and is fully covered.
3. The remaining low-coverage branches are bail-out paths that are mechanically reachable from the test bed; a follow-up testing ticket (not a refactor) would be more cost-effective than a structural split.

If a future regression slips through this component, revisit; today the architecture is fine.

**`components/game/PlayScreen.tsx`** is large (301 lines, 0% coverage in T1a baseline) and has many props but is mostly UI plumbing. Splitting it would touch a lot of surface and the win is cosmetic until the multiplayer game page lands. Defer until that ticket has a concrete shape.

**`engine/turn.ts`** is already pure and well-tested (84% mutation score from T4). The remaining 16% gap is mostly noise mutants on the corruption-throw path — a property test from T7 covers the happy path. No refactor needed.

**Route handlers (`app/api/.../route.ts`)** already use a validate/authorize/dispatch split per the recent epic work (#34/#35/#81). They're testable as-is — the "0% coverage" reading is because no test hits them at the route level (they're tested via the start/events route tests). Not a refactor target.

---

## Sub-tickets filed (5)

1. **#106** — `refactor(use-turn): extract pure turnReducer` (Candidate 1)
2. **#107** — `refactor(presence): extract presence observable from React hook` (Candidate 2)
3. **#108** — `refactor(lobby): extract useLobby hook from the page component` (Candidate 3)
4. **#109** — `refactor(supabase): typed query() helper to subsume the SupabaseClient cast` (Candidate 4)
5. **#110** — `test(setup): cover the empty-players guard in initializeGame` (Candidate 5)

Candidate 5 is a test ticket, not a refactor — but small enough that filing it together keeps the picture complete. All 5 are linked to Epic #84.
