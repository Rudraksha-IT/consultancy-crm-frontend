import { Role } from "@/constants/roles";
import { PROFILE_TEXT } from "@/constants/studentProfile";
import { PROVINCE_LABELS, type Province } from "@/constants/students";

/**
 * Why this Staff member can only look at a Student, shown above the profile (spec 34).
 * `counsellorName` is the Student's Assigned Counsellor, or null when they have none.
 */
export function viewOnlyReason(role: Role, counsellorName: string | null): string {
  if (role === Role.Counsellor) {
    return counsellorName === null
      ? "View only. This Lead has no counsellor yet. Front Desk or an Admin can assign one."
      : `View only. ${counsellorName} is this Student's counsellor. Only they or an Admin can make changes.`;
  }
  if (role === Role.FrontDesk) {
    return "View only. Front Desk can change only Leads with no counsellor.";
  }
  return "View only.";
}

/** How many whole years old someone born on `born` is on `today` (both "YYYY-MM-DD"). */
export function ageOn(born: string, today: string): number {
  const years = Number(today.slice(0, 4)) - Number(born.slice(0, 4));
  return today.slice(5) < born.slice(5) ? years - 1 : years;
}

/** The parts of an address in Nepal's format, as the profile shows them. */
export type AddressParts = {
  province: Province | "";
  district: string;
  municipality: string;
  ward: number | null;
  street: string;
};

/** An address on one line, from the street up to the province; "" when nothing is given. */
export function addressText(address: AddressParts): string {
  return [
    address.street,
    address.ward === null ? "" : PROFILE_TEXT.wardNumber(address.ward),
    address.municipality,
    address.district,
    address.province === "" ? "" : PROFILE_TEXT.provinceName(PROVINCE_LABELS[address.province]),
  ]
    .filter((part) => part !== "")
    .join(", ");
}
