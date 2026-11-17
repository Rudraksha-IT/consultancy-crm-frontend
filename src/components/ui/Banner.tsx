import clsx from "clsx";
import type { ReactNode } from "react";

import { Icon, type IconName } from "./Icon";

export type BannerTone = "info" | "warning" | "problem" | "neutral";

const TONE_CLASSES: Record<BannerTone, string> = {
  info: "bg-tint text-accent",
  warning: "bg-warn-tint text-warn",
  problem: "bg-bad-tint text-bad",
  neutral: "bg-fill-2 text-ink",
};

type BannerProps = {
  children: ReactNode;
  tone?: BannerTone;
  action?: ReactNode;
  /** A line icon that fits the message, e.g. a lock for view only. */
  icon?: IconName;
};

/** A message across the page. Problems are announced as alerts, everything else as a status. */
export function Banner({ children, tone = "neutral", action, icon = "alert" }: BannerProps) {
  return (
    <div
      role={tone === "problem" ? "alert" : "status"}
      className={clsx(
        "rounded-control text-body flex flex-wrap items-center justify-between gap-4 px-5 py-4",
        TONE_CLASSES[tone],
      )}
    >
      <div className="flex items-start gap-3">
        <Icon name={icon} className="mt-0.5 shrink-0" />
        <div>{children}</div>
      </div>
      {action}
    </div>
  );
}
