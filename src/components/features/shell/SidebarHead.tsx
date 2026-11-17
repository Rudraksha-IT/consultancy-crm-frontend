import { BrandLockup } from "@/components/ui/BrandLockup";
import { BrandMark, type BrandLogo } from "@/components/ui/BrandMark";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { LABELS } from "@/constants/messages";

type SidebarHeadProps = {
  consultancyName: string;
  logo: BrandLogo | null;
  isCollapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  onCloseDrawer: () => void;
};

/**
 * The office's mark and name (a label, not a link), with the collapse button beside it. Collapsed,
 * the mark is the button that opens the sidebar again. In the slide-out menu the button closes it.
 */
export function SidebarHead({
  consultancyName,
  logo,
  isCollapsed,
  onCollapse,
  onExpand,
  onCloseDrawer,
}: SidebarHeadProps) {
  return (
    <>
      <div
        className={
          isCollapsed ? "wide:hidden flex items-center gap-1 p-3" : "flex items-center gap-1 p-3"
        }
      >
        <div className="flex min-w-0 flex-1 items-center px-2 py-2.5">
          <BrandLockup
            name={consultancyName}
            tagline={LABELS.consultancyTagline}
            logo={logo}
            tone="sidebar"
          />
        </div>
        {!isCollapsed && (
          <span className="wide:block hidden">
            <IconButton
              icon="sidebar"
              label={LABELS.collapseMenu}
              tone="sidebar"
              onClick={onCollapse}
            />
          </span>
        )}
        <span className="wide:hidden">
          <IconButton icon="x" label={LABELS.closeMenu} tone="sidebar" onClick={onCloseDrawer} />
        </span>
      </div>
      {isCollapsed && (
        <button
          type="button"
          aria-label={LABELS.expandMenu}
          title={LABELS.expandMenu}
          onClick={onExpand}
          className="group rounded-control text-side-ink wide:grid relative mx-auto mt-4 mb-2 hidden size-14 cursor-pointer place-items-center"
        >
          <span className="transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
            <BrandMark name={consultancyName} logo={logo} size="rail" />
          </span>
          <span className="rounded-control bg-side-hover absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Icon name="sidebar" size="lg" />
          </span>
        </button>
      )}
    </>
  );
}
