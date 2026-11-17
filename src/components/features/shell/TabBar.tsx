"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { usePhoneWidth } from "@/components/ui/usePhoneWidth";
import { LABELS } from "@/constants/messages";
import type { Module } from "@/constants/modules";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { buildNavigation, type NavItem } from "@/lib/navigation";

import { isCurrentPage, useNavCounts, type Waiting } from "./navCounts";
import { SIDEBAR_ID } from "./Sidebar";

/** The pages used most, in reach of the thumb; a Teacher has Classes where others have Students. */
function barPages(role: Role): readonly string[] {
  const second = role === Role.Teacher ? ROUTES.batches : ROUTES.students;
  return [ROUTES.home, second, ROUTES.tasks, ROUTES.inbox];
}

type TabBarProps = {
  role: Role;
  modules: readonly Module[];
  isMenuOpen: boolean;
  /** Menu opens the slide-out sidebar. */
  onOpenMenu: () => void;
};

/**
 * The phone tab bar (640 and below, design system: Phones): Home, Students (Classes for a
 * Teacher), Tasks and Inbox, each only if the person's sidebar has it, then Menu. The current
 * page has a tinted pill behind its icon; on pages that aren't in the bar, Menu is current.
 * Above 640 there is none: the sidebar or ☰ does its job.
 */
export function TabBar(props: TabBarProps) {
  return usePhoneWidth() ? <PhoneTabBar {...props} /> : null;
}

function PhoneTabBar({ role, modules, isMenuOpen, onOpenMenu }: TabBarProps) {
  const pathname = usePathname();
  const counts = useNavCounts();
  const items = buildNavigation(role, modules);
  const tabs = barPages(role)
    .map((href) => items.find((item) => item.href === href))
    .filter((item): item is NavItem => item !== undefined);
  const isMenuCurrent = !tabs.some((tab) => isCurrentPage(tab.href, pathname));
  return (
    <nav
      aria-label={LABELS.quickLinks}
      className="phone:hidden border-rule bg-paper/88 tabbar-safe fixed inset-x-0 bottom-0 z-30 grid auto-cols-fr grid-flow-col border-t backdrop-blur-lg backdrop-saturate-150"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={isCurrentPage(tab.href, pathname) ? "page" : undefined}
          className={TAB_CLASSES}
        >
          <TabIcon icon={tab.icon} isCurrent={isCurrentPage(tab.href, pathname)}>
            <TabBadge waiting={counts[tab.href]} />
          </TabIcon>
          <TabLabel>{tab.href === ROUTES.home ? LABELS.tabHome : tab.label}</TabLabel>
          <TabCountLabel waiting={counts[tab.href]} />
        </Link>
      ))}
      <button
        type="button"
        aria-controls={SIDEBAR_ID}
        aria-expanded={isMenuOpen}
        {...(isMenuCurrent ? { "data-current": "" } : {})}
        onClick={onOpenMenu}
        className={clsx(TAB_CLASSES, "cursor-pointer")}
      >
        <TabIcon icon="burger" isCurrent={isMenuCurrent} />
        <TabLabel>{LABELS.tabMenu}</TabLabel>
      </button>
    </nav>
  );
}

const TAB_CLASSES = clsx(
  "group min-h-tabbar text-tiny text-ink-3 grid min-w-0 content-center justify-items-center gap-0.5 px-0.5 py-1 font-semibold no-underline",
  "aria-[current=page]:text-accent data-current:text-accent",
);

function TabIcon(props: { icon: IconName; isCurrent: boolean; children?: ReactNode }) {
  const { icon, isCurrent, children } = props;
  return (
    <span
      className={clsx(
        "h-tab-pill-h w-tab-pill rounded-pill relative grid place-items-center transition-colors",
        isCurrent ? "bg-tint" : "group-active:bg-fill-2",
      )}
    >
      <Icon name={icon} size="lg" />
      {children}
    </span>
  );
}

function TabLabel({ children }: { children: ReactNode }) {
  return <span className="max-w-full truncate">{children}</span>;
}

function hasCount(waiting: Waiting | undefined): waiting is Waiting {
  return waiting !== undefined && waiting.count > 0;
}

/** The number on the icon's corner; nothing for 0. */
function TabBadge({ waiting }: { waiting: Waiting | undefined }) {
  if (!hasCount(waiting)) return null;
  return (
    <span
      aria-hidden="true"
      className="rounded-pill bg-bad text-on-status text-tiny absolute -top-0.5 right-2 min-w-5 px-1.5 text-center leading-5 font-semibold tabular-nums"
    >
      {waiting.count}
    </span>
  );
}

/** What the number means, for screen readers, after the tab's name. */
function TabCountLabel({ waiting }: { waiting: Waiting | undefined }) {
  if (!hasCount(waiting)) return null;
  return <span className="sr-only">{`, ${waiting.label}`}</span>;
}
