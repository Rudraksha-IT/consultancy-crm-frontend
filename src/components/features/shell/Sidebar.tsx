import clsx from "clsx";
import type { Ref } from "react";

import type { ColourModeState } from "@/components/features/theme/useColourMode";
import type { StaffContext } from "@/lib/api";

import { Navigation } from "./Navigation";
import { SidebarHead } from "./SidebarHead";
import { SidebarUser } from "./SidebarUser";
import type { SidebarState } from "./useSidebar";

export const SIDEBAR_ID = "side-nav";

type SidebarProps = {
  context: StaffContext;
  sidebar: SidebarState;
  /** Light/dark sits in the sidebar's bottom row on phones (design system: Phones). */
  colourMode: ColourModeState;
  /** The menu itself, which a finger swipe moves (issue 89). */
  ref?: Ref<HTMLElement>;
};

/** The sidebar above 1024px, and the slide-out menu at 1024px and below. */
export function Sidebar({ context, sidebar, colourMode, ref }: SidebarProps) {
  const { isCollapsed, isDrawerOpen } = sidebar;
  return (
    <aside
      ref={ref}
      id={SIDEBAR_ID}
      className={clsx(
        "w-drawer border-side-rule bg-side-bg text-side-ink fixed inset-y-0 left-0 z-40 flex max-w-[86vw] flex-col overflow-hidden border-r transition-transform",
        isDrawerOpen ? "shadow-lift translate-x-0" : "-translate-x-full",
        // While a finger moves it, it follows the finger with no slide of its own.
        "data-dragging:shadow-lift data-dragging:transition-none",
        "wide:sticky wide:top-0 wide:z-10 wide:h-screen wide:w-auto wide:max-w-none wide:translate-x-0 wide:shadow-none",
      )}
    >
      <SidebarHead
        consultancyName={context.consultancy.name}
        logo={context.consultancy.logo}
        isCollapsed={isCollapsed}
        onCollapse={() => {
          sidebar.setIsCollapsed(true);
        }}
        onExpand={() => {
          sidebar.setIsCollapsed(false);
        }}
        onCloseDrawer={sidebar.closeDrawer}
      />
      <Navigation
        role={context.staff.role}
        modules={context.modules}
        isCollapsed={isCollapsed}
        onNavigate={sidebar.closeDrawer}
      />
      <SidebarUser
        staff={context.staff}
        supportAccess={context.supportAccess}
        colourMode={colourMode}
        isCollapsed={isCollapsed}
      />
    </aside>
  );
}
