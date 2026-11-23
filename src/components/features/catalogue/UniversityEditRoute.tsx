"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { Loading } from "@/components/ui/Loading";
import { HTTP_STATUS } from "@/constants/api";
import { CATALOGUE_TEXT } from "@/constants/catalogue";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { ApiRequestError, fetchUniversity, type University } from "@/lib/api";
import { parseRecordId, type RecordId } from "@/lib/recordId";

import { UniversityEditForm } from "./UniversityEditForm";

type Loaded =
  | { status: "loading" }
  | { status: "loaded"; university: University; visit: number }
  | { status: "notFound" }
  | { status: "failed" };

/** The edit page of the University in the address (issue 92); only Admins may use it. */
export function UniversityEditRoute({ idText }: { idText: string }) {
  const { staff } = useCurrentStaff();
  if (staff.role !== Role.Admin) {
    return (
      <div className="grid gap-6">
        <BackToCatalogue />
        <Banner icon="lock">{CATALOGUE_TEXT.notAdmin}</Banner>
      </div>
    );
  }
  const id = parseRecordId(idText);
  if (id === null) return <NotFound />;
  return <UniversityEditLoader key={id} id={id} />;
}

function BackToCatalogue() {
  return (
    <Link
      href={ROUTES.universities}
      className="text-secondary text-ink-2 min-h-control inline-flex items-center gap-1.5 self-start"
    >
      <Icon name="left" />
      {CATALOGUE_TEXT.backToCatalogue}
    </Link>
  );
}

function NotFound() {
  return (
    <Panel>
      <EmptyState
        action={
          <ButtonLink href={ROUTES.universities}>{CATALOGUE_TEXT.backToCatalogue}</ButtonLink>
        }
      >
        {CATALOGUE_TEXT.universityNotFound}
      </EmptyState>
    </Panel>
  );
}

/**
 * Load the University fresh each time the page is shown and start the form again from what is
 * stored: Next keeps a visited page alive while hidden, so `visit` remounts the form.
 */
function useFreshUniversity(id: RecordId): Loaded {
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  useEffect(() => {
    let isCancelled = false;
    fetchUniversity(id).then(
      (university) => {
        if (isCancelled) return;
        setLoaded((current) => ({
          status: "loaded",
          university,
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
  }, [id]);
  return loaded;
}

function UniversityEditLoader({ id }: { id: RecordId }) {
  const loaded = useFreshUniversity(id);
  if (loaded.status === "loading") return <Loading />;
  if (loaded.status === "failed")
    return <Banner tone="problem">{CATALOGUE_TEXT.loadFailed}</Banner>;
  if (loaded.status === "notFound") return <NotFound />;
  return <UniversityEditForm key={loaded.visit} university={loaded.university} />;
}
