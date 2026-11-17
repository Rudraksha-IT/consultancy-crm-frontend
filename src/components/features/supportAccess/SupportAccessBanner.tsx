"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SUPPORT_TEXT } from "@/constants/supportAccess";

import { useLeaveOffice } from "./useLeaveOffice";

type SupportAccessBannerProps = {
  office: string;
  platformHost: string;
  /** Ends the visit; the Staff logout by default. */
  endSession?: () => Promise<void>;
};

/**
 * Across the top of every screen while a Platform Admin is inside the office (spec 11b), so they
 * never forget where they are, with "Leave this office".
 */
export function SupportAccessBanner({
  office,
  platformHost,
  endSession,
}: SupportAccessBannerProps) {
  const { isLeaving, error, leave } = useLeaveOffice(platformHost, endSession);

  return (
    <div
      role="status"
      className="bg-warn-tint text-warn border-rule wide:px-10 flex flex-wrap items-center justify-between gap-4 border-b px-4 py-3"
    >
      <p className="text-secondary flex min-w-0 items-center gap-2.5 font-semibold">
        <Icon name="shield" className="shrink-0" />
        <span>{SUPPORT_TEXT.banner(office)}</span>
      </p>
      <span className="flex flex-wrap items-center gap-3">
        {error !== null && (
          <span role="alert" className="text-small text-bad font-semibold">
            {error}
          </span>
        )}
        <Button
          size="sm"
          isLoading={isLeaving}
          loadingLabel={SUPPORT_TEXT.leaving}
          onClick={() => {
            void leave();
          }}
        >
          {SUPPORT_TEXT.leave}
        </Button>
      </span>
    </div>
  );
}
