# 296 — regular card gifting UI

## Push 1 — 2026-06-05

Engine layer: 3 new `TurnEvent` variants (`gift-turn`, `gift-turn-accept-over-cap`,
`refuse-gift-turn`) + 5 new `TurnReducerError` variants + reducer cases in
`lib/turn-machine.ts`. Tests committed first (11 new tests in 3 `describe` blocks
on `lib/__tests__/turn-machine.test.ts`).

Key decisions:
- `HAND_CAP = 5` from `engine/setup.ts` is authoritative; design doc says 6 but
  the engine constant wins.
- Existing `gift-card` PrepModifier is Chesed-encounter-only. Regular-turn gifting
  uses new event kinds to avoid conflating the two flows.
- `gift-turn` rejects with `gift-recipient-at-cap` when recipient hand ≥ HAND_CAP;
  the UI picks up from there with `gift-turn-accept-over-cap` or `refuse-gift-turn`.

## Push 2 — 2026-06-05

UI layer: `GiftModal` component (4-step: pick-card → pick-recipient → over-cap →
refuse-warning), Gift button in `PlayScreen` action bar, three `useTurn` wrappers
(`giftTurn`, `giftTurnAcceptOverCap`, `refuseGiftTurn`).

- Gift button visible in `phase === 'move'` when `players.length > 1 && isMyTurn`.
- Disabled when Hoarding shell active (`isHoardingActive(turn.state)`) or giver has
  no cards.
- Over-cap flow shows recipient's hand for discard selection; refuse shows +1
  Separation warning before confirming.
- All four `GiftStep` kinds gate navigation cleanly; Back from refuse-warning returns
  to over-cap (not a new modal open).
- typecheck + lint + test (3412) + format:check all green before push.
