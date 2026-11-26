import clsx from "clsx";
import { createContext, use, useId, type ReactNode } from "react";

type SectionProps = {
  title: string;
  /** Short context or actions shown to the right of the title. */
  aside?: ReactNode;
  /** One small control right after the title, on its left (Home's eye, list tidy-ups 13). */
  titleAside?: ReactNode;
  /**
   * Keep the aside on the title's line at every width ("See all (3)" beside a title, UI revamp
   * 07): the title is cut with "…" before the aside ever drops under it.
   */
  keepsAsideOnLine?: boolean;
  /** Stretch to the height of the row it sits in, the panel growing (boxes side by side). */
  fills?: boolean;
  children: ReactNode;
};

/** A section's own layout: its content at the top, or stretched to fill its row. */
function sectionClasses(fills: boolean | undefined): string {
  return clsx(
    "grid min-w-0 gap-2.5",
    fills === true ? "h-full grid-rows-[auto_1fr] content-stretch" : "content-start",
  );
}

/** Whether a Section is a part of a bigger section, so its title is one level down. */
const IsPartContext = createContext(false);

/** The title's line: the aside drops under a long title, or the title is cut to keep it there. */
const TITLE_LINES = {
  wraps: { line: "flex-wrap gap-4", title: "", aside: "flex-wrap" },
  kept: { line: "flex-nowrap gap-3", title: "truncate", aside: "flex-none whitespace-nowrap" },
} as const;

/** A titled part of a page. The title sits above the panel, never inside it. */
export function Section({
  title,
  aside,
  titleAside,
  keepsAsideOnLine,
  fills,
  children,
}: SectionProps) {
  const titleId = useId();
  const isPart = use(IsPartContext);
  const Heading = isPart ? "h3" : "h2";
  const look = TITLE_LINES[keepsAsideOnLine === true ? "kept" : "wraps"];

  return (
    <section aria-labelledby={titleId} className={sectionClasses(fills)}>
      <div className={clsx("min-h-control flex items-center justify-between", look.line)}>
        <div className="flex min-w-0 items-center gap-1">
          <Heading
            id={titleId}
            className={clsx(isPart ? "text-card-title" : "text-section-title", look.title)}
          >
            {title}
          </Heading>
          {titleAside}
        </div>
        {aside !== undefined && (
          <div className={clsx("text-secondary text-ink-2 flex items-center gap-4", look.aside)}>
            {aside}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Several Sections bundled into one settings section (Configuration → General): each part's
 * title is one level down, and a line runs between the parts.
 */
export function SectionParts({ children }: { children: ReactNode }) {
  return (
    <IsPartContext value>
      <div className="*:not-first:border-rule grid min-w-0 gap-8 *:min-w-0 *:not-first:border-t *:not-first:pt-8">
        {children}
      </div>
    </IsPartContext>
  );
}
