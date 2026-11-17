"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { UnexpectedError } from "@/components/features/errors/UnexpectedError";
import { onUnexpectedError } from "@/lib/api";

type ShownError = { reference: string; path: string };

/**
 * When the server answers a call with an unexpected error, its reference on every screen
 * (issue 58), so staff can quote it to us; until the person moves to another page.
 */
export function UnexpectedErrorBanner() {
  const path = usePathname();
  const [shown, setShown] = useState<ShownError | null>(null);

  useEffect(
    () =>
      onUnexpectedError((reference) => {
        setShown({ reference, path: window.location.pathname });
      }),
    [],
  );

  if (shown?.path !== path) return null;
  return <UnexpectedError reference={shown.reference} />;
}
