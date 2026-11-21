import Link from "next/link";

import { Icon } from "@/components/ui/Icon";

/** The link back to the parent screen, above a page title. */
export function BackLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="text-secondary text-ink-2 min-h-control inline-flex items-center gap-1.5 self-start"
    >
      <Icon name="left" />
      {children}
    </Link>
  );
}
