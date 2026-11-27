import type { ReactNode } from "react";

type TabsRowProps = {
  /** The tabs (a SegmentedControl). */
  tabs: ReactNode;
  /** What the chosen tab shows, in a few small words. */
  note?: string | undefined;
};

/**
 * Tabs with what the chosen one is about beside them, in small words (list tidy-ups 23). The note
 * never takes a line of its own while there is room; on a narrow screen it wraps under the tabs.
 */
export function TabsRow({ tabs, note }: TabsRowProps) {
  return (
    <div data-tabs-row="" data-swap-bar="" className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {tabs}
      {note !== undefined && (
        <p className="text-small text-ink-3 max-w-prose min-w-0 flex-1 basis-80">{note}</p>
      )}
    </div>
  );
}
