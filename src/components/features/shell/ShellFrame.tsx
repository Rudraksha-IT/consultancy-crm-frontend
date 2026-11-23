"use client";

import clsx from "clsx";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { SupportAccessBanner } from "@/components/features/supportAccess/SupportAccessBanner";
import { useAppliedTheme } from "@/components/features/theme/useAppliedTheme";
import { useSavedColourMode } from "@/components/features/theme/useSavedColourMode";
import { LABELS } from "@/constants/messages";
import { useTabTitle } from "@/hooks/useTabTitle";
import { saveColourMode, type StaffContext } from "@/lib/api";
import { buildNavigation } from "@/lib/navigation";

import { ConsultancyStatusBanner } from "./ConsultancyStatusBanner";
import { OfficeNetworkCheck } from "./OfficeNetworkCheck";
import { PullGap } from "./PullGap";
import { ShellThemeContext } from "./shellTheme";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { TopBar } from "./TopBar";
import { usePagePull, type PagePullView } from "./usePagePull";
import { useSidebar } from "./useSidebar";
import { useSidebarSwipe } from "./useSidebarSwipe";
import { UnexpectedErrorBanner } from "./UnexpectedErrorBanner";

const MAIN_ID = "main";

function keepForThisVisit(): Promise<void> {
  return Promise.resolve();
}

type ShellFrameProps = {
  context: StaffContext;
  children: ReactNode;
};

/**
 * The logged-in layout in the Consultancy's Theme: sidebar, top bar and the page, with the tab bar
 * at the bottom on phones (design system: Phones).
 */
export function ShellFrame({ context, children }: ShellFrameProps) {
  useTabTitle(context.consultancy.name, context.staff.role);
  // A Platform Admin has no account here to save it in (issue 27): it lasts for the visit.
  const colourMode = useSavedColourMode(
    context.colourMode,
    context.supportAccess === null ? saveColourMode : keepForThisVisit,
  );
  const sidebar = useSidebar();
  const menuRef = useRef<HTMLElement>(null);
  useSidebarSwipe(sidebar, menuRef);
  const pull = useShellPagePull(context, sidebar.isDrawerOpen);
  const [theme, setTheme] = useState(context.theme);
  const shellTheme = useMemo(() => ({ theme, setTheme }), [theme]);
  useAppliedTheme(theme, colourMode.mode);

  return (
    <ShellThemeContext value={shellTheme}>
      <div
        className={clsx(
          "grid min-h-full transition-[grid-template-columns]",
          sidebar.isCollapsed
            ? "wide:grid-cols-[var(--spacing-rail)_minmax(0,1fr)]"
            : "wide:grid-cols-[var(--spacing-sidebar)_minmax(0,1fr)]",
        )}
      >
        <a
          href={`#${MAIN_ID}`}
          className="rounded-control bg-paper sr-only z-50 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:p-3"
        >
          {LABELS.skipToContent}
        </a>
        <Sidebar ref={menuRef} context={context} sidebar={sidebar} colourMode={colourMode} />
        {sidebar.isDrawerOpen && (
          <div
            aria-hidden="true"
            onClick={sidebar.closeDrawer}
            className="bg-scrim wide:hidden fixed inset-0 z-39"
          />
        )}
        <div className="flex min-w-0 flex-col">
          {context.supportAccess !== null && (
            <SupportAccessBanner
              office={context.consultancy.name}
              platformHost={context.supportAccess.platformHost}
            />
          )}
          <TopBar
            context={context}
            colourMode={colourMode}
            isDrawerOpen={sidebar.isDrawerOpen}
            onOpenDrawer={sidebar.openDrawer}
          />
          <PulledPage pull={pull}>
            <ConsultancyStatusBanner shown={context.consultancy} />
            <UnexpectedErrorBanner />
            {children}
          </PulledPage>
        </div>
        <TabBar
          role={context.staff.role}
          modules={context.modules}
          isMenuOpen={sidebar.isDrawerOpen}
          onOpenMenu={sidebar.openDrawer}
        />
      </div>
      <OfficeNetworkCheck context={context} />
    </ShellThemeContext>
  );
}

/** Swiping between the pages of the person's own sidebar (issue 90). */
function useShellPagePull(context: StaffContext, isDrawerOpen: boolean): PagePullView {
  const pathname = usePathname();
  const router = useRouter();
  const isOn = context.pageSwipe === true;
  // With Swipe between pages off for the office (Configuration), no page has a neighbour.
  const pages = useMemo(
    () => (isOn ? buildNavigation(context.staff.role, context.modules) : []),
    [isOn, context.staff.role, context.modules],
  );
  const navigate = (href: string): void => {
    router.push(href);
  };
  return usePagePull({ pages, pathname, isDrawerOpen, navigate });
}

/** The page follows the pull: down when pulled at the top, up when pulled at the bottom. */
function pulledStyle({ hint }: PagePullView): CSSProperties | undefined {
  if (hint === null) return undefined;
  const shift = hint.edge === "top" ? hint.shift : -hint.shift;
  return { translate: `0px ${String(shift)}px` };
}

/**
 * The page's content, which moves with a pull and leaves a gap above or below it (issue 90).
 * It fills the screen below the top bar even when the page is short, so the bottom gap opens at
 * the bottom of the screen, never straight under the content.
 */
function PulledPage({ pull, children }: { pull: PagePullView; children: ReactNode }) {
  const isLeaving = pull.move !== null;
  return (
    <div className="relative flex min-w-0 flex-1 flex-col">
      <PullGap edge="top" hint={pull.hint} isLeaving={isLeaving} />
      <main
        id={MAIN_ID}
        data-pulled={pull.hint?.edge}
        data-page-move={pull.move ?? undefined}
        style={pulledStyle(pull)}
        className={clsx(
          // On phones it leaves room under the content for the tab bar.
          "px-page wide:pt-10 max-phone:pt-4 max-phone:pb-tabbar-room relative min-w-0 flex-1 pt-7 pb-30",
          // Snaps back in 0.2 s; while pulled it eases after each scroll step, like the gap.
          "transition-[translate] duration-200 ease-in-out",
          "data-pulled:bg-canvas data-pulled:duration-150 data-pulled:ease-out",
          "data-[pulled=top]:shadow-edge-top data-[pulled=bottom]:shadow-edge-bottom",
        )}
      >
        <div className="max-w-content mx-auto grid grid-cols-1 gap-8">{children}</div>
      </main>
      <PullGap edge="bottom" hint={pull.hint} isLeaving={isLeaving} />
    </div>
  );
}
