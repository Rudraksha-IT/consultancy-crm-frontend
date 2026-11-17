const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Whether the device asks for dark mode; shaped for `useSyncExternalStore`. */
export function isDeviceDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

export function subscribeToDevice(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}
