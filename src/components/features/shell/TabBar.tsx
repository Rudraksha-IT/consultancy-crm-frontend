"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type MouseEvent, type ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { useMarkerSlide } from "@/components/ui/useMovement";
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
  const [shown, tap] = useShownTab(tabs, pathname);
  const isMenuCurrent = shown === MENU;
  const barRef = useRef<HTMLElement>(null);
  // The tinted pill slides sideways to the tab that was tapped (Movement).
  useMarkerSlide(barRef, shown);
  return (
    <nav
      ref={barRef}
      aria-label={LABELS.quickLinks}
      data-tabbar=""
      className="phone:hidden border-rule bg-paper/88 tabbar-safe fixed inset-x-0 bottom-0 z-30 grid auto-cols-fr grid-flow-col border-t backdrop-blur-lg backdrop-saturate-150"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={isCurrentPage(tab.href, pathname) ? "page" : undefined}
          {...(shown === tab.href ? { "data-current": "" } : {})}
          onClick={(event) => {
            if (isPlainClick(event)) tap(tab.href);
          }}
          className={TAB_CLASSES}
        >
          <TabIcon icon={tab.icon} isCurrent={shown === tab.href}>
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

/** The pill on Menu: no page is a tab's, so Menu is the place you are. */
const MENU = "menu";

/**
 * The tab that shows as current: the one tapped, at once, until the page it opens has come (a
 * page can take a moment); then the open page's tab, or Menu on a page that isn't in the bar.
 */
function useShownTab(tabs: readonly NavItem[], pathname: string): [string, (href: string) => void] {
  const [tapped, setTapped] = useState<{ href: string; from: string } | null>(null);
  const open = tabs.find((tab) => isCurrentPage(tab.href, pathname))?.href ?? MENU;
  const isTapStill = tapped !== null && tapped.from === pathname;
  return [
    isTapStill ? tapped.href : open,
    (href) => {
      setTapped({ href, from: pathname });
    },
  ];
}

/** A plain tap or click; one that opens a new tab or window leaves this page as it is. */
function isPlainClick(event: MouseEvent): boolean {
  return !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0);
}

const TAB_CLASSES = clsx(
  "group min-h-tabbar text-tiny text-ink-3 grid min-w-0 content-center justify-items-center gap-0.5 px-0.5 py-1 font-semibold no-underline",
  "data-current:text-accent transition-colors",
);

/**
 * A tab's icon on a pill-sized place. The current tab's tinted pill is a layer of its own behind
 * the icon, so when it slides to another tab only the pill moves, never an icon (owner).
 */
function TabIcon(props: { icon: IconName; isCurrent: boolean; children?: ReactNode }) {
  const { icon, isCurrent, children } = props;
  return (
    <span
      className={clsx(
        "h-tab-pill-h w-tab-pill rounded-pill relative isolate grid place-items-center",
        !isCurrent && "group-active:bg-fill-2",
      )}
    >
      {isCurrent && (
        <span
          data-marker=""
          aria-hidden="true"
          className="bg-tint rounded-pill absolute inset-0 -z-1"
        />
      )}
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
