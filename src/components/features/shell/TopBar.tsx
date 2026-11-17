"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";

import { GlobalSearch } from "@/components/features/search/GlobalSearch";
import { ThemeToggle } from "@/components/features/theme/ThemeToggle";
import { BrandMark, showsOfficeName } from "@/components/ui/BrandMark";
import { IconButton } from "@/components/ui/IconButton";
import { IconLink } from "@/components/ui/IconLink";
import { usePhoneWidth } from "@/components/ui/usePhoneWidth";
import { LABELS } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { SEARCH_TEXT } from "@/constants/search";
import type { StaffContext } from "@/lib/api";
import type { ColourModeState } from "@/components/features/theme/useColourMode";

import { NotificationsButton } from "./NotificationsButton";
import { SIDEBAR_ID } from "./Sidebar";

type TopBarProps = {
  context: StaffContext;
  colourMode: ColourModeState;
  isDrawerOpen: boolean;
  onOpenDrawer: () => void;
};

/**
 * Search, light/dark, Settings and notifications; the menu button and office name at 1024px and
 * below. Above 1024px the search sits centred over the page content (issue 88); at 1024px and
 * below a search icon opens it across the whole top bar, with an × to close it. On phones the bar
 * is 60 tall and see-through with a blur; Menu in the tab bar replaces ☰, and light/dark moves to
 * the sidebar (design system: Phones).
 */
export function TopBar({ context, colourMode, isDrawerOpen, onOpenDrawer }: TopBarProps) {
  const pathname = usePathname();
  const searchIconRef = useRef<HTMLButtonElement>(null);
  const search = useSmallScreenSearch(pathname, searchIconRef);
  const hiddenWhileSearching = search.isOpen && "max-wide:hidden";
  const isPhone = usePhoneWidth();
  return (
    <header className="min-h-topbar border-rule bg-paper max-phone:bg-paper/88 max-phone:backdrop-blur-lg max-phone:backdrop-saturate-150 phone:gap-4 wide:px-10 wide:grid wide:grid-cols-[minmax(0,1fr)_minmax(0,var(--container-search))_minmax(0,1fr)] sticky top-0 z-30 flex items-center gap-2 border-b px-4">
      <div className={clsx("wide:hidden flex min-w-0 items-center gap-1", hiddenWhileSearching)}>
        {!isPhone && (
          <IconButton
            icon="burger"
            label={LABELS.openMenu}
            isExpanded={isDrawerOpen}
            controls={SIDEBAR_ID}
            onClick={onOpenDrawer}
          />
        )}
        <span className="flex min-w-0 items-center gap-3 px-2">
          <BrandMark name={context.consultancy.name} logo={context.consultancy.logo} />
          {showsOfficeName(context.consultancy.logo) && (
            <b className="text-body phone:block hidden truncate font-bold">
              {context.consultancy.name}
            </b>
          )}
        </span>
      </div>
      <GlobalSearch
        role={context.staff.role}
        modules={context.modules}
        isExpanded={search.isOpen}
        onCollapse={search.close}
      />
      <div
        className={clsx(
          "phone:gap-2 wide:col-start-3 wide:justify-self-end ml-auto flex items-center gap-1",
          hiddenWhileSearching,
        )}
      >
        <span className="wide:hidden contents">
          <IconButton
            ref={searchIconRef}
            icon="search"
            label={SEARCH_TEXT.open}
            isExpanded={search.isOpen}
            onClick={search.open}
          />
        </span>
        {!isPhone && <ThemeToggle mode={colourMode.mode} onToggle={colourMode.toggleMode} />}
        <IconLink
          href={ROUTES.mySettings}
          icon="gear"
          label={LABELS.settings}
          isCurrent={pathname === ROUTES.mySettings}
        />
        <NotificationsButton />
      </div>
    </header>
  );
}

type SmallScreenSearch = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

/**
 * Whether the full-width search is open at 1024px and below. Closing it gives the cursor back to
 * the search icon (once the icon is shown again); another page opening closes it.
 */
function useSmallScreenSearch(
  pathname: string,
  iconRef: RefObject<HTMLButtonElement | null>,
): SmallScreenSearch {
  const [isOpen, setIsOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);
  const shouldReturnFocus = useRef(false);
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setIsOpen(false);
  }
  useEffect(() => {
    if (isOpen || !shouldReturnFocus.current) return;
    shouldReturnFocus.current = false;
    iconRef.current?.focus();
  }, [iconRef, isOpen]);
  return {
    isOpen,
    open: () => {
      setIsOpen(true);
    },
    close: () => {
      shouldReturnFocus.current = true;
      setIsOpen(false);
    },
  };
}
