import clsx from "clsx";
import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import type { NavItem } from "@/lib/navigation";

import type { Waiting } from "./navCounts";

type NavLinkProps = {
  item: NavItem;
  isCurrent: boolean;
  isCollapsed: boolean;
  /**
   * Something waiting there (e.g. Tasks due today or overdue) and what the number means for
   * screen readers; nothing is shown for 0.
   */
  waiting?: Waiting | undefined;
  onNavigate: () => void;
};

/**
 * One sidebar link. The open page is marked by a line on the left edge, with no fill. A count
 * sits at the right end, or on the icon's corner when the sidebar is collapsed.
 */
export function NavLink(props: NavLinkProps) {
  const { item, isCurrent, isCollapsed, waiting, onNavigate } = props;
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={isCurrent ? "page" : undefined}
      onClick={onNavigate}
      className={linkClasses(isCurrent, isCollapsed)}
    >
      <Icon name={item.icon} />
      <span className={clsx(isCollapsed && "wide:sr-only")}>{item.label}</span>
      <NavCount waiting={waiting} isCollapsed={isCollapsed} />
    </Link>
  );
}

function linkClasses(isCurrent: boolean, isCollapsed: boolean): string {
  return clsx(
    "min-h-side-item rounded-control text-body relative flex items-center gap-3.5 px-3.5 font-medium no-underline",
    "hover:bg-side-hover hover:text-side-ink max-phone:active:bg-side-hover",
    isCurrent
      ? "text-side-active-ink before:w-active-line before:rounded-r-chip font-semibold before:absolute before:inset-y-2 before:-left-4 before:bg-current"
      : "text-side-muted",
    isCollapsed && "wide:justify-center wide:px-0",
  );
}

/** The number beside the link, with its meaning for screen readers. */
function NavCount(props: { waiting: Waiting | undefined; isCollapsed: boolean }) {
  const { waiting, isCollapsed } = props;
  if (waiting === undefined || waiting.count === 0) return null;
  const { count, label } = waiting;
  return (
    <>
      <span className="sr-only">{`, ${label}`}</span>
      <span
        aria-hidden="true"
        className={clsx(
          "rounded-pill text-small ml-auto min-w-6 px-2 text-center leading-6 font-semibold tabular-nums",
          isCollapsed
            ? // Beside the icon's top corner in the rail, solid so it reads on any sidebar colour.
              "bg-side-hover wide:absolute wide:top-0.5 wide:-right-2 wide:min-w-5 wide:px-1.5 wide:leading-5 wide:bg-side-ink wide:text-side-bg"
            : "bg-side-hover",
        )}
      >
        {count}
      </span>
    </>
  );
}
