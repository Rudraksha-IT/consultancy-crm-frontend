/** Words in the gap a pull opens when swiping between pages (design system, Gestures; issue 90). */
export const GESTURE_TEXT = {
  keepPulling: (page: string) => `Keep pulling to go to ${page}`,
  release: (page: string) => `Release to go to ${page}`,
} as const;
