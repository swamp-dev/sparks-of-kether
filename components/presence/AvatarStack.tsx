'use client';

/**
 * AvatarStack — top-right cluster of peer-avatar tokens for #322.
 *
 * Each peer renders as a 36 × 36 circular tile tinted with the player's
 * sign / Sefirah accent colour. Active player gets a Tiferet-gold ring
 * + breath halo; offline peers get a half-opacity tile + dashed
 * reconnection indicator. The full roster could include arbitrarily
 * many peers in a future where rooms exceed four; we cap visible
 * tokens at four and surface an `+N` overflow chip so the chrome bar
 * stays predictably small.
 *
 * The component is presentation-only — peer roster, online state, and
 * tinting come from the orchestrator (`usePeerPresence` + the existing
 * `usePresence`). Click handler hands the player id back so the parent
 * can route to `/demo/stat-sheet` or the player's profile route.
 */

const MAX_VISIBLE = 4;

export interface PresencePeer {
  readonly playerId: string;
  readonly name: string;
  /** Tinting accent — typically the player's sign / Sefirah color hex. */
  readonly color: string;
  /** Optional sign glyph (♈ ♉ ♊ …) rendered centred on the tile. */
  readonly glyph?: string;
  /** Initial used when no glyph is available — first letter of `name`. */
  readonly online: boolean;
}

export interface AvatarStackProps {
  readonly peers: readonly PresencePeer[];
  /** The viewing player; tagged with a "(you)" affordance for SR users. */
  readonly viewerPlayerId: string;
  /** Currently-active player; gets the Tiferet-gold ring + breath. */
  readonly activePlayerId: string;
  readonly onAvatarClick?: (playerId: string) => void;
  readonly className?: string;
}

export function AvatarStack({
  peers,
  viewerPlayerId,
  activePlayerId,
  onAvatarClick,
  className,
}: AvatarStackProps): JSX.Element | null {
  if (peers.length === 0) return null;

  const visible = peers.slice(0, MAX_VISIBLE);
  const overflow = peers.length - visible.length;

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2 ${className ?? ''}`}
      data-testid="avatar-stack"
    >
      {visible.map((peer) => (
        <AvatarToken
          key={peer.playerId}
          peer={peer}
          isActive={peer.playerId === activePlayerId}
          isViewer={peer.playerId === viewerPlayerId}
          {...(onAvatarClick !== undefined ? { onClick: onAvatarClick } : {})}
        />
      ))}
      {overflow > 0 && (
        <span
          data-testid="avatar-overflow"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-veil/30 bg-ground/70 text-xs text-veil/80"
          aria-label={`${overflow} more player${overflow === 1 ? '' : 's'}`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

interface AvatarTokenProps {
  readonly peer: PresencePeer;
  readonly isActive: boolean;
  readonly isViewer: boolean;
  readonly onClick?: (playerId: string) => void;
}

function AvatarToken({ peer, isActive, isViewer, onClick }: AvatarTokenProps): JSX.Element {
  const center = (peer.glyph ?? peer.name.charAt(0).toUpperCase()) || '?';
  const labelParts = [
    peer.name,
    isViewer ? '(you)' : null,
    peer.online ? null : 'disconnected',
    isActive ? 'active player' : null,
  ].filter((p): p is string => p !== null);

  // Tinted ring colour exposed as `--peer-color` for the breath halo /
  // border. Inline style is the simplest path — Tailwind's JIT can't
  // generate per-peer hex classes at build time.
  const style = {
    '--peer-color': peer.color,
    borderColor: peer.color,
  } as React.CSSProperties;

  return (
    <button
      type="button"
      data-testid={`avatar-token-${peer.playerId}`}
      data-active={isActive ? 'true' : 'false'}
      data-online={peer.online ? 'true' : 'false'}
      data-viewer={isViewer ? 'true' : 'false'}
      onClick={onClick === undefined ? undefined : () => onClick(peer.playerId)}
      aria-label={labelParts.join(' — ')}
      style={style}
      className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 bg-ground/80 font-display text-xs uppercase tracking-wider text-veil transition-all duration-300 ease-emerge focus:outline-none focus-visible:ring-2 focus-visible:ring-illumination data-[online=false]:border-dashed data-[online=false]:opacity-60 data-[active=true]:shadow-glow-tiferet data-[active=true]:motion-safe:animate-breath ${onClick === undefined ? '' : 'hover:scale-105'} `}
    >
      <span aria-hidden="true">{center}</span>
      {isActive && (
        <span
          data-testid={`avatar-active-marker-${peer.playerId}`}
          aria-hidden="true"
          className="absolute -inset-0.5 rounded-full ring-2 ring-illumination"
        />
      )}
    </button>
  );
}
