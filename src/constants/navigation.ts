import type { IconName } from "@/components/ui/icons";

import { Module } from "./modules";
import { ROUTES } from "./routes";
import { ROLES, Role } from "./roles";

/** The sidebar's two parts: everyday work, then the office-wide screens under "Business". */
export type NavGroup = "work" | "business";

export type NavEntry = {
  label: string;
  href: string;
  icon: IconName;
  group: NavGroup;
  /** The Module that must be on for the entry to show; none means always shown. */
  module?: Module;
  /** The Roles that may use the screen. */
  roles: readonly Role[];
  /** A different label for some Roles, e.g. Front Desk's Home is the visitor desk. */
  labelFor?: Partial<Record<Role, string>>;
};

const ADMIN_ONLY = [Role.Admin] as const;
const ALL_BUT_TEACHER = [Role.Admin, Role.Counsellor, Role.FrontDesk] as const;

/** Every top-level screen, in display order. Batches are shown as "Classes" (GLOSSARY). */
export const NAV_ENTRIES: readonly NavEntry[] = [
  {
    label: "Home",
    labelFor: { [Role.FrontDesk]: "Visitor desk" },
    href: ROUTES.home,
    icon: "home",
    group: "work",
    roles: ROLES,
  },
  {
    label: "Students",
    href: ROUTES.students,
    icon: "users",
    group: "work",
    module: Module.Students,
    roles: ALL_BUT_TEACHER,
  },
  {
    label: "Applications",
    href: ROUTES.applications,
    icon: "list",
    group: "work",
    module: Module.Applications,
    roles: ALL_BUT_TEACHER,
  },
  {
    label: "Visas",
    href: ROUTES.visas,
    icon: "plane",
    group: "work",
    module: Module.Visas,
    roles: ALL_BUT_TEACHER,
  },
  {
    label: "Documents",
    href: ROUTES.documents,
    icon: "file",
    group: "work",
    module: Module.Documents,
    roles: [Role.Admin, Role.Counsellor],
  },
  {
    label: "Classes",
    href: ROUTES.batches,
    icon: "batches",
    group: "work",
    module: Module.Batches,
    roles: [Role.Admin, Role.Counsellor, Role.Teacher],
  },
  {
    label: "Tasks",
    href: ROUTES.tasks,
    icon: "tasks",
    group: "work",
    module: Module.Tasks,
    roles: ROLES,
  },
  {
    label: "Inbox",
    href: ROUTES.inbox,
    icon: "inbox",
    group: "work",
    roles: ROLES,
  },
  {
    label: "Transfer requests",
    href: ROUTES.transferRequests,
    icon: "transfer",
    group: "work",
    module: Module.Students,
    roles: ALL_BUT_TEACHER,
  },
  {
    label: "Email",
    href: ROUTES.messages,
    icon: "send",
    group: "work",
    module: Module.Communication,
    roles: ALL_BUT_TEACHER,
  },
  {
    label: "Accounts",
    href: ROUTES.accounts,
    icon: "wallet",
    group: "business",
    module: Module.Accounts,
    roles: ADMIN_ONLY,
  },
  {
    label: "Employees",
    href: ROUTES.staff,
    icon: "badge",
    group: "business",
    module: Module.Staff,
    roles: ADMIN_ONLY,
  },
  {
    label: "Reports",
    href: ROUTES.reports,
    icon: "chart",
    group: "business",
    module: Module.Reports,
    roles: ADMIN_ONLY,
  },
  {
    label: "Configuration",
    href: ROUTES.configuration,
    icon: "sliders",
    group: "business",
    module: Module.Configuration,
    roles: ADMIN_ONLY,
  },
];
