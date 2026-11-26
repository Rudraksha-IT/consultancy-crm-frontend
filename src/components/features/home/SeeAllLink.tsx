import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { HOME_TEXT } from "@/constants/home";

/**
 * "See all (N)" beside a Home section's title, opening the full list (ticket 12; beside the
 * title, never under the sheet, since UI revamp 07). Pass it as the Section's `aside`.
 */
export function SeeAllLink({ href, count }: { href: string; count: number }) {
  return (
    <Link
      href={href}
      className="text-accent min-h-control inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline"
    >
      {HOME_TEXT.seeAllCount(count)}
      <Icon name="right" size="sm" />
    </Link>
  );
}
