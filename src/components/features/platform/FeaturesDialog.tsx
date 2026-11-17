"use client";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Switch } from "@/components/ui/Switch";
import { LABELS, MESSAGES } from "@/constants/messages";
import { FEATURES, SWITCHABLE_MODULES } from "@/constants/modules";
import type { Module } from "@/constants/modules";

import { useSaveFeatures, type FeatureSwitches } from "./useSaveFeatures";

type FeaturesDialogProps = {
  /** The office whose features these are, and the Modules it has on now. */
  office: { name: string; modules: readonly Module[] };
  onClose: () => void;
  /** Stores every switch; the dialog shows a problem if it fails. */
  onSave: (switches: FeatureSwitches) => Promise<void>;
};

/** One switch per extra feature (switchable Module) an office can have, saved together. */
export function FeaturesDialog({ office, onClose, onSave }: FeaturesDialogProps) {
  const { switches, setSwitch, isSaving, error, save } = useSaveFeatures(office.modules, onSave);

  return (
    <Dialog
      isOpen
      title={LABELS.featuresFor(office.name)}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{LABELS.cancel}</Button>
          <Button
            variant="primary"
            isLoading={isSaving}
            loadingLabel={LABELS.saving}
            onClick={() => {
              void save();
            }}
          >
            {LABELS.saveFeatures}
          </Button>
        </>
      }
    >
      <p className="text-ink-2">{MESSAGES.featuresIntro}</p>
      {error !== null && <Banner tone="problem">{error}</Banner>}
      <div className="divide-rule grid divide-y">
        {SWITCHABLE_MODULES.map((module) => (
          <Switch
            key={module}
            label={FEATURES[module].label}
            description={FEATURES[module].description}
            isOn={switches[module]}
            onChange={(isOn) => {
              setSwitch(module, isOn);
            }}
          />
        ))}
      </div>
    </Dialog>
  );
}
