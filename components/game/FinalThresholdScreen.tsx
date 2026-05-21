'use client';
import { useMemo } from 'react';
import { arcanumByNumber, sefirahByKey, zodiacSigns } from '@/data';
import type { SefirahKey } from '@/data';
import { REQUIRED_ILLUMINATION_MARGIN } from '@/engine/endgame';
import { isKetherHeld } from '@/engine/kether';
import type { GameState, KetherSubPhase, PlayerState } from '@/engine/types';
import type { UseTurnReturn } from '@/lib/use-turn';

/**
 * FinalThresholdScreen — K3 of #285 (`design/final-threshold.md` § 7.1).
 *
 * Replaces `EncounterScreen` for `phase === 'kether'` (the team-level
 * Final Threshold ritual). Three sub-states render based on
 * `state.ketherRitual.subPhase`:
 *
 *   witness — round-robin card-and-sentence ritual. Active witness sees
 *             Play / Pass affordances on each held card; non-witnesses
 *             see a read-only view + "Waiting for [name]" status. The
 *             gather sub-phase is non-durable per K1 — it transitions to
 *             witness atomically — but the component falls back to the
 *             witness UI defensively if the ritual is somehow rendered
 *             mid-gather.
 *   close   — closure window. Each player can stage / unstage Sparks
 *             for +1 Illumination each (consumed at confirm).
 *             Confirm-closure button is single-press, any-player
 *             (first-confirm-wins per § 2.4 / S-7).
 *
 * A separate **pre-ritual hold view** (per § 2.1) renders to a player
 * who has reached Kether but the rest of the team has not. The
 * player's seat is held: skipped in turn rotation, hand frozen, no
 * actions legal. Driven by `engine/kether.ts:isKetherHeld(state, id)`.
 *
 * Per § 4.1 Kether is a Shell-free zone — `PlayScreen` already gates
 * the shell-panel render on `phase !== 'kether'`. This component does
 * not reach into the shell layer.
 *
 * Per the ticket § "Out of scope": Kether is its own visual register;
 * #315's per-Sefirah dramatic frame is for the 8 individual encounters.
 * The component uses a Kether-toned (white / amber / glow-kether)
 * visual treatment instead.
 *
 * a11y:
 *   - "It's [name]'s turn" announcements via `aria-live="polite"`.
 *   - Witness log appends and closure-window state changes use polite
 *     live regions so screen readers receive the updates without
 *     interrupting the player's narration.
 *   - All affordances are native `<button>`.
 */

interface FinalThresholdScreenProps {
  readonly state: GameState;
  /**
   * The seat / player this surface is rendered for. Hot-seat: this is
   * the active seat (the human currently at the keyboard). Multiplayer:
   * this is the local client's player — different clients render
   * different views simultaneously (the active witness sees Play/Pass;
   * non-witnesses see Waiting).
   */
  readonly player: PlayerState;
  /**
   * `useTurn` adapter — exposes the K4 ritual methods. The component
   * dispatches via `turn.ketherWitnessPlay`, `ketherWitnessPass`,
   * `ketherCloseStageSpark`, `ketherCloseUnstageSpark`,
   * `thresholdConfirm`. Read-only consumers (non-witnesses, observers)
   * never invoke them; the gating is by `currentWitnessPlayerId`.
   */
  readonly turn: UseTurnReturn;
  /**
   * Hot-seat vs. multiplayer mode. The component itself doesn't dispatch
   * any wire events directly — the `turn` adapter routes to either the
   * local engine (hot-seat) or the wire layer (multiplayer). The mode
   * field is surfaced as a `data-` attribute for snapshot tests and
   * future divergent rendering (e.g. host-skip affordance — multiplayer
   * only; not in this MVP scope).
   */
  readonly mode: 'hot-seat' | 'multiplayer';
  readonly className?: string;
}

export function FinalThresholdScreen(props: FinalThresholdScreenProps): JSX.Element {
  const { state, player, turn, mode, className } = props;

  // Pre-ritual hold view: player at Kether, ritual hasn't started.
  // Rendered to held players while the rest of the team finishes
  // climbing. Held seats are skipped in turn rotation (per K1's
  // `endTurn` reducer); the UI surface is just a status read-out.
  if (isKetherHeld(state, player.id)) {
    return (
      <PreRitualHoldView
        state={state}
        player={player}
        mode={mode}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  // Defensive: if this screen is rendered without the ritual state
  // populated (e.g. the orchestrator calls us before the K1 trigger
  // hook has fired), fall back to the hold view. Once the trigger
  // lands the ritual state appears and the proper sub-state renders
  // on the next snapshot.
  const ritual = state.ketherRitual;
  if (state.phase !== 'kether' || ritual === undefined) {
    return (
      <PreRitualHoldView
        state={state}
        player={player}
        mode={mode}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  // Per K1 § 5.1, `subPhase: 'gather'` is non-durable — the ritual
  // initialiser flips straight to `'witness'`. Treat any sighting as a
  // witness fallback so a stale snapshot doesn't blank the screen.
  const subPhase: Exclude<KetherSubPhase, 'gather'> =
    ritual.subPhase === 'close' ? 'close' : 'witness';

  return (
    <section
      data-final-threshold-screen
      data-sub-phase={subPhase}
      data-mode={mode}
      aria-label="Final Threshold ritual"
      className={`relative mx-auto max-w-3xl rounded-lg border border-illumination/40 bg-ground/80 p-6 text-veil shadow-glow-kether${className ? ` ${className}` : ''}`}
    >
      <header className="mb-6 text-center">
        <h2 className="font-display text-3xl tracking-widest">The Final Threshold</h2>
        <p className="mt-2 italic opacity-80">The team becomes the avatar. The chorus begins.</p>
      </header>

      {subPhase === 'witness' ? (
        <WitnessPanel state={state} player={player} turn={turn} />
      ) : (
        <ClosurePanel state={state} player={player} turn={turn} />
      )}
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Pre-ritual hold view (§ 2.1)
// ────────────────────────────────────────────────────────────────────

interface PreRitualHoldViewProps {
  readonly state: GameState;
  readonly player: PlayerState;
  readonly mode: 'hot-seat' | 'multiplayer';
  readonly className?: string;
}

function PreRitualHoldView(props: PreRitualHoldViewProps): JSX.Element {
  const { state, player, mode, className } = props;
  const arrived = state.players.filter((p) => p.position === 'kether');
  const stillClimbing = state.players.filter((p) => p.position !== 'kether');

  return (
    <section
      data-final-threshold-screen
      data-sub-phase="hold"
      data-mode={mode}
      aria-label="Waiting at the Crown"
      className={`relative mx-auto max-w-3xl rounded-lg border border-illumination/30 bg-ground/80 p-6 text-veil shadow-glow-kether${className ? ` ${className}` : ''}`}
    >
      <header className="mb-4 text-center">
        <h2 className="font-display text-3xl tracking-widest">You stand at the Crown</h2>
        <p role="status" aria-live="polite" className="mt-2 italic opacity-80">
          Waiting for the rest of the team to arrive.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div
          data-roster="arrived"
          className="rounded border border-illumination/40 bg-ground/40 p-3"
        >
          <h3 className="text-xs uppercase tracking-widest opacity-60">
            At Kether ({arrived.length})
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {arrived.map((p) => (
              <li
                key={p.id}
                data-player={p.id}
                data-roster-status="arrived"
                className="flex items-center gap-2"
              >
                <PlayerGlyph player={p} />
                <span className="font-display tracking-widest">
                  {p.name}
                  {p.id === player.id ? ' (you)' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div data-roster="climbing" className="rounded border border-veil/30 bg-ground/40 p-3">
          <h3 className="text-xs uppercase tracking-widest opacity-60">
            Still climbing ({stillClimbing.length})
          </h3>
          {stillClimbing.length === 0 ? (
            <p className="mt-2 text-xs italic opacity-50">
              The team is whole. The ritual is about to begin.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {stillClimbing.map((p) => (
                <li
                  key={p.id}
                  data-player={p.id}
                  data-roster-status="climbing"
                  className="flex items-center gap-2 opacity-70"
                >
                  <PlayerGlyph player={p} />
                  <span className="font-display tracking-widest">{p.name}</span>
                  <span className="text-xs opacity-60">{sefirahByKey(p.position).englishName}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs italic opacity-60">
        Your hand is held; you cannot move, draw, or meditate. The ritual begins when the last
        player arrives.
      </p>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Witness sub-state (§ 2.3)
// ────────────────────────────────────────────────────────────────────

interface WitnessPanelProps {
  readonly state: GameState;
  readonly player: PlayerState;
  readonly turn: UseTurnReturn;
}

function WitnessPanel(props: WitnessPanelProps): JSX.Element {
  const { state, player, turn } = props;
  const ritual = state.ketherRitual;
  // Type narrowing: `WitnessPanel` is only rendered from inside the
  // `phase === 'kether'` branch above where `ritual` is asserted
  // non-undefined. Re-assert for the inner closures to keep TS happy
  // without re-running the guard at every read site.
  if (ritual === undefined) {
    throw new Error(
      'WitnessPanel: state.ketherRitual is undefined inside phase==="kether"; engine corruption',
    );
  }

  const currentWitnessId = turn.currentWitnessPlayerId;
  const isMyTurn = currentWitnessId === player.id;
  const currentWitness = useMemo(
    () => state.players.find((p) => p.id === currentWitnessId),
    [state.players, currentWitnessId],
  );

  const playersById = useMemo(() => {
    const map = new Map<string, PlayerState>();
    for (const p of state.players) map.set(p.id, p);
    return map;
  }, [state.players]);

  const witnessOrder = ritual.witnessOrder;
  const witnessTurnIndex = ritual.witnessTurnIndex;
  const witnessLog = ritual.witnessLog;

  return (
    <div data-witness-panel className="space-y-6">
      {/*
        Round-robin order ribbon. Each player's seat is ringed in their
        zodiac glyph; the active witness gets a Kether-glow ring so
        "whose voice now" reads at a glance. Mounted in every render so
        an a11y user can tab through and hear the order.
      */}
      <div
        data-witness-order
        role="list"
        aria-label="Witness order (last-arrived first)"
        className="flex flex-wrap justify-center gap-3"
      >
        {witnessOrder.map((id, idx) => {
          const p = playersById.get(id);
          if (!p) return null;
          const isCurrent = idx === witnessTurnIndex;
          const queueLen = p.hand.length;
          return (
            <div
              key={id}
              role="listitem"
              data-witness-seat={id}
              data-witness-active={isCurrent ? 'true' : 'false'}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 ${
                isCurrent ? 'border-illumination shadow-glow-kether' : 'border-veil/30'
              }`}
            >
              <PlayerGlyph player={p} />
              <span className="font-display text-sm tracking-widest">{p.name}</span>
              <span className="text-xs opacity-60">
                {queueLen} card{queueLen === 1 ? '' : 's'}
              </span>
            </div>
          );
        })}
      </div>

      {/*
        Whose-turn live region. `aria-live="polite"` so screen readers
        receive each rotation announcement without interrupting an
        in-flight narration. Renders as muted body copy visually so
        sighted players see the same info inline.
      */}
      <div
        data-witness-status
        role="status"
        aria-live="polite"
        className="text-center font-display text-sm uppercase tracking-widest opacity-80"
      >
        {isMyTurn
          ? 'Your turn — play or pass.'
          : currentWitness
            ? `Waiting for ${currentWitness.name} to play or pass.`
            : 'The witness round-robin has ended.'}
      </div>

      {/*
        Player's own queue. Active witness sees Play / Pass; non-active
        sees a read-only list of held arcana. Other players' queues are
        face-down to mirror multiplayer privacy at the chassis layer.
        (Per § 2.2, hands ARE revealed at gather time — the K3 ticket's
        scope leaves the multi-hand reveal to the renderer; we surface
        own-hand fully and leave others' counts visible without arcana.)
      */}
      <div data-witness-queue className="rounded border border-illumination/30 bg-ground/40 p-4">
        <header className="mb-3 flex items-baseline justify-between">
          <h3 className="font-display tracking-widest">Your witness queue</h3>
          <span className="text-xs uppercase tracking-widest opacity-60">
            {player.hand.length} card{player.hand.length === 1 ? '' : 's'}
          </span>
        </header>
        {player.hand.length === 0 ? (
          <p className="text-xs italic opacity-60">
            Your queue is empty. The round-robin will skip you until close.
          </p>
        ) : (
          <ul role="list" className="flex flex-wrap gap-2">
            {player.hand.map((arcanum) => {
              const arc = arcanumByNumber(arcanum);
              return (
                <li
                  key={arcanum}
                  data-witness-card={arcanum}
                  className="flex items-center gap-2 rounded border border-veil/30 bg-ground/60 px-3 py-2"
                >
                  <span className="font-display text-sm">{arc.name}</span>
                  {isMyTurn ? (
                    <button
                      type="button"
                      onClick={() => turn.ketherWitnessPlay(arcanum)}
                      data-action="kether-witness-play"
                      data-arcanum={arcanum}
                      aria-label={`Play ${arc.name}`}
                      className="rounded border border-illumination/60 bg-illumination/10 px-2 py-1 text-xs text-illumination hover:bg-illumination/20"
                    >
                      Play
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {isMyTurn && player.hand.length > 0 ? (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => turn.ketherWitnessPass()}
              data-action="kether-witness-pass"
              className="rounded border border-pillar-severity/60 px-3 py-1 text-xs text-pillar-severity hover:bg-pillar-severity/10"
            >
              Pass turn (+1 Separation)
            </button>
          </div>
        ) : null}
      </div>

      {/*
        Witness log scroll. One entry per recorded step (played / passed)
        in chronological order. `aria-live="polite"` so screen readers
        receive the latest entry as a status update. Empty state shows
        a hint copy so the panel isn't a blank box pre-first-step.
      */}
      <div
        data-witness-log
        role="log"
        aria-live="polite"
        aria-label="Witness ritual log"
        className="rounded border border-veil/20 bg-ground/40 p-4"
      >
        <h3 className="text-xs uppercase tracking-widest opacity-60">The chorus so far</h3>
        {witnessLog.length === 0 ? (
          <p className="mt-2 text-xs italic opacity-50">
            No voices yet. The first witness opens the ritual.
          </p>
        ) : (
          <ol className="mt-2 space-y-1 text-sm">
            {witnessLog.map((entry, idx) => {
              const p = playersById.get(entry.playerId);
              const name = p?.name ?? entry.playerId;
              return (
                <li
                  key={`${entry.playerId}-${idx}`}
                  data-log-entry={entry.kind}
                  data-log-player={entry.playerId}
                  className="flex items-baseline gap-2"
                >
                  <span className="font-display tracking-widest">{name}</span>
                  {entry.kind === 'played' ? (
                    <>
                      <span className="opacity-60">spoke through</span>
                      <span className="font-display">{arcanumByNumber(entry.arcanum).name}</span>
                    </>
                  ) : (
                    <span className="italic opacity-60">passed (+1 Separation)</span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Closure sub-state (§ 2.4)
// ────────────────────────────────────────────────────────────────────

interface ClosurePanelProps {
  readonly state: GameState;
  readonly player: PlayerState;
  readonly turn: UseTurnReturn;
}

function ClosurePanel(props: ClosurePanelProps): JSX.Element {
  const { state, player, turn } = props;
  const ritual = state.ketherRitual;
  if (ritual === undefined) {
    throw new Error(
      'ClosurePanel: state.ketherRitual is undefined inside phase==="kether"; engine corruption',
    );
  }

  const stagedSparks = ritual.stagedClosureSparks;
  const closureLocked = ritual.closureLocked;
  const stagedCount = stagedSparks.length;
  // Each staged Spark contributes +1 Illumination at confirm time
  // (§ 2.4); compute the projected gap so the player sees the team's
  // standing before pressing Confirm.
  const projectedIllumination = state.illumination + stagedCount;
  const target = state.separation + REQUIRED_ILLUMINATION_MARGIN;
  const projectedGap = target - projectedIllumination;
  const wouldClear = projectedGap <= 0;

  // Derive: which of MY sparks are staged?
  const myStaged = useMemo(
    () => new Set(stagedSparks.filter((s) => s.playerId === player.id).map((s) => s.sefirah)),
    [stagedSparks, player.id],
  );

  return (
    <div data-closure-panel className="space-y-6">
      <div
        data-closure-status
        role="status"
        aria-live="polite"
        className="rounded border border-illumination/40 bg-ground/40 p-4 text-center"
      >
        <p className="text-xs uppercase tracking-widest opacity-70">
          The witness round is over. The closure window is open.
        </p>
        <p className="mt-2 font-display text-2xl tabular-nums">
          <span data-closure-projected>{projectedIllumination}</span>
          <span className="opacity-50"> / </span>
          <span data-closure-target>{target}</span>
        </p>
        <p className="mt-1 text-xs opacity-70">
          Illumination after staged Sparks vs. target (Separation + {REQUIRED_ILLUMINATION_MARGIN}).{' '}
          {wouldClear ? (
            <span data-closure-gap-status="closed" className="text-illumination">
              Threshold cleared.
            </span>
          ) : (
            <span data-closure-gap-status="open">{projectedGap} more needed.</span>
          )}
        </p>
        {stagedCount > 0 ? (
          <p data-closure-staged-count className="mt-1 text-xs italic opacity-60">
            {stagedCount} Spark{stagedCount === 1 ? '' : 's'} staged.
          </p>
        ) : null}
      </div>

      {/*
        Per-player Spark stage panel. Each player's held Sparks render
        as togglable buttons; clicking stages or un-stages. Locked once
        `closureLocked` flips (post-confirm).
      */}
      <ol role="list" className="space-y-3">
        {state.players.map((p) => {
          const isMe = p.id === player.id;
          const sparks = Array.from(p.sparksHeld);
          return (
            <li
              key={p.id}
              data-closure-player={p.id}
              className="rounded border border-veil/30 bg-ground/40 p-3"
            >
              <header className="flex items-baseline justify-between">
                <h3 className="font-display tracking-widest">
                  <PlayerGlyph player={p} />{' '}
                  <span className="ml-1">
                    {p.name}
                    {isMe ? ' (you)' : ''}
                  </span>
                </h3>
                <span className="text-xs uppercase tracking-widest opacity-60">
                  {sparks.length} Spark{sparks.length === 1 ? '' : 's'}
                </span>
              </header>
              {sparks.length === 0 ? (
                <p className="mt-2 text-xs italic opacity-50">No Sparks held.</p>
              ) : (
                <ul role="list" className="mt-2 flex flex-wrap gap-2">
                  {sparks.map((sefirah) => {
                    const staged =
                      isMe && myStaged.has(sefirah)
                        ? true
                        : stagedSparks.some((s) => s.playerId === p.id && s.sefirah === sefirah);
                    const sefirahData = sefirahByKey(sefirah);
                    return (
                      <li key={sefirah}>
                        <button
                          type="button"
                          onClick={() => {
                            if (closureLocked) return;
                            if (staged) {
                              turn.ketherCloseUnstageSpark(p.id, sefirah);
                            } else {
                              turn.ketherCloseStageSpark(p.id, sefirah);
                            }
                          }}
                          disabled={closureLocked || (!isMe && !staged)}
                          aria-pressed={staged}
                          data-action={
                            staged ? 'kether-close-unstage-spark' : 'kether-close-stage-spark'
                          }
                          data-spark-player={p.id}
                          data-spark-sefirah={sefirah}
                          data-spark-staged={staged ? 'true' : 'false'}
                          className={`rounded border px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                            staged
                              ? 'border-illumination bg-illumination/15 text-illumination'
                              : 'border-veil/40 hover:border-illumination'
                          }`}
                        >
                          {staged ? 'Staged: ' : 'Stage '}
                          {sefirahData.englishName} {staged ? '(+1)' : ''}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      {/*
        Confirm closure. Single button, any-player (per § 2.4 first-
        confirm-wins). Disabled once `closureLocked` flips so a stale
        UI can't double-confirm; the engine rejects the second confirm
        regardless, but disabling makes the contract visible.
      */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => turn.thresholdConfirm()}
          disabled={closureLocked}
          data-action="threshold-confirm"
          className="rounded bg-illumination px-6 py-3 font-display tracking-widest text-ground shadow-glow-kether disabled:cursor-not-allowed disabled:opacity-40"
        >
          {closureLocked ? 'Closure confirmed' : 'Confirm closure'}
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

interface PlayerGlyphProps {
  readonly player: PlayerState;
}

function PlayerGlyph({ player }: PlayerGlyphProps): JSX.Element {
  const sign = zodiacSigns.find((s) => s.key === player.zodiacSign);
  return (
    <span
      aria-hidden
      data-player-glyph={player.id}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-veil/40 text-sm"
    >
      {sign?.glyph ?? '?'}
    </span>
  );
}

// Re-export the SefirahKey type so callers (tests, demos) can import
// the closure-panel types without reaching into `@/data` directly.
export type { SefirahKey };
