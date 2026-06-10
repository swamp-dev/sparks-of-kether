'use client';
import { useMusic } from '@/lib/music/useMusic';

/**
 * Plays lobby ambient music on the home page (#26).
 *
 * The home page (`app/page.tsx`) is a server component; this thin
 * client wrapper is the minimal hook boundary. It renders nothing —
 * the side-effect of `useMusic('lobby')` is its only purpose.
 */
export function HomeMusic(): null {
  useMusic('lobby');
  return null;
}
