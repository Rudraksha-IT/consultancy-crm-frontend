"use client";

import { ROUTES } from "@/constants/routes";
import { useSession, type SessionState } from "@/hooks/useSession";
import { fetchPlatformAdmin, type PlatformAdmin } from "@/lib/api";

/** Load the logged-in Platform Admin; send visitors who aren't logged in to the Platform login. */
export function usePlatformSession(): SessionState<PlatformAdmin> {
  return useSession(fetchPlatformAdmin, ROUTES.platformLogin);
}
