import clsx from "clsx";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode;
  /** A link back to the parent screen, above the title. */
  crumbs?: ReactNode;
};

/**
 * Phones: the actions take the whole width under the title. The main (primary) action is full
 * width on top and 48 tall; the others share one row under it (design system: Phones).
 */
const PHONE_ACTIONS = clsx(
  "max-phone:w-full max-phone:gap-2 max-phone:*:grow max-phone:*:basis-0",
  "max-phone:*:data-[variant=primary]:order-first max-phone:*:data-[variant=primary]:basis-full max-phone:*:data-[variant=primary]:min-h-action-phone max-phone:*:data-[variant=primary]:text-body",
);

/** The page title, an optional line under it, and the page's main actions on the right. */
export function PageHeader({ title, subtitle, actions, crumbs }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="grid min-w-0 gap-2">
        {crumbs}
        <h1 className="text-page-title-sm wide:text-page-title text-balance">{title}</h1>
        {subtitle !== undefined && <p className="text-body text-ink-2 max-w-prose">{subtitle}</p>}
      </div>
      {actions !== undefined && (
        <div className={clsx("flex flex-wrap items-end gap-3", PHONE_ACTIONS)}>{actions}</div>
      )}
    </div>
  );
}
