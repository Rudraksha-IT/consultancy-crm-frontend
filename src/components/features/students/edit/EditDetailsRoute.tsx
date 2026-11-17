"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { HTTP_STATUS } from "@/constants/api";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { EDIT_DETAILS_TEXT } from "@/constants/studentProfile";
import { ApiRequestError, fetchStudentProfile, type StudentProfile } from "@/lib/api";
import { parseStudentId } from "@/lib/students";

import { EditDetailsForm } from "./EditDetailsForm";

type Loaded =
  | { status: "loading" }
  | { status: "loaded"; profile: StudentProfile; visit: number }
  | { status: "notFound" }
  | { status: "failed" };

/** The Edit details page for the id in the address (issue 81); Teachers can't open it. */
export function EditDetailsRoute({ idText }: { idText: string }) {
  const { staff } = useCurrentStaff();
  const studentId = parseStudentId(idText);
  if (staff.role === Role.Teacher) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  if (studentId === null) return <NotFound />;
  return <EditDetailsLoader key={studentId} studentId={studentId} />;
}

function NotFound() {
  return (
    <Panel>
      <EmptyState action={<ButtonLink href={ROUTES.students}>{LABELS.allStudents}</ButtonLink>}>
        {MESSAGES.studentNotFound}
      </EmptyState>
    </Panel>
  );
}

/**
 * Load the Student fresh each time the page is shown, and start the form again from what is
 * stored: Next keeps a visited page alive while hidden, and its effects run again when it comes
 * back, so `visit` remounts the form instead of showing an old, half-edited copy.
 */
function useFreshProfile(studentId: number): Loaded {
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  useEffect(() => {
    let isCancelled = false;
    fetchStudentProfile(studentId).then(
      (profile) => {
        if (isCancelled) return;
        setLoaded((current) => ({
          status: "loaded",
          profile,
          visit: current.status === "loaded" ? current.visit + 1 : 1,
        }));
      },
      (error: unknown) => {
        if (isCancelled) return;
        const isMissing = error instanceof ApiRequestError && error.status === HTTP_STATUS.notFound;
        setLoaded({ status: isMissing ? "notFound" : "failed" });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [studentId]);
  return loaded;
}

function EditDetailsLoader({ studentId }: { studentId: number }) {
  const loaded = useFreshProfile(studentId);
  if (loaded.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (loaded.status === "failed") return <Banner tone="problem">{MESSAGES.studentFailed}</Banner>;
  if (loaded.status === "notFound") return <NotFound />;
  if (!loaded.profile.canEditDetails) return <NotAllowed profile={loaded.profile} />;
  return <EditDetailsForm key={loaded.visit} profile={loaded.profile} />;
}

/** Someone who may not edit these details: who may, and the way back (spec 122). */
function NotAllowed({ profile }: { profile: StudentProfile }) {
  const counsellor = profile.assignedCounsellor?.name;
  return (
    <div className="grid gap-8">
      <PageHeader
        title={EDIT_DETAILS_TEXT.title(profile.name)}
        crumbs={
          <Link
            href={ROUTES.student(profile.id)}
            className="text-secondary text-ink-2 min-h-control inline-flex items-center gap-1.5 self-start"
          >
            <Icon name="left" />
            {profile.name}
          </Link>
        }
      />
      <Banner icon="lock">
        {counsellor === undefined
          ? EDIT_DETAILS_TEXT.onlyTheirCounsellor
          : EDIT_DETAILS_TEXT.onlyCounsellor(counsellor)}
      </Banner>
    </div>
  );
}
