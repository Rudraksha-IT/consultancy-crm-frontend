"use client";

import { useEffect, useState } from "react";

export type SidebarState = {
  /** At 1024px and below: the slide-out menu is open. */
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

/** The slide-out menu at 1024px and below; above it the side menu is always there. */
export function useSidebar(): SidebarState {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isDrawerOpen) return undefined;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setIsDrawerOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDrawerOpen]);

  return {
    isDrawerOpen,
    openDrawer: () => {
      setIsDrawerOpen(true);
    },
    closeDrawer: () => {
      setIsDrawerOpen(false);
    },
  };
}
