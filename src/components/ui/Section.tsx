import clsx from "clsx";
import { createContext, use, useId, type ReactNode } from "react";

type SectionProps = {
  title: string;
  /** Short context or actions shown to the right of the title. */
  aside?: ReactNode;
  /** Stretch to the height of the row it sits in, the panel growing (boxes side by side). */
  fills?: boolean;
  children: ReactNode;
};

/** A section's own layout: its content at the top, or stretched to fill its row. */
function sectionClasses(fills: boolean | undefined): string {
  return clsx(
    "grid min-w-0 gap-4",
    fills === true ? "h-full grid-rows-[auto_1fr] content-stretch" : "content-start",
  );
}

/** Whether a Section is a part of a bigger section, so its title is one level down. */
const IsPartContext = createContext(false);

/** A titled part of a page. The title sits above the panel, never inside it. */
export function Section({ title, aside, fills, children }: SectionProps) {
  const titleId = useId();
  const isPart = use(IsPartContext);
  const Heading = isPart ? "h3" : "h2";

  return (
    <section aria-labelledby={titleId} className={sectionClasses(fills)}>
      <div className="min-h-control flex flex-wrap items-center justify-between gap-4">
        <Heading id={titleId} className={clsx(isPart ? "text-card-title" : "text-section-title")}>
          {title}
        </Heading>
        {aside !== undefined && (
          <div className="text-secondary text-ink-2 flex flex-wrap items-center gap-4">{aside}</div>
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
