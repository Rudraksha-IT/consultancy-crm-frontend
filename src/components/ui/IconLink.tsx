import clsx from "clsx";
import Link from "next/link";

import { Icon, type IconName } from "./Icon";
import { ICON_TONE_CLASSES, type IconButtonTone } from "./IconButton";

type IconLinkProps = {
  href: string;
  icon: IconName;
  /** The link's accessible name; also shown as its tooltip. */
  label: string;
  isCurrent?: boolean;
  tone?: IconButtonTone;
};

/** A 44 by 44 link showing only a line icon, such as the Settings gear. */
export function IconLink({ href, icon, label, isCurrent = false, tone = "page" }: IconLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={isCurrent ? "page" : undefined}
      className={clsx(
        "size-control rounded-control grid flex-none place-items-center",
        ICON_TONE_CLASSES[tone],
      )}
    >
      <Icon name={icon} />
    </Link>
  );
}
