"use client";

import { useState } from "react";

import { FeaturesDialog } from "@/components/features/platform/FeaturesDialog";
import type { FeatureSwitches } from "@/components/features/platform/useSaveFeatures";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { useToast } from "@/components/ui/useToast";
import { LABELS, MESSAGES } from "@/constants/messages";
import { FEATURES, isSwitchable } from "@/constants/modules";
import { ROUTES } from "@/constants/routes";
import { SUPPORT_TEXT } from "@/constants/supportAccess";
import { useFullPageNavigation } from "@/hooks/useFullPageNavigation";
import { downloadOfficeData, switchOfficeModules } from "@/lib/api";

type PlatformControlsProps = {
  /** Stores the switches; the office's own endpoint by default. */
  saveSwitches?: (switches: FeatureSwitches) => Promise<unknown>;
  /** Fetches the download; the office's own endpoint by default. */
  download?: () => Promise<Blob>;
  /** Hands the file to the browser to save. */
  saveFile?: (file: Blob, name: string) => void;
};

/**
 * Configuration → Platform controls (spec 11a): only a Platform Admin inside the office sees it.
 * The office's features, "Change features", and "Download all of this office's data". Resetting a
 * password or signing someone out is under Employees → Manage.
 */
export function PlatformControls({
  saveSwitches = switchOfficeModules,
  download = downloadOfficeData,
  saveFile = saveWithBrowser,
}: PlatformControlsProps) {
  return (
    <section aria-labelledby="platform-controls" className="grid gap-4">
      <div className="grid content-start gap-2">
        <h2 id="platform-controls" className="text-section-title flex items-center gap-2">
          <Icon name="shield" className="text-warn" />
          {SUPPORT_TEXT.controlsTitle}
        </h2>
        <p className="text-small text-ink-2">{SUPPORT_TEXT.controlsIntro}</p>
      </div>
      <Panel isPadded>
        <div className="grid gap-5">
          <OfficeFeatures saveSwitches={saveSwitches} />
          <OfficeDownload download={download} saveFile={saveFile} />
          <p className="text-small text-ink-2">{SUPPORT_TEXT.manageNote}</p>
        </div>
      </Panel>
    </section>
  );
}

/** The features the office has, and "Change features" (the same dialog as on the Platform). */
function OfficeFeatures({ saveSwitches }: Required<Pick<PlatformControlsProps, "saveSwitches">>) {
  const { consultancy, modules } = useCurrentStaff();
  const navigate = useFullPageNavigation();
  const [isChanging, setIsChanging] = useState(false);
  const features = modules.filter(isSwitchable);

  return (
    <div className="grid gap-3">
      <b>{SUPPORT_TEXT.featuresForOffice}</b>
      {features.length === 0 ? (
        <p className="text-ink-2">{MESSAGES.onlyStandardFeatures}</p>
      ) : (
        <ul aria-label={LABELS.featuresOn} className="flex flex-wrap gap-2">
          {features.map((module) => (
            <li key={module}>
              <Chip tone="accent" hasDot={false}>
                {FEATURES[module].label}
              </Chip>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button
          icon="sliders"
          onClick={() => {
            setIsChanging(true);
          }}
        >
          {SUPPORT_TEXT.changeFeatures}
        </Button>
      </div>
      {isChanging && (
        <FeaturesDialog
          office={{ name: consultancy.name, modules }}
          onClose={() => {
            setIsChanging(false);
          }}
          onSave={async (switches) => {
            await saveSwitches(switches);
            // The menu and every screen follow the Modules, so the app loads again with them.
            navigate(ROUTES.configuration);
          }}
        />
      )}
    </div>
  );
}

type OfficeDownloadProps = Required<Pick<PlatformControlsProps, "download" | "saveFile">>;

/** "Download all of this office's data": a ZIP of CSV files the browser saves. */
function OfficeDownload({ download, saveFile }: OfficeDownloadProps) {
  const { consultancy } = useCurrentStaff();
  const { showToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadData(): Promise<void> {
    setIsDownloading(true);
    setError(null);
    try {
      saveFile(await download(), fileName(consultancy.name));
      showToast(SUPPORT_TEXT.downloaded);
    } catch {
      setError(SUPPORT_TEXT.downloadFailed);
    }
    setIsDownloading(false);
  }

  return (
    <div className="grid gap-3">
      <div>
        <Button
          icon="download"
          isLoading={isDownloading}
          loadingLabel={SUPPORT_TEXT.downloading}
          onClick={() => {
            void downloadData();
          }}
        >
          {SUPPORT_TEXT.download}
        </Button>
      </div>
      {error !== null && <Banner tone="problem">{error}</Banner>}
    </div>
  );
}

/** e.g. "Acme Education data 2026-11-04.zip": only letters, digits and spaces from the name. */
function fileName(office: string): string {
  const safe = office.replace(/[^A-Za-z0-9 ]/g, "").trim() || "office";
  return `${safe} data ${new Date().toISOString().slice(0, 10)}.zip`;
}

function saveWithBrowser(file: Blob, name: string): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
