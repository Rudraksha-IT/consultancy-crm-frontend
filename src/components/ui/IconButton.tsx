import clsx from "clsx";
import type { ReactNode, Ref } from "react";

import { Icon, type IconName } from "./Icon";

export type IconButtonTone = "page" | "sidebar";

/** How an icon-only control looks on the page or on the sidebar colours (the Platform header). */
export const ICON_TONE_CLASSES: Record<IconButtonTone, string> = {
  page: "text-ink-2 hover:bg-fill hover:text-ink aria-expanded:bg-fill aria-expanded:text-ink max-phone:active:bg-fill-2",
  sidebar: "text-side-muted hover:bg-side-hover hover:text-side-ink max-phone:active:bg-side-hover",
};

type IconButtonProps = {
  icon: IconName;
  /** The button's accessible name; also shown as its tooltip. */
  label: string;
  onClick?: () => void;
  tone?: IconButtonTone | undefined;
  isDisabled?: boolean;
  isExpanded?: boolean;
  /** The id of what the button opens or closes. */
  controls?: string;
  /** Extra content on top of the icon, such as an unread count. */
  badge?: ReactNode;
  /** For giving the cursor back to the button, such as after what it opened closes. */
  ref?: Ref<HTMLButtonElement>;
};

/** A 44 by 44 button showing only a line icon; always named by `label`. */
export function IconButton({
  icon,
  label,
  onClick,
  tone = "page",
  isDisabled = false,
  isExpanded,
  controls,
  badge,
  ref,
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      aria-expanded={isExpanded}
      aria-controls={controls}
      onClick={onClick}
      disabled={isDisabled}
      className={clsx(
        "size-control rounded-control relative grid flex-none cursor-pointer place-items-center disabled:cursor-not-allowed disabled:opacity-50",
        ICON_TONE_CLASSES[tone],
      )}
    >
      <Icon name={icon} />
      {badge}
    </button>
  );
}
