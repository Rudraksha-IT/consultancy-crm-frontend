"use client";

import { TRANSFER_COUNT_REFRESH_MS } from "@/constants/transferRequests";
import { fetchTransferRequestCount } from "@/lib/api";

import type { MenuCount } from "./menuCount";
import { useCountLoader } from "./useCountLoader";

/**
 * Transfer Requests waiting for my answer, for the menu (spec 44d). Asked for only when
 * `isWanted`: Teachers have no Transfer requests screen. See `useCountLoader`.
 */
export function useTransferCountLoader(isWanted: boolean): MenuCount {
  return useCountLoader(askTransferCount, TRANSFER_COUNT_REFRESH_MS, isWanted);
}

function askTransferCount(): Promise<number> {
  return fetchTransferRequestCount();
}
