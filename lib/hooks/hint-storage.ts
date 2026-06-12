import type { FirstEvent } from '@/data/hints';

export const HINT_CHANGE_EVENT = 'sok-hint-change';

const HINT_PREFIX = 'sok:hint:';
const FIRST_EVENT_PREFIX = 'sok:first-event:';

export function isDismissed(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(`${HINT_PREFIX}${id}`) === 'dismissed';
  } catch {
    return false;
  }
}

export function markDismissed(id: string | undefined): void {
  if (id === undefined) return;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${HINT_PREFIX}${id}`, 'dismissed');
    window.dispatchEvent(new Event(HINT_CHANGE_EVENT));
  } catch {
    // Private-browsing mode or quota exceeded — silently ignore.
  }
}

export function clearAllHints(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(HINT_PREFIX));
    keys.forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new Event(HINT_CHANGE_EVENT));
  } catch {
    // Silently ignore.
  }
}

export function hasFirstEventFired(event: FirstEvent): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(`${FIRST_EVENT_PREFIX}${event}`) === 'fired';
  } catch {
    return false;
  }
}

export function markFirstEventFired(event: FirstEvent): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`${FIRST_EVENT_PREFIX}${event}`, 'fired');
  } catch {
    // Private-browsing mode or quota exceeded — silently ignore.
  }
}
