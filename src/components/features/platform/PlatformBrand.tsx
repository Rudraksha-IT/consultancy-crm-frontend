"use client";

import { VISITOR_KEY } from "@/components/features/auth/AuthThemeToggle";
import { AuthBrand } from "@/components/features/consultancy/ConsultancyBrand";
import { useAppliedTheme } from "@/components/features/theme/useAppliedTheme";
import { useColourMode } from "@/components/features/theme/useColourMode";
import { LABELS } from "@/constants/messages";
import { DEFAULT_THEME } from "@/lib/theme";

import { useProductLogo } from "./productLogo";

type PlatformBrandProps = {
  /** A line under the product's name, e.g. "Staff login" on the Central login; none by default. */
  tagline?: string;
};

/** The product's own brand (Platform and Central login), in the default Theme. */
export function PlatformBrand({ tagline }: PlatformBrandProps) {
  const { mode } = useColourMode(VISITOR_KEY);
  useAppliedTheme(DEFAULT_THEME, mode);
  const logo = useProductLogo();
  return <AuthBrand name={LABELS.productName} tagline={tagline} logo={logo} />;
}
