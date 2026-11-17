"use client";

import { useState } from "react";

import { ThemeEditor } from "@/components/features/theme/ThemeEditor";
import { ThemePreview } from "@/components/features/theme/ThemePreview";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { LABELS, MESSAGES } from "@/constants/messages";
import type { ConsultancyOverview } from "@/lib/api";
import type { ThemeConfig } from "@/lib/theme";

type ColoursDialogProps = {
  consultancy: ConsultancyOverview;
  onClose: () => void;
  /** Stores the colours; the dialog shows a problem if it fails. */
  onSave: (theme: ThemeConfig) => Promise<void>;
};

/**
 * An office's colours (its Theme), chosen only by a Platform Admin on the Platform: the editor
 * and a live preview in light and dark, saved together.
 */
export function ColoursDialog({ consultancy, onClose, onSave }: ColoursDialogProps) {
  const [draft, setDraft] = useState(consultancy.theme);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(): Promise<void> {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(draft);
    } catch {
      setError(MESSAGES.saveColoursFailed);
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      isOpen
      isWide
      title={LABELS.coloursFor(consultancy.name)}
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
            {LABELS.saveColours}
          </Button>
        </>
      }
    >
      <p className="text-ink-2">{MESSAGES.coloursHelp}</p>
      {error !== null && <Banner tone="problem">{error}</Banner>}
      <ThemeEditor value={draft} onChange={setDraft} />
      <ThemePreview theme={draft} />
    </Dialog>
  );
}
