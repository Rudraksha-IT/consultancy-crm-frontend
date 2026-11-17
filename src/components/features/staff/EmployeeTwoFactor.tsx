"use client";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/useToast";
import { LABELS, MESSAGES } from "@/constants/messages";
import { resetEmployeeTwoFactor, type Employee } from "@/lib/api";

import { useSave } from "./useSave";

type TwoFactorLook = { tone: ChipTone; word: string };

/** How someone's two-step login reads: always a word, never a colour alone. */
function lookOf(employee: Employee): TwoFactorLook {
  if (!employee.twoFactorRequired) return { tone: "muted", word: LABELS.twoStepOff };
  return employee.twoFactorSetUp
    ? { tone: "good", word: LABELS.twoStepOnSetUp }
    : { tone: "warn", word: LABELS.twoStepOnNotSetUp };
}

/** "Two-step login" and a Chip: On, set up / On, not set up / Off (issue 62). */
export function EmployeeTwoFactorChip({ employee }: { employee: Employee }) {
  const look = lookOf(employee);
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <span className="text-small text-ink-2">{LABELS.twoStepLogin}</span>
      <Chip tone={look.tone}>{look.word}</Chip>
    </div>
  );
}

type ResetTwoFactorDialogProps = {
  employee: Employee;
  onClose: () => void;
  onSaved: (employee: Employee) => void;
};

/**
 * Reset the two-step login of someone who lost their phone (issue 62), once the Admin has read
 * that the person is signed out everywhere.
 */
export function ResetTwoFactorDialog({ employee, onClose, onSaved }: ResetTwoFactorDialogProps) {
  const { showToast } = useToast();
  const save = useSave();
  const firstName = employee.name.split(/\s+/)[0] ?? employee.name;

  function confirm(): Promise<void> {
    return save.run(async () => {
      const saved = await resetEmployeeTwoFactor(employee.id);
      showToast(MESSAGES.twoFactorWasReset(saved.name));
      onSaved(saved);
    });
  }

  return (
    <Dialog
      isOpen
      title={LABELS.resetTwoStepLoginFor(employee.name)}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{LABELS.cancel}</Button>
          <Button
            variant="danger"
            isLoading={save.isSaving}
            loadingLabel={LABELS.resetting}
            onClick={() => void confirm()}
          >
            {LABELS.reset}
          </Button>
        </>
      }
    >
      <p>{MESSAGES.twoFactorResetWarning(firstName)}</p>
      {employee.twoFactorRequired && <p>{MESSAGES.twoFactorResetNext}</p>}
      {save.error !== null && <Banner tone="problem">{save.error}</Banner>}
    </Dialog>
  );
}
