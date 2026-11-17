"use client";

import { usePathname } from "next/navigation";

import { LABELS } from "@/constants/messages";
import type { Module } from "@/constants/modules";
import type { Role } from "@/constants/roles";
import { buildNavigation } from "@/lib/navigation";

import { isCurrentPage, useNavCounts } from "./navCounts";
import { NavLink } from "./NavLink";

type NavigationProps = {
  role: Role;
  modules: readonly Module[];
  /** Icons only: the labels stay for screen readers. */
  isCollapsed?: boolean;
  /** Called when a link is followed, so the slide-out menu can close. */
  onNavigate?: () => void;
};

/** The sidebar's links for the Staff member's Role and Modules; office-wide ones under Business. */
export function Navigation({ role, modules, isCollapsed = false, onNavigate }: NavigationProps) {
  const pathname = usePathname();
  const handleNavigate = onNavigate ?? doNothing;
  const items = buildNavigation(role, modules);
  const counts = useNavCounts();
  const isCurrent = (href: string): boolean => isCurrentPage(href, pathname);
  const renderLinks = (group: "work" | "business") =>
    items
      .filter((item) => item.group === group)
      .map((item) => (
        <li key={item.href}>
          <NavLink
            item={item}
            isCurrent={isCurrent(item.href)}
            isCollapsed={isCollapsed}
            waiting={counts[item.href]}
            onNavigate={handleNavigate}
          />
        </li>
      ));
  const business = renderLinks("business");

  return (
    <nav aria-label={LABELS.mainNavigation} className="flex-1 overflow-y-auto px-4 py-2">
      <ul className="grid gap-1">{renderLinks("work")}</ul>
      {business.length > 0 && (
        <>
          <h2
            className={
              isCollapsed
                ? "border-side-rule wide:sr-only mx-2 mb-1 border-b pt-3"
                : "text-small text-side-muted px-3.5 pt-6 pb-2 font-medium"
            }
          >
            {LABELS.business}
          </h2>
          <ul className="grid gap-1">{business}</ul>
        </>
      )}
    </nav>
  );
}

function doNothing(): void {
  return undefined;
}
