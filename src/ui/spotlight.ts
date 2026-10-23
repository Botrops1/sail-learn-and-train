/**
 * M49 (issue #77): the spotlight of "Where is it?" and "Show it working". A tiny event channel
 * between the Learn section (which asks) and the 3D view (which flies the camera close, fades
 * the rest and ends it). UI state only: never in the store, never in the link.
 */
export type SpotlightKind = 'where' | 'show';

export interface Spotlight {
  partId: string;
  kind: SpotlightKind;
}

let current: Spotlight | null = null;
const listeners: ((spotlight: Spotlight | null) => void)[] = [];

function set(next: Spotlight | null): void {
  current = next;
  for (const listener of listeners) listener(next);
}

/** Starts a spotlight on a part, replacing any spotlight there is. */
export function requestSpotlight(partId: string, kind: SpotlightKind): void {
  set({ partId, kind });
}

/** Ends the spotlight; does nothing when there is none. */
export function endSpotlight(): void {
  if (current !== null) set(null);
}

export function spotlightNow(): Spotlight | null {
  return current;
}

export function onSpotlight(listener: (spotlight: Spotlight | null) => void): void {
  listeners.push(listener);
}
