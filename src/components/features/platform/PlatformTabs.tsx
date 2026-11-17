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

/** The Platform's pages (issue 65), the open one marked; scrolls sideways on its own if narrow. */
export function PlatformTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label={LABELS.platform}
      className="border-rule bg-paper wide:px-10 overflow-x-auto border-b px-4"
    >
      <ul className="max-w-content mx-auto flex gap-2">
        {TABS.map((tab) => {
          const isCurrent = tab.isExact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-none">
              <Link
                href={tab.href}
                aria-current={isCurrent ? "page" : undefined}
                className={clsx(
                  "min-h-control flex items-center border-b-2 px-3 font-semibold",
                  isCurrent
                    ? "border-accent text-ink"
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
