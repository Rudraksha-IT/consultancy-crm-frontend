"use client";

import { VISITOR_KEY } from "@/components/features/auth/AuthThemeToggle";
import { useAppliedTheme } from "@/components/features/theme/useAppliedTheme";
import { useColourMode } from "@/components/features/theme/useColourMode";
import { Banner } from "@/components/ui/Banner";
import { BrandMark, type BrandLogo } from "@/components/ui/BrandMark";
import { LABELS, MESSAGES } from "@/constants/messages";
import { DEFAULT_THEME } from "@/lib/theme";

import { useCurrentConsultancy } from "./useCurrentConsultancy";

/** Nobody is logged in yet: light, unless this browser's visitor switched to dark. */
const VISITOR = VISITOR_KEY;

/** The office's mark and name, large and centred, on the login and password screens. */
export function ConsultancyBrand() {
  const state = useCurrentConsultancy();
  const { mode } = useColourMode(VISITOR);
  useAppliedTheme(state.status === "loaded" ? state.consultancy.theme : DEFAULT_THEME, mode);

  if (state.status !== "loaded") return <BrandPending isLoading={state.status === "loading"} />;
  const { statusMessage } = state.consultancy;
  return (
    <>
      <AuthBrand
        name={state.consultancy.name}
        tagline={LABELS.consultancyTagline}
        logo={state.consultancy.logo}
      />
      {/* Why this office can't be used, or can only be read (issue 42), before anyone logs in. */}
      {statusMessage !== null && (
        <Banner tone="warning" icon="lock">
          {statusMessage}
        </Banner>
      )}
    </>
  );
}

type AuthBrandProps = {
  name: string;
  /** A line under the name; nothing is shown without one. */
  tagline?: string | undefined;
  logo?: BrandLogo | null;
};

/** The office's logo (or initials) and name, large and centred; the name is always written. */
export function AuthBrand({ name, tagline, logo = null }: AuthBrandProps) {
  return (
    <div className="grid justify-items-center gap-4 text-center">
      <BrandMark name={name} logo={logo === null ? null : { ...logo, showName: true }} size="lg" />
      <div>
        <h2 className="text-page-title-sm">{name}</h2>
        {tagline !== undefined && <p className="text-ink-3 mt-1">{tagline}</p>}
      </div>
    </div>
  );
}

/** While the office loads, or (behind OfficeGate, rarely) if it can't be found. */
function BrandPending({ isLoading }: { isLoading: boolean }) {
  if (isLoading) return <p className="text-ink-2 text-center">{MESSAGES.loading}</p>;
  return (
    <p role="alert" className="text-bad text-center font-semibold">
      {MESSAGES.consultancyNotFound}
    </p>
  );
}
