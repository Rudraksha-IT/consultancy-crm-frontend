"use client";

import { useEffect, useId, useState, type SubmitEvent } from "react";

import { canSeeClasses } from "@/components/features/batches/canUseClasses";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, type SelectOption } from "@/components/ui/SelectField";
import { COMMUNICATION_TEXT as TEXT } from "@/constants/communication";
import { LABELS } from "@/constants/messages";
import { JOURNEY_STAGES, STAGE_LABELS, Stage, isStage } from "@/constants/stages";
import { fetchBatches, type Batch, type BulkRecipients, type BulkResult } from "@/lib/api";

import { NO_STUDENT_FILTERS } from "@/lib/students";

import { BulkMessageDialog } from "./BulkMessageDialog";
import { useBulkCount } from "./useBulkCount";

const STAGES: readonly Stage[] = [...JOURNEY_STAGES, Stage.Lost];
const STAGE_OPTIONS: SelectOption[] = STAGES.map((stage) => ({
  value: `stage:${stage}`,
  label: TEXT.stageOption(STAGE_LABELS[stage]),
}));

type NewBulkMessageDialogProps = {
  onClose: () => void;
  onSent: (result: BulkResult) => void;
};

/**
 * Email & SMS → Send email or SMS (spec 90): choose who it goes to, a Stage or (with classes on, for
 * those who see them) a class, then write it.
 */
export function NewBulkMessageDialog({ onClose, onSent }: NewBulkMessageDialogProps) {
  const [picked, setPicked] = useState<{ recipients: BulkRecipients; label: string } | null>(null);
  if (picked === null) {
    return (
      <PickDialog
        onClose={onClose}
        onNext={(recipients, label) => {
          setPicked({ recipients, label });
        }}
      />
    );
  }
  return (
    <BulkMessageDialog
      recipients={picked.recipients}
      title={TEXT.newBulkMessage}
      subtitle={picked.label}
      onClose={onClose}
      onSent={onSent}
    />
  );
}

type PickDialogProps = {
  onClose: () => void;
  onNext: (recipients: BulkRecipients, label: string) => void;
};

function PickDialog({ onClose, onNext }: PickDialogProps) {
  const formId = useId();
  const classes = useClassChoices();
  const options = [
    ...STAGE_OPTIONS,
    ...classes.map((batch) => ({
      value: `batch:${String(batch.id)}`,
      label: TEXT.classOption(batch.name),
    })),
  ];
  const [value, setValue] = useState(STAGE_OPTIONS[0]?.value ?? "");
  const recipients = recipientsFor(value);
  const count = useBulkCount(recipients);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const label = options.find((option) => option.value === value)?.label ?? "";
    onNext(recipients, label);
  }

  return (
    <Dialog
      isOpen
      title={TEXT.newBulkMessage}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{LABELS.cancel}</Button>
          <Button type="submit" form={formId} variant="primary" icon="right">
            {TEXT.next}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <SelectField
          label={TEXT.sendTo}
          name="send-to"
          options={options}
          value={value}
          onChange={setValue}
          hint={countHint(count)}
        />
      </form>
    </Dialog>
  );
}

/** The classes this person may message, if classes are on and they see them; none otherwise. */
function useClassChoices(): Batch[] {
  const context = useCurrentStaff();
  const seesClasses = canSeeClasses(context);
  const [classes, setClasses] = useState<Batch[]>([]);

  useEffect(() => {
    if (!seesClasses) return;
    let isCancelled = false;
    fetchBatches(1).then(
      (page) => {
        if (!isCancelled) setClasses(page.batches);
      },
      () => {
        // Without the list, only Stages are offered.
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [seesClasses]);

  return seesClasses ? classes : [];
}

/** "stage:lead" or "batch:3" as who it goes to. */
function recipientsFor(value: string): BulkRecipients {
  const [kind = "", id = ""] = value.split(":");
  if (kind === "batch") return { kind: "batch", batchId: Number(id) };
  const stage = isStage(id) ? id : Stage.Lead;
  return { kind: "students", filters: { ...NO_STUDENT_FILTERS, stage } };
}

function countHint(count: ReturnType<typeof useBulkCount>): string {
  if (count.status === "loading") return TEXT.counting;
  if (count.status === "failed") return TEXT.countFailed;
  return TEXT.studentCount(count.count.count);
}
