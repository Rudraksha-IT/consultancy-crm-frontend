import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

import { useLeaveOffice } from "@/components/features/supportAccess/useLeaveOffice";
import { ThemeToggle } from "@/components/features/theme/ThemeToggle";
import type { ColourModeState } from "@/components/features/theme/useColourMode";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { usePhoneWidth } from "@/components/ui/usePhoneWidth";
import { LABELS } from "@/constants/messages";
import { ROLE_LABELS } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { SUPPORT_TEXT } from "@/constants/supportAccess";
import type { StaffContext } from "@/lib/api";

import { LogoutButton } from "./LogoutButton";

type SidebarUserProps = {
  staff: StaffContext["staff"];
  /** Set while a Platform Admin is inside the office (issue 27). */
  supportAccess: StaffContext["supportAccess"];
  colourMode: ColourModeState;
  isCollapsed: boolean;
};

/**
 * Who is logged in, at the bottom of the sidebar: a link to their Settings, and Log out (with
 * light/dark before it on phones, where the top bar drops it). A Platform Admin has a shield in
 * place of initials, and logging out leaves the office.
 */
export function SidebarUser({ staff, supportAccess, colourMode, isCollapsed }: SidebarUserProps) {
  const isPhone = usePhoneWidth();
  const themeToggle = isPhone && (
    <ThemeToggle mode={colourMode.mode} onToggle={colourMode.toggleMode} tone="sidebar" />
  );
  return supportAccess === null ? (
    <UserRow
      name={staff.name}
      role={ROLE_LABELS[staff.role]}
      badge={<Avatar name={staff.name} />}
      action={
        <>
          {themeToggle}
          <LogoutButton />
        </>
      }
      isCollapsed={isCollapsed}
    />
  ) : (
    <UserRow
      name={staff.name}
      role={LABELS.platformAdmin}
      badge={<ShieldBadge />}
      action={
        <>
          {themeToggle}
          <LeaveButton platformHost={supportAccess.platformHost} />
        </>
      }
      isCollapsed={isCollapsed}
    />
  );
}

type UserRowProps = {
  name: string;
  role: string;
  badge: ReactNode;
  action: ReactNode;
  isCollapsed: boolean;
};

function UserRow({ name, role, badge, action, isCollapsed }: UserRowProps) {
  return (
    <div
      className={clsx(
        "border-side-rule flex items-center gap-1 border-t p-3",
        isCollapsed && "wide:flex-col wide:px-0",
      )}
    >
      <Link
        href={ROUTES.mySettings}
        aria-label={LABELS.personAndRole(name, role)}
        title={LABELS.settings}
        className="rounded-control text-side-ink hover:bg-side-hover flex min-w-0 flex-1 items-center gap-2.5 p-1.5 no-underline"
      >
        {badge}
        <span className={clsx("grid min-w-0 leading-5", isCollapsed && "wide:hidden")}>
          <b className="text-secondary truncate font-semibold">{name}</b>
          <span className="text-small text-side-muted truncate">{role}</span>
        </span>
      </Link>
      {action}
    </div>
  );
}

/** A Platform Admin's badge: a shield where Staff have their initials. Decorative. */
function ShieldBadge() {
  return (
    <span
      aria-hidden="true"
      className="rounded-pill bg-warn-tint text-warn size-mark grid flex-none place-items-center"
    >
      <Icon name="shield" />
    </span>
  );
}

/** Log out, for a Platform Admin: leaves the office and goes back to the Platform. */
function LeaveButton({ platformHost }: { platformHost: string }) {
  const { isLeaving, error, leave } = useLeaveOffice(platformHost);
  return (
    <>
      {error !== null && (
        <p role="alert" className="text-small text-bad font-semibold">
          {error}
        </p>
      )}
      <IconButton
        icon="logout"
        label={isLeaving ? SUPPORT_TEXT.leaving : SUPPORT_TEXT.leave}
        tone="sidebar"
        isDisabled={isLeaving}
        onClick={() => {
          void leave();
        }}
      />
    </>
  );
}
