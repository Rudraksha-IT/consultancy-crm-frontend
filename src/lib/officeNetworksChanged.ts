/**
 * Tells every open view of the Office Networks that the list changed somewhere else, e.g. the
 * Admin's dialog added the network they're on while Configuration → Office network is open
 * (first live fixes, ticket 03).
 */

const listeners = new Set<() => void>();

export function announceOfficeNetworksChanged(): void {
  for (const listener of listeners) listener();
}

/** Calls `listener` on every change; returns the way to stop. */
export function onOfficeNetworksChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
