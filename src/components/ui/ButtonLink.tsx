import Link from "next/link";
import type { ReactNode } from "react";

import { buttonClasses, type ButtonSize, type ButtonVariant } from "./buttonStyles";
import { Icon, type IconName } from "./Icon";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
};

/** A link to another screen that looks like a button. */
export function ButtonLink({
  href,
  children,
  variant = "secondary",
  size = "md",
  icon,
}: ButtonLinkProps) {
  return (
    <Link href={href} data-variant={variant} className={buttonClasses(variant, size)}>
      {icon !== undefined && <Icon name={icon} size="sm" />}
      {children}
    </Link>
  );
}
