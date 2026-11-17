import type { IconName } from "@/components/ui/icons";
import type { NavGroup } from "@/constants/navigation";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  group: NavGroup;
};
