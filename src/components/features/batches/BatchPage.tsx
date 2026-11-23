"use client";

import type { RecordId } from "@/lib/recordId";
import Link from "next/link";
import { useState } from "react";

import { EmailFlow } from "@/components/features/communication/EmailFlow";
import { canMessageStudents } from "@/components/features/communication/canMessage";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Loading } from "@/components/ui/Loading";
import { BATCH_TEXT } from "@/constants/batches";
import { COMMUNICATION_TEXT } from "@/constants/communication";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import type { BatchWithStudents } from "@/lib/api";

import { AttendanceSection } from "./AttendanceSection";
import { BatchFormDialog } from "./BatchFormDialog";
import { canSeeClasses } from "./canUseClasses";
import { ClassDialog } from "./ClassDialog";
import { useBatch } from "./useBatchData";

const BACK = (
  <Link
    href={ROUTES.batches}
    className="text-secondary text-ink-2 min-h-control inline-flex items-center gap-1.5 self-start"
  >
    <Icon name="left" />
    {BATCH_TEXT.allClasses}
  </Link>
);

/**
 * One class's page (spec 83-85): its time and Teacher, its Students' Attendance day by day, and
 * for Admins and Counsellors Add Students, Edit class details and (with email on) Email the
 * class, which ticks its Students first (issue 04).
 */
export function BatchPage({ batchId }: { batchId: RecordId }) {
  const context = useCurrentStaff();
  if (!canSeeClasses(context)) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  return <LoadedClass batchId={batchId} />;
}

type Open = "add" | "edit" | "message" | null;

function LoadedClass({ batchId }: { batchId: RecordId }) {
  const [version, setVersion] = useState(0);
  const state = useBatch(batchId, version);
  const reload = () => {
    setVersion((current) => current + 1);
  };
  if (state.status === "loading") return <Loading />;
  if (state.status === "missing") {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.batches}>{BATCH_TEXT.allClasses}</ButtonLink>}>
          {BATCH_TEXT.notFound}
        </EmptyState>
      </Panel>
    );
  }
  if (state.status === "failed") return <Banner tone="problem">{BATCH_TEXT.classFailed}</Banner>;
  return <ClassView batch={state.data} onChanged={reload} />;
}

function ClassView({ batch, onChanged }: { batch: BatchWithStudents; onChanged: () => void }) {
  const [open, setOpen] = useState<Open>(null);
  const canMessage = canMessageStudents(useCurrentStaff());
  const close = () => {
    setOpen(null);
  };
  return (
    <div className="grid gap-8">
      <PageHeader
        title={batch.name}
        subtitle={BATCH_TEXT.withTeacher(batch.timeSlot, batch.teacher.name)}
        crumbs={BACK}
        actions={
          <>
            {canMessage && (
              <Button
                icon="send"
                onClick={() => {
                  setOpen("message");
                }}
              >
                {COMMUNICATION_TEXT.emailTheClass}
              </Button>
            )}
            {batch.canChange && (
              <Button
                icon="userplus"
                onClick={() => {
                  setOpen("add");
                }}
              >
                {BATCH_TEXT.addStudents}
              </Button>
            )}
          </>
        }
      />
      <AttendanceSection batch={batch} onSaved={onChanged} />
      {batch.canChange && (
        <div>
          <Button
            variant="ghost"
            icon="edit"
            onClick={() => {
              setOpen("edit");
            }}
          >
            {BATCH_TEXT.editClass}
          </Button>
        </div>
      )}
      <ClassPageDialog batch={batch} open={open} onClose={close} onChanged={onChanged} />
    </div>
  );
}

type ClassPageDialogProps = {
  batch: BatchWithStudents;
  open: Open;
  onClose: () => void;
  onChanged: () => void;
};

/** Add Students (who's in it) or Edit class, when one is open. */
function ClassPageDialog({ batch, open, onClose, onChanged }: ClassPageDialogProps) {
  if (open === "add") return <ClassDialog batch={batch} onClose={onClose} onChanged={onChanged} />;
  if (open === "message") {
    return (
      <EmailFlow mode="many" preTick={{ kind: "batch", batchId: batch.id }} onClose={onClose} />
    );
  }
  if (open === "edit") {
    const saved = () => {
      onClose();
      onChanged();
    };
    return <BatchFormDialog batch={batch} onClose={onClose} onSaved={saved} />;
  }
  return null;
}
