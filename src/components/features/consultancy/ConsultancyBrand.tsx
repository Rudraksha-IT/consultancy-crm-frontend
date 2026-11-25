"use client";

import { VISITOR_KEY } from "@/components/features/auth/AuthThemeToggle";
import { useAppliedTheme } from "@/components/features/theme/useAppliedTheme";
import { useColourMode } from "@/components/features/theme/useColourMode";
import { Banner } from "@/components/ui/Banner";
import { BrandMark, type BrandLogo } from "@/components/ui/BrandMark";
import { Loading } from "@/components/ui/Loading";
import { LABELS, MESSAGES } from "@/constants/messages";
import { useTabTitle } from "@/hooks/useTabTitle";
import { APP_LOGO_URL } from "@/lib/brand/appLogo";
import type { ThemeConfig } from "@/lib/theme";

import { useCurrentConsultancy } from "./useCurrentConsultancy";

/** Nobody is logged in yet: light, unless this browser's visitor switched to dark. */
const VISITOR = VISITOR_KEY;

/** The app's own logo (ticket 08), shown when the office has none, with the name beside it. */
const APP_LOGO: BrandLogo = { url: APP_LOGO_URL, showName: true };

type ConsultancyBrandProps = {
  /** The login page (ticket 08): "Welcome back, <office>" in place of the name alone. */
  isWelcome?: boolean;
};

/**
 * The office's mark and name, large and centred, on the login and password screens: its logo, or
 * the app's own logo when it has none (first live fixes, ticket 08). Also names the page and the
 * office in the browser tab.
 */
export function ConsultancyBrand({ isWelcome = false }: ConsultancyBrandProps) {
  const state = useCurrentConsultancy();
  const consultancy = state.status === "loaded" ? state.consultancy : null;
  useOfficeLook(consultancy);

  if (consultancy === null) return <BrandPending isLoading={state.status === "loading"} />;
  return <LoadedBrand consultancy={consultancy} isWelcome={isWelcome} />;
}

type LoadedBrandProps = {
  consultancy: LoadedOffice & { logo: BrandLogo | null; statusMessage: string | null };
  isWelcome: boolean;
};

function LoadedBrand({ consultancy, isWelcome }: LoadedBrandProps) {
  return (
    <>
      <AuthBrand
        name={consultancy.name}
        heading={isWelcome ? LABELS.welcomeBack(consultancy.name) : undefined}
        logo={consultancy.logo ?? APP_LOGO}
      />
      <StatusNotice message={consultancy.statusMessage} />
    </>
  );
}

type LoadedOffice = { name: string; theme: ThemeConfig };

/** The Ivory theme on the page (one look for every office), and the office's name in the tab. */
function useOfficeLook(office: LoadedOffice | null): void {
  const { mode } = useColourMode(VISITOR);
  useAppliedTheme(mode);
  useTabTitle(office === null ? null : office.name, null);
}

/** Why this office can't be used, or can only be read (issue 42), before anyone logs in. */
function StatusNotice({ message }: { message: string | null }) {
  if (message === null) return null;
  return (
    <Banner tone="warning" icon="lock">
      {message}
    </Banner>
  );
}

type AuthBrandProps = {
  name: string;
  /** What the heading says in place of the name, e.g. "Welcome back, <office>". */
  heading?: string | undefined;
  /** A line under the name; nothing is shown without one. */
  tagline?: string | undefined;
  logo?: BrandLogo | null;
};

/** The office's logo (or initials) and name, large and centred; the name is always written. */
export function AuthBrand({ name, heading, tagline, logo = null }: AuthBrandProps) {
  return (
    <div className="grid justify-items-center gap-4 text-center">
      <BrandMark name={name} logo={logo === null ? null : { ...logo, showName: true }} size="lg" />
      <div>
        <h2 className="text-page-title-sm">{heading ?? name}</h2>
        {tagline !== undefined && <p className="text-ink-3 mt-1">{tagline}</p>}
      </div>
    </div>
  );
}

/** While the office loads, or (behind OfficeGate, rarely) if it can't be found. */
function BrandPending({ isLoading }: { isLoading: boolean }) {
  if (isLoading) return <Loading />;
  return (
    <p role="alert" className="text-bad text-center font-semibold">
      {MESSAGES.consultancyNotFound}
    </p>
  );
}
