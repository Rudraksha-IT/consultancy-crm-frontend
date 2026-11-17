"use client";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { PROFILE_TEXT } from "@/constants/studentProfile";
import { PassportWarning } from "@/constants/students";
import type { StudentProfile } from "@/lib/api";

type PassportProps = { profile: Pick<StudentProfile, "passportWarning" | "passportExpiryDate"> };

/** "Passport expired on …" or "Passport expires on …"; null when the passport is fine. */
function useWarningText({ profile }: PassportProps): string | null {
  const dates = useDates();
  const { passportWarning: warning, passportExpiryDate: expiry } = profile;
  if (warning === null || expiry === null) return null;
  const day = dates.date(expiry);
  return warning === PassportWarning.Expired
    ? PROFILE_TEXT.passportExpired(day)
    : PROFILE_TEXT.passportExpires(day);
}

/** The warning in the profile's header: a word and an icon, never colour alone (spec 35c). */
export function PassportWarningChip(props: PassportProps) {
  const text = useWarningText(props);
  if (text === null) return null;
  return (
    <Chip tone="warn" hasDot={false}>
      <Icon name="alert" size="sm" />
      {text}
    </Chip>
  );
}

/** The warning at the top of the Passport section, saying what to do. */
export function PassportWarningBanner(props: PassportProps) {
  const text = useWarningText(props);
  if (text === null) return null;
  return (
    <Banner tone="warning">
      {text}. {PROFILE_TEXT.renewPassport}
    </Banner>
  );
}
