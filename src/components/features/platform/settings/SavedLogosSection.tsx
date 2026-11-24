"use client";

import Image from "next/image";
import { useRef } from "react";

import { RemoveLogoButton } from "@/components/features/configuration/RemoveLogoButton";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { DateDisplay } from "@/constants/dates";
import { SAVED_LOGOS_TEXT as TEXT } from "@/constants/platformTeam";
import type { SavedLogo, SavedLogos } from "@/lib/api";
import { APP_LOGO_URL } from "@/lib/brand/appLogo";
import { formatDateTime } from "@/lib/dates/display";
import type { RecordId } from "@/lib/recordId";

import type { useSavedLogos } from "./useSavedLogos";

const APP_LOGO_KEY = "app";

type SavedLogosSectionProps = { logos: ReturnType<typeof useSavedLogos> };

/**
 * Platform → Settings → Saved logos (first live fixes, ticket 07): the app's own logo first, then
 * every upload, newest first. The one in use says "In use"; the others offer "Use this"; uploads
 * can be removed after confirming. Focus stays on the tile used, or the list after a removal.
 */
export function SavedLogosSection({ logos }: SavedLogosSectionProps) {
  return (
    <Section title={TEXT.title}>
      <p className="text-ink-2">{TEXT.help}</p>
      <Panel isPadded>
        <div className="grid gap-4">
          {logos.isLoadFailed && <Banner tone="problem">{TEXT.loadFailed}</Banner>}
          {logos.saved !== null && <SavedLogoList logos={logos} saved={logos.saved} />}
          {logos.problem !== null && <Banner tone="problem">{logos.problem}</Banner>}
        </div>
      </Panel>
    </Section>
  );
}

type SavedLogoListProps = SavedLogosSectionProps & { saved: SavedLogos };

function SavedLogoList({ logos, saved }: SavedLogoListProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const isAppInUse = !saved.logos.some((logo) => logo.inUse);

  async function pick(id: RecordId | null): Promise<void> {
    if (!(await logos.pick(id))) return;
    const key = id ?? APP_LOGO_KEY;
    listRef.current?.querySelector<HTMLElement>(`[data-logo="${key}"]`)?.focus();
  }

  return (
    <>
      <ul
        ref={listRef}
        aria-label={TEXT.title}
        tabIndex={-1}
        className="phone:grid-cols-[repeat(auto-fill,minmax(var(--spacing-logo-tile),1fr))] grid grid-cols-2 gap-3"
      >
        <LogoTile
          tileKey={APP_LOGO_KEY}
          name={TEXT.appLogo}
          src={APP_LOGO_URL}
          isInUse={isAppInUse}
          isBusy={logos.isBusy}
          onUse={() => void pick(null)}
        />
        {saved.logos.map((logo) => (
          <LogoTile
            key={logo.id}
            tileKey={logo.id}
            name={uploadedName(logo)}
            src={logo.fileUrl}
            isInUse={logo.inUse}
            isBusy={logos.isBusy}
            onUse={() => void pick(logo.id)}
            onRemove={async () => {
              await logos.remove(logo.id);
              listRef.current?.focus();
            }}
          />
        ))}
      </ul>
      {saved.logos.length >= saved.limit && (
        <Banner tone="warning">{TEXT.full(saved.limit)}</Banner>
      )}
    </>
  );
}

function uploadedName(logo: SavedLogo): string {
  return TEXT.uploaded(formatDateTime(logo.uploadedAt, DateDisplay.AD));
}

type LogoTileProps = {
  tileKey: string;
  name: string;
  src: string;
  isInUse: boolean;
  isBusy: boolean;
  onUse: () => void;
  /** Uploads only; the app's own logo can't be removed. */
  onRemove?: () => Promise<void>;
};

function LogoTile({ tileKey, name, src, isInUse, isBusy, onUse, onRemove }: LogoTileProps) {
  return (
    <li
      data-logo={tileKey}
      aria-label={name}
      tabIndex={-1}
      className="rounded-panel border-rule data-[in-use]:border-accent grid min-w-0 content-start gap-3 border p-3"
      data-in-use={isInUse ? "" : undefined}
    >
      <div className="bg-fill rounded-control grid h-18 place-items-center p-2">
        <Image
          src={src}
          alt=""
          width={0}
          height={0}
          unoptimized
          className="h-14 w-auto max-w-full object-contain"
        />
      </div>
      <p className="text-small truncate font-semibold" title={name}>
        {name}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {isInUse ? (
          <Chip tone="good" icon="check">
            {TEXT.inUse}
          </Chip>
        ) : (
          <Button size="sm" isDisabled={isBusy} label={TEXT.pickLabel(name)} onClick={onUse}>
            {TEXT.useThis}
          </Button>
        )}
        {onRemove !== undefined && (
          <RemoveLogoButton
            title={TEXT.removeTitle}
            body={TEXT.removeBody}
            label={TEXT.removeLabel(name)}
            isDisabled={isBusy}
            onRemove={onRemove}
          />
        )}
      </div>
    </li>
  );
}
