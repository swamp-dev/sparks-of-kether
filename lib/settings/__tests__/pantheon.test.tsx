import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * Pin the pantheon settings store contract (#548 — Phase A2 of #293):
 *
 *   - `usePantheon()` returns the current id + setter + the full Pantheon.
 *   - Default is `'greco-roman'` (the only entry in the MVP registry).
 *   - The setter persists to localStorage under a stable key so the
 *     next mount reads the user's choice.
 *   - The hook tolerates an unknown stored id by falling back to the
 *     greco-roman pantheon for the `pantheon` payload while preserving
 *     the stored id in `pantheonId` (lets B-phase content tickets land
 *     stored ids before the registry knows about them).
 *   - Returns a no-op stub when no provider is mounted, mirroring
 *     `useSoundEnabled()`'s defensive default.
 *
 * The provider is `<PantheonSettingsProvider />` so consumers can mount
 * a single source of truth at `app/layout.tsx`.
 */

import {
  PANTHEON_STORAGE_KEY,
  PantheonSettingsProvider,
  usePantheon,
} from '../pantheon';
import { pantheons } from '@/data/pantheons';

const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <PantheonSettingsProvider>{children}</PantheonSettingsProvider>
);

describe('usePantheon', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to 'greco-roman' when there is no stored preference", () => {
    const { result } = renderHook(() => usePantheon(), { wrapper });
    expect(result.current.pantheonId).toBe('greco-roman');
    expect(result.current.pantheon).toBe(pantheons['greco-roman']);
  });

  it('reads the stored id from localStorage on mount', () => {
    localStorage.setItem(PANTHEON_STORAGE_KEY, 'greco-roman');
    const { result } = renderHook(() => usePantheon(), { wrapper });
    expect(result.current.pantheonId).toBe('greco-roman');
  });

  it('preserves an unknown stored id but falls back to greco-roman for the pantheon payload (AC #2)', () => {
    // Egyptian doesn't exist in the registry yet (lands in B1). The hook
    // must accept the id (so a future-Egyptian write survives reload)
    // while still giving consumers a valid Pantheon object today.
    localStorage.setItem(PANTHEON_STORAGE_KEY, 'egyptian');
    const { result } = renderHook(() => usePantheon(), { wrapper });
    expect(result.current.pantheonId).toBe('egyptian');
    expect(result.current.pantheon).toBe(pantheons['greco-roman']);
  });

  it('persists to localStorage when the setter is called (AC #3)', () => {
    const { result } = renderHook(() => usePantheon(), { wrapper });
    act(() => {
      result.current.setPantheonId('greco-roman');
    });
    expect(result.current.pantheonId).toBe('greco-roman');
    expect(localStorage.getItem(PANTHEON_STORAGE_KEY)).toBe('greco-roman');

    // Forward-compat: the setter accepts ids the registry doesn't know
    // about yet (B-phase content lands ids before C1 wires the toggle).
    act(() => {
      result.current.setPantheonId('egyptian');
    });
    expect(result.current.pantheonId).toBe('egyptian');
    expect(localStorage.getItem(PANTHEON_STORAGE_KEY)).toBe('egyptian');
  });

  it('returns a no-op stub when used outside of the provider (AC #5)', () => {
    const { result } = renderHook(() => usePantheon());
    expect(result.current.pantheonId).toBe('greco-roman');
    expect(result.current.pantheon).toBe(pantheons['greco-roman']);
    // Setter is a no-op — calling it doesn't throw and doesn't write.
    act(() => {
      result.current.setPantheonId('egyptian');
    });
    expect(result.current.pantheonId).toBe('greco-roman');
    expect(localStorage.getItem(PANTHEON_STORAGE_KEY)).toBeNull();
  });

  it('does not crash when localStorage write throws (private-mode safe)', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('quota exceeded');
    };
    try {
      const { result } = renderHook(() => usePantheon(), { wrapper });
      // The setter must swallow the throw — the in-memory state still
      // updates so the user's choice takes effect for this session.
      expect(() => {
        act(() => {
          result.current.setPantheonId('egyptian');
        });
      }).not.toThrow();
      expect(result.current.pantheonId).toBe('egyptian');
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
