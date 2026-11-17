import clsx from "clsx";

import { BrandMark, showsOfficeName, type BrandLogo } from "./BrandMark";

type BrandLockupProps = {
  name: string;
  tagline: string;
  logo?: BrandLogo | null;
  /** `sidebar` uses the sidebar's own muted colour for the tagline. */
  tone?: "page" | "sidebar";
};

/** The office's mark with its name and tagline beside it, unless its logo stands alone. */
export function BrandLockup({ name, tagline, logo = null, tone = "page" }: BrandLockupProps) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <BrandMark name={name} logo={logo} />
      {showsOfficeName(logo) && (
        <span className="grid min-w-0 leading-5">
          <b className="text-body truncate font-bold">{name}</b>
          <span
            className={clsx(
              "text-small truncate",
              tone === "sidebar" ? "text-side-muted" : "text-ink-3",
            )}
          >
            {tagline}
          </span>
        </span>
      )}
    </span>
  );
}
