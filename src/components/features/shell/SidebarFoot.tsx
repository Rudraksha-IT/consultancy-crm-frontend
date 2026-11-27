"use client";

import Image from "next/image";

import { useProductName } from "@/components/features/brand/ProductName";
import { ThemeToggle } from "@/components/features/theme/ThemeToggle";
import type { ColourModeState } from "@/components/features/theme/useColourMode";
import { usePhoneWidth } from "@/components/ui/usePhoneWidth";
import { APP_LOGO_URL } from "@/lib/brand/appLogo";

/**
 * The foot of the side menu (UI revamp, ticket 05): the product's own mark, alone, with no line
 * above it. On phones light/dark sits beside it, since the top bar drops it there.
 */
export function SidebarFoot({ colourMode }: { colourMode: ColourModeState }) {
  const product = useProductName();
  const isPhone = usePhoneWidth();
  return (
    <div className="pb-menu-foot wide:px-1.5 relative flex flex-none items-center justify-center px-4 pt-3.5">
      <Image
        src={APP_LOGO_URL}
        alt={product}
        title={product}
        width={0}
        height={0}
        unoptimized
        className="size-control flex-none"
      />
      {isPhone && (
        <span className="absolute top-3.5 right-3">
          <ThemeToggle mode={colourMode.mode} onToggle={colourMode.toggleMode} tone="sidebar" />
        </span>
      )}
    </div>
  );
}
