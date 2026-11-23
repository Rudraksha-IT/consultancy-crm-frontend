import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { HOME_TEXT } from "@/constants/home";

/** "See all (N)" under a short Home list, opening the full list (ticket 12). */
export function SeeAllLink({ href, count }: { href: string; count: number }) {
  return (
    <Link
      href={href}
      className="text-secondary text-accent min-h-control inline-flex items-center gap-1.5 justify-self-start font-semibold underline-offset-4 hover:underline"
    >
      {HOME_TEXT.seeAllCount(count)}
      <Icon name="right" size="sm" />
    </Link>
  );
}
