"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { STATUS_TEXT } from "@/constants/consultancyStatus";
import { onRestriction, type Restriction } from "@/lib/api";
import { statusNotice, type ShownStatus } from "@/lib/consultancyStatus/notice";

type RefusedChange = { restriction: Restriction; path: string };

/**
 * The office's Status on every screen (spec 13d): a warning while it is Past due or Suspended, or
 * its evaluation ends within 3 days. When the server refuses a change because of the Status, its
 * reason replaces the warning as a problem, until the person moves to another page.
 */
export function ConsultancyStatusBanner({ shown }: { shown: ShownStatus }) {
  const path = usePathname();
  const [now] = useState(() => new Date());
  const [refused, setRefused] = useState<RefusedChange | null>(null);

  useEffect(
    () =>
      onRestriction((restriction) => {
        setRefused({ restriction, path: window.location.pathname });
      }),
    [],
  );

  if (refused !== null && refused.path === path) {
    return (
      <Banner tone="problem" icon="lock">
        <strong className="font-semibold">{STATUS_TEXT.changeRefusedTitle}</strong>{" "}
        {refused.restriction.message}
      </Banner>
    );
  }
  const notice = statusNotice(shown, now);
  if (notice === null) return null;
  return (
    <Banner tone={notice.tone} icon={notice.isReadOnly ? "lock" : "clock"}>
      {notice.message}
    </Banner>
  );
}
