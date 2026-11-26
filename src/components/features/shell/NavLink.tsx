import clsx from "clsx";
import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import type { NavItem } from "@/lib/navigation";

import type { Waiting } from "./navCounts";

type NavLinkProps = {
  item: NavItem;
  isCurrent: boolean;
  /**
   * Something waiting there (e.g. Tasks due today or overdue) and what the number means for
   * screen readers; nothing is shown for 0.
   */
  waiting?: Waiting | undefined;
  onNavigate: () => void;
};

/**
 * One link of the side menu (UI revamp, ticket 05). Above 1024px the icon sits over its label and
 * the open page has a soft fill; in the slide-out menu the label is beside the icon. The open
 * page is in the accent colour on every width. A count is a quiet number: at the icon's top
 * corner in the strip, at the row's end in the slide-out menu.
 */
export function NavLink({ item, isCurrent, waiting, onNavigate }: NavLinkProps) {
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={isCurrent ? "page" : undefined}
      onClick={onNavigate}
      className={clsx(
        "min-h-side-item rounded-control text-body relative z-0 flex items-center gap-3.5 px-3.5 no-underline",
        "wide:min-h-rail-item wide:rounded-menu wide:text-rail wide:flex-col wide:justify-center wide:gap-1 wide:px-1 wide:py-2 wide:text-center",
        "hover:bg-side-hover max-phone:active:bg-side-hover",
        isCurrent ? "text-accent font-semibold" : "text-side-muted hover:text-side-ink font-medium",
      )}
    >
      {/* The shade behind the open page, an element of its own so it can glide to it (Movement). */}
      {isCurrent && (
        <span
          aria-hidden="true"
          data-marker=""
          className="rounded-menu bg-side-active wide:block absolute inset-0 -z-10 hidden"
        />
      )}
      <Icon name={item.icon} />
      <span className="wide:max-w-full">{item.label}</span>
      <NavCount waiting={waiting} />
    </Link>
  );
}

/** The number beside the link, with its meaning for screen readers. */
function NavCount({ waiting }: { waiting: Waiting | undefined }) {
  if (waiting === undefined || waiting.count === 0) return null;
  const { count, label } = waiting;
  return (
    <>
      <span className="sr-only">{`, ${label}`}</span>
      <span
        aria-hidden="true"
        className="text-small text-side-muted wide:text-tiny wide:absolute wide:top-1.5 wide:right-3.5 wide:ml-0 wide:leading-4 ml-auto font-medium tabular-nums"
      >
        {count}
      </span>
    </>
  );
}
