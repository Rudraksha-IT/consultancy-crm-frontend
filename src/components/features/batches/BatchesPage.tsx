"use client";

import Link from "next/link";
import { useState } from "react";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Loading } from "@/components/ui/Loading";
import { BATCH_TEXT } from "@/constants/batches";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import type { Batch, BatchPage } from "@/lib/api";

import { BatchMeta } from "./BatchMeta";
import { BatchStatus } from "./BatchStatus";
import { canManageClasses, canSeeClasses } from "./canUseClasses";
import { ClassDialogs, useClassDialogs } from "./ClassDialogs";
import { useBatchPage, type Loaded } from "./useBatchData";

/**
 * The Classes page (spec 22, 83-84): every class for Admins and Counsellors, a Teacher's own
 * classes for them. Shown only while the test-prep Module is on, and never to Front Desk.
 */
export function BatchesPage() {
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
  return <ClassesList isTeacher={context.staff.role === Role.Teacher} />;
}

const STAFF_WORDS = { intro: BATCH_TEXT.intro, empty: BATCH_TEXT.noClasses };
const TEACHER_WORDS = { intro: BATCH_TEXT.teacherIntro, empty: BATCH_TEXT.teacherNoClasses };

function ClassesList({ isTeacher }: { isTeacher: boolean }) {
  const words = isTeacher ? TEACHER_WORDS : STAFF_WORDS;
  const context = useCurrentStaff();
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const reload = () => {
    setVersion((current) => current + 1);
  };
  const state = useBatchPage(page, version);
  const dialogs = useClassDialogs();
  const canManage = canManageClasses(context);

  return (
    <div className="grid gap-8">
      <PageHeader
        title={BATCH_TEXT.title}
        subtitle={words.intro}
        actions={
          canManage && (
            <>
              <Button icon="userplus" onClick={dialogs.openEnroll}>
                {BATCH_TEXT.enroll}
              </Button>
              <Button variant="primary" icon="plus" onClick={dialogs.openNew}>
                {BATCH_TEXT.newClass}
              </Button>
            </>
          )
        }
      />
      <Panel>
        <ListBody
          state={state}
          emptyText={words.empty}
          onPeek={isTeacher ? null : dialogs.openPeek}
          onPage={setPage}
        />
      </Panel>
      <ClassDialogs
        dialogs={dialogs}
        classes={state.status === "loaded" ? state.data.batches : []}
        onChanged={reload}
      />
    </div>
  );
}

type ListBodyProps = {
  state: Loaded<BatchPage>;
  emptyText: string;
  /** Who's in it; Teachers open the class's page from its name instead. */
  onPeek: ((batch: Batch) => void) | null;
  onPage: (page: number) => void;
};

function ListBody({ state, emptyText, onPeek, onPage }: ListBodyProps) {
  if (state.status === "loading") return <Loading />;
  if (state.status !== "loaded") {
    return (
      <div className="px-gutter py-5">
        <Banner tone="problem">{BATCH_TEXT.listFailed}</Banner>
      </div>
    );
  }
  const page = state.data;
  if (page.count === 0) return <EmptyState>{emptyText}</EmptyState>;
  return (
    <>
      <RowList label={BATCH_TEXT.title}>
        {page.batches.map((batch) => (
          <RowItem
            key={batch.id}
            title={
              <Link
                href={ROUTES.batch(batch.id)}
                className="text-accent min-h-control inline-flex items-center hover:underline"
              >
                {batch.name}
              </Link>
            }
            meta={<BatchMeta batch={batch} hidesTeacherOnPhone />}
            keepsRightBesideOnPhone
            right={
              <>
                <BatchStatus batch={batch} />
                {onPeek !== null && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onPeek(batch);
                    }}
                  >
                    {BATCH_TEXT.whosInIt}
                    <span className="sr-only">{BATCH_TEXT.whosInItOf(batch.name)}</span>
                  </Button>
                )}
              </>
            }
          />
        ))}
      </RowList>
      <Pager
        summary={BATCH_TEXT.classesCount(page.count)}
        count={page.count}
        page={page.page}
        pageSize={page.pageSize}
        onPage={onPage}
      />
    </>
  );
}
