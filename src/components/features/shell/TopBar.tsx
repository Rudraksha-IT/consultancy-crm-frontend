"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";

import { GlobalSearch } from "@/components/features/search/GlobalSearch";
import { ThemeToggle } from "@/components/features/theme/ThemeToggle";
import { BrandMark, showsOfficeName } from "@/components/ui/BrandMark";
import { IconButton } from "@/components/ui/IconButton";
import { usePhoneWidth } from "@/components/ui/usePhoneWidth";
import { LABELS } from "@/constants/messages";
import { SEARCH_TEXT } from "@/constants/search";
import type { StaffContext } from "@/lib/api";
import type { ColourModeState } from "@/components/features/theme/useColourMode";

import { NotificationsButton } from "./NotificationsButton";
import { SIDEBAR_ID } from "./Sidebar";
import { YourMenu } from "./YourMenu";

type TopBarProps = {
  context: StaffContext;
  colourMode: ColourModeState;
  isDrawerOpen: boolean;
  onOpenDrawer: () => void;
};

/**
 * The top bar of the Journey frame (UI revamp, ticket 05): the office's name at the top left
 * (plain text, not a link), search, light/dark, notifications, and your initials with your menu.
 * Above 1024px the office's mark is at the top of the side menu and the search sits centred over
 * the page (issue 88). At 1024px and below the mark and ☰ come first, and a search icon opens
 * the search across the whole bar, with an × to close it. On phones only the mark shows (the name
 * is in the menu), Menu in the tab bar replaces ☰, light/dark moves to the side menu, and the bar
 * is see-through with a blur (design system: Phones).
 */
export function TopBar({ context, colourMode, isDrawerOpen, onOpenDrawer }: TopBarProps) {
  const pathname = usePathname();
  const searchIconRef = useRef<HTMLButtonElement>(null);
  const search = useSmallScreenSearch(pathname, searchIconRef);
  const hiddenWhileSearching = search.isOpen && "max-wide:hidden";
  const isPhone = usePhoneWidth();
  return (
    <header className="min-h-office-bar border-rule bg-canvas max-phone:bg-canvas/88 max-phone:backdrop-blur-lg max-phone:backdrop-saturate-150 phone:gap-4 wide:pr-10 wide:pl-8 wide:grid wide:grid-cols-[minmax(0,1fr)_minmax(0,var(--container-search))_minmax(0,1fr)] sticky top-0 z-30 flex items-center gap-2 border-b px-4">
      <div className={clsx("flex min-w-0 items-center gap-1", hiddenWhileSearching)}>
        {!isPhone && (
          <span className="wide:hidden contents">
            <IconButton
              icon="burger"
              label={LABELS.openMenu}
              isExpanded={isDrawerOpen}
              controls={SIDEBAR_ID}
              onClick={onOpenDrawer}
            />
          </span>
        )}
        <Office consultancy={context.consultancy} hasName={!isPhone} />
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
        <NotificationsButton />
        <YourMenu
          staff={context.staff}
          modules={context.modules}
          supportAccess={context.supportAccess}
        />
      </div>
    </header>
  );
}

type OfficeProps = { consultancy: StaffContext["consultancy"]; hasName: boolean };

/**
 * Which office this is: its mark and its name, a label and never a link. Above 1024px the mark is
 * at the top of the side menu, so only the name is here; a logo that carries the name itself
 * stays here at every width, since the side menu is too narrow for it.
 */
function Office({ consultancy: { name, logo }, hasName }: OfficeProps) {
  const isNamed = showsOfficeName(logo);
  return (
    <span className="wide:px-0 flex min-w-0 items-center gap-3 px-2">
      <span className={clsx("contents", isNamed && "wide:hidden")}>
        <BrandMark name={name} logo={logo} />
      </span>
      {hasName && isNamed && (
        <b className="text-body wide:text-section-title truncate font-semibold">{name}</b>
      )}
    </span>
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
