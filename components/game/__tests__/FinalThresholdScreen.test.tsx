import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { FinalThresholdScreen } from '../FinalThresholdScreen';
import { initKetherRitual } from '@/engine/kether';
import { useTurn } from '@/lib/use-turn';
import { seededRng } from '@/engine/rng';
import { makePlayer, makeState } from '@/test/fixtures';
import type { GameState, KetherRitualState } from '@/engine/types';
import type { SefirahKey } from '@/data';

/**
 * Tests for FinalThresholdScreen (K3 of #285;
 * `design/final-threshold.md` § 7.1).
 *
 * These tests mount the screen with a real `useTurn` hook so the
 * dispatched ritual methods (ketherWitnessPlay, ketherWitnessPass,
 * ketherCloseStageSpark, ketherCloseUnstageSpark, thresholdConfirm)
 * flow through the engine reducer.
 *
 * State construction notes:
 *   - `buildPreRitualState`: two players, one already at Kether (held),
 *     one still climbing. `phase !== 'kether'` so `isKetherHeld(state,
 *     held.id)` is true and the screen renders the hold view.
 *   - `buildTrialState`: both players at Kether, ritual initialised
 *     via `initKetherRitual`. SubPhase is 'witness' by default.
 *   - `buildCloseState`: same but the engine has been driven (or the
 *     ritual hand-rolled) into `subPhase === 'close'`.
 */

function buildPreRitualState(): {
  state: GameState;
  heldPlayerId: string;
  climbingPlayerId: string;
} {
  const heldPlayer = makePlayer({
    id: 'p1',
    name: 'Alex',
    position: 'kether',
    hand: [1, 2, 3],
    zodiacSign: 'aries',
  });
  const climbingPlayer = makePlayer({
    id: 'p2',
    name: 'Bea',
    position: 'tiferet',
    hand: [4, 5, 6],
    zodiacSign: 'leo',
  });
  const state = makeState({}, { players: [heldPlayer, climbingPlayer], activePlayerId: 'p1' });
  return {
    state,
    heldPlayerId: heldPlayer.id,
    climbingPlayerId: climbingPlayer.id,
  };
}

function buildTrialState(opts?: {
  hand1?: number[];
  hand2?: number[];
  illumination?: number;
  separation?: number;
  sparksHeld1?: ReadonlySet<SefirahKey>;
  sparksHeld2?: ReadonlySet<SefirahKey>;
}): GameState {
  const hand1 = opts?.hand1 ?? [10, 11];
  const hand2 = opts?.hand2 ?? [20, 21];
  const player1 = makePlayer({
    id: 'p1',
    name: 'Alex',
    position: 'kether',
    hand: hand1,
    zodiacSign: 'aries',
    ...(opts?.sparksHeld1 ? { sparksHeld: opts.sparksHeld1 } : {}),
  });
  const player2 = makePlayer({
    id: 'p2',
    name: 'Bea',
    position: 'kether',
    hand: hand2,
    zodiacSign: 'leo',
    ...(opts?.sparksHeld2 ? { sparksHeld: opts.sparksHeld2 } : {}),
  });
  const baseState = makeState(
    {},
    {
      players: [player1, player2],
      activePlayerId: 'p1',
      ...(opts?.illumination !== undefined ? { illumination: opts.illumination } : {}),
      ...(opts?.separation !== undefined ? { separation: opts.separation } : {}),
    },
  );
  // Initialise the ritual via the engine helper so we get the same
  // ritual shape the production trigger produces. p2 arrives last
  // (descending timestamp → p2 first in witness order).
  const initResult = initKetherRitual(baseState, { p1: 100, p2: 200 });
  if (!initResult.ok) {
    throw new Error(`buildTrialState: initKetherRitual rejected — ${initResult.reason.kind}`);
  }
  return initResult.value;
}

function buildCloseState(opts?: {
  sparksHeld1?: ReadonlySet<SefirahKey>;
  sparksHeld2?: ReadonlySet<SefirahKey>;
  illumination?: number;
  separation?: number;
  staged?: readonly { playerId: string; sefirah: SefirahKey }[];
}): GameState {
  // Build a witness-state, then hand-roll the ritual into 'close' for
  // the Spark staging tests. The engine's natural way to enter close
  // is "every queue is empty" — easier to assert the closure UI by
  // setting subPhase directly than to drive 4-6 `play`/`pass` actions.
  const base = buildTrialState({
    hand1: [],
    hand2: [],
    ...(opts?.illumination !== undefined ? { illumination: opts.illumination } : {}),
    ...(opts?.separation !== undefined ? { separation: opts.separation } : {}),
    ...(opts?.sparksHeld1 ? { sparksHeld1: opts.sparksHeld1 } : {}),
    ...(opts?.sparksHeld2 ? { sparksHeld2: opts.sparksHeld2 } : {}),
  });
  const baseRitual = base.ketherRitual;
  if (baseRitual === undefined) {
    throw new Error('buildCloseState: ritual missing on base state');
  }
  const ritual: KetherRitualState = {
    ...baseRitual,
    subPhase: 'close',
    stagedClosureSparks: opts?.staged ?? [],
  };
  return { ...base, ketherRitual: ritual };
}

describe('FinalThresholdScreen — pre-ritual hold view (§ 2.1)', () => {
  it('renders the hold view for a player held at Kether (phase !== kether)', () => {
    const { state, heldPlayerId } = buildPreRitualState();
    const heldPlayer = state.players.find((p) => p.id === heldPlayerId);
    if (!heldPlayer) throw new Error('heldPlayer missing');
    const { result } = renderHook(() => useTurn({ initialState: state, rng: seededRng(1) }));
    const { container } = render(
      <FinalThresholdScreen
        state={state}
        player={heldPlayer}
        turn={result.current}
        mode="hot-seat"
      />,
    );
    const screen = container.querySelector('[data-final-threshold-screen]');
    expect(screen?.getAttribute('data-sub-phase')).toBe('hold');
    expect(container.textContent).toMatch(/Waiting for the rest of the team/i);
  });

  it('renders the climbing player in the "still climbing" roster', () => {
    const { state, heldPlayerId } = buildPreRitualState();
    const heldPlayer = state.players.find((p) => p.id === heldPlayerId);
    if (!heldPlayer) throw new Error('heldPlayer missing');
    const { result } = renderHook(() => useTurn({ initialState: state, rng: seededRng(1) }));
    const { container } = render(
      <FinalThresholdScreen
        state={state}
        player={heldPlayer}
        turn={result.current}
        mode="hot-seat"
      />,
    );
    // p2 (Bea, climbing) should be in the climbing roster.
    const climbingRoster = container.querySelector('[data-roster="climbing"]');
    expect(climbingRoster?.textContent).toMatch(/Bea/);
    // p1 (Alex, held) should be in the arrived roster with a "(you)" tag.
    const arrivedRoster = container.querySelector('[data-roster="arrived"]');
    expect(arrivedRoster?.textContent).toMatch(/Alex/);
    expect(arrivedRoster?.textContent).toMatch(/\(you\)/);
  });

  it('does NOT render the hold view for the climbing player (they see normal UI)', () => {
    // The climbing player is NOT held (their position !== kether).
    // FinalThresholdScreen would ignore the gate and render hold-view
    // anyway because the screen is only mounted by PlayScreen for
    // held seats — but for safety, isKetherHeld returns false for
    // them, so the witness/close path would fire. We test that here.
    const { state, climbingPlayerId } = buildPreRitualState();
    const climbingPlayer = state.players.find((p) => p.id === climbingPlayerId);
    if (!climbingPlayer) throw new Error('climbingPlayer missing');
    const { result } = renderHook(() => useTurn({ initialState: state, rng: seededRng(1) }));
    const { container } = render(
      <FinalThresholdScreen
        state={state}
        player={climbingPlayer}
        turn={result.current}
        mode="hot-seat"
      />,
    );
    // Without `isKetherHeld` true AND `phase !== 'kether'`, the
    // defensive fallback returns hold-view too (ritual is undefined).
    // This is the "engine corruption" / "not-yet-triggered" branch.
    const screen = container.querySelector('[data-final-threshold-screen]');
    expect(screen?.getAttribute('data-sub-phase')).toBe('hold');
  });
});

describe('FinalThresholdScreen — trial sub-state', () => {
  it('renders the trial sub-state when the ritual is active', () => {
    const state = buildTrialState();
    const player = state.players.find((p) => p.id === 'p1');
    if (!player) throw new Error('player missing');
    const { result } = renderHook(() => useTurn({ initialState: state, rng: seededRng(1) }));
    const { container } = render(
      <FinalThresholdScreen state={state} player={player} turn={result.current} mode="hot-seat" />,
    );
    const screen = container.querySelector('[data-final-threshold-screen]');
    expect(screen?.getAttribute('data-sub-phase')).toBe('trial');
    expect(container.querySelector('[data-trial-panel]')).not.toBeNull();
  });

  it('shows the Resolve button to the current trial player', () => {
    // Trial order is descending by timestamp; p2 arrived last (stamp 200)
    // so p2 is the first trial player. Render for p2 — should see the Roll button.
    const state = buildTrialState();
    const trialPlayer = state.players.find((p) => p.id === 'p2');
    if (!trialPlayer) throw new Error('trialPlayer missing');
    const { result } = renderHook(() => useTurn({ initialState: state, rng: seededRng(1) }));
    const { container } = render(
      <FinalThresholdScreen
        state={state}
        player={trialPlayer}
        turn={result.current}
        mode="hot-seat"
      />,
    );
    const resolveBtn = container.querySelector('[data-action="kether-trial-resolve"]');
    expect(resolveBtn).not.toBeNull();
  });

  it('shows waiting status to non-active trial players', () => {
    // p2 is current trial player; render for p1 (waiting). p1 should NOT
    // see a Resolve button; they should see "Waiting for Bea" status.
    const state = buildTrialState();
    const inactivePlayer = state.players.find((p) => p.id === 'p1');
    if (!inactivePlayer) throw new Error('inactivePlayer missing');
    const { result } = renderHook(() => useTurn({ initialState: state, rng: seededRng(1) }));
    const { container } = render(
      <FinalThresholdScreen
        state={state}
        player={inactivePlayer}
        turn={result.current}
        mode="hot-seat"
      />,
    );
    const resolveBtn = container.querySelector('[data-action="kether-trial-resolve"]');
    expect(resolveBtn).toBeNull();
    const status = container.querySelector('[data-trial-status]');
    expect(status?.textContent).toMatch(/Waiting for Bea/);
  });

  it('clicking Roll dispatches ketherTrialResolve and advances the trial', () => {
    const state = buildTrialState();
    const trialPlayer = state.players.find((p) => p.id === 'p2');
    if (!trialPlayer) throw new Error('trialPlayer missing');
    const { result, rerender } = renderHook(() =>
      useTurn({ initialState: state, rng: seededRng(1) }),
    );
    const Wrapper = (): JSX.Element => (
      <FinalThresholdScreen
        state={result.current.state}
        player={result.current.state.players.find((p) => p.id === 'p2') ?? trialPlayer}
        turn={result.current}
        mode="hot-seat"
      />
    );
    const view = render(<Wrapper />);
    const resolveBtn = view.container.querySelector(
      '[data-action="kether-trial-resolve"]',
    ) as HTMLButtonElement | null;
    expect(resolveBtn).not.toBeNull();
    if (!resolveBtn) return;

    act(() => {
      fireEvent.click(resolveBtn);
    });
    rerender();
    view.rerender(<Wrapper />);

    // After p2 resolves, trialTurnIndex advances to 1.
    const finalState = result.current.state;
    expect(finalState.ketherRitual?.trialTurnIndex).toBe(1);
    // First challenge should have a roll and passed value.
    const c = finalState.ketherRitual?.trialChallenges[0];
    expect(c?.roll).not.toBeNull();
    expect(c?.passed).not.toBeNull();
  });

  it('renders the trial log with player names and results', () => {
    // Hand-roll a state with one resolved challenge.
    const state = buildTrialState();
    const seededRitual = state.ketherRitual;
    if (!seededRitual) throw new Error('ritual missing');
    const stateWithResult: GameState = {
      ...state,
      ketherRitual: {
        ...seededRitual,
        trialTurnIndex: 1,
        trialChallenges: [
          { sefirahKey: 'chokmah', stat: 'insight', dc: 14, roll: 15, passed: true },
          { sefirahKey: 'binah', stat: 'understanding', dc: 14, roll: null, passed: null },
        ],
      },
    };
    const player = stateWithResult.players.find((p) => p.id === 'p1');
    if (!player) throw new Error('player missing');
    const { result } = renderHook(() =>
      useTurn({ initialState: stateWithResult, rng: seededRng(1) }),
    );
    const { container } = render(
      <FinalThresholdScreen
        state={stateWithResult}
        player={player}
        turn={result.current}
        mode="hot-seat"
      />,
    );
    const log = container.querySelector('[data-trial-log]');
    expect(log?.textContent).toMatch(/Bea/); // p2's name (trialOrder[0])
    expect(log?.textContent).toMatch(/passed/i);
    const entries = container.querySelectorAll('[data-log-entry]');
    expect(entries.length).toBe(1); // only the resolved challenge
  });
});

describe('FinalThresholdScreen — close sub-state (§ 2.4)', () => {
  it('renders the close sub-state when subPhase === "close"', () => {
    const state = buildCloseState();
    const player = state.players.find((p) => p.id === 'p1');
    if (!player) throw new Error('player missing');
    const { result } = renderHook(() => useTurn({ initialState: state, rng: seededRng(1) }));
    const { container } = render(
      <FinalThresholdScreen state={state} player={player} turn={result.current} mode="hot-seat" />,
    );
    const screen = container.querySelector('[data-final-threshold-screen]');
    expect(screen?.getAttribute('data-sub-phase')).toBe('close');
    expect(container.querySelector('[data-closure-panel]')).not.toBeNull();
  });

  it('shows the projected illumination and gap', () => {
    const state = buildCloseState({
      illumination: 5,
      separation: 2,
    });
    const player = state.players.find((p) => p.id === 'p1');
    if (!player) throw new Error('player missing');
    const { result } = renderHook(() => useTurn({ initialState: state, rng: seededRng(1) }));
    const { container } = render(
      <FinalThresholdScreen state={state} player={player} turn={result.current} mode="hot-seat" />,
    );
    expect(container.querySelector('[data-closure-projected]')?.textContent).toBe('5');
    // target = separation(2) + REQUIRED_ILLUMINATION_MARGIN(5) = 7
    expect(container.querySelector('[data-closure-target]')?.textContent).toBe('7');
    expect(
      container.querySelector('[data-closure-gap-status]')?.getAttribute('data-closure-gap-status'),
    ).toBe('open');
  });

  it('clicking Stage on a held Spark dispatches ketherCloseStageSpark', () => {
    const state = buildCloseState({
      sparksHeld1: new Set(['yesod']),
      illumination: 4,
      separation: 0,
    });
    const player = state.players.find((p) => p.id === 'p1');
    if (!player) throw new Error('player missing');
    const { result, rerender } = renderHook(() =>
      useTurn({ initialState: state, rng: seededRng(1) }),
    );
    const Wrapper = (): JSX.Element => {
      const me = result.current.state.players.find((p) => p.id === 'p1') ?? player;
      return (
        <FinalThresholdScreen
          state={result.current.state}
          player={me}
          turn={result.current}
          mode="hot-seat"
        />
      );
    };
    const view = render(<Wrapper />);
    // Find the stage button for p1's yesod Spark.
    const stageBtn = view.container.querySelector(
      '[data-action="kether-close-stage-spark"][data-spark-sefirah="yesod"]',
    ) as HTMLButtonElement | null;
    expect(stageBtn).not.toBeNull();
    if (!stageBtn) return;

    act(() => {
      fireEvent.click(stageBtn);
    });
    rerender();
    view.rerender(<Wrapper />);

    // Engine state: stagedClosureSparks now has the entry; projected
    // illumination bumped by 1.
    expect(result.current.state.ketherRitual?.stagedClosureSparks).toEqual([
      { playerId: 'p1', sefirah: 'yesod' },
    ]);
    expect(view.container.querySelector('[data-closure-projected]')?.textContent).toBe('5'); // 4 + 1 staged
  });

  it('clicking Confirm dispatches thresholdConfirm and locks the closure', () => {
    const state = buildCloseState({
      illumination: 5,
      separation: 0,
    });
    const player = state.players.find((p) => p.id === 'p1');
    if (!player) throw new Error('player missing');
    const { result, rerender } = renderHook(() =>
      useTurn({ initialState: state, rng: seededRng(1) }),
    );
    const Wrapper = (): JSX.Element => {
      const me = result.current.state.players.find((p) => p.id === 'p1') ?? player;
      return (
        <FinalThresholdScreen
          state={result.current.state}
          player={me}
          turn={result.current}
          mode="hot-seat"
        />
      );
    };
    const view = render(<Wrapper />);
    const confirmBtn = view.container.querySelector(
      '[data-action="threshold-confirm"]',
    ) as HTMLButtonElement | null;
    expect(confirmBtn).not.toBeNull();
    if (!confirmBtn) return;

    act(() => {
      fireEvent.click(confirmBtn);
    });
    rerender();
    view.rerender(<Wrapper />);

    // After confirm: phase exits to 'end', closureLocked is true, the
    // engine has computed win/lose via checkEndgame against the final
    // state. The screen no longer renders 'kether' (PlayScreen would
    // route away), but if rendered against the final state it falls
    // through to hold-view (defensive fallback).
    expect(result.current.state.phase).toBe('end');
    expect(result.current.state.ketherRitual?.closureLocked).toBe(true);
  });

  it('disables Confirm once closureLocked', () => {
    const baseState = buildCloseState({});
    const baseRitual = baseState.ketherRitual;
    if (baseRitual === undefined) {
      throw new Error('disables Confirm: ritual missing on base state');
    }
    const lockedRitualState: GameState = {
      ...baseState,
      ketherRitual: { ...baseRitual, closureLocked: true },
    };
    const player = lockedRitualState.players.find((p) => p.id === 'p1');
    if (!player) throw new Error('player missing');
    const { result } = renderHook(() =>
      useTurn({ initialState: lockedRitualState, rng: seededRng(1) }),
    );
    const { container } = render(
      <FinalThresholdScreen
        state={lockedRitualState}
        player={player}
        turn={result.current}
        mode="hot-seat"
      />,
    );
    const confirmBtn = container.querySelector(
      '[data-action="threshold-confirm"]',
    ) as HTMLButtonElement | null;
    expect(confirmBtn?.disabled).toBe(true);
  });
});

describe('FinalThresholdScreen — defensive guards', () => {
  it('falls back to the hold view when phase === "kether" but ritual is undefined', () => {
    // Engine-corruption / race-window guard: the trigger flips phase
    // atomically with ritual init, but if a multiplayer wire push
    // arrives between the two flips, the renderer should not blank.
    // The component's guard at line 107-116 covers this — pin it.
    const trialState = buildTrialState();
    const stateAtCorruption: GameState = {
      ...trialState,
      ketherRitual: undefined,
    };
    const player = stateAtCorruption.players.find((p) => p.id === 'p1');
    if (!player) throw new Error('player missing');
    const { result } = renderHook(() =>
      useTurn({ initialState: stateAtCorruption, rng: seededRng(1) }),
    );
    const { container } = render(
      <FinalThresholdScreen
        state={stateAtCorruption}
        player={player}
        turn={result.current}
        mode="hot-seat"
      />,
    );
    const screen = container.querySelector('[data-final-threshold-screen]');
    expect(screen?.getAttribute('data-sub-phase')).toBe('hold');
  });

  it('falls back to the trial UI if rendered with subPhase === "gather"', () => {
    // K1 transitions atomically through gather → trial on init, so
    // subPhase==='gather' should never appear in production. The
    // fallback is defensive — surface this is the trial UI so a
    // stale snapshot doesn't blank the screen.
    const trialState = buildTrialState();
    const baseRitual = trialState.ketherRitual;
    if (!baseRitual) throw new Error('ritual missing');
    const stateAtGather: GameState = {
      ...trialState,
      ketherRitual: { ...baseRitual, subPhase: 'gather' },
    };
    const player = stateAtGather.players.find((p) => p.id === 'p1');
    if (!player) throw new Error('player missing');
    const { result } = renderHook(() =>
      useTurn({ initialState: stateAtGather, rng: seededRng(1) }),
    );
    const { container } = render(
      <FinalThresholdScreen
        state={stateAtGather}
        player={player}
        turn={result.current}
        mode="hot-seat"
      />,
    );
    const screen = container.querySelector('[data-final-threshold-screen]');
    // Component falls back to 'trial' when ritual.subPhase is anything
    // other than 'close'. The data attribute reflects the rendered
    // panel, not the ritual's raw value.
    expect(screen?.getAttribute('data-sub-phase')).toBe('trial');
    expect(container.querySelector('[data-trial-panel]')).not.toBeNull();
  });
});

describe('FinalThresholdScreen — mode flag', () => {
  it('surfaces mode="hot-seat" as a data attribute', () => {
    const state = buildTrialState();
    const player = state.players.find((p) => p.id === 'p1');
    if (!player) throw new Error('player missing');
    const { result } = renderHook(() => useTurn({ initialState: state, rng: seededRng(1) }));
    const { container } = render(
      <FinalThresholdScreen state={state} player={player} turn={result.current} mode="hot-seat" />,
    );
    expect(
      container.querySelector('[data-final-threshold-screen]')?.getAttribute('data-mode'),
    ).toBe('hot-seat');
  });

  it('surfaces mode="multiplayer" as a data attribute', () => {
    const state = buildTrialState();
    const player = state.players.find((p) => p.id === 'p1');
    if (!player) throw new Error('player missing');
    const { result } = renderHook(() =>
      useTurn({
        initialState: state,
        rng: seededRng(1),
        dispatchClientAction: () => undefined,
        selfPlayerId: 'p1',
      }),
    );
    const { container } = render(
      <FinalThresholdScreen
        state={state}
        player={player}
        turn={result.current}
        mode="multiplayer"
      />,
    );
    expect(
      container.querySelector('[data-final-threshold-screen]')?.getAttribute('data-mode'),
    ).toBe('multiplayer');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Solo coda — abbreviated single-voice variant (#277)
// ──────────────────────────────────────────────────────────────────────────────

function buildSoloTrialState(): GameState {
  const player = makePlayer({
    id: 'p1',
    name: 'Alex',
    position: 'kether',
    hand: [10, 11],
    zodiacSign: 'aries',
  });
  const baseState = makeState({}, { players: [player], activePlayerId: 'p1' });
  const initResult = initKetherRitual(baseState, { p1: 100 });
  if (!initResult.ok) {
    throw new Error(`buildSoloTrialState: initKetherRitual failed — ${initResult.reason.kind}`);
  }
  return initResult.value;
}

describe('FinalThresholdScreen — solo coda (§ 2.2 / #277)', () => {
  it('renders data-coda-mode="solo" when players.length === 1', () => {
    const state = buildSoloTrialState();
    const player = state.players.find((p) => p.id === 'p1');
    if (!player) throw new Error('solo coda test: p1 not in state');
    const { result } = renderHook(() =>
      useTurn({
        initialState: state,
        rng: seededRng(1),
        dispatchClientAction: () => undefined,
        selfPlayerId: 'p1',
      }),
    );
    const { container } = render(
      <FinalThresholdScreen state={state} player={player} turn={result.current} mode="hot-seat" />,
    );
    expect(container.querySelector('[data-trial-panel]')?.getAttribute('data-coda-mode')).toBe(
      'solo',
    );
  });

  it('does not render the trial-order ribbon (chorus UI) when players.length === 1', () => {
    const state = buildSoloTrialState();
    const player = state.players.find((p) => p.id === 'p1');
    if (!player) throw new Error('solo coda test: p1 not in state');
    const { result } = renderHook(() =>
      useTurn({
        initialState: state,
        rng: seededRng(1),
        dispatchClientAction: () => undefined,
        selfPlayerId: 'p1',
      }),
    );
    const { container } = render(
      <FinalThresholdScreen state={state} player={player} turn={result.current} mode="hot-seat" />,
    );
    expect(container.querySelector('[data-trial-order]')).toBeNull();
  });

  it('renders the Roll button for the solo player (their turn is always active)', () => {
    const state = buildSoloTrialState();
    const player = state.players.find((p) => p.id === 'p1');
    if (!player) throw new Error('solo coda test: p1 not in state');
    const { result } = renderHook(() =>
      useTurn({
        initialState: state,
        rng: seededRng(1),
        dispatchClientAction: () => undefined,
        selfPlayerId: 'p1',
      }),
    );
    const { container } = render(
      <FinalThresholdScreen state={state} player={player} turn={result.current} mode="hot-seat" />,
    );
    const rollBtn = container.querySelector('[data-action="kether-trial-resolve"]');
    expect(rollBtn).not.toBeNull();
  });
});
