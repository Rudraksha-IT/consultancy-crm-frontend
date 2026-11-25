"use client";

import { useEffect, useMemo, useRef } from "react";

import { LABELS } from "@/constants/messages";
import { deriveOfficeTokens, type ColourMode, type ThemeConfig } from "@/lib/theme";

import { applyTheme } from "./applyTheme";

type ThemePreviewProps = {
  theme: ThemeConfig;
};

/** The Theme in light and dark, side by side, before it is saved. */
export function ThemePreview({ theme }: ThemePreviewProps) {
  const built = useMemo(() => deriveOfficeTokens(theme), [theme]);
  return (
    <div className="tablet:grid-cols-2 grid gap-4">
      <PreviewScreen built={built} mode="light" />
      <PreviewScreen built={built} mode="dark" />
    </div>
  );
}

type PreviewScreenProps = {
  built: ReturnType<typeof deriveOfficeTokens>;
  mode: ColourMode;
};

function PreviewScreen({ built, mode }: PreviewScreenProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current !== null) applyTheme(ref.current, built, mode);
  }, [built, mode]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={mode === "dark" ? LABELS.previewDark : LABELS.previewLight}
      className="rounded-control border-rule bg-canvas flex min-h-48 overflow-hidden border"
    >
      <div className="border-side-rule bg-side-bg grid w-24 content-start gap-2 border-r p-3">
        <span className="rounded-chip bg-accent size-6" />
        <span className="rounded-chip bg-side-active-ink before:bg-side-active-ink relative h-3 before:absolute before:inset-y-0 before:-left-3 before:w-1" />
        <span className="rounded-chip bg-side-muted h-3 w-3/4" />
        <span className="rounded-chip bg-side-muted h-3 w-2/3" />
      </div>
      <div className="flex-1 p-3">
        <div className="rounded-control border-rule bg-paper grid gap-2 border p-3">
          <span className="text-small text-ink font-semibold">{LABELS.previewTitle}</span>
          <span className="text-tiny text-ink-2">{LABELS.previewLine}</span>
          <span className="text-tiny text-accent font-semibold">{LABELS.previewLink}</span>
          <span className="rounded-control bg-accent text-tiny text-accent-ink justify-self-start px-3 py-1 font-semibold">
            {LABELS.previewButton}
          </span>
        </div>
      </div>
    </div>
  );
}
