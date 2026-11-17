import { NAV_ENTRIES, type NavEntry } from "@/constants/navigation";
import type { Module } from "@/constants/modules";
import type { Role } from "@/constants/roles";

import type { NavItem } from "./types";

/** The screens a Staff member with `role` may open, given the Modules on for their Consultancy. */
export function buildNavigation(role: Role, modules: readonly Module[]): NavItem[] {
  return NAV_ENTRIES.filter(
    (entry) => entry.roles.includes(role) && isModuleOn(entry, modules),
  ).map(({ label, labelFor, href, icon, group }) => ({
    label: labelFor?.[role] ?? label,
    href,
    icon,
    group,
  }));
}

function isModuleOn(entry: NavEntry, modules: readonly Module[]): boolean {
  return entry.module === undefined || modules.includes(entry.module);
}
