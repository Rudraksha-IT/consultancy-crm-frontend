"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LABELS } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";

const TABS = [
  { label: LABELS.consultancies, href: ROUTES.platformHome, isExact: true },
  { label: LABELS.platformAdmins, href: ROUTES.platformAdmins, isExact: false },
  { label: LABELS.settings, href: ROUTES.platformSettings, isExact: false },
] as const;

/**
 * The Platform's pages (issue 65), the open one marked; at the top of the page itself (ticket 16),
 * drawn like a record's tabs. Scrolls sideways on its own if narrow.
 */
export function PlatformTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label={LABELS.platform} className="border-rule min-w-0 overflow-x-auto border-b-2">
      <ul className="flex gap-2">
        {TABS.map((tab) => {
          const isCurrent = tab.isExact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-none">
              <Link
                href={tab.href}
                aria-current={isCurrent ? "page" : undefined}
                className={clsx(
                  "min-h-control-lg text-body -mb-0.5 flex items-center border-b-3 px-4 font-semibold whitespace-nowrap",
                  isCurrent
                    ? "border-accent text-accent"
                    : "text-ink-2 hover:text-ink border-transparent",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
