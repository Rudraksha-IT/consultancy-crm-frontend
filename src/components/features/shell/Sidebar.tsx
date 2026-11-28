import clsx from "clsx";
import type { Ref } from "react";

import type { ColourModeState } from "@/components/features/theme/useColourMode";
import { BrandMark } from "@/components/ui/BrandMark";
import type { StaffContext } from "@/lib/api";

import { Navigation } from "./Navigation";
import { SidebarFoot } from "./SidebarFoot";
import { SidebarHead } from "./SidebarHead";
import type { SidebarState } from "./useSidebar";

export const SIDEBAR_ID = "side-nav";

type SidebarProps = {
  context: StaffContext;
  sidebar: SidebarState;
  /** Light/dark sits at the menu's foot on phones (design system: Phones). */
  colourMode: ColourModeState;
  /** The menu itself, which a finger swipe moves (issue 89). */
  ref?: Ref<HTMLElement>;
};

/**
 * The side menu (UI revamp, ticket 05). Above 1024px a narrow strip: the office's mark, each page
 * as an icon with its label under it, and the product's mark at the foot. At 1024px and below the
 * slide-out menu, with the office's name at its top. Who is logged in is in the top bar now.
 */
export function Sidebar({ context, sidebar, colourMode, ref }: SidebarProps) {
  const { name, logo } = context.consultancy;
  return (
    <aside
      ref={ref}
      id={SIDEBAR_ID}
      className={clsx(
        "w-drawer border-side-rule bg-side-bg text-side-ink fixed inset-y-0 left-0 z-40 flex max-w-[86vw] flex-col overflow-hidden border-r transition-[translate,visibility]",
        // The slide-out menu comes in and goes back, carrying on from where a finger left it.
        // Closed, it is also out of reach of the keyboard and screen readers (not while dragged).
        sidebar.isDrawerOpen
          ? "shadow-lift ease-arrive translate-x-0 duration-(--move-marker)"
          : "ease-leave max-wide:not-data-dragging:invisible -translate-x-full duration-(--move-sink)",
        // While a finger moves it, it follows the finger with no slide of its own.
        "data-dragging:shadow-lift data-dragging:transition-none",
        "wide:sticky wide:top-0 wide:z-10 wide:h-screen wide:w-auto wide:max-w-none wide:translate-x-0 wide:shadow-none",
      )}
    >
      <SidebarHead consultancyName={name} logo={logo} onCloseDrawer={sidebar.closeDrawer} />
      <div className="wide:grid mx-auto mt-1.5 mb-6 hidden size-12 flex-none place-items-center">
        <BrandMark name={name} logo={logo} size="rail" />
      </div>
      <Navigation
        role={context.staff.role}
        modules={context.modules}
        onNavigate={sidebar.closeDrawer}
      />
      <SidebarFoot colourMode={colourMode} />
    </aside>
  );
}
