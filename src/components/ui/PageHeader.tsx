import clsx from "clsx";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode;
  /** A link back to the parent screen, above the title. */
  crumbs?: ReactNode;
  /**
   * On phones, the page has no main action and its one quiet action (Export on Applications and
   * Visas) sits beside the title as a small outlined button.
   */
  isActionBesideTitle?: boolean;
};

/** A compact rounded button on the title's line; still 44 tall to tap. */
export const PHONE_MAIN_ACTION =
  "max-phone:*:data-[variant=primary]:order-3 max-phone:*:data-[variant=primary]:flex-none max-phone:*:data-[variant=primary]:rounded-pill max-phone:*:data-[variant=primary]:px-3.5";

/**
 * A full-width break in a wrapping row, drawn by the wrapper that holds the actions (which is not
 * a box of its own on phones): what comes after it starts a new line, however short the title.
 */
export const PHONE_LINE_BREAK =
  "max-phone:before:order-4 max-phone:before:basis-full max-phone:before:content-['']";

/**
 * Phones (ticket 06): the header is one wrapping row. The title takes its line with the main
 * (primary) action beside it; the line under the title follows; the other actions are small text
 * buttons on the next line, from the left. Something that is not a button (Home's clock card)
 * takes the whole width.
 */
const PHONE_ACTIONS = clsx(
  "max-phone:contents max-phone:*:order-5 max-phone:*:px-button-sm max-phone:*:text-button-sm",
  "max-phone:*:not-data-variant:basis-full",
  PHONE_LINE_BREAK,
  PHONE_MAIN_ACTION,
);

/** Phones: the one quiet action beside the title, small and outlined. */
const PHONE_BESIDE_TITLE =
  "max-phone:before:hidden max-phone:*:data-variant:order-3 max-phone:*:data-variant:flex-none max-phone:*:data-variant:rounded-pill max-phone:*:data-variant:border-rule max-phone:*:data-variant:px-3.5";

/**
 * The page title, an optional line under it in small words (list tidy-ups 23), and the page's
 * main actions on the right.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  crumbs,
  isActionBesideTitle,
}: PageHeaderProps) {
  return (
    <div className="max-phone:items-center max-phone:justify-start max-phone:gap-x-2 max-phone:gap-y-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="max-phone:contents grid min-w-0 gap-2">
        {crumbs !== undefined && (
          <div className="max-phone:order-1 max-phone:basis-full">{crumbs}</div>
        )}
        <h1 className="text-page-title-sm wide:text-page-title max-phone:order-2 max-phone:flex-1 text-balance">
          {title}
        </h1>
        {subtitle !== undefined && (
          <p className="text-small text-ink-2 max-phone:order-4 max-phone:basis-full max-w-prose">
            {subtitle}
          </p>
        )}
      </div>
      {actions !== undefined && (
        <div
          className={clsx(
            "flex flex-wrap items-end gap-3",
            PHONE_ACTIONS,
            isActionBesideTitle === true && PHONE_BESIDE_TITLE,
          )}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
