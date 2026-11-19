"use client";

import { useEffect, useState } from "react";

import { COMMUNICATION_TEXT as TEXT } from "@/constants/communication";
import { fetchChoosable, type PreTickSource } from "@/lib/api";

import { EmailComposer } from "./EmailComposer";
import type { EmailRecipient } from "./recipients";
import { StudentPicker } from "./StudentPicker";

type EmailFlowProps = {
  /** One Student (a click picks them) or many (tick, then write). */
  mode: "one" | "many";
  /** Tick these first: a class's Students or everyone the Student list's filters show. */
  preTick?: PreTickSource;
  onClose: () => void;
  /** An email went (or failed and was recorded), so lists of emails can load again. */
  onSent?: () => void;
};

type Step =
  | { kind: "loading" }
  | { kind: "picking"; chosen: readonly EmailRecipient[]; note: string | null }
  | { kind: "writing"; chosen: readonly EmailRecipient[]; note: string | null };

/**
 * Email a Student, or many (issue 04): choose who it goes to, then write it. Change goes back to
 * the choice with everyone still ticked.
 */
export function EmailFlow({ mode, preTick, onClose, onSent }: EmailFlowProps) {
  const [step, setStep] = useState<Step>(
    preTick === undefined ? { kind: "picking", chosen: [], note: null } : { kind: "loading" },
  );
  usePreTick(preTick, (chosen, note) => {
    setStep({ kind: "picking", chosen, note });
  });

  if (step.kind === "loading") return null;
  if (step.kind === "picking") {
    return (
      <StudentPicker
        mode={mode}
        chosen={step.chosen}
        note={step.note}
        onClose={onClose}
        onPick={(chosen) => {
          setStep({ kind: "writing", chosen, note: step.note });
        }}
      />
    );
  }
  const isBulk = mode === "many";
  const sent = () => {
    onSent?.();
    if (!isBulk) onClose();
  };
  return (
    <EmailComposer
      recipients={step.chosen}
      isBulk={isBulk}
      onClose={onClose}
      onSent={sent}
      {...(isBulk && {
        onChange: () => {
          setStep({ kind: "picking", chosen: step.chosen, note: step.note });
        },
      })}
    />
  );
}

/** Load who is ticked first, then hand them over, with a note when there were more than allowed. */
function usePreTick(
  source: PreTickSource | undefined,
  onLoaded: (chosen: readonly EmailRecipient[], note: string | null) => void,
): void {
  // Both are fixed while the flow is open.
  const [handOver] = useState(() => onLoaded);
  const [first] = useState(source);
  useEffect(() => {
    if (first === undefined) return undefined;
    let isCancelled = false;
    fetchChoosable(first).then(
      ({ students, count, max }) => {
        if (isCancelled) return;
        const chosen = students.map(({ id, name, email }) => ({ id, name, email }));
        handOver(chosen, count > chosen.length ? TEXT.moreThanMax(count, max) : null);
      },
      () => {
        if (!isCancelled) handOver([], TEXT.preTickFailed);
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [first, handOver]);
}
