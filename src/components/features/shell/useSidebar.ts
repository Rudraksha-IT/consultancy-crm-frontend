"use client";

import { useEffect, useState } from "react";

import { useStoredValue } from "@/hooks/useStoredValue";

const COLLAPSED_KEY = "crm.sidebar-collapsed";

export type SidebarState = {
  /** Above 1024px: shown as an 80px icon strip. The browser remembers it. */
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  /** At 1024px and below: the slide-out menu is open. */
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

export function useSidebar(): SidebarState {
  const [collapsed, storeCollapsed] = useStoredValue(COLLAPSED_KEY);
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
    isCollapsed: collapsed === "true",
    setIsCollapsed: (isCollapsed) => {
      storeCollapsed(String(isCollapsed));
    },
    isDrawerOpen,
    openDrawer: () => {
      setIsDrawerOpen(true);
    },
    closeDrawer: () => {
      setIsDrawerOpen(false);
    },
  };
}
