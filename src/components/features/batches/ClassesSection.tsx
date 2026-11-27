"use client";

import type { RecordId } from "@/lib/recordId";
import Link from "next/link";
import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Loading } from "@/components/ui/Loading";
import { BATCH_TEXT, ClassesTab } from "@/constants/batches";
import { ROUTES } from "@/constants/routes";
import type { Batch, EnrolledStudent } from "@/lib/api";

import { ClassDialogs, useClassDialogs } from "./ClassDialogs";
import { useBatchPage, useEnrolledStudents, type Loaded } from "./useBatchData";

/**
 * The Counsellor Home's Classes (spec 86a): a button per class that opens who is in
 * it, and "Students and their classes", with a tab between them.
 */
export function ClassesSection() {
  const [tab, setTab] = useState<ClassesTab>(ClassesTab.Classes);
  const [version, setVersion] = useState(0);
  const batches = useBatchPage(1, version);
  const enrolled = useEnrolledStudents(1, version);
  const dialogs = useClassDialogs();
  const classes = batches.status === "loaded" ? batches.data.batches : [];
  const peekById = (id: RecordId) => {
    const batch =
      batches.status === "loaded" ? batches.data.batches.find((b) => b.id === id) : null;
    if (batch !== undefined && batch !== null) dialogs.openPeek(batch);
  };

  return (
    <Section
      title={BATCH_TEXT.classesHeading}
      aside={
        <>
          <Button icon="userplus" onClick={dialogs.openEnroll}>
            {BATCH_TEXT.enroll}
          </Button>
          <Button icon="plus" onClick={dialogs.openNew}>
            {BATCH_TEXT.newClass}
          </Button>
        </>
      }
    >
      <SegmentedControl
        label={BATCH_TEXT.show}
        options={[
          {
            value: ClassesTab.Classes,
            label: BATCH_TEXT.tabClasses(batches.status === "loaded" ? batches.data.count : 0),
          },
          {
            value: ClassesTab.Students,
            label: BATCH_TEXT.tabStudents(enrolled.status === "loaded" ? enrolled.data.count : 0),
          },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === ClassesTab.Classes ? (
        <ClassButtons state={batches} classes={classes} onPeek={dialogs.openPeek} />
      ) : (
        <EnrolledTable state={enrolled} onPeek={peekById} />
      )}
      <ClassDialogs
        dialogs={dialogs}
        classes={classes}
        onChanged={() => {
          setVersion((value) => value + 1);
        }}
      />
    </Section>
  );
}

type ClassButtonsProps = {
  state: Loaded<unknown>;
  classes: readonly Batch[];
  onPeek: (batch: Batch) => void;
};

function ClassButtons({ state, classes, onPeek }: ClassButtonsProps) {
  if (state.status === "loading") return <Loading />;
  if (state.status !== "loaded") return <Banner tone="problem">{BATCH_TEXT.listFailed}</Banner>;
  if (classes.length === 0) {
    return (
      <Panel>
        <EmptyState>{BATCH_TEXT.noClasses}</EmptyState>
      </Panel>
    );
  }
  return (
    <Panel>
      {/* One sheet; the first row's top line falls outside it and is cut off. */}
      <div className="tablet:grid-cols-2 wide:grid-cols-3 -mt-px grid">
        {classes.map((batch) => (
          <button
            key={batch.id}
            type="button"
            onClick={() => {
              onPeek(batch);
            }}
            className="border-rule hover:bg-fill px-gutter grid cursor-pointer gap-2 border-t py-4 text-left"
          >
            <span className="text-card-title text-ink">{batch.name}</span>
            <span className="text-secondary text-ink-2 inline-flex items-center gap-2">
              <Icon name="clock" size="sm" />
              {batch.timeSlot}
            </span>
            <span className="text-secondary text-ink-2 inline-flex items-center gap-2">
              <Icon name="users" size="sm" />
              {BATCH_TEXT.studentCount(batch.studentCount)}
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

const HEAD = "text-small text-ink-2 bg-fill px-6 py-3 text-left font-semibold";
const CELL = "px-6 py-4 align-middle max-tablet:px-6 max-tablet:py-1";

type EnrolledTableProps = {
  state: Loaded<{ students: EnrolledStudent[] }>;
  onPeek: (batchId: RecordId) => void;
};

/** Each Student in a class, the classes they're in, and how much they attended. */
function EnrolledTable({ state, onPeek }: EnrolledTableProps) {
  if (state.status === "loading") return <Loading />;
  if (state.status !== "loaded") return <Banner tone="problem">{BATCH_TEXT.enrolledFailed}</Banner>;
  const { students } = state.data;
  return (
    <Panel>
      {students.length === 0 ? (
        <EmptyState>{BATCH_TEXT.nobodyEnrolled}</EmptyState>
      ) : (
        <table data-stacks="" className="text-body w-full border-collapse">
          <thead className="max-tablet:sr-only">
            <tr>
              <th scope="col" className={HEAD}>
                {BATCH_TEXT.student}
              </th>
              <th scope="col" className={HEAD}>
                {BATCH_TEXT.classesHeading}
              </th>
              <th scope="col" className={`${HEAD} tablet:text-right`}>
                {BATCH_TEXT.attendedHeading}
              </th>
            </tr>
          </thead>
          <tbody className="divide-rule divide-y">
            {students.map((student) => (
              <tr key={student.id} className="max-tablet:grid max-tablet:py-4">
                <td className={CELL}>
                  <Link
                    href={ROUTES.student(student.id)}
                    className="text-accent min-h-control inline-flex items-center font-semibold hover:underline"
                  >
                    {student.name}
                  </Link>
                </td>
                <td className={CELL}>
                  <div className="flex flex-wrap gap-2">
                    {student.batches.map((batch) => (
                      <button
                        key={batch.id}
                        type="button"
                        onClick={() => {
                          onPeek(batch.id);
                        }}
                        className="rounded-pill bg-tint text-accent text-small min-h-control cursor-pointer px-3 font-semibold"
                      >
                        {batch.name}
                      </button>
                    ))}
                  </div>
                </td>
                <td className={`${CELL} tablet:text-right tabular-nums`}>
                  {student.attendedPercent === null ? "—" : `${String(student.attendedPercent)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
