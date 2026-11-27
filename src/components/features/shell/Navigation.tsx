"use client";

import { usePathname } from "next/navigation";
import { useRef } from "react";

import { useMarkerSlide } from "@/components/ui/useMovement";

import { LABELS } from "@/constants/messages";
import type { Module } from "@/constants/modules";
import type { Role } from "@/constants/roles";
import { buildNavigation } from "@/lib/navigation";

import { isCurrentPage, useNavCounts } from "./navCounts";
import { NavLink } from "./NavLink";

type NavigationProps = {
  role: Role;
  modules: readonly Module[];
  /** Called when a link is followed, so the slide-out menu can close. */
  onNavigate?: () => void;
};

/**
 * The side menu's links for the Staff member's Role and Modules; the office-wide ones (Business)
 * come after a line. It scrolls on its own and fades at its foot, where links pass under the
 * product's mark. It stays in place when another page opens, so it keeps its own scroll (U6).
 */
export function Navigation({ role, modules, onNavigate }: NavigationProps) {
  const pathname = usePathname();
  const handleNavigate = onNavigate ?? doNothing;
  const items = buildNavigation(role, modules);
  const counts = useNavCounts();
  const isCurrent = (href: string): boolean => isCurrentPage(href, pathname);
  const navRef = useRef<HTMLElement>(null);
  // The shade behind the open page glides to the page that was picked (Movement).
  useMarkerSlide(navRef, items.find((item) => isCurrent(item.href))?.href ?? "");

  const renderLinks = (group: "work" | "business") =>
    items
      .filter((item) => item.group === group)
      .map((item) => (
        <li key={item.href}>
          <NavLink
            item={item}
            isCurrent={isCurrent(item.href)}
            waiting={counts[item.href]}
            onNavigate={handleNavigate}
          />
        </li>
      ));
  const business = renderLinks("business");

  return (
    <nav
      ref={navRef}
      aria-label={LABELS.mainNavigation}
      className="menu-fade wide:px-2 wide:py-1 flex-1 overflow-y-auto px-4 py-2"
    >
      <ul className="wide:gap-0.5 grid gap-1">{renderLinks("work")}</ul>
      {business.length > 0 && (
        <>
          {/* A line, then the group's name; in the narrow strip the line alone. */}
          <h2 className="border-rule-2 text-small text-side-muted wide:mx-3.5 wide:mt-1.5 wide:mb-1.5 wide:h-0 wide:overflow-hidden wide:p-0 mt-2 border-t px-3.5 pt-5 pb-2 font-medium">
            {LABELS.business}
          </h2>
          <ul className="wide:gap-0.5 grid gap-1">{business}</ul>
        </>
      )}
    </nav>
  );
}

function doNothing(): void {
  return undefined;
}
