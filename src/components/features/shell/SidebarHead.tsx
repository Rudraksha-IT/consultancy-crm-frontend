import { BrandLockup } from "@/components/ui/BrandLockup";
import type { BrandLogo } from "@/components/ui/BrandMark";
import { IconButton } from "@/components/ui/IconButton";
import { LABELS } from "@/constants/messages";

type SidebarHeadProps = {
  consultancyName: string;
  logo: BrandLogo | null;
  onCloseDrawer: () => void;
};

/**
 * The top of the slide-out menu (1024px and below): the office's mark and name (a label, not a
 * link), with the button that closes the menu.
 */
export function SidebarHead({ consultancyName, logo, onCloseDrawer }: SidebarHeadProps) {
  return (
    <div className="wide:hidden flex items-center gap-1 p-3">
      <div className="flex min-w-0 flex-1 items-center px-2 py-2.5">
        <BrandLockup name={consultancyName} logo={logo} />
      </div>
      <IconButton icon="x" label={LABELS.closeMenu} tone="sidebar" onClick={onCloseDrawer} />
    </div>
  );
}
