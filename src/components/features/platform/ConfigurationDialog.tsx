"use client";

import { useRef, useState, type ReactNode, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Tabs } from "@/components/ui/Tabs";
import { TextField } from "@/components/ui/TextField";
import { ADMIN_TEXT } from "@/constants/consultancyStatus";
import { LABELS } from "@/constants/messages";
import type { ConsultancyOverview } from "@/lib/api";

import { FeatureSwitchList } from "./FeaturesDialog";
import { useAddAdmin } from "./useAddAdmin";
import { useSaveFeatures, type FeatureSwitches } from "./useSaveFeatures";

const PART = { features: "features", admins: "admins" } as const;
type Part = (typeof PART)[keyof typeof PART];

const PARTS = [
  { id: PART.features, label: LABELS.features },
  { id: PART.admins, label: LABELS.admins },
];

type ConfigurationDialogProps = {
  consultancy: ConsultancyOverview;
  onClose: () => void;
  /** Store the switches; the part shows a problem if it fails. */
  onSaveFeatures: (switches: FeatureSwitches) => Promise<void>;
  /** An Admin was invited; gets their name for the toast. */
  onAdminAdded: (name: string) => void;
};

/**
 * One Consultancy's Configuration on the Platform (ticket 16): its Features and Admins as
 * two parts, each saved on its own. The popup stays open after a save, and what was typed in a
 * part stays while another is open.
 */
export function ConfigurationDialog(props: ConfigurationDialogProps) {
  const { consultancy, onClose } = props;
  const [part, setPart] = useState<Part>(PART.features);

  return (
    <Dialog
      isOpen
      isWide
      title={LABELS.configurationFor(consultancy.name)}
      onClose={onClose}
      footer={<Button onClick={onClose}>{LABELS.finished}</Button>}
    >
      <Tabs
        label={LABELS.configurationParts}
        tabs={PARTS}
        selected={part}
        onSelect={(id) => {
          setPart(PARTS.find((one) => one.id === id)?.id ?? PART.features);
        }}
      >
        <Shown when={part === PART.features}>
          <FeaturesPart consultancy={consultancy} onSave={props.onSaveFeatures} />
        </Shown>
        <Shown when={part === PART.admins}>
          <AdminsPart consultancy={consultancy} onAdded={props.onAdminAdded} />
        </Shown>
      </Tabs>
    </Dialog>
  );
}

/** Every part stays mounted, so moving between them keeps what was typed. */
function Shown({ when, children }: { when: boolean; children: ReactNode }) {
  return (
    <div hidden={!when} className="grid gap-5">
      {children}
    </div>
  );
}

type FeaturesPartProps = {
  consultancy: ConsultancyOverview;
  onSave: (switches: FeatureSwitches) => Promise<void>;
};

function FeaturesPart({ consultancy, onSave }: FeaturesPartProps) {
  const state = useSaveFeatures(consultancy.modules, onSave);
  return (
    <>
      <FeatureSwitchList state={state} />
      <SaveRow>
        <Button
          variant="primary"
          isLoading={state.isSaving}
          loadingLabel={LABELS.saving}
          onClick={() => {
            void state.save();
          }}
        >
          {LABELS.saveFeatures}
        </Button>
      </SaveRow>
    </>
  );
}

type AdminsPartProps = { consultancy: ConsultancyOverview; onAdded: (name: string) => void };

/**
 * Invite an Admin into the office (issue 64): their name and email. They are emailed a Code and
 * choose their own password, as with any Invite. The form empties for the next one.
 */
function AdminsPart({ consultancy, onAdded }: AdminsPartProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const { isSending, fieldErrors, error, send } = useAddAdmin(consultancy.id, (name) => {
    formRef.current?.reset();
    onAdded(name);
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void send({ name: readField(form, "name"), email: readField(form, "email") });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-5" noValidate>
      <p className="text-ink-2">{ADMIN_TEXT.inviteExplained}</p>
      {error !== null && <Banner tone="problem">{error}</Banner>}
      <TextField label={ADMIN_TEXT.name} name="name" autoComplete="off" errors={fieldErrors.name} />
      <TextField
        label={ADMIN_TEXT.email}
        name="email"
        type="email"
        autoComplete="off"
        errors={fieldErrors.email}
      />
      <SaveRow>
        <Button type="submit" variant="primary" isLoading={isSending} loadingLabel={LABELS.sending}>
          {ADMIN_TEXT.sendInvite}
        </Button>
      </SaveRow>
    </form>
  );
}

/** A part's own save, at its end. */
function SaveRow({ children }: { children: ReactNode }) {
  return <div className="flex justify-end">{children}</div>;
}

function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
