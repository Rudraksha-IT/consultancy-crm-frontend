"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";

/**
 * An address that doesn't exist (issue 66): back to the Platform for `/platform/...`, else to
 * Home. Both send someone logged out to their login page.
 */
export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();
  const isPlatform =
    pathname === ROUTES.platformHome || pathname.startsWith(`${ROUTES.platformHome}/`);
  const home = isPlatform ? ROUTES.platformHome : ROUTES.home;

  useEffect(() => {
    router.replace(home);
  }, [router, home]);

  return (
    <main className="bg-canvas grid min-h-full place-items-center px-4 py-16">
      <p className="text-ink-2">{MESSAGES.pageNotFound}</p>
    </main>
  );
}
