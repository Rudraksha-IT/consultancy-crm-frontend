/**
 * A `window.matchMedia` stand-in for jsdom: the device prefers dark when `isDark()` is true, and
 * any other query matches when `isMatched(query)` says so (e.g. a phone-width screen).
 */
export function fakeMatchMedia(
  isDark: () => boolean,
  isMatched: (query: string) => boolean = () => false,
): {
  matchMedia: (query: string) => MediaQueryList;
  emitChange: () => void;
} {
  const listeners = new Set<() => void>();
  const matchMedia = (query: string): MediaQueryList => {
    const list = new EventTarget();
    return Object.assign(list, {
      media: query,
      get matches() {
        return (query.includes("dark") && isDark()) || isMatched(query);
      },
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: (_type: string, listener: () => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: () => void) => {
        listeners.delete(listener);
      },
      dispatchEvent: () => true,
    });
  };
  return {
    matchMedia,
    emitChange: () => {
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
}
