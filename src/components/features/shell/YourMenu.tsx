"use client";

import { useRef, type ReactNode, type Ref } from "react";

import { useLeaveOffice } from "@/components/features/supportAccess/useLeaveOffice";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import type { MenuItem } from "@/components/ui/Menu";
import { MenuList } from "@/components/ui/MenuList";
import { useMenu, type MenuState } from "@/components/ui/useMenu";
import { CLOCK_TEXT } from "@/constants/clock";
import { LABELS } from "@/constants/messages";
import { Module } from "@/constants/modules";
import { ROLE_LABELS } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { SUPPORT_TEXT } from "@/constants/supportAccess";
import type { StaffContext } from "@/lib/api";

import { useLogout } from "./useLogout";

type YourMenuProps = {
  staff: StaffContext["staff"];
  modules: StaffContext["modules"];
  /** Set while a Platform Admin is inside the office (issue 27). */
  supportAccess: StaffContext["supportAccess"];
};

/**
 * You, at the far right of the top bar (UI revamp, ticket 05): your initials open a small menu
 * with your name and Role, My working hours (while Clock-in is on), Settings and Log out. A
 * Platform Admin in Support Access has a shield for initials, no working hours of their own, and
 * leaves the office where Staff log out.
 */
export function YourMenu({ staff, modules, supportAccess }: YourMenuProps) {
  return supportAccess === null ? (
    <StaffMenu staff={staff} modules={modules} />
  ) : (
    <VisitorMenu name={staff.name} platformHost={supportAccess.platformHost} />
  );
}

function StaffMenu({ staff, modules }: Pick<YourMenuProps, "staff" | "modules">) {
  const { isLoggingOut, error, logOut } = useLogout();
  return (
    <PersonMenu
      name={staff.name}
      role={ROLE_LABELS[staff.role]}
      badge={<Avatar name={staff.name} />}
      hasWorkingHours={modules.includes(Module.ClockIn)}
      wayOut={{
        label: LABELS.logOut,
        busyLabel: LABELS.loggingOut,
        isBusy: isLoggingOut,
        error,
        go: logOut,
      }}
    />
  );
}

function VisitorMenu({ name, platformHost }: { name: string; platformHost: string }) {
  const { isLeaving, error, leave } = useLeaveOffice(platformHost);
  return (
    <PersonMenu
      name={name}
      role={LABELS.platformAdmin}
      badge={<ShieldBadge />}
      hasWorkingHours={false}
      wayOut={{
        label: SUPPORT_TEXT.leave,
        busyLabel: SUPPORT_TEXT.leaving,
        isBusy: isLeaving,
        error,
        go: leave,
      }}
    />
  );
}

/** Logging out, or leaving the office: the last item of the menu. */
type WayOut = {
  label: string;
  busyLabel: string;
  isBusy: boolean;
  error: string | null;
  go: () => Promise<void>;
};

type PersonMenuProps = {
  name: string;
  role: string;
  badge: ReactNode;
  hasWorkingHours: boolean;
  wayOut: WayOut;
};

function PersonMenu({ name, role, badge, hasWorkingHours, wayOut }: PersonMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menu = useMenu(rootRef, buttonRef);

  return (
    <div ref={rootRef} onKeyDown={menu.handleKeyDown} className="relative">
      <InitialsButton
        ref={buttonRef}
        name={name}
        badge={badge}
        menu={menu}
        busyLabel={wayOut.isBusy ? wayOut.busyLabel : null}
      />
      {menu.isOpen ? (
        <MenuList
          id={menu.menuId}
          label={LABELS.yourMenu}
          items={menuItems(hasWorkingHours, wayOut)}
          // The cursor goes back to the initials, whatever was picked (design-system rule 8).
          onChosen={menu.close}
          header={<Who name={name} role={role} />}
        />
      ) : (
        <Problem message={wayOut.error} />
      )}
    </div>
  );
}

/** My working hours (while Clock-in is on), Settings, then the way out. */
function menuItems(hasWorkingHours: boolean, wayOut: WayOut): MenuItem[] {
  const workingHours: MenuItem = {
    label: CLOCK_TEXT.myHoursTitle,
    icon: "clock",
    href: ROUTES.clock,
  };
  return [
    ...(hasWorkingHours ? [workingHours] : []),
    { label: LABELS.settings, icon: "gear", href: ROUTES.mySettings },
    {
      label: wayOut.label,
      icon: "logout",
      onSelect: () => {
        void wayOut.go();
      },
    },
  ];
}

type InitialsButtonProps = {
  ref: Ref<HTMLButtonElement>;
  name: string;
  badge: ReactNode;
  menu: MenuState;
  /** Set while logging out or leaving: the button says so and can't open the menu. */
  busyLabel: string | null;
};

/** The round button that opens your menu. Busy, it stays reachable so the cursor stays on it. */
function InitialsButton({ ref, name, badge, menu, busyLabel }: InitialsButtonProps) {
  const isBusy = busyLabel !== null;
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="menu"
      aria-expanded={menu.isOpen}
      aria-controls={menu.isOpen ? menu.menuId : undefined}
      aria-label={busyLabel ?? LABELS.yourMenuOf(name)}
      title={name}
      aria-disabled={isBusy}
      onClick={isBusy ? undefined : menu.toggle}
      className="group size-control rounded-pill grid flex-none cursor-pointer place-items-center aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
    >
      <span className="rounded-pill group-hover:ring-rule-2 group-aria-expanded:ring-rule-2 ring-2 ring-transparent">
        {badge}
      </span>
    </button>
  );
}

/** Why logging out or leaving failed, under the initials. */
function Problem({ message }: { message: string | null }) {
  if (message === null) return null;
  return (
    <p
      role="alert"
      className="w-menu rounded-menu border-rule bg-paper text-small text-bad shadow-lift absolute top-full right-0 z-20 mt-2 border px-3.5 py-2.5 font-semibold"
    >
      {message}
    </p>
  );
}

/** Whose menu it is: the name, with the Role under it. Not one of the menu's items. */
function Who({ name, role }: { name: string; role: string }) {
  return (
    <div role="presentation" className="border-rule mb-1 grid gap-0.5 border-b px-3.5 pt-2 pb-3">
      <b className="text-body truncate font-semibold">{name}</b>
      <span className="text-small text-ink-3">{role}</span>
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
