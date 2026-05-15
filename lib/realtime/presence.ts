import type { SupabaseClient } from '@supabase/supabase-js';
import { sefirot } from '@/data';
import type { SefirahKey } from '@/data';

/**
 * Ephemeral peer-presence layer for #322 — Figma-style multiplayer
 * presence (cursors, targeted-node rings, action toasts). Lives on a
 * dedicated `peer-presence:{roomId}` Supabase Realtime channel using
 * **broadcast** events so the bytes never touch Postgres. The
 * authoritative roster (`presence-observable.ts`) is unchanged; this
 * module owns only the visual / chrome-level signal.
 *
 * Wire format (all events ride `channel.send({ type:'broadcast', ... })`):
 *
 *   - `cursor` — `{ playerId, x, y, viewport: { w, h }, ts }`. `x`/`y`
 *     are normalised to `[0, 1]` against `viewport`; the receiver
 *     scales back into its own viewport so peers on a phone and a
 *     desktop see the cursor at proportionally the same screen
 *     position. `ts` is the sender's `Date.now()` — used by the
 *     receiver for stale-cursor expiry only, no clock-sync magic.
 *
 *   - `target` — `{ playerId, nodeId, ts }`. `nodeId` is a
 *     `SefirahKey` or `null` (peer cleared focus). Receivers render
 *     the targeted-node ring on the Tree.
 *
 *   - `action` — `{ playerId, kind, ts }`. `kind` is one of a small
 *     whitelist (`'choosing-card' | 'rolling' | 'targeting' | null`)
 *     so a toast can surface "Brae is choosing a card…" without
 *     plumbing arbitrary copy through Realtime. Senders set `null`
 *     to clear.
 *
 * **Defence in depth on payload shape.** Every parser strips down to
 * the documented fields before forwarding. The acceptance criterion
 * "no payload fields beyond the spec (no PII leak)" means a buggy
 * sender that piggybacks a `sessionToken` or an `email` field onto a
 * cursor event MUST NOT have that field reach the rendered UI / a
 * subscriber's analytics pipe. Parsing returns either a fresh object
 * with exactly the documented keys, or `null` (and is dropped).
 *
 * The React adapter (`usePeerPresence`) lives in `./use-peer-presence.ts`.
 */

// ---------------------------------------------------------------------------
// Wire types
// ---------------------------------------------------------------------------

/**
 * `pointerType` mirrors the W3C `PointerEvent.pointerType` value at
 * the sender's last input event. The receiver uses it to decide
 * whether to render a persistent cursor (mouse / pen) or a tap
 * ripple (touch). Undefined for backwards-compat with senders that
 * predate the field; receiver falls back to the viewport-width
 * heuristic.
 */
export type PeerPointerType = 'mouse' | 'pen' | 'touch';

export interface PeerCursorEvent {
  readonly playerId: string;
  readonly x: number;
  readonly y: number;
  readonly viewport: { readonly w: number; readonly h: number };
  readonly pointerType?: PeerPointerType;
  readonly ts: number;
}

export interface PeerTargetEvent {
  readonly playerId: string;
  readonly nodeId: SefirahKey | null;
  readonly ts: number;
}

export type PeerActionKind = 'choosing-card' | 'rolling' | 'targeting';

export interface PeerActionEvent {
  readonly playerId: string;
  readonly kind: PeerActionKind | null;
  readonly ts: number;
}

export type PeerPresenceStatus = 'connected' | 'error' | 'closed' | 'timed-out';

// ---------------------------------------------------------------------------
// Parsers — defence-in-depth wire-format validation.
//
// We accept the `unknown` payload Supabase hands us, validate every
// field, and return either a fresh canonical-shape object or `null`.
// Returning a fresh object (rather than the input narrowed via type
// guards) is the PII-strip mechanism: extra fields the sender slipped
// in cannot ride through.
// ---------------------------------------------------------------------------

const SEFIRAH_KEYS = new Set<string>(sefirot.map((s) => s.key));

const ACTION_KINDS: ReadonlySet<PeerActionKind> = new Set<PeerActionKind>([
  'choosing-card',
  'rolling',
  'targeting',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const POINTER_TYPES: ReadonlySet<PeerPointerType> = new Set<PeerPointerType>([
  'mouse',
  'pen',
  'touch',
]);

export function parseCursorEvent(input: unknown): PeerCursorEvent | null {
  if (!isRecord(input)) return null;
  const { playerId, x, y, viewport, pointerType, ts } = input;
  if (typeof playerId !== 'string' || playerId.length === 0) return null;
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  if (typeof y !== 'number' || !Number.isFinite(y)) return null;
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return null;
  // Coordinates are normalised — anything outside [0, 1] is suspect
  // and we drop it rather than render off-screen / arbitrary cursor
  // positions.
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  if (!isRecord(viewport)) return null;
  const w = viewport.w;
  const h = viewport.h;
  if (typeof w !== 'number' || !Number.isFinite(w) || w <= 0) return null;
  if (typeof h !== 'number' || !Number.isFinite(h) || h <= 0) return null;
  // pointerType is optional for backwards compatibility with senders
  // that pre-date the field. We accept missing / undefined; we only
  // reject a present-but-invalid value (defensive against malicious
  // wire payloads).
  let safePointerType: PeerPointerType | undefined;
  if (pointerType !== undefined) {
    if (typeof pointerType !== 'string') return null;
    if (!POINTER_TYPES.has(pointerType as PeerPointerType)) return null;
    safePointerType = pointerType as PeerPointerType;
  }
  const evt: PeerCursorEvent =
    safePointerType !== undefined
      ? { playerId, x, y, viewport: { w, h }, pointerType: safePointerType, ts }
      : { playerId, x, y, viewport: { w, h }, ts };
  return evt;
}

export function parseTargetEvent(input: unknown): PeerTargetEvent | null {
  if (!isRecord(input)) return null;
  const { playerId, nodeId, ts } = input;
  if (typeof playerId !== 'string' || playerId.length === 0) return null;
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return null;
  if (nodeId === null) return { playerId, nodeId: null, ts };
  if (typeof nodeId !== 'string' || !SEFIRAH_KEYS.has(nodeId)) return null;
  return { playerId, nodeId: nodeId as SefirahKey, ts };
}

export function parseActionEvent(input: unknown): PeerActionEvent | null {
  if (!isRecord(input)) return null;
  const { playerId, kind, ts } = input;
  if (typeof playerId !== 'string' || playerId.length === 0) return null;
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return null;
  if (kind === null) return { playerId, kind: null, ts };
  if (typeof kind !== 'string' || !ACTION_KINDS.has(kind as PeerActionKind)) return null;
  return { playerId, kind: kind as PeerActionKind, ts };
}

// ---------------------------------------------------------------------------
// Throttle helper (pure)
//
// Cursor samples are flooded by raw mousemove events at >120Hz on a
// modern trackpad. We cap network broadcast at 30Hz (motion-safe) /
// 4Hz (reduce-motion); the consumer interpolates between samples on
// raf so the rendered cursor still looks smooth. Pure helper so the
// caller can pin the throttle without timer juggling.
// ---------------------------------------------------------------------------

export function shouldThrottleCursor(now: number, lastSentTs: number | null, hz: number): boolean {
  if (lastSentTs === null) return false;
  const minWindowMs = 1000 / hz;
  return now - lastSentTs < minWindowMs;
}

// ---------------------------------------------------------------------------
// Channel observable
// ---------------------------------------------------------------------------

export interface PeerPresenceCallbacks {
  readonly onCursor: (event: PeerCursorEvent) => void;
  readonly onTarget: (event: PeerTargetEvent) => void;
  readonly onAction: (event: PeerActionEvent) => void;
  readonly onStatus: (status: PeerPresenceStatus) => void;
}

export interface PeerCursorSendInput {
  readonly x: number;
  readonly y: number;
  readonly viewport: { readonly w: number; readonly h: number };
  /**
   * Sender's most recent `PointerEvent.pointerType`. Optional so
   * existing callers don't break; new callers should pass it so the
   * receiver can render touch peers as ripples (and not as persistent
   * floating arrows).
   */
  readonly pointerType?: PeerPointerType;
}

export interface PeerTargetSendInput {
  readonly nodeId: SefirahKey | null;
}

export interface PeerActionSendInput {
  readonly kind: PeerActionKind | null;
}

export interface PeerPresenceSubscription {
  /**
   * Begin tracking the channel. Returns an `unsubscribe` callback
   * (idempotent) that removes the channel.
   */
  readonly subscribe: (callbacks: PeerPresenceCallbacks) => () => void;
  readonly sendCursor: (input: PeerCursorSendInput) => Promise<void>;
  readonly sendTarget: (input: PeerTargetSendInput) => Promise<void>;
  readonly sendAction: (input: PeerActionSendInput) => Promise<void>;
}

/**
 * Build a peer-presence subscription. Channel topic is
 * `peer-presence:{roomId}`; broadcast `event` keys are `cursor`,
 * `target`, `action`. Senders signal which player they are via the
 * payload's `playerId` field — the channel itself is shared, so the
 * receiver self-filters.
 */
export function peerPresenceSubscription(
  client: SupabaseClient,
  roomId: string,
  selfPlayerId: string,
): PeerPresenceSubscription {
  // The channel is created lazily on first subscribe so a
  // useEffect-cleanup that fires synchronously after construction (a
  // strict-mode double-mount race) doesn't leak a half-built channel.
  // `current` holds the active channel + its callbacks for the
  // duration of the subscription.
  interface Active {
    readonly channel: ReturnType<SupabaseClient['channel']>;
    readonly callbacks: PeerPresenceCallbacks;
    unsubscribed: boolean;
  }
  let active: Active | null = null;

  return {
    subscribe(callbacks) {
      if (active !== null) {
        // Re-subscribing to the same instance isn't supported — the
        // hook constructs a fresh subscription per (roomId, selfPlayerId)
        // pair. Surface a console warning so misuse is visible in dev,
        // and return a no-op unsubscribe so we don't crash the React
        // tree. We deliberately do NOT throw — a thrown error here
        // would propagate up through the consumer's effect and break
        // the rest of the page.
        if (typeof console !== 'undefined' && process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn(
            '[peerPresenceSubscription] subscribe() called twice on the same instance — ignored.',
          );
        }
        return (): void => undefined;
      }
      const channel = client.channel(`peer-presence:${roomId}`);
      const state: Active = { channel, callbacks, unsubscribed: false };
      active = state;

      channel.on('broadcast' as 'system', { event: 'cursor' }, (payload: { payload?: unknown }) => {
        if (state.unsubscribed) return;
        const parsed = parseCursorEvent(payload?.payload);
        if (parsed === null) return;
        if (parsed.playerId === selfPlayerId) return;
        callbacks.onCursor(parsed);
      });

      channel.on('broadcast' as 'system', { event: 'target' }, (payload: { payload?: unknown }) => {
        if (state.unsubscribed) return;
        const parsed = parseTargetEvent(payload?.payload);
        if (parsed === null) return;
        if (parsed.playerId === selfPlayerId) return;
        callbacks.onTarget(parsed);
      });

      channel.on('broadcast' as 'system', { event: 'action' }, (payload: { payload?: unknown }) => {
        if (state.unsubscribed) return;
        const parsed = parseActionEvent(payload?.payload);
        if (parsed === null) return;
        if (parsed.playerId === selfPlayerId) return;
        callbacks.onAction(parsed);
      });

      channel.subscribe((status) => {
        if (state.unsubscribed) return;
        if (status === 'SUBSCRIBED') callbacks.onStatus('connected');
        else if (status === 'CHANNEL_ERROR') callbacks.onStatus('error');
        else if (status === 'TIMED_OUT') callbacks.onStatus('timed-out');
        else if (status === 'CLOSED') callbacks.onStatus('closed');
      });

      return (): void => {
        if (state.unsubscribed) return;
        state.unsubscribed = true;
        void client.removeChannel(channel);
        active = null;
      };
    },

    async sendCursor(input) {
      if (active === null || active.unsubscribed) return;
      // Conditionally include `pointerType` so payloads from senders
      // that don't track it stay byte-identical to the pre-#322
      // shape (avoids breaking the wire schema's
      // `exactOptionalPropertyTypes` contract).
      const event: PeerCursorEvent =
        input.pointerType !== undefined
          ? {
              playerId: selfPlayerId,
              x: input.x,
              y: input.y,
              viewport: { w: input.viewport.w, h: input.viewport.h },
              pointerType: input.pointerType,
              ts: Date.now(),
            }
          : {
              playerId: selfPlayerId,
              x: input.x,
              y: input.y,
              viewport: { w: input.viewport.w, h: input.viewport.h },
              ts: Date.now(),
            };
      await active.channel.send({
        type: 'broadcast',
        event: 'cursor',
        payload: event,
      });
    },

    async sendTarget(input) {
      if (active === null || active.unsubscribed) return;
      const event: PeerTargetEvent = {
        playerId: selfPlayerId,
        nodeId: input.nodeId,
        ts: Date.now(),
      };
      await active.channel.send({
        type: 'broadcast',
        event: 'target',
        payload: event,
      });
    },

    async sendAction(input) {
      if (active === null || active.unsubscribed) return;
      const event: PeerActionEvent = {
        playerId: selfPlayerId,
        kind: input.kind,
        ts: Date.now(),
      };
      await active.channel.send({
        type: 'broadcast',
        event: 'action',
        payload: event,
      });
    },
  };
}
