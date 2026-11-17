"use client";

import { createContext, useContext } from "react";

/** A count beside a menu item, e.g. my Tasks due now, and a way to ask for it again. */
export type MenuCount = {
  count: number;
  /** Ask the server again, e.g. after a change. */
  refresh: () => void;
};

function doNothing(): void {
  return undefined;
}

const NO_COUNT: MenuCount = { count: 0, refresh: doNothing };

/**
 * Transfer Requests waiting for my answer (spec 44d), shared by the AppShell. Outside it there is
 * no count to show, and nothing to refresh.
 */
export const TransferCountContext = createContext<MenuCount>(NO_COUNT);

/** The Transfer requests count and a way to refresh it after an answer. */
export function useTransferCount(): MenuCount {
  return useContext(TransferCountContext);
}
