import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

import { Icon, type IconName } from "./Icon";

// A container, so the number can shrink to the tile's width on a phone.
const TILE_CLASSES =
  "max-phone:@container grid min-w-0 content-start gap-1.5 rounded-panel border border-rule bg-paper p-6 text-ink shadow-raise max-phone:gap-1 max-phone:px-4 max-phone:py-3.5";

type FigureTileProps = {
  label: string;
  value: ReactNode;
  footnote?: ReactNode;
  href?: string;
  /** A fixed status colour for the number; the label always says what it means. */
  tone?: "good" | "warn" | "bad" | undefined;
  /** A line icon before the label. */
  icon?: IconName;
  /** More detail under the number, e.g. a short list. */
  children?: ReactNode;
};

const TONE_CLASSES = { good: "text-good", warn: "text-warn", bad: "text-bad" } as const;

/**
 * A label, a big number and a one-line footnote; optionally a link to the detail. On a phone the
 * footnote is dropped and the number shrinks to fit the tile (design system: Phones).
 */
export function FigureTile({
  label,
  value,
  footnote,
  href,
  tone,
  icon,
  children,
}: FigureTileProps) {
  const content = (
    <>
      <span className="text-secondary text-ink-2 inline-flex items-center gap-2 font-medium">
        {icon !== undefined && <Icon name={icon} className="shrink-0" />}
        {label}
      </span>
      <span
        className={clsx(
          "text-figure max-phone:text-figure-phone max-phone:whitespace-nowrap",
          tone !== undefined && TONE_CLASSES[tone],
        )}
      >
        {value}
      </span>
      {footnote !== undefined && (
        <span className="text-small text-ink-3 max-phone:hidden">{footnote}</span>
      )}
      {children}
    </>
  );
  if (href === undefined)
    return (
      <div data-tile="" className={TILE_CLASSES}>
        {content}
      </div>
    );
  return (
    <Link data-tile="" href={href} className={`${TILE_CLASSES} hover:border-accent no-underline`}>
      {content}
    </Link>
  );
}
